# backend/app/services/port_forecast_service.py
"""
Port Congestion Forecasting Service
Uses Facebook Prophet for time series forecasting
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from app.models.ports import Port, PortCongestionHistory, PortCongestionForecast, PortCongestionAlternative
from app.database import get_db


class PortForecastService:
    """
    Port congestion forecasting service using Prophet
    
    Features:
    - Train Prophet model per port on historical congestion data
    - Generate 7/14/30-day forecasts with confidence intervals
    - Cache forecasts in database
    - Identify alternative ports with lower congestion
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
            ).first()
            
            if recent_forecast:
                print(f"[Forecast] Using cached forecast for {port_id}")
                return {
                    "port_id": port_id,
                    "forecast_data": recent_forecast.forecast_data,
                    "mae": recent_forecast.mae,
                    "mape": recent_forecast.mape,
                    "confidence_score": recent_forecast.confidence_score,
                    "cached": True
                }
        
        # Load historical congestion data
        print(f"[Forecast] Loading historical data for {port_id}...")
        historical_data = self._load_historical_data(port_id)
        
        if len(historical_data) < 30:
            print(f"[Forecast] Insufficient data for {port_id} ({len(historical_data)} records)")
            return self._generate_mock_forecast(port_id, forecast_horizon_days)
        
        # Train Prophet model
        print(f"[Forecast] Training Prophet model for {port_id}...")
        forecast_df, metrics = self._train_prophet_model(historical_data, forecast_horizon_days)
        
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
        
        print(f"[Forecast] ✓ Forecast saved for {port_id}")
        
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
        
        # Query last 365 days of congestion history
        cutoff_date = datetime.utcnow() - timedelta(days=365)
        
        history = self.db.query(PortCongestionHistory).filter(
            PortCongestionHistory.port_id == port_id,
            PortCongestionHistory.timestamp >= cutoff_date
        ).order_by(PortCongestionHistory.timestamp).all()
        
        if not history:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame([
            {
                'ds': h.timestamp,
                'y': h.congestion_percent
            }
            for h in history
        ])
        
        return df
    
    def _train_prophet_model(
        self,
        df: pd.DataFrame,
        forecast_horizon_days: int
    ) -> Tuple[pd.DataFrame, Dict]:
        """Train Prophet model on historical data"""
        
        # Initialize Prophet model
        model = Prophet(
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10,
            seasonality_mode='multiplicative',
            weekly_seasonality=True,
            yearly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.95  # 95% confidence interval
        )
        
        # Fit model
        model.fit(df)
        
        # Make future dataframe
        future = model.make_future_dataframe(periods=forecast_horizon_days)
        
        # Generate forecast
        forecast = model.predict(future)
        
        # Calculate metrics on training data
        train_predictions = forecast[forecast['ds'].isin(df['ds'])]
        
        mae = np.mean(np.abs(df['y'].values - train_predictions['yhat'].values))
        mape = np.mean(np.abs((df['y'].values - train_predictions['yhat'].values) / df['y'].values)) * 100
        
        # Calculate confidence score (higher is better)
        # Based on MAE and prediction interval width
        avg_interval_width = np.mean(train_predictions['yhat_upper'] - train_predictions['yhat_lower'])
        confidence_score = max(0, min(100, 100 - (mae + avg_interval_width / 2)))
        
        metrics = {
            'mae': round(mae, 2),
            'mape': round(mape, 2),
            'confidence_score': round(confidence_score, 2)
        }
        
        # Extract forecast for future dates only
        future_forecast = forecast[forecast['ds'] > df['ds'].max()][['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        future_forecast = future_forecast.head(forecast_horizon_days)
        
        # Clip predictions to 0-100 range
        future_forecast['yhat'] = future_forecast['yhat'].clip(0, 100)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(0, 100)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(0, 100)
        
        # Round values
        future_forecast = future_forecast.round(2)
        
        # Convert datetime to string for JSON serialization
        future_forecast['ds'] = future_forecast['ds'].dt.strftime('%Y-%m-%d')
        
        return future_forecast, metrics
    
    def _generate_mock_forecast(self, port_id: str, forecast_horizon_days: int) -> Dict:
        """Generate mock forecast when insufficient historical data"""
        
        port = self.db.query(Port).filter(Port.id == port_id).first()
        current_congestion = port.congestion_percent if port else 50
        
        forecast_data = []
        for i in range(forecast_horizon_days):
            date = datetime.utcnow() + timedelta(days=i+1)
            # Simple linear trend with noise
            yhat = current_congestion + np.random.uniform(-5, 5) + (i * 0.5)
            yhat = np.clip(yhat, 0, 100)
            
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
        Find alternative ports with lower congestion
        
        Args:
            port_id: Source port ID
            max_distance_km: Maximum distance from source port
            max_alternatives: Maximum number of alternatives to return
        
        Returns:
            list: Alternative ports sorted by suitability score
        """
        
        source_port = self.db.query(Port).filter(Port.id == port_id).first()
        
        if not source_port:
            return []
        
        # Find nearby ports with lower congestion
        alternatives = self.db.query(Port).filter(
            Port.id != port_id,
            Port.country == source_port.country,  # Same country for simplicity
            Port.congestion_percent < source_port.congestion_percent
        ).all()
        
        if not alternatives:
            return []
        
        results = []
        
        for alt_port in alternatives:
            # Calculate distance (simplified - use Haversine in production)
            distance_km = self._calculate_distance(
                source_port.latitude, source_port.longitude,
                alt_port.latitude, alt_port.longitude
            )
            
            if distance_km > max_distance_km:
                continue
            
            # Calculate metrics
            congestion_reduction = source_port.congestion_percent - alt_port.congestion_percent
            additional_transit_days = distance_km / 500.0  # ~500 km/day average
            cost_delta_usd = distance_km * 0.5  # Simplified cost calculation
            
            # Suitability score (higher is better)
            # Factor in: congestion reduction, distance, cost
            suitability_score = (
                (congestion_reduction * 2) -  # Prioritize congestion reduction
                (distance_km / 100) -  # Penalize distance
                (cost_delta_usd / 1000)  # Penalize cost
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
        
        # Sort by suitability score
        results.sort(key=lambda x: x['suitability_score'], reverse=True)
        
        return results[:max_alternatives]
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points (Haversine formula)"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth radius in km
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def get_congestion_heatmap(self) -> List[Dict]:
        """Get congestion levels for all ports (for heatmap)"""
        
        ports = self.db.query(Port).all()
        
        heatmap_data = []
        
        for port in ports:
            # Determine congestion level
            if port.congestion_percent >= 85:
                level = "critical"
                color = "#dc2626"  # Red
            elif port.congestion_percent >= 65:
                level = "high"
                color = "#f59e0b"  # Orange
            elif port.congestion_percent >= 40:
                level = "medium"
                color = "#fbbf24"  # Yellow
            else:
                level = "low"
                color = "#10b981"  # Green
            
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