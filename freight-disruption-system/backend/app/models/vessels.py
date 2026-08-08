# backend/app/models/vessel.py
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Vessel(Base):
    __tablename__ = "vessels"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mmsi = Column(Integer, unique=True, index=True, nullable=False)
    imo = Column(Integer, index=True)
    name = Column(String, nullable=False)
    callsign = Column(String)
    flag = Column(String)
    vessel_type = Column(String)  # Container, Tanker, Bulk Carrier, LNG Carrier, Ro-Ro, Chemical Tanker, Tug / Support
    ship_type_code = Column(Integer)  # AIS ship type code
    dwt = Column(Float, default=0.0)  # Deadweight Tonnage
    current_port = Column(String)
    
    # Current Position
    latitude = Column(Float)
    longitude = Column(Float)
    speed = Column(Float)  # knots
    heading = Column(Float)  # degrees
    course = Column(Float)  # degrees
    
    # Destination
    destination_port = Column(String)
    destination_lat = Column(Float)
    destination_lon = Column(Float)
    eta = Column(DateTime(timezone=True))
    
    # Vessel Details
    length_meters = Column(Float)
    width_meters = Column(Float)
    draught_meters = Column(Float)
    capacity_teu = Column(Integer)  # For container ships
    
    # Status & History
    status = Column(String, default="Underway")  # Underway, At Anchor, Moored, Maintenance, Inactive
    current_risk_reason = Column(String)
    speed_history = Column(JSON, default=list)  # Array of recent speeds
    cargo_summary = Column(String)
    last_ais_update_str = Column(String, default="Just now")
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VesselLog(Base):
    __tablename__ = "vessel_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mmsi = Column(Integer, index=True, nullable=False)
    imo = Column(Integer, index=True)
    name = Column(String, nullable=False)
    vessel_type = Column(String)
    flag = Column(String)
    port = Column(String)
    terminal = Column(String)
    berth = Column(String)
    arrival_date = Column(String)
    departure_date = Column(String)
    eta = Column(String)
    etd = Column(String)
    ata = Column(String)
    atd = Column(String)
    status = Column(String, default="Scheduled")  # Docked, In Transit, Berthed, Clearing Customs, Anchored, Departed, Expected
    category = Column(String, nullable=False)  # Arrivals, Departures, Expected
    cargo = Column(String)
    agent = Column(String)
    draft = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())