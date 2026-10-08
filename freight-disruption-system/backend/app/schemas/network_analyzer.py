# backend/app/schemas/network_analyzer.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class DirectTradePartner(BaseModel):
    port_id: str
    port_name: str
    port_code: str
    avg_transit_days: float


class NetworkOverviewResponse(BaseModel):
    port_id: str
    port_name: str
    port_code: str
    trade_chokepoint_score_pct: float
    trade_chokepoint_label: str
    trade_chokepoint_explainer: str
    direct_trade_partners_count: int
    direct_connectivity_pct: float
    single_point_of_failure_risk_label: str
    single_point_of_failure_explainer: str
    vulnerability_score_0_100: float
    risk_tier: str
    global_rank_by_importance: int
    total_ports_in_network: int
    direct_trade_partners: List[DirectTradePartner]


class AlternativeRouteItem(BaseModel):
    from_port_name: str
    to_port_name: str
    has_alternative: bool
    alternate_path_names: List[str]
    extra_transit_days: Optional[float]
    plain_language_summary: str


class ShutdownAffectedPort(BaseModel):
    port_name: str
    port_code: str
    congestion_increase_pct: float
    risk_level: str
    days_3: float
    days_7: float
    days_14: float


class ShutdownSimulationResponse(BaseModel):
    port_id: str
    port_name: str
    severity_simulated: str
    prediction_engine: str
    plain_language_summary: str
    affected_ports: List[ShutdownAffectedPort]


class TechnicalDetailsResponse(BaseModel):
    port_id: str
    degree_centrality: float
    betweenness_centrality: float
    closeness_centrality: float
    eigenvector_centrality: float
    is_articulation_point: bool
    vulnerability_score: float
    total_network_nodes: int
    total_network_edges: int
    gnn_model_info: Dict[str, Any]


# ============================================================
# RIPPLE DASHBOARD SCHEMAS (Port Manager primary view)
# ============================================================

class IncomingThreat(BaseModel):
    upstream_port_id: str
    upstream_port_name: str
    upstream_port_code: str
    upstream_congestion_now_pct: float
    upstream_trend_label: str
    predicted_congestion_increase_pct: float
    additional_waiting_vessels: int
    additional_dwell_days: float
    time_to_impact_days: int
    risk_level: str
    confidence_pct: float
    prediction_engine: str
    plain_language_summary: str


class OutgoingImpact(BaseModel):
    downstream_port_id: str
    downstream_port_name: str
    downstream_port_code: str
    predicted_congestion_increase_pct: float
    additional_waiting_vessels: int
    time_to_impact_days: int
    risk_level: str
    recommended_coordination: str
    plain_language_summary: str


class PortHealthBanner(BaseModel):
    port_id: str
    port_name: str
    status: str
    headline: str
    hours_to_prepare: Optional[float]
    confidence_pct: float
    outgoing_ports_affected_count: int
    generated_at: str


class PreparationAction(BaseModel):
    time_window: str
    action: str
    resource_required: str
    expected_outcome: str
    status: str


class HistoricalPrecedent(BaseModel):
    event_name: str
    location: str
    duration_days: int
    vessels_affected: int
    avg_industry_delay_days: float
    summary: str


class RippleDashboardResponse(BaseModel):
    banner: PortHealthBanner
    incoming_threats: List[IncomingThreat]
    outgoing_impacts: List[OutgoingImpact]
    preparation_plan: List[PreparationAction]
    historical_precedents: List[HistoricalPrecedent]


# ============================================================
# GRAPH TOPOLOGY SCHEMAS (Map Visualization — Network Watch page)
# ============================================================

class GraphNode(BaseModel):
    port_id: str
    port_name: str
    port_code: str
    latitude: Optional[float]
    longitude: Optional[float]
    congestion_percent: float
    is_center: bool
    relation: str  # "self" | "incoming_threat" | "outgoing_impact" | "connected"
    risk_level: str  # "NONE" | "LOW" | "MEDIUM" | "HIGH"


class GraphEdge(BaseModel):
    from_port_id: str
    to_port_id: str
    direction: str  # "incoming" | "outgoing" | "neutral"
    risk_level: str
    predicted_increase_pct: float
    transit_days: float


class GraphTopologyResponse(BaseModel):
    center_port_id: str
    center_port_name: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]