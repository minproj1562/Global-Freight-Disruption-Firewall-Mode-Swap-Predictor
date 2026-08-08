# backend/app/routers/__init__.py
from app.routers.auth import router as auth_router
from app.routers.ports import router as ports_router
from app.routers.vessels import router as vessels_router
from app.routers.vessel_logs import router as vessel_logs_router
from app.routers.admin import router as admin_router

__all__ = ["auth_router", "ports_router", "vessels_router", "vessel_logs_router", "admin_router"]