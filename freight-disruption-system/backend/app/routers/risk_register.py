# backend/app/routers/risk_register.py
"""
Risk Register & Executive Summary Dashboard
Provides KPIs, savings trends, risk matrix, decision audit trail, and ROI metrics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import random
import json
from app.database import get_db
from app.models.reroute import RerouteDecision
from app.models.disruptions import GlobalDisruption
from app.models.vessels import Vessel
from app.models.users import User
from app.schemas.risk_register import (
    KPISummarySchema,
    MonthlySavingsTrendSchema,
    DisruptionTypeBreakdownSchema,
    RiskMatrixItemSchema,
    ExposureMapRegionSchema,
    TopRiskDisruptionSchema,
    DecisionAuditItemSchema,
    ROIDashboardSchema,
    ExportReportRequest,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/api/exec", tags=["Risk Register & Executive Summary"])


@router.get("/kpis", response_model=KPISummarySchema)
def get_executive_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get top-level KPIs for executive dashboard (cached for 5 minutes)"""
    
    # Try to get from Redis cache
    try:
        from app.services.redis_client import redis_client
        
        if redis_client:
            cache_key = f"exec_kpis:{current_user.organization_id or 'global'}"
            cached_data = redis_client.get(cache_key)
            
            if cached_data:
                print("[Risk Register] Using cached KPIs from Redis")
                return KPISummarySchema(**json.loads(cached_data))
    except Exception as e:
        print(f"[Risk Register] Redis cache read failed: {e}")
    
    # Calculate KPIs (original logic)
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    cost_saved = db.query(func.sum(RerouteDecision.cost_saved_usd)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= month_start
        )
    ).scalar() or 0.0
    
    routes_rerouted = db.query(func.count(RerouteDecision.id)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= month_start
        )
    ).scalar() or 0
    
    decisions_with_time = db.query(RerouteDecision).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.alert_timestamp.isnot(None),
            RerouteDecision.decision_timestamp.isnot(None),
            RerouteDecision.decision_timestamp >= month_start
        )
    ).all()
    
    if decisions_with_time:
        total_minutes = sum([
            (d.decision_timestamp - d.alert_timestamp).total_seconds() / 60.0
            for d in decisions_with_time
        ])
        avg_decision_time = round(total_minutes / len(decisions_with_time), 1)
    else:
        avg_decision_time = 0.0
    
    active_disruptions = db.query(func.count(GlobalDisruption.id)).filter(
        GlobalDisruption.resolved == False
    ).scalar() or 0
    
    vessels_at_risk = db.query(func.count(Vessel.id)).filter(
        and_(
            Vessel.is_active == True,
            Vessel.current_risk_reason.isnot(None)
        )
    ).scalar() or 0
    
    kpi_data = KPISummarySchema(
        cost_saved_this_month_usd=round(cost_saved, 2),
        routes_rerouted_count=routes_rerouted,
        avg_decision_time_minutes=avg_decision_time,
        active_disruptions_count=active_disruptions,
        vessels_at_risk_count=vessels_at_risk
    )
    
    # Cache in Redis for 5 minutes
    try:
        from app.services.redis_client import redis_client
        
        if redis_client:
            cache_key = f"exec_kpis:{current_user.organization_id or 'global'}"
            redis_client.setex(cache_key, 300, json.dumps(kpi_data.dict()))  # 300 seconds = 5 minutes
            print("[Risk Register] KPIs cached in Redis (TTL: 5min)")
    except Exception as e:
        print(f"[Risk Register] Redis cache write failed: {e}")
    
    return kpi_data


@router.get("/savings-trend", response_model=List[MonthlySavingsTrendSchema])
def get_monthly_savings_trend(
    db: Session = Depends(get_db),
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user)
):
    """Get monthly cost savings trend for the past N months"""
    
    now = datetime.utcnow()
    trend_data = []
    
    for i in range(months):
        # Calculate start and end of each month
        month_offset = i
        target_date = now - timedelta(days=30 * month_offset)
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate next month start
        if month_start.month == 12:
            next_month_start = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month_start = month_start.replace(month=month_start.month + 1)
        
        # Query savings for this month
        cost_saved = db.query(func.sum(RerouteDecision.cost_saved_usd)).filter(
            and_(
                RerouteDecision.decision_confirmed == True,
                RerouteDecision.decision_timestamp >= month_start,
                RerouteDecision.decision_timestamp < next_month_start
            )
        ).scalar() or 0.0
        
        routes_count = db.query(func.count(RerouteDecision.id)).filter(
            and_(
                RerouteDecision.decision_confirmed == True,
                RerouteDecision.decision_timestamp >= month_start,
                RerouteDecision.decision_timestamp < next_month_start
            )
        ).scalar() or 0
        
        trend_data.append(MonthlySavingsTrendSchema(
            month=month_start.strftime('%b %Y'),
            cost_saved_usd=round(cost_saved, 2),
            routes_rerouted=routes_count
        ))
    
    # Reverse to show oldest to newest
    return list(reversed(trend_data))


@router.get("/disruption-breakdown", response_model=List[DisruptionTypeBreakdownSchema])
def get_disruption_type_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get breakdown of disruptions by type (for pie chart)"""
    
    # Query disruption types from decisions
    disruption_counts = db.query(
        GlobalDisruption.disruption_type,
        func.count(RerouteDecision.id).label('count')
    ).join(
        RerouteDecision,
        RerouteDecision.disruption_avoided_id == GlobalDisruption.id
    ).filter(
        RerouteDecision.decision_confirmed == True
    ).group_by(
        GlobalDisruption.disruption_type
    ).all()
    
    total_count = sum([row.count for row in disruption_counts]) or 1
    
    breakdown = []
    for row in disruption_counts:
        breakdown.append(DisruptionTypeBreakdownSchema(
            disruption_type=row.disruption_type,
            count=row.count,
            percentage=round((row.count / total_count) * 100, 1)
        ))
    
    # If no data, return mock data
    if not breakdown:
        breakdown = [
            DisruptionTypeBreakdownSchema(disruption_type="Geopolitical / Armed Activity", count=12, percentage=40.0),
            DisruptionTypeBreakdownSchema(disruption_type="Extreme Weather / Typhoon", count=8, percentage=26.7),
            DisruptionTypeBreakdownSchema(disruption_type="Port Strike & Labor Action", count=6, percentage=20.0),
            DisruptionTypeBreakdownSchema(disruption_type="Canal Congestion", count=4, percentage=13.3),
        ]
    
    return breakdown


@router.get("/risk-matrix", response_model=List[RiskMatrixItemSchema])
def get_risk_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get risk matrix data (Likelihood vs Impact scatter)"""
    
    active_disruptions = db.query(GlobalDisruption).filter(
        GlobalDisruption.resolved == False
    ).all()
    
    matrix_items = []
    
    severity_to_impact = {
        "critical": 5,
        "high": 4,
        "medium": 3,
        "low": 2
    }
    
    for disruption in active_disruptions:
        # Calculate likelihood based on affected vessels
        if disruption.affected_vessels_count > 20:
            likelihood = 5
        elif disruption.affected_vessels_count > 10:
            likelihood = 4
        elif disruption.affected_vessels_count > 5:
            likelihood = 3
        elif disruption.affected_vessels_count > 0:
            likelihood = 2
        else:
            likelihood = 1
        
        impact = severity_to_impact.get(disruption.severity.lower(), 3)
        
        # Calculate financial exposure (mock calculation)
        avg_cargo_value = 42000000.0  # $42M average
        financial_exposure = disruption.affected_vessels_count * avg_cargo_value * 0.05  # 5% risk
        
        matrix_items.append(RiskMatrixItemSchema(
            disruption_id=disruption.id,
            disruption_name=f"{disruption.disruption_type} — {disruption.location_name}",
            likelihood=likelihood,
            impact=impact,
            risk_score=likelihood * impact,
            financial_exposure_usd=round(financial_exposure, 2)
        ))
    
    # Add mock items if empty
    if not matrix_items:
        matrix_items = [
            RiskMatrixItemSchema(
                disruption_id="mock-1",
                disruption_name="Red Sea Armed Activity",
                likelihood=5,
                impact=5,
                risk_score=25,
                financial_exposure_usd=125000000.0
            ),
            RiskMatrixItemSchema(
                disruption_id="mock-2",
                disruption_name="Panama Canal Drought",
                likelihood=4,
                impact=4,
                risk_score=16,
                financial_exposure_usd=68000000.0
            ),
        ]
    
    return matrix_items


@router.get("/exposure-map", response_model=List[ExposureMapRegionSchema])
def get_exposure_map(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get cargo value at risk by region (for choropleth map)"""
    
    # Group decisions by corridor/region
    decisions = db.query(RerouteDecision).filter(
        RerouteDecision.decision_confirmed == True
    ).all()
    
    region_exposure = {}
    
    for decision in decisions:
        region = decision.corridor_name or "Global"
        if region not in region_exposure:
            region_exposure[region] = {
                "total_cargo_value": 0.0,
                "decisions_count": 0
            }
        
        region_exposure[region]["total_cargo_value"] += decision.cargo_value_usd or 0.0
        region_exposure[region]["decisions_count"] += 1
    
    exposure_items = []
    for region, data in region_exposure.items():
        exposure_items.append(ExposureMapRegionSchema(
            region_name=region,
            cargo_value_at_risk_usd=round(data["total_cargo_value"], 2),
            active_routes_count=data["decisions_count"]
        ))
    
    # Add mock data if empty
    if not exposure_items:
        exposure_items = [
            ExposureMapRegionSchema(region_name="Asia-Europe Corridor", cargo_value_at_risk_usd=425000000.0, active_routes_count=18),
            ExposureMapRegionSchema(region_name="Trans-Pacific Corridor", cargo_value_at_risk_usd=312000000.0, active_routes_count=14),
            ExposureMapRegionSchema(region_name="Trans-Atlantic Corridor", cargo_value_at_risk_usd=185000000.0, active_routes_count=9),
        ]
    
    return exposure_items


@router.get("/top-risks", response_model=List[TopRiskDisruptionSchema])
def get_top_risk_disruptions(
    db: Session = Depends(get_db),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user)
):
    """Get top 5 highest risk disruptions with mitigation status"""
    
    active_disruptions = db.query(GlobalDisruption).filter(
        GlobalDisruption.resolved == False
    ).order_by(
        GlobalDisruption.affected_vessels_count.desc()
    ).limit(limit).all()
    
    top_risks = []
    
    severity_to_impact = {
        "critical": 5,
        "high": 4,
        "medium": 3,
        "low": 2
    }
    
    for disruption in active_disruptions:
        # Calculate financial exposure
        avg_cargo_value = 42000000.0
        financial_exposure = disruption.affected_vessels_count * avg_cargo_value * 0.05
        
        # Count mitigation actions (reroute decisions)
        mitigation_count = db.query(func.count(RerouteDecision.id)).filter(
            and_(
                RerouteDecision.disruption_avoided_id == disruption.id,
                RerouteDecision.decision_confirmed == True
            )
        ).scalar() or 0
        
        if mitigation_count > 0:
            mitigation_status = f"{mitigation_count} vessel(s) successfully rerouted"
        else:
            mitigation_status = "No mitigation actions taken"
        
        top_risks.append(TopRiskDisruptionSchema(
            disruption_id=disruption.id,
            disruption_name=f"{disruption.disruption_type} — {disruption.location_name}",
            severity=disruption.severity,
            financial_exposure_usd=round(financial_exposure, 2),
            affected_vessels_count=disruption.affected_vessels_count,
            mitigation_status=mitigation_status
        ))
    
    return top_risks


@router.get("/decisions", response_model=List[DecisionAuditItemSchema])
def get_decision_audit_trail(
    db: Session = Depends(get_db),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user)
):
    """Get decision audit trail with filtering"""
    
    query = db.query(RerouteDecision).filter(
        RerouteDecision.decision_confirmed == True
    )
    
    # Apply date filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(RerouteDecision.decision_timestamp >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(RerouteDecision.decision_timestamp <= end_dt)
        except ValueError:
            pass
    
    decisions = query.order_by(RerouteDecision.decision_timestamp.desc()).limit(limit).all()
    
    audit_items = []
    
    for decision in decisions:
        # Fetch related entities
        user = db.query(User).filter(User.id == decision.user_id).first()
        
        # Calculate decision time
        decision_time = None
        if decision.alert_timestamp and decision.decision_timestamp:
            delta = decision.decision_timestamp - decision.alert_timestamp
            decision_time = round(delta.total_seconds() / 60.0, 1)
        
        # Calculate predicted vs actual variance
        predicted_cost = decision.predicted_cost_usd
        actual_cost = decision.actual_cost_usd
        cost_variance = None
        if predicted_cost and actual_cost:
            cost_variance = round(((actual_cost - predicted_cost) / predicted_cost) * 100, 1)
        
        audit_items.append(DecisionAuditItemSchema(
            decision_id=decision.id,
            timestamp=decision.decision_timestamp.isoformat() if decision.decision_timestamp else "",
            user_name=user.full_name if user else "Unknown",
            route_name=decision.selected_route_name,
            alternatives_count=len(decision.alternatives_considered) if decision.alternatives_considered else 0,
            rationale=decision.rationale or "",
            predicted_cost_usd=predicted_cost,
            predicted_time_days=decision.selected_time_days,
            actual_cost_usd=actual_cost,
            actual_time_days=(decision.actual_eta - decision.execution_started_at).days if (decision.actual_eta and decision.execution_started_at) else None,
            cost_variance_percent=cost_variance,
            decision_time_minutes=decision_time
        ))
    
    return audit_items


@router.get("/roi-dashboard", response_model=ROIDashboardSchema)
def get_roi_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive ROI metrics for executive presentation"""
    
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # This month
    month_cost_saved = db.query(func.sum(RerouteDecision.cost_saved_usd)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= month_start
        )
    ).scalar() or 0.0
    
    month_time_saved = db.query(func.sum(RerouteDecision.time_saved_days)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= month_start
        )
    ).scalar() or 0.0
    
    # Year to date
    ytd_cost_saved = db.query(func.sum(RerouteDecision.cost_saved_usd)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= year_start
        )
    ).scalar() or 0.0
    
    ytd_time_saved = db.query(func.sum(RerouteDecision.time_saved_days)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= year_start
        )
    ).scalar() or 0.0
    
    ytd_routes = db.query(func.count(RerouteDecision.id)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= year_start
        )
    ).scalar() or 0
    
    # Carbon reduction
    ytd_carbon_reduced = db.query(func.sum(RerouteDecision.carbon_reduced_tons)).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= year_start
        )
    ).scalar() or 0.0
    
    # Calculate system effectiveness (% of disruptions mitigated)
    total_disruptions = db.query(func.count(GlobalDisruption.id)).filter(
        GlobalDisruption.start_date >= year_start.strftime('%Y-%m-%d')
    ).scalar() or 1
    
    mitigated_disruptions = db.query(func.count(func.distinct(RerouteDecision.disruption_avoided_id))).filter(
        and_(
            RerouteDecision.decision_confirmed == True,
            RerouteDecision.decision_timestamp >= year_start
        )
    ).scalar() or 0
    
    system_effectiveness = round((mitigated_disruptions / total_disruptions) * 100, 1)
    
    # Convert to crores (1 crore = 10 million)
    month_crores = round(month_cost_saved / 10000000, 2)
    ytd_crores = round(ytd_cost_saved / 10000000, 2)
    
    return ROIDashboardSchema(
        month_cost_saved_usd=round(month_cost_saved, 2),
        month_cost_saved_crores=month_crores,
        month_time_saved_days=round(month_time_saved, 1),
        ytd_cost_saved_usd=round(ytd_cost_saved, 2),
        ytd_cost_saved_crores=ytd_crores,
        ytd_time_saved_days=round(ytd_time_saved, 1),
        ytd_routes_optimized=ytd_routes,
        ytd_carbon_reduced_tons=round(ytd_carbon_reduced, 1),
        system_effectiveness_percent=system_effectiveness,
        summary_message=f"This month, rerouting saved ₹{month_crores} crore and {round(month_time_saved, 1)} days"
    )


@router.post("/export")
async def export_executive_report(
    request: ExportReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export executive summary report as PDF with charts"""
    
    from app.services.executive_report_generator import ExecutiveReportGenerator
    
    try:
        # Gather all data for report
        kpis_data = get_executive_kpis(db, current_user).dict()
        savings_trend_data = get_monthly_savings_trend(db, 6, current_user)
        disruption_breakdown_data = get_disruption_type_breakdown(db, current_user)
        roi_data = get_roi_dashboard(db, current_user).dict()
        
        # Generate PDF
        report_generator = ExecutiveReportGenerator()
        pdf_path = report_generator.generate_report(
            report_type=request.report_type,
            kpis=kpis_data,
            savings_trend=[item.dict() for item in savings_trend_data],
            disruption_breakdown=[item.dict() for item in disruption_breakdown_data],
            roi_data=roi_data
        )
        
        return {
            "status": "success",
            "message": f"{request.report_type.capitalize()} report generated successfully",
            "download_url": f"/api/exec/download-report/{os.path.basename(pdf_path)}",
            "file_path": pdf_path,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/download-report/{filename}")
async def download_report(filename: str):
    """Download generated executive report PDF"""
    
    from fastapi.responses import FileResponse
    
    file_path = f"/tmp/executive_reports/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    return FileResponse(
        file_path,
        media_type='application/pdf',
        filename=filename
    )