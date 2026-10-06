# backend/app/ml/lstm_eta_predictor.py
"""
Sequential LSTM Vessel ETA Predictor — Hybrid Runtime Engine.

Operating modes:
  1. "lstm_sequence" — Used automatically once a vessel has at least
     SEQ_LEN (8) real tracked position reports in `vessel_positions`.
     Runs the trained LSTM with Monte Carlo Dropout for uncertainty
     quantification (Gal & Ghahramani, 2016).
  2. "kinematic" — Transparent physics fallback (great-circle distance
     / effective speed) used for vessels that do not yet have enough
     tracked history, or if the trained checkpoint is unavailable.

This hybrid design means the system is honest about data availability
today, while automatically upgrading in accuracy as the AIS ingestion
pipeline accumulates more real position history per vessel — no code
change required.
"""
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone

import numpy as np
import torch

from app.services.spatial_service import spatial_service
from app.ml.lstm_model_architecture import LSTMETAModel, SEQ_LEN

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "models" / "lstm_eta_model.pt"


class LSTMSeqETAPredictor:
    def __init__(self):
        self.model: Optional[LSTMETAModel] = None
        self.is_trained = False
        self.feature_mean: Optional[np.ndarray] = None
        self.feature_std: Optional[np.ndarray] = None
        self.target_mean: float = 0.0
        self.target_std: float = 1.0
        self.metrics: Dict[str, Any] = {}
        self.model_type = "LSTM_SEQUENCE_ETA"
        self._load_model()

    def _load_model(self):
        try:
            if MODEL_PATH.exists():
                checkpoint = torch.load(MODEL_PATH, map_location="cpu")
                self.model = LSTMETAModel(
                    input_size=checkpoint["input_size"],
                    hidden_size=checkpoint["hidden_size"],
                    num_layers=checkpoint["num_layers"],
                    dropout=checkpoint.get("dropout", 0.2),
                )
                self.model.load_state_dict(checkpoint["model_state_dict"])
                self.model.eval()
                self.feature_mean = np.array(checkpoint["feature_mean"], dtype=np.float32)
                self.feature_std = np.array(checkpoint["feature_std"], dtype=np.float32)
                self.target_mean = float(checkpoint["target_mean"])
                self.target_std = float(checkpoint["target_std"])
                self.metrics = checkpoint.get("metrics", {})
                self.is_trained = True
                logger.info("[LSTM ETA] Trained sequence model loaded successfully from checkpoint.")
            else:
                logger.warning("[LSTM ETA] No trained checkpoint found at %s — operating in kinematic fallback mode. "
                                "Run `python -m app.ml.train_lstm_eta_model` to train.", MODEL_PATH)
        except Exception as e:
            logger.error(f"[LSTM ETA] Failed to load model checkpoint: {e}")
            self.model = None
            self.is_trained = False

    def _build_feature_window(
        self,
        position_history: List[Dict[str, Any]],
        dest_lat: float,
        dest_lon: float,
        weather_severity: float,
        dest_congestion_pct: float,
    ) -> np.ndarray:
        window = position_history[-SEQ_LEN:]
        window_start_dist = None
        feats = []
        prev_heading = None

        for p in window:
            dist_remaining = spatial_service.haversine_distance_nm(p["lat"], p["lon"], dest_lat, dest_lon)
            if window_start_dist is None:
                window_start_dist = dist_remaining if dist_remaining > 0 else 1.0

            speed = p.get("speed") or 0.0
            heading = p.get("heading") or 0.0
            if prev_heading is None:
                heading_delta = 0.0
            else:
                diff = abs(heading - prev_heading) % 360.0
                heading_delta = 360.0 - diff if diff > 180.0 else diff
            prev_heading = heading

            progress = 1.0 - (dist_remaining / window_start_dist) if window_start_dist > 0 else 0.0
            feats.append([
                speed,
                float(np.log1p(max(dist_remaining, 0.0))),
                heading_delta,
                weather_severity,
                dest_congestion_pct,
                progress,
            ])

        return np.array(feats, dtype=np.float32)

    def predict_eta(
        self,
        current_lat: float,
        current_lon: float,
        dest_lat: float,
        dest_lon: float,
        current_speed_knots: float,
        recent_speed_sequence: Optional[List[float]] = None,
        weather_severity: float = 0.0,
        departure_time: Optional[datetime] = None,
        position_history: Optional[List[Dict[str, Any]]] = None,
        dest_congestion_pct: float = 45.0,
        mc_dropout_samples: int = 20,
    ) -> Dict[str, Any]:
        if current_lat is None or current_lon is None or dest_lat is None or dest_lon is None:
            return {
                "predicted_eta": None,
                "remaining_transit_hours": None,
                "status": "missing_coordinates"
            }

        history_len = len(position_history) if position_history else 0
        use_lstm = self.is_trained and self.model is not None and history_len >= SEQ_LEN

        if use_lstm:
            try:
                feats = self._build_feature_window(position_history, dest_lat, dest_lon, weather_severity, dest_congestion_pct)
                feats_norm = (feats - self.feature_mean) / self.feature_std
                x = torch.tensor(feats_norm, dtype=torch.float32).unsqueeze(0)  # [1, SEQ_LEN, features]

                preds = []
                try:
                    self.model.train()  # keep dropout active for MC sampling
                    with torch.no_grad():
                        for _ in range(mc_dropout_samples):
                            preds.append(self.model(x).item())
                finally:
                    self.model.eval()

                preds = np.array(preds)
                pred_norm_mean = preds.mean()
                pred_norm_std = preds.std()

                pred_log_mean = pred_norm_mean * self.target_std + self.target_mean
                pred_hours = max(0.1, float(np.expm1(pred_log_mean)))

                lower_log = (pred_norm_mean - 1.645 * pred_norm_std) * self.target_std + self.target_mean
                upper_log = (pred_norm_mean + 1.645 * pred_norm_std) * self.target_std + self.target_mean
                hours_lower = max(0.1, float(np.expm1(lower_log)))
                hours_upper = max(0.1, float(np.expm1(upper_log)))

                now = departure_time or datetime.now(timezone.utc)
                predicted_eta_dt = now + timedelta(hours=pred_hours)
                ci_lower_dt = now + timedelta(hours=hours_lower)
                ci_upper_dt = now + timedelta(hours=hours_upper)

                remaining_dist_nm = spatial_service.haversine_distance_nm(current_lat, current_lon, dest_lat, dest_lon)

                return {
                    "predicted_eta": predicted_eta_dt.isoformat(),
                    "predicted_eta_formatted": predicted_eta_dt.strftime("%Y-%m-%d %H:%M UTC"),
                    "remaining_distance_nm": round(remaining_dist_nm, 1),
                    "effective_speed_knots": round(current_speed_knots or 0.0, 1),
                    "remaining_transit_hours": round(pred_hours, 1),
                    "remaining_transit_days": round(pred_hours / 24.0, 1),
                    "confidence_interval_90": {
                        "earliest": ci_lower_dt.isoformat(),
                        "latest": ci_upper_dt.isoformat(),
                    },
                    "model_architecture": self.model_type,
                    "is_trained": True,
                    "inference_mode": "lstm_sequence",
                    "data_status": (
                        f"LSTM_ACTIVE: Prediction generated from {history_len} real tracked AIS positions "
                        f"using the trained sequence model (Monte Carlo Dropout uncertainty, "
                        f"{mc_dropout_samples} samples)."
                    ),
                }
            except Exception as e:
                logger.error(f"[LSTM ETA] Inference failed, falling back to kinematic formula: {e}")

        # ============= KINEMATIC FALLBACK =============
        if not self.is_trained:
            reason = "LSTM model checkpoint not found or not yet trained."
        elif history_len < SEQ_LEN:
            reason = (
                f"Insufficient tracked position history for this vessel "
                f"({history_len}/{SEQ_LEN} AIS reports available); using kinematic "
                f"estimate until more tracking data accumulates."
            )
        else:
            reason = "Fallback triggered due to an inference error."

        return self._kinematic_fallback(
            current_lat, current_lon, dest_lat, dest_lon,
            current_speed_knots, recent_speed_sequence, weather_severity,
            departure_time, reason
        )

    def _kinematic_fallback(
        self,
        current_lat: float,
        current_lon: float,
        dest_lat: float,
        dest_lon: float,
        current_speed_knots: float,
        recent_speed_sequence: Optional[List[float]],
        weather_severity: float,
        departure_time: Optional[datetime],
        reason: str,
    ) -> Dict[str, Any]:
        remaining_dist_nm = spatial_service.haversine_distance_nm(current_lat, current_lon, dest_lat, dest_lon)

        if recent_speed_sequence and len(recent_speed_sequence) > 0:
            weights = np.exp(np.linspace(-1, 0, len(recent_speed_sequence)))
            weights /= weights.sum()
            effective_speed = float(np.dot(recent_speed_sequence, weights))
        else:
            effective_speed = current_speed_knots if current_speed_knots and current_speed_knots > 1.0 else 14.0

        weather_penalty = max(0.75, 1.0 - (weather_severity * 0.025))
        adjusted_speed = max(3.0, effective_speed * weather_penalty)

        remaining_hours = remaining_dist_nm / adjusted_speed
        total_remaining_hours = remaining_hours + 6.0  # port approach dwell buffer

        now = departure_time or datetime.now(timezone.utc)
        predicted_eta_dt = now + timedelta(hours=total_remaining_hours)
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
                "latest": ci_upper_dt.isoformat(),
            },
            "model_architecture": "HEURISTIC_KINEMATIC_ETA",
            "is_trained": self.is_trained,
            "inference_mode": "kinematic",
            "data_status": f"REAL_DATA_INSUFFICIENT: {reason}",
        }


lstm_eta_predictor = LSTMSeqETAPredictor()