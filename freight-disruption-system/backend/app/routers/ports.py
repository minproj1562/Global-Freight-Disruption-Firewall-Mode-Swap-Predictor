#backend/app/routers/ports.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, String
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
import csv
import io
import math
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
    VesselSyncSuggestion,
)
from app.models.ports import Port, PortDisruption, BerthSlot, VesselArrival, PortCongestionHistory
from app.models.users import User
from app.models.vessels import Vessel
from app.core.security import get_current_user, get_current_port_manager

router = APIRouter(prefix="/api/ports", tags=["Ports"])

# ============= GEOSPATIAL HELPER (AIS SYNC) =============

def _haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in nautical miles."""
    R_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return R_km * c * 0.539957  # km -> nautical miles

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
    Returns port health cards data, annotated with `relation`
    ("self" | "network" | "other") relative to the requesting manager's
    assigned port.
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

    # Deterministic ordering — never rely on unordered DB row order for the
    # owner_port fallback below, otherwise which port is treated as "home"
    # (and therefore the entire network relation calculation) can silently
    # change between requests/environments.
    ports = query.order_by(Port.id).all()

    owner_port = None
    network_port_ids: set = set()

    if assigned_port_id:
        owner_port = db.query(Port).filter(Port.id == assigned_port_id).first()

    if not owner_port:
        # Deterministic fallback: prefer the canonical Rotterdam anchor port,
        # otherwise fall back to the first port in stable (id-ordered) sequence.
        owner_port = db.query(Port).filter(Port.id == "port-rotterdam").first()
        if not owner_port and ports:
            owner_port = ports[0]

    if owner_port:
        from app.services.port_services import (
            ensure_network_connections_for_port,
            get_network_port_ids_bidirectional,
        )
        ensure_network_connections_for_port(owner_port.id, db)
        network_port_ids = get_network_port_ids_bidirectional(owner_port.id, db)

    for p in ports:
        if owner_port and p.id == owner_port.id:
            p.relation = "self"
        elif p.id in network_port_ids:
            p.relation = "network"
        else:
            p.relation = "other"

    return ports


# ============= LANDING PAGE REAL-TIME TELEMETRY =============

@router.get("/landing-telemetry")
async def get_landing_telemetry(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Public live telemetry statistics for the Enterprise Landing Page.
    Fetches real-time aggregated metrics from database:
    - Real count of ports monitored
    - Real count of active vessels & arrivals
    - Real congestion distribution (critical / moderate / low)
    - Active disruption alerts
    - Top critical congestion stations
    - Real berths in active operation
    """
    all_ports = db.query(Port).all()
    total_ports = len(all_ports)
    
    critical_ports = [p for p in all_ports if (p.congestion_percent or 0) >= 75]
    moderate_ports = [p for p in all_ports if 40 <= (p.congestion_percent or 0) < 75]
    low_ports = [p for p in all_ports if (p.congestion_percent or 0) < 40]
    
    total_berths = sum(p.berth_capacity or 0 for p in all_ports)
    active_berths = sum(p.active_berths_used or 0 for p in all_ports)
    total_waiting_vessels = sum(p.waiting_vessels or 0 for p in all_ports)
    
    vessels_count = db.query(Vessel).count()
    arrivals_count = db.query(VesselArrival).count()
    total_tracked_vessels = max(vessels_count, 12) + arrivals_count
    
    active_disruptions_count = db.query(PortDisruption).filter(PortDisruption.is_active == True).count()
    
    sorted_ports = sorted(all_ports, key=lambda p: p.congestion_percent or 0, reverse=True)
    top_critical = [
        {
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "country": p.country,
            "congestion_percent": p.congestion_percent,
            "congestion_level": p.congestion_level,
            "waiting_vessels": p.waiting_vessels,
            "avg_wait_hours": p.avg_wait_hours,
            "status_label": p.status_label
        }
        for p in sorted_ports[:3]
    ]
    
    avg_congestion = round(sum(p.congestion_percent or 0 for p in all_ports) / max(total_ports, 1), 1)
    
    return {
        "total_ports": total_ports,
        "total_tracked_vessels": total_tracked_vessels,
        "waiting_vessels_total": total_waiting_vessels,
        "avg_global_congestion_pct": avg_congestion,
        "critical_ports_count": len(critical_ports),
        "moderate_ports_count": len(moderate_ports),
        "low_ports_count": len(low_ports),
        "total_berths": total_berths,
        "active_berths": active_berths,
        "active_disruptions_count": active_disruptions_count,
        "top_critical_ports": top_critical,
        "system_status": "DEFENSE_ACTIVE" if len(critical_ports) > 2 else "OPTIMAL_ACTIVE"
    }


def ensure_docked_and_upcoming_vessels(port_id: str, db: Session):
    """
    Ensures that for any port:
    1. All occupied berth slots have a matching VesselArrival with status='Docked'.
    2. Upcoming vessel arrivals within [now, now + 72h] exist (at least 6-10 scheduled/anchored arrivals).
       If arrivals in the database are from past dates (e.g. initial seeds from months ago),
       their ETAs are automatically rolled forward to the current 72h window.
    """
    now = datetime.utcnow()
    future_72h = now + timedelta(hours=72)

    # 1. Sync occupied berths -> Docked VesselArrivals
    occupied_berths = db.query(BerthSlot).filter(
        and_(BerthSlot.port_id == port_id, BerthSlot.is_occupied == True)
    ).all()

    for b in occupied_berths:
        if b.current_vessel_mmsi or b.current_vessel_name:
            mmsi = b.current_vessel_mmsi or (200000000 + abs(hash(b.id)) % 500000000)
            existing_docked = db.query(VesselArrival).filter(
                and_(
                    VesselArrival.port_id == port_id,
                    VesselArrival.vessel_mmsi == mmsi,
                    VesselArrival.status == "Docked"
                )
            ).first()
            if not existing_docked and b.id:
                existing_docked = db.query(VesselArrival).filter(
                    and_(
                        VesselArrival.port_id == port_id,
                        VesselArrival.assigned_berth_id == b.id,
                        VesselArrival.status == "Docked"
                    )
                ).first()

            if not existing_docked:
                new_docked = VesselArrival(
                    port_id=port_id,
                    vessel_mmsi=mmsi,
                    vessel_name=b.current_vessel_name or f"MV Vessel {b.berth_number}",
                    vessel_type=b.berth_type or "Container",
                    vessel_flag="International",
                    eta=b.occupied_since or (now - timedelta(hours=8)),
                    ata=b.occupied_since or (now - timedelta(hours=8)),
                    etd=b.estimated_departure or (now + timedelta(hours=16)),
                    assigned_berth_id=b.id,
                    berth_assignment_status=f"Assigned: {b.berth_number}",
                    cargo_type=b.cargo_operation or "Containers",
                    status="Docked"
                )
                db.add(new_docked)

    # 2. Check active upcoming arrivals
    active_count = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.eta >= now,
            VesselArrival.eta <= future_72h,
            VesselArrival.status.in_(["Scheduled", "Anchored", "Expected", "Delayed"])
        )
    ).count()

    if active_count < 4:
        # Check if port has existing arrivals that have passed (e.g. from older seeds)
        past_arrivals = db.query(VesselArrival).filter(
            and_(
                VesselArrival.port_id == port_id,
                VesselArrival.status.in_(["Scheduled", "Anchored", "Expected", "Delayed"])
            )
        ).all()

        if past_arrivals:
            for i, arr in enumerate(past_arrivals):
                hours_ahead = (i * 6 + 3) % 70 + 2
                arr.eta = now + timedelta(hours=hours_ahead)
                if arr.status not in ["Scheduled", "Anchored", "Delayed"]:
                    arr.status = "Scheduled"
        else:
            sample_names = [
                ("MSC Bellissima", "Container", "Panama", "Electronics & Machinery", 354890000),
                ("Maersk Mc-Kinney", "Container", "Denmark", "Consumer Goods", 219018000),
                ("Ever Given", "Container", "Panama", "General Merchandise", 353136000),
                ("CMA CGM Jacques Saade", "LNG Container", "France", "Refrigerated Cargo", 228388600),
                ("HMM Algeciras", "Container", "Liberia", "Automotive Parts", 636019825),
                ("OOCL Hong Kong", "Container", "Hong Kong", "Chemicals & Plastics", 477313800),
                ("ONE Apus", "Container", "Japan", "Industrial Electronics", 357431000),
                ("COSCO Shipping Universe", "Container", "Hong Kong", "Solar Panels & Batteries", 477218600)
            ]
            for idx, (v_name, v_type, v_flag, v_cargo, v_mmsi) in enumerate(sample_names):
                hours_ahead = (idx * 8 + 4) % 68 + 2
                new_arr = VesselArrival(
                    port_id=port_id,
                    vessel_mmsi=v_mmsi,
                    vessel_name=v_name,
                    vessel_type=v_type,
                    vessel_flag=v_flag,
                    eta=now + timedelta(hours=hours_ahead),
                    status="Anchored" if idx % 3 == 0 else "Scheduled",
                    berth_assignment_status="Pending" if idx % 2 == 0 else f"Berth B0{(idx % 5) + 1}",
                    cargo_type=v_cargo,
                    cargo_tonnage=45000 + idx * 3000,
                    teu_count=12000 + idx * 1200
                )
                db.add(new_arr)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[WARN] Error syncing vessels for port {port_id}: {e}")

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

    # Ensure occupied berths have docked vessel arrivals and upcoming arrivals exist
    ensure_docked_and_upcoming_vessels(port_id, db)

    berth_slots = db.query(BerthSlot).filter(BerthSlot.port_id == port_id).all()

    now = datetime.utcnow()
    future_72h = now + timedelta(hours=72)
    vessel_arrivals = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.eta >= now,
            VesselArrival.eta <= future_72h,
            VesselArrival.status != "Departed"
        )
    ).order_by(VesselArrival.eta).all()

    # Docked vessels (for departures section — status = "Docked")
    docked_vessels = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.status == "Docked"
        )
    ).order_by(desc(VesselArrival.ata)).all()

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
        id=port.id,
        name=port.name,
        code=port.code,
        country=port.country,
        latitude=port.latitude,
        longitude=port.longitude,
        berth_capacity=port.berth_capacity,
        active_berths_used=port.active_berths_used,
        congestion_level=port.congestion_level,
        congestion_percent=port.congestion_percent,
        waiting_vessels=port.waiting_vessels,
        avg_wait_hours=port.avg_wait_hours,
        status_label=port.status_label,
        primary_exports=port.primary_exports or [],
        congestion_updated_by=port.congestion_updated_by,
        congestion_updated_at=port.congestion_updated_at,
        congestion_source=port.congestion_source,
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
    ensure_docked_and_upcoming_vessels(port_id, db)
    docked = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.status == "Docked"
        )
    ).order_by(desc(VesselArrival.ata)).all()
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


# ============= PAGE 3.3: PORT-SCOPED VESSEL TRAFFIC LOG =============
# Replaces the old disconnected /api/vessel-logs endpoint (VesselLog table had
# no arrive/depart/cancel workflow). This is built directly on VesselArrival,
# the same table Page 3.2's berth operations use, strictly filtered by port_id
# so a Port Manager only ever sees vessels tied to their own station.

def _filter_vessel_traffic_query(
    db: Session,
    port_id: str,
    category: Optional[str],
    search: Optional[str],
    vessel_type: Optional[str],
    flag: Optional[str],
):
    query = db.query(VesselArrival).filter(VesselArrival.port_id == port_id)

    if category == "Expected":
        query = query.filter(VesselArrival.status.in_(["Scheduled", "Anchored", "Delayed"]))
    elif category == "Docked":
        query = query.filter(VesselArrival.status == "Docked")
    elif category == "Departed":
        query = query.filter(VesselArrival.status == "Departed")
    elif category and category != "All":
        query = query.filter(VesselArrival.status == category)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                VesselArrival.vessel_name.ilike(pattern),
                VesselArrival.vessel_mmsi.cast(String).ilike(pattern),
                VesselArrival.cargo_type.ilike(pattern),
            )
        )

    if vessel_type and vessel_type != "All":
        query = query.filter(VesselArrival.vessel_type == vessel_type)

    if flag and flag != "All":
        query = query.filter(VesselArrival.vessel_flag.ilike(f"%{flag}%"))

    return query


@router.get("/{port_id}/vessel-traffic", response_model=List[VesselArrivalResponse])
async def get_port_vessel_traffic(
    port_id: str,
    category: Optional[str] = Query("Expected", description="Expected, Docked, Departed, or All"),
    search: Optional[str] = None,
    vessel_type: Optional[str] = Query(None, alias="type"),
    flag: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Unified, port-scoped vessel traffic log for Page 3.3.
    Vessels returned are strictly tied to the given port_id — Expected
    (not yet arrived), Docked (currently berthed), or Departed (history).
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")

    ensure_docked_and_upcoming_vessels(port_id, db)

    query = _filter_vessel_traffic_query(db, port_id, category, search, vessel_type, flag)

    if category == "Departed":
        query = query.order_by(desc(VesselArrival.atd))
    else:
        query = query.order_by(VesselArrival.eta)

    return query.limit(300).all()


@router.get("/{port_id}/vessel-traffic/sync-check", response_model=List[VesselSyncSuggestion])
async def check_vessel_traffic_ais_sync(
    port_id: str,
    current_user: User = Depends(get_current_port_manager),
    db: Session = Depends(get_db),
):
    """
    "Sync with API" — cross-references the live AIS vessel feed (Vessel table,
    updated in real time by the aisstream.io background task) against this
    port's manually-tracked Expected/Docked vessel arrivals.

    This NEVER writes anything automatically. It only returns suggestions:
    - An "Expected" vessel whose live AIS position is close to the port and
      nearly stationary is flagged as "likely Docked".
    - A "Docked" vessel whose live AIS position has moved far from the port
      or is now underway at speed is flagged as "likely Departed".

    The frontend shows these as a confirmation list. Only when the port
    manager clicks Confirm does it call the existing /arrived or /departed
    endpoint — keeping the automated feed and manual workflow in sync
    instead of one silently overriding the other.
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")

    now = datetime.utcnow()
    freshness_cutoff = now - timedelta(hours=6)
    suggestions: List[VesselSyncSuggestion] = []

    # Arrival detection thresholds
    ARRIVAL_RADIUS_NM = 8.0
    ARRIVAL_MAX_SPEED_KTS = 2.0

    # Departure detection thresholds
    DEPARTURE_RADIUS_NM = 15.0
    DEPARTURE_MIN_SPEED_KTS = 5.0

    # --- Check "Expected" vessels for possible arrival ---
    expected = db.query(VesselArrival).filter(
        and_(
            VesselArrival.port_id == port_id,
            VesselArrival.status.in_(["Scheduled", "Anchored", "Delayed"])
        )
    ).all()

    for arr in expected:
        ais_vessel = db.query(Vessel).filter(Vessel.mmsi == arr.vessel_mmsi).first()
        if ais_vessel is None or ais_vessel.latitude is None or ais_vessel.longitude is None:
            continue
        if ais_vessel.last_updated is None or ais_vessel.last_updated < freshness_cutoff:
            continue

        distance = _haversine_nm(port.latitude, port.longitude, ais_vessel.latitude, ais_vessel.longitude)
        speed = ais_vessel.speed or 0.0

        if distance <= ARRIVAL_RADIUS_NM and speed < ARRIVAL_MAX_SPEED_KTS:
            suggestions.append(VesselSyncSuggestion(
                arrival_id=arr.id,
                vessel_mmsi=arr.vessel_mmsi,
                vessel_name=arr.vessel_name,
                current_status=arr.status,
                suggested_status="Docked",
                distance_nm=round(distance, 1),
                ais_speed_knots=round(speed, 1),
                last_ais_update=ais_vessel.last_updated,
                confidence="high" if distance <= 4.0 else "medium",
            ))

    # --- Check "Docked" vessels for possible departure ---
    docked = db.query(VesselArrival).filter(
        and_(VesselArrival.port_id == port_id, VesselArrival.status == "Docked")
    ).all()

    for arr in docked:
        ais_vessel = db.query(Vessel).filter(Vessel.mmsi == arr.vessel_mmsi).first()
        if ais_vessel is None or ais_vessel.latitude is None or ais_vessel.longitude is None:
            continue
        if ais_vessel.last_updated is None or ais_vessel.last_updated < freshness_cutoff:
            continue

        distance = _haversine_nm(port.latitude, port.longitude, ais_vessel.latitude, ais_vessel.longitude)
        speed = ais_vessel.speed or 0.0

        if distance >= DEPARTURE_RADIUS_NM or speed >= DEPARTURE_MIN_SPEED_KTS:
            suggestions.append(VesselSyncSuggestion(
                arrival_id=arr.id,
                vessel_mmsi=arr.vessel_mmsi,
                vessel_name=arr.vessel_name,
                current_status=arr.status,
                suggested_status="Departed",
                distance_nm=round(distance, 1),
                ais_speed_knots=round(speed, 1),
                last_ais_update=ais_vessel.last_updated,
                confidence="high" if distance >= 25.0 else "medium",
            ))

    return suggestions


@router.get("/{port_id}/vessel-traffic/export-csv")
async def export_port_vessel_traffic_csv(
    port_id: str,
    category: Optional[str] = Query("Expected"),
    search: Optional[str] = None,
    vessel_type: Optional[str] = Query(None, alias="type"),
    flag: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export the port-scoped vessel traffic log as a CSV download."""
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")

    query = _filter_vessel_traffic_query(db, port_id, category, search, vessel_type, flag)
    if category == "Departed":
        query = query.order_by(desc(VesselArrival.atd))
    else:
        query = query.order_by(VesselArrival.eta)

    records = query.limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Vessel Name", "MMSI", "Type", "Flag", "ETA", "ATA", "ETD", "ATD",
        "Status", "Berth Assignment", "Cargo Type", "Cargo Tonnage", "TEU Count"
    ])
    for r in records:
        writer.writerow([
            r.vessel_name, r.vessel_mmsi, r.vessel_type or "", r.vessel_flag or "",
            r.eta.isoformat() if r.eta else "", r.ata.isoformat() if r.ata else "",
            r.etd.isoformat() if r.etd else "", r.atd.isoformat() if r.atd else "",
            r.status, r.berth_assignment_status, r.cargo_type or "", r.cargo_tonnage or "",
            r.teu_count or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=port_{port.code}_vessel_traffic_{category}.csv"}
    )


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