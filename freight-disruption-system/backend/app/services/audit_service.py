# backend/app/services/audit_service.py
"""
Audit Logging Service.
Records immutable security audit events for authentication, privileged role operations,
financial data access, route confirmations, and disruption lifecycle state changes.
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

# Sensitive keywords that must be scrubbed from audit metadata
SENSITIVE_KEYS = {"password", "token", "secret", "totp", "api_key", "authorization"}

def sanitize_metadata(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Remove any sensitive credentials or plaintext tokens from audit metadata"""
    if not data:
        return {}
    clean = {}
    for k, v in data.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            clean[k] = "[REDACTED]"
        elif isinstance(v, dict):
            clean[k] = sanitize_metadata(v)
        else:
            clean[k] = v
    return clean

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        resource: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        status: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: str = "127.0.0.1"
    ) -> Optional[AuditLog]:
        """Insert an immutable audit log record"""
        try:
            clean_meta = sanitize_metadata(metadata)
            entry = AuditLog(
                user_id=user_id,
                username=username,
                action=action,
                resource=resource,
                status=status,
                ip_address=ip_address,
                metadata_json=clean_meta
            )
            db.add(entry)
            db.commit()
            return entry
        except Exception as e:
            logger.error(f"[AuditService] Failed to record audit log: {e}")
            db.rollback()
            return None

audit_service = AuditService()
