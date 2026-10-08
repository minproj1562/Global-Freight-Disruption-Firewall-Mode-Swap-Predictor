// frontend/src/services/portManagerApi.ts
import api from './api';

export interface BackendPort {
  id: string;
  name: string;
  code: string;
  country: string;
  latitude: number;
  longitude: number;
  berth_capacity: number;
  active_berths_used: number;
  congestion_level: string;
  congestion_percent: number;
  waiting_vessels: number;
  avg_wait_hours: number;
  status_label: string;
  primary_exports: string[];
  congestion_updated_by?: string;
  congestion_updated_at?: string;
  congestion_source?: string; // "api" | "manual"
  relation?: 'self' | 'network' | 'other';
}

export interface BackendBerthSlot {
  id: string;
  berth_number: string;
  berth_name?: string;
  berth_type?: string;
  is_occupied: boolean;
  current_vessel_mmsi?: number;
  current_vessel_name?: string;
  occupied_since?: string;
  estimated_departure?: string;
  cargo_operation?: string;
  loading_progress_percent: number;
  max_vessel_length_meters?: number;
  max_draught_meters?: number;
  crane_count: number;
}

export interface BackendVesselArrival {
  id: string;
  vessel_mmsi: number;
  vessel_name: string;
  vessel_type?: string;
  vessel_flag?: string;
  eta: string;
  ata?: string;
  etd?: string;
  atd?: string;
  status: string;
  berth_assignment_status: string;
  cargo_type?: string;
  cargo_tonnage?: number;
  teu_count?: number;
}

export interface BackendCongestionHistory {
  timestamp: string;
  congestion_percent: number;
  waiting_vessels: number;
  avg_wait_hours: number;
  disruption_flag: boolean;
  disruption_reason?: string;
}

export interface BackendPortDisruption {
  id: string;
  port_id: string;
  disruption_type: string;
  severity: string;
  title: string;
  description?: string;
  is_active: boolean;
  started_at: string;
  resolved_at?: string;
}

export interface BackendPortDetail extends BackendPort {
  berth_slots: BackendBerthSlot[];
  vessel_arrivals: BackendVesselArrival[];
  docked_vessels: BackendVesselArrival[];
  congestion_history: BackendCongestionHistory[];
  active_disruptions: BackendPortDisruption[];
}

// ============= READ API CALLS =============

export const fetchAllPorts = async (search?: string, congestionLevel?: string, assignedPortId?: string): Promise<BackendPort[]> => {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (congestionLevel && congestionLevel !== 'all') params.congestion_level = congestionLevel;
  if (assignedPortId) params.assigned_port_id = assignedPortId;

  const response = await api.get<BackendPort[]>('/api/ports/', { params });
  return response.data;
};

export const fetchPortDetail = async (portId: string): Promise<BackendPortDetail> => {
  const response = await api.get<BackendPortDetail>(`/api/ports/${portId}`);
  return response.data;
};

export const fetchPortBerths = async (portId: string): Promise<BackendBerthSlot[]> => {
  const response = await api.get<BackendBerthSlot[]>(`/api/ports/${portId}/berths`);
  return response.data;
};

export const fetchPortDepartures = async (portId: string): Promise<BackendVesselArrival[]> => {
  const response = await api.get<BackendVesselArrival[]>(`/api/ports/${portId}/departures`);
  return response.data;
};

export const flagPortDisruptionApi = async (
  portId: string,
  disruption: {
    disruption_type: string;
    severity: string;
    title: string;
    description?: string;
  }
): Promise<BackendPortDisruption> => {
  const response = await api.post<BackendPortDisruption>(`/api/ports/${portId}/disruptions`, disruption);
  return response.data;
};

export const resolvePortDisruptionApi = async (
  portId: string,
  disruptionId: string
): Promise<BackendPortDisruption> => {
  const response = await api.patch<BackendPortDisruption>(`/api/ports/${portId}/disruptions/${disruptionId}/resolve`);
  return response.data;
};

// ============= CONGESTION MANAGEMENT =============

export const updateCongestionApi = async (
  portId: string,
  congestion_percent: number,
  note?: string
): Promise<BackendPort> => {
  const response = await api.patch<BackendPort>(`/api/ports/${portId}/congestion`, {
    congestion_percent,
    note,
  });
  return response.data;
};

// ============= BERTH MANAGEMENT =============

export const assignVesselToBerthApi = async (
  portId: string,
  berthId: string,
  data: {
    vessel_mmsi: number;
    vessel_name: string;
    vessel_type?: string;
    vessel_flag?: string;
    cargo_operation?: string;
    estimated_departure?: string;
  }
): Promise<BackendBerthSlot> => {
  const response = await api.patch<BackendBerthSlot>(`/api/ports/${portId}/berths/${berthId}/assign`, data);
  return response.data;
};

export const freeBerthApi = async (
  portId: string,
  berthId: string,
  note?: string
): Promise<BackendBerthSlot> => {
  const response = await api.patch<BackendBerthSlot>(`/api/ports/${portId}/berths/${berthId}/free`, { note });
  return response.data;
};

// ============= VESSEL ARRIVALS MANAGEMENT =============

export const addVesselArrivalApi = async (
  portId: string,
  data: {
    vessel_mmsi: number;
    vessel_name: string;
    vessel_type?: string;
    vessel_flag?: string;
    eta: string;
    cargo_type?: string;
    cargo_tonnage?: number;
    teu_count?: number;
  }
): Promise<BackendVesselArrival> => {
  const response = await api.post<BackendVesselArrival>(`/api/ports/${portId}/arrivals`, data);
  return response.data;
};

export const updateVesselETAApi = async (
  portId: string,
  arrivalId: string,
  eta: string,
  note?: string
): Promise<BackendVesselArrival> => {
  const response = await api.patch<BackendVesselArrival>(`/api/ports/${portId}/arrivals/${arrivalId}/eta`, { eta, note });
  return response.data;
};

export const markVesselArrivedApi = async (
  portId: string,
  arrivalId: string,
  berthId?: string
): Promise<BackendVesselArrival> => {
  const response = await api.patch<BackendVesselArrival>(`/api/ports/${portId}/arrivals/${arrivalId}/arrived`, {
    berth_id: berthId || null,
  });
  return response.data;
};

export const cancelVesselArrivalApi = async (
  portId: string,
  arrivalId: string
): Promise<BackendVesselArrival> => {
  const response = await api.patch<BackendVesselArrival>(`/api/ports/${portId}/arrivals/${arrivalId}/cancel`);
  return response.data;
};

// ============= DEPARTURES MANAGEMENT =============

export const markVesselDepartedApi = async (
  portId: string,
  arrivalId: string
): Promise<BackendVesselArrival> => {
  const response = await api.patch<BackendVesselArrival>(`/api/ports/${portId}/arrivals/${arrivalId}/departed`);
  return response.data;
};

// ============= PAGE 3.3: PORT-SCOPED VESSEL TRAFFIC LOG =============

export type VesselTrafficCategory = 'Expected' | 'Docked' | 'Departed' | 'All';

export const fetchPortVesselTraffic = async (
  portId: string,
  params?: { category?: VesselTrafficCategory; search?: string; type?: string; flag?: string }
): Promise<BackendVesselArrival[]> => {
  const query: Record<string, string> = {};
  if (params?.category) query.category = params.category;
  if (params?.search) query.search = params.search;
  if (params?.type && params.type !== 'All') query.type = params.type;
  if (params?.flag && params.flag !== 'All') query.flag = params.flag;

  const response = await api.get<BackendVesselArrival[]>(`/api/ports/${portId}/vessel-traffic`, { params: query });
  return response.data;
};

export const getPortVesselTrafficExportUrl = (
  portId: string,
  params?: { category?: VesselTrafficCategory; search?: string; type?: string; flag?: string }
): string => {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.search) query.append('search', params.search);
  if (params?.type && params.type !== 'All') query.append('type', params.type);
  if (params?.flag && params.flag !== 'All') query.append('flag', params.flag);
  const base = api.defaults.baseURL || '';
  return `${base}/api/ports/${portId}/vessel-traffic/export-csv?${query.toString()}`;
};

// ============= PAGE 3.3: AIS SYNC SUGGESTIONS =============
// Returns AI-detected arrival/departure signals from the live AIS feed.
// Nothing is auto-applied — the manager confirms each suggestion, which
// then calls markVesselArrivedApi / markVesselDepartedApi as normal.

export interface VesselSyncSuggestion {
  arrival_id: string;
  vessel_mmsi: number;
  vessel_name: string;
  current_status: string;
  suggested_status: 'Docked' | 'Departed';
  distance_nm?: number;
  ais_speed_knots?: number;
  last_ais_update?: string;
  confidence: 'high' | 'medium';
}

export const fetchVesselSyncSuggestions = async (portId: string): Promise<VesselSyncSuggestion[]> => {
  const response = await api.get<VesselSyncSuggestion[]>(`/api/ports/${portId}/vessel-traffic/sync-check`);
  return response.data;
};

// ============= NETWORK TELEMETRY TYPES =============

export interface VesselScheduleEntry {
  id: string;
  vessel_name: string;
  mmsi: string;
  departure_time: string;
  arrival_time: string;
  status: string;
  status_code: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  cargo: string;
}

export interface RouteStatus {
  corridor_name: string;
  route_status: string;
  weather_condition: string;
  sea_state: string;
  est_travel_days: string;
  chokepoint_impact: string;
  alternative_route: string;
}

export interface AIImpactPrediction {
  surge_pct: number;
  days_out: number;
  risk_level: 'CRITICAL_RIPPLE' | 'HIGH_RIPPLE' | 'STABLE_CORRIDOR';
  risk_badge: string;
  ai_recommendation: string;
  ai_insight_narrative: string;
  confidence_score_pct: number;
}

export interface PortManagerContact {
  manager_name: string;
  role: string;
  email: string;
  phone: string;
  vhf_channel: string;
}

export interface NetworkPortTelemetry {
  dest_port_id: string;
  dest_port_name: string;
  dest_port_code: string;
  dest_country: string;
  congestion_percent: number;
  avg_wait_hours: number;
  waiting_vessels: number;
  trade_volume_teu_monthly: string;
  voyage_frequency: string;
  historical_reliability_pct: number;
  vessel_schedule: VesselScheduleEntry[];
  route_status: RouteStatus;
  ai_impact_prediction: AIImpactPrediction;
  manager_contact: PortManagerContact;
  last_sync_timestamp: string;
}

// ============= NETWORK TELEMETRY API CALL =============

export const fetchNetworkPortTelemetry = async (
  portId: string,
  assignedPortId?: string
): Promise<NetworkPortTelemetry> => {
  const params: Record<string, string> = {};
  if (assignedPortId) params.assigned_port_id = assignedPortId;
  const response = await api.get<NetworkPortTelemetry>(`/api/ports/${portId}/network-telemetry`, { params });
  return response.data;
};

// ============= RIPPLE DASHBOARD (Network Analyzer — Port Manager primary view) =============

export interface IncomingThreat {
  upstream_port_id: string;
  upstream_port_name: string;
  upstream_port_code: string;
  upstream_congestion_now_pct: number;
  upstream_trend_label: string;
  predicted_congestion_increase_pct: number;
  additional_waiting_vessels: number;
  additional_dwell_days: number;
  time_to_impact_days: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  confidence_pct: number;
  prediction_engine: string;
  plain_language_summary: string;
}

export interface OutgoingImpact {
  downstream_port_id: string;
  downstream_port_name: string;
  downstream_port_code: string;
  predicted_congestion_increase_pct: number;
  additional_waiting_vessels: number;
  time_to_impact_days: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  recommended_coordination: string;
  plain_language_summary: string;
}

export interface PortHealthBanner {
  port_id: string;
  port_name: string;
  status: 'GREEN' | 'AMBER' | 'RED' | string;
  headline: string;
  hours_to_prepare: number | null;
  confidence_pct: number;
  outgoing_ports_affected_count: number;
  generated_at: string;
}

export interface PreparationAction {
  time_window: string;
  action: string;
  resource_required: string;
  expected_outcome: string;
  status: string;
}

export interface HistoricalPrecedent {
  event_name: string;
  location: string;
  duration_days: number;
  vessels_affected: number;
  avg_industry_delay_days: number;
  summary: string;
}

export interface RippleDashboard {
  banner: PortHealthBanner;
  incoming_threats: IncomingThreat[];
  outgoing_impacts: OutgoingImpact[];
  preparation_plan: PreparationAction[];
  historical_precedents: HistoricalPrecedent[];
}

export const fetchRippleDashboard = async (portId: string): Promise<RippleDashboard> => {
  const response = await api.get<RippleDashboard>(`/api/network-analyzer/${portId}/ripple-dashboard`);
  return response.data;
};
// ============= LANDING PAGE REAL-TIME TELEMETRY =============

export interface CriticalPortSummary {
  id: string;
  name: string;
  code: string;
  country: string;
  congestion_percent: number;
  congestion_level: string;
  waiting_vessels: number;
  avg_wait_hours: number;
  status_label: string;
}

export interface LandingTelemetryData {
  total_ports: number;
  total_tracked_vessels: number;
  waiting_vessels_total: number;
  avg_global_congestion_pct: number;
  critical_ports_count: number;
  moderate_ports_count: number;
  low_ports_count: number;
  total_berths: number;
  active_berths: number;
  active_disruptions_count: number;
  top_critical_ports: CriticalPortSummary[];
  system_status: string;
}

export const fetchLandingTelemetryApi = async (): Promise<LandingTelemetryData> => {
  const response = await api.get<LandingTelemetryData>('/api/ports/landing-telemetry');
  return response.data;
};
// ============= NETWORK IMPACT ANALYZER (Network Science + GNN) =============

export interface DirectTradePartner {
  port_id: string;
  port_name: string;
  port_code: string;
  avg_transit_days: number;
}

export interface NetworkOverview {
  port_id: string;
  port_name: string;
  port_code: string;
  trade_chokepoint_score_pct: number;
  trade_chokepoint_label: string;
  trade_chokepoint_explainer: string;
  direct_trade_partners_count: number;
  direct_connectivity_pct: number;
  single_point_of_failure_risk_label: string;
  single_point_of_failure_explainer: string;
  vulnerability_score_0_100: number;
  risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  global_rank_by_importance: number;
  total_ports_in_network: number;
  direct_trade_partners: DirectTradePartner[];
}

export interface AlternativeRoute {
  from_port_name: string;
  to_port_name: string;
  has_alternative: boolean;
  alternate_path_names: string[];
  extra_transit_days: number | null;
  plain_language_summary: string;
}

export interface ShutdownAffectedPort {
  port_name: string;
  port_code: string;
  congestion_increase_pct: number;
  risk_level: string;
  days_3: number;
  days_7: number;
  days_14: number;
}

export interface ShutdownSimulationResult {
  port_id: string;
  port_name: string;
  severity_simulated: string;
  prediction_engine: string;
  plain_language_summary: string;
  affected_ports: ShutdownAffectedPort[];
}

export interface TechnicalDetails {
  port_id: string;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  eigenvector_centrality: number;
  is_articulation_point: boolean;
  vulnerability_score: number;
  total_network_nodes: number;
  total_network_edges: number;
  gnn_model_info: Record<string, any>;
}

export const fetchNetworkOverview = async (portId: string): Promise<NetworkOverview> => {
  const response = await api.get<NetworkOverview>(`/api/network-analyzer/${portId}/overview`);
  return response.data;
};

export const fetchAlternativeRoutes = async (portId: string): Promise<AlternativeRoute[]> => {
  const response = await api.get<AlternativeRoute[]>(`/api/network-analyzer/${portId}/alternative-routes`);
  return response.data;
};

export const simulatePortShutdown = async (
  portId: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'critical'
): Promise<ShutdownSimulationResult> => {
  const response = await api.get<ShutdownSimulationResult>(`/api/network-analyzer/${portId}/simulate-shutdown`, {
    params: { severity },
  });
  return response.data;
};

export const fetchNetworkTechnicalDetails = async (portId: string): Promise<TechnicalDetails> => {
  const response = await api.get<TechnicalDetails>(`/api/network-analyzer/${portId}/technical-details`);
  return response.data;
};

// ============= NETWORK TOPOLOGY (Trade Network Map — Network Watch page) =============

export interface GraphNode {
  port_id: string;
  port_name: string;
  port_code: string;
  latitude: number | null;
  longitude: number | null;
  congestion_percent: number;
  is_center: boolean;
  relation: 'self' | 'incoming_threat' | 'outgoing_impact' | 'connected' | string;
  risk_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | string;
}

export interface GraphEdge {
  from_port_id: string;
  to_port_id: string;
  direction: 'incoming' | 'outgoing' | 'neutral' | string;
  risk_level: string;
  predicted_increase_pct: number;
  transit_days: number;
}

export interface GraphTopology {
  center_port_id: string;
  center_port_name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const fetchGraphTopology = async (portId: string): Promise<GraphTopology> => {
  const response = await api.get<GraphTopology>(`/api/network-analyzer/${portId}/graph-topology`);
  return response.data;
};