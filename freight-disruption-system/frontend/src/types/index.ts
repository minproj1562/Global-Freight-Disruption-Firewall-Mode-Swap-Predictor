// TypeScript Interfaces for Freight Firewall & Mode-Swap Predictor
// Aligned with FastAPI & Pydantic backend models

export type VesselType = 'Container' | 'Tanker' | 'Bulk Carrier' | 'Cargo' | 'Special';
export type DisruptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DisruptionStatus = 'normal' | 'at-risk' | 'disrupted';
export type CongestionLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Vessel {
  id: string;
  mmsi: number;
  imo: number;
  name: string;
  flag: string;
  vessel_type: VesselType;
  speed: number; // in knots
  heading: number; // 0-359 deg
  course: number; // 0-359 deg
  latitude: number;
  longitude: number;
  destination_port: string;
  eta: string;
  status: DisruptionStatus;
  destination_lat: number;
  destination_lon: number;
  speed_history: number[];
  length_meters?: number;
  capacity_teu?: number;
  draught_meters?: number;
  current_risk_reason?: string;
  cargo_summary?: string;
}

export interface Port {
  id: string;
  name: string;
  code: string;
  country: string;
  latitude: number;
  longitude: number;
  congestion_level: CongestionLevel;
  waiting_vessels: number;
  avg_wait_hours: number;
  berth_capacity: number;
  active_berths_used: number;
  congestion_history: number[];
  primary_exports?: string[];
}

export type DisruptionCategory = 'geopolitical' | 'weather' | 'labor' | 'canal';
export type AcknowledgementStatus = 'unacknowledged' | 'acknowledged' | 'resolved';

export interface RecommendedAction {
  id: string;
  disruption_id: string;
  summary: string;
  action_type: 'Reroute Sea Cape' | 'Sea -> Air' | 'Sea -> Rail' | 'Port Diversion';
  estimated_delay_avoided_days: number;
  estimated_cost_delta_usd: number;
  affected_vessels_count: number;
  suggested_route_id?: string;
  confidence_score: number; // 0 to 100
}

export interface Disruption {
  id: string;
  name: string;
  type: string; // e.g. "Geopolitical / Armed Activity", "Extreme Weather", "Chokepoint Congestion"
  category?: DisruptionCategory;
  severity: DisruptionSeverity;
  status?: AcknowledgementStatus;
  description: string;
  polygon_coordinates: [number, number][]; // Array of [lon, lat] pairs (GeoJSON order)
  affected_vessels_count: number;
  active_since: string;
  time_since_detected?: string;
  estimated_duration_remaining?: string;
  location_name?: string;
  mitigation_advice: string;
  affected_vessels_list?: Vessel[];
  recommended_action?: RecommendedAction;
  is_new?: boolean;
}

export interface ModeSwapOption {
  id: string;
  mode: 'Sea -> Air' | 'Sea -> Rail' | 'Sea -> Road (Truck)' | 'Reroute Sea Cape';
  hub_port_code: string;
  estimated_time_saving_days: number;
  estimated_cost_delta_usd: number;
  co2_impact_percent: number;
  feasibility_score: number; // 0 to 100
  recommended_carrier: string;
  transit_summary: string;
}

export interface Route {
  id: string;
  vessel_id: string;
  vessel_name: string;
  origin_port: string;
  destination_port: string;
  waypoints: [number, number][]; // [lon, lat] pairs
  requires_reroute: boolean;
  recommended_mode_swap: ModeSwapOption | null;
}

export interface RouteRequest {
  origin_port: string;
  destination_port: string;
  vessel_id: string;
  cargo_type: string;
  priority: 'Cost' | 'Time' | 'Balanced';
  disruption_to_avoid: string;
}

export interface RouteResult {
  id: string;
  rank: number;
  is_recommended: boolean;
  title: string;
  mode_breakdown: {
    sea: number; // percentage (0-100)
    rail: number;
    air: number;
    road?: number;
  };
  waypoints: [number, number][];
  waypoint_names: string[];
  total_cost_usd: number;
  total_time_days: number;
  confidence_score: number; // 0 to 100
  risk_level: DisruptionSeverity;
  co2_carbon_footprint_tons: number;
  savings_vs_original: {
    cost_usd: number;
    time_days: number;
  };
  transit_summary: string;
  carrier_name: string;
}

export interface SimulatedPoint {
  id: string;
  cost: number;
  time: number;
  confidence: number;
  risk: DisruptionSeverity;
  isTop3: boolean;
  rank?: number;
  routeName?: string;
  modeLabel?: string;
}

export interface SimulationResult {
  request: RouteRequest;
  total_simulations_run: number;
  recommended_routes: RouteResult[];
  scatter_cloud: SimulatedPoint[];
  dijkstra_comparison: {
    route_name: string;
    cost_usd: number;
    time_days: number;
    risk_level: DisruptionSeverity;
    co2_tons: number;
    bottlenecks: string[];
    details: string;
    mc_diff: {
      cost_saved_usd: number;
      time_saved_days: number;
      risk_reduction: string;
    };
  };
}

export interface KPISnapshot {
  total_vessels: number;
  active_disruptions: number;
  vessels_affected: number;
  routes_needing_reroute: number;
  last_updated: string;
}

export interface SecondaryInfrastructure {
  id: string;
  name: string;
  type: 'Lighthouse' | 'AtoN Beacon' | 'Marina' | 'Anchorage';
  latitude: number;
  longitude: number;
  status: 'Operational' | 'Maintenance' | 'Alert';
}

export interface SearchResult {
  id: string;
  type: 'vessel' | 'port' | 'disruption';
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  item: Vessel | Port | Disruption;
}

