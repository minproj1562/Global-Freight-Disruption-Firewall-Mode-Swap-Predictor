# backend/app/routers/disruptions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.disruptions import GlobalDisruption
from app.models.vessels import Vessel
from app.schemas.disruptions import (
    AlertCenterDisruptionItem,
    AffectedVesselItem,
    RecommendedRerouteOption,
    DisruptionActionResponse,
)

router = APIRouter(prefix="/api/disruptions", tags=["Disruption Alert Center"])

@router.get("/alert-center", response_model=List[AlertCenterDisruptionItem])
def get_alert_center_disruptions(db: Session = Depends(get_db)):
    disruptions = db.query(GlobalDisruption).filter(GlobalDisruption.resolved == False).all()
    
    curated = [
        AlertCenterDisruptionItem(
            id="disruption-red-sea-critical",
            name="Red Sea / Bab-el-Mandeb Hostile Action",
            type="Geopolitical",
            category="geopolitical",
            severity="critical",
            status="unacknowledged",
            location_name="Southern Red Sea / Gulf of Aden",
            latitude=13.8,
            longitude=43.2,
            radius_nm=180.0,
            polygon_coordinates=[[42.0, 12.0], [44.5, 12.0], [45.0, 15.0], [42.5, 15.5], [42.0, 12.0]],
            affected_vessels_count=8,
            affected_vessels_list=[
                AffectedVesselItem(id="v1", name="EVER GIVEN", mmsi=353136000, vessel_type="Container", flag="Panama", distance_to_epicenter_nm=32.0, status="At Risk", eta_impact_hours=144.0, destination_port="Port of Rotterdam"),
                AffectedVesselItem(id="v2", name="MSC GULSUN", mmsi=355940000, vessel_type="Container", flag="Panama", distance_to_epicenter_nm=58.0, status="At Risk", eta_impact_hours=120.0, destination_port="Port of Hamburg"),
            ],
            active_since="2026-08-01",
            time_since_detected="9 days ago",
            estimated_duration_remaining="21 days",
            description="Active anti-ship drone and missile hazard threatening commercial merchant vessels transiting Bab-el-Mandeb strait.",
            mitigation_advice="Divert via Cape of Good Hope (+9-12 days sea) or execute Sea-Air multimodal swap via Port of Salalah/Dubai.",
            recommended_action=RecommendedRerouteOption(
                id="rec-red-sea",
                title="Cape of Good Hope Deepsea Perimeter Bypass",
                mode="Sea (Cape)",
                estimated_delay_avoided_days=14.0,
                cost_delta_usd=28000.0,
                co2_reduction_percent=12.0,
                confidence_score=94.5,
                transit_summary="Execute immediate southern deviation south of Madagascar.",
                suggested_carrier="MSC / Maersk Alliance",
            ),
        ),
        AlertCenterDisruptionItem(
            id="disruption-panama-canal",
            name="Panama Canal Draft Restrictions & Drought Lock Dwell",
            type="Canal",
            category="canal",
            severity="high",
            status="acknowledged",
            location_name="Panama Canal (Gatun Lake)",
            latitude=9.1,
            longitude=-79.7,
            radius_nm=60.0,
            polygon_coordinates=[[-80.1, 8.8], [-79.4, 8.8], [-79.4, 9.4], [-80.1, 9.4], [-80.1, 8.8]],
            affected_vessels_count=5,
            affected_vessels_list=[
                AffectedVesselItem(id="v3", name="HAPAG LLOYD BARCELONA EXPRESS", mmsi=211281730, vessel_type="Container", flag="Germany", distance_to_epicenter_nm=18.0, status="Queued", eta_impact_hours=96.0, destination_port="Port of Houston"),
            ],
            active_since="2026-08-05",
            time_since_detected="5 days ago",
            estimated_duration_remaining="45 days",
            description="Severe freshwater depletion in Gatun Lake forcing daily transit quota reduction to 24 slots/day with maximum draft 44 feet.",
            mitigation_advice="Offload non-critical weight at Colón / Balboa or utilize Trans-Panama freight rail bridge.",
            recommended_action=RecommendedRerouteOption(
                id="rec-panama",
                title="Trans-Isthmus Intermodal Rail Swap",
                mode="Sea -> Rail",
                estimated_delay_avoided_days=7.5,
                cost_delta_usd=34000.0,
                co2_reduction_percent=18.0,
                confidence_score=89.0,
                transit_summary="Offload containers at Colón and reload at Balboa rail yard.",
                suggested_carrier="Panama Canal Railway Co",
            ),
        ),
        AlertCenterDisruptionItem(
            id="disruption-strait-of-hormuz",
            name="Strait of Hormuz Security Escalation Level 3",
            type="Geopolitical",
            category="geopolitical",
            severity="critical",
            status="unacknowledged",
            location_name="Strait of Hormuz / Gulf of Oman",
            latitude=26.2,
            longitude=56.5,
            radius_nm=90.0,
            polygon_coordinates=[[55.5, 25.5], [57.2, 25.5], [57.2, 26.8], [55.5, 26.8], [55.5, 25.5]],
            affected_vessels_count=4,
            affected_vessels_list=[],
            active_since="2026-08-08",
            time_since_detected="2 days ago",
            estimated_duration_remaining="10 days",
            description="Heightened electronic warfare, GPS spoofing, and naval boarding operations impacting Persian Gulf tanker traffic.",
            mitigation_advice="Transit only with coalition naval escorts during daylight hours or hold outside Gulf of Oman.",
            recommended_action=RecommendedRerouteOption(
                id="rec-hormuz",
                title="Fujairah Holding & Pipeline Offload",
                mode="Pipeline / Sea",
                estimated_delay_avoided_days=5.0,
                cost_delta_usd=42000.0,
                co2_reduction_percent=8.0,
                confidence_score=91.0,
                transit_summary="Discharge crude at Fujairah terminal bypassing strait transit entirely.",
                suggested_carrier="ADNOC Logistics",
            ),
        ),
    ]
    return curated

@router.patch("/{disruption_id}/acknowledge", response_model=DisruptionActionResponse)
def acknowledge_disruption(disruption_id: str, db: Session = Depends(get_db)):
    return DisruptionActionResponse(
        id=disruption_id,
        status="acknowledged",
        message="Disruption acknowledged by Operations Command.",
        updated_at=datetime.utcnow().isoformat(),
    )

@router.patch("/{disruption_id}/resolve", response_model=DisruptionActionResponse)
def resolve_disruption(disruption_id: str, db: Session = Depends(get_db)):
    return DisruptionActionResponse(
        id=disruption_id,
        status="resolved",
        message="Disruption marked as resolved. Normal maritime routing restored.",
        updated_at=datetime.utcnow().isoformat(),
    )
