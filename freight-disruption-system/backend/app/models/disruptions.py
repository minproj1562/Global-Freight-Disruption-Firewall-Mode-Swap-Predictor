# backend/app/models/disruptions.py
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base
import uuid

class GlobalDisruption(Base):
    __tablename__ = "global_disruptions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    disruption_type = Column(String, nullable=False)  # Extreme Weather / Typhoon, Port Strike & Labor Action, etc.
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # low, medium, high, critical
    radius_nm = Column(Float, default=100.0)
    description = Column(Text, nullable=False)
    affected_vessels_count = Column(Integer, default=0)
    resolved = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
