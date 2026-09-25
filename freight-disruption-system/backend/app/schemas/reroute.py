# backend/app/schemas/reroute.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

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
    ml_risk_score: Optional[float] = None
    co2_carbon_footprint_tons: float
    savings_vs_original: SavingsVsOriginal
    transit_summary: str
    carrier_name: str
    strategy_label: Optional[str] = None
    corridor_name: Optional[str] = None

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

class CostBreakdownDetailSchema(BaseModel):
    ocean_freight: float = 0.0
    bunker_fuel: float = 0.0
    charter_daily_rate: float = 0.0
    port_call_charges: float = 0.0
    canal_transit_fees: float = 0.0
    rail_freight: float = 0.0
    air_freight: float = 0.0
    road_freight: float = 0.0
    insurance_base: float = 0.0
    insurance_war_risk: float = 0.0
    insurance_hull: float = 0.0
    inventory_holding_cost: float = 0.0
    demurrage_detention: float = 0.0
    customs_duties: float = 0.0
    handling_charges: float = 0.0
    documentation_fees: float = 0.0
    contingency_buffer: float = 0.0
    subtotal: float = 0.0
    taxes_surcharges: float = 0.0
    total_cost_usd: float = 0.0
    exchange_rate_usd_inr: float = 83.25
    total_cost_inr: float = 0.0

class RouteLegSchema(BaseModel):
    leg_number: int
    mode: str  # Sea, Rail, Air, Road
    from_location: str
    to_location: str
    distance_km: float
    duration_days: float
    cost_usd: float
    co2_tons: float
    carrier: str
    handover_point: Optional[str] = None
    handover_duration_hours: float = 0.0

class GanttChartSchema(BaseModel):
    route_id: str
    route_name: str
    legs: List[RouteLegSchema]
    total_duration_days: float
    handover_count: int

class ConfirmRerouteRequest(BaseModel):
    simulation_request: RouteRequestSchema
    selected_route: RouteResultSchema
    alternatives_considered: List[RouteResultSchema]
    dijkstra_comparison: DijkstraComparisonSchema
    rationale: Optional[str] = "AI-recommended optimal reroute to avoid disruption"
    alert_timestamp: Optional[datetime] = None

class ConfirmRerouteResponse(BaseModel):
    decision_id: str
    status: str = "confirmed"
    message: str
    pdf_url: Optional[str] = None
    dispatch_status: str = "queued"
    estimated_savings_usd: float
    estimated_time_saved_days: float

class DecisionAuditTrailItem(BaseModel):
    decision_id: str
    timestamp: str
    user_name: str
    organization: str
    route_name: str
    origin: str
    destination: str
    vessel_name: str
    disruption_avoided: str
    cost_saved_usd: float
    time_saved_days: float
    status: str
    rationale: str
    predicted_eta: Optional[str] = None
    actual_eta: Optional[str] = None
    decision_time_minutes: Optional[float] = None
