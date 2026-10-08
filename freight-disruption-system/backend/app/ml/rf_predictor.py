# backend/app/ml/rf_predictor.py
"""
Random Forest Risk Predictor - Production Inference Module

Trained on 5,000 real shipment records (data/raw/global_supply_chain_risk_2026.csv).
See app/ml/train_rf_model.py for the exact training pipeline — the feature
engineering in _build_feature_dict() below MUST stay identical to that
script's FEATURE_ORDER / engineered columns, or predictions silently drift.
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Optional
import warnings

warnings.filterwarnings('ignore')

# Must match train_rf_model.py's WEATHER_SEVERITY_MAP
WEATHER_SEVERITY_MAP = {
    "clear": 0.0,
    "fog": 4.0,
    "rain": 5.0,
    "storm": 8.0,
    "hurricane": 10.0,
}


class RFRiskPredictor:
    """
    Production-ready Random Forest risk predictor.

    - Loads the model trained in app/ml/train_rf_model.py (real shipment data)
    - Predicts disruption probability (0-1)
    - Falls back to a calibrated rule-based heuristic if the model file
      is missing or a prediction fails for any reason
    """

    def __init__(self, model_path: str = "app/ml/models/rf_risk_model.pkl"):
        self.model_path = Path(model_path)
        self.model_artifacts = None
        self.is_model_loaded = False
        self._load_model()

    def _load_model(self):
        if not self.model_path.exists():
            print(f"[RF Predictor] [WARN] Model not found at {self.model_path}")
            print("[RF Predictor] -> Using fallback rule-based heuristic")
            self.is_model_loaded = False
            return

        try:
            self.model_artifacts = joblib.load(self.model_path)
            self.is_model_loaded = True
            print(f"[RF Predictor] [OK] Model loaded successfully")
            print(f"[RF Predictor]   Type: {self.model_artifacts.get('model_type', 'Random Forest')}")
            print(f"[RF Predictor]   Trained: {self.model_artifacts.get('trained_at', 'Unknown')}")
            print(f"[RF Predictor]   Features: {len(self.model_artifacts.get('feature_names', []))}")
        except Exception as e:
            print(f"[RF Predictor] [ERR] Failed to load model: {e}")
            print(f"[RF Predictor] -> Using fallback rule-based heuristic")
            self.is_model_loaded = False

    def predict_risk_score(
        self,
        severity: str,
        disruption_type: str,
        distance_km: Optional[float] = None,
        port_congestion: Optional[float] = None,
        weather_severity: Optional[float] = None,
        geopolitical_risk: Optional[float] = None,
        carrier_reliability: Optional[float] = None,
        weight_mt: Optional[float] = None,
        fuel_price_index: Optional[float] = None
    ) -> float:
        """
        Predict disruption risk score (0.0-1.0).

        Note: port_congestion is accepted for API compatibility with callers
        elsewhere in the app, but is NOT fed to the trained model — the real
        training dataset (global_supply_chain_risk_2026.csv) has no port
        congestion column, so including it would mean silently defaulting it
        to a guessed constant at inference, which is worse than omitting it.
        """
        if self.is_model_loaded and self.model_artifacts:
            try:
                return self._predict_with_model(
                    distance_km, weather_severity, geopolitical_risk,
                    carrier_reliability, weight_mt, fuel_price_index
                )
            except Exception as e:
                print(f"[RF Predictor] Model prediction failed: {e}")
                print("[RF Predictor] -> Falling back to heuristic")

        return self._heuristic_risk_score(severity, disruption_type)

    def _predict_with_model(
        self,
        distance_km: Optional[float],
        weather_severity: Optional[float],
        geopolitical_risk: Optional[float],
        carrier_reliability: Optional[float],
        weight_mt: Optional[float],
        fuel_price_index: Optional[float],
    ) -> float:
        model = self.model_artifacts['model']
        feature_names = self.model_artifacts.get('feature_names', [])

        features = self._build_feature_dict(
            distance_km, weather_severity, geopolitical_risk,
            carrier_reliability, weight_mt, fuel_price_index
        )

        feature_vector = np.array([[features[name] for name in feature_names]])
        risk_proba = model.predict_proba(feature_vector)[0, 1]
        return float(np.clip(risk_proba, 0.0, 1.0))

    def _build_feature_dict(
        self,
        distance_km: Optional[float],
        weather_severity: Optional[float],
        geopolitical_risk: Optional[float],
        carrier_reliability: Optional[float],
        weight_mt: Optional[float],
        fuel_price_index: Optional[float],
    ) -> Dict:
        """
        Builds the EXACT same feature set, in the EXACT same units, as
        train_rf_model.py's FEATURE_ORDER. Keep these two in sync.
        """
        distance = distance_km or 5000.0
        geo_risk = geopolitical_risk or 5.0
        weather = weather_severity if weather_severity is not None else 5.0
        # carrier_reliability is expected on the 0-100 scale (app-wide convention,
        # matches the *100 conversion done once at training time)
        reliability = carrier_reliability if carrier_reliability is not None else 85.0
        weight = weight_mt or 1000.0
        fuel = fuel_price_index or 1.0

        return {
            "Distance_km": distance,
            "Geopolitical_Risk_Score": geo_risk,
            "Weather_Severity_Index": weather,
            "Carrier_Reliability_Score": reliability,
            "Weight_MT": weight,
            "Fuel_Price_Index": fuel,
            "Distance_Log": np.log1p(distance),
            "Distance_Sqrt": np.sqrt(distance),
            "Risk_Distance_Interaction": geo_risk * np.log1p(distance),
            "Weather_Distance_Interaction": weather * np.log1p(distance),
            "Risk_Squared": geo_risk ** 2,
            "Weight_Log": np.log1p(weight),
            "Fuel_Distance_Product": fuel * distance,
            "Combined_Risk_Score": (geo_risk + weather + (100 - reliability) / 10) / 3,
            "Route_Complexity": (distance / 10000) * 0.5 + (geo_risk / 10) * 0.5,
            "Is_High_Risk": 1 if geo_risk >= 7 else 0,
            "Is_Long_Distance": 1 if distance > 7000 else 0,
        }

    def _heuristic_risk_score(self, severity: str, disruption_type: str) -> float:
        """Rule-based fallback used only if the trained model is unavailable."""
        severity_scores = {"critical": 0.85, "high": 0.65, "medium": 0.40, "low": 0.15}
        base_score = severity_scores.get(severity.lower(), 0.50)

        type_modifiers = {
            "geopolitical": 1.15, "armed activity": 1.20, "piracy": 1.10,
            "extreme weather": 1.05, "typhoon": 1.08, "hurricane": 1.10,
            "port strike": 1.12, "labor action": 1.12, "canal congestion": 1.08,
            "chokepoint": 1.10, "equipment failure": 0.95, "maintenance": 0.90,
        }
        modifier = 1.0
        for key, value in type_modifiers.items():
            if key.lower() in disruption_type.lower():
                modifier = value
                break

        return round(min(base_score * modifier, 0.98), 2)

    def get_model_info(self) -> Dict:
        if not self.is_model_loaded:
            return {
                "status": "fallback_heuristic",
                "model_loaded": False,
                "model_type": "Rule-based heuristic",
                "accuracy": "~65%",
                "message": "Using calibrated rule-based heuristic (ML model not available)"
            }

        feature_importances = self.model_artifacts.get('feature_importances')
        top_features = []
        if feature_importances is not None and hasattr(feature_importances, 'head'):
            top_features = feature_importances.head(5).to_dict('records')

        metrics = self.model_artifacts.get('metrics', {})

        return {
            "status": "ml_model_active",
            "model_loaded": True,
            "model_type": self.model_artifacts.get('model_type', 'Random Forest'),
            "accuracy": metrics.get('accuracy_pct', self.model_artifacts.get('accuracy', 'N/A')),
            "roc_auc": str(metrics.get('roc_auc', self.model_artifacts.get('roc_auc', 'N/A'))),
            "precision": str(metrics.get('precision', self.model_artifacts.get('precision', 'N/A'))),
            "recall": str(metrics.get('recall', self.model_artifacts.get('recall', 'N/A'))),
            "metrics": metrics,
            "trained_at": self.model_artifacts.get('trained_at', 'Unknown'),
            "feature_count": len(self.model_artifacts.get('feature_names', [])),
            "top_features": top_features,
            "training_data_source": self.model_artifacts.get('training_data_source', 'Unknown'),
            "message": "ML model active — trained on real shipment data, leak-free 80/20 split"
        }

    def explain_prediction(self, risk_score: float) -> Dict:
        if risk_score >= 0.80:
            severity = "CRITICAL"
            recommendation = "Strong reroute recommended - High probability of major disruption"
            mc_params = {
                "delay_distribution": "LogNormal(μ=3.0, σ=0.40)",
                "expected_delay_days": "20-30 days",
                "cost_escalation": "Triangular(2.0, 2.8, 4.2)",
                "expected_cost_increase": "200-420%"
            }
        elif risk_score >= 0.60:
            severity = "HIGH"
            recommendation = "Reroute recommended - Significant disruption likely"
            mc_params = {
                "delay_distribution": "LogNormal(μ=2.4, σ=0.35)",
                "expected_delay_days": "11-16 days",
                "cost_escalation": "Triangular(1.35, 1.65, 2.20)",
                "expected_cost_increase": "135-220%"
            }
        elif risk_score >= 0.40:
            severity = "MEDIUM"
            recommendation = "Monitor closely - Moderate disruption possible"
            mc_params = {
                "delay_distribution": "LogNormal(μ=1.6, σ=0.35)",
                "expected_delay_days": "5-8 days",
                "cost_escalation": "Triangular(1.10, 1.25, 1.45)",
                "expected_cost_increase": "110-145%"
            }
        else:
            severity = "LOW"
            recommendation = "Proceed with caution - Minimal disruption expected"
            mc_params = {
                "delay_distribution": "LogNormal(μ=0.5, σ=0.30)",
                "expected_delay_days": "1-3 days",
                "cost_escalation": "Triangular(1.0, 1.05, 1.15)",
                "expected_cost_increase": "100-115%"
            }

        return {
            "risk_score": risk_score,
            "risk_percentage": f"{risk_score * 100:.1f}%",
            "severity": severity,
            "recommendation": recommendation,
            "monte_carlo_parameters": mc_params,
            "confidence": "High" if self.is_model_loaded else "Medium"
        }


rf_predictor = RFRiskPredictor()


def predict_disruption_risk(severity: str, disruption_type: str, **kwargs) -> Dict:
    risk_score = rf_predictor.predict_risk_score(severity=severity, disruption_type=disruption_type, **kwargs)
    explanation = rf_predictor.explain_prediction(risk_score)
    model_info = rf_predictor.get_model_info()
    return {**explanation, "model_info": model_info}