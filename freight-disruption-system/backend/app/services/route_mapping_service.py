#backend/app/services/route_mapping_service.py
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any
import json

from app.models.route_mapping import MonitoredRoute, RoutePortMapping
from app.models.users import LogisticsManager, User
from app.models.ports import Port
from app.models.vessels import Vessel
from app.services.redis_client import async_redis_client

CONGESTION_ALERT_CHANNEL = "congestion_alerts"


def get_affected_routes_for_port(port_id: str, db: Session) -> List[MonitoredRoute]:
    """
    Core query backing the propagation feature:
    'Which active routes touch this port?'
    """
    route_ids = [
        row.route_id for row in db.query(RoutePortMapping.route_id).filter(
            RoutePortMapping.port_id == port_id
        ).distinct().all()
    ]
    if not route_ids:
        return []

    return db.query(MonitoredRoute).filter(
        MonitoredRoute.id.in_(route_ids),
        MonitoredRoute.status == "active",
    ).all()


def build_congestion_alert_payload(port: Port, db: Session, updated_by: str = None) -> Dict[str, Any]:
    """
    Resolves affected routes -> logistics managers -> user_ids, and builds the
    alert payload published to Redis and pushed over /ws/alerts.
    """
    affected_routes = get_affected_routes_for_port(port.id, db)

    affected_route_summaries = []
    affected_user_ids = set()

    for route in affected_routes:
        lm = db.query(LogisticsManager).filter(LogisticsManager.id == route.logistics_manager_id).first()
        if not lm:
            continue
        affected_route_summaries.append({
            "route_id": route.id,
            "route_name": route.route_name,
            "logistics_manager_id": lm.id,
            "user_id": lm.user_id,
        })
        affected_user_ids.add(lm.user_id)

    return {
        "event_type": "PORT_CONGESTION_CHANGE",
        "port_id": port.id,
        "port_name": port.name,
        "port_code": port.code,
        "congestion_percent": port.congestion_percent,
        "congestion_level": port.congestion_level,
        "updated_by": updated_by,
        "affected_routes": affected_route_summaries,
        "affected_user_ids": list(affected_user_ids),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def publish_congestion_alert(port: Port, db: Session, updated_by: str = None):
    """
    Call this immediately after a port's congestion value changes in the DB.
    Publishes to Redis so ANY backend worker process (not just the one that
    handled this HTTP request) can broadcast it via CongestionAlertManager.
    """
    payload = build_congestion_alert_payload(port, db, updated_by)

    if not async_redis_client:
        print("[RouteMapping] Async Redis client unavailable, skipping alert publish")
        return payload

    try:
        await async_redis_client.publish(CONGESTION_ALERT_CHANNEL, json.dumps(payload))
    except Exception as e:
        print(f"[RouteMapping] Failed to publish congestion alert: {e}")

    return payload


def ensure_sample_monitored_routes(db: Session):
    """
    Seeds a handful of realistic MonitoredRoute + RoutePortMapping records,
    tied to the default demo Logistics Manager account
    (logistics@freightfirewall.com), so the propagation feature has real
    data to react to in demos.
    """
    if db.query(MonitoredRoute).first():
        return

    demo_lm = db.query(LogisticsManager).join(User).filter(
        User.email == "logistics@freightfirewall.com"
    ).first()
    if not demo_lm:
        print("[RouteMapping] Demo logistics manager not found, skipping route seeding")
        return

    def _port(code_or_id: str):
        return db.query(Port).filter(
            (Port.id == code_or_id) | (Port.code == code_or_id)
        ).first()

    sample_vessel = db.query(Vessel).first()

    route_defs = [
        {
            "route_name": "R-001: Shanghai \u2192 Singapore \u2192 Mumbai \u2192 Mundra",
            "ports": ["port-shanghai", "port-singapore", "port-mumbai", "port-mundra"],
        },
        {
            "route_name": "R-002: Rotterdam \u2192 Singapore \u2192 Colombo",
            "ports": ["port-rotterdam", "port-singapore", "port-colombo"],
        },
        {
            "route_name": "R-003: Jebel Ali \u2192 Mumbai \u2192 Mundra",
            "ports": ["port-dubai", "port-mumbai", "port-mundra"],
        },
    ]

    seeded = 0
    for route_def in route_defs:
        resolved_ports = [p for p in (_port(c) for c in route_def["ports"]) if p is not None]
        if len(resolved_ports) < 2:
            continue

        route = MonitoredRoute(
            route_name=route_def["route_name"],
            logistics_manager_id=demo_lm.id,
            vessel_id=sample_vessel.id if sample_vessel else None,
            origin_port_id=resolved_ports[0].id,
            destination_port_id=resolved_ports[-1].id,
            status="active",
        )
        db.add(route)
        db.flush()

        for idx, p in enumerate(resolved_ports):
            db.add(RoutePortMapping(route_id=route.id, port_id=p.id, sequence_order=idx))

        seeded += 1

    db.commit()
    print(f"[RouteMapping] Seeded {seeded} monitored routes with port mappings")