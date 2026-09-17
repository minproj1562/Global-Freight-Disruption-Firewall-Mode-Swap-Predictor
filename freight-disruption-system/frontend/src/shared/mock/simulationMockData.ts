// frontend/src/shared/mock/simulationMockData.ts
// Mock data for Dashboard 2: Analytics & Simulation Lab
// Aligned with NSGA-II Multi-Objective Optimization & Monte Carlo Engine

export interface ScenarioResultItem {
  id: string;
  name: string;
  fuelPriceUsd: number;
  congestionPct: number;
  origin: string;
  destination: string;
  vessel: string;
  disruptionTemplate: string;
  rerouteStrategy: string;
  costUsd: number;
  timeHours: number;
  carbonTons: number;
  riskScorePct: number;
  status: 'optimal' | 'acceptable' | 'high-risk';
}

export interface ConvergencePoint {
  runNumber: number;
  avgCostUsd: number;
  upperCi: number;
  lowerCi: number;
  isStable: boolean;
}

export interface HistogramBin {
  costRange: string;
  minCost: number;
  maxCost: number;
  frequency: number;
}

export interface CandidateRouteOverlay {
  id: string;
  name: string;
  costUsd: number;
  color: string;
  type: 'ocean' | 'multimodal' | 'bypass';
  transitDays: number;
}

export interface OutlierEvent {
  title: string;
  type: 'best' | 'worst' | 'black-swan';
  costUsd: number;
  timeDays: number;
  probabilityPct: number;
  description: string;
  mitigationStrategy: string;
  multiplierVsMedian?: number;
}

export interface Pareto3DPoint {
  id: string;
  name: string;
  costUsd: number; // X axis
  timeHours: number; // Y axis
  carbonTons: number; // Z axis
  isPareto: boolean; // Green if optimal, Gray if dominated
  strategy: 'Cheapest' | 'Balanced' | 'Fastest' | 'Lowest Carbon' | 'Dominated';
  modeBreakdown: {
    sea: number;
    rail: number;
    air: number;
    road: number;
  };
  chokepointsBypassed: string[];
  riskIndex: number; // 0 to 1
  feasibilityScore: number; // 0 to 100
}

// 1. DISRUPTION TEMPLATES
export const MOCK_DISRUPTIONS_STUDIO = [
  { id: 'suez-blockade', name: 'Suez Canal Blockade (Severe Chokepoint Shut)', severity: 'critical', delayDays: 12 },
  { id: 'panama-drought', name: 'Panama Canal Drought (Draft Restrictions)', severity: 'high', delayDays: 8 },
  { id: 'red-sea-conflict', name: 'Red Sea Geopolitical Armed Threat', severity: 'critical', delayDays: 14 },
  { id: 'babelmandeb-hazard', name: 'Bab el-Mandeb Strait Maritime Risk', severity: 'high', delayDays: 10 },
  { id: 'uswc-dock-strike', name: 'US West Coast Dockworkers Labor Strike', severity: 'medium', delayDays: 6 },
  { id: 'malacca-congestion', name: 'Malacca Strait Super-Tanker Congestion', severity: 'medium', delayDays: 4 },
];

export const MOCK_ORIGIN_PORTS = [
  { id: 'CNSHA', name: 'Shanghai (CNSHA)', country: 'China' },
  { id: 'CNNGB', name: 'Ningbo-舟山 (CNNGB)', country: 'China' },
  { id: 'SGSIN', name: 'Singapore (SGSIN)', country: 'Singapore' },
  { id: 'EGSZE', name: 'Suez Canal Hub (EGSZE)', country: 'Egypt' },
  { id: 'AEDXB', name: 'Jebel Ali, Dubai (AEDXB)', country: 'UAE' },
  { id: 'KRPUS', name: 'Busan (KRPUS)', country: 'South Korea' },
];

export const MOCK_DESTINATION_PORTS = [
  { id: 'NLRTM', name: 'Rotterdam (NLRTM)', country: 'Netherlands' },
  { id: 'DEHAM', name: 'Hamburg (DEHAM)', country: 'Germany' },
  { id: 'GBFXT', name: 'Felixstowe (GBFXT)', country: 'UK' },
  { id: 'BEANR', name: 'Antwerp (BEANR)', country: 'Belgium' },
  { id: 'USLAX', name: 'Los Angeles (USLAX)', country: 'USA' },
  { id: 'USNYC', name: 'New York (USNYC)', country: 'USA' },
];

export const MOCK_VESSEL_CHOICES = [
  { id: 'vessel-ever-given', name: 'Ever Given (Container - 20,124 TEU)' },
  { id: 'vessel-cma-antoine', name: 'CMA CGM Antoine de Saint Exupéry (20,600 TEU)' },
  { id: 'vessel-maersk-mckinney', name: 'Maersk Mc-Kinney Møller (18,270 TEU)' },
  { id: 'vessel-msc-oscar', name: 'MSC Oscar (19,224 TEU)' },
  { id: 'vessel-hmm-algeciras', name: 'HMM Algeciras (23,964 TEU)' },
];

// GENERATE 63 BATCH SCENARIOS (9 Fuel Prices x 7 Congestion Levels)
export const generateParameterSweepScenarios = (
  origin = 'Shanghai (CNSHA)',
  destination = 'Rotterdam (NLRTM)',
  vessel = 'Ever Given',
  disruptionTemplate = 'Suez Canal Blockade'
): ScenarioResultItem[] => {
  const fuelPrices = [400, 450, 500, 550, 600, 650, 700, 750, 800]; // 9 steps
  const congestions = [30, 40, 50, 60, 70, 80, 90]; // 7 steps

  const results: ScenarioResultItem[] = [];
  let index = 1;

  fuelPrices.forEach((fuel) => {
    congestions.forEach((cong) => {
      // Deterministic simulation math with realistic variations
      const baseCost = 110000;
      const fuelCostFactor = (fuel / 400) * 45000;
      const congestionCostFactor = (cong / 30) * 18000;
      const totalCost = Math.round(baseCost + fuelCostFactor + congestionCostFactor + (index % 7) * 1200);

      const baseTimeHours = 320;
      const timeHours = Math.round(baseTimeHours + (cong / 10) * 14 + (fuel < 600 ? 12 : -8));

      const carbonTons = Math.round(190 + (fuel / 100) * 12 + (cong / 10) * 4);
      const riskScore = Math.min(99, Math.round(20 + (cong * 0.7) + (fuel > 700 ? 15 : 5)));

      let status: 'optimal' | 'acceptable' | 'high-risk' = 'acceptable';
      if (totalCost < 165000 && riskScore < 50) status = 'optimal';
      else if (riskScore > 70 || totalCost > 210000) status = 'high-risk';

      const strategies = [
        'Direct Suez Deep Draft',
        'Cape of Good Hope Bypass',
        'Multimodal Sea-Rail (New Silk Road)',
        'Sea-Air Hybrid (Dubai Hub)',
        'Mediterranean Port Swap (Algeciras)',
      ];
      const rerouteStrategy = strategies[(index - 1) % strategies.length];

      results.push({
        id: `SCN-${String(index).padStart(3, '0')}`,
        name: `Sweep #${index}: Fuel $${fuel} | Congestion ${cong}%`,
        fuelPriceUsd: fuel,
        congestionPct: cong,
        origin,
        destination,
        vessel,
        disruptionTemplate,
        rerouteStrategy,
        costUsd: totalCost,
        timeHours,
        carbonTons,
        riskScorePct: riskScore,
        status,
      });

      index++;
    });
  });

  return results;
};

// 2. MONTE CARLO CONVERGENCE DATA (Runs 1 -> 5,000)
export const MOCK_CONVERGENCE_DATA: ConvergencePoint[] = Array.from({ length: 50 }, (_, i) => {
  const runNumber = (i + 1) * 100; // 100 to 5000
  // Oscillation damping formula to show convergence around 3,500 runs
  const damping = Math.exp(-i / 10);
  const noise = (Math.sin(i * 1.5) * 28000 + Math.cos(i * 0.7) * 14000) * damping;
  const avgCostUsd = Math.round(184500 + noise);
  const ciWidth = Math.round(35000 * damping + 4200);

  return {
    runNumber,
    avgCostUsd,
    upperCi: avgCostUsd + ciWidth,
    lowerCi: avgCostUsd - ciWidth,
    isStable: runNumber >= 3500,
  };
});

// MONTE CARLO COST HISTOGRAM BINS (5,000 runs)
export const MOCK_HISTOGRAM_DATA: HistogramBin[] = [
  { costRange: '$120k-$140k', minCost: 120000, maxCost: 140000, frequency: 140 },
  { costRange: '$140k-$160k', minCost: 140000, maxCost: 160000, frequency: 620 },
  { costRange: '$160k-$180k', minCost: 160000, maxCost: 180000, frequency: 1840 },
  { costRange: '$180k-$200k', minCost: 180000, maxCost: 200000, frequency: 1420 },
  { costRange: '$200k-$220k', minCost: 200000, maxCost: 220000, frequency: 650 },
  { costRange: '$220k-$240k', minCost: 220000, maxCost: 240000, frequency: 210 },
  { costRange: '$240k-$260k', minCost: 240000, maxCost: 260000, frequency: 85 },
  { costRange: '$260k-$280k', minCost: 260000, maxCost: 280000, frequency: 25 },
  { costRange: '>$280k', minCost: 280000, maxCost: 450000, frequency: 10 },
];

export const MOCK_MONTE_CARLO_STATS = {
  totalRuns: 5000,
  meanCostUsd: 185240,
  medianCostUsd: 181400,
  stdDevUsd: 24650,
  confidenceInterval95: {
    lower: 142000,
    upper: 238500,
  },
  stabilizedAtRun: 3500,
};

export const MOCK_TOP3_CANDIDATE_ROUTES: CandidateRouteOverlay[] = [
  {
    id: 'route-a',
    name: 'Route 1: Direct Ocean via Suez',
    costUsd: 172000,
    color: '#f59e0b', // Amber
    type: 'ocean',
    transitDays: 22,
  },
  {
    id: 'route-b',
    name: 'Route 2: Multimodal Sea-Rail Land Bridge',
    costUsd: 198500,
    color: '#38bdf8', // Sky
    type: 'multimodal',
    transitDays: 16,
  },
  {
    id: 'route-c',
    name: 'Route 3: Cape of Good Hope Bypass',
    costUsd: 245000,
    color: '#10b981', // Emerald
    type: 'bypass',
    transitDays: 31,
  },
];

// OUTLIER ANALYSIS (BEST, WORST, BLACK SWAN)
export const MOCK_OUTLIER_EVENTS: OutlierEvent[] = [
  {
    title: 'Best-Case Scenario (5th Percentile)',
    type: 'best',
    costUsd: 132000,
    timeDays: 14.5,
    probabilityPct: 4.8,
    description: 'Fair weather, zero berth waiting at Rotterdam/Hamburg, optimal slow-steaming fuel consumption.',
    mitigationStrategy: 'Pre-clear customs via digital twin EDI lock-in to capture early berth window.',
  },
  {
    title: 'Worst-Case Scenario (95th Percentile)',
    type: 'worst',
    costUsd: 268000,
    timeDays: 29.0,
    probabilityPct: 5.2,
    description: 'Heavy North Atlantic storm reroute + 7-day berth congestion lockup at destination port.',
    mitigationStrategy: 'Pre-book rail slot at feeder port (Algeciras) to bypass European port backlog.',
  },
  {
    title: 'Black Swan Event A: Double Strait Lockout + Bunker Fuel Spike',
    type: 'black-swan',
    costUsd: 412000,
    timeDays: 41.0,
    probabilityPct: 1.14,
    multiplierVsMedian: 2.27,
    description: 'Simultaneous Suez blockade & Bab el-Mandeb closure with bunker fuel spiking past $1,200/ton.',
    mitigationStrategy: 'Activate emergency Sea-Air swap via Dubai World Central for top 20% high-tier TEUs.',
  },
  {
    title: 'Black Swan Event B: Global Port Cyber Outage + Chokepoint Shutdown',
    type: 'black-swan',
    costUsd: 389000,
    timeDays: 36.5,
    probabilityPct: 0.88,
    multiplierVsMedian: 2.14,
    description: 'Ransomware collapse of major terminal TOS combined with naval blockade forces 3-stage rerouting.',
    mitigationStrategy: 'Fallback to manual paper bill of lading and secondary feeder barge networks.',
  },
];

// 3. NSGA-II 3D PARETO OPTIMIZER DATA
export const MOCK_PARETO_3D_POINTS: Pareto3DPoint[] = [
  // Pareto Optimal Points (Green)
  {
    id: 'pareto-1',
    name: 'Cheapest Route (Sea Heavy)',
    costUsd: 128500,
    timeHours: 540, // 22.5 days
    carbonTons: 310,
    isPareto: true,
    strategy: 'Cheapest',
    modeBreakdown: { sea: 90, rail: 0, air: 0, road: 10 },
    chokepointsBypassed: ['Cape of Good Hope Slow-Steam'],
    riskIndex: 0.28,
    feasibilityScore: 96,
  },
  {
    id: 'pareto-2',
    name: 'Balanced Sweet Spot (Sea + Rail Land Bridge)',
    costUsd: 184200,
    timeHours: 320, // 13.3 days
    carbonTons: 210,
    isPareto: true,
    strategy: 'Balanced',
    modeBreakdown: { sea: 65, rail: 25, air: 0, road: 10 },
    chokepointsBypassed: ['Suez Canal Bypass via Rail'],
    riskIndex: 0.18,
    feasibilityScore: 92,
  },
  {
    id: 'pareto-3',
    name: 'Fastest Route (Sea + Air Sprint)',
    costUsd: 295000,
    timeHours: 155, // 6.4 days
    carbonTons: 420,
    isPareto: true,
    strategy: 'Fastest',
    modeBreakdown: { sea: 30, rail: 0, air: 60, road: 10 },
    chokepointsBypassed: ['Suez Canal', 'Bab el-Mandeb'],
    riskIndex: 0.12,
    feasibilityScore: 88,
  },
  {
    id: 'pareto-4',
    name: 'Lowest Carbon Route (Electric Rail Corridor)',
    costUsd: 162000,
    timeHours: 410, // 17.0 days
    carbonTons: 95,
    isPareto: true,
    strategy: 'Lowest Carbon',
    modeBreakdown: { sea: 40, rail: 50, air: 0, road: 10 },
    chokepointsBypassed: ['Red Sea Conflict Zone'],
    riskIndex: 0.22,
    feasibilityScore: 94,
  },
  {
    id: 'pareto-5',
    name: 'Pareto Option 5: Trans-Eurasian Express',
    costUsd: 215000,
    timeHours: 260,
    carbonTons: 175,
    isPareto: true,
    strategy: 'Balanced',
    modeBreakdown: { sea: 50, rail: 40, air: 0, road: 10 },
    chokepointsBypassed: ['Malacca Strait', 'Suez Canal'],
    riskIndex: 0.24,
    feasibilityScore: 89,
  },
  {
    id: 'pareto-6',
    name: 'Pareto Option 6: Algeciras Feeder Hybrid',
    costUsd: 148000,
    timeHours: 460,
    carbonTons: 240,
    isPareto: true,
    strategy: 'Cheapest',
    modeBreakdown: { sea: 80, rail: 10, air: 0, road: 10 },
    chokepointsBypassed: ['Suez Queue'],
    riskIndex: 0.31,
    feasibilityScore: 95,
  },

  // Dominated Points (Gray) - 20 sample points representing population cloud
  {
    id: 'dom-1',
    name: 'Dominated Route #1 (Unoptimized Ocean)',
    costUsd: 240000,
    timeHours: 580,
    carbonTons: 380,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 100, rail: 0, air: 0, road: 0 },
    chokepointsBypassed: [],
    riskIndex: 0.65,
    feasibilityScore: 62,
  },
  {
    id: 'dom-2',
    name: 'Dominated Route #2 (Congested Feeder)',
    costUsd: 220000,
    timeHours: 490,
    carbonTons: 340,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 85, rail: 0, air: 0, road: 15 },
    chokepointsBypassed: [],
    riskIndex: 0.58,
    feasibilityScore: 70,
  },
  {
    id: 'dom-3',
    name: 'Dominated Route #3 (Excess Air Segment)',
    costUsd: 330000,
    timeHours: 240,
    carbonTons: 490,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 20, rail: 0, air: 75, road: 5 },
    chokepointsBypassed: ['Suez'],
    riskIndex: 0.42,
    feasibilityScore: 75,
  },
  {
    id: 'dom-4',
    name: 'Dominated Route #4 (High Detention Delay)',
    costUsd: 280000,
    timeHours: 510,
    carbonTons: 360,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 70, rail: 20, air: 0, road: 10 },
    chokepointsBypassed: [],
    riskIndex: 0.72,
    feasibilityScore: 55,
  },
  {
    id: 'dom-5',
    name: 'Dominated Route #5 (Inefficient Rail Routing)',
    costUsd: 195000,
    timeHours: 480,
    carbonTons: 290,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 50, rail: 40, air: 0, road: 10 },
    chokepointsBypassed: [],
    riskIndex: 0.49,
    feasibilityScore: 81,
  },
  {
    id: 'dom-6',
    name: 'Dominated Route #6 (High Fuel Burn Speed)',
    costUsd: 260000,
    timeHours: 440,
    carbonTons: 410,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 90, rail: 0, air: 0, road: 10 },
    chokepointsBypassed: [],
    riskIndex: 0.53,
    feasibilityScore: 77,
  },
  {
    id: 'dom-7',
    name: 'Dominated Route #7 (Suboptimal Port Hub)',
    costUsd: 210000,
    timeHours: 520,
    carbonTons: 320,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 80, rail: 10, air: 0, road: 10 },
    chokepointsBypassed: [],
    riskIndex: 0.51,
    feasibilityScore: 79,
  },
  {
    id: 'dom-8',
    name: 'Dominated Route #8 (Multiple Transshipments)',
    costUsd: 275000,
    timeHours: 390,
    carbonTons: 350,
    isPareto: false,
    strategy: 'Dominated',
    modeBreakdown: { sea: 60, rail: 30, air: 0, road: 10 },
    chokepointsBypassed: [],
    riskIndex: 0.61,
    feasibilityScore: 68,
  },
];

// PARETO FRONTIER TABLE DATA (KEY TRADE-OFF ROUTES)
export const MOCK_PARETO_FRONTIER_TABLE = [
  {
    rank: 1,
    tradeoffType: 'Cheapest Route',
    routeTitle: 'Cape of Good Hope Slow-Steam (Sea Heavy)',
    totalCostUsd: 128500,
    transitTimeHours: 540,
    transitTimeDays: '22.5d',
    carbonTons: 310,
    modeBreakdownPct: 'Sea 90% • Road 10%',
    riskLevel: 'low',
    chokepointsAvoided: 'Suez Canal & Red Sea Conflict Zone',
    keyBenefit: 'Saves $55,700 vs average ocean freight cost',
  },
  {
    rank: 2,
    tradeoffType: 'Balanced Sweet Spot',
    routeTitle: 'Multimodal Sea-Rail Land Bridge (Silk Corridor)',
    totalCostUsd: 184200,
    transitTimeHours: 320,
    transitTimeDays: '13.3d',
    carbonTons: 210,
    modeBreakdownPct: 'Sea 65% • Rail 25% • Road 10%',
    riskLevel: 'low',
    chokepointsAvoided: 'Suez Canal Bottleneck & Port Queues',
    keyBenefit: 'Optimal balance of transit time, cost & emissions',
  },
  {
    rank: 3,
    tradeoffType: 'Fastest Route',
    routeTitle: 'Dubai Sea-Air Emergency Air Sprint',
    totalCostUsd: 295000,
    transitTimeHours: 155,
    transitTimeDays: '6.4d',
    carbonTons: 420,
    modeBreakdownPct: 'Sea 30% • Air 60% • Road 10%',
    riskLevel: 'medium',
    chokepointsAvoided: 'All Maritime Maritime Chokepoints',
    keyBenefit: 'Reduces total delivery lead time by 16 days',
  },
  {
    rank: 4,
    tradeoffType: 'Lowest Carbon Route',
    routeTitle: 'Electric Rail Freight Corridor (Green Hub)',
    totalCostUsd: 162000,
    transitTimeHours: 410,
    transitTimeDays: '17.0d',
    carbonTons: 95,
    modeBreakdownPct: 'Sea 40% • Rail 50% • Road 10%',
    riskLevel: 'low',
    chokepointsAvoided: 'Red Sea High-Risk Zone',
    keyBenefit: 'Cut carbon emissions by 68% vs standard ocean',
  },
];
