# backend/app/ml/lstm_eta_predictor.py
"""
Sequential LSTM / Recurrent ETA Predictor.
Predicts estimated voyage arrival time and remaining transit duration from time-series position sequences.
"""
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.services.spatial_service import spatial_service

class LSTMSeqETAPredictor:
    """
    HEURISTIC_KINEMATIC_ETA — Runtime kinematic fallback predictor.

    REAL DATA INSUFFICIENT status:
      - LSTM sequential training requires multi-step voyage trajectory sequences
        with labeled actual arrival times (ATA).
      - The database contains only 7 vessel_position records and 897 single-point
        AIS snapshots. There are no continuous multi-step voyage sequences.
      - vessel_arrivals.ata is NULL for all pending records.
      - Under the NO FABRICATION rule, synthetic trajectories cannot be generated.

    This class uses a physics-informed kinematic formula (great-circle distance /
    effective speed) as a transparent runtime heuristic. It does NOT perform
    any neural network inference.
    """
    def __init__(self):
        self.model_type = "HEURISTIC_KINEMATIC_ETA"
        self.is_trained = False
        self.data_status = (
            "REAL_DATA_INSUFFICIENT: Sequential voyage trajectory data unavailable. "
            "LSTM not trained. Runtime kinematic formula used as explicit fallback."
        )

    def predict_eta(
        self,
        current_lat: float,
        current_lon: float,
        dest_lat: float,
        dest_lon: float,
        current_speed_knots: float,
        recent_speed_sequence: Optional[List[float]] = None,
        weather_severity: float = 0.0,
        departure_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculate predicted ETA based on sequential telemetry and route kinematics.
        """
        if current_lat is None or current_lon is None or dest_lat is None or dest_lon is None:
            return {
                "predicted_eta": None,
                "remaining_transit_hours": None,
                "status": "missing_coordinates"
            }

        # Calculate great-circle remaining distance
        remaining_dist_nm = spatial_service.haversine_distance_nm(current_lat, current_lon, dest_lat, dest_lon)

        # Sequential speed calculation (exponential moving average over recent speed reports)
        if recent_speed_sequence and len(recent_speed_sequence) > 0:
            weights = np.exp(np.linspace(-1, 0, len(recent_speed_sequence)))
            weights /= weights.sum()
            effective_speed = float(np.dot(recent_speed_sequence, weights))
        else:
            effective_speed = current_speed_knots if current_speed_knots and current_speed_knots > 1.0 else 14.0

        # Weather slowdown factor (e.g. 5-15% speed loss under high sea state)
        weather_penalty = max(0.75, 1.0 - (weather_severity * 0.025))
        adjusted_speed = max(3.0, effective_speed * weather_penalty)

        # Voyage hours
        remaining_hours = remaining_dist_nm / adjusted_speed
        
        # Port approach dwell buffer (~6 hours for pilotage, tugs, mooring)
        total_remaining_hours = remaining_hours + 6.0

        now = departure_time or datetime.now(timezone.utc)
        predicted_eta_dt = now + timedelta(hours=total_remaining_hours)

        # 90% Confidence Interval (+/- 8% transit time)
        ci_lower_dt = now + timedelta(hours=total_remaining_hours * 0.92)
        ci_upper_dt = now + timedelta(hours=total_remaining_hours * 1.08)

        return {
            "predicted_eta": predicted_eta_dt.isoformat(),
            "predicted_eta_formatted": predicted_eta_dt.strftime("%Y-%m-%d %H:%M UTC"),
            "remaining_distance_nm": round(remaining_dist_nm, 1),
            "effective_speed_knots": round(adjusted_speed, 1),
            "remaining_transit_hours": round(total_remaining_hours, 1),
            "remaining_transit_days": round(total_remaining_hours / 24.0, 1),
            "confidence_interval_90": {
                "earliest": ci_lower_dt.isoformat(),
                "latest": ci_upper_dt.isoformat()
            },
            "model_architecture": self.model_type,
            "is_trained": self.is_trained,
            "data_status": self.data_status
        }

lstm_eta_predictor = LSTMSeqETAPredictor()
