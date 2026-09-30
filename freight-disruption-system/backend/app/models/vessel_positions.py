# backend/app/models/vessel_positions.py
"""
TimescaleDB hypertable / partitioned time-series model for vessel position history.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Index
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.database import Base
import uuid

class VesselPosition(Base):
    __tablename__ = "vessel_positions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mmsi = Column(Integer, index=True, nullable=False)
    vessel_name = Column(String)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    speed = Column(Float, default=0.0)      # knots (SOG)
    heading = Column(Float, default=0.0)    # degrees (COG/Heading)
    course = Column(Float, default=0.0)
    vessel_type = Column(String)
    status = Column(String, default="Underway")
    
    # Partitioning timestamp (TimescaleDB time dimension)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Multi-column index for fast historical track queries
    __table_args__ = (
        Index("ix_vessel_positions_mmsi_timestamp", "mmsi", "timestamp"),
        Index("ix_vessel_positions_lat_lon", "latitude", "longitude"),
    )
