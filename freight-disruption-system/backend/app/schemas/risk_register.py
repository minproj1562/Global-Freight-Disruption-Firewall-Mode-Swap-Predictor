# backend/app/schemas/risk_register.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class KPISummarySchema(BaseModel):
    cost_saved_this_month_usd: float
    routes_rerouted_count: int
    avg_decision_time_minutes: float
    active_disruptions_count: int
    vessels_at_risk_count: int

class MonthlySavingsTrendSchema(BaseModel):
    month: str  # "Jan 2024"
    cost_saved_usd: float
    routes_rerouted: int

class DisruptionTypeBreakdownSchema(BaseModel):
    disruption_type: str
    count: int
    percentage: float

class RiskMatrixItemSchema(BaseModel):
    disruption_id: str
    disruption_name: str
    likelihood: int  # 1-5
    impact: int  # 1-5
    risk_score: int  # likelihood × impact
    financial_exposure_usd: float

class ExposureMapRegionSchema(BaseModel):
    region_name: str
    cargo_value_at_risk_usd: float
    active_routes_count: int

class TopRiskDisruptionSchema(BaseModel):
    disruption_id: str
    disruption_name: str
    severity: str
    financial_exposure_usd: float
    affected_vessels_count: int
    mitigation_status: str

class DecisionAuditItemSchema(BaseModel):
    decision_id: str
    timestamp: str
    user_name: str
    route_name: str
    alternatives_count: int
    rationale: str
    predicted_cost_usd: Optional[float] = None
    predicted_time_days: Optional[float] = None
    actual_cost_usd: Optional[float] = None
    actual_time_days: Optional[float] = None
    cost_variance_percent: Optional[float] = None
    decision_time_minutes: Optional[float] = None

class ROIDashboardSchema(BaseModel):
    month_cost_saved_usd: float
    month_cost_saved_crores: float  # 1 crore = 10 million
    month_time_saved_days: float
    ytd_cost_saved_usd: float
    ytd_cost_saved_crores: float
    ytd_time_saved_days: float
    ytd_routes_optimized: int
    ytd_carbon_reduced_tons: float
    system_effectiveness_percent: float
    summary_message: str

class ExportReportRequest(BaseModel):
    report_type: str  # "daily", "weekly", "monthly"
    include_charts: bool = True
    include_audit_trail: bool = True