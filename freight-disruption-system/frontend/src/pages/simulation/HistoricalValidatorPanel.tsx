import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Download, 
  Play, 
  ShieldAlert, 
  Ship, 
  Activity,
  ChevronDown,
  ChevronUp,
  Anchor,
  Globe2
} from 'lucide-react';
import { 
  fetchHistoricalScenarios, 
  compareHistoricalScenario, 
  fetchHistoricalSummary, 
  validateAllHistoricalScenarios 
} from '@/services/api';
import { formatUSD } from '@/shared/utils/currencyFormatter';

// --- Interfaces ---
interface Scenario {
  id: string;
  scenario_name: string;
  scenario_short_code: string;
  event_type: string;
  location: string;
  affected_region: string;
  event_start_date: string;
  event_end_date: string;
  duration_days: number;
  vessels_affected: number;
  global_trade_impact_usd: number;
  avg_delay_days: number;
  description: string;
  is_verified: boolean;
}

interface SummaryResult {
  total_scenarios: number;
  scenarios_better: number;
  scenarios_worse: number;
  scenarios_equivalent: number;
  avg_cost_savings_percent: number;
  avg_time_savings_percent: number;
  total_cost_saved_usd: number;
  total_time_saved_days: number;
  accuracy_rate: number;
}

interface CompareResult {
  scenario: Scenario;
  industry_benchmark: {
    origin_port: string;
    destination_port: string;
    typical_route: string;
    industry_total_cost_usd: number;
    industry_total_time_days: number;
    industry_delay_days: number;
    data_source: string;
    confidence_level: number;
  };
  mc_result: {
    mc_route_name: string;
    mc_total_cost_usd: number;
    mc_total_time_days: number;
    mc_co2_tons: number;
    cost_savings_usd: number;
    cost_savings_percent: number;
    time_savings_days: number;
    time_savings_percent: number;
    accuracy_verdict: 'Better' | 'Worse' | 'Equivalent';
    confidence_score: number;
  };
}

export const HistoricalValidatorPanel: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [validating, setValidating] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareDetails, setCompareDetails] = useState<Record<string, CompareResult>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scenariosData, summaryData] = await Promise.all([
        fetchHistoricalScenarios(),
        fetchHistoricalSummary()
      ]);
      setScenarios(scenariosData || []);
      setSummary(summaryData || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load historical validation data. Ensure API connection is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleValidateAll = async () => {
    setValidating(true);
    try {
      await validateAllHistoricalScenarios();
      await loadInitialData();
    } catch (err) {
      console.error(err);
      setError("Batch validation encountered an operational disruption.");
    } finally {
      setValidating(false);
    }
  };

  const handleRowClick = async (scenarioId: string) => {
    if (expandedId === scenarioId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(scenarioId);

    if (!compareDetails[scenarioId]) {
      setDetailsLoading((prev) => ({ ...prev, [scenarioId]: true }));
      try {
        const detail = await compareHistoricalScenario(scenarioId);
        setCompareDetails((prev) => ({ ...prev, [scenarioId]: detail }));
      } catch (err) {
        console.error(err);
      } finally {
        setDetailsLoading((prev) => ({ ...prev, [scenarioId]: false }));
      }
    }
  };

  const exportCSV = () => {
    if (!scenarios.length) return;
    const headers = ["Event Name", "Event Type", "Vessels Impacted", "Start Date", "Region"];
    const csvContent = [
      headers.join(","),
      ...scenarios.map(s => 
        `"${s.scenario_name}","${s.event_type}",${s.vessels_affected},${s.event_start_date},"${s.affected_region}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "historical_disruptions_validation.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVerdictColor = (verdict?: string) => {
    if (verdict === 'Better') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (verdict === 'Worse') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
  };

  const getEventBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('weather') || t.includes('drought') || t.includes('typhoon')) return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20';
    if (t.includes('strike') || t.includes('labor')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20';
    if (t.includes('cyber') || t.includes('attack')) return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center space-y-4 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Activity className="w-10 h-10 animate-spin text-emerald-500" />
        <span className="font-mono text-sm uppercase tracking-wider">Accessing Historical Manifests...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-slate-800 dark:text-slate-200">
      
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm dark:shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Anchor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                PAGE 2.5 • HISTORICAL BENCHMARK VALIDATOR
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase font-mono mt-1">
                Historical Disruption Validator
              </h1>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs font-mono max-w-2xl">
            Benchmark our routing system against 10 real-world maritime disruption events to verify voyage cost optimization and transit time savings.
          </p>
        </div>
        <button 
          onClick={handleValidateAll}
          disabled={validating}
          className="mt-4 md:mt-0 flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 font-mono text-xs font-bold uppercase"
        >
          {validating ? (
            <Activity className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{validating ? 'Validating Scenarios...' : 'Run Full Validation'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center space-x-3 text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {/* 2. Summary Dashboard Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase font-medium">Scenarios Validated</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 font-mono">
              {summary.total_scenarios} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ 10</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Historical manifests verified</div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase font-medium">Avg Voyage Cost Savings</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1 font-mono">
              {summary.avg_cost_savings_percent.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">~ {formatUSD(summary.total_cost_saved_usd)} saved overall</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase font-medium">Avg Transit Time Saved</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-1 font-mono">
              {summary.avg_time_savings_percent.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{summary.total_time_saved_days.toFixed(0)} total days reclaimed</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase font-medium">System Accuracy Rate</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 font-mono">
              {summary.accuracy_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{summary.scenarios_better} of {summary.total_scenarios} superior routes</div>
          </div>
        </div>
      )}

      {/* 3. Scenario Comparison Table & 4. Deep-Dive */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono uppercase">
              Vessel Disruption Scenario Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Side-by-side benchmarking of 10 major global supply chain bottlenecks.
            </p>
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="font-mono text-xs uppercase">Export Ledger</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono text-xs uppercase tracking-wider">
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium">Event Manifest</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium text-right">Industry Baseline Cost</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium text-right">Our Routing Cost</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium text-right">Transit Duration</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium text-center">Accuracy Verdict</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {scenarios.map((scenario) => {
                const detail = compareDetails[scenario.id];
                const isExpanded = expandedId === scenario.id;

                return (
                  <React.Fragment key={scenario.id}>
                    <tr 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-50 dark:bg-slate-800/30' : ''
                      }`}
                      onClick={() => handleRowClick(scenario.id)}
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{scenario.scenario_name}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase ${getEventBadgeColor(scenario.event_type)}`}>
                            {scenario.event_type}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{scenario.scenario_short_code}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400 font-medium">
                        {detail ? formatUSD(detail.industry_benchmark.industry_total_cost_usd) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        {detail ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {formatUSD(detail.mc_result.mc_total_cost_usd)}
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                              -{detail.mc_result.cost_savings_percent.toFixed(1)}%
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        {detail ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                              {detail.mc_result.mc_total_time_days} days
                            </span>
                            <span className="text-[10px] text-sky-700 dark:text-sky-400 font-mono mt-0.5">
                              -{detail.mc_result.time_savings_percent.toFixed(1)}% vs {detail.industry_benchmark.industry_total_time_days}d
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-center">
                        {detail ? (
                          <span className={`inline-block px-2.5 py-1 rounded-lg border font-mono text-xs font-bold uppercase tracking-wide ${getVerdictColor(detail.mc_result.accuracy_verdict)}`}>
                            {detail.mc_result.accuracy_verdict}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-right text-slate-400 dark:text-slate-500">
                        {isExpanded ? <ChevronUp className="w-5 h-5 inline-block text-amber-500" /> : <ChevronDown className="w-5 h-5 inline-block" />}
                      </td>
                    </tr>

                    {/* Expandable Deep Dive */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0 bg-slate-50/70 dark:bg-slate-950/50">
                          {detailsLoading[scenario.id] ? (
                            <div className="p-8 flex justify-center items-center text-slate-500 dark:text-slate-400">
                              <Activity className="w-5 h-5 animate-spin mr-3 text-emerald-500" />
                              <span className="font-mono text-xs uppercase">Calculating Route Analytics...</span>
                            </div>
                          ) : detail ? (
                            <div className="p-6 border-l-4 border-emerald-500 m-4 bg-white dark:bg-slate-900 rounded-r-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Col 1: Overview */}
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-xs uppercase font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center">
                                      <Globe2 className="w-3.5 h-3.5 mr-1 text-sky-500" /> Disruption Overview
                                    </h4>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{scenario.description}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                      <span className="block text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Affected Region</span>
                                      <span className="text-xs text-slate-900 dark:text-slate-200 font-semibold">{scenario.affected_region}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Vessels Impacted</span>
                                      <span className="text-xs text-slate-900 dark:text-slate-200 font-mono font-bold">{scenario.vessels_affected.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Duration</span>
                                      <span className="text-xs text-slate-900 dark:text-slate-200 font-mono font-bold">{scenario.duration_days} Days</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Global Trade Impact</span>
                                      <span className="text-xs text-rose-600 dark:text-rose-400 font-mono font-bold">{formatUSD(scenario.global_trade_impact_usd)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Col 2: Routing Corridor */}
                                <div className="space-y-4 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-6">
                                  <h4 className="text-xs uppercase font-mono text-slate-500 dark:text-slate-400 mb-3 flex items-center">
                                    <Ship className="w-3.5 h-3.5 mr-1 text-amber-500" /> Trade Corridor Analysis
                                  </h4>
                                  
                                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 relative">
                                    <span className="absolute -top-2.5 left-3 bg-slate-200 dark:bg-slate-800 text-[9px] px-2 py-0.5 rounded-md font-mono text-slate-700 dark:text-slate-300 font-bold uppercase">
                                      Industry Baseline Route
                                    </span>
                                    <div className="text-xs text-slate-800 dark:text-slate-200 mt-2 font-mono font-semibold">{detail.industry_benchmark.typical_route}</div>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Port: {detail.industry_benchmark.origin_port} → {detail.industry_benchmark.destination_port}</span>
                                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono font-bold">Delay: +{detail.industry_benchmark.industry_delay_days}d</span>
                                    </div>
                                  </div>

                                  <div className="bg-emerald-500/10 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30 dark:border-emerald-900/50 relative">
                                    <span className="absolute -top-2.5 left-3 bg-emerald-600 text-[9px] px-2 py-0.5 rounded-md font-mono text-white font-bold uppercase">
                                      Our Optimized Corridor
                                    </span>
                                    <div className="text-xs text-emerald-800 dark:text-emerald-300 mt-2 font-mono font-semibold">{detail.mc_result.mc_route_name}</div>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-emerald-500/20 dark:border-emerald-900/50">
                                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">Est. CO2: {detail.mc_result.mc_co2_tons.toLocaleString()} tons</span>
                                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono font-bold">Reclaimed: {detail.mc_result.time_savings_days}d</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Col 3: Confidence Metrics */}
                                <div className="space-y-4 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-6">
                                  <h4 className="text-xs uppercase font-mono text-slate-500 dark:text-slate-400 mb-1">System Confidence Metrics</h4>
                                  
                                  <div>
                                    <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-400 mb-1">
                                      <span>Model Confidence Score</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{detail.mc_result.confidence_score}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4">
                                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${detail.mc_result.confidence_score}%` }}></div>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-400 mb-1">
                                      <span>Historical Benchmark Quality</span>
                                      <span className="text-sky-600 dark:text-sky-400 font-bold">{detail.industry_benchmark.confidence_level}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                      <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${detail.industry_benchmark.confidence_level}%` }}></div>
                                    </div>
                                  </div>

                                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                                      Sourced from <span className="text-slate-700 dark:text-slate-300 font-semibold">{detail.industry_benchmark.data_source}</span>. 
                                      Simulated via stochastic pathfinding against historical AIS position telemetry.
                                    </p>
                                  </div>

                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {scenarios.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-mono text-sm">
              No historical manifest records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricalValidatorPanel;
