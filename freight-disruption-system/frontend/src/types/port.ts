// src/types/port.ts

export type CongestionStatus = 'optimal' | 'moderate' | 'heavy' | 'disrupted';

export interface DisruptionEvent {
  id: string;
  title: string;
  type: 'weather' | 'strike' | 'equipment' | 'channel_block' | 'cyber';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate?: string;
  impactScore: number; // 1-100
  description: string;
  mitigationPlan?: string;
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  flag: string;
  flagCode: string;
  type: 'Container Ship' | 'Oil Tanker' | 'Bulk Carrier' | 'Ro-Ro' | 'LNG Carrier';
  lengthMeters: number;
  beamMeters: number;
  draftMeters: number;
  dwtTons: number;
  captain: string;
  cargoType: string;
  cargoTonnage: number;
  teuCapacity?: number;
  hazardousCargo: boolean;
  eta: string;
  etd: string;
  status: 'Docked' | 'Anchored' | 'En Route' | 'Departing' | 'Delayed';
  priority: 'Urgent' | 'High' | 'Normal';
  assignedBerth?: string;
  speedKnots?: number;
  originPort: string;
  destinationPort: string;
}

export interface Berth {
  id: string;
  berthNumber: string;
  name: string;
  maxDraftMeters: number;
  maxLengthMeters: number;
  status: 'Occupied' | 'Vacant' | 'Maintenance' | 'Reserved';
  currentVessel?: Vessel;
  craneCount: number;
  opsProgressPercent?: number;
  cargoActivity?: 'Loading' | 'Unloading' | 'Idle' | 'Inspection';
  estimatedVacancy: string;
}

export interface ArrivalScheduleItem {
  id: string;
  vessel: Vessel;
  scheduledArrival: string; // ISO date format
  timeWindow: '0-24h' | '24-48h' | '48-72h';
  assignedBerth: string;
  delayRisk: 'Low' | 'Medium' | 'High';
  pilotBooked: boolean;
  tugboatsAssigned: number;
}

export interface CongestionHistoryPoint {
  date: string;
  congestionRate: number; // percentage 0-100
  waitingVessels: number;
  avgWaitHours: number;
  disruption?: DisruptionEvent;
}

export interface PortData {
  id: string;
  name: string;
  code: string;
  country: string;
  countryCode: string;
  region: string;
  lat: number;
  lng: number;
  congestionRate: number; // percentage 0-100
  status: CongestionStatus;
  dockedVessels: number;
  waitingVessels: number;
  avgWaitHours: number;
  totalBerths: number;
  occupiedBerths: number;
  anchoringCount: number;
  throughputTEU24h: number;
  weatherCondition: string;
  temperatureC: number;
  windSpeedKnots: number;
  visibilityKm: number;
  berths: Berth[];
  arrivals72h: ArrivalScheduleItem[];
  congestionHistory: CongestionHistoryPoint[];
  activeDisruptions: DisruptionEvent[];
  lastUpdated: string;
}
