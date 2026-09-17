from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.core.security import get_current_active_user
from app.schemas.simulation import ParameterSweepRequest, MonteCarloRequest, NSGA2Request
from app.services.simulation_engine import (
    run_parameter_sweep,
    run_monte_carlo_simulation,
    run_nsga2_optimization,
    get_simulation_templates
)

router = APIRouter(prefix="/api/simulation", tags=["Simulation & Analytics Lab"])

@router.get("/templates")
def get_templates(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Get available disruption templates, ports, and vessels for scenario configuration"""
    return get_simulation_templates(db)

@router.post("/parameter-sweep")
def run_parameter_sweep_endpoint(
    config: ParameterSweepRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """Run batch parameter sweep simulation across fuel price and congestion ranges.
    Returns up to 63 scenario results with cost/time/carbon/risk analysis."""
    return run_parameter_sweep(config.model_dump(), db)

@router.post("/monte-carlo")
def run_monte_carlo_endpoint(
    config: MonteCarloRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Run Monte Carlo stochastic simulation (up to 50,000 iterations).
    Returns convergence data, cost distribution histogram, outlier analysis."""
    return run_monte_carlo_simulation(config.model_dump(), db)

@router.post("/nsga2-optimize")
def run_nsga2_endpoint(
    config: NSGA2Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Run NSGA-II multi-objective optimization (Cost vs Time vs Carbon).
    Returns Pareto-optimal routes and trade-off matrix."""
    return run_nsga2_optimization(config.model_dump(), db)
