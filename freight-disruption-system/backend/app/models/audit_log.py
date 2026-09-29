# backend/app/models/audit_log.py
"""
Immutable, insert-only audit log model for security compliance and tracking sensitive operations.
"""
from sqlalchemy import Column, String, DateTime, JSON, Text, Index
from sqlalchemy.sql import func
from app.database import Base
import uuid

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=True)
    username = Column(String, index=True, nullable=True)
    action = Column(String, nullable=False, index=True)      # e.g. LOGIN, LOGOUT, FINANCIAL_ACCESS, ROUTE_CONFIRMED, DISRUPTION_ACK, DISRUPTION_RESOLVE
    resource = Column(String, nullable=False)                # Target endpoint or entity ID
    status = Column(String, default="SUCCESS")               # SUCCESS | FORBIDDEN | FAILED
    ip_address = Column(String, default="127.0.0.1")
    metadata_json = Column("metadata", JSON, default=dict)   # Sanitized action metadata (no raw secrets or raw plaintext credentials)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_audit_logs_user_timestamp", "user_id", "timestamp"),
        Index("ix_audit_logs_action_timestamp", "action", "timestamp"),
    )
