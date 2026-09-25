# backend/app/schemas/historical_validator.py
"""
Historical Validator Schemas
"""

from pydantic import BaseModel
from typing import List, Dict, Optional


class HistoricalScenarioSchema(BaseModel):
    id: str
    scenario_name: str
    scenario_short_code: str
    event_type: str
    location: str
    affected_region: str
    event_start_date: str
    event_end_date: str
    duration_days: int
    vessels_affected: int
    global_trade_impact_usd: float
    avg_delay_days: float
    description: str
    is_verified: bool


class IndustryBenchmarkSchema(BaseModel):
    origin_port: str
    destination_port: str
    typical_route: str
    industry_total_cost_usd: float
    industry_total_time_days: float
    industry_delay_days: float
    data_source: str
    confidence_level: str


class MCComparisonResultSchema(BaseModel):
    mc_route_name: str
    mc_total_cost_usd: float
    mc_total_time_days: float
    mc_co2_tons: float
    cost_savings_usd: float
    cost_savings_percent: float
    time_savings_days: float
    time_savings_percent: float
    accuracy_verdict: str
    confidence_score: float


class ScenarioComparisonSchema(BaseModel):
    scenario: HistoricalScenarioSchema
    industry_benchmark: IndustryBenchmarkSchema
    mc_result: MCComparisonResultSchema


class HistoricalSummarySchema(BaseModel):
    total_scenarios: int
    scenarios_better: int
    scenarios_worse: int
    scenarios_equivalent: int
    avg_cost_savings_percent: float
    avg_time_savings_percent: float
    total_cost_saved_usd: float
    total_time_saved_days: float
    accuracy_rate: float  # % scenarios where MC performed better