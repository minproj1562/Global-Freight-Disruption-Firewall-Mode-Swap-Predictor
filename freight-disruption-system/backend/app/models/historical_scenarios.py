# backend/app/models/historical_scenarios.py    
"""
Historical Scenario Models
Stores real-world disruption scenarios for validation and benchmarking
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid


class HistoricalScenario(Base):
    """Real-world historical disruption scenarios"""
    __tablename__ = "historical_scenarios"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Scenario Metadata
    scenario_name = Column(String, nullable=False, unique=True, index=True)
    scenario_short_code = Column(String, nullable=False)  # SUEZ2021, BALTIMORE2024, etc.
    event_type = Column(String, nullable=False)  # Chokepoint Blockage, Port Strike, Natural Disaster, etc.
    
    # Geographic Data
    location = Column(String, nullable=False)
    affected_region = Column(String, nullable=False)  # Red Sea, Suez Canal, US East Coast, etc.
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Temporal Data
    event_start_date = Column(String, nullable=False)  # YYYY-MM-DD
    event_end_date = Column(String, nullable=False)
    duration_days = Column(Integer, nullable=False)
    
    # Impact Metrics
    vessels_affected = Column(Integer, default=0)
    global_trade_impact_usd = Column(Float, default=0.0)  # Estimated global impact
    avg_delay_days = Column(Float, default=0.0)  # Industry average delay
    
    # Description
    description = Column(Text, nullable=False)
    mitigation_actions = Column(Text)
    lessons_learned = Column(Text)
    
    # Validation Data Sources
    data_sources = Column(JSON, default=list)  # ["IMF PortWatch", "World Bank GSCSI", "Drewry WCI"]
    is_verified = Column(Boolean, default=True)  # Whether scenario has been fact-checked
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class HistoricalIndustryData(Base):
    """Industry benchmark data for historical scenarios"""
    __tablename__ = "historical_industry_data"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id = Column(String, nullable=False, index=True)  # FK to historical_scenarios
    
    # Route Details
    origin_port = Column(String, nullable=False)
    destination_port = Column(String, nullable=False)
    typical_route = Column(String, nullable=False)  # "Via Suez Canal", "Around Cape of Good Hope"
    
    # Industry Benchmark Costs (what shipping lines actually paid)
    industry_total_cost_usd = Column(Float, nullable=False)
    industry_bunker_cost_usd = Column(Float, default=0.0)
    industry_charter_cost_usd = Column(Float, default=0.0)
    industry_insurance_premium_usd = Column(Float, default=0.0)
    industry_delay_penalty_usd = Column(Float, default=0.0)
    
    # Industry Benchmark Time
    industry_total_time_days = Column(Float, nullable=False)
    industry_delay_days = Column(Float, default=0.0)
    
    # Industry Route Details
    industry_distance_nm = Column(Float, default=0.0)
    industry_co2_tons = Column(Float, default=0.0)
    
    # Data Source
    data_source = Column(String)  # "Maersk Annual Report 2021", "Drewry WCI Index", etc.
    confidence_level = Column(String, default="High")  # High, Medium, Low
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HistoricalMCResult(Base):
    """Monte Carlo simulation results for historical scenarios"""
    __tablename__ = "historical_mc_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id = Column(String, nullable=False, index=True)
    industry_data_id = Column(String, nullable=False, index=True)
    
    # MC Simulation Results
    mc_total_cost_usd = Column(Float, nullable=False)
    mc_total_time_days = Column(Float, nullable=False)
    mc_co2_tons = Column(Float, default=0.0)
    
    # Route Details
    mc_route_name = Column(String, nullable=False)
    mc_mode_breakdown = Column(JSON, default=dict)  # {sea: 90, rail: 10, air: 0, road: 0}
    mc_waypoints = Column(JSON, default=list)
    
    # Comparison Metrics
    cost_savings_usd = Column(Float, default=0.0)  # industry_cost - mc_cost
    cost_savings_percent = Column(Float, default=0.0)
    time_savings_days = Column(Float, default=0.0)
    time_savings_percent = Column(Float, default=0.0)
    
    # Accuracy Verdict
    accuracy_verdict = Column(String, default="Better")  # Better, Worse, Equivalent
    
    # Simulation Metadata
    mc_simulations_run = Column(Integer, default=2000)
    confidence_score = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())