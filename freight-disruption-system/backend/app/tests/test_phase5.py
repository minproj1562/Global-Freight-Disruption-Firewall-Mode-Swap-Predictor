# backend/app/tests/test_phase5.py
import pytest
import time
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.main import app
from app.core.encryption import financial_encryption
from app.services.totp_service import totp_service
from app.services.audit_service import audit_service
from app.models.users import User
from app.models.audit_log import AuditLog
from app.database import SessionLocal, init_db
from app.core.security import get_current_admin_user, get_current_port_manager

@pytest.fixture(scope="session", autouse=True)
def setup_security_tables():
    init_db()

def test_financial_field_encryption():
    """Test AES-256 financial value encryption and decryption"""
    original_val = 48500000.50
    encrypted = financial_encryption.encrypt_amount(original_val)
    assert isinstance(encrypted, str)
    assert len(encrypted) > 20
    assert str(original_val) not in encrypted  # Ciphertext must not contain plaintext

    decrypted = financial_encryption.decrypt_amount(encrypted)
    assert abs(decrypted - original_val) < 0.01

    masked = financial_encryption.mask_financial_value(original_val)
    assert "$48.5M (Masked)" == masked

def test_totp_two_factor_service():
    """Test RFC 6238 TOTP secret generation, code generation, and verification"""
    secret = totp_service.generate_secret()
    assert len(secret) >= 16

    uri = totp_service.get_provisioning_uri("test_captain", secret)
    assert "otpauth://totp/" in uri
    assert "secret=" in uri

    code = totp_service.generate_totp_code(secret)
    assert len(code) == 6
    assert code.isdigit()

    # Valid code matches
    assert totp_service.verify_totp_code(secret, code) is True
    # Invalid code rejected
    assert totp_service.verify_totp_code(secret, "000000" if code != "000000" else "999999") is False

def test_audit_logging_and_sanitization():
    """Test immutable audit log creation with credential redaction"""
    db = SessionLocal()
    try:
        log_entry = audit_service.log_event(
            db=db,
            action="ROUTE_CONFIRMED",
            resource="/api/reroute/confirm",
            username="admin",
            status="SUCCESS",
            metadata={
                "route_id": "r-123",
                "secret_key": "raw_password_secret",
                "cost_saved": 50000
            }
        )
        assert log_entry is not None
        assert log_entry.action == "ROUTE_CONFIRMED"
        assert log_entry.metadata_json["secret_key"] == "[REDACTED]"
        assert log_entry.metadata_json["route_id"] == "r-123"
    finally:
        db.close()

def test_role_enforcement_admin_and_port():
    """Test strict role enforcement checks"""
    admin_user = User(id="u-admin", username="adm", role="admin", is_active=True)
    port_user = User(id="u-port", username="pm", role="port", is_active=True)
    viewer_user = User(id="u-viewer", username="vw", role="viewer", is_active=True)

    # Admin check
    assert get_current_admin_user(admin_user) == admin_user
    with pytest.raises(HTTPException) as exc_info:
        get_current_admin_user(port_user)
    assert exc_info.value.status_code == 403

    # Port manager check
    assert get_current_port_manager(port_user) == port_user
    assert get_current_port_manager(admin_user) == admin_user
    with pytest.raises(HTTPException) as exc_port:
        get_current_port_manager(viewer_user)
    assert exc_port.value.status_code == 403

def test_email_verification_flow():
    """Test user registration, verification token generation, and email verification"""
    import uuid
    client = TestClient(app)

    db = SessionLocal()
    unique_suffix = str(uuid.uuid4())[:8]
    test_uid = f"test-verify-{unique_suffix}"
    test_token = f"token-{unique_suffix}"
    try:
        # Create unverified user
        test_user = User(
            id=test_uid,
            username=f"verify_{unique_suffix}",
            email=f"verify_{unique_suffix}@portops.gov",
            hashed_password="hashed_pass_dummy",
            full_name="Verification Test Officer",
            role="port",
            is_active=True,
            is_verified=False,
            verification_token=test_token
        )
        db.add(test_user)
        db.commit()

        # Verify email endpoint
        resp = client.post("/api/auth/verify-email", json={"token": test_token})
        assert resp.status_code == 200
        assert resp.json()["is_verified"] is True

        # Database state updated
        updated_user = db.query(User).filter(User.id == test_uid).first()
        assert updated_user.is_verified is True
        assert updated_user.verification_token is None
    finally:
        db.close()

