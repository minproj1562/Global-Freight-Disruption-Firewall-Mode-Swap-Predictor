# backend/app/core/security.py
from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import get_db
from app.models.users import User

import bcrypt

# Password hashing implementation using direct bcrypt to avoid passlib 4.1+ wrap bug
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hashed password"""
    if not plain_password or not hashed_password:
        return False
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt (safely truncated to 72 bytes)"""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

# OAuth2 / HTTP Bearer scheme for token extraction (auto_error=False for graceful token reading)
security_bearer = HTTPBearer(auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ENABLE_DEMO_AUTH: when "true", allows unauthenticated access via demo_user fallback.
# MUST be "false" (default) in production. Set to "true" ONLY for local development.
_ENABLE_DEMO_AUTH = os.getenv("ENABLE_DEMO_AUTH", "false").strip().lower() == "true"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.

    - Valid JWT token → authenticates and returns real User from DB.
    - Missing or invalid token → raises HTTP 401 Unauthorized (production default).
    - ENABLE_DEMO_AUTH=true → allows unauthenticated fallback to demo_user for
      local development ONLY. This must NEVER be enabled in production.
    """
    import logging
    _log = logging.getLogger(__name__)

    token = auth.credentials if auth else None

    # --- Attempt real JWT authentication ---
    if token and token != "demo-token":
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
        except JWTError:
            pass
        except Exception:
            pass

    # --- Demo auth gate (strictly controlled by ENABLE_DEMO_AUTH env var) ---
    if _ENABLE_DEMO_AUTH:
        _log.warning(
            "SECURITY WARNING: ENABLE_DEMO_AUTH=true — unauthenticated request allowed via "
            "demo_user fallback. This must NOT be enabled in production."
        )
        demo_user = db.query(User).filter(User.role == "port").first()
        if not demo_user:
            demo_user = User(
                username="demo_port_manager",
                email="demo@portops.gov",
                hashed_password=get_password_hash("demopassword123"),
                full_name="Port Operations Officer",
                role="port",
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        return demo_user

    # --- Production: no valid token → 401 Unauthorized ---
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide a valid Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_port_manager(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is a port manager or admin"""
    normalized_role = current_user.role.lower().replace(" ", "_")
    if normalized_role not in ["port", "admin", "port_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Port Managers and Administrators"
        )
    return current_user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is active"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive or suspended user account"
        )
    return current_user

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Strictly enforce that the current user has Administrator role"""
    normalized_role = current_user.role.lower().replace(" ", "_")
    if normalized_role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required"
        )
    return current_user