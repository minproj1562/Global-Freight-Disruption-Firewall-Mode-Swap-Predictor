# backend/app/models/port.py
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Port(Base):
    __tablename__ = "ports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    code = Column(String, unique=True, index=True, nullable=False)  # UN/LOCODE (e.g., NLRTM)
    country = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Port Capacity
    berth_capacity = Column(Integer, default=0)
    active_berths_used = Column(Integer, default=0)
    
    # Congestion Metrics
    congestion_level = Column(String, default="low")  # low, medium, high, critical
    congestion_percent = Column(Integer, default=0)
    waiting_vessels = Column(Integer, default=0)
    avg_wait_hours = Column(Float, default=0.0)
    status_label = Column(String, default="Operational")
    
    # Manual Congestion Override Tracking
    congestion_updated_by = Column(String)  # Name of manager who last updated manually
    congestion_updated_at = Column(DateTime(timezone=True))  # When it was manually updated
    congestion_source = Column(String, default="api")  # "api" | "manual"
    
    # Port Details
    primary_exports = Column(JSON, default=list)  # Array of export commodities
    max_vessel_draught_meters = Column(Float)
    total_annual_teu = Column(Integer)  # Total TEU capacity
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    managers = relationship("PortManager", back_populates="port")
    berth_slots = relationship("BerthSlot", back_populates="port", cascade="all, delete-orphan")
    congestion_history = relationship("PortCongestionHistory", back_populates="port", cascade="all, delete-orphan")
    vessel_arrivals = relationship("VesselArrival", back_populates="port", cascade="all, delete-orphan")
    disruptions = relationship("PortDisruption", back_populates="port", cascade="all, delete-orphan")

class BerthSlot(Base):
    __tablename__ = "berth_slots"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)
    berth_number = Column(String, nullable=False)
    berth_name = Column(String)
    
    # Berth Characteristics
    max_vessel_length_meters = Column(Float)
    max_draught_meters = Column(Float)
    berth_type = Column(String)  # Container, Bulk, Tanker, RoRo, etc.
    
    # Current Occupancy
    is_occupied = Column(Boolean, default=False)
    current_vessel_mmsi = Column(Integer)
    current_vessel_name = Column(String)
    occupied_since = Column(DateTime(timezone=True))
    estimated_departure = Column(DateTime(timezone=True))
    
    # Operations
    cargo_operation = Column(String)  # Loading, Unloading, Bunkering, etc.
    crane_count = Column(Integer, default=0)
    loading_progress_percent = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    port = relationship("Port", back_populates="berth_slots")

class PortCongestionHistory(Base):
    __tablename__ = "port_congestion_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    congestion_percent = Column(Integer, nullable=False)
    waiting_vessels = Column(Integer, default=0)
    avg_wait_hours = Column(Float, default=0.0)
    disruption_flag = Column(Boolean, default=False)  # For overlay on chart
    disruption_reason = Column(String)
    
    # Relationships
    port = relationship("Port", back_populates="congestion_history")

class VesselArrival(Base):
    __tablename__ = "vessel_arrivals"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)
    vessel_mmsi = Column(Integer, nullable=False)
    vessel_name = Column(String, nullable=False)
    vessel_type = Column(String)
    vessel_flag = Column(String)
    
    # Arrival Schedule
    eta = Column(DateTime(timezone=True), nullable=False)
    ata = Column(DateTime(timezone=True))  # Actual Time of Arrival
    etd = Column(DateTime(timezone=True))  # Estimated Time of Departure
    atd = Column(DateTime(timezone=True))  # Actual Time of Departure
    
    # Berth Assignment
    assigned_berth_id = Column(String, ForeignKey("berth_slots.id", ondelete="SET NULL"))
    berth_assignment_status = Column(String, default="Pending")  # Pending, Assigned, Docked, Departed
    
    # Cargo Info
    cargo_type = Column(String)
    cargo_tonnage = Column(Float)
    teu_count = Column(Integer)
    
    # Status
    status = Column(String, default="Scheduled")  # Scheduled, Anchored, Docked, Departed
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    port = relationship("Port", back_populates="vessel_arrivals")

class PortDisruption(Base):
    __tablename__ = "port_disruptions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)
    
    # Disruption Details
    disruption_type = Column(String, nullable=False)  # Labor Strike, Weather, Equipment Failure, etc.
    severity = Column(String, nullable=False)  # low, medium, high, critical
    title = Column(String, nullable=False)
    description = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    flagged_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"))
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    port = relationship("Port", back_populates="disruptions")

class PortNetwork(Base):
    __tablename__ = "port_networks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False, index=True)
    dest_port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False, index=True)
    distance_nautical_miles = Column(Float)
    avg_transit_days = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PortCongestionForecast(Base):
    """Port congestion forecast results from Prophet model"""
    __tablename__ = "port_congestion_forecasts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Forecast metadata
    forecast_date = Column(DateTime(timezone=True), nullable=False, index=True)
    forecast_horizon_days = Column(Integer, nullable=False)  # 7, 14, or 30
    model_version = Column(String, default="prophet_v1")
    
    # Forecast values (time series)
    forecast_data = Column(JSON, nullable=False)  # [{ds: "2024-12-25", yhat: 65, yhat_lower: 50, yhat_upper: 80}, ...]
    
    # Model performance metrics
    mae = Column(Float)  # Mean Absolute Error
    mape = Column(Float)  # Mean Absolute Percentage Error
    confidence_score = Column(Float)  # 0-100%
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    port = relationship("Port", backref="forecasts")
    
    # Index for fast queries
    __table_args__ = (
        Index('ix_port_forecast_date', 'port_id', 'forecast_date'),
    )


class PortCongestionAlternative(Base):
    """Alternative ports with lower congestion"""
    __tablename__ = "port_congestion_alternatives"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False, index=True)
    alternative_port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Distance and time metrics
    distance_km = Column(Float)
    additional_transit_days = Column(Float)
    
    # Cost differential
    cost_delta_usd = Column(Float)  # Positive = more expensive, Negative = cheaper
    
    # Congestion comparison
    congestion_reduction_percent = Column(Float)  # How much less congested
    
    # Suitability score (0-100)
    suitability_score = Column(Float)
    
    # Timestamps
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    source_port = relationship("Port", foreign_keys=[source_port_id])
    alternative_port = relationship("Port", foreign_keys=[alternative_port_id])
