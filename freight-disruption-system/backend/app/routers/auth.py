# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, PortManagerCreate, PortManagerResponse, UserResponse
from app.models.users import User, PortManager
from app.models.ports import Port
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

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
        user=UserResponse.from_orm(new_user)
    )

# ============= PORT MANAGER LOGIN =============

@router.post("/port-manager/login", response_model=Token)
async def login_port_manager(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate Port Manager using username/employee_id/email and password.
    """
    # Try to find user by username, email, or employee_id
    user = db.query(User).filter(
        (User.username == credentials.username_or_email) |
        (User.email == credentials.username_or_email)
    ).first()
    
    # If not found, try employee_id
    if not user:
        pm = db.query(PortManager).filter(
            PortManager.employee_id == credentials.username_or_email
        ).first()
        if pm:
            user = pm.user
    
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
        user=UserResponse.from_orm(user)
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