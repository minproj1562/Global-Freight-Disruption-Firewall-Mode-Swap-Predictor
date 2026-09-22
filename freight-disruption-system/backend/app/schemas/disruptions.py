# backend/app/schemas/disruptions.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AffectedVesselItem(BaseModel):
    id: str
    name: str
    mmsi: int
    vessel_type: str = "Container"
    flag: str = "Unknown"
    distance_to_epicenter_nm: float = 0.0
    status: str = "At Risk"
    eta_impact_hours: float = 0.0
    destination_port: str = ""

class RecommendedRerouteOption(BaseModel):
    id: str
    title: str
    mode: str = "Sea -> Air"
    estimated_delay_avoided_days: float = 0.0
    cost_delta_usd: float = 0.0
    co2_reduction_percent: float = 0.0
    confidence_score: float = 0.0
    transit_summary: str = ""
    suggested_carrier: str = ""

class AlertCenterDisruptionItem(BaseModel):
    id: str
    name: str
    type: str
    category: str = "geopolitical"
    severity: str = "critical"  # critical, high, medium, low
    status: str = "unacknowledged"  # unacknowledged, acknowledged, resolved
    location_name: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    radius_nm: float = 100.0
    polygon_coordinates: List[List[float]] = []
    affected_vessels_count: int = 0
    affected_vessels_list: List[AffectedVesselItem] = []
    active_since: str = ""
    time_since_detected: str = ""
    estimated_duration_remaining: str = ""
    description: str = ""
    mitigation_advice: str = ""
    recommended_action: Optional[RecommendedRerouteOption] = None

class DisruptionActionResponse(BaseModel):
    id: str
    status: str
    message: str
    updated_at: str
