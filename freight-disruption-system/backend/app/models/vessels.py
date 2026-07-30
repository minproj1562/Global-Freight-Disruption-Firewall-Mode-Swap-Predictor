# backend/app/models/vessel.py
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
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
    vessel_type = Column(String)  # Container, Tanker, Bulk Carrier, etc.
    ship_type_code = Column(Integer)  # AIS ship type code
    
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
    status = Column(String, default="normal")  # normal, at-risk, disrupted
    current_risk_reason = Column(String)
    speed_history = Column(JSON, default=list)  # Array of recent speeds
    cargo_summary = Column(String)
    
    # Timestamps
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())