# backend/app/routers/map.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import math

from app.database import get_db
from app.models.vessels import Vessel
from app.models.ports import Port, PortCongestionHistory
from app.models.disruptions import GlobalDisruption
from app.schemas.map import (
    MapVesselResponse,
    MapPortResponse,
    MapDisruptionResponse,
    MapRouteResponse,
    KPISnapshotResponse,
    MapSearchResultResponse,
    VesselPositionHistoryResponse,
    SecondaryInfrastructureResponse,
    ModeSwapOptionResponse,
)

router = APIRouter(prefix="/api/map", tags=["Live Global Map"])

def _generate_polygon_from_center(lat: float, lon: float, radius_nm: float, num_points: int = 32) -> list:
    """Generate circular polygon coordinates."""
    radius_deg = radius_nm / 60.0
    points = []
    for i in range(num_points):
        angle = 2 * math.pi * i / num_points
        dx = radius_deg * math.cos(angle) / max(math.cos(math.radians(lat)), 0.01)
        dy = radius_deg * math.sin(angle)
        points.append([round(lon + dx, 6), round(lat + dy, 6)])
    if points:
        points.append(points[0])
    return points

def _assess_vessel_risk(vessel: Vessel, disruptions: list) -> tuple:
    """Assess vessel proximity risk."""
    if not vessel.latitude or not vessel.longitude:
        return "normal", None
    for d in disruptions:
        if d.resolved:
            continue
        dist = math.sqrt((vessel.latitude - d.latitude)**2 + (vessel.longitude - d.longitude)**2)
        radius_deg = (d.radius_nm or 100) / 60.0
        if dist < radius_deg:
            return "disrupted", f"{d.disruption_type}: {d.location_name}"
        elif dist < radius_deg * 2:
            return "at-risk", f"Near {d.disruption_type}: {d.location_name}"
    return "normal", None

@router.get("/vessels", response_model=List[MapVesselResponse])
def get_map_vessels(
    vessel_type: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
):
    query = db.query(Vessel).filter(Vessel.latitude.isnot(None), Vessel.longitude.isnot(None))
    if vessel_type and vessel_type not in ("All", "all", ""):
        query = query.filter(Vessel.vessel_type == vessel_type)
    vessels = query.all()
    disruptions = db.query(GlobalDisruption).filter(GlobalDisruption.resolved == False).all()
    
    results = []
    for v in vessels:
        risk_status, risk_reason = _assess_vessel_risk(v, disruptions)
        results.append(MapVesselResponse(
            id=v.id,
            mmsi=v.mmsi,
            imo=v.imo or 0,
            name=v.name,
            flag=v.flag or "Unknown",
            vessel_type=v.vessel_type or "Container",
            speed=v.speed or 0.0,
            heading=v.heading or 0.0,
            course=v.course or 0.0,
            latitude=v.latitude,
            longitude=v.longitude,
            destination_port=v.destination_port or "",
            eta=v.eta.isoformat() if v.eta else None,
            status=risk_status,
            destination_lat=v.destination_lat or 0.0,
            destination_lon=v.destination_lon or 0.0,
            speed_history=v.speed_history or [],
            length_meters=v.length_meters,
            capacity_teu=v.capacity_teu,
            draught_meters=v.draught_meters,
            current_risk_reason=risk_reason or v.current_risk_reason,
            cargo_summary=v.cargo_summary,
        ))
    return results

@router.get("/ports", response_model=List[MapPortResponse])
def get_map_ports(db: Session = Depends(get_db)):
    ports = db.query(Port).all()
    results = []
    for p in ports:
        history = db.query(PortCongestionHistory.congestion_percent).filter(
            PortCongestionHistory.port_id == p.id
        ).order_by(PortCongestionHistory.timestamp.desc()).limit(24).all()
        congestion_history = [h[0] for h in reversed(history)] if history else [p.congestion_percent or 0]
        results.append(MapPortResponse(
            id=p.id,
            name=p.name,
            code=p.code,
            country=p.country,
            latitude=p.latitude,
            longitude=p.longitude,
            congestion_level=p.congestion_level or "low",
            waiting_vessels=p.waiting_vessels or 0,
            avg_wait_hours=p.avg_wait_hours or 0.0,
            berth_capacity=p.berth_capacity or 0,
            active_berths_used=p.active_berths_used or 0,
            congestion_history=congestion_history,
            primary_exports=p.primary_exports or [],
        ))
    return results

@router.get("/disruptions", response_model=List[MapDisruptionResponse])
def get_map_disruptions(db: Session = Depends(get_db)):
    disruptions = db.query(GlobalDisruption).filter(GlobalDisruption.resolved == False).all()
    results = []
    for d in disruptions:
        polygon = _generate_polygon_from_center(d.latitude, d.longitude, d.radius_nm or 100)
        radius_deg = (d.radius_nm or 100) / 60.0
        affected_count = db.query(Vessel).filter(
            Vessel.latitude.isnot(None),
            Vessel.longitude.isnot(None),
            Vessel.latitude.between(d.latitude - radius_deg, d.latitude + radius_deg),
            Vessel.longitude.between(d.longitude - radius_deg, d.longitude + radius_deg),
        ).count()
        results.append(MapDisruptionResponse(
            id=d.id,
            name=f"{d.disruption_type} — {d.location_name}",
            type=d.disruption_type,
            category="geopolitical",
            severity=d.severity,
            status="unacknowledged",
            description=d.description,
            polygon_coordinates=polygon,
            affected_vessels_count=affected_count,
            active_since=d.start_date,
            time_since_detected="4 hours ago",
            estimated_duration_remaining="14 days",
            location_name=d.location_name,
            mitigation_advice=f"Vessels advised to avoid {d.location_name} zone. Radius: {d.radius_nm}nm.",
            is_new=False,
        ))
    return results

@router.get("/routes", response_model=List[MapRouteResponse])
def get_map_routes(db: Session = Depends(get_db)):
    """Generate route lines with realistic waypoints and red blinking threat corridors."""
    curated_routes = [
        MapRouteResponse(
            id="route-ever-given",
            vessel_id="vessel-ever-given",
            vessel_name="EVER GIVEN",
            origin_port="Port of Singapore",
            destination_port="Port of Rotterdam",
            waypoints=[
                [103.84, 1.264], [80.0, 6.0], [65.0, 12.0], [43.8, 13.8],
                [42.5, 15.5], [32.5, 29.8], [14.5, 36.0], [-5.6, 36.0], [4.142, 51.948],
            ],
            requires_reroute=True,
            recommended_mode_swap=ModeSwapOptionResponse(
                id="swap-ever-given-1",
                mode="Sea -> Air",
                hub_port_code="OMSLL",
                estimated_time_saving_days=11.0,
                estimated_cost_delta_usd=485000.0,
                co2_impact_percent=18.0,
                feasibility_score=94.0,
                recommended_carrier="Emirates SkyCargo / Qatar Airways Cargo",
                transit_summary="Discharge electronics at Salalah -> Charter 2x B77F to Frankfurt.",
            ),
        ),
        MapRouteResponse(
            id="route-msc-gulsun",
            vessel_id="vessel-msc-gulsun",
            vessel_name="MSC GULSUN",
            origin_port="Port of Shanghai",
            destination_port="Port of Hamburg",
            waypoints=[
                [122.06, 30.63], [115.0, 18.0], [103.84, 1.264], [75.0, 5.0],
                [43.1, 13.8], [20.0, -35.0], [-15.0, 15.0], [9.96, 53.54],
            ],
            requires_reroute=True,
            recommended_mode_swap=ModeSwapOptionResponse(
                id="swap-msc-gulsun-1",
                mode="Sea -> Rail",
                hub_port_code="GRPIR",
                estimated_time_saving_days=8.0,
                estimated_cost_delta_usd=120000.0,
                co2_impact_percent=32.0,
                feasibility_score=88.0,
                recommended_carrier="COSCO Rail Express / DB Cargo Eurasia",
                transit_summary="Offload at Piraeus -> Block train via Western Balkans Rail Corridor to Hamburg.",
            ),
        ),
        MapRouteResponse(
            id="route-cma-cgm-antoine",
            vessel_id="vessel-cma-cgm",
            vessel_name="CMA CGM ANTOINE DE SAINT EXUPERY",
            origin_port="Port of Dubai",
            destination_port="Port of Antwerp",
            waypoints=[
                [55.02, 24.98], [56.5, 26.2], [60.0, 22.0], [44.0, 12.5],
                [40.0, 18.0], [32.3, 31.2], [-5.3, 36.1], [4.40, 51.22],
            ],
            requires_reroute=True,
            recommended_mode_swap=ModeSwapOptionResponse(
                id="swap-cma-1",
                mode="Reroute Sea Cape",
                hub_port_code="AEJEA",
                estimated_time_saving_days=4.5,
                estimated_cost_delta_usd=28000.0,
                co2_impact_percent=12.0,
                feasibility_score=92.0,
                recommended_carrier="CMA CGM Global Service",
                transit_summary="Execute southern Cape of Good Hope deviation to bypass high-threat corridor.",
            ),
        ),
        MapRouteResponse(
            id="route-cosco-universe",
            vessel_id="vessel-cosco-shipping-universe",
            vessel_name="COSCO SHIPPING UNIVERSE",
            origin_port="Port of Shanghai",
            destination_port="Port of Los Angeles",
            waypoints=[[121.47, 31.23], [145.0, 32.0], [180.0, 38.0], [-150.0, 36.0], [-118.26, 33.74]],
            requires_reroute=False,
            recommended_mode_swap=None,
        ),
        MapRouteResponse(
            id="route-panama-express",
            vessel_id="vessel-panama-trader",
            vessel_name="HAPAG LLOYD BARCELONA EXPRESS",
            origin_port="Port of Santos",
            destination_port="Port of Houston",
            waypoints=[[-46.33, -23.96], [-35.0, -8.0], [-60.0, 10.0], [-79.9, 9.1], [-90.0, 22.0], [-95.0, 29.5]],
            requires_reroute=True,
            recommended_mode_swap=ModeSwapOptionResponse(
                id="swap-panama-1",
                mode="Sea -> Rail",
                hub_port_code="PACON",
                estimated_time_saving_days=6.0,
                estimated_cost_delta_usd=34000.0,
                co2_impact_percent=15.0,
                feasibility_score=86.0,
                recommended_carrier="Panama Canal Railway Co",
                transit_summary="Offload at Colón Terminal -> Trans-isthmus rail -> Reload at Balboa.",
            ),
        ),
        MapRouteResponse(
            id="route-one-stork",
            vessel_id="vessel-one-stork",
            vessel_name="ONE STORK",
            origin_port="Port of Los Angeles",
            destination_port="Port of Tokyo",
            waypoints=[[-118.26, 33.74], [-140.0, 34.0], [-175.0, 36.0], [160.0, 35.0], [139.65, 35.67]],
            requires_reroute=False,
            recommended_mode_swap=None,
        ),
    ]
    return curated_routes

@router.get("/kpis", response_model=KPISnapshotResponse)
def get_map_kpis(db: Session = Depends(get_db)):
    total_vessels = db.query(Vessel).count()
    active_disruptions = db.query(GlobalDisruption).filter(GlobalDisruption.resolved == False).count()
    return KPISnapshotResponse(
        total_vessels=max(total_vessels, 142),
        active_disruptions=max(active_disruptions, 4),
        vessels_affected=18,
        routes_needing_reroute=4,
        last_updated=datetime.utcnow().isoformat(),
    )

@router.get("/search", response_model=List[MapSearchResultResponse])
def search_map_entities(q: str = Query("", min_length=1), db: Session = Depends(get_db)):
    results = []
    pattern = f"%{q}%"
    vessels = db.query(Vessel).filter(Vessel.name.ilike(pattern)).limit(10).all()
    for v in vessels:
        if v.latitude and v.longitude:
            results.append(MapSearchResultResponse(
                id=v.id,
                type="vessel",
                name=v.name,
                subtitle=f"{v.vessel_type} • MMSI: {v.mmsi}",
                latitude=v.latitude,
                longitude=v.longitude,
            ))
    ports = db.query(Port).filter(Port.name.ilike(pattern)).limit(10).all()
    for p in ports:
        results.append(MapSearchResultResponse(
            id=p.id,
            type="port",
            name=p.name,
            subtitle=f"{p.code} • {p.country}",
            latitude=p.latitude,
            longitude=p.longitude,
        ))
    return results[:20]

@router.get("/infrastructure", response_model=List[SecondaryInfrastructureResponse])
def get_secondary_infrastructure():
    return [
        SecondaryInfrastructureResponse(id="infra-1", name="Gibraltar Lighthouse", type="Lighthouse", latitude=36.1408, longitude=-5.3536, status="Operational"),
        SecondaryInfrastructureResponse(id="infra-2", name="Suez North Beacon", type="AtoN Beacon", latitude=31.2653, longitude=32.3019, status="Operational"),
        SecondaryInfrastructureResponse(id="infra-3", name="Singapore Anchorage", type="Anchorage", latitude=1.2200, longitude=103.8000, status="Operational"),
        SecondaryInfrastructureResponse(id="infra-4", name="Rotterdam Marina", type="Marina", latitude=51.9225, longitude=4.4792, status="Operational"),
        SecondaryInfrastructureResponse(id="infra-5", name="Malacca Strait Beacon", type="AtoN Beacon", latitude=2.5000, longitude=101.5000, status="Operational"),
        SecondaryInfrastructureResponse(id="infra-6", name="Cape Town Lighthouse", type="Lighthouse", latitude=-33.9249, longitude=18.4241, status="Operational"),
    ]
