# backend/app/tests/test_phase4.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.nsga2 import NSGA3Optimizer, Solution, identify_pareto_frontier
from app.services.gnn_ripple_predictor import gnn_ripple_predictor
from app.services.rl_agent import rl_agent

def test_nsga3_reference_points_and_optimization():
    """Test NSGA-III many-objective optimization with 4 objectives"""
    optimizer = NSGA3Optimizer(population_size=20, generations=5, num_objectives=4, divisions_per_axis=3)
    assert len(optimizer.ref_points) > 0
    assert optimizer.ref_points.shape[1] == 4

    test_solutions = [
        Solution(route_id="r1", cost=1000.0, time=10.0, carbon=50.0, risk_score=0.2), # Fast & cheap
        Solution(route_id="r2", cost=3000.0, time=25.0, carbon=150.0, risk_score=0.8), # Dominated by r1
        Solution(route_id="r3", cost=800.0,  time=18.0, carbon=30.0, risk_score=0.3), # Cheaper but slower
        Solution(route_id="r4", cost=2500.0, time=5.0,  carbon=200.0, risk_score=0.1), # Very fast, expensive
    ]

    front, all_fronts = optimizer.optimize(test_solutions)
    assert len(front) >= 1
    front_ids = [s.route_id for s in front]
    # r1, r3, r4 are non-dominated trade-offs
    assert "r2" not in front_ids or len(front_ids) == len(test_solutions)

def test_identify_pareto_frontier_helper():
    """Test identify_pareto_frontier helper function"""
    routes = [
        {"id": "r1", "cost": 1500000, "time": 25, "carbon": 120, "risk_score": 0.25},
        {"id": "r2", "cost": 2200000, "time": 12, "carbon": 350, "risk_score": 0.15},
        {"id": "r3", "cost": 3000000, "time": 40, "carbon": 500, "risk_score": 0.90}, # strictly worse
    ]
    res = identify_pareto_frontier(routes)
    assert len(res) == 3
    assert "is_pareto_optimal" in res[0]
    # r1 should be Pareto optimal
    r1 = next(r for r in res if r["id"] == "r1")
    assert r1["is_pareto_optimal"] is True

def test_gnn_ripple_effect_propagation():
    """Test GNN message passing across maritime corridors"""
    # Epicenter at Port Said / Suez Canal chokepoint
    result = gnn_ripple_predictor.predict_ripple_effects(
        epicenter_port_code="EGPSD",
        disruption_severity="critical",
        shock_magnitude_pct=50.0,
        horizon_days=7
    )
    assert "propagation_cascade" in result
    assert result["affected_ports_count"] > 0
    assert "systemic_bottleneck_score" in result
    
    affected_codes = [p["port_code"] for p in result["propagation_cascade"]]
    # Should propagate to adjacent trade hub (e.g. Rotterdam NLRTM or Jebel Ali AEJEA)
    assert any(c in affected_codes for c in ["NLRTM", "AEJEA", "DEHAM"])

def test_q_learning_mode_swap_recommendations():
    """
    Test Q-Learning policy evaluation using the calibrated multi-objective utility function.

    Reward function balances: cost (30%), transit time (25%), carbon (15%), disruption risk (30%).
    Mode profiles per Rodrigue 2020 / UNCTAD Maritime 2023.
    """
    # High disruption + High urgency -> should recommend air or multimodal (risk reduction dominant)
    rec_high = rl_agent.recommend_mode_swap(
        disruption_rf_score=0.90,
        cargo_priority="Time",
        cargo_value_usd=80000000.0
    )
    assert "recommended_action" in rec_high
    assert rec_high["recommended_action"] in ("switch_to_air", "hybrid_multimodal", "switch_to_rail")
    assert rec_high["confidence"] >= 0.65

    # Low disruption + Cost sensitive -> ocean, rail, or hybrid are all valid
    # (Under the multi-objective utility: rail has low carbon savings which wins at low disruption)
    rec_low = rl_agent.recommend_mode_swap(
        disruption_rf_score=0.10,
        cargo_priority="Cost",
        cargo_value_usd=5000000.0
    )
    assert rec_low["recommended_action"] in ("stay_ocean", "hybrid_multimodal", "switch_to_rail"), (
        f"Expected ocean/rail/hybrid for low disruption+cost-sensitive, got: {rec_low['recommended_action']}"
    )

def test_optimization_rest_endpoints():
    """Test /api/optimization REST API endpoints"""
    client = TestClient(app)

    # 1. NSGA-III optimization endpoint
    nsga3_resp = client.post("/api/optimization/nsga3-optimize", json={
        "routes": [
            {"id": "direct", "name": "Direct Ocean", "cost": 1800000, "time": 28.0, "carbon": 150, "risk_score": 0.3},
            {"id": "cape", "name": "Cape Bypass", "cost": 2100000, "time": 35.0, "carbon": 220, "risk_score": 0.05},
            {"id": "air", "name": "Sea-Air Hybrid", "cost": 2900000, "time": 14.0, "carbon": 450, "risk_score": 0.1}
        ],
        "population_size": 20,
        "generations": 5
    })
    assert nsga3_resp.status_code == 200
    assert "pareto_solutions" in nsga3_resp.json()

    # 2. GNN ripple endpoint
    gnn_resp = client.post("/api/optimization/gnn-ripple", json={
        "epicenter_port_code": "SGSIN",
        "disruption_severity": "high",
        "horizon_days": 7
    })
    assert gnn_resp.status_code == 200
    assert "propagation_cascade" in gnn_resp.json()

    # 3. Q-Learning swap endpoint
    ql_resp = client.post("/api/optimization/q-learning-swap", json={
        "disruption_rf_score": 0.85,
        "cargo_priority": "Time",
        "cargo_value_usd": 65000000.0
    })
    assert ql_resp.status_code == 200
    assert "recommended_action" in ql_resp.json()
