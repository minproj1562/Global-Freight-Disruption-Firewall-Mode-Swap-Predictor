import {
  ROISnapshot,
  ExecutiveSummaryKPIs,
  MonthlySavingsPoint,
  DisruptionTypeBreakdown,
  RiskMatrixEntry,
  RegionalExposure,
  HighRiskDisruption,
  DecisionAuditEntry
} from '../../types/executiveSummaryTypes';

// API REPLACEMENT: GET /api/v1/executive-summary/roi-snapshot
export const MOCK_ROI_SNAPSHOT: ROISnapshot = {
  costSavedINR: 12.4,
  daysSaved: 47,
  periodLabel: 'October 2026'
};

// API REPLACEMENT: GET /api/v1/executive-summary/kpis
export const MOCK_EXECUTIVE_KPIS: ExecutiveSummaryKPIs = {
  costSavedThisMonth: 2840000,
  routesRerouted: 23,
  avgDecisionTimeMinutes: 4.2,
  activeDisruptions: 7,
  vesselsAtRisk: 12
};

// API REPLACEMENT: GET /api/v1/executive-summary/monthly-savings
export const MOCK_MONTHLY_SAVINGS: MonthlySavingsPoint[] = [
  { month: 'Jan', savings: 180000, rerouteCost: 45000 },
  { month: 'Feb', savings: 150000, rerouteCost: 40000 },
  { month: 'Mar', savings: 320000, rerouteCost: 75000 },
  { month: 'Apr', savings: 210000, rerouteCost: 50000 },
  { month: 'May', savings: 230000, rerouteCost: 55000 },
  { month: 'Jun', savings: 190000, rerouteCost: 48000 },
  { month: 'Jul', savings: 410000, rerouteCost: 80000 },
  { month: 'Aug', savings: 280000, rerouteCost: 65000 },
  { month: 'Sep', savings: 250000, rerouteCost: 60000 },
  { month: 'Oct', savings: 450000, rerouteCost: 80000 },
  { month: 'Nov', savings: 290000, rerouteCost: 68000 },
  { month: 'Dec', savings: 220000, rerouteCost: 52000 },
];

// API REPLACEMENT: GET /api/v1/executive-summary/disruption-breakdown
export const MOCK_DISRUPTION_BREAKDOWN: DisruptionTypeBreakdown[] = [
  { type: 'Geopolitical', count: 8, color: '#6366F1' },
  { type: 'Weather', count: 12, color: '#38BDF8' },
  { type: 'Labor Strike', count: 4, color: '#FBBF24' },
  { type: 'Canal Blockage', count: 3, color: '#34D399' },
  { type: 'Port Congestion', count: 6, color: '#F472B6' },
];

// API REPLACEMENT: GET /api/v1/executive-summary/risk-matrix
export const MOCK_RISK_MATRIX_ENTRIES: RiskMatrixEntry[] = [
  { id: 'RM001', name: 'Red Sea Armed Activity', likelihood: 85, impact: 90, financialExposure: 18000000, severity: 'critical', category: 'Geopolitical' },
  { id: 'RM002', name: 'Typhoon Yagi — South China Sea', likelihood: 90, impact: 85, financialExposure: 12500000, severity: 'critical', category: 'Weather' },
  { id: 'RM003', name: 'Suez Canal Obstruction Risk', likelihood: 25, impact: 95, financialExposure: 15000000, severity: 'high', category: 'Canal Blockage' },
  { id: 'RM004', name: 'Durban Port Workers Strike', likelihood: 70, impact: 40, financialExposure: 3200000, severity: 'medium', category: 'Labor Strike' },
  { id: 'RM005', name: 'Strait of Hormuz Tensions', likelihood: 60, impact: 80, financialExposure: 14000000, severity: 'high', category: 'Geopolitical' },
  { id: 'RM006', name: 'Panama Canal Drought', likelihood: 80, impact: 65, financialExposure: 8500000, severity: 'high', category: 'Weather' },
  { id: 'RM007', name: 'Mediterranean Storm Season', likelihood: 45, impact: 35, financialExposure: 2100000, severity: 'medium', category: 'Weather' },
  { id: 'RM008', name: 'Shanghai Port Cyber Threat', likelihood: 15, impact: 70, financialExposure: 9000000, severity: 'medium', category: 'Cyber' },
  { id: 'RM009', name: 'Bab-el-Mandeb Drone Attacks', likelihood: 75, impact: 90, financialExposure: 16500000, severity: 'critical', category: 'Geopolitical' },
  { id: 'RM010', name: 'East Africa Piracy Corridor', likelihood: 20, impact: 45, financialExposure: 1500000, severity: 'low', category: 'Geopolitical' },
  { id: 'RM011', name: 'Rotterdam Labor Action', likelihood: 35, impact: 30, financialExposure: 2800000, severity: 'low', category: 'Labor Strike' },
  { id: 'RM012', name: 'Indian Ocean Monsoon', likelihood: 65, impact: 25, financialExposure: 800000, severity: 'low', category: 'Weather' }
];

// API REPLACEMENT: GET /api/v1/executive-summary/regional-exposure
export const MOCK_REGIONAL_EXPOSURE: RegionalExposure[] = [
  { regionName: 'Southeast Asia', regionCode: 'SEA', cargoValueAtRisk: 14200000, coordinates: [104.0, 1.3], affectedRoutes: 12 },
  { regionName: 'Middle East', regionCode: 'ME', cargoValueAtRisk: 11800000, coordinates: [51.5, 25.3], affectedRoutes: 9 },
  { regionName: 'East Africa', regionCode: 'EA', cargoValueAtRisk: 6400000, coordinates: [39.3, -6.8], affectedRoutes: 5 },
  { regionName: 'Mediterranean', regionCode: 'MED', cargoValueAtRisk: 8900000, coordinates: [14.5, 35.9], affectedRoutes: 7 },
  { regionName: 'North Europe', regionCode: 'NE', cargoValueAtRisk: 16100000, coordinates: [4.5, 52.4], affectedRoutes: 15 },
  { regionName: 'West Africa', regionCode: 'WA', cargoValueAtRisk: 4200000, coordinates: [-3.0, 6.3], affectedRoutes: 4 },
  { regionName: 'South America', regionCode: 'SA', cargoValueAtRisk: 5700000, coordinates: [-43.2, -22.9], affectedRoutes: 6 },
  { regionName: 'Indian Subcontinent', regionCode: 'ISC', cargoValueAtRisk: 9300000, coordinates: [72.8, 19.1], affectedRoutes: 8 }
];

// API REPLACEMENT: GET /api/v1/executive-summary/high-risk-disruptions
export const MOCK_HIGH_RISK_DISRUPTIONS: HighRiskDisruption[] = [
  { id: 'HRD001', name: 'Red Sea Drone Activity Escalation', financialExposure: 18200000, mitigationStatus: 'Mitigating', severity: 'critical', affectedRoutes: 8, region: 'Middle East' },
  { id: 'HRD002', name: 'Typhoon Yagi Trajectory Shift', financialExposure: 12400000, mitigationStatus: 'Monitoring', severity: 'high', affectedRoutes: 6, region: 'Southeast Asia' },
  { id: 'HRD003', name: 'Panama Canal Draft Restrictions', financialExposure: 8900000, mitigationStatus: 'Unmitigated', severity: 'high', affectedRoutes: 14, region: 'South America' },
  { id: 'HRD004', name: 'Hamburg Port Stevedore Strike', financialExposure: 5200000, mitigationStatus: 'Mitigated', severity: 'medium', affectedRoutes: 4, region: 'North Europe' },
  { id: 'HRD005', name: 'Cape of Good Hope Swells', financialExposure: 2400000, mitigationStatus: 'Monitoring', severity: 'medium', affectedRoutes: 12, region: 'East Africa' }
];

// API REPLACEMENT: GET /api/v1/executive-summary/decision-audit
export const MOCK_DECISION_AUDIT: DecisionAuditEntry[] = [
  {
    id: 'DA001',
    timestamp: '2026-10-06T14:22:00Z',
    user: 'Capt. Arjun Mehta',
    route: 'Mumbai -> Rotterdam',
    alternativesConsidered: ['Via Cape of Good Hope', 'Air Freight Portions'],
    rationale: 'Rerouted via Cape of Good Hope to avoid elevated risk in the Red Sea. Although this added significant time, the financial exposure of the cargo warranted the safer, albeit longer, alternative.',
    predictedCostUSD: 145000,
    actualCostUSD: 148000,
    predictedTimeDays: 28,
    actualTimeDays: 29
  },
  {
    id: 'DA002',
    timestamp: '2026-10-05T09:15:00Z',
    user: 'Sarah Chen',
    route: 'Shanghai -> Los Angeles',
    alternativesConsidered: ['Hold at origin', 'Reroute to Seattle'],
    rationale: 'Maintained current route but reduced vessel speed to allow storm system to pass ahead of trajectory. Saves fuel and prevents structural damage.',
    predictedCostUSD: 12000,
    actualCostUSD: 11500,
    predictedTimeDays: 3,
    actualTimeDays: 3
  },
  {
    id: 'DA003',
    timestamp: '2026-10-04T16:45:00Z',
    user: 'Dr. Oluwaseun Adeyemi',
    route: 'Lagos -> New York',
    alternativesConsidered: ['Reroute to Savannah', 'Expedite clearing'],
    rationale: 'Accepted port congestion delays at destination. Savannah alternative would require complex inland transport exceeding the cost of maritime demurrage.',
    predictedCostUSD: 25000,
    actualCostUSD: 28000,
    predictedTimeDays: 5,
    actualTimeDays: 6
  },
  {
    id: 'DA004',
    timestamp: '2026-10-03T11:30:00Z',
    user: 'Lars Eriksson',
    route: 'Singapore -> Hamburg',
    alternativesConsidered: ['Air bridge via Dubai', 'Wait at Suez'],
    rationale: 'Initiated sea-air multimodal switch at Dubai. High-value tech cargo required meeting launch deadlines despite the exorbitant cost differential.',
    predictedCostUSD: 210000,
    actualCostUSD: 205000,
    predictedTimeDays: 8,
    actualTimeDays: 7
  },
  {
    id: 'DA005',
    timestamp: '2026-10-02T13:10:00Z',
    user: 'Priya Sharma',
    route: 'Chennai -> Jebel Ali',
    alternativesConsidered: ['Delay departure', 'Use smaller vessels'],
    rationale: 'Delayed departure by 24 hours to avoid a severe cyclonic storm in the Bay of Bengal. Minimal cost impact but guaranteed vessel safety.',
    predictedCostUSD: 5000,
    actualCostUSD: 5000,
    predictedTimeDays: 1,
    actualTimeDays: 1
  },
  {
    id: 'DA006',
    timestamp: '2026-10-01T08:45:00Z',
    user: 'Capt. Arjun Mehta',
    route: 'Ningbo -> Felixstowe',
    alternativesConsidered: ['Divert to Antwerp', 'Divert to London Gateway'],
    rationale: 'Diverted to Antwerp due to sudden wildcat strike at Felixstowe. Secured rail transport to UK to minimize final delivery delay.',
    predictedCostUSD: 45000,
    actualCostUSD: 49000,
    predictedTimeDays: 4,
    actualTimeDays: 5
  },
  {
    id: 'DA007',
    timestamp: '2026-09-30T15:20:00Z',
    user: 'Sarah Chen',
    route: 'Busan -> Sydney',
    alternativesConsidered: ['Reroute via Solomon Sea', 'Maintain course'],
    rationale: 'Maintained course but increased speed to outrun developing low-pressure system. Increased bunker consumption offset by avoiding a 3-day detour.',
    predictedCostUSD: 18000,
    actualCostUSD: 19500,
    predictedTimeDays: 0,
    actualTimeDays: 0
  },
  {
    id: 'DA008',
    timestamp: '2026-09-29T10:05:00Z',
    user: 'Lars Eriksson',
    route: 'Rotterdam -> Santos',
    alternativesConsidered: ['Cancel voyage', 'Combine with next sailing'],
    rationale: 'Combined cargo with the next sailing due to severe vessel cascading delays. Apologized to clients and offered discounted freight for the inconvenience.',
    predictedCostUSD: 35000,
    actualCostUSD: 32000,
    predictedTimeDays: 7,
    actualTimeDays: 7
  },
  {
    id: 'DA009',
    timestamp: '2026-09-28T14:40:00Z',
    user: 'Dr. Oluwaseun Adeyemi',
    route: 'Houston -> Rio de Janeiro',
    alternativesConsidered: ['Reroute via Caribbean', 'Wait out hurricane'],
    rationale: 'Waited out Hurricane entering the Gulf. Sailed immediately after the system passed, utilizing the calm wake. Safest and most cost-effective option.',
    predictedCostUSD: 15000,
    actualCostUSD: 16000,
    predictedTimeDays: 2,
    actualTimeDays: 3
  },
  {
    id: 'DA010',
    timestamp: '2026-09-27T09:55:00Z',
    user: 'Priya Sharma',
    route: 'Tokyo -> Vancouver',
    alternativesConsidered: ['Southern Pacific route', 'Northern Pacific route'],
    rationale: 'Selected the Southern Pacific route despite it being historically longer, to avoid a series of severe North Pacific winter storms developing earlier than usual.',
    predictedCostUSD: 55000,
    actualCostUSD: 53000,
    predictedTimeDays: 5,
    actualTimeDays: 4
  }
];
