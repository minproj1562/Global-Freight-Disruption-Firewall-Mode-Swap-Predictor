# backend/app/routers/optimization.py
"""
Advanced Optimization & Graph Analytics Router.
Exposes NSGA-III 4-Objective Pareto Optimization, GNN Maritime Ripple Effect Prediction,
and Q-Learning Multimodal Mode-Swap Triggers.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.database import get_db
from app.services.nsga2 import NSGA3Optimizer, Solution, identify_pareto_frontier
from app.services.gnn_ripple_predictor import gnn_ripple_predictor
from app.services.rl_agent import rl_agent

router = APIRouter(prefix="/api/optimization", tags=["Advanced Optimization & GNN"])

class NSGA3RouteItem(BaseModel):
    id: str
    name: str
    cost: float
    time: float
    carbon: float
    risk_score: float

class NSGA3OptimizeRequest(BaseModel):
    routes: List[NSGA3RouteItem]
    population_size: Optional[int] = Field(50, ge=10, le=200)
    generations: Optional[int] = Field(25, ge=5, le=100)

class GNNRippleRequest(BaseModel):
    epicenter_port_code: str = Field(..., description="UN/LOCODE of disrupted port/chokepoint (e.g. EGPSD, SGSIN, NLRTM)")
    disruption_severity: Optional[str] = Field("critical", description="Severity (low, medium, high, critical)")
    shock_magnitude_pct: Optional[float] = Field(45.0, ge=0.0, le=100.0)
    horizon_days: Optional[int] = Field(7, description="Prediction horizon: 3, 7, or 14 days")

class QLearningSwapRequest(BaseModel):
    disruption_rf_score: float = Field(..., ge=0.0, le=1.0, description="Predicted disruption risk score (0-1)")
    cargo_priority: Optional[str] = Field("Balanced", description="Time, Cost, Balanced, or Carbon")
    cargo_value_usd: Optional[float] = Field(40000000.0, description="Total cargo value in USD")

@router.post("/nsga3-optimize")
def run_nsga3_optimization(payload: NSGA3OptimizeRequest):
    """Execute NSGA-III 4-objective Pareto optimization (Cost, Time, Carbon, Risk)."""
    solutions = [
        Solution(
            route_id=r.id,
            cost=r.cost,
            time=r.time,
            carbon=r.carbon,
            risk_score=r.risk_score
        )
        for r in payload.routes
    ]

    optimizer = NSGA3Optimizer(
        population_size=payload.population_size,
        generations=payload.generations,
        num_objectives=4
    )
    pareto_front, all_fronts = optimizer.optimize(solutions)

    return {
        "algorithm": "NSGA-III (4-Objective Hyperplane Reference Directions)",
        "pareto_optimal_count": len(pareto_front),
        "total_fronts": len(all_fronts),
        "pareto_solutions": [
            {
                "route_id": s.route_id,
                "cost": round(s.cost, 2),
                "time_days": round(s.time, 2),
                "carbon_tons": round(s.carbon, 2),
                "risk_score": round(s.risk_score, 3),
                "rank": s.rank
            }
            for s in pareto_front
        ]
    }

@router.post("/gnn-ripple")
def predict_maritime_ripple_effect(payload: GNNRippleRequest, db: Session = Depends(get_db)):
    """Predict spatial-temporal ripple effect congestion cascade using Graph Convolution."""
    return gnn_ripple_predictor.predict_ripple_effects(
        epicenter_port_code=payload.epicenter_port_code,
        disruption_severity=payload.disruption_severity,
        shock_magnitude_pct=payload.shock_magnitude_pct,
        horizon_days=payload.horizon_days,
        db=db
    )

@router.post("/q-learning-swap")
def recommend_q_learning_mode_swap(payload: QLearningSwapRequest):
    """Generate mode-swap trigger recommendation from learned Q-Policy."""
    return rl_agent.recommend_mode_swap(
        disruption_rf_score=payload.disruption_rf_score,
        cargo_priority=payload.cargo_priority,
        cargo_value_usd=payload.cargo_value_usd
    )
