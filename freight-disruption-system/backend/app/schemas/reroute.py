# backend/app/schemas/reroute.py
from pydantic import BaseModel, Field
from typing import Optional, List

class RouteRequestSchema(BaseModel):
    origin_port: str
    destination_port: str
    vessel_id: str
    cargo_type: str = "High-Tech Consumer Electronics"
    priority: str = "Balanced"  # Cost, Time, Balanced, Carbon
    disruption_to_avoid: Optional[str] = None
    cargo_value_usd: Optional[float] = 42000000.0

class ModeBreakdown(BaseModel):
    sea: float = 0.0
    rail: float = 0.0
    air: float = 0.0
    road: float = 0.0

class SavingsVsOriginal(BaseModel):
    cost_usd: float = 0.0
    time_days: float = 0.0

class RouteResultSchema(BaseModel):
    id: str
    rank: int
    is_recommended: bool = False
    title: str
    mode_breakdown: ModeBreakdown
    waypoints: List[List[float]] = []
    waypoint_names: List[str] = []
    total_cost_usd: float
    total_time_days: float
    confidence_score: float
    risk_level: str  # low, medium, high, critical
    co2_carbon_footprint_tons: float
    savings_vs_original: SavingsVsOriginal
    transit_summary: str
    carrier_name: str

class SimulatedPointSchema(BaseModel):
    id: str
    cost: float
    time: float
    confidence: float
    risk: str  # low, medium, high, critical
    isTop3: bool = False
    rank: Optional[int] = None
    routeName: Optional[str] = None
    modeLabel: Optional[str] = None

class MCDiffSchema(BaseModel):
    cost_saved_usd: float
    time_saved_days: float
    risk_reduction: str

class DijkstraComparisonSchema(BaseModel):
    route_name: str
    cost_usd: float
    time_days: float
    risk_level: str
    co2_tons: float
    bottlenecks: List[str]
    details: str
    mc_diff: MCDiffSchema

class SimulationResultSchema(BaseModel):
    request: RouteRequestSchema
    total_simulations_run: int = 2000
    recommended_routes: List[RouteResultSchema]
    scatter_cloud: List[SimulatedPointSchema]
    dijkstra_comparison: DijkstraComparisonSchema
