# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.database import get_db
from app.models.disruptions import GlobalDisruption
from app.models.system import SystemHealthCard, SystemErrorLog
from app.schemas.admin import (
    GlobalDisruptionCreate,
    GlobalDisruptionUpdate,
    GlobalDisruptionResponse,
    SystemHealthCardResponse,
    SystemErrorLogResponse,
    ApiUsageDataPointResponse
)
from app.core.security import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["Admin Services"])

# =====================================================================
# PAGE 4.1: SYSTEM HEALTH MONITOR ENDPOINTS
# =====================================================================

@router.get("/health-cards", response_model=List[SystemHealthCardResponse])
def get_system_health_cards(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch health card status for DB, AIS, Weather, and Congestion pollers"""
    cards = db.query(SystemHealthCard).all()
    return [
        SystemHealthCardResponse(
            id=c.id,
            name=c.name,
            status=c.status,
            uptimePct=c.uptime_pct,
            latencyMs=c.latency_ms,
            lastSync=c.last_sync,
            details=c.details,
            metrics=c.metrics or []
        )
        for c in cards
    ]

@router.post("/health-cards/{card_id}/sync", response_model=SystemHealthCardResponse)
def sync_system_poller_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Trigger manual resync of a specific poller card"""
    card = db.query(SystemHealthCard).filter(SystemHealthCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health card not found")

    card.last_sync = "Just now"
    card.status = "Operational"
    card.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(card)

    return SystemHealthCardResponse(
        id=card.id,
        name=card.name,
        status=card.status,
        uptimePct=card.uptime_pct,
        latencyMs=card.latency_ms,
        lastSync=card.last_sync,
        details=card.details,
        metrics=card.metrics or []
    )

@router.get("/api-usage", response_model=List[ApiUsageDataPointResponse])
def get_api_usage_history(
    current_user = Depends(get_current_active_user)
):
    """Get time-series API usage analytics data for chart rendering"""
    return [
        {"time": "00:00", "totalRequests": 1420, "aisRequests": 950, "weatherRequests": 320, "portRequests": 150, "errorCount": 2},
        {"time": "03:00", "totalRequests": 1180, "aisRequests": 810, "weatherRequests": 270, "portRequests": 100, "errorCount": 1},
        {"time": "06:00", "totalRequests": 2650, "aisRequests": 1820, "weatherRequests": 540, "portRequests": 290, "errorCount": 4},
        {"time": "09:00", "totalRequests": 4890, "aisRequests": 3210, "weatherRequests": 980, "portRequests": 700, "errorCount": 8},
        {"time": "12:00", "totalRequests": 5310, "aisRequests": 3450, "weatherRequests": 1050, "portRequests": 810, "errorCount": 5},
        {"time": "15:00", "totalRequests": 4920, "aisRequests": 3190, "weatherRequests": 990, "portRequests": 740, "errorCount": 3},
        {"time": "18:00", "totalRequests": 3840, "aisRequests": 2510, "weatherRequests": 780, "portRequests": 550, "errorCount": 2},
        {"time": "21:00", "totalRequests": 2210, "aisRequests": 1480, "weatherRequests": 460, "portRequests": 270, "errorCount": 1},
    ]

@router.get("/error-logs", response_model=List[SystemErrorLogResponse])
def get_system_error_logs(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch system error logs for health dashboard table"""
    logs = db.query(SystemErrorLog).order_by(SystemErrorLog.created_at.desc()).all()
    return [
        SystemErrorLogResponse(
            id=l.id,
            timestamp=l.timestamp_str,
            service=l.service,
            severity=l.severity,
            code=l.code,
            message=l.message,
            stackTrace=l.stack_trace or "",
            resolved=l.resolved
        )
        for l in logs
    ]

@router.patch("/error-logs/{log_id}/toggle-resolve", response_model=SystemErrorLogResponse)
def toggle_error_log_resolve(
    log_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Toggle resolve status on a system error log entry"""
    log = db.query(SystemErrorLog).filter(SystemErrorLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Error log not found")

    log.resolved = not log.resolved
    db.commit()
    db.refresh(log)

    return SystemErrorLogResponse(
        id=log.id,
        timestamp=log.timestamp_str,
        service=log.service,
        severity=log.severity,
        code=log.code,
        message=log.message,
        stackTrace=log.stack_trace or "",
        resolved=log.resolved
    )


# =====================================================================
# PAGE 4.2: DISRUPTION MANAGEMENT ENDPOINTS
# =====================================================================

@router.get("/disruptions", response_model=List[GlobalDisruptionResponse])
def get_global_disruptions(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch all global disruptions for Admin Disruption Management"""
    query = db.query(GlobalDisruption)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (GlobalDisruption.disruption_type.ilike(search_pattern)) |
            (GlobalDisruption.location_name.ilike(search_pattern)) |
            (GlobalDisruption.description.ilike(search_pattern))
        )

    if severity and severity != "All":
        query = query.filter(GlobalDisruption.severity == severity.lower())

    disruptions = query.order_by(GlobalDisruption.created_at.desc()).all()

    return [
        GlobalDisruptionResponse(
            id=d.id,
            type=d.disruption_type,
            locationName=d.location_name,
            latitude=d.latitude,
            longitude=d.longitude,
            startDate=d.start_date,
            endDate=d.end_date,
            severity=d.severity,
            radiusNm=d.radius_nm,
            description=d.description,
            affectedVesselsCount=d.affected_vessels_count,
            resolved=d.resolved
        )
        for d in disruptions
    ]

@router.post("/disruptions", response_model=GlobalDisruptionResponse, status_code=status.HTTP_201_CREATED)
def create_global_disruption(
    disruption_in: GlobalDisruptionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Add a new global disruption event"""
    new_disruption = GlobalDisruption(
        disruption_type=disruption_in.type,
        location_name=disruption_in.locationName,
        latitude=disruption_in.latitude,
        longitude=disruption_in.longitude,
        start_date=disruption_in.startDate,
        end_date=disruption_in.endDate,
        severity=disruption_in.severity.lower(),
        radius_nm=disruption_in.radiusNm,
        description=disruption_in.description,
        affected_vessels_count=8,  # Default calculation heuristic
        resolved=False
    )
    db.add(new_disruption)
    db.commit()
    db.refresh(new_disruption)

    return GlobalDisruptionResponse(
        id=new_disruption.id,
        type=new_disruption.disruption_type,
        locationName=new_disruption.location_name,
        latitude=new_disruption.latitude,
        longitude=new_disruption.longitude,
        startDate=new_disruption.start_date,
        endDate=new_disruption.end_date,
        severity=new_disruption.severity,
        radiusNm=new_disruption.radius_nm,
        description=new_disruption.description,
        affectedVesselsCount=new_disruption.affected_vessels_count,
        resolved=new_disruption.resolved
    )

@router.put("/disruptions/{disruption_id}", response_model=GlobalDisruptionResponse)
def update_global_disruption(
    disruption_id: str,
    disruption_in: GlobalDisruptionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update details of a global disruption event"""
    d = db.query(GlobalDisruption).filter(GlobalDisruption.id == disruption_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disruption not found")

    if disruption_in.type is not None:
        d.disruption_type = disruption_in.type
    if disruption_in.locationName is not None:
        d.location_name = disruption_in.locationName
    if disruption_in.latitude is not None:
        d.latitude = disruption_in.latitude
    if disruption_in.longitude is not None:
        d.longitude = disruption_in.longitude
    if disruption_in.startDate is not None:
        d.start_date = disruption_in.startDate
    if disruption_in.endDate is not None:
        d.end_date = disruption_in.endDate
    if disruption_in.severity is not None:
        d.severity = disruption_in.severity.lower()
    if disruption_in.radiusNm is not None:
        d.radius_nm = disruption_in.radiusNm
    if disruption_in.description is not None:
        d.description = disruption_in.description
    if disruption_in.resolved is not None:
        d.resolved = disruption_in.resolved

    db.commit()
    db.refresh(d)

    return GlobalDisruptionResponse(
        id=d.id,
        type=d.disruption_type,
        locationName=d.location_name,
        latitude=d.latitude,
        longitude=d.longitude,
        startDate=d.start_date,
        endDate=d.end_date,
        severity=d.severity,
        radiusNm=d.radius_nm,
        description=d.description,
        affectedVesselsCount=d.affected_vessels_count,
        resolved=d.resolved
    )

@router.delete("/disruptions/{disruption_id}", status_code=status.HTTP_200_OK)
def delete_global_disruption(
    disruption_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Delete a global disruption event"""
    d = db.query(GlobalDisruption).filter(GlobalDisruption.id == disruption_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disruption not found")

    db.delete(d)
    db.commit()
    return {"message": "Disruption deleted successfully", "id": disruption_id}

@router.patch("/disruptions/{disruption_id}/toggle-resolve", response_model=GlobalDisruptionResponse)
def toggle_disruption_resolve(
    disruption_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Toggle resolve status on a global disruption event"""
    d = db.query(GlobalDisruption).filter(GlobalDisruption.id == disruption_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disruption not found")

    d.resolved = not d.resolved
    db.commit()
    db.refresh(d)

    return GlobalDisruptionResponse(
        id=d.id,
        type=d.disruption_type,
        locationName=d.location_name,
        latitude=d.latitude,
        longitude=d.longitude,
        startDate=d.start_date,
        endDate=d.end_date,
        severity=d.severity,
        radiusNm=d.radius_nm,
        description=d.description,
        affectedVesselsCount=d.affected_vessels_count,
        resolved=d.resolved
    )
