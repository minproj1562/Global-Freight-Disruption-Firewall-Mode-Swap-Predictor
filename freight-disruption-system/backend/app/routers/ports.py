# backend/app/routers/ports.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.schemas.port import (
    PortResponse,
    PortDetailResponse,
    PortDisruptionCreate,
    PortDisruptionResponse,
    BerthSlotResponse,
    VesselArrivalResponse,
    PortCongestionHistoryResponse
)
from app.models.ports import Port, PortDisruption, BerthSlot, VesselArrival, PortCongestionHistory
from app.models.users import User
from app.core.security import get_current_user, get_current_port_manager

router = APIRouter(prefix="/api/ports", tags=["Ports"])

# ============= PAGE 3.1: PORT OVERVIEW =============

@router.get("/", response_model=List[PortResponse])
async def get_all_ports(
    search: Optional[str] = Query(None, description="Search by port name, code, or country"),
    congestion_level: Optional[str] = Query(None, description="Filter by congestion level"),
    db: Session = Depends(get_db)
):
    """
    Get all ports for Port Overview Page (Page 3.1).
    Returns port health cards data.
    """
    query = db.query(Port)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Port.name.ilike(search_term)) |
            (Port.code.ilike(search_term)) |
            (Port.country.ilike(search_term))
        )
    
    # Apply congestion filter
    if congestion_level and congestion_level != "all":
        query = query.filter(Port.congestion_level == congestion_level)
    
    ports = query.all()
    return ports

# ============= PAGE 3.2: SINGLE PORT DETAIL =============

@router.get("/{port_id}", response_model=PortDetailResponse)
async def get_port_detail(
    port_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed port information for Single Port Detail Page (Page 3.2).
    Includes:
    - Port KPIs
    - Berth slots with occupancy
    - 72-hour vessel arrival schedule
    - 7-day congestion history
    - Active disruptions
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    
    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port with ID '{port_id}' not found"
        )
    
    # Get berth slots
    berth_slots = db.query(BerthSlot).filter(BerthSlot.port_id == port_id).all()
    
    # Get 72-hour vessel arrivals (next 3 days)
    now = datetime.utcnow()
    future_72h = now + timedelta(hours=72)
    vessel_arrivals = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.eta >= now,
            VesselArrival.eta <= future_72h
        )
    ).order_by(VesselArrival.eta).all()
    
    # Get 7-day congestion history
    past_7_days = now - timedelta(days=7)
    congestion_history = db.query(PortCongestionHistory).filter(
        and_(
            PortCongestionHistory.port_id == port_id,
            PortCongestionHistory.timestamp >= past_7_days
        )
    ).order_by(PortCongestionHistory.timestamp).all()
    
    # Get active disruptions
    active_disruptions = db.query(PortDisruption).filter(
        and_(
            PortDisruption.port_id == port_id,
            PortDisruption.is_active == True
        )
    ).order_by(desc(PortDisruption.started_at)).all()
    
    # Build response
    port_detail = PortDetailResponse(
        **port.__dict__,
        berth_slots=[BerthSlotResponse.from_orm(b) for b in berth_slots],
        vessel_arrivals=[VesselArrivalResponse.from_orm(v) for v in vessel_arrivals],
        congestion_history=[PortCongestionHistoryResponse.from_orm(h) for h in congestion_history],
        active_disruptions=[PortDisruptionResponse.from_orm(d) for d in active_disruptions]
    )
    
    return port_detail

# ============= FLAG PORT DISRUPTION =============

@router.post("/{port_id}/disruptions", response_model=PortDisruptionResponse, status_code=status.HTTP_201_CREATED)
async def flag_port_disruption(
    port_id: str,
    disruption_data: PortDisruptionCreate,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Flag a port as disrupted (Port Manager only).
    Creates a new disruption record.
    """
    # Verify port exists
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port with ID '{port_id}' not found"
        )
    
    # Create disruption
    new_disruption = PortDisruption(
        port_id=port_id,
        disruption_type=disruption_data.disruption_type,
        severity=disruption_data.severity,
        title=disruption_data.title,
        description=disruption_data.description,
        is_active=True,
        flagged_by_user_id=current_user.id
    )
    
    db.add(new_disruption)
    
    # Update port congestion level based on severity
    if disruption_data.severity in ["high", "critical"]:
        port.congestion_level = disruption_data.severity
        port.status_label = f"Disrupted: {disruption_data.disruption_type}"
    
    db.commit()
    db.refresh(new_disruption)
    
    return PortDisruptionResponse.from_orm(new_disruption)

# ============= RESOLVE PORT DISRUPTION =============

@router.patch("/{port_id}/disruptions/{disruption_id}/resolve", response_model=PortDisruptionResponse)
async def resolve_port_disruption(
    port_id: str,
    disruption_id: str,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Mark a port disruption as resolved (Port Manager only).
    """
    disruption = db.query(PortDisruption).filter(
        and_(
            PortDisruption.id == disruption_id,
            PortDisruption.port_id == port_id
        )
    ).first()
    
    if not disruption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disruption not found"
        )
    
    disruption.is_active = False
    disruption.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(disruption)
    
    return PortDisruptionResponse.from_orm(disruption)

# ============= GET PORT BERTH DIAGRAM =============

@router.get("/{port_id}/berths", response_model=List[BerthSlotResponse])
async def get_port_berths(
    port_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all berth slots for a port (for berth diagram visualization).
    """
    berth_slots = db.query(BerthSlot).filter(BerthSlot.port_id == port_id).all()
    return berth_slots