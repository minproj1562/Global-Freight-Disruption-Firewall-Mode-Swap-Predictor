# backend/app/routers/__init__.py
from app.routers.auth import router as auth_router
from app.routers.ports import router as ports_router
from app.routers.vessels import router as vessels_router
from app.routers.vessel_logs import router as vessel_logs_router
from app.routers.admin import router as admin_router
<<<<<<< Updated upstream
=======
from app.routers.simulation import router as simulation_router
>>>>>>> Stashed changes
from app.routers.map import router as map_router
from app.routers.disruptions import router as disruptions_router
from app.routers.reroute import router as reroute_router
from app.routers.active_routes import router as active_routes_router
from app.routers.congestion import router as congestion_router
from app.routers.risk_register import router as risk_register_router

__all__ = [
    "auth_router",
    "ports_router",
    "vessels_router",
    "vessel_logs_router",
    "admin_router",
    "simulation_router",
    "map_router",
    "disruptions_router",
    "reroute_router",
    "active_routes_router",
    "congestion_router",
    "risk_register_router",
<<<<<<< Updated upstream
]
=======
]
>>>>>>> Stashed changes
