# backend/app/routers/ml_analytics.py
"""
Machine Learning Inference Router.
Exposes REST endpoints for Random Forest Risk Scoring, Isolation Forest Anomaly Detection,
LSTM ETA Forecasting, and Gradient Boosting Delay Probability.
"""
from fastapi import APIRouter, Query, HTTPException, status
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from app.ml import rf_predictor, vessel_anomaly_detector, gb_delay_predictor, lstm_eta_predictor

router = APIRouter(prefix="/api/ml", tags=["ML Models & Analytics"])

class RiskPredictionRequest(BaseModel):
    severity: str = Field(..., description="Disruption severity (low, medium, high, critical)")
    disruption_type: str = Field(..., description="Type of disruption event")
    distance_km: Optional[float] = Field(5000.0, description="Route distance in km")
    geopolitical_risk: Optional[float] = Field(5.0, description="Geopolitical risk score (0-10)")
    weather_severity: Optional[float] = Field(3.0, description="Weather severity index (0-10)")
    port_congestion: Optional[float] = Field(30.0, description="Port congestion % (0-100)")
    carrier_reliability: Optional[float] = Field(85.0, description="Carrier reliability %")
    weight_mt: Optional[float] = Field(1000.0, description="Cargo weight in metric tons")
    fuel_price_index: Optional[float] = Field(1.0, description="Fuel price index")

class AnomalyDetectionRequest(BaseModel):
    speed: float = Field(..., description="Current vessel speed in knots")
    speed_history: Optional[List[float]] = Field(default_factory=list, description="Recent speed history")
    heading: Optional[float] = Field(0.0, description="Current heading degrees")
    course: Optional[float] = Field(0.0, description="Current course over ground degrees")
    vessel_type: Optional[str] = Field("Cargo", description="Vessel category")

class ETAPredictionRequest(BaseModel):
    current_lat: float = Field(..., description="Current latitude")
    current_lon: float = Field(..., description="Current longitude")
    dest_lat: float = Field(..., description="Destination port latitude")
    dest_lon: float = Field(..., description="Destination port longitude")
    current_speed_knots: float = Field(14.0, description="Current speed in knots")
    recent_speeds: Optional[List[float]] = Field(default_factory=list, description="Recent speed history")
    weather_severity: Optional[float] = Field(0.0, description="Weather severity (0-10)")

class DelayProbabilityRequest(BaseModel):
    distance_km: float = Field(..., description="Route distance in km")
    weight_mt: Optional[float] = Field(20000.0, description="Shipment weight in metric tons")
    fuel_price_index: Optional[float] = Field(1.0, description="Fuel price index")
    geopolitical_risk: Optional[float] = Field(5.0, description="Geopolitical risk (0-10)")
    carrier_reliability: Optional[float] = Field(85.0, description="Carrier reliability %")

@router.post("/risk-score")
def predict_risk_score(payload: RiskPredictionRequest):
    """Predict disruption risk score using trained Random Forest model."""
    risk_score = rf_predictor.predict_risk_score(
        severity=payload.severity,
        disruption_type=payload.disruption_type,
        distance_km=payload.distance_km,
        port_congestion=payload.port_congestion,
        weather_severity=payload.weather_severity,
        geopolitical_risk=payload.geopolitical_risk,
        carrier_reliability=payload.carrier_reliability,
        weight_mt=payload.weight_mt,
        fuel_price_index=payload.fuel_price_index
    )
    explanation = rf_predictor.explain_prediction(risk_score)
    model_info = rf_predictor.get_model_info()
    return {
        "risk_score": risk_score,
        **explanation,
        "model_info": model_info
    }

@router.post("/anomaly-detect")
def detect_vessel_anomaly(payload: AnomalyDetectionRequest):
    """Evaluate kinematic anomaly score using Isolation Forest."""
    return vessel_anomaly_detector.detect_vessel_anomaly(
        current_speed=payload.speed,
        speed_history=payload.speed_history,
        heading=payload.heading,
        course=payload.course,
        vessel_type=payload.vessel_type
    )

@router.post("/eta-predict")
def predict_vessel_eta(payload: ETAPredictionRequest):
    """Predict voyage ETA using sequential LSTM/kinematics model."""
    return lstm_eta_predictor.predict_eta(
        current_lat=payload.current_lat,
        current_lon=payload.current_lon,
        dest_lat=payload.dest_lat,
        dest_lon=payload.dest_lon,
        current_speed_knots=payload.current_speed_knots,
        recent_speed_sequence=payload.recent_speeds,
        weather_severity=payload.weather_severity or 0.0
    )

@router.post("/delay-probability")
def predict_delay_probability(payload: DelayProbabilityRequest):
    """Predict delay probability using Gradient Boosting Classifier."""
    return gb_delay_predictor.predict_delay_probability(
        distance_km=payload.distance_km,
        weight_mt=payload.weight_mt or 20000.0,
        fuel_price_index=payload.fuel_price_index or 1.0,
        geopolitical_risk=payload.geopolitical_risk or 5.0,
        carrier_reliability=payload.carrier_reliability or 85.0
    )

@router.get("/model-info")
def get_all_models_metadata():
    """Retrieve metadata and training status for all 4 Phase 3 ML models."""
    return {
        "random_forest": rf_predictor.get_model_info(),
        "isolation_forest": {
            "model_type": "Isolation Forest (Contamination 0.05)",
            "is_trained": vessel_anomaly_detector.is_trained,
            "features": ["speed_knots", "heading_delta_deg", "speed_variance"],
            "target": "Vessel Kinematic Anomaly (isAnomalous)"
        },
        "gradient_boosting": {
            "model_type": "HistGradientBoostingClassifier",
            "is_trained": gb_delay_predictor.is_trained,
            "features": ['Distance_km', 'Weight_MT', 'Fuel_Price_Index', 'Geopolitical_Risk_Score', 'Carrier_Reliability_Score'],
            "target": "Voyage Disruption / Delay Probability"
        },
        "lstm_eta": {
            "model_type": "Kinematic Sequential ETA Model",
            "is_trained": True,
            "target": "Remaining Transit Hours & ETA Datetime"
        }
    }
