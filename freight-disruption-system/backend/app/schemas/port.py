# backend/app/schemas/port.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ============= PORT SCHEMAS =============

class PortResponse(BaseModel):
    id: str
    name: str
    code: str
    country: str
    latitude: float
    longitude: float
    berth_capacity: int
    active_berths_used: int
    congestion_level: str
    congestion_percent: int
    waiting_vessels: int
    avg_wait_hours: float
    status_label: str
    primary_exports: List[str]
    
    class Config:
        from_attributes = True

class BerthSlotResponse(BaseModel):
    id: str
    berth_number: str
    berth_name: Optional[str]
    berth_type: Optional[str]
    is_occupied: bool
    current_vessel_mmsi: Optional[int]
    current_vessel_name: Optional[str]
    occupied_since: Optional[datetime]
    estimated_departure: Optional[datetime]
    cargo_operation: Optional[str]
    loading_progress_percent: int
    max_vessel_length_meters: Optional[float]
    max_draught_meters: Optional[float]
    crane_count: int
    
    class Config:
        from_attributes = True

class VesselArrivalResponse(BaseModel):
    id: str
    vessel_mmsi: int
    vessel_name: str
    vessel_type: Optional[str]
    vessel_flag: Optional[str]
    eta: datetime
    ata: Optional[datetime]
    etd: Optional[datetime]
    status: str
    berth_assignment_status: str
    cargo_type: Optional[str]
    cargo_tonnage: Optional[float]
    teu_count: Optional[int]
    
    class Config:
        from_attributes = True

class PortCongestionHistoryResponse(BaseModel):
    timestamp: datetime
    congestion_percent: int
    waiting_vessels: int
    avg_wait_hours: float
    disruption_flag: bool
    disruption_reason: Optional[str]
    
    class Config:
        from_attributes = True

class PortDisruptionCreate(BaseModel):
    disruption_type: str
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    title: str
    description: Optional[str]

class PortDisruptionResponse(BaseModel):
    id: str
    port_id: str
    disruption_type: str
    severity: str
    title: str
    description: Optional[str]
    is_active: bool
    started_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class PortDetailResponse(PortResponse):
    """Extended port response with all relationships"""
    berth_slots: List[BerthSlotResponse]
    vessel_arrivals: List[VesselArrivalResponse]  # 72-hour schedule
    congestion_history: List[PortCongestionHistoryResponse]  # Last 7 days
    active_disruptions: List[PortDisruptionResponse]
    
    class Config:
        from_attributes = True