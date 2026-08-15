// frontend/src/shared/mock/rerouteMockData.ts
// Mock Dataset for Page 1.3 — Reroute Recommendation Page & Monte Carlo Simulation
// FASTAPI REPLACEMENT POINT: Replace mock data with backend API endpoints:
// POST /api/v1/reroute/simulate (Runs Monte Carlo 2,000 route iterations)
// GET /api/v1/reroute/dijkstra-compare
// POST /api/v1/reports/pdf (Generates PDF export report)

import { SimulationResult, SimulatedPoint } from '../../types';

export const MOCK_CARGO_TYPES = [
  'High-Tech Consumer Electronics',
  'Pharmaceuticals & Medical Devices',
  'Automotive Components & Lithium Batteries',
  'Crude Oil & Refined Petroleum Products',
  'Refrigerated Food & Agricultural Goods',
  'Heavy Industrial Machinery & Solar Equipment',
];

// Helper to generate representative 120 scatter cloud points around realistic cost/time curves
const generateScatterCloud = (): SimulatedPoint[] => {
  const points: SimulatedPoint[] = [
    // Top 3 distinct highlighted points
    {
      id: 'pt-top-1',
      cost: 142500,
      time: 11.5,
      confidence: 96,
      risk: 'low',
      isTop3: true,
      rank: 1,
      routeName: '#1 Multimodal Sea-Rail Express',
      modeLabel: 'Sea (75%) + Rail (20%) + Air (5%)',
      isParetoOptimal: true,
    },
    {
      id: 'pt-top-2',
      cost: 158200,
      time: 16.2,
      confidence: 91,
      risk: 'low',
      isTop3: true,
      rank: 2,
      routeName: '#2 Sea Cape Bypass via South Africa',
      modeLabel: 'Pure Sea (100%)',
      isParetoOptimal: true,
    },
    {
      id: 'pt-top-3',
      cost: 215000,
      time: 4.2,
      confidence: 98,
      risk: 'low',
      isTop3: true,
      rank: 3,
      routeName: '#3 Sea-Air Hybrid Airlift (Dubai DWC)',
      modeLabel: 'Sea (40%) + Air (60%)',
      isParetoOptimal: true,
    },
  ];

  // Naive Dijkstra point for plot comparison
  points.push({
    id: 'pt-dijkstra',
    cost: 186000,
    time: 18.5,
    confidence: 42,
    risk: 'critical',
    isTop3: false,
    routeName: 'Naive Dijkstra Shortest Path (High Risk Direct Red Sea)',
    modeLabel: 'Direct Suez (100% Sea - High Risk Zone)',
  });

  // Seed 100 simulation background cloud points representing Monte Carlo distribution
  const risks: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
  for (let i = 1; i <= 100; i++) {
    // Inverse relationship between time and cost (faster costs more, slower costs less, with noise)
    const baseTime = 5 + (i * 0.15) + (Math.random() * 1.5 - 0.75);
    const baseCost = Math.round(260000 - (baseTime * 7200) + (Math.random() * 25000 - 12500));
    const confidence = Math.round(65 + Math.random() * 32);
    const risk = risks[i % 4];

    points.push({
      id: `pt-cloud-${i}`,
      cost: Math.max(110000, baseCost),
      time: parseFloat(baseTime.toFixed(1)),
      confidence,
      risk,
      isTop3: false,
      isParetoOptimal: i % 12 === 0,
      routeName: `Simulated Scenario #${100 + i}`,
      modeLabel: i % 3 === 0 ? 'Sea-Rail' : i % 5 === 0 ? 'Sea-Air' : 'Maritime Bypass',
    });
  }

  return points;
};

export const MOCK_INITIAL_SIMULATION_RESULT: SimulationResult = {
  request: {
    origin_port: 'port-suez',
    destination_port: 'port-rotterdam',
    vessel_id: 'vessel-ever-given',
    cargo_type: 'High-Tech Consumer Electronics',
    priority: 'Balanced',
    disruption_to_avoid: 'disruption-red-sea-critical',
  },
  total_simulations_run: 2000,
  recommended_routes: [
    {
      id: 'route-rec-1',
      rank: 1,
      is_recommended: true,
      title: 'Multimodal Sea-Rail Express via Salalah & Trieste',
      mode_breakdown: { sea: 75, rail: 20, air: 5 },
      waypoints: [
        [54.0, 16.94], // Salalah
        [45.65, 13.77], // Trieste
        [8.54, 50.03], // Frankfurt
        [4.14, 51.94], // Rotterdam
      ],
      waypoint_names: [
        'Port of Salalah (Oman)',
        'Port of Trieste Intermodal Hub (Italy)',
        'Frankfurt Railway Freight Depot (Germany)',
        'Port of Rotterdam Gateway (Netherlands)',
      ],
      total_cost_usd: 142500,
      total_time_days: 11.5,
      confidence_score: 96,
      risk_level: 'low',
      co2_carbon_footprint_tons: 310,
      savings_vs_original: {
        cost_usd: 18400,
        time_days: 3.5,
      },
      transit_summary: 'Discharge at Salalah Hub -> High-speed container feeder to Adriatic Trieste -> Block-train express to Benelux logistics hub.',
      carrier_name: 'Maersk / DB Cargo Intermodal Alliance',
      strategy_label: 'Most Resilient',
      ml_risk_score: 0.12,
    },
    {
      id: 'route-rec-2',
      rank: 2,
      is_recommended: false,
      title: 'Maritime Sea Bypass via Cape of Good Hope',
      mode_breakdown: { sea: 100, rail: 0, air: 0 },
      waypoints: [
        [54.0, 16.94],
        [18.42, -33.92], // Cape Town
        [-14.3, 11.9], // Atlantic
        [4.14, 51.94],
      ],
      waypoint_names: [
        'Arabian Sea Outer Transit',
        'Cape Town Offshore Bunkering Station (South Africa)',
        'Canary Islands Atlantic Pass',
        'Port of Rotterdam Gateway (Netherlands)',
      ],
      total_cost_usd: 158200,
      total_time_days: 16.2,
      confidence_score: 91,
      risk_level: 'low',
      co2_carbon_footprint_tons: 480,
      savings_vs_original: {
        cost_usd: 9200,
        time_days: -1.2,
      },
      transit_summary: 'Pure ocean voyage circumnavigating African continent. Completely bypasses Red Sea & Suez chokepoint hazards.',
      carrier_name: 'MSC Global Ocean Express',
      strategy_label: 'Cheapest',
      ml_risk_score: 0.18,
    },
    {
      id: 'route-rec-3',
      rank: 3,
      is_recommended: false,
      title: 'Sea-Air Emergency Airlift via Dubai DWC Air Hub',
      mode_breakdown: { sea: 40, rail: 0, air: 60 },
      waypoints: [
        [55.06, 24.98], // Jebel Ali
        [55.16, 24.89], // DWC Airport
        [8.57, 50.03], // Frankfurt Airport
        [4.14, 51.94],
      ],
      waypoint_names: [
        'Jebel Ali Port (Dubai, UAE)',
        'Dubai World Central Airport (DWC Cargo Terminal)',
        'Frankfurt Airport Cargo City (Germany)',
        'Rotterdam Final Mile Distribution Center',
      ],
      total_cost_usd: 215000,
      total_time_days: 4.2,
      confidence_score: 98,
      risk_level: 'low',
      co2_carbon_footprint_tons: 890,
      savings_vs_original: {
        cost_usd: -54000,
        time_days: 10.8,
      },
      transit_summary: 'Sea transport to Dubai -> Rapid offload & air charter via Boeing 77F to Frankfurt -> Express trucking to Rotterdam.',
      carrier_name: 'Emirates SkyCargo & CMA CGM Air Cargo',
      strategy_label: 'Fastest',
      ml_risk_score: 0.09,
    },
  ],
  scatter_cloud: generateScatterCloud(),
  dijkstra_comparison: {
    route_name: 'Standard Naive Dijkstra Shortest Path (Direct Red Sea / Suez)',
    cost_usd: 186000,
    time_days: 18.5,
    risk_level: 'critical',
    co2_tons: 410,
    bottlenecks: [
      'Bab-el-Mandeb Armed Missile Attack Hazard Zone',
      'Suez Canal Anchorage Bottleneck Queue',
      'War Risk Insurance Premium Surcharge (+$45,000/voyage)',
    ],
    details: 'Traditional shortest-distance Dijkstra optimization ignores real-time threat surfaces, routing directly through active Houthi missile engagement zones. This results in 6+ days of military convoy hold delay and severe insurance penalties.',
    mc_diff: {
      cost_saved_usd: 43500,
      time_saved_days: 7.0,
      risk_reduction: 'Critical Hazard Zone -> Low Risk Verified',
    },
  },
};
