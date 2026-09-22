# backend/app/schemas/active_routes.py
from pydantic import BaseModel
from typing import Optional, List

class ActiveRouteItem(BaseModel):
    id: str
    vessel_id: str
    vessel_name: str
    vessel_mmsi: int
    vessel_imo: int
    vessel_flag: str
    vessel_type: str
    origin_port_name: str
    origin_port_code: str
    destination_port_name: str
    destination_port_code: str
    current_location_name: str
    current_coordinates: List[float]
    mode: str
    multimodal_modes: List[str]
    eta: str
    eta_predicted_ml: str
    delay_hours: float
    delay_probability_pct: float
    ml_risk_score: Optional[float] = None
    recommended_action: str
    status: str
    risk_level: str
    risk_reason: str
    cargo_summary: str
    carrier_name: Optional[str] = None
    consignor_company: Optional[str] = None
    waypoints: List[List[float]]
    progress_percent: float
    avg_speed_knots: float
    distance_remaining_nm: float

class ActiveRoutesStatsResponse(BaseModel):
    total_active_routes: int
    delayed_routes: int
    critical_hazard_routes: int
    avg_delay_hours: float
    high_risk_routes: int
