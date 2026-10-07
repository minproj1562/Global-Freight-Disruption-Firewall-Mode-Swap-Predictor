// frontend/src/types/executiveSummaryTypes.ts
// TypeScript interfaces for Page 1.6 — Executive Summary & Risk Register
// API REPLACEMENT POINT: These types align with planned backend response shapes

export interface ROISnapshot {
  costSavedINR: number;       // Amount in crores (₹)
  daysSaved: number;
  periodLabel: string;        // e.g. "This month", "October 2026"
}

export interface ExecutiveSummaryKPIs {
  costSavedThisMonth: number; // USD
  routesRerouted: number;
  avgDecisionTimeMinutes: number;
  activeDisruptions: number;
  vesselsAtRisk: number;
}

export interface MonthlySavingsPoint {
  month: string;              // "Jan", "Feb", etc.
  savings: number;            // USD saved
  rerouteCost: number;        // USD spent on rerouting
}

export interface DisruptionTypeBreakdown {
  type: string;               // e.g. "Geopolitical", "Weather"
  count: number;
  color: string;              // Hex color for chart
}

export interface RiskMatrixEntry {
  id: string;
  name: string;
  likelihood: number;         // 0-100 scale
  impact: number;             // 0-100 scale
  financialExposure: number;  // USD
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export interface RegionalExposure {
  regionName: string;
  regionCode: string;
  cargoValueAtRisk: number;   // USD
  coordinates: [number, number]; // [lng, lat] center point
  affectedRoutes: number;
}

export interface HighRiskDisruption {
  id: string;
  name: string;
  financialExposure: number;  // USD
  mitigationStatus: MitigationStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRoutes: number;
  region: string;
}

export interface DecisionAuditEntry {
  id: string;
  timestamp: string;          // ISO 8601
  user: string;
  route: string;
  alternativesConsidered: string[];
  rationale: string;
  predictedCostUSD: number;
  actualCostUSD: number;
  predictedTimeDays: number;
  actualTimeDays: number;
}

export type ExportPeriod = 'daily' | 'weekly' | 'monthly';
export type MitigationStatus = 'Unmitigated' | 'Monitoring' | 'Mitigating' | 'Mitigated';
