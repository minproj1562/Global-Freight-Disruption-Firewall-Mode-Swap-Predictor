# backend/app/routers/auth.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import timedelta
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

@router.post("/port-manager/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_port_manager(
    user_data: PortManagerCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new Port Manager account.
    Creates both User and PortManager records.
    """
    # Check if username already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
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
    
    # Create User
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="port",
        is_active=True
    )
    
    db.add(new_user)
    db.flush()  # Get the user.id without committing
    
    # Create PortManager
    new_port_manager = PortManager(
        user_id=new_user.id,
        employee_id=user_data.employee_id,
        mobile_number=user_data.mobile_number,
        port_id=port.id,
        department=user_data.department,
        security_pass_id=user_data.security_pass_id
    )
    
    db.add(new_port_manager)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
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

@router.post("/port-manager/login", response_model=Token)
async def login_port_manager(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate Port Manager using username/employee_id/email and password.
    The assigned port is always derived server-side from the registration record.
    """
    user = _find_port_manager_user(db, credentials.username_or_email)
    
    # Verify user exists and password is correct
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify user is a port manager
    if user.role != "port":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Port Managers"
        )
    
    # Verify account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact administrator."
        )
    
    # Create access token
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
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate System Administrator using username/email and password.
    """
    user = db.query(User).filter(
        (User.username == credentials.username_or_email) |
        (User.email == credentials.username_or_email)
    ).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to System Administrators"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive."
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

# ============= LOGISTICS MANAGER REGISTRATION =============

@router.post("/logistics/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@router.post("/logistics-manager/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_logistics_manager(
    user_data: LogisticsManagerCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new Logistics Manager account.
    Creates both User and LogisticsManager records.
    """
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Check if employee_id already exists
    existing_lm = db.query(LogisticsManager).filter(
        LogisticsManager.employee_id == user_data.employee_id
    ).first()
    
    if existing_lm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Create User
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="operations",
        is_active=True
    )
    
    db.add(new_user)
    db.flush()
    
    # Create LogisticsManager
    new_lm = LogisticsManager(
        user_id=new_user.id,
        company_name=user_data.company_name,
        employee_id=user_data.employee_id,
        department=user_data.department,
        region=user_data.region
    )
    
    db.add(new_lm)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.id, "role": new_user.role},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(new_user)
    )

# ============= LOGISTICS MANAGER LOGIN =============

@router.post("/logistics/login", response_model=Token)
@router.post("/logistics-manager/login", response_model=Token)
async def login_logistics_manager(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate Logistics Manager using username/email/employee_id and password.
    """
    user = db.query(User).filter(
        (User.username == credentials.username_or_email) |
        (User.email == credentials.username_or_email)
    ).first()
    
    # If not found by username/email, try employee_id
    if not user:
        lm = db.query(LogisticsManager).filter(
            LogisticsManager.employee_id == credentials.username_or_email
        ).first()
        if lm:
            user = lm.user
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.role not in ("operations", "Logistics Manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Logistics Managers"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact administrator."
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

# ============= LOGISTICS MANAGER PROFILE =============

@router.get("/logistics/me", response_model=LogisticsManagerResponse)
@router.get("/logistics-manager/me", response_model=LogisticsManagerResponse)
async def get_current_logistics_manager_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current authenticated Logistics Manager's full profile.
    """
    if current_user.role not in ("operations", "Logistics Manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Logistics Managers"
        )
    
    logistics_manager = db.query(LogisticsManager).filter(
        LogisticsManager.user_id == current_user.id
    ).first()
    
    if not logistics_manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Logistics Manager profile not found"
        )
    
    return LogisticsManagerResponse.from_orm(logistics_manager)