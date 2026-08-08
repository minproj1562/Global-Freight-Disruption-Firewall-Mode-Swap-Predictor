# backend/app/schemas/admin.py
from pydantic import BaseModel, Field
from typing import Optional, List, Any

# ============= PAGE 4.2: DISRUPTION MANAGEMENT SCHEMAS =============

class GlobalDisruptionCreate(BaseModel):
    type: str = Field(alias="disruption_type")
    locationName: str = Field(alias="location_name")
    latitude: float
    longitude: float
    startDate: str = Field(alias="start_date")
    endDate: str = Field(alias="end_date")
    severity: str
    radiusNm: float = Field(alias="radius_nm", default=100.0)
    description: str

    class Config:
        populate_by_name = True

class GlobalDisruptionUpdate(BaseModel):
    type: Optional[str] = Field(None, alias="disruption_type")
    locationName: Optional[str] = Field(None, alias="location_name")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    startDate: Optional[str] = Field(None, alias="start_date")
    endDate: Optional[str] = Field(None, alias="end_date")
    severity: Optional[str] = None
    radiusNm: Optional[float] = Field(None, alias="radius_nm")
    description: Optional[str] = None
    resolved: Optional[bool] = None

    class Config:
        populate_by_name = True

class GlobalDisruptionResponse(BaseModel):
    id: str
    type: str = Field(alias="disruption_type")
    locationName: str = Field(alias="location_name")
    latitude: float
    longitude: float
    startDate: str = Field(alias="start_date")
    endDate: str = Field(alias="end_date")
    severity: str
    radiusNm: float = Field(alias="radius_nm")
    description: str
    affectedVesselsCount: int = Field(alias="affected_vessels_count")
    resolved: bool

    class Config:
        populate_by_name = True
        from_attributes = True

# ============= PAGE 4.1: SYSTEM HEALTH SCHEMAS =============

class HealthCardMetric(BaseModel):
    label: str
    value: str

class SystemHealthCardResponse(BaseModel):
    id: str
    name: str
    status: str
    uptimePct: float = Field(alias="uptime_pct")
    latencyMs: float = Field(alias="latency_ms")
    lastSync: str = Field(alias="last_sync")
    details: str
    metrics: List[HealthCardMetric]

    class Config:
        populate_by_name = True
        from_attributes = True

class SystemErrorLogResponse(BaseModel):
    id: str
    timestamp: str = Field(alias="timestamp_str")
    service: str
    severity: str
    code: str
    message: str
    stackTrace: str = Field(alias="stack_trace")
    resolved: bool

    class Config:
        populate_by_name = True
        from_attributes = True

class ApiUsageDataPointResponse(BaseModel):
    time: str
    totalRequests: int
    aisRequests: int
    weatherRequests: int
    portRequests: int
    errorCount: int
