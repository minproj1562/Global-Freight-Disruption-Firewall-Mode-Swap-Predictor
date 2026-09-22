# backend/app/routers/active_routes.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import random

from app.database import get_db
from app.models.vessels import Vessel
from app.schemas.active_routes import ActiveRouteItem, ActiveRoutesStatsResponse

router = APIRouter(prefix="/api/routes", tags=["Active Fleet & Routes Monitor"])

PORTS_CATALOG = [
    ("Shanghai", "CNSHA", 31.2304, 121.4737),
    ("Rotterdam", "NLRTM", 51.9244, 4.4777),
    ("Singapore", "SGSIN", 1.3521, 103.8198),
    ("Los Angeles", "USLAX", 33.7432, -118.2673),
    ("Hamburg", "DEHAM", 53.5511, 9.9937),
    ("Antwerp", "BEANR", 51.2194, 4.4025),
    ("Dubai (Jebel Ali)", "AEJEA", 24.9857, 55.0273),
    ("Hong Kong", "HKHKG", 22.3193, 114.1694),
    ("Tokyo", "JPTYO", 35.6762, 139.6503),
    ("Busan", "KRPUS", 35.1796, 129.0756),
    ("Piraeus", "GRPIR", 37.9429, 23.6469),
    ("Valencia", "ESVLC", 39.4699, -0.3763),
    ("Panama (Colón)", "PACON", 9.3598, -79.9015),
    ("Santos", "BRSSZ", -23.9618, -46.3322),
    ("New York / NJ", "USNYC", 40.7128, -74.0060),
]

def _generate_synthetic_active_routes(db_vessels: list, count: int = 220) -> List[ActiveRouteItem]:
    routes = []
    
    for i in range(count):
        if i < len(db_vessels):
            v = db_vessels[i]
            v_id = v.id
            v_name = v.name
            v_mmsi = v.mmsi
            v_imo = v.imo or (9000000 + i)
            v_flag = v.flag or "Panama"
            v_type = v.vessel_type or "Container"
            cur_lat = v.latitude or (20.0 + (i % 30) - 15.0)
            cur_lon = v.longitude or (60.0 + (i % 80) - 40.0)
        else:
            v_id = f"vsl-fleet-{1000 + i}"
            v_name = f"MV {random.choice(['Ocean', 'Pacific', 'Atlantic', 'Global', 'Nordic', 'CMA CGM', 'Maersk', 'Ever', 'MSC', 'Hapag'])} {random.choice(['Pride', 'Titan', 'Star', 'Voyager', 'Pioneer', 'Express', 'Leader', 'Horizon', 'Glory', 'Mariner', 'Navigator'])} {i}"
            v_mmsi = 200000000 + i * 137
            v_imo = 9300000 + i * 43
            v_flag = random.choice(["Liberia", "Panama", "Marshall Islands", "Singapore", "Hong Kong", "Malta", "Bahamas"])
            v_type = random.choice(["Container", "Container", "Tanker", "Bulk Carrier", "Cargo"])
            cur_lat = round(random.uniform(-30.0, 55.0), 4)
            cur_lon = round(random.uniform(-140.0, 140.0), 4)

        orig = PORTS_CATALOG[i % len(PORTS_CATALOG)]
        dest = PORTS_CATALOG[(i + 3) % len(PORTS_CATALOG)]

        delay_prob = round(random.uniform(5.0, 95.0), 1)
        if delay_prob > 75:
            delay_hrs = round(random.uniform(36.0, 120.0), 1)
            risk_lvl = random.choice(["high", "critical"])
            status_val = random.choice(["Delayed", "Critical Hazard"])
            action_val = random.choice(["reroute", "wait"])
            risk_reason = "Operating near high-risk chokepoint / port congestion backlog"
        elif delay_prob > 40:
            delay_hrs = round(random.uniform(8.0, 32.0), 1)
            risk_lvl = "medium"
            status_val = random.choice(["Delayed", "Rerouted"])
            action_val = random.choice(["speed_up", "reroute"])
            risk_reason = "Moderate weather front & 18h arrival queue"
        else:
            delay_hrs = round(random.uniform(0.0, 6.0), 1)
            risk_lvl = "low"
            status_val = "On Schedule"
            action_val = "continue"
            risk_reason = "Nominal open-sea passage conditions"

        base_eta = datetime.utcnow() + timedelta(days=(i % 14) + 2, hours=(i * 3) % 24)
        ml_pred_eta = base_eta + timedelta(hours=delay_hrs)

        mode_val = "multimodal" if (i % 7 == 0) else ("rail" if (i % 15 == 0) else "sea")
        multimodal_list = ["sea", "rail"] if mode_val == "multimodal" else ["sea"]
        progress = round(random.uniform(15.0, 92.0), 1)
        dist_remain = round(random.uniform(200.0, 6500.0), 1)

        waypoints = [
            [orig[3], orig[2]],
            [round(cur_lon, 4), round(cur_lat, 4)],
            [dest[3], dest[2]]
        ]

        routes.append(ActiveRouteItem(
            id=f"route-act-{i+1}",
            vessel_id=v_id,
            vessel_name=v_name,
            vessel_mmsi=v_mmsi,
            vessel_imo=v_imo,
            vessel_flag=v_flag,
            vessel_type=v_type,
            origin_port_name=f"Port of {orig[0]}",
            origin_port_code=orig[1],
            destination_port_name=f"Port of {dest[0]}",
            destination_port_code=dest[1],
            current_location_name=f"At Sea ({round(cur_lat, 1)}°, {round(cur_lon, 1)}°)",
            current_coordinates=[round(cur_lon, 4), round(cur_lat, 4)],
            mode=mode_val,
            multimodal_modes=multimodal_list,
            eta=base_eta.strftime("%Y-%m-%d %H:%M UTC"),
            eta_predicted_ml=ml_pred_eta.strftime("%Y-%m-%d %H:%M UTC"),
            delay_hours=delay_hrs,
            delay_probability_pct=delay_prob,
            recommended_action=action_val,
            status=status_val,
            risk_level=risk_lvl,
            risk_reason=risk_reason,
            cargo_summary=f"{random.choice(['Electronics', 'Machinery', 'Auto Parts', 'Apparel', 'Refined Fuel', 'Grain', 'Chemicals'])} • {random.randint(500, 18000)} TEU",
            waypoints=waypoints,
            progress_percent=progress,
            avg_speed_knots=round(random.uniform(14.0, 22.5), 1),
            distance_remaining_nm=dist_remain,
        ))
        
    return routes

@router.get("/active", response_model=List[ActiveRouteItem])
def get_active_routes(
    vessel_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(250, ge=10, le=500),
    db: Session = Depends(get_db)
):
    db_vessels = db.query(Vessel).all()
    all_routes = _generate_synthetic_active_routes(db_vessels, count=limit)
    
    if vessel_type and vessel_type.lower() != "all":
        all_routes = [r for r in all_routes if r.vessel_type.lower() == vessel_type.lower()]
    if status_filter and status_filter.lower() != "all":
        all_routes = [r for r in all_routes if r.status.lower() == status_filter.lower()]
    if risk_level and risk_level.lower() != "all":
        all_routes = [r for r in all_routes if r.risk_level.lower() == risk_level.lower()]
        
    return all_routes

@router.get("/stats", response_model=ActiveRoutesStatsResponse)
def get_active_routes_stats(db: Session = Depends(get_db)):
    db_vessels = db.query(Vessel).all()
    routes = _generate_synthetic_active_routes(db_vessels, count=220)
    delayed = [r for r in routes if r.delay_hours > 0]
    critical = [r for r in routes if r.risk_level == "critical"]
    high = [r for r in routes if r.risk_level == "high"]
    avg_del = sum(r.delay_hours for r in routes) / len(routes) if routes else 0.0
    return ActiveRoutesStatsResponse(
        total_active_routes=len(routes),
        delayed_routes=len(delayed),
        critical_hazard_routes=len(critical),
        avg_delay_hours=round(avg_del, 1),
        high_risk_routes=len(high),
    )
