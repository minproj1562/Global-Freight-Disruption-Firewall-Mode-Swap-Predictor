// frontend/src/pages/NetworkImpactAnalyzerPage.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import {
  Network,
  Anchor,
  ShieldAlert,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  Printer,
  Megaphone,
  History,
  ListChecks,
  TrendingUp,
  RadioTower,
  X,
  MapPin,
  Info,
} from 'lucide-react';

import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';
import { NotificationCenter, NotificationItem } from '@/shared/components/NotificationCenter';
import { NetworkRippleMap } from '@/features/network/NetworkRippleMap';
import {
  fetchAllPorts,
  BackendPort,
  fetchRippleDashboard,
  fetchAlternativeRoutes,
  fetchGraphTopology,
  simulatePortShutdown,
  RippleDashboard,
  AlternativeRoute,
  ShutdownSimulationResult,
  PreparationAction,
  GraphTopology,
} from '@/services/portManagerApi';

// ============================================================
// ONE SHARED COLOR + LABEL SYSTEM
// Every risk badge, chart bar, and label on this page pulls from
// this single source so colors never drift out of sync with each other.
// ============================================================

const RISK_CONFIG: Record<string, { label: string; badge: string; barColor: string; dot: string; icon: React.ElementType }> = {
  HIGH: {
    label: 'High Risk',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
    barColor: '#e11d48',
    dot: 'bg-rose-500',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'Medium Risk',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    barColor: '#f59e0b',
    dot: 'bg-amber-500',
    icon: ShieldAlert,
  },
  LOW: {
    label: 'Low Risk',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    barColor: '#10b981',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
};

const RISK_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const STATUS_CONFIG: Record<string, { card: string; dot: string; text: string; icon: React.ElementType }> = {
  GREEN: { card: 'bg-emerald-500/10 border-emerald-500/40', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
  AMBER: { card: 'bg-amber-500/10 border-amber-500/40', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', icon: ShieldAlert },
  RED: { card: 'bg-rose-500/10 border-rose-500/40', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', icon: AlertTriangle },
};

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

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const config = RISK_CONFIG[level] || RISK_CONFIG.LOW;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${config.badge}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

// ============================================================
// SORT CONTROL — shared by both the Incoming and Outgoing lists.
// The active choice is unmistakable (filled background + checkmark),
// and the list below animates items into their new position, so it's
// visually obvious that sorting actually changed something.
// ============================================================

type SortKey = 'effect' | 'time' | 'risk';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'effect', label: 'Biggest Effect First', icon: TrendingUp },
  { key: 'time', label: 'Soonest First', icon: Clock },
  { key: 'risk', label: 'Highest Risk First', icon: ShieldAlert },
];

interface Sortable {
  predicted_congestion_increase_pct: number;
  time_to_impact_days: number;
  risk_level: string;
}

function sortByKey<T extends Sortable>(list: T[], key: SortKey): T[] {
  const copy = [...list];
  copy.sort((a, b) => {
    if (key === 'effect') return b.predicted_congestion_increase_pct - a.predicted_congestion_increase_pct;
    if (key === 'time') return a.time_to_impact_days - b.time_to_impact_days;
    return (RISK_ORDER[b.risk_level] || 0) - (RISK_ORDER[a.risk_level] || 0);
  });
  return copy;
}

const SortControl: React.FC<{ active: SortKey; onChange: (k: SortKey) => void }> = ({ active, onChange }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-1">Order by:</span>
    {SORT_OPTIONS.map(({ key, label, icon: Icon }) => {
      const isActive = active === key;
      return (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={isActive}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border transition-all ${
            isActive
              ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-400'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
          {isActive && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
        </button>
      );
    })}
  </div>
);

// ============================================================
// SHARED CHART COMPONENT — used by Incoming, Outgoing, and the
// Port Closure Test, so all three charts look and behave identically.
// Gradient-filled bars + the number printed directly on the bar
// (no hovering required to read the value) + a clear custom tooltip.
// ============================================================

interface RippleChartDatum {
  name: string;
  value: number;
  risk: string;
}

const ChartGradients: React.FC = () => (
  <defs>
    {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
      <linearGradient key={key} id={`ripple-grad-${key}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={cfg.barColor} stopOpacity={0.35} />
        <stop offset="100%" stopColor={cfg.barColor} stopOpacity={0.95} />
      </linearGradient>
    ))}
  </defs>
);

const RippleBarChart: React.FC<{ data: RippleChartDatum[]; valueLabel: string; height?: number }> = ({
  data,
  valueLabel,
  height = 220,
}) => (
  <div style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 46, top: 5, bottom: 5 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} horizontal={false} />
        <XAxis type="number" unit="%" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={110} fontSize={13} stroke="#94a3b8" tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length) return null;
            const d = payload[0].payload as RippleChartDatum;
            const cfg = RISK_CONFIG[d.risk] || RISK_CONFIG.LOW;
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3">
                <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">{label}</p>
                <p className="text-sm font-semibold" style={{ color: cfg.barColor }}>
                  {valueLabel}: +{d.value}%
                </p>
                <p className="text-xs text-slate-400 mt-1">{cfg.label}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={`url(#ripple-grad-${RISK_CONFIG[d.risk] ? d.risk : 'LOW'})`} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: number) => `+${v}%`} style={{ fontSize: 12, fontWeight: 700 }} fill="#64748b" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const NetworkImpactAnalyzerPage: React.FC = () => {
  const { portId } = useParams<{ portId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [allPortsList, setAllPortsList] = useState<BackendPort[]>([]);
  const [dashboard, setDashboard] = useState<RippleDashboard | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeRoute[] | null>(null);
  const [topology, setTopology] = useState<GraphTopology | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const lastSyncRef = useRef<number>(Date.now());

  const [planStatuses, setPlanStatuses] = useState<Record<number, string>>({});
  const [dismissedThreatIds, setDismissedThreatIds] = useState<Set<string>>(new Set());
  const [dismissedOutgoingIds, setDismissedOutgoingIds] = useState<Set<string>>(new Set());
  const [incomingSortKey, setIncomingSortKey] = useState<SortKey>('effect');
  const [outgoingSortKey, setOutgoingSortKey] = useState<SortKey>('effect');

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
      const [dashResult, altResult, topoResult] = await Promise.allSettled([
        fetchRippleDashboard(targetId),
        fetchAlternativeRoutes(targetId),
        fetchGraphTopology(targetId),
      ]);

      if (dashResult.status === 'fulfilled') {
        setDashboard(dashResult.value);
      } else {
        throw dashResult.reason;
      }
      setAlternatives(altResult.status === 'fulfilled' ? altResult.value : []);
      setTopology(topoResult.status === 'fulfilled' ? topoResult.value : null);

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

  useEffect(() => {
    setStressResult(null);
    setPlanStatuses({});
    setDismissedThreatIds(new Set());
    setDismissedOutgoingIds(new Set());
    loadData(activePortId, false);
  }, [activePortId, loadData]);

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

  const handleDismissThreat = (id: string) => {
    setDismissedThreatIds((prev) => new Set(prev).add(id));
  };

  const handleDismissOutgoing = (id: string) => {
    setDismissedOutgoingIds((prev) => new Set(prev).add(id));
  };

  const handleRunStressTest = async () => {
    setStressRunning(true);
    try {
      const result = await simulatePortShutdown(activePortId, stressSeverity);
      setStressResult(result);
    } catch {
      toast({ title: 'Could not run this test', variant: 'destructive' });
    } finally {
      setStressRunning(false);
    }
  };

  const handlePrintPlan = () => window.print();

  const banner = dashboard?.banner;
  const allIncoming = dashboard?.incoming_threats || [];
  const allOutgoing = dashboard?.outgoing_impacts || [];
  const plan = dashboard?.preparation_plan || [];
  const precedents = dashboard?.historical_precedents || [];

  const incoming = useMemo(
    () => allIncoming.filter((t) => !dismissedThreatIds.has(t.upstream_port_id)),
    [allIncoming, dismissedThreatIds]
  );
  const outgoing = useMemo(
    () => allOutgoing.filter((o) => !dismissedOutgoingIds.has(o.downstream_port_id)),
    [allOutgoing, dismissedOutgoingIds]
  );

  const sortedIncoming = useMemo(() => sortByKey(incoming, incomingSortKey), [incoming, incomingSortKey]);
  const sortedOutgoing = useMemo(() => sortByKey(outgoing, outgoingSortKey), [outgoing, outgoingSortKey]);

  const notificationItems: NotificationItem[] = useMemo(
    () =>
      allIncoming
        .filter((t) => !dismissedThreatIds.has(t.upstream_port_id) && (t.risk_level === 'HIGH' || t.risk_level === 'MEDIUM'))
        .map((t) => ({
          id: t.upstream_port_id,
          title: `${t.upstream_port_name} may affect you`,
          message: `About +${t.predicted_congestion_increase_pct.toFixed(0)}% expected within ${t.time_to_impact_days} day(s)`,
          severity: t.risk_level as 'HIGH' | 'MEDIUM',
        })),
    [allIncoming, dismissedThreatIds]
  );

  const incomingChartData: RippleChartDatum[] = sortedIncoming.map((t) => ({
    name: t.upstream_port_name.replace('Port of ', ''),
    value: t.predicted_congestion_increase_pct,
    risk: t.risk_level,
  }));
  const outgoingChartData: RippleChartDatum[] = sortedOutgoing.map((o) => ({
    name: o.downstream_port_name.replace('Port of ', ''),
    value: o.predicted_congestion_increase_pct,
    risk: o.risk_level,
  }));
  const stressChartData: RippleChartDatum[] = (stressResult?.affected_ports || [])
    .slice()
    .sort((a, b) => b.days_14 - a.days_14)
    .slice(0, 8)
    .map((p) => ({ name: p.port_name.replace('Port of ', ''), value: p.days_14, risk: p.risk_level }));

  const StatusIcon = banner ? STATUS_CONFIG[banner.status]?.icon || CheckCircle2 : CheckCircle2;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300 text-[15px]">
      <PortManagerSidebar currentPortId={activePortId} />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm ml-16 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-500 shrink-0">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              Network Watch
            </h1>
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium tracking-wide mt-1">
              See problems coming before they hit your port
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
            <RadioTower className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Live — synced {secondsSinceSync}s ago</span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Viewing Port:</span>
          <select
            value={activePortId}
            onChange={(e) => navigate(`/dashboard/network-analyzer/${e.target.value}`)}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 font-bold text-sm rounded-xl px-4 py-2.5 focus:outline-none cursor-pointer"
          >
            {allPortsList.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationCenter items={notificationItems} onDismiss={handleDismissThreat} />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 ml-16 print:ml-0">
        {error && (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-base flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => loadData(activePortId, false)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm">Retry</button>
          </div>
        )}

        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-9 h-9 animate-spin text-purple-500" />
            <p className="text-base">Checking what's happening at nearby ports...</p>
          </div>
        )}

        {banner && !loading && (
          <>
            {/* ===== SECTION 1: HERO BANNER ===== */}
            <section className={`rounded-3xl p-6 border shadow-xl ${STATUS_CONFIG[banner.status]?.card || STATUS_CONFIG.GREEN.card}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${STATUS_CONFIG[banner.status]?.dot}`}>
                    <StatusIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {banner.port_name} — Network Status: <span className={STATUS_CONFIG[banner.status]?.text}>{banner.status}</span>
                    </h2>
                    <p className="text-base text-slate-700 dark:text-slate-300 mt-2 max-w-2xl leading-relaxed">{banner.headline}</p>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="px-5 py-3 rounded-2xl bg-white/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Time to Prepare</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {banner.hours_to_prepare ? `~${Math.round(banner.hours_to_prepare / 24)} days` : '—'}
                    </div>
                  </div>
                  <div className="px-5 py-3 rounded-2xl bg-white/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">How Sure We Are</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{banner.confidence_pct}%</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== SECTION 2: TRADE NETWORK MAP ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <MapPin className="w-5 h-5 text-purple-500 shrink-0" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Port's Trade Network</h3>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400">
                A map of the ports directly connected to yours — hover or tap any line to see details.
              </p>

              {topology && topology.nodes.length > 1 ? (
                <>
                  <NetworkRippleMap nodes={topology.nodes} edges={topology.edges} heightClassName="h-[28rem]" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6] mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Your Port</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">This is you, at the center of the map.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#e11d48] mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Could Delay You</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">This port is busy/congested and may slow your ships down soon.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">You Could Delay Them</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Your current congestion may slow this port's ships down.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#64748b] mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Regularly Connected</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">You trade with this port, but nothing concerning right now.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50">
                    <Info className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-sky-800 dark:text-sky-300">
                      Color tells you who's affected — a thicker line means a bigger expected effect. Hover over any line or port to see the details.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-base text-slate-500 dark:text-slate-400 py-10 text-center">
                  Map data is still being prepared for this port.
                </p>
              )}
            </section>

            {/* ===== SECTION 3: INCOMING THREATS ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">What's Coming At My Port</h3>
              </div>

              {incoming.length === 0 ? (
                <p className="text-base text-slate-500 dark:text-slate-400 py-6 text-center">
                  No nearby ports are congested enough right now to affect you. All clear.
                </p>
              ) : (
                <>
                  <RippleBarChart data={incomingChartData} valueLabel="Effect on you" />
                  <SortControl active={incomingSortKey} onChange={setIncomingSortKey} />

                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {sortedIncoming.map((t) => (
                        <motion.div
                          key={t.upstream_port_id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          className="relative p-5 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2">
                            <span className="font-bold text-lg text-slate-900 dark:text-white">{t.upstream_port_name}</span>
                            <span className="text-sm font-mono font-semibold text-slate-500 dark:text-slate-400">
                              Currently {t.upstream_congestion_now_pct.toFixed(0)}% busy, {t.upstream_trend_label}
                            </span>
                            <RiskBadge level={t.risk_level} />
                          </div>
                          <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">{t.plain_language_summary}</p>
                          <div className="flex items-center gap-2 mt-2.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                            <Clock className="w-4 h-4" />
                            Expected in {t.time_to_impact_days} day(s)
                          </div>
                          <button
                            onClick={() => handleDismissThreat(t.upstream_port_id)}
                            aria-label="Dismiss this alert"
                            title="Dismiss this alert"
                            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </section>

            {/* ===== SECTION 4: OUTGOING IMPACT ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">What My Port Is Causing Elsewhere</h3>
              </div>

              {outgoing.length === 0 ? (
                <p className="text-base text-slate-500 dark:text-slate-400 py-6 text-center">
                  Your current congestion level isn't significant enough to affect other ports right now.
                </p>
              ) : (
                <>
                  <RippleBarChart data={outgoingChartData} valueLabel="Effect on them" />
                  <SortControl active={outgoingSortKey} onChange={setOutgoingSortKey} />

                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {sortedOutgoing.map((o) => (
                        <motion.div
                          key={o.downstream_port_id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          className="relative p-5 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-2">
                              <span className="font-bold text-lg text-slate-900 dark:text-white">{o.downstream_port_name}</span>
                              <RiskBadge level={o.risk_level} />
                            </div>
                            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">{o.plain_language_summary}</p>
                            <p className="text-sm text-slate-400 mt-2">Suggested next step: {o.recommended_coordination}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleSendAlert(o.downstream_port_name)} className="shrink-0 text-sm font-bold">
                            <Megaphone className="w-4 h-4 mr-1.5" /> Send Coordination Alert
                          </Button>
                          <button
                            onClick={() => handleDismissOutgoing(o.downstream_port_id)}
                            aria-label="Dismiss this alert"
                            title="Dismiss this alert"
                            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </section>

            {/* ===== SECTION 5: PREPARATION PLAN ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4" id="prep-plan-section">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5 print:hidden">
                <div className="flex items-center gap-2.5">
                  <ListChecks className="w-5 h-5 text-emerald-500 shrink-0" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">What To Do Next</h3>
                </div>
                <Button size="sm" variant="outline" onClick={handlePrintPlan} className="text-sm font-bold">
                  <Printer className="w-4 h-4 mr-1.5" /> Save / Print Plan
                </Button>
              </div>

              {plan.length === 0 ? (
                <p className="text-base text-slate-500 dark:text-slate-400 py-6 text-center">No action needed right now — your network position is stable.</p>
              ) : (
                <div className="space-y-3">
                  {plan.map((item: PreparationAction, idx: number) => {
                    const status = planStatuses[idx] || item.status;
                    return (
                      <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-sm font-bold text-sky-600 dark:text-sky-400 tracking-wide">{item.time_window}</span>
                          <p className="font-bold text-lg text-slate-900 dark:text-white mt-1">{item.action}</p>
                          <p className="text-base text-slate-500 dark:text-slate-400 mt-1.5">Needs: {item.resource_required}</p>
                          <p className="text-base text-emerald-600 dark:text-emerald-400 mt-1">Result: {item.expected_outcome}</p>
                        </div>
                        <button onClick={() => togglePlanStatus(idx, status)} className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border ${PREP_STATUS_STYLE[status]}`}>
                          {status === 'Done' && <CheckCircle2 className="w-4 h-4 inline mr-1.5" />}
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
                <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                  <History className="w-5 h-5 text-slate-400 shrink-0" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">This Has Happened Before</h3>
                </div>
                <p className="text-base text-slate-500 dark:text-slate-400 -mt-1">
                  Real past disruption events, for comparison with what you're seeing now.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {precedents.map((p, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                      <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">{p.event_name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2.5">{p.location}</p>
                      <div className="flex gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                        <span>{p.duration_days} days</span>
                        <span>{p.vessels_affected} vessels</span>
                        <span>+{p.avg_industry_delay_days.toFixed(1)}d avg delay</span>
                      </div>
                      <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4">{p.summary}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== SECTION 7: BACKUP ROUTES ===== */}
            {alternatives && alternatives.length > 0 && (
              <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                  <Anchor className="w-5 h-5 text-sky-500 shrink-0" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Backup Routes If You Get Too Busy</h3>
                </div>
                <div className="space-y-3">
                  {alternatives.map((alt, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border text-base ${alt.has_alternative ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30'}`}>
                      <div className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-white mb-2">
                        {alt.has_alternative ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                        <span>{alt.from_port_name} ↔ {alt.to_port_name}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{alt.plain_language_summary}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== SECTION 8: PORT CLOSURE TEST ===== */}
            <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 print:hidden">
              <button onClick={() => setShowStressTest((v) => !v)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Test: What Happens If My Port Closes?</h3>
                </div>
                {showStressTest ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showStressTest && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3 pt-2">
                    <p className="text-base text-slate-500 dark:text-slate-400">
                      See how an emergency closure or extreme stoppage at your port cascades across connecting trade lanes over 3, 7, and 14 days.
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select value={stressSeverity} onChange={(e) => setStressSeverity(e.target.value as any)} className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200">
                        <option value="low">Brief Incident (1-2 Days)</option>
                        <option value="medium">Moderate Stoppage (3-5 Days)</option>
                        <option value="high">Serious Shutdown (7-10 Days)</option>
                        <option value="critical">Full Emergency Closure</option>
                      </select>
                      <Button onClick={handleRunStressTest} disabled={stressRunning} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm">
                        {stressRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Run This Test
                      </Button>
                    </div>
                    {stressResult && (
                      <div className="space-y-3">
                        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">{stressResult.plain_language_summary}</p>
                        {stressChartData.length > 0 && <RippleBarChart data={stressChartData} valueLabel="14-day increase" height={260} />}
                        <p className="text-sm font-medium text-slate-400">Showing top 8 of {stressResult.affected_ports.length} affected ports, ranked by 14-day impact.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </>
        )}
      </main>

      <footer className="py-4 text-center text-sm text-slate-500 border-t border-slate-200 dark:border-slate-800 ml-16 print:hidden">
        Network Watch — Port Intelligence © 2026
      </footer>
    </div>
  );
};