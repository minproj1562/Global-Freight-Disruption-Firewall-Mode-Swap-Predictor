# backend/app/services/port_forecast_service.py
"""
Port Congestion Forecasting Service
Uses Facebook Prophet for time series forecasting
"""

import logging
import pandas as pd
import numpy as np
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except (ImportError, Exception):
    Prophet = None
    PROPHET_AVAILABLE = False
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
from math import radians, sin, cos, sqrt, atan2

from app.models.ports import Port, PortCongestionHistory, PortCongestionForecast, PortCongestionAlternative
from app.database import get_db

# Quiet down Prophet's verbose cmdstanpy backend logging for cleaner console output
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)
logging.getLogger('prophet').setLevel(logging.WARNING)


class PortForecastService:
    """
    Port congestion forecasting service using Prophet

    Features:
    - Train Prophet model per port on historical congestion data
    - Generate 7/14/30-day forecasts with confidence intervals
    - Cache forecasts in database
    - Identify alternative ports with lower congestion
    - Derive short-horizon (now/+24h/+48h/+72h) projections for the
      Congestion Heatmap / Ripple Map page from the same Prophet model
    """

    def __init__(self, db: Session):
        self.db = db

    def train_and_forecast(
        self,
        port_id: str,
        forecast_horizon_days: int = 14,
        retrain: bool = False
    ) -> Dict:
        """
        Train Prophet model and generate forecast for a port

        Args:
            port_id: Port ID
            forecast_horizon_days: Forecast horizon (7, 14, or 30 days)
            retrain: Force retrain even if recent forecast exists

        Returns:
            dict: Forecast results with confidence intervals
        """

        # Check if recent forecast exists (within last 24 hours)
        if not retrain:
            recent_forecast = self.db.query(PortCongestionForecast).filter(
                PortCongestionForecast.port_id == port_id,
                PortCongestionForecast.forecast_horizon_days == forecast_horizon_days,
                PortCongestionForecast.forecast_date >= datetime.utcnow() - timedelta(hours=24)
            ).order_by(PortCongestionForecast.forecast_date.desc()).first()

            if recent_forecast:
                return {
                    "port_id": port_id,
                    "forecast_data": recent_forecast.forecast_data,
                    "mae": recent_forecast.mae,
                    "mape": recent_forecast.mape,
                    "confidence_score": recent_forecast.confidence_score,
                    "cached": True
                }

        # Load historical congestion data
        historical_data = self._load_historical_data(port_id)

        if len(historical_data) < 30 or not PROPHET_AVAILABLE:
            print(f"[Forecast] Insufficient data or Prophet unavailable for {port_id} "
                  f"({len(historical_data)} records, Prophet available: {PROPHET_AVAILABLE})")
            return self._generate_mock_forecast(port_id, forecast_horizon_days)

        # Train Prophet model
        try:
            forecast_df, metrics = self._train_prophet_model(historical_data, forecast_horizon_days)
        except Exception as e:
            print(f"[Forecast] Prophet training failed for {port_id}: {e} — using fallback estimate")
            return self._generate_mock_forecast(port_id, forecast_horizon_days)

        # Save forecast to database
        forecast_record = PortCongestionForecast(
            port_id=port_id,
            forecast_date=datetime.utcnow(),
            forecast_horizon_days=forecast_horizon_days,
            forecast_data=forecast_df.to_dict('records'),
            mae=metrics['mae'],
            mape=metrics['mape'],
            confidence_score=metrics['confidence_score']
        )

        self.db.add(forecast_record)
        self.db.commit()

        return {
            "port_id": port_id,
            "forecast_data": forecast_df.to_dict('records'),
            "mae": metrics['mae'],
            "mape": metrics['mape'],
            "confidence_score": metrics['confidence_score'],
            "cached": False
        }

    def _load_historical_data(self, port_id: str) -> pd.DataFrame:
        """Load historical congestion data for a port"""

        cutoff_date = datetime.utcnow() - timedelta(days=365)

        history = self.db.query(PortCongestionHistory).filter(
            PortCongestionHistory.port_id == port_id,
            PortCongestionHistory.timestamp >= cutoff_date
        ).order_by(PortCongestionHistory.timestamp).all()

        if not history:
            return pd.DataFrame()

        df = pd.DataFrame([
            {
                'ds': h.timestamp,
                'y': h.congestion_percent
            }
            for h in history
        ])

        # Prophet requires strictly one row per timestamp group for best results;
        # average any same-day duplicates (can occur if multiple seed passes ran)
        df['ds'] = pd.to_datetime(df['ds']).dt.normalize()
        df = df.groupby('ds', as_index=False)['y'].mean()

        return df

    def _train_prophet_model(
        self,
        df: pd.DataFrame,
        forecast_horizon_days: int
    ) -> Tuple[pd.DataFrame, Dict]:
        """Train Prophet model on historical data"""

        data_span_days = (df['ds'].max() - df['ds'].min()).days

        # METHODOLOGY NOTE: yearly_seasonality is only statistically meaningful
        # with >= 1 full year of history (Taylor & Letham, 2018). Since our
        # historical window is intentionally bounded (~150-180 days), we
        # disable it explicitly rather than let Prophet guess on partial data.
        use_yearly_seasonality = data_span_days >= 350

        model = Prophet(
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10,
            seasonality_mode='multiplicative',
            weekly_seasonality=True,
            yearly_seasonality=use_yearly_seasonality,
            daily_seasonality=False,
            interval_width=0.90  # 90% confidence interval — matches LSTM ETA model convention
        )

        model.fit(df)

        future = model.make_future_dataframe(periods=forecast_horizon_days)
        forecast = model.predict(future)

        train_predictions = forecast[forecast['ds'].isin(df['ds'])]

        mae = float(np.mean(np.abs(df['y'].values - train_predictions['yhat'].values)))
        # Guard against division-by-near-zero on low-congestion days (standard MAPE robustness practice)
        safe_denominator = np.maximum(df['y'].values, 1.0)
        mape = float(np.mean(np.abs((df['y'].values - train_predictions['yhat'].values) / safe_denominator)) * 100)

        avg_interval_width = float(np.mean(train_predictions['yhat_upper'] - train_predictions['yhat_lower']))
        confidence_score = max(0.0, min(100.0, 100.0 - (mae + avg_interval_width / 2)))

        metrics = {
            'mae': round(mae, 2),
            'mape': round(mape, 2),
            'confidence_score': round(confidence_score, 2)
        }

        future_forecast = forecast[forecast['ds'] > df['ds'].max()][['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        future_forecast = future_forecast.head(forecast_horizon_days).copy()

        future_forecast['yhat'] = future_forecast['yhat'].clip(0, 100)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(0, 100)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(0, 100)

        future_forecast = future_forecast.round(2)
        future_forecast['ds'] = future_forecast['ds'].dt.strftime('%Y-%m-%d')

        return future_forecast, metrics

    def _generate_mock_forecast(self, port_id: str, forecast_horizon_days: int) -> Dict:
        """Generate a transparent fallback estimate when historical data is still insufficient"""

        port = self.db.query(Port).filter(Port.id == port_id).first()
        current_congestion = port.congestion_percent if port else 50

        forecast_data = []
        for i in range(forecast_horizon_days):
            date = datetime.utcnow() + timedelta(days=i + 1)
            yhat = current_congestion + np.random.uniform(-5, 5) + (i * 0.5)
            yhat = float(np.clip(yhat, 0, 100))

            forecast_data.append({
                'ds': date.strftime('%Y-%m-%d'),
                'yhat': round(yhat, 2),
                'yhat_lower': round(max(0, yhat - 10), 2),
                'yhat_upper': round(min(100, yhat + 10), 2)
            })

        return {
            "port_id": port_id,
            "forecast_data": forecast_data,
            "mae": 5.0,
            "mape": 10.0,
            "confidence_score": 70.0,
            "cached": False,
            "mock": True
        }

    def find_alternative_ports(
        self,
        port_id: str,
        max_distance_km: float = 500.0,
        max_alternatives: int = 5
    ) -> List[Dict]:
        """
        Find alternative ports with lower congestion (same-country match —
        used by the Single Port Detail dashboard's "Alternatives" tab).
        """

        source_port = self.db.query(Port).filter(Port.id == port_id).first()

        if not source_port:
            return []

        alternatives = self.db.query(Port).filter(
            Port.id != port_id,
            Port.country == source_port.country,
            Port.congestion_percent < source_port.congestion_percent
        ).all()

        if not alternatives:
            return []

        results = []

        for alt_port in alternatives:
            distance_km = self._calculate_distance(
                source_port.latitude, source_port.longitude,
                alt_port.latitude, alt_port.longitude
            )

            if distance_km > max_distance_km:
                continue

            congestion_reduction = source_port.congestion_percent - alt_port.congestion_percent
            additional_transit_days = distance_km / 500.0
            cost_delta_usd = distance_km * 0.5

            suitability_score = (
                (congestion_reduction * 2) -
                (distance_km / 100) -
                (cost_delta_usd / 1000)
            )
            suitability_score = max(0, min(100, suitability_score))

            results.append({
                "port_id": alt_port.id,
                "port_name": alt_port.name,
                "port_code": alt_port.code,
                "congestion_percent": alt_port.congestion_percent,
                "congestion_reduction_percent": round(congestion_reduction, 1),
                "distance_km": round(distance_km, 1),
                "additional_transit_days": round(additional_transit_days, 1),
                "cost_delta_usd": round(cost_delta_usd, 2),
                "suitability_score": round(suitability_score, 2)
            })

        results.sort(key=lambda x: x['suitability_score'], reverse=True)

        return results[:max_alternatives]

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points (Haversine formula)"""
        R = 6371  # Earth radius in km

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c

    def get_congestion_heatmap(self) -> List[Dict]:
        """Get real-time congestion levels for all ports (for the basic dot heatmap)"""

        ports = self.db.query(Port).all()

        heatmap_data = []

        for port in ports:
            if port.congestion_percent >= 85:
                level = "critical"
                color = "#dc2626"
            elif port.congestion_percent >= 65:
                level = "high"
                color = "#f59e0b"
            elif port.congestion_percent >= 40:
                level = "medium"
                color = "#fbbf24"
            else:
                level = "low"
                color = "#10b981"

            heatmap_data.append({
                "port_id": port.id,
                "port_name": port.name,
                "port_code": port.code,
                "latitude": port.latitude,
                "longitude": port.longitude,
                "congestion_percent": port.congestion_percent,
                "congestion_level": level,
                "color": color,
                "waiting_vessels": port.waiting_vessels,
                "avg_wait_hours": port.avg_wait_hours
            })

        return heatmap_data

    # ============================================================
    # RIPPLE / HEATMAP FORECAST (Page 1.5 — Congestion Heatmap)
    # ============================================================
    # Derives short-horizon (now / +24h / +48h / +72h) projections from the
    # SAME trained Prophet model used for the 7/14/30-day Port Dashboard
    # forecast, by reading off its first 3 forecasted days. This keeps a
    # single source of truth (one Prophet model per port) rather than
    # maintaining a second, separate hourly forecasting pipeline.
    # ============================================================

    def get_ripple_heatmap_data(self, top_n_ports: int = 10, max_alternatives: int = 3) -> List[Dict]:
        ports = self.db.query(Port).order_by(Port.congestion_percent.desc()).limit(top_n_ports).all()
        results = []

        for port in ports:
            point = self._build_short_horizon_point(port)
            nearby = self._find_nearby_ports_any_country(port, max_results=max_alternatives)

            alt_points = []
            for alt_port, _distance_km in nearby:
                alt_point = self._build_short_horizon_point(alt_port)
                alt_points.append({
                    "port_id": alt_port.id,
                    "port_name": alt_port.name,
                    "port_code": alt_port.code,
                    "region": alt_port.country,
                    "latitude": alt_port.latitude,
                    "longitude": alt_port.longitude,
                    "congestion_scores": alt_point["congestion_scores"],
                    "trend": alt_point["trend"],
                    "avg_wait_hours": alt_port.avg_wait_hours,
                })

            berth_util = round((port.active_berths_used / port.berth_capacity) * 100, 1) if port.berth_capacity else 0.0

            results.append({
                "port_id": port.id,
                "port_name": port.name,
                "port_code": port.code,
                "region": port.country,
                "latitude": port.latitude,
                "longitude": port.longitude,
                "congestion_scores": point["congestion_scores"],
                "trend": point["trend"],
                "waiting_vessels_count": port.waiting_vessels,
                "berth_utilization_percent": berth_util,
                "waiting_vessels_forecast": point["waiting_vessels_forecast"],
                "alternative_ports": alt_points,
                "generated_at": datetime.utcnow().isoformat() + "Z",
            })

        return results

    def _build_short_horizon_point(self, port: Port) -> Dict:
        forecast_result = self.train_and_forecast(port.id, forecast_horizon_days=3, retrain=False)
        data_points = list(forecast_result.get("forecast_data", []))[:3]

        now_score = float(port.congestion_percent or 0)

        while len(data_points) < 3:
            last_val = data_points[-1]["yhat"] if data_points else now_score
            data_points.append({"yhat": last_val, "yhat_lower": max(0, last_val - 8), "yhat_upper": min(100, last_val + 8)})

        d1 = float(data_points[0]["yhat"])
        d2 = float(data_points[1]["yhat"])
        d3 = float(data_points[2]["yhat"])

        scores = {
            "now": round(now_score),
            "plus_24h": round(d1),
            "plus_48h": round(d2),
            "plus_72h": round(d3),
        }

        if scores["plus_72h"] > scores["now"] + 3:
            trend = "up"
        elif scores["plus_72h"] < scores["now"] - 3:
            trend = "down"
        else:
            trend = "stable"

        base_wait = port.waiting_vessels or 0

        def scale(score: float) -> int:
            if now_score <= 0:
                return base_wait
            return max(0, round(base_wait * (score / now_score)))

        waiting_forecast = {
            "now": base_wait,
            "plus_24h": scale(scores["plus_24h"]),
            "plus_48h": scale(scores["plus_48h"]),
            "plus_72h": scale(scores["plus_72h"]),
        }

        return {"congestion_scores": scores, "trend": trend, "waiting_vessels_forecast": waiting_forecast}

    def _find_nearby_ports_any_country(self, source_port: Port, max_distance_km: float = 2500.0, max_results: int = 3):
        """
        Unlike find_alternative_ports() (same-country only), this finds the
        geographically closest ports regardless of country — more realistic
        for diversion planning, since a logistics manager would genuinely
        consider Antwerp as an alternative to Rotterdam despite the border.
        """
        others = self.db.query(Port).filter(Port.id != source_port.id).all()
        scored = []
        for p in others:
            dist = self._calculate_distance(source_port.latitude, source_port.longitude, p.latitude, p.longitude)
            if dist <= max_distance_km:
                scored.append((p, dist))
        scored.sort(key=lambda x: x[1])
        return scored[:max_results]