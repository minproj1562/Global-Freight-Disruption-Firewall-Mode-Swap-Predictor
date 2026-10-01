# backend/app/routers/auth.py
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import (
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
    get_current_user,
)
from app.core.config import settings
from app.core.rate_limiter import RateLimiter
from app.services.totp_service import totp_service
from app.services.audit_service import audit_service
from app.services.email_service import email_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

auth_rate_limiter = RateLimiter(times=10, seconds=60)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


# ============= REQUEST / RESPONSE MODELS (auth-only) =============

class LoginWithMFA(UserLogin):
    """Login payload with optional 6-digit TOTP code."""
    totp_code: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    message: str


class TOTPVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


# ============= HELPERS =============

def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Treat naive datetimes from the DB as UTC so comparisons never raise."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _is_locked(user: User) -> bool:
    locked_until = _as_utc(user.locked_until)
    return bool(locked_until and locked_until > datetime.now(timezone.utc))


def _clear_expired_lock(user: User, db: Session) -> None:
    """Once a lock has expired, start the failed-attempt counter from zero."""
    if user.locked_until and not _is_locked(user):
        user.locked_until = None
        user.failed_login_attempts = 0
        db.commit()


def _register_failed_attempt(user: User, db: Session) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def _issue_token(user: User) -> str:
    return create_access_token(
        data={"sub": user.id, "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


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


def _verify_totp_if_enabled(
    user: User, code: Optional[str], db: Session, resource: str, client_ip: str
) -> None:
    if not user.is_totp_enabled:
        return
    if not code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA_REQUIRED: 6-digit TOTP code required for this account.",
        )
    if not totp_service.verify_totp_code(user.totp_secret, code):
        audit_service.log_event(
            db, action="MFA_FAILED", resource=resource,
            user_id=user.id, username=user.username, status="FAILED",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP authentication code.",
        )


# ============= PORT MANAGER REGISTRATION =============

@router.post(
    "/port-manager/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limiter)],
)
async def register_port_manager(
    user_data: PortManagerCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Register a new Port Manager account.
    Creates User and PortManager in ONE transaction, generates an email
    verification token, and writes an audit record.
    """
    client_ip = _client_ip(request)

    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing_user:
        audit_service.log_event(
            db, action="REGISTER_FAILED", resource="/api/auth/port-manager/register",
            status="FAILED",
            metadata={"reason": "Username or email already exists", "email": user_data.email},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    if db.query(PortManager).filter(
        PortManager.employee_id == user_data.employee_id
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists",
        )

    port = db.query(Port).filter(Port.name == user_data.port_name).first()
    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port '{user_data.port_name}' not found. Please contact system administrator.",
        )

    verification_token = secrets.token_urlsafe(32)
    verification_expiry = datetime.now(timezone.utc) + timedelta(hours=24)

    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="port",
        phone=user_data.mobile_number or "",
        assigned_port=port.name,
        is_active=True,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires_at=verification_expiry,
    )
    db.add(new_user)
    db.flush()  # get new_user.id without committing

    db.add(PortManager(
        user_id=new_user.id,
        employee_id=user_data.employee_id,
        mobile_number=user_data.mobile_number,
        port_id=port.id,
        department=user_data.department,
        security_pass_id=user_data.security_pass_id,
    ))
    db.commit()  # user + port manager succeed or fail together
    db.refresh(new_user)

    # Email must never break registration
    try:
        email_dispatch = email_service.send_verification_email(
            new_user.email, new_user.username, verification_token
        )
    except Exception as exc:  # noqa: BLE001
        email_dispatch = {"status": "SEND_ERROR", "message": str(exc)}

    audit_service.log_event(
        db, action="USER_REGISTERED", resource=f"user:{new_user.id}",
        user_id=new_user.id, username=new_user.username, status="SUCCESS",
        metadata={
            "role": "port",
            "port_name": port.name,
            "email_delivery": email_dispatch.get("status"),
        },
        ip_address=client_ip,
    )

    return Token(
        access_token=_issue_token(new_user),
        token_type="bearer",
        user=UserResponse.from_orm(new_user),
        port=PortSummary.model_validate(port),
    )


# ============= PORT MANAGER: PORT LOOKUP (login auto-detect) =============

@router.get("/port-manager/lookup", response_model=PortManagerLookupResponse)
async def lookup_port_manager_port(
    identifier: str = Query(..., min_length=3, max_length=255),
    db: Session = Depends(get_db),
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

@router.post(
    "/port-manager/login",
    response_model=Token,
    dependencies=[Depends(auth_rate_limiter)],
)
async def login_port_manager(
    credentials: LoginWithMFA,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticate Port Manager using username / employee_id / email and password.
    The assigned port is always derived server-side from the registration record.
    """
    client_ip = _client_ip(request)
    resource = "/api/auth/port-manager/login"

    user = _find_port_manager_user(db, credentials.username_or_email)

    if user:
        _clear_expired_lock(user, db)
        # Lockout is checked BEFORE the password so a locked account can't be probed
        if _is_locked(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked due to excessive failed attempts. Please try again later.",
            )

    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            _register_failed_attempt(user, db)
        audit_service.log_event(
            db, action="LOGIN_FAILED", resource=resource,
            status="FAILED", metadata={"identifier": credentials.username_or_email},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role != "port":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Port Managers.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact administrator.",
        )

    _verify_totp_if_enabled(user, credentials.totp_code, db, resource, client_ip)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    db.commit()

    audit_service.log_event(
        db, action="LOGIN_SUCCESS", resource=resource,
        user_id=user.id, username=user.username, status="SUCCESS",
        metadata={"role": user.role, "mfa_used": bool(user.is_totp_enabled)},
        ip_address=client_ip,
    )

    return Token(
        access_token=_issue_token(user),
        token_type="bearer",
        user=UserResponse.from_orm(user),
        port=_get_assigned_port_summary(user),
    )


# ============= GET CURRENT USER (single definition) =============

@router.get("/me", response_model=PortManagerResponse)
async def get_current_port_manager_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Current user's profile. Port Managers get their record; admins get a minimal profile."""
    port_manager = db.query(PortManager).filter(
        PortManager.user_id == current_user.id
    ).first()

    if port_manager:
        return PortManagerResponse.from_orm(port_manager)

    if (current_user.role or "").lower() == "admin":
        return PortManagerResponse(
            id=current_user.id,
            user_id=current_user.id,
            employee_id="ADMIN-001",
            mobile_number=current_user.phone or None,
            port_id=None,
            department=current_user.department or "Operations",
            security_pass_id=None,
            created_at=current_user.created_at or datetime.now(timezone.utc),
            user=UserResponse.from_orm(current_user),
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Port Manager profile not found",
    )


# ============= ADMIN LOGIN =============

@router.post(
    "/admin/login",
    response_model=Token,
    dependencies=[Depends(auth_rate_limiter)],
)
async def login_admin(
    credentials: LoginWithMFA,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate System Administrator with strict role check and optional TOTP."""
    client_ip = _client_ip(request)
    resource = "/api/auth/admin/login"

    user = db.query(User).filter(
        (User.username == credentials.username_or_email) |
        (User.email == credentials.username_or_email)
    ).first()

    if user:
        _clear_expired_lock(user, db)
        if _is_locked(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked due to excessive failed attempts. Please try again later.",
            )

    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            _register_failed_attempt(user, db)
        audit_service.log_event(
            db, action="ADMIN_LOGIN_FAILED", resource=resource,
            status="FAILED", metadata={"identifier": credentials.username_or_email},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if (user.role or "").lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to System Administrators",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive.",
        )

    _verify_totp_if_enabled(user, credentials.totp_code, db, resource, client_ip)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    db.commit()

    audit_service.log_event(
        db, action="ADMIN_LOGIN_SUCCESS", resource=resource,
        user_id=user.id, username=user.username, status="SUCCESS",
        metadata={"role": "admin", "mfa_used": bool(user.is_totp_enabled)},
        ip_address=client_ip,
    )

    return Token(
        access_token=_issue_token(user),
        token_type="bearer",
        user=UserResponse.from_orm(user),
    )


# ============= LOGISTICS MANAGER REGISTRATION (restored) =============

@router.post(
    "/logistics/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limiter)],
)
@router.post(
    "/logistics-manager/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limiter)],
)
async def register_logistics_manager(
    user_data: LogisticsManagerCreate,
    db: Session = Depends(get_db),
):
    """Register a new Logistics Manager (User + LogisticsManager in one transaction)."""
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    if db.query(LogisticsManager).filter(
        LogisticsManager.employee_id == user_data.employee_id
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists",
        )

    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="operations",
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    db.add(LogisticsManager(
        user_id=new_user.id,
        company_name=user_data.company_name,
        employee_id=user_data.employee_id,
        department=user_data.department,
        region=user_data.region,
    ))
    db.commit()
    db.refresh(new_user)

    return Token(
        access_token=_issue_token(new_user),
        token_type="bearer",
        user=UserResponse.from_orm(new_user),
    )


# ============= LOGISTICS MANAGER LOGIN (restored) =============

@router.post(
    "/logistics/login",
    response_model=Token,
    dependencies=[Depends(auth_rate_limiter)],
)
@router.post(
    "/logistics-manager/login",
    response_model=Token,
    dependencies=[Depends(auth_rate_limiter)],
)
async def login_logistics_manager(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """Authenticate Logistics Manager using username / email / employee_id and password."""
    identifier = (credentials.username_or_email or "").strip()

    user = db.query(User).filter(
        (User.username == identifier) |
        (func.lower(User.email) == identifier.lower())
    ).first()

    if not user:
        lm = db.query(LogisticsManager).filter(
            LogisticsManager.employee_id == identifier
        ).first()
        if lm:
            user = lm.user

    if user:
        _clear_expired_lock(user, db)
        if _is_locked(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked due to excessive failed attempts. Please try again later.",
            )

    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            _register_failed_attempt(user, db)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role not in ("operations", "Logistics Manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Logistics Managers",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact administrator.",
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    db.commit()

    return Token(
        access_token=_issue_token(user),
        token_type="bearer",
        user=UserResponse.from_orm(user),
    )


# ============= LOGISTICS MANAGER PROFILE (restored) =============

@router.get("/logistics/me", response_model=LogisticsManagerResponse)
@router.get("/logistics-manager/me", response_model=LogisticsManagerResponse)
async def get_current_logistics_manager_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("operations", "Logistics Manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Logistics Managers",
        )

    logistics_manager = db.query(LogisticsManager).filter(
        LogisticsManager.user_id == current_user.id
    ).first()
    if not logistics_manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Logistics Manager profile not found",
        )
    return LogisticsManagerResponse.from_orm(logistics_manager)


# ============= EMAIL VERIFICATION =============

@router.post("/verify-email")
def verify_email_address(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Validate email verification token and mark account as verified."""
    user = db.query(User).filter(User.verification_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    expires = _as_utc(user.verification_token_expires_at)
    if expires and expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new token.",
        )

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()

    audit_service.log_event(
        db, action="EMAIL_VERIFIED", resource=f"user:{user.id}",
        user_id=user.id, username=user.username, status="SUCCESS",
    )

    return {
        "status": "success",
        "message": "Email address successfully verified.",
        "email": user.email,
        "is_verified": True,
    }


@router.post("/resend-verification", dependencies=[Depends(auth_rate_limiter)])
def resend_verification_email(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Generate a new email verification token for an unverified account."""
    user = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if not user:
        # Prevent account enumeration
        return {"status": "success", "message": "If the account exists, a verification link has been sent."}

    if user.is_verified:
        return {"status": "success", "message": "Account is already verified."}

    user.verification_token = secrets.token_urlsafe(32)
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    try:
        email_dispatch = email_service.send_verification_email(
            user.email, user.username, user.verification_token
        )
    except Exception as exc:  # noqa: BLE001
        email_dispatch = {"status": "SEND_ERROR", "message": str(exc)}

    return {
        "status": "success",
        "message": "Verification link generated.",
        "verification_token": user.verification_token,  # DEV ONLY: remove before production
        "delivery_status": email_dispatch.get("status"),
        "delivery_detail": email_dispatch.get("message"),
    }


# ============= TOTP 2FA MANAGEMENT =============

@router.post("/totp/setup", response_model=TOTPSetupResponse)
def setup_totp_two_factor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new Base32 TOTP secret and provisioning URI for the user."""
    secret = totp_service.generate_secret()
    current_user.totp_secret = secret
    db.commit()

    return TOTPSetupResponse(
        secret=secret,
        provisioning_uri=totp_service.get_provisioning_uri(current_user.username, secret),
        message="Scan the QR code or enter the secret into your authenticator app, then call /totp/verify to activate.",
    )


@router.post("/totp/verify")
def verify_and_enable_totp(
    payload: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify 6-digit TOTP code and enable Two-Factor Authentication."""
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP secret not initialized. Call /totp/setup first.",
        )

    if not totp_service.verify_totp_code(current_user.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP authentication code.",
        )

    current_user.is_totp_enabled = True
    db.commit()

    audit_service.log_event(
        db, action="TOTP_ENABLED", resource=f"user:{current_user.id}",
        user_id=current_user.id, username=current_user.username, status="SUCCESS",
    )

    return {
        "status": "success",
        "is_totp_enabled": True,
        "message": "Two-Factor Authentication is now active on your account.",
    }


@router.post("/totp/disable")
def disable_totp_two_factor(
    payload: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify current TOTP code and disable Two-Factor Authentication."""
    if not current_user.is_totp_enabled or not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-Factor Authentication is not enabled on this account.",
        )

    if not totp_service.verify_totp_code(current_user.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code. Cannot disable 2FA.",
        )

    current_user.is_totp_enabled = False
    current_user.totp_secret = None
    db.commit()

    audit_service.log_event(
        db, action="TOTP_DISABLED", resource=f"user:{current_user.id}",
        user_id=current_user.id, username=current_user.username, status="SUCCESS",
    )

    return {
        "status": "success",
        "is_totp_enabled": False,
        "message": "Two-Factor Authentication has been disabled.",
    }