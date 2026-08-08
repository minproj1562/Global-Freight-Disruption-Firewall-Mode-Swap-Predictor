# backend/app/schemas/vessels.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ============= PAGE 4.3: ADMIN VESSEL SCHEMAS =============

class AdminVesselBase(BaseModel):
    mmsi: int
    imo: int
    name: str
    type: str
    flag: str
    dwt: float
    currentPort: str = Field(alias="current_port", default="")
    status: str = "Underway"
    
    class Config:
        populate_by_name = True
        orm_mode = True
        from_attributes = True

class AdminVesselCreate(BaseModel):
    mmsi: int
    imo: int
    name: str
    type: str
    flag: str
    dwt: float
    currentPort: str = Field(alias="current_port")
    status: str = "Underway"

    class Config:
        populate_by_name = True

class AdminVesselUpdate(BaseModel):
    name: Optional[str] = None
    mmsi: Optional[int] = None
    imo: Optional[int] = None
    type: Optional[str] = None
    flag: Optional[str] = None
    dwt: Optional[float] = None
    currentPort: Optional[str] = Field(None, alias="current_port")
    status: Optional[str] = None
    isActive: Optional[bool] = Field(None, alias="is_active")

    class Config:
        populate_by_name = True

class AdminVesselResponse(BaseModel):
    id: str
    mmsi: int
    imo: int
    name: str
    type: str = Field(alias="vessel_type")
    flag: str
    dwt: float
    currentPort: str = Field(alias="current_port")
    status: str
    lastAisUpdate: str = Field(alias="last_ais_update_str")
    isActive: bool = Field(alias="is_active")

    class Config:
        populate_by_name = True
        from_attributes = True

# ============= PAGE 3.3: VESSEL LOG SCHEMAS =============

class VesselLogBase(BaseModel):
    mmsi: int
    imo: int
    name: str
    type: str = Field(alias="vessel_type")
    flag: str
    port: str
    terminal: str
    berth: str
    arrivalDate: str = Field(alias="arrival_date")
    departureDate: str = Field(alias="departure_date")
    eta: Optional[str] = None
    etd: Optional[str] = None
    ata: Optional[str] = None
    atd: Optional[str] = None
    status: str
    category: str  # Arrivals, Departures, Expected
    cargo: str
    agent: str
    draft: float

    class Config:
        populate_by_name = True
        from_attributes = True

class VesselLogCreate(VesselLogBase):
    pass

class VesselLogResponse(VesselLogBase):
    id: str

    class Config:
        populate_by_name = True
        from_attributes = True
