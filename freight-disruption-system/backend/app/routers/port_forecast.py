# backend/app/routers/port_forecast.py
"""
Port Congestion Forecast Router
Provides endpoints for port congestion forecasting and alternatives
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.services.port_forecast_service import PortForecastService
from app.models.ports import Port, PortCongestionHistory

router = APIRouter(prefix="/api/ports", tags=["Port Congestion Forecast"])


class ForecastResponse(BaseModel):
    port_id: str
    port_name: str
    forecast_data: List[Dict]
    mae: float
    mape: float
    confidence_score: float
    cached: bool = False


@router.get("/congestion/heatmap")
def get_congestion_heatmap(db: Session = Depends(get_db)):
    """
    Get real-time congestion dot-heatmap data for all ports.
    """
    forecast_service = PortForecastService(db)
    heatmap_data = forecast_service.get_congestion_heatmap()

    return {
        "ports": heatmap_data,
        "total_ports": len(heatmap_data),
        "critical_count": len([p for p in heatmap_data if p['congestion_level'] == 'critical']),
        "high_count": len([p for p in heatmap_data if p['congestion_level'] == 'high'])
    }


@router.get("/congestion-forecast/ripple-map")
def get_congestion_ripple_map(
    top_n: int = Query(10, ge=1, le=30, description="Number of busiest ports to include"),
    db: Session = Depends(get_db)
):
    """
    Page 1.5 — Congestion Forecast (Ripple-Heat) Map.
    Returns short-horizon (now / +24h / +48h / +72h) congestion projections
    for the busiest ports, each with nearby alternative ports attached,
    derived from the same Prophet model used for the 7/14/30-day forecast.
    """
    forecast_service = PortForecastService(db)
    data = forecast_service.get_ripple_heatmap_data(top_n_ports=top_n)

    return {
        "forecasts": data,
        "count": len(data),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/{port_id}/forecast")
def get_port_forecast(
    port_id: str,
    horizon: int = Query(14, description="Forecast horizon in days (7, 14, or 30)"),
    retrain: bool = Query(False, description="Force retrain model"),
    db: Session = Depends(get_db)
):
    """
    Get congestion forecast for a specific port (7/14/30-day Port Dashboard view)
    """

    if horizon not in [7, 14, 30]:
        raise HTTPException(status_code=400, detail="Horizon must be 7, 14, or 30 days")

    port = db.query(Port).filter(Port.id == port_id).first()

    if not port:
        raise HTTPException(status_code=404, detail=f"Port {port_id} not found")

    forecast_service = PortForecastService(db)
    forecast = forecast_service.train_and_forecast(port_id, horizon, retrain)

    return {
        "port_id": port_id,
        "port_name": port.name,
        "port_code": port.code,
        "current_congestion_percent": port.congestion_percent,
        "forecast_horizon_days": horizon,
        **forecast
    }


@router.get("/{port_id}/history")
def get_port_congestion_history(
    port_id: str,
    days: int = Query(30, description="Number of days of history"),
    db: Session = Depends(get_db)
):
    """
    Get historical congestion data for a port
    """
    from datetime import datetime, timedelta

    port = db.query(Port).filter(Port.id == port_id).first()

    if not port:
        raise HTTPException(status_code=404, detail=f"Port {port_id} not found")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    history = db.query(PortCongestionHistory).filter(
        PortCongestionHistory.port_id == port_id,
        PortCongestionHistory.timestamp >= cutoff_date
    ).order_by(PortCongestionHistory.timestamp).all()

    history_data = [
        {
            "timestamp": h.timestamp.isoformat(),
            "congestion_percent": h.congestion_percent,
            "waiting_vessels": h.waiting_vessels,
            "avg_wait_hours": h.avg_wait_hours,
            "disruption_flag": h.disruption_flag
        }
        for h in history
    ]

    return {
        "port_id": port_id,
        "port_name": port.name,
        "history": history_data,
        "count": len(history_data)
    }


@router.get("/{port_id}/alternatives")
def get_alternative_ports(
    port_id: str,
    max_distance_km: float = Query(500.0, description="Maximum distance from source port"),
    max_results: int = Query(5, description="Maximum number of alternatives"),
    db: Session = Depends(get_db)
):
    """
    Get alternative ports with lower congestion
    """
    port = db.query(Port).filter(Port.id == port_id).first()

    if not port:
        raise HTTPException(status_code=404, detail=f"Port {port_id} not found")

    forecast_service = PortForecastService(db)
    alternatives = forecast_service.find_alternative_ports(port_id, max_distance_km, max_results)

    return {
        "source_port_id": port_id,
        "source_port_name": port.name,
        "source_congestion_percent": port.congestion_percent,
        "alternatives": alternatives,
        "count": len(alternatives)
    }