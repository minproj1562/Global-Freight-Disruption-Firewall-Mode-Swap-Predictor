"""add reroute decision tables

Revision ID: xxxx_reroute_tables
Revises: ef1b9070a7da
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'xxxx_reroute_tables'
down_revision = 'ef1b9070a7da'
branch_labels = None
depends_on = None


def upgrade():
    # Create reroute_decisions table
    op.create_table(
        'reroute_decisions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('organization_id', sa.String(), nullable=True),
        sa.Column('origin_port_id', sa.String(), nullable=True),
        sa.Column('destination_port_id', sa.String(), nullable=True),
        sa.Column('vessel_id', sa.String(), nullable=True),
        sa.Column('cargo_type', sa.String(), nullable=False),
        sa.Column('cargo_value_usd', sa.Float(), nullable=True),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('disruption_avoided_id', sa.String(), nullable=True),
        sa.Column('original_route_name', sa.String(), nullable=True),
        sa.Column('original_cost_usd', sa.Float(), nullable=True),
        sa.Column('original_time_days', sa.Float(), nullable=True),
        sa.Column('original_co2_tons', sa.Float(), nullable=True),
        sa.Column('original_risk_level', sa.String(), nullable=True),
        sa.Column('selected_route_id', sa.String(), nullable=False),
        sa.Column('selected_route_name', sa.String(), nullable=False),
        sa.Column('selected_cost_usd', sa.Float(), nullable=False),
        sa.Column('selected_time_days', sa.Float(), nullable=False),
        sa.Column('selected_co2_tons', sa.Float(), nullable=False),
        sa.Column('selected_risk_level', sa.String(), nullable=True),
        sa.Column('selected_confidence_score', sa.Float(), nullable=True),
        sa.Column('selected_ml_risk_score', sa.Float(), nullable=True),
        sa.Column('mode_breakdown', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('waypoints', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('waypoint_names', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('carrier_name', sa.String(), nullable=True),
        sa.Column('transit_summary', sa.Text(), nullable=True),
        sa.Column('corridor_name', sa.String(), nullable=True),
        sa.Column('cost_saved_usd', sa.Float(), nullable=True),
        sa.Column('time_saved_days', sa.Float(), nullable=True),
        sa.Column('carbon_reduced_tons', sa.Float(), nullable=True),
        sa.Column('alternatives_considered', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('decision_status', sa.String(), nullable=True),
        sa.Column('decision_confirmed', sa.Boolean(), nullable=True),
        sa.Column('alert_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decision_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('execution_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('execution_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('predicted_eta', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_eta', sa.DateTime(timezone=True), nullable=True),
        sa.Column('predicted_cost_usd', sa.Float(), nullable=True),
        sa.Column('actual_cost_usd', sa.Float(), nullable=True),
        sa.Column('mc_simulations_run', sa.Integer(), nullable=True),
        sa.Column('optimization_algorithm', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['origin_port_id'], ['ports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['destination_port_id'], ['ports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vessel_id'], ['vessels.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['disruption_avoided_id'], ['global_disruptions.id'], ondelete='SET NULL')
    )
    op.create_index('ix_reroute_decisions_user_id', 'reroute_decisions', ['user_id'])
    op.create_index('ix_reroute_decisions_org_id', 'reroute_decisions', ['organization_id'])
    op.create_index('ix_reroute_decisions_created_at', 'reroute_decisions', ['created_at'])

    # Create route_alternatives table
    op.create_table(
        'route_alternatives',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('decision_id', sa.String(), nullable=False),
        sa.Column('route_id', sa.String(), nullable=False),
        sa.Column('route_name', sa.String(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('is_recommended', sa.Boolean(), nullable=True),
        sa.Column('total_cost_usd', sa.Float(), nullable=True),
        sa.Column('total_time_days', sa.Float(), nullable=True),
        sa.Column('co2_tons', sa.Float(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(), nullable=True),
        sa.Column('ml_risk_score', sa.Float(), nullable=True),
        sa.Column('mode_breakdown', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('waypoints', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('waypoint_names', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('carrier_name', sa.String(), nullable=True),
        sa.Column('strategy_label', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['decision_id'], ['reroute_decisions.id'], ondelete='CASCADE')
    )
    op.create_index('ix_route_alternatives_decision_id', 'route_alternatives', ['decision_id'])

    # Create route_legs table
    op.create_table(
        'route_legs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('decision_id', sa.String(), nullable=False),
        sa.Column('alternative_id', sa.String(), nullable=True),
        sa.Column('leg_number', sa.Integer(), nullable=False),
        sa.Column('mode', sa.String(), nullable=False),
        sa.Column('from_location', sa.String(), nullable=True),
        sa.Column('to_location', sa.String(), nullable=True),
        sa.Column('from_lat', sa.Float(), nullable=True),
        sa.Column('from_lon', sa.Float(), nullable=True),
        sa.Column('to_lat', sa.Float(), nullable=True),
        sa.Column('to_lon', sa.Float(), nullable=True),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('duration_days', sa.Float(), nullable=True),
        sa.Column('cost_usd', sa.Float(), nullable=True),
        sa.Column('co2_tons', sa.Float(), nullable=True),
        sa.Column('carrier', sa.String(), nullable=True),
        sa.Column('vessel_or_flight_id', sa.String(), nullable=True),
        sa.Column('handover_point', sa.String(), nullable=True),
        sa.Column('handover_duration_hours', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['decision_id'], ['reroute_decisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['alternative_id'], ['route_alternatives.id'], ondelete='CASCADE')
    )

    # Create cost_breakdowns table
    op.create_table(
        'cost_breakdowns',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('decision_id', sa.String(), nullable=False),
        sa.Column('alternative_id', sa.String(), nullable=True),
        sa.Column('ocean_freight', sa.Float(), nullable=True),
        sa.Column('bunker_fuel', sa.Float(), nullable=True),
        sa.Column('charter_daily_rate', sa.Float(), nullable=True),
        sa.Column('port_call_charges', sa.Float(), nullable=True),
        sa.Column('canal_transit_fees', sa.Float(), nullable=True),
        sa.Column('rail_freight', sa.Float(), nullable=True),
        sa.Column('air_freight', sa.Float(), nullable=True),
        sa.Column('road_freight', sa.Float(), nullable=True),
        sa.Column('insurance_base', sa.Float(), nullable=True),
        sa.Column('insurance_war_risk', sa.Float(), nullable=True),
        sa.Column('insurance_hull', sa.Float(), nullable=True),
        sa.Column('inventory_holding_cost', sa.Float(), nullable=True),
        sa.Column('demurrage_detention', sa.Float(), nullable=True),
        sa.Column('customs_duties', sa.Float(), nullable=True),
        sa.Column('handling_charges', sa.Float(), nullable=True),
        sa.Column('documentation_fees', sa.Float(), nullable=True),
        sa.Column('contingency_buffer', sa.Float(), nullable=True),
        sa.Column('subtotal', sa.Float(), nullable=True),
        sa.Column('taxes_surcharges', sa.Float(), nullable=True),
        sa.Column('total_cost_usd', sa.Float(), nullable=True),
        sa.Column('exchange_rate_usd_inr', sa.Float(), nullable=True),
        sa.Column('total_cost_inr', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['decision_id'], ['reroute_decisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['alternative_id'], ['route_alternatives.id'], ondelete='CASCADE')
    )


def downgrade():
    op.drop_table('cost_breakdowns')
    op.drop_table('route_legs')
    op.drop_table('route_alternatives')
    op.drop_table('reroute_decisions')