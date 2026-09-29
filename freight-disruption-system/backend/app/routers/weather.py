# backend/app/routers/weather.py
"""
Weather & Environmental Telemetry Router.
Exposes live OpenWeather data, NOAA/NSIDC polar ice layers, and maritime security zones.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.database import get_db
from app.services.weather_service import weather_service
from app.services.spatial_service import spatial_service
from app.models.disruptions import GlobalDisruption

router = APIRouter(prefix="/api/weather", tags=["Weather & Environmental"])

@router.get("/current")
async def get_current_weather(
    lat: float = Query(..., description="Latitude", ge=-90.0, le=90.0),
    lon: float = Query(..., description="Longitude", ge=-180.0, le=180.0)
):
    """Get current weather telemetry for geographic coordinates."""
    return await weather_service.get_current_weather(lat, lon)

@router.get("/port/{port_name}")
async def get_port_weather(
    port_name: str,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get weather conditions for a specific maritime port."""
    return await weather_service.get_port_weather(port_name, lat, lon)

@router.get("/ice-extent")
async def get_ice_extent():
    """Get Arctic and Baltic sea ice layer polygons (NOAA / NSIDC standards)."""
    return await weather_service.get_ice_extent_zones()

@router.get("/security-zones")
async def get_maritime_security_zones():
    """Get maritime high risk areas (Red Sea, Gulf of Guinea, Malacca Strait)."""
    return await weather_service.get_piracy_and_security_zones()

@router.get("/spatial-risk")
async def get_spatial_risk_assessment(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    db: Session = Depends(get_db)
):
    """Calculate combined spatial and weather risk for a vessel or location."""
    weather = await weather_service.get_current_weather(lat, lon)
    disruptions = db.query(GlobalDisruption).filter(GlobalDisruption.resolved == False).all()
    status_str, reason_str, min_dist = spatial_service.assess_vessel_disruption_proximity(lat, lon, disruptions)

    return {
        "coordinates": {"latitude": lat, "longitude": lon},
        "spatial_status": status_str,
        "disruption_reason": reason_str,
        "nearest_disruption_distance_nm": min_dist,
        "weather_risk_level": weather.get("weather_risk_level", "low"),
        "wave_height_meters": weather.get("estimated_wave_height_meters"),
        "wind_speed_knots": weather.get("wind_speed_knots"),
        "beaufort_scale": weather.get("beaufort_scale"),
        "weather_condition": weather.get("condition"),
        "data_source": weather.get("data_source")
    }
