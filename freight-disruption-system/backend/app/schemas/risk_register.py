# backend/app/schemas/risk_register.py
from pydantic import BaseModel
from typing import Optional, List

class ExecutiveKPISummary(BaseModel):
    cost_saved_this_month_usd: float
    routes_rerouted_count: int
    avg_decision_time_hours: float
    active_disruptions_count: int
    vessels_at_risk_count: int

class MonthlyCostSavingItem(BaseModel):
    month: str
    savings_usd: float
    reroutes_count: int

class DisruptionTypeBreakdownItem(BaseModel):
    category: str
    count: int
    percentage: float
    color: str

class RiskMatrixDisruptionPoint(BaseModel):
    id: str
    name: str
    likelihood: int  # 1 to 5
    impact: int      # 1 to 5
    severity: str    # low, medium, high, critical
    category: str
    affected_vessels_count: int

class RegionalExposureItem(BaseModel):
    id: str
    region_name: str
    cargo_value_at_risk_usd: float
    vessels_at_risk: int
    risk_level: str
    coordinates: List[float]

class TopDisruptionRiskItem(BaseModel):
    id: str
    name: str
    category: str
    severity: str
    cargo_value_at_risk_usd: float
    vessels_affected: int
    mitigation_status: str  # Mitigated, In Progress, Unaddressed
    mitigation_action: str

class RiskRegisterResponse(BaseModel):
    kpis: ExecutiveKPISummary
    monthly_savings_series: List[MonthlyCostSavingItem]
    disruption_breakdown: List[DisruptionTypeBreakdownItem]
    risk_matrix_points: List[RiskMatrixDisruptionPoint]
    regional_exposures: List[RegionalExposureItem]
    top_5_high_risk_disruptions: List[TopDisruptionRiskItem]
