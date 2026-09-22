# backend/app/schemas/map.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MapVesselResponse(BaseModel):
    id: str
    mmsi: int
    imo: int = 0
    name: str
    flag: str = "Unknown"
    vessel_type: str = "Container"
    speed: float = 0.0
    heading: float = 0.0
    course: float = 0.0
    latitude: float
    longitude: float
    destination_port: str = ""
    eta: Optional[str] = None
    status: str = "normal"  # normal, at-risk, disrupted
    destination_lat: float = 0.0
    destination_lon: float = 0.0
    speed_history: List[float] = []
    length_meters: Optional[float] = None
    capacity_teu: Optional[int] = None
    draught_meters: Optional[float] = None
    current_risk_reason: Optional[str] = None
    cargo_summary: Optional[str] = None

    class Config:
        from_attributes = True

class MapPortResponse(BaseModel):
    id: str
    name: str
    code: str
    country: str
    latitude: float
    longitude: float
    congestion_level: str = "low"
    waiting_vessels: int = 0
    avg_wait_hours: float = 0.0
    berth_capacity: int = 0
    active_berths_used: int = 0
    congestion_history: List[int] = []
    primary_exports: List[str] = []

    class Config:
        from_attributes = True

class RecommendedActionResponse(BaseModel):
    id: str
    disruption_id: str
    summary: str
    action_type: str
    estimated_delay_avoided_days: float = 0.0
    estimated_cost_delta_usd: float = 0.0
    affected_vessels_count: int = 0
    suggested_route_id: Optional[str] = None
    confidence_score: float = 0.0

class MapDisruptionResponse(BaseModel):
    id: str
    name: str
    type: str
    category: Optional[str] = None
    severity: str = "medium"
    status: Optional[str] = None
    description: str = ""
    polygon_coordinates: List[List[float]] = []
    affected_vessels_count: int = 0
    active_since: str = ""
    time_since_detected: Optional[str] = None
    estimated_duration_remaining: Optional[str] = None
    location_name: Optional[str] = None
    mitigation_advice: str = ""
    recommended_action: Optional[RecommendedActionResponse] = None
    is_new: bool = False

    class Config:
        from_attributes = True

class ModeSwapOptionResponse(BaseModel):
    id: str
    mode: str
    hub_port_code: str
    estimated_time_saving_days: float = 0.0
    estimated_cost_delta_usd: float = 0.0
    co2_impact_percent: float = 0.0
    feasibility_score: float = 0.0
    recommended_carrier: str = ""
    transit_summary: str = ""

class MapRouteResponse(BaseModel):
    id: str
    vessel_id: str
    vessel_name: str
    origin_port: str
    destination_port: str
    waypoints: List[List[float]] = []
    requires_reroute: bool = False
    recommended_mode_swap: Optional[ModeSwapOptionResponse] = None

    class Config:
        from_attributes = True

class KPISnapshotResponse(BaseModel):
    total_vessels: int = 0
    active_disruptions: int = 0
    vessels_affected: int = 0
    routes_needing_reroute: int = 0
    last_updated: str = ""

class MapSearchResultResponse(BaseModel):
    id: str
    type: str
    name: str
    subtitle: str
    latitude: float
    longitude: float

class VesselPositionHistoryResponse(BaseModel):
    latitude: float
    longitude: float
    speed: float = 0.0
    heading: float = 0.0
    recorded_at: str

    class Config:
        from_attributes = True

class SecondaryInfrastructureResponse(BaseModel):
    id: str
    name: str
    type: str
    latitude: float
    longitude: float
    status: str = "Operational"
