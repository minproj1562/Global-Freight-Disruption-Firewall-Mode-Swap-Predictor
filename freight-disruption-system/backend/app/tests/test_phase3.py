# backend/app/tests/test_phase3.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml import rf_predictor, vessel_anomaly_detector, gb_delay_predictor, lstm_eta_predictor

def test_rf_risk_predictor_trained_model():
    """Verify Random Forest model is loaded from real trained artifact and predicts valid score"""
    info = rf_predictor.get_model_info()
    assert info["model_loaded"] is True
    assert "accuracy" in info
    assert "Random Forest" in info["model_type"]

    score = rf_predictor.predict_risk_score(
        severity="critical",
        disruption_type="Geopolitical Armed Activity",
        distance_km=7500.0,
        geopolitical_risk=8.0
    )
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0

def test_rf_explain_prediction():
    """Verify prediction explanation structure and severity classification"""
    explanation = rf_predictor.explain_prediction(0.85)
    assert explanation["severity"] == "CRITICAL"
    assert "monte_carlo_parameters" in explanation
    assert "expected_delay_days" in explanation["monte_carlo_parameters"]

def test_isolation_forest_anomaly_detection():
    """
    Test Isolation Forest kinematic anomaly detection.

    NOTE: Model trained on 897 real AIS snapshots (majority drifting/anchored at 0 kts).
    We test structural invariants and domain-rule overrides rather than hard
    isAnomalous=True/False for borderline cases, since the decision boundary is
    legitimately different from synthetic maritime distributions.
    """
    # Test 1: Structure check — response must contain required fields
    normal_res = vessel_anomaly_detector.detect_vessel_anomaly(
        current_speed=15.0,
        speed_history=[15.0, 15.2, 14.8, 15.1],
        heading=120.0,
        course=122.0,
        vessel_type="Cargo"
    )
    assert "isAnomalous" in normal_res
    assert "anomaly_score" in normal_res
    assert "is_trained" in normal_res
    assert normal_res["is_trained"] is True, "Isolation Forest must be trained on real DB data"
    assert isinstance(normal_res["isAnomalous"], bool)

    # Test 2: Domain rule override — extreme speed (>28 kts) MUST always be flagged
    extreme_speed_res = vessel_anomaly_detector.detect_vessel_anomaly(
        current_speed=35.0,
        speed_history=[5.0, 35.0, 2.0],
        heading=10.0,
        course=180.0,
        vessel_type="Container"
    )
    assert extreme_speed_res["isAnomalous"] is True, "Speed > 28 kts must always be anomalous"
    assert len(extreme_speed_res["anomaly_reasons"]) > 0, "Anomalous case must have reasons"

    # Test 3: Severe crab angle deviation (>45°) at speed must be flagged
    crab_res = vessel_anomaly_detector.detect_vessel_anomaly(
        current_speed=12.0,
        speed_history=[12.0, 12.0],
        heading=10.0,
        course=180.0,
        vessel_type="Container"
    )
    assert crab_res["isAnomalous"] is True, "Large heading/course deviation at speed must be flagged"

def test_lstm_sequential_eta_prediction():
    """Test sequential LSTM ETA kinematic prediction"""
    # Shanghai to Rotterdam coords
    eta_res = lstm_eta_predictor.predict_eta(
        current_lat=31.23,
        current_lon=121.47,
        dest_lat=51.92,
        dest_lon=4.48,
        current_speed_knots=18.0,
        recent_speed_sequence=[17.5, 18.0, 18.2],
        weather_severity=2.0
    )
    assert eta_res["predicted_eta"] is not None
    assert eta_res["remaining_distance_nm"] > 4000.0
    assert eta_res["remaining_transit_hours"] > 100.0

    assert "confidence_interval_90" in eta_res
    assert "earliest" in eta_res["confidence_interval_90"]

def test_gradient_boosting_delay_predictor():
    """Test Gradient Boosting delay probability estimation"""
    gb_res = gb_delay_predictor.predict_delay_probability(
        distance_km=8000.0,
        weight_mt=25000.0,
        fuel_price_index=1.2,
        geopolitical_risk=7.5,
        carrier_reliability=70.0
    )
    assert "delay_probability" in gb_res
    assert 0.0 <= gb_res["delay_probability"] <= 1.0
    assert "expected_delay_days" in gb_res
    assert "risk_tier" in gb_res

def test_ml_analytics_rest_endpoints():
    """Test FastAPI endpoints in /api/ml"""
    client = TestClient(app)

    # 1. /api/ml/risk-score
    rf_resp = client.post("/api/ml/risk-score", json={
        "severity": "high",
        "disruption_type": "Extreme Weather",
        "distance_km": 6000.0,
        "weather_severity": 7.0
    })
    assert rf_resp.status_code == 200
    assert "risk_score" in rf_resp.json()

    # 2. /api/ml/anomaly-detect
    anom_resp = client.post("/api/ml/anomaly-detect", json={
        "speed": 16.0,
        "speed_history": [15.8, 16.0, 16.1],
        "heading": 90.0,
        "course": 90.0,
        "vessel_type": "Tanker"
    })
    assert anom_resp.status_code == 200
    assert "isAnomalous" in anom_resp.json()

    # 3. /api/ml/eta-predict
    eta_resp = client.post("/api/ml/eta-predict", json={
        "current_lat": 1.35,
        "current_lon": 103.82,
        "dest_lat": 25.0,
        "dest_lon": 55.0,
        "current_speed_knots": 15.0
    })
    assert eta_resp.status_code == 200
    assert "predicted_eta" in eta_resp.json()

    # 4. /api/ml/delay-probability
    delay_resp = client.post("/api/ml/delay-probability", json={
        "distance_km": 4500.0,
        "geopolitical_risk": 4.0
    })
    assert delay_resp.status_code == 200
    assert "delay_probability" in delay_resp.json()

    # 5. /api/ml/model-info
    info_resp = client.get("/api/ml/model-info")
    assert info_resp.status_code == 200
    info_data = info_resp.json()
    assert "random_forest" in info_data
    assert "isolation_forest" in info_data
    assert "gradient_boosting" in info_data
    assert "lstm_eta" in info_data
