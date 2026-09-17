// frontend/src/pages/simulation/NSGA2OptimizerPanel.tsx
// Page 2.3 — Smart Route Optimizer (Cost vs Speed vs ESG Trade-offs)
// Designed for Logistics Managers: Clear 2D Trade-off Curves, Cost Breakdowns, Dual Currency ($ USD & ₹ INR), Plain-English Guidance

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Sliders,
  Anchor,
  Compass,
  Ship,
  RotateCw,
  Leaf,
  Clock,
  DollarSign,
  Layers,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/shared/hooks/useTheme';
import type { Pareto3DPoint } from '@/shared/mock/simulationMockData';
import { runNSGA2Optimization } from '@/services/api';
import { useSimulationContext } from '@/context/SimulationContext';
import {
  formatINR,
  formatDualCurrency,
  usdToFormattedINR,
} from '@/shared/utils/currencyFormatter';

type ActiveGraphTab = 'tradeoff' | 'cost-breakdown' | 'carbon';

export const NSGA2OptimizerPanel: React.FC = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Synchronized Corridor State from SimulationContext
  const {
    selectedOrigin, setSelectedOrigin,
    selectedDestination, setSelectedDestination,
    selectedVessel, setSelectedVessel,
    templates,
  } = useSimulationContext();

  const [strategicPriority, setStrategicPriority] = useState('balanced');
  const [activeTab, setActiveTab] = useState<ActiveGraphTab>('tradeoff');

  // Data from backend
  const [paretoPoints, setParetoPoints] = useState<Pareto3DPoint[]>([]);
  const [tradeoffMatrix, setTradeoffMatrix] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<Pareto3DPoint | null>(null);

// Context loads templates once

  // Solve Route Optimization
  const executeOptimizer = () => {
    setIsLoading(true);

    let costWeight = 1.0;
    let timeWeight = 1.0;
    let carbonWeight = 1.0;

    if (strategicPriority === 'cost') {
      costWeight = 3.0;
      timeWeight = 0.5;
      carbonWeight = 0.5;
    } else if (strategicPriority === 'time') {
      costWeight = 0.5;
      timeWeight = 3.0;
      carbonWeight = 0.5;
    } else if (strategicPriority === 'carbon') {
      costWeight = 0.5;
      timeWeight = 0.5;
      carbonWeight = 3.0;
    }

    runNSGA2Optimization({
      origin: selectedOrigin,
      destination: selectedDestination,
      vessel: selectedVessel,
      cost_weight: costWeight,
      time_weight: timeWeight,
      carbon_weight: carbonWeight,
    })
      .then((data) => {
        const points = data.paretoPoints || [];
        setParetoPoints(points);
        setTradeoffMatrix(data.tradeoffMatrix || []);
        if (points.length > 0) {
          const firstPareto = points.find((p: any) => p.isPareto) || points[0];
          setSelectedPoint(firstPareto);
        }
        setIsLoading(false);
        toast({
          title: 'Route Optimization Complete',
          description: `Evaluated ${points.length} candidates. Identified best trade-offs for ${selectedOrigin} → ${selectedDestination}.`,
        });
      })
      .catch((err) => {
        console.warn('Optimizer API notice:', err);
        setIsLoading(false);
      });
  };

  // Re-run whenever corridor or business priority changes
  useEffect(() => {
    executeOptimizer();
  }, [selectedOrigin, selectedDestination, selectedVessel, strategicPriority]);

  // Top recommended route
  const topRecommended = useMemo(() => {
    if (tradeoffMatrix.length > 0) {
      return tradeoffMatrix[0];
    }
    return null;
  }, [tradeoffMatrix]);

  // Theme colors for Recharts
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#475569';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#cbd5e1';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  // Data formatted for the Cost vs Delivery Days Curve
  const tradeOffCurveData = useMemo(() => {
    // Separate optimal routes and dominated routes
    const optimalPoints = paretoPoints
      .filter((p) => p.isPareto)
      .map((p) => ({
        id: p.id,
        name: p.name,
        strategy: p.strategy,
        costUsd: p.costUsd,
        costInr: usdToFormattedINR(p.costUsd),
        transitDays: Number((p.timeHours / 24.0).toFixed(1)),
        carbonTons: p.carbonTons,
        isPareto: true,
        // Line data point
        optimalDays: Number((p.timeHours / 24.0).toFixed(1)),
      }))
      .sort((a, b) => a.costUsd - b.costUsd);

    const dominatedPoints = paretoPoints
      .filter((p) => !p.isPareto)
      .map((p) => ({
        id: p.id,
        name: p.name,
        strategy: 'Dominated Alternative',
        costUsd: p.costUsd,
        costInr: usdToFormattedINR(p.costUsd),
        transitDays: Number((p.timeHours / 24.0).toFixed(1)),
        carbonTons: p.carbonTons,
        isPareto: false,
        optimalDays: null,
      }));

    return {
      optimalLine: optimalPoints,
      allPoints: [...optimalPoints, ...dominatedPoints],
    };
  }, [paretoPoints]);

  // Cost Breakdown Data for Bar Chart
  const costBreakdownData = useMemo(() => {
    if (!tradeoffMatrix.length) return [];
    return tradeoffMatrix.map((item) => {
      const total = item.totalCostUsd;
      let fuelPct = 0.40;
      let charterPct = 0.45;
      let tollPct = 0.15;
      let tariffPct = 0.0;

      if (item.tradeoffType.toLowerCase().includes('cheapest')) {
        // Cape bypass: more fuel, higher charter, 0 tolls
        fuelPct = 0.52;
        charterPct = 0.48;
        tollPct = 0.0;
      } else if (item.tradeoffType.toLowerCase().includes('balanced')) {
        // Sea-rail: less fuel, intermodal rail tariff
        fuelPct = 0.28;
        charterPct = 0.35;
        tollPct = 0.0;
        tariffPct = 0.37;
      } else if (item.tradeoffType.toLowerCase().includes('fastest')) {
        // Air express: high air tariff
        fuelPct = 0.18;
        charterPct = 0.22;
        tollPct = 0.0;
        tariffPct = 0.60;
      } else if (item.tradeoffType.toLowerCase().includes('carbon')) {
        // Electric rail
        fuelPct = 0.22;
        charterPct = 0.38;
        tollPct = 0.0;
        tariffPct = 0.40;
      }

      return {
        name: item.tradeoffType.replace(' Route', ''),
        routeTitle: item.routeTitle,
        totalCostUsd: total,
        totalCostFormatted: item.costFormatted,
        fuelCost: Math.round(total * fuelPct),
        charterCost: Math.round(total * charterPct),
        tollCost: Math.round(total * tollPct),
        tariffCost: Math.round(total * tariffPct),
        transitDays: item.transitTimeDays,
      };
    });
  }, [tradeoffMatrix]);

  // Carbon comparison data
  const carbonComparisonData = useMemo(() => {
    if (!tradeoffMatrix.length) return [];
    const maxCarbon = Math.max(...tradeoffMatrix.map((t) => t.carbonTons)) || 1;
    return tradeoffMatrix.map((item) => ({
      name: item.tradeoffType.replace(' Route', ''),
      routeTitle: item.routeTitle,
      carbonTons: item.carbonTons,
      carbonReductionPct: Math.max(0, Math.round(((maxCarbon - item.carbonTons) / maxCarbon) * 100)),
      transitDays: item.transitTimeDays,
    }));
  }, [tradeoffMatrix]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-sky-500/10 via-amber-500/10 to-emerald-500/10 border border-sky-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                PAGE 2.3 • CARGO ROUTE OPTIMIZER
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                {isLoading ? 'Calculating Optimal Routes...' : `${paretoPoints.length} Routes Analyzed`}
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              TRADE-OFF ANALYSIS: FREIGHT COST vs DELIVERY TIME vs ESG CARBON
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-3xl leading-relaxed">
              Compares route options across your shipping lane. Identifies mathematically optimal choices where you cannot cut delivery days without paying more freight cost.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              USD/INR: ₹83.50
            </span>
          </div>
        </div>

        {/* Top Recommendation Executive Callout */}
        {topRecommended && (
          <div className="mt-4 pt-3 border-t border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-sky-500/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>RECOMMENDED FOR YOUR GOAL: {topRecommended.tradeoffType.toUpperCase()}</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {topRecommended.routeTitle}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-sans">
                {topRecommended.managerAction || topRecommended.keyBenefit}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  ${topRecommended.totalCostUsd.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {topRecommended.totalCostInr ? formatINR(topRecommended.totalCostInr) : usdToFormattedINR(topRecommended.totalCostUsd)} • {topRecommended.transitTimeDays}
                </div>
              </div>

              <button
                onClick={() =>
                  toast({
                    title: `Route Selected: ${topRecommended.routeTitle}`,
                    description: `Authorized booking dispatch at ${topRecommended.costFormatted}.`,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Book This Route</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SHIPMENT CONFIGURATOR BAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl transition-colors duration-300">
        <div className="flex items-center gap-2 mb-3 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
          <Sliders className="w-4 h-4" />
          <span>SHIPMENT PARAMETERS & BUSINESS GOAL</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Origin Dropdown */}
          <div>
            <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Anchor className="w-3 h-3 text-amber-500" />
              <span>ORIGIN PORT</span>
            </label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {templates.originPorts.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.fullName || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Dropdown */}
          <div>
            <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-sky-500" />
              <span>DESTINATION PORT</span>
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {templates.destinationPorts.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.fullName || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vessel Dropdown */}
          <div>
            <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Ship className="w-3 h-3 text-emerald-500" />
              <span>VESSEL CLASS</span>
            </label>
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {templates.vessels.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Business Goal Priority */}
          <div>
            <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-500" />
              <span>BUSINESS PRIORITY</span>
            </label>
            <select
              value={strategicPriority}
              onChange={(e) => setStrategicPriority(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="cost">💰 Lowest Freight Cost (Save Budget)</option>
              <option value="time">⚡ Fastest Delivery (Urgent / SLA Critical)</option>
              <option value="balanced">⚖️ Balanced (Optimal Budget & Lead Time)</option>
              <option value="carbon">🌱 Green Supply Chain (Lowest CO2 Emissions)</option>
            </select>
          </div>

          {/* Trigger Button */}
          <div className="flex items-end">
            <button
              onClick={executeOptimizer}
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'CALCULATING...' : 'OPTIMIZE ROUTES'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOUR STRATEGIC ROUTE CHAMPION CARDS (CLICK TO FOCUS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tradeoffMatrix.map((item, idx) => {
          const isSelected = selectedPoint && (selectedPoint.strategy?.toLowerCase() === item.tradeoffType?.split(' ')[0]?.toLowerCase() || selectedPoint.name === item.routeTitle);

          let badgeColor = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
          let icon = <DollarSign className="w-3.5 h-3.5" />;
          if (item.tradeoffType.toLowerCase().includes('fastest')) {
            badgeColor = 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30';
            icon = <Clock className="w-3.5 h-3.5" />;
          } else if (item.tradeoffType.toLowerCase().includes('carbon')) {
            badgeColor = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
            icon = <Leaf className="w-3.5 h-3.5" />;
          } else if (item.tradeoffType.toLowerCase().includes('balanced')) {
            badgeColor = 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
            icon = <Layers className="w-3.5 h-3.5" />;
          }

          return (
            <div
              key={idx}
              onClick={() => {
                const match = paretoPoints.find(
                  (p) => p.isPareto && (p.strategy?.toLowerCase() === item.tradeoffType?.split(' ')[0]?.toLowerCase() || p.name === item.routeTitle)
                );
                if (match) setSelectedPoint(match);
              }}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/30'
                  : 'bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${badgeColor}`}>
                    {icon}
                    <span>{item.tradeoffType}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">Rank #{item.rank}</span>
                </div>
                <h4 className="text-xs font-bold font-mono text-slate-900 dark:text-white line-clamp-1">
                  {item.routeTitle}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.keyBenefit}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-slate-500">Total Cost:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${item.totalCostUsd.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 font-semibold">
                      ({item.totalCostInr ? formatINR(item.totalCostInr) : usdToFormattedINR(item.totalCostUsd)})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Lead Time:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.transitTimeDays}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Carbon:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.carbonTons} t CO2</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. VISUAL EXPLAINABILITY GRAPHS (USER-FRIENDLY & INTUITIVE FOR LOGISTICS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recharts Visualizations (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>ROUTE TRADE-OFF VISUALIZER</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTab === 'tradeoff'
                  ? 'Cost vs Lead Time Curve — Connected line represents mathematically optimal routes'
                  : activeTab === 'cost-breakdown'
                  ? 'Cost Breakdown — Reveals where your budget goes (Fuel vs Charter vs Tolls)'
                  : 'Scope 3 Carbon Footprint Comparison across routes'}
              </p>
            </div>

            {/* Graph Tab Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('tradeoff')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'tradeoff'
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cost vs Lead Time
              </button>
              <button
                onClick={() => setActiveTab('cost-breakdown')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'cost-breakdown'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cost Breakdown
              </button>
              <button
                onClick={() => setActiveTab('carbon')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'carbon'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Carbon (ESG)
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: COST vs LEAD TIME PARETO CURVE */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'tradeoff' && (
            <div className="space-y-3">
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={tradeOffCurveData.optimalLine}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="costUsd"
                      stroke={axisColor}
                      fontSize={11}
                      type="number"
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `$${(val / 1e6).toFixed(1)}M`}
                      unit=""
                    />
                    <YAxis
                      dataKey="transitDays"
                      stroke={axisColor}
                      fontSize={11}
                      domain={['auto', 'auto']}
                      unit=" days"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '1rem',
                        color: tooltipText,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val: any, _name: any, item: any) => {
                        const p = item?.payload || {};
                        return [
                          `${val} days | Cost: $${(p.costUsd || 0).toLocaleString()} (${p.costInr || ''}) | Carbon: ${p.carbonTons || 0}t CO2`,
                          p.strategy || p.name || 'Route Option',
                        ];
                      }}
                      labelFormatter={(cost) => `Freight Cost: $${Number(cost).toLocaleString()} (${usdToFormattedINR(Number(cost))})`}
                    />
                    {/* Optimal Frontier Line */}
                    <Line
                      type="monotone"
                      dataKey="optimalDays"
                      name="Optimal Frontier (Best Value)"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 6, fill: '#10b981', stroke: '#065f46', strokeWidth: 2 }}
                      activeDot={{ r: 9, fill: '#f59e0b' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Explainability Legend */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Green Line = Optimal Frontier (Best Possible Trade-offs)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>Grey Points = Inefficient (Higher cost for slower delivery)</span>
                  </span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  💡 Moving along the green line trades lead time for freight cost.
                </span>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: COST BREAKDOWN COMPARISON */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'cost-breakdown' && (
            <div className="space-y-3">
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" stroke={axisColor} fontSize={11} />
                    <YAxis
                      stroke={axisColor}
                      fontSize={11}
                      tickFormatter={(val) => `$${(val / 1e6).toFixed(1)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '1rem',
                        color: tooltipText,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val: any, name: any) => [
                        `$${Number(val).toLocaleString()} (${usdToFormattedINR(Number(val))})`,
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
                    />
                    <Bar dataKey="fuelCost" name="⛽ Bunker Fuel" stackId="cost" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="charterCost" name="🚢 Vessel Hire & Charter" stackId="cost" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tollCost" name="🌊 Canal Tolls & War Risk" stackId="cost" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tariffCost" name="📦 Intermodal Tariff (Rail/Air)" stackId="cost" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 flex items-center justify-between">
                <span>💡 Cape Bypass saves $460k canal tolls. Sea-Rail cuts fuel through electric rail land bridge.</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Stacked Freight Budget</span>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: CARBON EMISSIONS (ESG SCOPE 3) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'carbon' && (
            <div className="space-y-3">
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={carbonComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" stroke={axisColor} fontSize={11} />
                    <YAxis stroke={axisColor} fontSize={11} unit=" t" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '1rem',
                        color: tooltipText,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val: any) => [`${val} Tons CO2`, 'Emissions']}
                    />
                    <Bar dataKey="carbonTons" name="CO2 Emissions (Tons)" radius={[6, 6, 0, 0]}>
                      {carbonComparisonData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name.toLowerCase().includes('carbon')
                              ? '#10b981'
                              : entry.name.toLowerCase().includes('fastest')
                              ? '#f43f5e'
                              : '#38bdf8'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 flex items-center justify-between">
                <span>🌱 Electric Rail delivers up to 65% carbon reduction for corporate ESG compliance.</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Scope 3 Emissions</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Selected Route Property Details (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl space-y-4 flex flex-col justify-between transition-colors duration-300">
          {selectedPoint ? (
            <>
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider">
                      ROUTE SPECIFICATIONS
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {selectedPoint.strategy || selectedPoint.id}
                  </span>
                </div>

                <div className="space-y-3 font-mono">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {selectedPoint.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedPoint.isPareto
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {selectedPoint.isPareto ? 'Optimal Route' : 'Alternative'}
                      </span>
                      <span className="text-[11px] text-slate-500">{selectedPoint.id}</span>
                    </div>
                  </div>

                  {/* Dual Currency Freight Cost */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-semibold">
                      TOTAL FREIGHT COST (USD $ / INR ₹)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900 dark:text-white">
                        ${selectedPoint.costUsd.toLocaleString()}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        ({usdToFormattedINR(selectedPoint.costUsd)})
                      </span>
                    </div>
                  </div>

                  {/* Transit Time & Carbon */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">LEAD TIME</span>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {(selectedPoint.timeHours / 24.0).toFixed(1)} days
                      </p>
                      <p className="text-[10px] text-slate-500">({selectedPoint.timeHours} hrs)</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">CARBON FOOTPRINT</span>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedPoint.carbonTons} tons
                      </p>
                      <p className="text-[10px] text-slate-500">CO2 Scope 3</p>
                    </div>
                  </div>

                  {/* Modal Split */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 block font-semibold">MODAL SPLIT</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-sky-600 dark:text-sky-400 font-bold">Sea {selectedPoint.modeBreakdown.sea}%</span>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">Rail {selectedPoint.modeBreakdown.rail}%</span>
                      <span>•</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">Air {selectedPoint.modeBreakdown.air}%</span>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400">Road {selectedPoint.modeBreakdown.road}%</span>
                    </div>
                  </div>

                  {/* Chokepoints Bypassed */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">CHOKEPOINTS BYPASSED:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPoint.chokepointsBypassed?.length ? (
                        selectedPoint.chokepointsBypassed.map((choke: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold"
                          >
                            ✓ {choke}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard maritime chokepoints traversed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  toast({
                    title: `Route Dispatched: ${selectedPoint.name}`,
                    description: `Initiated freight booking authorization at ${formatDualCurrency(selectedPoint.costUsd)}.`,
                  })
                }
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM & DISPATCH THIS ROUTE</span>
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
              Click any route on the chart to inspect detailed properties.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. STRATEGIC TRADE-OFF COMPARISON TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>ROUTE COMPARISON MATRIX (EXECUTIVE SUMMARY)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Sorted for Your Strategic Priority</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tradeoffMatrix.map((tradeOff) => {
            const matchingPoint = paretoPoints.find(
              (p) => p.isPareto && (p.strategy?.toLowerCase() === tradeOff.tradeoffType?.split(' ')[0]?.toLowerCase() || p.name === tradeOff.routeTitle)
            );

            return (
              <div
                key={tradeOff.rank}
                className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-sky-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                      {tradeOff.tradeoffType}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">Rank #{tradeOff.rank}</span>
                  </div>

                  <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-white mb-1">
                    {tradeOff.routeTitle}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed mb-2">
                    {tradeOff.keyBenefit}
                  </p>
                  {tradeOff.managerAction && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-sans text-amber-800 dark:text-amber-300">
                      <strong>Logistics Advice:</strong> {tradeOff.managerAction}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Freight Cost:</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        ${tradeOff.totalCostUsd.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                        {tradeOff.totalCostInr ? formatINR(tradeOff.totalCostInr) : usdToFormattedINR(tradeOff.totalCostUsd)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Lead Time:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      {tradeOff.transitTimeHours} hrs ({tradeOff.transitTimeDays})
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Carbon:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tradeOff.carbonTons} t CO2</span>
                  </div>

                  <button
                    onClick={() => {
                      if (matchingPoint) {
                        setSelectedPoint(matchingPoint);
                        toast({
                          title: `Inspecting ${tradeOff.routeTitle}`,
                          description: `Loaded route into specifications panel.`,
                        });
                      }
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Select & Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
