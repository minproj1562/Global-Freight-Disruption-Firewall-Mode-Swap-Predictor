# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.services.ais_stream_client import AISStreamClient
from app.services.vessel_handler import handle_vessel_update
from contextlib import asynccontextmanager
import asyncio
import os
client = AISStreamClient()
load_dotenv()

app = FastAPI(
    title="Freight Disruption API",
    version="1.0.0",
    description="Global Freight Disruption Firewall & Mode-Swap Predictor"
)

# CORS - Allows frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Freight Disruption API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the AIS stream
    print("Starting AIS stream...")
    await client.connect()
    await client.subscribe()
    asyncio.create_task(client.receive_data(handle_vessel_update))
    
    yield  # Server is running
    
    # Shutdown: Close the connection
    await client.close()

app = FastAPI(
    title="Freight Disruption API",
    version="1.0.0",
    lifespan=lifespan  # Add this
)
