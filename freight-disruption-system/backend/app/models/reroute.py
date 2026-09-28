# backend/app/models/reroute.py
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class RerouteDecision(Base):
    """Stores confirmed reroute decisions for audit trail and analytics"""
    __tablename__ = "reroute_decisions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(String, nullable=True)
    
    # Request Parameters
    origin_port_id = Column(String, ForeignKey("ports.id", ondelete="SET NULL"))
    destination_port_id = Column(String, ForeignKey("ports.id", ondelete="SET NULL"))
    vessel_id = Column(String, ForeignKey("vessels.id", ondelete="SET NULL"))
    cargo_type = Column(String, nullable=False)
    cargo_value_usd = Column(Float, default=0.0)
    priority = Column(String, default="Balanced")  # Cost, Time, Balanced, Carbon
    disruption_avoided_id = Column(String, ForeignKey("global_disruptions.id", ondelete="SET NULL"))
    
    # Original Route (Dijkstra Baseline)
    original_route_name = Column(String)
    original_cost_usd = Column(Float)
    original_time_days = Column(Float)
    original_co2_tons = Column(Float)
    original_risk_level = Column(String)
    
    # Selected Reroute Alternative
    selected_route_id = Column(String, nullable=False)  # opt-ocean-bypass, opt-sea-air-express, etc.
    selected_route_name = Column(String, nullable=False)
    selected_cost_usd = Column(Float, nullable=False)
    selected_time_days = Column(Float, nullable=False)
    selected_co2_tons = Column(Float, nullable=False)
    selected_risk_level = Column(String, default="low")
    selected_confidence_score = Column(Float, default=0.0)
    selected_ml_risk_score = Column(Float, default=0.0)
    
    # Mode Breakdown (JSON)
    mode_breakdown = Column(JSON, default=dict)  # {sea: 60.0, rail: 30.0, air: 10.0, road: 0.0}
    
    # Waypoints & Carriers
    waypoints = Column(JSON, default=list)  # [[lon, lat], [lon, lat], ...]
    waypoint_names = Column(JSON, default=list)  # ["Port A", "Hub B", "Port C"]
    carrier_name = Column(String)
    transit_summary = Column(Text)
    corridor_name = Column(String)
    
    # Savings Calculation
    cost_saved_usd = Column(Float, default=0.0)
    time_saved_days = Column(Float, default=0.0)
    carbon_reduced_tons = Column(Float, default=0.0)
    
    # Alternatives Considered (JSON array of route summaries)
    alternatives_considered = Column(JSON, default=list)
    
    # Rationale & Status
    rationale = Column(Text)  # User's decision rationale
    decision_status = Column(String, default="confirmed")  # confirmed, cancelled, completed, in_progress
    decision_confirmed = Column(Boolean, default=True)
    
    # Execution Tracking
    alert_timestamp = Column(DateTime(timezone=True), nullable=True)  # When disruption was first detected
    decision_timestamp = Column(DateTime(timezone=True), server_default=func.now())  # When user confirmed reroute
    execution_started_at = Column(DateTime(timezone=True), nullable=True)
    execution_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Predicted vs Actual (for ML feedback loop)
    predicted_eta = Column(DateTime(timezone=True), nullable=True)
    actual_eta = Column(DateTime(timezone=True), nullable=True)
    predicted_cost_usd = Column(Float, nullable=True)
    actual_cost_usd = Column(Float, nullable=True)
    
    # Monte Carlo Simulation Metadata
    mc_simulations_run = Column(Integer, default=2000)
    optimization_algorithm = Column(String, default="NSGA-II + Monte Carlo")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    origin_port = relationship("Port", foreign_keys=[origin_port_id])
    destination_port = relationship("Port", foreign_keys=[destination_port_id])
    vessel = relationship("Vessel", foreign_keys=[vessel_id])
    disruption = relationship("GlobalDisruption", foreign_keys=[disruption_avoided_id])


class RouteAlternative(Base):
    """Stores all alternative routes generated during a simulation (for analytics)"""
    __tablename__ = "route_alternatives"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String, ForeignKey("reroute_decisions.id", ondelete="CASCADE"), nullable=False)
    
    route_id = Column(String, nullable=False)  # opt-ocean-bypass, opt-sea-air-express
    route_name = Column(String, nullable=False)
    rank = Column(Integer, default=1)
    is_recommended = Column(Boolean, default=False)
    
    # Route Metrics
    total_cost_usd = Column(Float)
    total_time_days = Column(Float)
    co2_tons = Column(Float)
    confidence_score = Column(Float)
    risk_level = Column(String)
    ml_risk_score = Column(Float)
    
    # Mode & Waypoints
    mode_breakdown = Column(JSON, default=dict)
    waypoints = Column(JSON, default=list)
    waypoint_names = Column(JSON, default=list)
    carrier_name = Column(String)
    strategy_label = Column(String)  # Fastest, Cheapest, Most Resilient, Lowest Carbon
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    decision = relationship("RerouteDecision", backref="alternatives")


class RouteLeg(Base):
    """Multimodal leg-by-leg breakdown for detailed Gantt chart"""
    __tablename__ = "route_legs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String, ForeignKey("reroute_decisions.id", ondelete="CASCADE"), nullable=False)
    alternative_id = Column(String, ForeignKey("route_alternatives.id", ondelete="CASCADE"), nullable=True)
    
    leg_number = Column(Integer, nullable=False)  # 1, 2, 3...
    mode = Column(String, nullable=False)  # Sea, Rail, Air, Road
    
    # Geographic
    from_location = Column(String)
    to_location = Column(String)
    from_lat = Column(Float)
    from_lon = Column(Float)
    to_lat = Column(Float)
    to_lon = Column(Float)
    
    # Leg Metrics
    distance_km = Column(Float)
    duration_days = Column(Float)
    cost_usd = Column(Float)
    co2_tons = Column(Float)
    
    # Carrier & Equipment
    carrier = Column(String)
    vessel_or_flight_id = Column(String, nullable=True)
    
    # Handover
    handover_point = Column(String, nullable=True)
    handover_duration_hours = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    decision = relationship("RerouteDecision", backref="legs")


class CostBreakdown(Base):
    """Granular cost waterfall components"""
    __tablename__ = "cost_breakdowns"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    decision_id = Column(String, ForeignKey("reroute_decisions.id", ondelete="CASCADE"), nullable=False)
    alternative_id = Column(String, ForeignKey("route_alternatives.id", ondelete="CASCADE"), nullable=True)
    
    # Cost Components (all in USD)
    ocean_freight = Column(Float, default=0.0)
    bunker_fuel = Column(Float, default=0.0)
    charter_daily_rate = Column(Float, default=0.0)
    port_call_charges = Column(Float, default=0.0)
    canal_transit_fees = Column(Float, default=0.0)
    
    rail_freight = Column(Float, default=0.0)
    air_freight = Column(Float, default=0.0)
    road_freight = Column(Float, default=0.0)
    
    insurance_base = Column(Float, default=0.0)
    insurance_war_risk = Column(Float, default=0.0)
    insurance_hull = Column(Float, default=0.0)
    
    inventory_holding_cost = Column(Float, default=0.0)  # cargo_value × delay × daily_rate
    demurrage_detention = Column(Float, default=0.0)
    customs_duties = Column(Float, default=0.0)
    
    handling_charges = Column(Float, default=0.0)
    documentation_fees = Column(Float, default=0.0)
    contingency_buffer = Column(Float, default=0.0)
    
    # Totals
    subtotal = Column(Float, default=0.0)
    taxes_surcharges = Column(Float, default=0.0)
    total_cost_usd = Column(Float, default=0.0)
    
    # Currency Conversion (if cargo value in INR)
    exchange_rate_usd_inr = Column(Float, default=83.25)
    total_cost_inr = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    decision = relationship("RerouteDecision", backref="cost_breakdowns")