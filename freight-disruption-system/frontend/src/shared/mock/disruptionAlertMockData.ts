// frontend/src/shared/mock/disruptionAlertMockData.ts
// Comprehensive Mock Dataset for Page 1.2 — Disruption Alert Center
// FASTAPI REPLACEMENT POINT: Replace mock dataset with API endpoints:
// GET /api/v1/disruptions
// POST /api/v1/disruptions/{id}/acknowledge
// POST /api/v1/disruptions/{id}/resolve
// GET /api/v1/disruptions/{id}/affected-vessels

import { Disruption } from '../../types';
import { MOCK_VESSELS } from './mockData';

export const MOCK_DISRUPTION_ALERTS: Disruption[] = [
  {
    id: 'disruption-red-sea-critical',
    name: 'Red Sea — Houthi Anti-Ship Missile Danger Zone',
    type: 'Geopolitical / Armed Activity',
    category: 'geopolitical',
    severity: 'critical',
    status: 'unacknowledged',
    description: 'Active Houthi anti-ship ballistic missile and kamikaze drone strikes targeting commercial container shipping in the Bab-el-Mandeb Strait. Naval escorts engaged.',
    location_name: 'Bab-el-Mandeb Strait (Red Sea)',
    polygon_coordinates: [
      [42.5, 15.5],
      [43.8, 13.8],
      [43.3, 12.2],
      [41.5, 12.5],
      [40.8, 14.5],
      [42.5, 15.5],
    ],
    affected_vessels_count: 18,
    active_since: '2026-08-02 20:30',
    time_since_detected: '14 mins ago',
    estimated_duration_remaining: '14 days remaining',
    mitigation_advice: 'Reroute vessels via Cape of Good Hope or trigger multimodal Sea -> Air transfer at Jebel Ali / Salalah.',
    is_new: true,
    predicted_ripple_ports: ['ZADUR', 'EGPSD', 'OMSLL', 'AEJEA'],
    ripple_predictions: [
      { port_code: 'ZADUR', port_name: 'Port of Durban', congestion_increase_pct: 35, delay_days: { d3: 2, d7: 3, d14: 4.5 } },
      { port_code: 'EGPSD', port_name: 'Port Said', congestion_increase_pct: 18, delay_days: { d3: 1.5, d7: 5, d14: 7 } },
      { port_code: 'OMSLL', port_name: 'Port of Salalah', congestion_increase_pct: 28, delay_days: { d3: 1, d7: 2.5, d14: 4 } },
      { port_code: 'AEJEA', port_name: 'Jebel Ali Port', congestion_increase_pct: 22, delay_days: { d3: 0.5, d7: 2, d14: 3.5 } },
    ],
    financial_impact_usd: 48500000,
    affected_vessels_list: [
      MOCK_VESSELS[0], // EVER GIVEN
      MOCK_VESSELS[7], // MSC GULSUN
      MOCK_VESSELS[8], // AL JASRAH
      MOCK_VESSELS[1], // MAERSK MC-KINNEY
    ],
    recommended_action: {
      id: 'rec-act-1',
      disruption_id: 'disruption-red-sea-critical',
      summary: 'Reroute 4 ultra-large container vessels via Cape of Good Hope — estimated 3.5-day delay avoided vs waiting in high-risk zone',
      action_type: 'Reroute Sea Cape',
      estimated_delay_avoided_days: 3.5,
      estimated_cost_delta_usd: 12400,
      affected_vessels_count: 4,
      confidence_score: 96,
    },
  },
  {
    id: 'disruption-panama-canal',
    name: 'Panama Canal — Severe Gatun Lake Water Level Restriction',
    type: 'Canal & Chokepoint Restriction',
    category: 'canal',
    severity: 'high',
    status: 'unacknowledged',
    description: 'Gatun Lake reservoir level dropped to 3.1m below seasonal average. Transit bookings capped at 24 vessels/day. Max draught limited to 44 feet.',
    location_name: 'Panama Canal Locks (Panama)',
    polygon_coordinates: [
      [-80.2, 9.4],
      [-79.5, 9.1],
      [-79.4, 8.8],
      [-80.0, 8.7],
      [-80.3, 9.1],
      [-80.2, 9.4],
    ],
    affected_vessels_count: 14,
    active_since: '2026-08-02 18:45',
    time_since_detected: '2 hours ago',
    estimated_duration_remaining: '28 days remaining',
    mitigation_advice: 'Unload non-essential TEUs at Balboa terminal for Panama Canal Railway land-bridge transshipment.',
    is_new: true,
    predicted_ripple_ports: ['USLAX', 'COBUN', 'MXMAN'],
    ripple_predictions: [
      { port_code: 'USLAX', port_name: 'Port of Los Angeles', congestion_increase_pct: 25, delay_days: { d3: 1.5, d7: 3, d14: 5 } },
      { port_code: 'COBUN', port_name: 'Port of Buenaventura', congestion_increase_pct: 15, delay_days: { d3: 1, d7: 2, d14: 3 } },
      { port_code: 'MXMAN', port_name: 'Port of Manzanillo', congestion_increase_pct: 12, delay_days: { d3: 0.5, d7: 1.5, d14: 2.5 } },
    ],
    financial_impact_usd: 32100000,
    affected_vessels_list: [
      MOCK_VESSELS[2], // CMA CGM ANTOINE
      MOCK_VESSELS[14], // SANTOS EXPRESS
    ],
    recommended_action: {
      id: 'rec-act-2',
      disruption_id: 'disruption-panama-canal',
      summary: 'Trigger Sea-Rail Transshipment at Balboa Port to bypass 48-hour canal transit lock queue',
      action_type: 'Sea -> Rail',
      estimated_delay_avoided_days: 2.2,
      estimated_cost_delta_usd: 8500,
      affected_vessels_count: 2,
      confidence_score: 92,
    },
  },
  {
    id: 'disruption-typhoon-shanghai',
    name: 'East China Sea — Severe Typhoon Maritime Hazard',
    type: 'Extreme Weather Hazard',
    category: 'weather',
    severity: 'high',
    status: 'acknowledged',
    description: 'Typhoon Gaemi generating 9-meter wave swells and 65-knot winds approaching Yangtze River estuary. Port of Shanghai outer anchorage suspended.',
    location_name: 'Yangtze River Estuary / Shanghai Outer Roads',
    polygon_coordinates: [
      [121.8, 31.5],
      [123.5, 31.2],
      [123.2, 29.8],
      [121.5, 30.1],
      [121.8, 31.5],
    ],
    affected_vessels_count: 12,
    active_since: '2026-08-02 15:00',
    time_since_detected: '5 hours ago',
    estimated_duration_remaining: '3 days remaining',
    mitigation_advice: 'Hold anchorage at Ningbo-Zhoushan protected deepwater bay or delay departure by 36 hours.',
    is_new: false,
    predicted_ripple_ports: ['CNNGB', 'KRPUS'],
    ripple_predictions: [
      { port_code: 'CNNGB', port_name: 'Port of Ningbo-Zhoushan', congestion_increase_pct: 40, delay_days: { d3: 2.5, d7: 4, d14: 5.5 } },
      { port_code: 'KRPUS', port_name: 'Port of Busan', congestion_increase_pct: 15, delay_days: { d3: 1, d7: 2, d14: 3 } },
    ],
    financial_impact_usd: 21800000,
    affected_vessels_list: [
      MOCK_VESSELS[3], // FRONT ALTAIR
      MOCK_VESSELS[13], // GLOBE TROTTER
    ],
    recommended_action: {
      id: 'rec-act-3',
      disruption_id: 'disruption-typhoon-shanghai',
      summary: 'Divert vessels to Ningbo-Zhoushan deepwater anchorage until typhoon wave swell diminishes below 3.5m',
      action_type: 'Port Diversion',
      estimated_delay_avoided_days: 1.8,
      estimated_cost_delta_usd: 4200,
      affected_vessels_count: 2,
      confidence_score: 89,
    },
  },
  {
    id: 'disruption-la-strike-labor',
    name: 'US West Coast — San Pedro Bay Terminal Labor Slowdown',
    type: 'Port Labor Dispute',
    category: 'labor',
    severity: 'medium',
    status: 'unacknowledged',
    description: 'Intermittent labor strikes and crane operator slowdowns at San Pedro Bay container terminals causing anchorage queue times of 38+ hours.',
    location_name: 'Port of Los Angeles & Long Beach (USLAX)',
    polygon_coordinates: [
      [-118.4, 33.8],
      [-118.1, 33.8],
      [-118.1, 33.6],
      [-118.4, 33.6],
      [-118.4, 33.8],
    ],
    affected_vessels_count: 7,
    active_since: '2026-08-01 10:00',
    time_since_detected: '1 day ago',
    estimated_duration_remaining: '5 days remaining',
    mitigation_advice: 'Divert intermodal cargo to Port of Oakland or Prince Rupert for US Midwest BNSF/UP rail connection.',
    is_new: false,
    predicted_ripple_ports: ['USOAK', 'CAPRR'],
    ripple_predictions: [
      { port_code: 'USOAK', port_name: 'Port of Oakland', congestion_increase_pct: 30, delay_days: { d3: 2, d7: 3.5, d14: 5 } },
      { port_code: 'CAPRR', port_name: 'Port of Prince Rupert', congestion_increase_pct: 18, delay_days: { d3: 1, d7: 2, d14: 3 } },
    ],
    financial_impact_usd: 15200000,
    affected_vessels_list: [
      MOCK_VESSELS[5], // COSCO SHIPPING UNIVERSE
      MOCK_VESSELS[11], // OCEAN GUARDIAN
    ],
    recommended_action: {
      id: 'rec-act-4',
      disruption_id: 'disruption-la-strike-labor',
      summary: 'Divert priority cargo to Port of Oakland for expedited intermodal rail dispatch',
      action_type: 'Port Diversion',
      estimated_delay_avoided_days: 2.5,
      estimated_cost_delta_usd: 6800,
      affected_vessels_count: 2,
      confidence_score: 94,
    },
  },
  {
    id: 'disruption-hormuz-security',
    name: 'Strait of Hormuz — Maritime Security Advisory Level 3',
    type: 'Geopolitical & Maritime Security',
    category: 'geopolitical',
    severity: 'medium',
    status: 'acknowledged',
    description: 'Elevated naval patrol activity, electronic GPS spoofing, and AIS interference reported in shipping lanes near Greater Tunb Island.',
    location_name: 'Strait of Hormuz (Persian Gulf)',
    polygon_coordinates: [
      [55.8, 26.8],
      [57.0, 26.5],
      [56.8, 25.8],
      [55.5, 25.9],
      [55.8, 26.8],
    ],
    affected_vessels_count: 9,
    active_since: '2026-07-31 08:00',
    time_since_detected: '2 days ago',
    estimated_duration_remaining: '10 days remaining',
    mitigation_advice: 'Maintain maximum sea speed (18+ kts) and engage continuous visual and radar lookout.',
    is_new: false,
    predicted_ripple_ports: ['AEJEA', 'INMUN'],
    ripple_predictions: [
      { port_code: 'AEJEA', port_name: 'Jebel Ali Port', congestion_increase_pct: 20, delay_days: { d3: 1, d7: 2, d14: 3 } },
      { port_code: 'INMUN', port_name: 'Port of Mumbai', congestion_increase_pct: 12, delay_days: { d3: 0.5, d7: 1.5, d14: 2 } },
    ],
    financial_impact_usd: 18700000,
    affected_vessels_list: [
      MOCK_VESSELS[9], // SIRIUS STAR
    ],
    recommended_action: {
      id: 'rec-act-5',
      disruption_id: 'disruption-hormuz-security',
      summary: 'Conduct high-speed convoy transit with secondary satellite GPS tracking enabled',
      action_type: 'Reroute Sea Cape',
      estimated_delay_avoided_days: 1.0,
      estimated_cost_delta_usd: 3500,
      affected_vessels_count: 1,
      confidence_score: 87,
    },
  },
  {
    id: 'disruption-english-fog',
    name: 'English Channel — Dense Fog & Low Visibility Warning',
    type: 'Weather & Visibility Hazard',
    category: 'weather',
    severity: 'low',
    status: 'acknowledged',
    description: 'Dense sea fog in Dover Strait reducing visual range to under 0.2 nautical miles. Vessel speed restrictions enforced by UK & French coastguards.',
    location_name: 'Strait of Dover (English Channel)',
    polygon_coordinates: [
      [1.1, 51.2],
      [1.8, 51.0],
      [1.4, 50.7],
      [0.8, 50.9],
      [1.1, 51.2],
    ],
    affected_vessels_count: 4,
    active_since: '2026-08-02 16:00',
    time_since_detected: '4 hours ago',
    estimated_duration_remaining: '12 hours remaining',
    mitigation_advice: 'Reduce speed to safe navigation rate (10 kts) and maintain radar plotting.',
    is_new: false,
    predicted_ripple_ports: ['GBFXT'],
    ripple_predictions: [
      { port_code: 'GBFXT', port_name: 'Port of Felixstowe', congestion_increase_pct: 8, delay_days: { d3: 0.2, d7: 0.3, d14: 0.4 } },
    ],
    financial_impact_usd: 2400000,
    affected_vessels_list: [
      MOCK_VESSELS[12], // ATLANTIC SEA
    ],
    recommended_action: {
      id: 'rec-act-6',
      disruption_id: 'disruption-english-fog',
      summary: 'Adjust ETA window by +4 hours and alert Felixstowe port dispatch of reduced transit speed',
      action_type: 'Port Diversion',
      estimated_delay_avoided_days: 0.2,
      estimated_cost_delta_usd: 800,
      affected_vessels_count: 1,
      confidence_score: 98,
    },
  },
];
