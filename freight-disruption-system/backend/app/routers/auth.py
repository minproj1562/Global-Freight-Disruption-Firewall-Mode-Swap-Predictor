# backend/app/routers/auth.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import secrets

from app.database import get_db
from app.schemas.user import (
    UserCreate,
    UserLogin,
    Token,
    PortSummary,
    PortManagerLookupResponse,
    PortManagerCreate,
    PortManagerResponse,
    UserResponse,
    LogisticsManagerCreate,
    LogisticsManagerResponse,
)
from app.models.users import User, PortManager, LogisticsManager
from app.models.ports import Port
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.core.config import settings
from app.core.rate_limiter import RateLimiter
from app.services.totp_service import totp_service
from app.services.audit_service import audit_service
from app.services.email_service import email_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ============= HELPERS =============

def _find_port_manager_user(db: Session, identifier: str) -> Optional[User]:
    """
    Resolve a user from a username, email (case-insensitive) or employee ID.
    Shared by the Port Manager login and the port lookup endpoint.
    """
    identifier = (identifier or "").strip()
    if not identifier:
        return None

    user = db.query(User).filter(
        (User.username == identifier) |
        (func.lower(User.email) == identifier.lower())
    ).first()
    if user:
        return user

    pm = db.query(PortManager).filter(
        PortManager.employee_id == identifier
    ).first()
    return pm.user if pm else None


def _get_assigned_port_summary(user: User) -> Optional[PortSummary]:
    """Return the Port a Port Manager is assigned to (None if not assigned)."""
    pm = user.port_manager
    if pm is None or pm.port is None:
        return None
    return PortSummary.model_validate(pm.port)


# ============= PORT MANAGER REGISTRATION =============

@router.post("/port-manager/register", response_model=Token, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limiter)])
async def register_port_manager(
    user_data: PortManagerCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register a new Port Manager account.
    Creates User and PortManager records, generates email verification token, and logs audit record.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        audit_service.log_event(
            db, action="REGISTER_FAILED", resource="/api/auth/port-manager/register",
            status="FAILED", metadata={"reason": "Username or email already exists", "email": user_data.email},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Check if employee_id already exists
    existing_pm = db.query(PortManager).filter(
        PortManager.employee_id == user_data.employee_id
    ).first()
    
    if existing_pm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Find port by name
    port = db.query(Port).filter(Port.name == user_data.port_name).first()
    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port '{user_data.port_name}' not found. Please contact system administrator."
        )
    
    # Generate email verification token (valid for 24 hours)
    verification_token = secrets.token_urlsafe(32)
    verification_expiry = datetime.now(timezone.utc) + timedelta(hours=24)

    # Create User
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="port",
        phone=user_data.mobile_number,
        assigned_port=port.name,
        is_active=True,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires_at=verification_expiry
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create PortManager
    new_pm = PortManager(
        user_id=new_user.id,
        employee_id=user_data.employee_id,
        mobile_number=user_data.mobile_number,
        port_id=port.id,
        department=user_data.department,
        security_pass_id=user_data.security_pass_id
    )
    
    db.add(new_pm)
    db.commit()

    # Attempt email dispatch via SMTP (logs honest SMTP_UNCONFIGURED status in dev)
    email_dispatch = email_service.send_verification_email(new_user.email, new_user.username, verification_token)

    audit_service.log_event(
        db, action="USER_REGISTERED", resource=f"user:{new_user.id}",
        user_id=new_user.id, username=new_user.username, status="SUCCESS",
        metadata={"role": "port", "port_name": port.name, "email_delivery": email_dispatch.get("status")},
        ip_address=client_ip
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.id, "role": new_user.role},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(new_user),
        port=PortSummary.model_validate(port),
    )

# ============= PORT MANAGER: PORT LOOKUP (login auto-detect) =============

@router.get("/port-manager/lookup", response_model=PortManagerLookupResponse)
async def lookup_port_manager_port(
    identifier: str = Query(..., min_length=3, max_length=255),
    db: Session = Depends(get_db)
):
    """
    Given an email / username / employee ID, return the port that Port Manager
    registered with. Used by the login screen to auto-select the assigned port.
    Returns only port info - no personal data.
    """
    user = _find_port_manager_user(db, identifier)

    if not user or user.role != "port" or not user.is_active:
        return PortManagerLookupResponse(found=False, port=None)

    return PortManagerLookupResponse(found=True, port=_get_assigned_port_summary(user))

# ============= PORT MANAGER LOGIN =============

@router.post("/port-manager/login", response_model=Token, dependencies=[Depends(auth_rate_limiter)])
async def login_port_manager(
    credentials: LoginWithMFA,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate Port Manager using username/employee_id/email and password.
    The assigned port is always derived server-side from the registration record.
    """
    user = _find_port_manager_user(db, credentials.username_or_email)
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.commit()

        audit_service.log_event(
            db, action="LOGIN_FAILED", resource="/api/auth/port-manager/login",
            status="FAILED", metadata={"identifier": credentials.username_or_email},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check account lockout
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account temporarily locked due to excessive failed attempts. Please try again later."
        )

    if user.role != "port":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Port Managers."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    # TOTP MFA Verification if enabled
    if user.is_totp_enabled:
        if not credentials.totp_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA_REQUIRED: 6-digit TOTP code required for this account."
            )
        if not totp_service.verify_totp_code(user.totp_secret, credentials.totp_code):
            audit_service.log_event(
                db, action="MFA_FAILED", resource="/api/auth/port-manager/login",
                user_id=user.id, username=user.username, status="FAILED",
                ip_address=client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP authentication code."
            )

    # Reset failed login count on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    db.commit()

    audit_service.log_event(
        db, action="LOGIN_SUCCESS", resource="/api/auth/port-manager/login",
        user_id=user.id, username=user.username, status="SUCCESS",
        metadata={"role": user.role, "mfa_used": bool(user.is_totp_enabled)},
        ip_address=client_ip
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user),
        port=_get_assigned_port_summary(user),
    )

# ============= GET CURRENT USER =============

@router.get("/me", response_model=PortManagerResponse)
async def get_current_port_manager_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current authenticated Port Manager's full profile.
    """
    if current_user.role != "port":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Port Managers"
        )
    
    port_manager = db.query(PortManager).filter(
        PortManager.user_id == current_user.id
    ).first()

    if not port_manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Port Manager profile not found"
        )
    
    return PortManagerResponse.from_orm(port_manager)

# ============= ADMIN LOGIN =============

@router.post("/admin/login", response_model=Token)
async def login_admin(
    credentials: LoginWithMFA,
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate System Administrator with strict role check and optional TOTP."""
    client_ip = request.client.host if request.client else "127.0.0.1"

    user = db.query(User).filter(
        (User.username == credentials.username_or_email) |
        (User.email == credentials.username_or_email)
    ).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        audit_service.log_event(
            db, action="ADMIN_LOGIN_FAILED", resource="/api/auth/admin/login",
            status="FAILED", metadata={"identifier": credentials.username_or_email},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to System Administrators"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive."
        )

    # TOTP MFA Verification if enabled
    if user.is_totp_enabled:
        if not credentials.totp_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA_REQUIRED: 6-digit TOTP code required for Admin access."
            )
        if not totp_service.verify_totp_code(user.totp_secret, credentials.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP authentication code."
            )

    user.last_login = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    db.commit()

    audit_service.log_event(
        db, action="ADMIN_LOGIN_SUCCESS", resource="/api/auth/admin/login",
        user_id=user.id, username=user.username, status="SUCCESS",
        metadata={"role": "admin", "mfa_used": bool(user.is_totp_enabled)},
        ip_address=client_ip
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

# ============= EMAIL VERIFICATION (Sub-Phase 22) =============

@router.post("/verify-email")
def verify_email_address(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Validate email verification token and mark account as verified."""
    user = db.query(User).filter(User.verification_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token."
        )

    if user.verification_token_expires_at and user.verification_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new token."
        )

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()

    audit_service.log_event(
        db, action="EMAIL_VERIFIED", resource=f"user:{user.id}",
        user_id=user.id, username=user.username, status="SUCCESS"
    )

    return {
        "status": "success",
        "message": "Email address successfully verified.",
        "email": user.email,
        "is_verified": True
    }

@router.post("/resend-verification", dependencies=[Depends(auth_rate_limiter)])
def resend_verification_email(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Generate a new email verification token for an unverified account."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Prevent account enumeration: return success regardless
        return {"status": "success", "message": "If the account exists, a verification link has been sent."}

    if user.is_verified:
        return {"status": "success", "message": "Account is already verified."}

    user.verification_token = secrets.token_urlsafe(32)
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    email_dispatch = email_service.send_verification_email(user.email, user.username, user.verification_token)

    return {
        "status": "success",
        "message": "Verification link generated.",
        "verification_token": user.verification_token,  # Expose token for API clients / testing
        "delivery_status": email_dispatch.get("status"),
        "delivery_detail": email_dispatch.get("message")
    }

# ============= TOTP 2FA MANAGEMENT (Sub-Phase 25) =============

@router.post("/totp/setup", response_model=TOTPSetupResponse)
def setup_totp_two_factor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new Base32 TOTP secret and provisioning URI for the user."""
    secret = totp_service.generate_secret()
    current_user.totp_secret = secret
    db.commit()

    uri = totp_service.get_provisioning_uri(current_user.username, secret)

    return TOTPSetupResponse(
        secret=secret,
        provisioning_uri=uri,
        message="Scan the QR code or enter the secret into your authenticator app, then call /totp/verify to activate."
    )

@router.post("/totp/verify")
def verify_and_enable_totp(
    payload: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify 6-digit TOTP code and enable Two-Factor Authentication on account."""
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP secret not initialized. Call /totp/setup first."
        )

    is_valid = totp_service.verify_totp_code(current_user.totp_secret, payload.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP authentication code."
        )

    current_user.is_totp_enabled = True
    db.commit()

    audit_service.log_event(
        db, action="TOTP_ENABLED", resource=f"user:{current_user.id}",
        user_id=current_user.id, username=current_user.username, status="SUCCESS"
    )

    return {
        "status": "success",
        "is_totp_enabled": True,
        "message": "Two-Factor Authentication is now active on your account."
    }

@router.post("/totp/disable")
def disable_totp_two_factor(
    payload: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify current TOTP code and disable Two-Factor Authentication."""
    if not current_user.is_totp_enabled or not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-Factor Authentication is not enabled on this account."
        )

    if not totp_service.verify_totp_code(current_user.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code. Cannot disable 2FA."
        )

    current_user.is_totp_enabled = False
    current_user.totp_secret = None
    db.commit()

    audit_service.log_event(
        db, action="TOTP_DISABLED", resource=f"user:{current_user.id}",
        user_id=current_user.id, username=current_user.username, status="SUCCESS"
    )

    return {
        "status": "success",
        "is_totp_enabled": False,
        "message": "Two-Factor Authentication has been disabled."
    }

# ============= GET CURRENT USER =============

@router.get("/me", response_model=PortManagerResponse)
async def get_current_port_manager_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current authenticated user's profile."""
    port_manager = db.query(PortManager).filter(
        PortManager.user_id == current_user.id
    ).first()
    
    if not port_manager:
        # Fallback profile for admin or non-PM roles
        return PortManagerResponse(
            id=current_user.id,
            user_id=current_user.id,
            employee_id="ADMIN-001",
            mobile_number=current_user.phone or "+1-555-0100",
            port_name=current_user.assigned_port or "Global HQ",
            department=current_user.department or "Operations",
            security_pass_id="SEC-ADM-01",
            user=UserResponse.from_orm(current_user)
        )

    return PortManagerResponse.from_orm(port_manager)