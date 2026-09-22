# backend/app/routers/risk_register.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.risk_register import (
    RiskRegisterResponse,
    ExecutiveKPISummary,
    MonthlyCostSavingItem,
    DisruptionTypeBreakdownItem,
    RiskMatrixDisruptionPoint,
    RegionalExposureItem,
    TopDisruptionRiskItem,
)

router = APIRouter(prefix="/api/risk-register", tags=["Risk Register & Executive Summary"])

@router.get("/summary", response_model=RiskRegisterResponse)
def get_risk_register_summary(db: Session = Depends(get_db)):
    return RiskRegisterResponse(
        kpis=ExecutiveKPISummary(
            cost_saved_this_month_usd=4280000.0,
            routes_rerouted_count=84,
            avg_decision_time_hours=1.8,
            active_disruptions_count=6,
            vessels_at_risk_count=23,
        ),
        monthly_savings_series=[
            MonthlyCostSavingItem(month="Jan 2026", savings_usd=2850000.0, reroutes_count=42),
            MonthlyCostSavingItem(month="Feb 2026", savings_usd=3120000.0, reroutes_count=51),
            MonthlyCostSavingItem(month="Mar 2026", savings_usd=3490000.0, reroutes_count=58),
            MonthlyCostSavingItem(month="Apr 2026", savings_usd=3880000.0, reroutes_count=69),
            MonthlyCostSavingItem(month="May 2026", savings_usd=4150000.0, reroutes_count=78),
            MonthlyCostSavingItem(month="Jun 2026", savings_usd=4280000.0, reroutes_count=84),
        ],
        disruption_breakdown=[
            DisruptionTypeBreakdownItem(category="Geopolitical Conflict", count=14, percentage=41.2, color="#ef4444"),
            DisruptionTypeBreakdownItem(category="Canal / Chokepoints", count=9, percentage=26.5, color="#f59e0b"),
            DisruptionTypeBreakdownItem(category="Port Strikes & Labor", count=6, percentage=17.6, color="#8b5cf6"),
            DisruptionTypeBreakdownItem(category="Severe Weather Fronts", count=5, percentage=14.7, color="#06b6d4"),
        ],
        risk_matrix_points=[
            RiskMatrixDisruptionPoint(id="rm-1", name="Bab-el-Mandeb Red Sea Anti-Ship Threat", likelihood=5, impact=5, severity="critical", category="Geopolitical", affected_vessels_count=8),
            RiskMatrixDisruptionPoint(id="rm-2", name="Panama Canal Draft Restrictions (Gatun Lake)", likelihood=4, impact=4, severity="high", category="Canal", affected_vessels_count=5),
            RiskMatrixDisruptionPoint(id="rm-3", name="Strait of Hormuz Security Escalation", likelihood=4, impact=5, severity="critical", category="Geopolitical", affected_vessels_count=4),
            RiskMatrixDisruptionPoint(id="rm-4", name="US East Coast ILA Dockworker Strike Risk", likelihood=3, impact=4, severity="high", category="Labor", affected_vessels_count=6),
            RiskMatrixDisruptionPoint(id="rm-5", name="Typhoon Shanshan East China Sea Path", likelihood=3, impact=3, severity="medium", category="Weather", affected_vessels_count=3),
        ],
        regional_exposures=[
            RegionalExposureItem(id="reg-1", region_name="Red Sea / Gulf of Aden", cargo_value_at_risk_usd=342000000.0, vessels_at_risk=8, risk_level="critical", coordinates=[43.2, 13.8]),
            RegionalExposureItem(id="reg-2", region_name="Central America (Panama)", cargo_value_at_risk_usd=185000000.0, vessels_at_risk=5, risk_level="high", coordinates=[-79.7, 9.1]),
            RegionalExposureItem(id="reg-3", region_name="Persian Gulf / Hormuz", cargo_value_at_risk_usd=220000000.0, vessels_at_risk=4, risk_level="critical", coordinates=[56.5, 26.2]),
            RegionalExposureItem(id="reg-4", region_name="East Asia / Taiwan Strait", cargo_value_at_risk_usd=95000000.0, vessels_at_risk=3, risk_level="medium", coordinates=[121.5, 24.5]),
            RegionalExposureItem(id="reg-5", region_name="North Sea / English Channel", cargo_value_at_risk_usd=62000000.0, vessels_at_risk=3, risk_level="low", coordinates=[2.5, 51.5]),
        ],
        top_5_high_risk_disruptions=[
            TopDisruptionRiskItem(id="top-1", name="Red Sea & Bab-el-Mandeb Strait Exclusion Zone", category="Geopolitical", severity="critical", cargo_value_at_risk_usd=342000000.0, vessels_affected=8, mitigation_status="Mitigated", mitigation_action="Mandatory Cape of Good Hope reroute & Sea-Air bridge via Salalah"),
            TopDisruptionRiskItem(id="top-2", name="Panama Canal Low-Water Level Transit Restrictions", category="Canal", severity="high", cargo_value_at_risk_usd=185000000.0, vessels_affected=5, mitigation_status="In Progress", mitigation_action="Intermodal rail landbridge transfer via Balboa / Colón corridor"),
            TopDisruptionRiskItem(id="top-3", name="Strait of Hormuz Tanker Traffic Naval Threat", category="Geopolitical", severity="critical", cargo_value_at_risk_usd=220000000.0, vessels_affected=4, mitigation_status="In Progress", mitigation_action="Fujairah pipeline bypass & daylight-only naval escort convoys"),
            TopDisruptionRiskItem(id="top-4", name="US East Coast Master Contract Labor Expiration", category="Labor", severity="high", cargo_value_at_risk_usd=140000000.0, vessels_affected=6, mitigation_status="Unaddressed", mitigation_action="Pre-emptive cargo diversion to US West Coast ports via Panama/Intermodal"),
            TopDisruptionRiskItem(id="top-5", name="Typhoon Front Outer Bands — East China Sea", category="Weather", severity="medium", cargo_value_at_risk_usd=95000000.0, vessels_affected=3, mitigation_status="Mitigated", mitigation_action="Speed adjustment (+2.5 kts) to outrun storm eye prior to landfall"),
        ],
    )
