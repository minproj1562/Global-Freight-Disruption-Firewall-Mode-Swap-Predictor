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

