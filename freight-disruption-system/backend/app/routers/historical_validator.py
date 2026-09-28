# backend/app/routers/historical_validator.py
"""
Historical Validator Router
Validates Monte Carlo system against 10 real-world scenarios
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.historical_scenarios import (
    HistoricalScenario,
    HistoricalIndustryData,
    HistoricalMCResult
)
from app.schemas.historical_validator import (
    HistoricalScenarioSchema,
    IndustryBenchmarkSchema,
    MCComparisonResultSchema,
    ScenarioComparisonSchema,
    HistoricalSummarySchema
)
from app.services.historical_validator_service import HistoricalValidatorService
from app.core.security import get_current_user
from app.models.users import User

router = APIRouter(prefix="/api/simulator/historical", tags=["Historical Validator"])


@router.get("/scenarios", response_model=List[HistoricalScenarioSchema])
def get_historical_scenarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all 10 historical disruption scenarios"""
    
    scenarios = db.query(HistoricalScenario).order_by(
        HistoricalScenario.event_start_date.desc()
    ).all()
    
    # Seed if empty
    if not scenarios:
        validator_service = HistoricalValidatorService(db)
        validator_service.seed_historical_scenarios()
        validator_service.seed_industry_benchmarks()
        scenarios = db.query(HistoricalScenario).all()
    
    return [
        HistoricalScenarioSchema(
            id=s.id,
            scenario_name=s.scenario_name,
            scenario_short_code=s.scenario_short_code,
            event_type=s.event_type,
            location=s.location,
            affected_region=s.affected_region,
            event_start_date=s.event_start_date,
            event_end_date=s.event_end_date,
            duration_days=s.duration_days,
            vessels_affected=s.vessels_affected,
            global_trade_impact_usd=s.global_trade_impact_usd,
            avg_delay_days=s.avg_delay_days,
            description=s.description,
            is_verified=s.is_verified
        )
        for s in scenarios
    ]


@router.get("/{scenario_id}/compare", response_model=ScenarioComparisonSchema)
def compare_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare industry benchmark vs MC optimization for a specific scenario"""
    
    validator_service = HistoricalValidatorService(db)
    
    # Check if MC result already exists
    existing_result = db.query(HistoricalMCResult).filter(
        HistoricalMCResult.scenario_id == scenario_id
    ).first()
    
    if not existing_result:
        # Run MC validation
        result = validator_service.run_mc_validation(scenario_id)
    else:
        # Use existing result
        scenario = db.query(HistoricalScenario).filter(
            HistoricalScenario.id == scenario_id
        ).first()
        industry_data = db.query(HistoricalIndustryData).filter(
            HistoricalIndustryData.scenario_id == scenario_id
        ).first()
        result = {
            "scenario": scenario,
            "industry_benchmark": industry_data,
            "mc_result": existing_result
        }
    
    return ScenarioComparisonSchema(
        scenario=HistoricalScenarioSchema(
            id=result["scenario"].id,
            scenario_name=result["scenario"].scenario_name,
            scenario_short_code=result["scenario"].scenario_short_code,
            event_type=result["scenario"].event_type,
            location=result["scenario"].location,
            affected_region=result["scenario"].affected_region,
            event_start_date=result["scenario"].event_start_date,
            event_end_date=result["scenario"].event_end_date,
            duration_days=result["scenario"].duration_days,
            vessels_affected=result["scenario"].vessels_affected,
            global_trade_impact_usd=result["scenario"].global_trade_impact_usd,
            avg_delay_days=result["scenario"].avg_delay_days,
            description=result["scenario"].description,
            is_verified=result["scenario"].is_verified
        ),
        industry_benchmark=IndustryBenchmarkSchema(
            origin_port=result["industry_benchmark"].origin_port,
            destination_port=result["industry_benchmark"].destination_port,
            typical_route=result["industry_benchmark"].typical_route,
            industry_total_cost_usd=result["industry_benchmark"].industry_total_cost_usd,
            industry_total_time_days=result["industry_benchmark"].industry_total_time_days,
            industry_delay_days=result["industry_benchmark"].industry_delay_days,
            data_source=result["industry_benchmark"].data_source,
            confidence_level=result["industry_benchmark"].confidence_level
        ),
        mc_result=MCComparisonResultSchema(
            mc_route_name=result["mc_result"].mc_route_name,
            mc_total_cost_usd=result["mc_result"].mc_total_cost_usd,
            mc_total_time_days=result["mc_result"].mc_total_time_days,
            mc_co2_tons=result["mc_result"].mc_co2_tons,
            cost_savings_usd=result["mc_result"].cost_savings_usd,
            cost_savings_percent=result["mc_result"].cost_savings_percent,
            time_savings_days=result["mc_result"].time_savings_days,
            time_savings_percent=result["mc_result"].time_savings_percent,
            accuracy_verdict=result["mc_result"].accuracy_verdict,
            confidence_score=result["mc_result"].confidence_score
        )
    )


@router.get("/summary", response_model=HistoricalSummarySchema)
def get_validation_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall validation summary across all 10 scenarios"""
    
    # Get all scenarios
    scenarios = db.query(HistoricalScenario).all()
    
    # Ensure all scenarios have MC results
    validator_service = HistoricalValidatorService(db)
    for scenario in scenarios:
        existing = db.query(HistoricalMCResult).filter(
            HistoricalMCResult.scenario_id == scenario.id
        ).first()
        if not existing:
            validator_service.run_mc_validation(scenario.id)
    
    # Get all MC results
    mc_results = db.query(HistoricalMCResult).all()
    
    total_scenarios = len(mc_results)
    scenarios_better = len([r for r in mc_results if r.accuracy_verdict == "Better"])
    scenarios_worse = len([r for r in mc_results if r.accuracy_verdict == "Worse"])
    scenarios_equivalent = len([r for r in mc_results if r.accuracy_verdict == "Equivalent"])
    
    avg_cost_savings_pct = sum([r.cost_savings_percent for r in mc_results]) / max(total_scenarios, 1)
    avg_time_savings_pct = sum([r.time_savings_percent for r in mc_results]) / max(total_scenarios, 1)
    
    total_cost_saved = sum([r.cost_savings_usd for r in mc_results])
    total_time_saved = sum([r.time_savings_days for r in mc_results])
    
    accuracy_rate = (scenarios_better / max(total_scenarios, 1)) * 100
    
    return HistoricalSummarySchema(
        total_scenarios=total_scenarios,
        scenarios_better=scenarios_better,
        scenarios_worse=scenarios_worse,
        scenarios_equivalent=scenarios_equivalent,
        avg_cost_savings_percent=round(avg_cost_savings_pct, 2),
        avg_time_savings_percent=round(avg_time_savings_pct, 2),
        total_cost_saved_usd=round(total_cost_saved, 2),
        total_time_saved_days=round(total_time_saved, 2),
        accuracy_rate=round(accuracy_rate, 1)
    )


@router.post("/seed")
def seed_historical_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger seeding of 10 historical scenarios (admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can seed historical data"
        )
    
    validator_service = HistoricalValidatorService(db)
    validator_service.seed_historical_scenarios()
    validator_service.seed_industry_benchmarks()
    
    return {
        "status": "success",
        "message": "10 historical scenarios and industry benchmarks seeded successfully"
    }


@router.post("/validate-all")
def validate_all_scenarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run MC validation against all 10 scenarios"""
    
    scenarios = db.query(HistoricalScenario).all()
    validator_service = HistoricalValidatorService(db)
    
    results = []
    for scenario in scenarios:
        try:
            result = validator_service.run_mc_validation(scenario.id)
            results.append({
                "scenario_id": scenario.id,
                "scenario_name": scenario.scenario_name,
                "status": "validated",
                "verdict": result["mc_result"].accuracy_verdict
            })
        except Exception as e:
            results.append({
                "scenario_id": scenario.id,
                "scenario_name": scenario.scenario_name,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "status": "complete",
        "validated_count": len([r for r in results if r["status"] == "validated"]),
        "results": results
    }