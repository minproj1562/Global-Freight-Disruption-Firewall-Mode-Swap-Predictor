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

# ============= PAGE 4.4: USER MANAGEMENT SCHEMAS =============

class AdminUserCreate(BaseModel):
    name: str = Field(..., alias="full_name")
    email: str
    role: str
    status: Optional[str] = Field("Active", alias="status_label")
    assignedPort: Optional[str] = Field("Global Control HQ", alias="assigned_port")
    department: Optional[str] = Field("Operations", alias="department")
    phone: Optional[str] = Field("", alias="phone")

    class Config:
        populate_by_name = True

class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(None, alias="full_name")
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = Field(None, alias="status_label")
    assignedPort: Optional[str] = Field(None, alias="assigned_port")
    department: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        populate_by_name = True

class AdminUserResponse(BaseModel):
    id: str
    name: str = Field(alias="full_name")
    email: str
    role: str
    lastLogin: str = Field(alias="last_login")
    status: str = Field(alias="status_label")
    createdAt: Any = Field(alias="created_at")
    assignedPort: Optional[str] = Field(alias="assigned_port")
    department: Optional[str] = Field(alias="department")
    phone: Optional[str] = Field(alias="phone")

    class Config:
        populate_by_name = True
        from_attributes = True

# ============= PAGE 4.5: DATA MANAGEMENT SCHEMAS =============

class TableStatResponse(BaseModel):
    tableName: str
    description: str
    recordCount: int
    sizeMb: float
    lastUpdated: str
    category: str

class DatabaseStatsResponse(BaseModel):
    totalRecords: int
    totalSizeGb: float
    engine: str
    status: str
    activeConnections: int
    maxConnections: int
    lastBackup: str
    tables: List[TableStatResponse]

class UploadHistoryResponse(BaseModel):
    id: str
    fileName: str = Field(alias="file_name")
    datasetType: str = Field(alias="dataset_type")
    uploadedBy: str = Field(alias="uploaded_by")
    uploadedAt: str = Field(alias="uploaded_at_str")
    recordsIngested: int = Field(alias="records_ingested")
    fileSizeBytes: int = Field(alias="file_size_bytes")
    status: str
    errorMessage: Optional[str] = Field(None, alias="error_message")

    class Config:
        populate_by_name = True
        from_attributes = True

class CleanupLogResponse(BaseModel):
    id: str
    operationType: str = Field(alias="operation_type")
    executedBy: str = Field(alias="executed_by")
    executedAt: str = Field(alias="executed_at_str")
    recordsAffected: int = Field(alias="records_affected")
    sizeFreedMb: float = Field(alias="size_freed_mb")
    details: str

    class Config:
        populate_by_name = True
        from_attributes = True

class CleanupRequest(BaseModel):
    operationType: str = Field(alias="operation_type")

    class Config:
        populate_by_name = True

