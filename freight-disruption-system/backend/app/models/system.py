# backend/app/models/system.py
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid

class SystemErrorLog(Base):
    __tablename__ = "system_error_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp_str = Column(String, nullable=False)
    service = Column(String, nullable=False)  # AIS Poller, Weather Poller, Port Analytics, Database Engine, etc.
    severity = Column(String, nullable=False)  # CRITICAL, ERROR, WARNING, INFO
    code = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    stack_trace = Column(Text)
    resolved = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemHealthCard(Base):
    __tablename__ = "system_health_cards"
    
    id = Column(String, primary_key=True)  # db, ais, weather, congestion
    name = Column(String, nullable=False)
    status = Column(String, default="Operational")  # Operational, Degraded, Offline, Maintenance
    uptime_pct = Column(Float, default=99.9)
    latency_ms = Column(Float, default=15.0)
    last_sync = Column(String, default="Just now")
    details = Column(Text)
    metrics = Column(JSON, default=list)  # List of {label, value} objects
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
