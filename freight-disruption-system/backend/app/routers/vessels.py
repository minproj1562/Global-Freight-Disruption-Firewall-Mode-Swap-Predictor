# backend/app/routers/vessels.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import String
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from app.database import get_db
from app.models.vessels import Vessel
from app.schemas.vessels import (
    AdminVesselCreate,
    AdminVesselUpdate,
    AdminVesselResponse
)
from app.core.security import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/vessels", tags=["Vessel Management"])

@router.get("/admin", response_model=List[AdminVesselResponse])
def get_admin_vessels(
    search: Optional[str] = None,
    vessel_type: Optional[str] = Query(None, alias="type"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch all vessels for Vessel Management dashboard with search and filter options"""
    query = db.query(Vessel)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Vessel.name.ilike(search_pattern)) |
            (Vessel.flag.ilike(search_pattern)) |
            (Vessel.current_port.ilike(search_pattern)) |
            (Vessel.mmsi.cast(String).ilike(search_pattern)) |
            (Vessel.imo.cast(String).ilike(search_pattern))
        )
        
    if vessel_type and vessel_type != "All":
        query = query.filter(Vessel.vessel_type == vessel_type)
        
    if status_filter and status_filter != "All":
        query = query.filter(Vessel.status == status_filter)
        
    vessels = query.all()
    
    # Format response
    return [
        AdminVesselResponse(
            id=v.id,
            mmsi=v.mmsi,
            imo=v.imo or 0,
            name=v.name,
            type=v.vessel_type or "Container",
            flag=v.flag or "Unknown",
            dwt=v.dwt or 0.0,
            currentPort=v.current_port or "At Sea",
            status=v.status or "Underway",
            lastAisUpdate=v.last_ais_update_str or "Just now",
            isActive=v.is_active if v.is_active is not None else True
        )
        for v in vessels
    ]

@router.post("/admin", response_model=AdminVesselResponse, status_code=status.HTTP_201_CREATED)
def create_admin_vessel(
    vessel_in: AdminVesselCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Add a new vessel record"""
    existing_mmsi = db.query(Vessel).filter(Vessel.mmsi == vessel_in.mmsi).first()
    if existing_mmsi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vessel with MMSI {vessel_in.mmsi} already exists."
        )

    new_vessel = Vessel(
        mmsi=vessel_in.mmsi,
        imo=vessel_in.imo,
        name=vessel_in.name,
        vessel_type=vessel_in.type,
        flag=vessel_in.flag,
        dwt=vessel_in.dwt,
        current_port=vessel_in.currentPort,
        status=vessel_in.status,
        last_ais_update_str="Just now",
        is_active=True
    )
    db.add(new_vessel)
    db.commit()
    db.refresh(new_vessel)

    return AdminVesselResponse(
        id=new_vessel.id,
        mmsi=new_vessel.mmsi,
        imo=new_vessel.imo or 0,
        name=new_vessel.name,
        type=new_vessel.vessel_type,
        flag=new_vessel.flag,
        dwt=new_vessel.dwt,
        currentPort=new_vessel.current_port,
        status=new_vessel.status,
        lastAisUpdate=new_vessel.last_ais_update_str,
        isActive=new_vessel.is_active
    )

@router.put("/admin/{vessel_id}", response_model=AdminVesselResponse)
def update_admin_vessel(
    vessel_id: str,
    vessel_in: AdminVesselUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update details of an existing vessel"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vessel not found")

    if vessel_in.name is not None:
        vessel.name = vessel_in.name
    if vessel_in.mmsi is not None:
        vessel.mmsi = vessel_in.mmsi
    if vessel_in.imo is not None:
        vessel.imo = vessel_in.imo
    if vessel_in.type is not None:
        vessel.vessel_type = vessel_in.type
    if vessel_in.flag is not None:
        vessel.flag = vessel_in.flag
    if vessel_in.dwt is not None:
        vessel.dwt = vessel_in.dwt
    if vessel_in.currentPort is not None:
        vessel.current_port = vessel_in.currentPort
    if vessel_in.status is not None:
        vessel.status = vessel_in.status
    if vessel_in.isActive is not None:
        vessel.is_active = vessel_in.isActive

    vessel.last_ais_update_str = "Just now"
    db.commit()
    db.refresh(vessel)

    return AdminVesselResponse(
        id=vessel.id,
        mmsi=vessel.mmsi,
        imo=vessel.imo or 0,
        name=vessel.name,
        type=vessel.vessel_type,
        flag=vessel.flag,
        dwt=vessel.dwt,
        currentPort=vessel.current_port,
        status=vessel.status,
        lastAisUpdate=vessel.last_ais_update_str,
        isActive=vessel.is_active
    )

@router.delete("/admin/{vessel_id}", status_code=status.HTTP_200_OK)
def delete_admin_vessel(
    vessel_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Delete a vessel record"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vessel not found")

    db.delete(vessel)
    db.commit()
    return {"message": "Vessel deleted successfully", "id": vessel_id}

@router.patch("/admin/{vessel_id}/toggle-active", response_model=AdminVesselResponse)
def toggle_vessel_active(
    vessel_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Toggle vessel active/inactive state"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vessel not found")

    vessel.is_active = not vessel.is_active
    db.commit()
    db.refresh(vessel)

    return AdminVesselResponse(
        id=vessel.id,
        mmsi=vessel.mmsi,
        imo=vessel.imo or 0,
        name=vessel.name,
        type=vessel.vessel_type,
        flag=vessel.flag,
        dwt=vessel.dwt,
        currentPort=vessel.current_port,
        status=vessel.status,
        lastAisUpdate=vessel.last_ais_update_str,
        isActive=vessel.is_active
    )

@router.post("/admin/refresh-ais")
def refresh_ais_data(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Force AIS telemetry update on all active vessels"""
    active_vessels = db.query(Vessel).filter(Vessel.is_active == True).all()
    now_str = "Just now"
    for v in active_vessels:
        v.last_ais_update_str = now_str

    db.commit()
    return {
        "message": f"AIS Telemetry refreshed for {len(active_vessels)} active vessels.",
        "updatedCount": len(active_vessels),
        "timestamp": datetime.datetime.now().isoformat()
    }
