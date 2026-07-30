# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re

# ============= PASSWORD STRENGTH VALIDATOR =============

def validate_strong_password(v: str) -> str:
    """
    Enforce strong password rules:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\/~`';]", v):
        raise ValueError("Password must contain at least one special character (!@#$%^&* etc.)")
    return v

# ============= USER SCHEMAS =============

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: str = Field(..., pattern="^(port|fleet_operator|admin)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

class UserLogin(BaseModel):
    username_or_email: str
    password: str
    role: Optional[str] = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ============= PORT MANAGER SCHEMAS =============

class PortManagerCreate(BaseModel):
    # User fields
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    username: str
    
    # Port Manager specific fields
    employee_id: str
    mobile_number: Optional[str] = None
    port_name: str  # Will be converted to port_id
    department: Optional[str] = None
    security_pass_id: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

class PortManagerResponse(BaseModel):
    id: str
    user_id: str
    employee_id: str
    mobile_number: Optional[str]
    port_id: Optional[str]
    department: Optional[str]
    security_pass_id: Optional[str]
    created_at: datetime
    
    # Nested user data
    user: UserResponse
    
    class Config:
        from_attributes = True