# backend/app/routers/ports.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
from app.database import get_db
from app.services.ai_telemetry_engine import get_full_network_telemetry
from app.schemas.port import (
    PortResponse,
    PortDetailResponse,
    PortDisruptionCreate,
    PortDisruptionResponse,
    BerthSlotResponse,
    VesselArrivalResponse,
    PortCongestionHistoryResponse,
    CongestionUpdateRequest,
    BerthAssignRequest,
    BerthFreeRequest,
    VesselArrivalCreate,
    VesselArrivalETAUpdate,
    VesselMarkArrivedRequest,
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
    assigned_port_id: Optional[str] = Query(None, description="Assigned port ID of the current manager to map network connections"),
    db: Session = Depends(get_db)
):
    """
    Get all ports for Port Overview Page (Page 3.1).
    Returns port health cards data.
    """
    query = db.query(Port)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Port.name.ilike(search_term)) |
            (Port.code.ilike(search_term)) |
            (Port.country.ilike(search_term))
        )

    if congestion_level and congestion_level != "all":
        query = query.filter(Port.congestion_level == congestion_level)

    ports = query.all()

    # Calculate network relation context
    owner_port = None
    network_port_ids = set()

    if assigned_port_id:
        owner_port = db.query(Port).filter(Port.id == assigned_port_id).first()

    if not owner_port and ports:
        # Default to first port (Rotterdam) if assigned_port_id not specified
        owner_port = ports[0]
    
    if owner_port:
        from app.models.ports import PortNetwork
        network_corridors = db.query(PortNetwork).filter(PortNetwork.source_port_id == owner_port.id).all()
        network_port_ids = {c.dest_port_id for c in network_corridors}

        # Guaranteed fallback network hubs if port_networks is sparse
        if len(network_port_ids) < 4:
            default_hubs = {"port-rotterdam", "port-singapore", "port-shanghai", "port-la", "port-dubai", "port-hamburg", "port-antwerp", "port-ningbo"}
            network_port_ids.update(default_hubs - {owner_port.id})

    for p in ports:
        if owner_port and p.id == owner_port.id:
            p.relation = "self"
        elif p.id in network_port_ids:
            p.relation = "network"
        else:
            p.relation = "other"

    return ports

# ============= PAGE 3.2: SINGLE PORT DETAIL =============

@router.get("/{port_id}", response_model=PortDetailResponse)
async def get_port_detail(
    port_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed port information for Single Port Detail Page (Page 3.2).
    Includes berth slots, 72h arrivals, 7-day congestion history, active disruptions, docked vessels.
    """
    port = db.query(Port).filter(Port.id == port_id).first()

    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port with ID '{port_id}' not found"
        )

    berth_slots = db.query(BerthSlot).filter(BerthSlot.port_id == port_id).all()

    now = datetime.utcnow()
    future_72h = now + timedelta(hours=72)
    vessel_arrivals = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.eta >= now,
            VesselArrival.eta <= future_72h
        )
    ).order_by(VesselArrival.eta).all()

    # Docked vessels (for departures section — status = "Docked")
    docked_vessels = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.status == "Docked"
        )
    ).order_by(VesselArrival.eta).all()

    past_7_days = now - timedelta(days=7)
    congestion_history = db.query(PortCongestionHistory).filter(
        and_(
            PortCongestionHistory.port_id == port_id,
            PortCongestionHistory.timestamp >= past_7_days
        )
    ).order_by(PortCongestionHistory.timestamp).all()

    active_disruptions = db.query(PortDisruption).filter(
        and_(
            PortDisruption.port_id == port_id,
            PortDisruption.is_active == True
        )
    ).order_by(desc(PortDisruption.started_at)).all()

    port_detail = PortDetailResponse(
        **port.__dict__,
        berth_slots=[BerthSlotResponse.from_orm(b) for b in berth_slots],
        vessel_arrivals=[VesselArrivalResponse.from_orm(v) for v in vessel_arrivals],
        docked_vessels=[VesselArrivalResponse.from_orm(v) for v in docked_vessels],
        congestion_history=[PortCongestionHistoryResponse.from_orm(h) for h in congestion_history],
        active_disruptions=[PortDisruptionResponse.from_orm(d) for d in active_disruptions]
    )

    return port_detail

# ============= CONGESTION MANAGEMENT =============

@router.patch("/{port_id}/congestion", response_model=PortResponse)
async def update_port_congestion(
    port_id: str,
    data: CongestionUpdateRequest,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Manually override port congestion percentage (Port Manager only).
    Records who made the update and when, logs to congestion history.
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")

    pct = data.congestion_percent

    # Derive congestion level
    if pct < 25:
        level = "low"
    elif pct < 50:
        level = "medium"
    elif pct < 85:
        level = "high"
    else:
        level = "critical"

    port.congestion_percent = pct
    port.congestion_level = level
    port.congestion_updated_by = current_user.full_name
    port.congestion_updated_at = datetime.utcnow()
    port.congestion_source = "manual"

    # Log to history
    history_entry = PortCongestionHistory(
        port_id=port_id,
        congestion_percent=pct,
        waiting_vessels=port.waiting_vessels,
        avg_wait_hours=port.avg_wait_hours,
        disruption_flag=bool(data.note),
        disruption_reason=data.note or None,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(port)
    return port

# ============= BERTH MANAGEMENT =============

@router.patch("/{port_id}/berths/{berth_id}/assign", response_model=BerthSlotResponse)
async def assign_vessel_to_berth(
    port_id: str,
    berth_id: str,
    data: BerthAssignRequest,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Assign a vessel to a berth slot. Marks it as occupied (Port Manager only).
    """
    berth = db.query(BerthSlot).filter(
        and_(BerthSlot.id == berth_id, BerthSlot.port_id == port_id)
    ).first()
    if not berth:
        raise HTTPException(status_code=404, detail="Berth not found")
    if berth.is_occupied:
        raise HTTPException(status_code=409, detail="Berth is already occupied")

    berth.is_occupied = True
    berth.current_vessel_mmsi = data.vessel_mmsi
    berth.current_vessel_name = data.vessel_name
    berth.occupied_since = datetime.utcnow()
    berth.estimated_departure = data.estimated_departure
    berth.cargo_operation = data.cargo_operation or "Loading"
    berth.loading_progress_percent = 0

    # Update port active_berths_used counter
    port = db.query(Port).filter(Port.id == port_id).first()
    if port:
        port.active_berths_used = min(port.berth_capacity, port.active_berths_used + 1)

    db.commit()
    db.refresh(berth)
    return berth

@router.patch("/{port_id}/berths/{berth_id}/free", response_model=BerthSlotResponse)
async def free_berth(
    port_id: str,
    berth_id: str,
    data: BerthFreeRequest,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Free a berth slot — marks vessel as departed (Port Manager only).
    """
    berth = db.query(BerthSlot).filter(
        and_(BerthSlot.id == berth_id, BerthSlot.port_id == port_id)
    ).first()
    if not berth:
        raise HTTPException(status_code=404, detail="Berth not found")
    if not berth.is_occupied:
        raise HTTPException(status_code=409, detail="Berth is already free")

    # Mark the linked VesselArrival as departed (if found)
    if berth.current_vessel_mmsi:
        docked_vessel = db.query(VesselArrival).filter(
            and_(
                VesselArrival.port_id == port_id,
                VesselArrival.vessel_mmsi == berth.current_vessel_mmsi,
                VesselArrival.status == "Docked"
            )
        ).first()
        if docked_vessel:
            docked_vessel.status = "Departed"
            docked_vessel.atd = datetime.utcnow()
            docked_vessel.berth_assignment_status = "Departed"

    berth.is_occupied = False
    berth.current_vessel_mmsi = None
    berth.current_vessel_name = None
    berth.occupied_since = None
    berth.estimated_departure = None
    berth.loading_progress_percent = 0
    berth.cargo_operation = None

    port = db.query(Port).filter(Port.id == port_id).first()
    if port:
        port.active_berths_used = max(0, port.active_berths_used - 1)

    db.commit()
    db.refresh(berth)
    return berth

# ============= VESSEL ARRIVALS MANAGEMENT =============

@router.post("/{port_id}/arrivals", response_model=VesselArrivalResponse, status_code=201)
async def add_vessel_arrival(
    port_id: str,
    data: VesselArrivalCreate,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Add a new vessel to the arrivals schedule (Port Manager only).
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")

    arrival = VesselArrival(
        port_id=port_id,
        vessel_mmsi=data.vessel_mmsi,
        vessel_name=data.vessel_name,
        vessel_type=data.vessel_type,
        vessel_flag=data.vessel_flag,
        eta=data.eta,
        status="Scheduled",
        berth_assignment_status="Pending",
        cargo_type=data.cargo_type,
        cargo_tonnage=data.cargo_tonnage,
        teu_count=data.teu_count,
    )
    db.add(arrival)
    db.commit()
    db.refresh(arrival)
    return arrival

@router.patch("/{port_id}/arrivals/{arrival_id}/eta", response_model=VesselArrivalResponse)
async def update_vessel_eta(
    port_id: str,
    arrival_id: str,
    data: VesselArrivalETAUpdate,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Update ETA for a scheduled vessel arrival (Port Manager only).
    """
    arrival = db.query(VesselArrival).filter(
        and_(VesselArrival.id == arrival_id, VesselArrival.port_id == port_id)
    ).first()
    if not arrival:
        raise HTTPException(status_code=404, detail="Arrival not found")

    arrival.eta = data.eta
    db.commit()
    db.refresh(arrival)
    return arrival

@router.patch("/{port_id}/arrivals/{arrival_id}/arrived", response_model=VesselArrivalResponse)
async def mark_vessel_arrived(
    port_id: str,
    arrival_id: str,
    data: VesselMarkArrivedRequest,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Mark a scheduled vessel as arrived / docked (Port Manager only).
    Optionally assigns it to a berth.
    """
    arrival = db.query(VesselArrival).filter(
        and_(VesselArrival.id == arrival_id, VesselArrival.port_id == port_id)
    ).first()
    if not arrival:
        raise HTTPException(status_code=404, detail="Arrival not found")

    arrival.status = "Docked"
    arrival.ata = datetime.utcnow()
    arrival.berth_assignment_status = "Docked"

    # Optionally assign to a specific berth
    if data.berth_id:
        berth = db.query(BerthSlot).filter(
            and_(BerthSlot.id == data.berth_id, BerthSlot.port_id == port_id)
        ).first()
        if berth and not berth.is_occupied:
            berth.is_occupied = True
            berth.current_vessel_mmsi = arrival.vessel_mmsi
            berth.current_vessel_name = arrival.vessel_name
            berth.occupied_since = datetime.utcnow()
            berth.cargo_operation = "Unloading"
            berth.loading_progress_percent = 0
            arrival.assigned_berth_id = berth.id
            arrival.berth_assignment_status = f"Assigned: {berth.berth_number}"

            port = db.query(Port).filter(Port.id == port_id).first()
            if port:
                port.active_berths_used = min(port.berth_capacity, port.active_berths_used + 1)

    db.commit()
    db.refresh(arrival)
    return arrival

@router.patch("/{port_id}/arrivals/{arrival_id}/cancel", response_model=VesselArrivalResponse)
async def cancel_vessel_arrival(
    port_id: str,
    arrival_id: str,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Cancel a scheduled vessel arrival (Port Manager only).
    """
    arrival = db.query(VesselArrival).filter(
        and_(VesselArrival.id == arrival_id, VesselArrival.port_id == port_id)
    ).first()
    if not arrival:
        raise HTTPException(status_code=404, detail="Arrival not found")
    if arrival.status == "Docked":
        raise HTTPException(status_code=409, detail="Cannot cancel a vessel that is already docked")

    arrival.status = "Cancelled"
    arrival.berth_assignment_status = "Cancelled"
    db.commit()
    db.refresh(arrival)
    return arrival

# ============= DEPARTURES MANAGEMENT =============

@router.get("/{port_id}/departures", response_model=List[VesselArrivalResponse])
async def get_docked_vessels(
    port_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all vessels currently docked at a port (for departures management).
    """
    docked = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.status == "Docked"
        )
    ).order_by(VesselArrival.eta).all()
    return docked

@router.patch("/{port_id}/arrivals/{arrival_id}/departed", response_model=VesselArrivalResponse)
async def mark_vessel_departed(
    port_id: str,
    arrival_id: str,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db)
):
    """
    Mark a docked vessel as departed — frees its berth automatically (Port Manager only).
    """
    arrival = db.query(VesselArrival).filter(
        and_(VesselArrival.id == arrival_id, VesselArrival.port_id == port_id)
    ).first()
    if not arrival:
        raise HTTPException(status_code=404, detail="Vessel record not found")
    if arrival.status != "Docked":
        raise HTTPException(status_code=409, detail="Vessel is not currently docked")

    arrival.status = "Departed"
    arrival.atd = datetime.utcnow()
    arrival.berth_assignment_status = "Departed"

    # Free the berth automatically
    if arrival.assigned_berth_id:
        berth = db.query(BerthSlot).filter(BerthSlot.id == arrival.assigned_berth_id).first()
        if berth:
            berth.is_occupied = False
            berth.current_vessel_mmsi = None
            berth.current_vessel_name = None
            berth.occupied_since = None
            berth.estimated_departure = None
            berth.loading_progress_percent = 0
            berth.cargo_operation = None
    else:
        # Also free berth by MMSI match if no direct FK
        berth = db.query(BerthSlot).filter(
            and_(
                BerthSlot.port_id == port_id,
                BerthSlot.current_vessel_mmsi == arrival.vessel_mmsi,
                BerthSlot.is_occupied == True
            )
        ).first()
        if berth:
            berth.is_occupied = False
            berth.current_vessel_mmsi = None
            berth.current_vessel_name = None
            berth.occupied_since = None
            berth.estimated_departure = None
            berth.loading_progress_percent = 0
            berth.cargo_operation = None

    port = db.query(Port).filter(Port.id == port_id).first()
    if port:
        port.active_berths_used = max(0, port.active_berths_used - 1)

    db.commit()
    db.refresh(arrival)
    return arrival

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
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port with ID '{port_id}' not found"
        )

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


# ============= REAL-TIME AI NETWORK CORRIDOR TELEMETRY =============

@router.get("/{port_id}/network-telemetry")
async def get_network_corridor_telemetry(
    port_id: str,
    assigned_port_id: Optional[str] = Query(None, description="The home port ID of the requesting port manager"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Real-time AI Network Corridor Telemetry & Disruption Prediction Engine.

    Returns comprehensive monitoring data for a specific network partner port:
    - 7-day vessel arrival & departure schedule
    - Maritime route status & alternative rerouting paths
    - AI-powered downstream congestion surge prediction
    - Trade volume & reliability metrics
    - Direct port manager contact information
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Port '{port_id}' not found."
        )

    telemetry = get_full_network_telemetry(
        dest_port_id=port_id,
        assigned_port_id=assigned_port_id or "",
        db=db
    )
    return telemetry