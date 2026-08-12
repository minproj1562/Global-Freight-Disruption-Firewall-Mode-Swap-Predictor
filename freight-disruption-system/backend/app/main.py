# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import asyncio
import os

from app.core.config import settings
from app.database import init_db
from app.services.ais_stream_client import AISStreamClient
from app.services.vessel_handler import handle_vessel_update
from app.services.port_services import seed_sample_ports
from app.routers import auth_router, ports_router, vessels_router, vessel_logs_router, admin_router
from app.database import SessionLocal

load_dotenv()

# AIS Stream Client
client = AISStreamClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # ========== STARTUP ==========
    print("🚀 Starting Freight Disruption API...")
    
    # Initialize database tables
    init_db()
    
    # Seed sample ports (only if database is empty)
    db = SessionLocal()
    from app.models.ports import Port
    port_count = db.query(Port).count()
    if port_count == 0:
        print("📦 Seeding sample ports...")
        seed_sample_ports(db)
    db.close()
    
    # Start AIS stream as a non-blocking background task.
    # If the connection fails or the API key is invalid the task retries
    # with back-off and the rest of the API continues serving requests.
    print("Starting AIS stream (background)...")
    client._running = True
    asyncio.create_task(client.run_forever(handle_vessel_update))
    print("API is ready!")

    yield  # Server is running

    # ========== SHUTDOWN ==========
    print("Shutting down API...")
    await client.close()
    print("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Freight Disruption API",
    version="1.0.0",
    description="Global Freight Disruption Firewall & Port Manager Operations Center",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(ports_router)
app.include_router(vessels_router)
app.include_router(vessel_logs_router)
app.include_router(admin_router)

# ============= ROOT ENDPOINTS =============

@app.get("/")
async def root():
    return {
        "message": "Freight Disruption API - Port Operations Center",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "auth": "/api/auth",
            "ports": "/api/ports",
            "vessels": "/api/vessels/admin",
            "vessel_logs": "/api/vessel-logs",
            "admin_disruptions": "/api/admin/disruptions",
            "admin_health": "/api/admin/health-cards",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "ais_stream": "active"
    }