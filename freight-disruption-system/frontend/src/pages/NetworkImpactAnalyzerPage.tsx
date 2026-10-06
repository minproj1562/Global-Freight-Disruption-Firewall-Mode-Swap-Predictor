// frontend/src/pages/NetworkImpactAnalyzerPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Network,
  Anchor,
  ShieldAlert,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Route,
  ArrowRight,
  CheckCircle2,
  Clock,
  Printer,
  Megaphone,
  History,
  ListChecks,
  TrendingUp,
  RadioTower,
} from 'lucide-react';

import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';
import {
  fetchAllPorts,
  BackendPort,
  fetchRippleDashboard,
  fetchAlternativeRoutes,
  simulatePortShutdown,
  RippleDashboard,
  AlternativeRoute,
  ShutdownSimulationResult,
  PreparationAction,
} from '@/services/portManagerApi';

const STATUS_STYLE: Record<string, { card: string; dot: string; text: string }> = {
  GREEN: { card: 'bg-emerald-500/10 border-emerald-500/40', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  AMBER: { card: 'bg-amber-500/10 border-amber-500/40', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  RED: { card: 'bg-rose-500/10 border-rose-500/40', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' },
};

const RISK_STYLE: Record<string, string> = {
  HIGH: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
  MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  LOW: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
};

const RISK_BAR_COLOR: Record<string, string> = { HIGH: '#e11d48', MEDIUM: '#f59e0b', LOW: '#10b981' };

const PREP_STATUS_CYCLE: Record<string, string> = {
  Pending: 'In Progress',
  'In Progress': 'Done',
  Done: 'Pending',
};

const PREP_STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  'In Progress': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  Done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
};

const REFRESH_INTERVAL_MS = 45000;

export const NetworkImpactAnalyzerPage: React.FC = () => {
  const { portId } = useParams<{ portId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [allPortsList, setAllPortsList] = useState<BackendPort[]>([]);
  const [dashboard, setDashboard] = useState<RippleDashboard | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeRoute[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const lastSyncRef = useRef<number>(Date.now());

  const [planStatuses, setPlanStatuses] = useState<Record<number, string>>({});

  const [showStressTest, setShowStressTest] = useState(false);
  const [stressSeverity, setStressSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('critical');
  const [stressRunning, setStressRunning] = useState(false);
  const [stressResult, setStressResult] = useState<ShutdownSimulationResult | null>(null);

  const activePortId = portId || user?.portId || 'port-rotterdam';

  useEffect(() => {
    fetchAllPorts().then(setAllPortsList).catch(console.error);
  }, []);

  const loadData = useCallback(async (targetId: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [dash, alts] = await Promise.all([
        fetchRippleDashboard(targetId),
        fetchAlternativeRoutes(targetId),
      ]);
      setDashboard(dash);
      setAlternatives(alts);
      lastSyncRef.current = Date.now();
      setSecondsSinceSync(0);
    } catch (err) {
      console.error('Failed to load network analyzer data:', err);
      if (!silent) {
        setError('Could not load the network report for this port. Make sure the system is running and this port has trade connections set up.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load on port change
  useEffect(() => {
    setStressResult(null);
    setPlanStatuses({});
    loadData(activePortId, false);
  }, [activePortId, loadData]);

  // Background auto-refresh (live feel, no full-page spinner)
  useEffect(() => {
    const interval = setInterval(() => loadData(activePortId, true), REFRESH_INTERVAL_MS);
    const tick = setInterval(() => setSecondsSinceSync(Math.floor((Date.now() - lastSyncRef.current) / 1000)), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [activePortId, loadData]);

  const togglePlanStatus = (index: number, current: string) => {
    setPlanStatuses((prev) => ({ ...prev, [index]: PREP_STATUS_CYCLE[current] || 'Pending' }));
  };

  const handleSendAlert = (portName: string) => {
    toast({ title: 'Alert Sent', description: `A coordination notice was sent to ${portName}'s port authority.` });
  };

  const handleRunStressTest = async () => {
    setStressRunning(true);
    try {
      const result = await simulatePortShutdown(activePortId, stressSeverity);
      setStressResult(result);
    } catch {
      toast({ title: 'Could not run stress test', variant: 'destructive' });
    } finally {
      setStressRunning(false);
    }
  };

  const handlePrintPlan = () => window.print();

  const banner = dashboard?.banner;
  const incoming = dashboard?.incoming_threats || [];
  const outgoing = dashboard?.outgoing_impacts || [];
  const plan = dashboard?.preparation_plan || [];
  const precedents = dashboard?.historical_precedents || [];

  const topIncoming = incoming[0];
  const topOutgoing = outgoing[0];

  const incomingChartData = incoming.map((t) => ({
    name: t.upstream_port_name.replace('Port of ', ''),
    value: t.predicted_congestion_increase_pct,
    risk: t.risk_level,
  }));
  const outgoingChartData = outgoing.map((o) => ({
    name: o.downstream_port_name.replace('Port of ', ''),
    value: o.predicted_congestion_increase_pct,
    risk: o.risk_level,
  }));
  const stressChartData = (stressResult?.affected_ports || [])
    .slice()
    .sort((a, b) => b.days_14 - a.days_14)
    .slice(0, 8)
    .map((p) => ({ name: p.port_name.replace('Port of ', ''), value: p.days_14, risk: p.risk_level }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <PortManagerSidebar currentPortId={activePortId} />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm ml-16 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-500">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none">
              NETWORK WATCH
            </h1>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-medium tracking-wider mt-0.5">
              SEE PROBLEMS COMING BEFORE THEY HIT YOUR PORT
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <RadioTower className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Live — synced {secondsSinceSync}s ago</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Viewing Port:</span>
          <select
            value={activePortId}
            onChange={(e) => navigate(`/dashboard/network-analyzer/${e.target.value}`)}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            {allPortsList.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 ml-16 print:ml-0">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => loadData(activePortId, false)} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold font-mono text-[11px]">Retry</button>
          </div>
        )}

        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-xs font-mono">Checking what's happening at nearby ports...</p>
          </div>
        )}

        {banner && !loading && (
          <>
            {/* ===== SECTION 1: HERO BANNER ===== */}
            <section className={`rounded-3xl p-6 border shadow-xl ${STATUS_STYLE[banner.status]?.card || STATUS_STYLE.GREEN.card}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${STATUS_STYLE[banner.status]?.dot}`} />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {banner.port_name} — Network Status: <span className={STATUS_STYLE[banner.status]?.text}>{banner.status}</span>
                    </h2>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 max-w-2xl">{banner.headline}</p>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="px-4 py-2 rounded-2xl bg-white/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Time to Prepare</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {banner.hours_to_prepare ? `~${Math.round(banner.hours_to_prepare / 24)} days` : '—'}
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-white/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Confidence</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">{banner.confidence_pct}%</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== SECTION 2: INCOMING THREATS ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">What's Coming At My Port</h3>
              </div>

              {incoming.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                  No nearby ports are congested enough right now to affect you. All clear.
                </p>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomingChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                        <XAxis type="number" unit="%" fontSize={10} stroke="#94a3b8" />
                        <YAxis type="category" dataKey="name" width={90} fontSize={10} stroke="#94a3b8" />
                        <Tooltip formatter={(v: number) => [`+${v}%`, 'Expected effect on you']} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {incomingChartData.map((d, i) => <Cell key={i} fill={RISK_BAR_COLOR[d.risk] || '#10b981'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 dark:bg-slate-950 text-white font-mono uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Port Causing It</th>
                          <th className="p-3">Their Congestion Now</th>
                          <th className="p-3">Expected Effect on You</th>
                          <th className="p-3">When</th>
                          <th className="p-3">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                        {incoming.map((t) => (
                          <tr key={t.upstream_port_id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{t.upstream_port_name}</td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                              {t.upstream_congestion_now_pct.toFixed(0)}%
                              <span className="block text-[10px] text-slate-400 font-sans normal-case">{t.upstream_trend_label}</span>
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300 max-w-sm">{t.plain_language_summary}</td>
                            <td className="p-3 font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">{t.time_to_impact_days} days</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${RISK_STYLE[t.risk_level] || RISK_STYLE.LOW}`}>{t.risk_level}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* ===== SECTION 3: OUTGOING IMPACT ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">What My Port Is Causing Elsewhere</h3>
              </div>

              {outgoing.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                  Your current congestion level isn't significant enough to affect other ports right now.
                </p>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outgoingChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                        <XAxis type="number" unit="%" fontSize={10} stroke="#94a3b8" />
                        <YAxis type="category" dataKey="name" width={90} fontSize={10} stroke="#94a3b8" />
                        <Tooltip formatter={(v: number) => [`+${v}%`, 'Expected effect on them']} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {outgoingChartData.map((d, i) => <Cell key={i} fill={RISK_BAR_COLOR[d.risk] || '#10b981'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {outgoing.map((o) => (
                      <div key={o.downstream_port_id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">{o.downstream_port_name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${RISK_STYLE[o.risk_level] || RISK_STYLE.LOW}`}>{o.risk_level}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{o.plain_language_summary}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1">Suggested: {o.recommended_coordination}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSendAlert(o.downstream_port_name)} className="shrink-0 text-xs font-bold">
                          <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Send Coordination Alert
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* ===== SECTION 4: DOMINO TIMELINE ===== */}
            {(topIncoming || topOutgoing) && (
              <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Route className="w-5 h-5 text-sky-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">How the Problem Travels</h3>
                </div>
                <div className="flex flex-col md:flex-row items-stretch gap-2">
                  {topIncoming && (
                    <>
                      <div className="flex-1 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-500/30 text-center">
                        <p className="text-[10px] font-mono text-rose-500 uppercase mb-1">Source of Trouble</p>
                        <p className="font-bold text-slate-900 dark:text-white">{topIncoming.upstream_port_name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{topIncoming.upstream_congestion_now_pct.toFixed(0)}% congested, {topIncoming.upstream_trend_label}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center text-slate-400 px-2">
                        <ArrowRight className="w-5 h-5 hidden md:block" />
                        <span className="text-[10px] font-mono">{topIncoming.time_to_impact_days}d</span>
                      </div>
                    </>
                  )}
                  <div className="flex-1 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-400 dark:border-purple-500/40 text-center">
                    <p className="text-[10px] font-mono text-purple-500 uppercase mb-1">Your Port</p>
                    <p className="font-bold text-slate-900 dark:text-white">{banner.port_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{banner.status} status</p>
                  </div>
                  {topOutgoing && (
                    <>
                      <div className="flex flex-col items-center justify-center text-slate-400 px-2">
                        <ArrowRight className="w-5 h-5 hidden md:block" />
                        <span className="text-[10px] font-mono">{topOutgoing.time_to_impact_days}d</span>
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/30 text-center">
                        <p className="text-[10px] font-mono text-amber-500 uppercase mb-1">Next Affected</p>
                        <p className="font-bold text-slate-900 dark:text-white">{topOutgoing.downstream_port_name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">+{topOutgoing.predicted_congestion_increase_pct.toFixed(0)}% expected</p>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* ===== SECTION 5: PREPARATION PLAN ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4" id="prep-plan-section">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">What To Do Next</h3>
                </div>
                <Button size="sm" variant="outline" onClick={handlePrintPlan} className="text-xs font-bold">
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Save / Print Plan
                </Button>
              </div>

              {plan.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No action needed right now — your network position is stable.</p>
              ) : (
                <div className="space-y-2">
                  {plan.map((item: PreparationAction, idx: number) => {
                    const status = planStatuses[idx] || item.status;
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">{item.time_window}</span>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{item.action}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Needs: {item.resource_required}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Result: {item.expected_outcome}</p>
                        </div>
                        <button onClick={() => togglePlanStatus(idx, status)} className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${PREP_STATUS_STYLE[status]}`}>
                          {status === 'Done' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                          {status}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ===== SECTION 6: REAL-WORLD PRECEDENTS ===== */}
            {precedents.length > 0 && (
              <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <History className="w-5 h-5 text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">This Has Happened Before</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                  Real, documented disruptions — shown for context, not as a measure of this tool's accuracy.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {precedents.map((p, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                      <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">{p.event_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{p.location}</p>
                      <div className="flex gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-2">
                        <span>{p.duration_days} days</span>
                        <span>{p.vessels_affected} vessels</span>
                        <span>+{p.avg_industry_delay_days.toFixed(1)}d avg delay</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4">{p.summary}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== SECTION 7: BACKUP ROUTES ===== */}
            {alternatives && alternatives.length > 0 && (
              <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Anchor className="w-5 h-5 text-sky-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Backup Routes If You Get Too Busy</h3>
                </div>
                <div className="space-y-3">
                  {alternatives.map((alt, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border text-sm ${alt.has_alternative ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30'}`}>
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1.5">
                        {alt.has_alternative ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                        <span>{alt.from_port_name} ↔ {alt.to_port_name}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{alt.plain_language_summary}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== SECTION 8: ADVANCED STRESS TEST (condensed, chart-based) ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 print:hidden">
              <button onClick={() => setShowStressTest((v) => !v)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Advanced: Test a Full Shutdown (Not Based on Current Data)</h3>
                </div>
                {showStressTest ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showStressTest && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3 pt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This hypothetical test ignores current congestion and asks "what if my port stopped completely?" — useful for contingency planning, not day-to-day decisions.
                    </p>
                    <div className="flex items-center gap-2">
                      <select value={stressSeverity} onChange={(e) => setStressSeverity(e.target.value as any)} className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200">
                        <option value="low">Brief Disruption</option>
                        <option value="medium">Moderate Shutdown</option>
                        <option value="high">Serious Shutdown</option>
                        <option value="critical">Complete Shutdown</option>
                      </select>
                      <Button onClick={handleRunStressTest} disabled={stressRunning} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs">
                        {stressRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Run Test
                      </Button>
                    </div>
                    {stressResult && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">{stressResult.plain_language_summary}</p>
                        {stressChartData.length > 0 && (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stressChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                                <XAxis type="number" unit="%" fontSize={10} stroke="#94a3b8" />
                                <YAxis type="category" dataKey="name" width={100} fontSize={10} stroke="#94a3b8" />
                                <Tooltip formatter={(v: number) => [`+${v}%`, '14-day congestion increase']} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                  {stressChartData.map((d, i) => <Cell key={i} fill={RISK_BAR_COLOR[d.risk] || '#10b981'} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <p className="text-[10px] font-mono text-slate-400">Showing top 8 of {stressResult.affected_ports.length} affected ports, ranked by 14-day impact.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 font-mono border-t border-slate-200 dark:border-slate-800 ml-16 print:hidden">
        Network Watch — Port Intelligence © 2026
      </footer>
    </div>
  );
};