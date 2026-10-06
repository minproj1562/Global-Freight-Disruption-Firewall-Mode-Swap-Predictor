# backend/app/schemas/route_mapping.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class RoutePortMappingItem(BaseModel):
    port_id: str
    port_name: str
    port_code: str
    sequence_order: int

    class Config:
        from_attributes = True


class MonitoredRouteResponse(BaseModel):
    id: str
    route_name: str
    logistics_manager_id: str
    vessel_id: Optional[str] = None
    origin_port_id: str
    destination_port_id: str
    status: str
    created_at: datetime
    ports_touched: List[RoutePortMappingItem] = []

    class Config:
        from_attributes = True


class CongestionAlertPayload(BaseModel):
    """Shape of the message pushed over /ws/alerts and through the Redis
    'congestion_alerts' channel."""
    event_type: str = "PORT_CONGESTION_CHANGE"
    port_id: str
    port_name: str
    port_code: str
    congestion_percent: int
    congestion_level: str
    updated_by: Optional[str] = None
    affected_routes: List[dict] = []   # [{route_id, route_name, logistics_manager_id, user_id}]
    affected_user_ids: List[str] = []  # User.id values to push the alert to
    timestamp: str