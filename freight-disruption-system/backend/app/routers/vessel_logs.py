# backend/app/routers/vessel_logs.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy import String, or_
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io

from app.database import get_db
from app.models.vessels import VesselLog
from app.schemas.vessels import VesselLogCreate, VesselLogResponse
from app.core.security import get_current_active_user

router = APIRouter(prefix="/vessel-logs", tags=["Vessel Logs"])

@router.get("", response_model=List[VesselLogResponse])
def get_vessel_logs(
    category: Optional[str] = Query("Arrivals", description="Arrivals, Departures, or Expected"),
    search: Optional[str] = None,
    vessel_type: Optional[str] = Query(None, alias="type"),
    flag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch vessel logs with category, search, type, and flag filtering"""
    query = db.query(VesselLog)

    if category and category != "All":
        query = query.filter(VesselLog.category == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                VesselLog.name.ilike(search_pattern),
                VesselLog.port.ilike(search_pattern),
                VesselLog.terminal.ilike(search_pattern),
                VesselLog.berth.ilike(search_pattern),
                VesselLog.cargo.ilike(search_pattern),
                VesselLog.agent.ilike(search_pattern),
                VesselLog.mmsi.cast(String).ilike(search_pattern),
                VesselLog.imo.cast(String).ilike(search_pattern)
            )
        )

    if vessel_type and vessel_type != "All":
        query = query.filter(VesselLog.vessel_type == vessel_type)

    if flag and flag != "All":
        query = query.filter(VesselLog.flag.ilike(f"%{flag}%"))

    logs = query.all()
    return logs

@router.post("", response_model=VesselLogResponse, status_code=status.HTTP_201_CREATED)
def create_vessel_log(
    log_in: VesselLogCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Create a new vessel log entry"""
    new_log = VesselLog(
        mmsi=log_in.mmsi,
        imo=log_in.imo,
        name=log_in.name,
        vessel_type=log_in.type,
        flag=log_in.flag,
        port=log_in.port,
        terminal=log_in.terminal,
        berth=log_in.berth,
        arrival_date=log_in.arrivalDate,
        departure_date=log_in.departureDate,
        eta=log_in.eta,
        etd=log_in.etd,
        ata=log_in.ata,
        atd=log_in.atd,
        status=log_in.status,
        category=log_in.category,
        cargo=log_in.cargo,
        agent=log_in.agent,
        draft=log_in.draft
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@router.get("/export-csv")
def export_vessel_logs_csv(
    category: Optional[str] = Query("Arrivals"),
    search: Optional[str] = None,
    vessel_type: Optional[str] = Query(None, alias="type"),
    flag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Export filtered vessel logs as a CSV download"""
    query = db.query(VesselLog)

    if category and category != "All":
        query = query.filter(VesselLog.category == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                VesselLog.name.ilike(search_pattern),
                VesselLog.port.ilike(search_pattern),
                VesselLog.terminal.ilike(search_pattern),
                VesselLog.agent.ilike(search_pattern)
            )
        )

    if vessel_type and vessel_type != "All":
        query = query.filter(VesselLog.vessel_type == vessel_type)

    if flag and flag != "All":
        query = query.filter(VesselLog.flag.ilike(f"%{flag}%"))

    logs = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "MMSI", "IMO", "Vessel Name", "Type", "Flag", "Port", "Terminal", 
        "Berth", "Arrival Date", "Departure Date", "ETA", "ETD", "ATA", "ATD", 
        "Status", "Category", "Cargo", "Agent", "Draft (m)"
    ])

    for log in logs:
        writer.writerow([
            log.id, log.mmsi, log.imo, log.name, log.vessel_type, log.flag,
            log.port, log.terminal, log.berth, log.arrival_date, log.departure_date,
            log.eta or "", log.etd or "", log.ata or "", log.atd or "",
            log.status, log.category, log.cargo, log.agent, log.draft
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=vessel_logs_{category.lower()}.csv"}
    )
