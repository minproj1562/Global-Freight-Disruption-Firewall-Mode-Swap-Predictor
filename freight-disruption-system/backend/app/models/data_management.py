# backend/app/models/data_management.py
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, BigInteger
from sqlalchemy.sql import func
from app.database import Base
import uuid

class DataUploadLog(Base):
    __tablename__ = "data_upload_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_name = Column(String, nullable=False)
    dataset_type = Column(String, nullable=False)  # "AIS Telemetry", "Ports Database", "Vessel Directory", "Congestion CSV"
    uploaded_by = Column(String, nullable=False)
    uploaded_at_str = Column(String, nullable=False)
    records_ingested = Column(Integer, default=0)
    file_size_bytes = Column(BigInteger, default=0)
    status = Column(String, default="Success")  # "Success", "Failed", "Processing"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DataCleanupLog(Base):
    __tablename__ = "data_cleanup_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    operation_type = Column(String, nullable=False)  # "Delete Old AIS", "Delete Old Simulations", "Reset Disruptions"
    executed_by = Column(String, nullable=False)
    executed_at_str = Column(String, nullable=False)
    records_affected = Column(Integer, default=0)
    size_freed_mb = Column(Float, default=0.0)
    details = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
