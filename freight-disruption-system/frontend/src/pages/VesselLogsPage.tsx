// frontend/src/pages/VesselLogsPage.tsx
// Vessel Arrivals & Departures — port-scoped vessel traffic log with full
// manual-update workflow (add / edit ETA / mark arrived / cancel / mark departed),
// built directly on the same VesselArrival data Page 3.2's berths use.
// Also includes AIS "Sync with API" — live telemetry suggests arrival/departure
// changes, the port manager confirms each one, keeping automated + manual in sync.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship,
  Search,
  Download,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  Edit3,
  CheckCircle,
  XCircle,
  Navigation,
  Globe,
  X,
  Satellite,
} from 'lucide-react';
import {
  fetchAllPorts,
  fetchPortVesselTraffic,
  getPortVesselTrafficExportUrl,
  addVesselArrivalApi,
  updateVesselETAApi,
  markVesselArrivedApi,
  cancelVesselArrivalApi,
  markVesselDepartedApi,
  fetchVesselSyncSuggestions,
  BackendPort,
  BackendVesselArrival,
  VesselTrafficCategory,
  VesselSyncSuggestion,
} from '@/services/portManagerApi';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';

const TABS: { key: VesselTrafficCategory; label: string }[] = [
  { key: 'Expected', label: 'Expected Arrivals' },
  { key: 'Docked', label: 'Currently Docked' },
  { key: 'Departed', label: 'Departed' },
];

// Sentinel used consistently across this page, portManagerApi.ts, and the backend router.
const FILTER_ALL = 'All';

export const VesselLogsPage: React.FC = () => {
  const { portId: portIdParam } = useParams<{ portId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { toast } = useToast();

  const [allPortsList, setAllPortsList] = useState<BackendPort[]>([]);
  const [activePortId, setActivePortId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  const activePort = useMemo(
    () => allPortsList.find((p) => p.id === activePortId) || null,
    [allPortsList, activePortId]
  );

  const isManagedPort = useMemo(() => {
    if (role === 'admin') return true;
    if (!activePortId) return false;
    if (user?.portId) return activePortId === user.portId;
    return false;
  }, [role, user?.portId, activePortId]);

  const [logs, setLogs] = useState<BackendVesselArrival[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VesselTrafficCategory>('Expected');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(FILTER_ALL);
  const [flagFilter, setFlagFilter] = useState<string>(FILTER_ALL);

  // ============= INITIAL PORT RESOLUTION =============

  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      try {
        const ports = await fetchAllPorts();
        setAllPortsList(ports);
        const target = portIdParam || user?.portId || ports[0]?.id || null;
        setActivePortId(target);
      } catch (err) {
        console.error('Failed to load ports list:', err);
        setLoadError('Could not connect to backend server.');
      } finally {
        setInitializing(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (portIdParam && portIdParam !== activePortId) {
      setActivePortId(portIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portIdParam]);

  // ============= FETCH VESSEL TRAFFIC =============

  const fetchLogs = async () => {
    if (!activePortId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPortVesselTraffic(activePortId, {
        category: activeTab,
        search: searchTerm || undefined,
        type: typeFilter,
        flag: flagFilter,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch vessel traffic:', err);
      setLoadError('Could not load vessel traffic for this port.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortId, activeTab, searchTerm, typeFilter, flagFilter]);

  const vesselTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.vessel_type).filter(Boolean) as string[]);
    return [FILTER_ALL, ...Array.from(types)];
  }, [logs]);

  const vesselFlags = useMemo(() => {
    const flags = new Set(logs.map((l) => l.vessel_flag).filter(Boolean) as string[]);
    return [FILTER_ALL, ...Array.from(flags)];
  }, [logs]);

  const handleExportCSV = () => {
    if (!activePortId) return;
    const url = getPortVesselTrafficExportUrl(activePortId, {
      category: activeTab,
      search: searchTerm || undefined,
      type: typeFilter,
      flag: flagFilter,
    });
    window.open(url, '_blank');
  };

  // ============= ADD ARRIVAL MODAL =============

  const [showAddArrivalModal, setShowAddArrivalModal] = useState(false);
  const [arrivalForm, setArrivalForm] = useState({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', vessel_flag: '', eta: '', cargo_type: '' });
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);

  const handleAddArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePortId) return;
    setArrivalSubmitting(true);
    try {
      await addVesselArrivalApi(activePortId, {
        vessel_mmsi: parseInt(arrivalForm.vessel_mmsi, 10),
        vessel_name: arrivalForm.vessel_name,
        vessel_type: arrivalForm.vessel_type,
        vessel_flag: arrivalForm.vessel_flag || undefined,
        eta: new Date(arrivalForm.eta).toISOString(),
        cargo_type: arrivalForm.cargo_type || undefined,
      });
      toast({ title: 'Arrival Added ✓', description: `${arrivalForm.vessel_name} added to the schedule.` });
      setShowAddArrivalModal(false);
      setArrivalForm({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', vessel_flag: '', eta: '', cargo_type: '' });
      setActiveTab('Expected');
      await fetchLogs();
    } catch {
      toast({ title: 'Error', description: 'Could not add arrival. Verify backend.', variant: 'destructive' });
    } finally {
      setArrivalSubmitting(false);
    }
  };

  // ============= EDIT ETA =============

  const [editEtaTarget, setEditEtaTarget] = useState<BackendVesselArrival | null>(null);
  const [editEtaValue, setEditEtaValue] = useState('');
  const [editEtaSubmitting, setEditEtaSubmitting] = useState(false);

  const handleEditEta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePortId || !editEtaTarget) return;
    setEditEtaSubmitting(true);
    try {
      await updateVesselETAApi(activePortId, editEtaTarget.id, new Date(editEtaValue).toISOString());
      toast({ title: 'ETA Updated ✓', description: `${editEtaTarget.vessel_name} ETA revised.` });
      setEditEtaTarget(null);
      await fetchLogs();
    } catch {
      toast({ title: 'Error', description: 'Could not update ETA.', variant: 'destructive' });
    } finally {
      setEditEtaSubmitting(false);
    }
  };

  // ============= MARK ARRIVED =============

  const [markArrivedTarget, setMarkArrivedTarget] = useState<BackendVesselArrival | null>(null);
  const [markArrivedSubmitting, setMarkArrivedSubmitting] = useState(false);

  const handleMarkArrived = async () => {
    if (!activePortId || !markArrivedTarget) return;
    setMarkArrivedSubmitting(true);
    try {
      await markVesselArrivedApi(activePortId, markArrivedTarget.id);
      toast({ title: 'Vessel Arrived ✓', description: `${markArrivedTarget.vessel_name} marked as docked.` });
      setMarkArrivedTarget(null);
      await fetchLogs();
    } catch {
      toast({ title: 'Error', description: 'Could not mark vessel as arrived.', variant: 'destructive' });
    } finally {
      setMarkArrivedSubmitting(false);
    }
  };

  // ============= CANCEL ARRIVAL =============

  const [cancelTarget, setCancelTarget] = useState<BackendVesselArrival | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const handleCancelArrival = async () => {
    if (!activePortId || !cancelTarget) return;
    setCancelSubmitting(true);
    try {
      await cancelVesselArrivalApi(activePortId, cancelTarget.id);
      toast({ title: 'Arrival Cancelled', description: `${cancelTarget.vessel_name} removed from schedule.` });
      setCancelTarget(null);
      await fetchLogs();
    } catch {
      toast({ title: 'Error', description: 'Could not cancel arrival.', variant: 'destructive' });
    } finally {
      setCancelSubmitting(false);
    }
  };

  // ============= MARK DEPARTED =============

  const [departTarget, setDepartTarget] = useState<BackendVesselArrival | null>(null);
  const [departSubmitting, setDepartSubmitting] = useState(false);

  const handleMarkDeparted = async () => {
    if (!activePortId || !departTarget) return;
    setDepartSubmitting(true);
    try {
      await markVesselDepartedApi(activePortId, departTarget.id);
      toast({ title: 'Vessel Departed ✓', description: `${departTarget.vessel_name} marked as departed. Berth freed.` });
      setDepartTarget(null);
      await fetchLogs();
    } catch {
      toast({ title: 'Error', description: 'Could not mark vessel as departed.', variant: 'destructive' });
    } finally {
      setDepartSubmitting(false);
    }
  };

  // ============= SYNC WITH API (AIS) =============
  // Fetches AI-detected arrival/departure signals from live AIS telemetry.
  // Nothing changes automatically — the manager confirms each suggestion,
  // which then calls the same mark-arrived / mark-departed endpoints used
  // by the manual action buttons above. Automated + manual stay in sync.

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSuggestions, setSyncSuggestions] = useState<VesselSyncSuggestion[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);

  const handleSyncWithApi = async () => {
    if (!activePortId) return;
    setIsSyncing(true);
    try {
      const suggestions = await fetchVesselSyncSuggestions(activePortId);
      setSyncSuggestions(suggestions);
      setShowSyncModal(true);
      if (suggestions.length === 0) {
        toast({ title: 'AIS Sync Complete', description: 'No live signal changes detected. All records are up to date.' });
      }
    } catch (err) {
      console.error('AIS sync check failed:', err);
      toast({ title: 'Sync Failed', description: 'Could not reach AIS telemetry service.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplySuggestion = async (suggestion: VesselSyncSuggestion) => {
    if (!activePortId) return;
    setApplyingSuggestionId(suggestion.arrival_id);
    try {
      if (suggestion.suggested_status === 'Docked') {
        await markVesselArrivedApi(activePortId, suggestion.arrival_id);
      } else {
        await markVesselDepartedApi(activePortId, suggestion.arrival_id);
      }
      toast({
        title: 'Status Confirmed ✓',
        description: `${suggestion.vessel_name} updated to ${suggestion.suggested_status}.`,
      });
      setSyncSuggestions((prev) => prev.filter((s) => s.arrival_id !== suggestion.arrival_id));
      await fetchLogs();
    } catch {
      toast({ title: 'Error', description: `Could not update ${suggestion.vessel_name}.`, variant: 'destructive' });
    } finally {
      setApplyingSuggestionId(null);
    }
  };

  const handleDismissSuggestion = (arrivalId: string) => {
    setSyncSuggestions((prev) => prev.filter((s) => s.arrival_id !== arrivalId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Docked':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400';
      case 'Scheduled':
      case 'Anchored':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400';
      case 'Delayed':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400';
      case 'Departed':
        return 'bg-slate-500/15 border-slate-500/40 text-slate-600 dark:text-slate-300';
      case 'Cancelled':
        return 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-slate-200 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300';
    }
  };

  const loading = initializing || isLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <PortManagerSidebar currentPortId={activePortId || undefined} />

      {/* ======== TOP NAVIGATION BAR ======== */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between ml-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-white tracking-wide block">
              {activePort ? `${activePort.name} (${activePort.code})` : 'Vessel Arrivals & Departures'}
            </h1>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">VESSEL TRAFFIC LOG</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {allPortsList.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Switch Port:</span>
              <select
                value={activePortId || ''}
                onChange={(e) => navigate(`/dashboard/vessel-logs/${e.target.value}`)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
              >
                {allPortsList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* ======== MAIN CONTENT AREA ======== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-6 ml-16">

        {loadError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{loadError}</span>
            </div>
            <button onClick={fetchLogs} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold font-mono text-[11px]">Retry</button>
          </div>
        )}

        {/* ACCESS BANNER */}
        {activePort && (
          isManagedPort ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Full operational control active for <strong>{activePort.name}</strong>. Vessel arrivals and departures are editable.</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2.5">
              <Globe className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Viewing <strong>{activePort.name}</strong> in read-only network mode.</span>
            </div>
          )
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
              <Clock className="w-4 h-4" />
              <span>TERMINAL TELEMETRY ENGINE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Vessel Arrival & Departure Log
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Expected arrivals, currently docked vessels, and departure history — strictly scoped to {activePort?.name || 'the selected port'}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {isManagedPort && (
              <button
                onClick={handleSyncWithApi}
                disabled={isSyncing}
                title="Check live AIS telemetry for arrival/departure signals"
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
                Sync with API
              </button>
            )}
            {isManagedPort && (
              <button
                onClick={() => setShowAddArrivalModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Arrival
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV ({logs.length})
            </button>
          </div>
        </div>

        {/* TABS & FILTER TOOLBAR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />}
              <span>Showing <strong className="text-slate-900 dark:text-white">{logs.length}</strong> records</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Vessel, MMSI, Cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500/50 capitalize"
            >
              <option value={FILTER_ALL}>All Vessel Types</option>
              {vesselTypes.filter((t) => t !== FILTER_ALL).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value={FILTER_ALL}>All Flag Registries</option>
              {vesselFlags.filter((f) => f !== FILTER_ALL).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>

            <button
              onClick={() => { setSearchTerm(''); setTypeFilter(FILTER_ALL); setFlagFilter(FILTER_ALL); }}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* ======== VESSEL TRAFFIC TABLE ======== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 dark:bg-slate-950 text-white dark:text-slate-200 uppercase font-mono text-[11px] border-b border-slate-900 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-white">Vessel / MMSI</th>
                  <th className="py-3.5 px-4 font-semibold text-white">Type & Flag</th>
                  <th className="py-3.5 px-4 font-semibold text-white">ETA / ATA</th>
                  <th className="py-3.5 px-4 font-semibold text-white">ETD / ATD</th>
                  <th className="py-3.5 px-4 font-semibold text-white">Berth</th>
                  <th className="py-3.5 px-4 font-semibold text-white">Cargo</th>
                  <th className="py-3.5 px-4 font-semibold text-white">Status</th>
                  {isManagedPort && <th className="py-3.5 px-4 font-semibold text-white">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60">
                {loading ? (
                  <tr><td colSpan={8} className="py-14 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></td></tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <Ship className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{log.vessel_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">MMSI: {log.vessel_mmsi}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{log.vessel_type || '—'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{log.vessel_flag || '—'}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {log.ata ? (
                          <div className="text-emerald-700 dark:text-emerald-400 font-bold">{new Date(log.ata).toLocaleString()} <span className="text-[9px] text-slate-400 font-normal block">(ATA)</span></div>
                        ) : (
                          <div>{new Date(log.eta).toLocaleString()} <span className="text-[9px] text-slate-400 font-normal block">(ETA)</span></div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {log.atd ? (
                          <div className="text-purple-700 dark:text-purple-400 font-bold">{new Date(log.atd).toLocaleString()} <span className="text-[9px] text-slate-400 font-normal block">(ATD)</span></div>
                        ) : log.etd ? (
                          <div>{new Date(log.etd).toLocaleString()} <span className="text-[9px] text-slate-400 font-normal block">(ETD)</span></div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/80 dark:border-amber-800/60 inline-block text-[11px]">
                          {log.berth_assignment_status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-medium max-w-[160px] truncate" title={log.cargo_type}>{log.cargo_type || '—'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      {isManagedPort && (
                        <td className="py-4 px-4">
                          {activeTab === 'Expected' && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setMarkArrivedTarget(log)} title="Mark Arrived" className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-all">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setEditEtaTarget(log); setEditEtaValue(log.eta.slice(0, 16)); }} title="Edit ETA" className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-all">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setCancelTarget(log)} title="Cancel" className="p-1.5 rounded-lg bg-slate-500/15 hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-all">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {activeTab === 'Docked' && (
                            <button onClick={() => setDepartTarget(log)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm transition-all">
                              <Navigation className="w-3 h-3" /> MARK DEPARTED
                            </button>
                          )}
                          {activeTab === 'Departed' && <span className="text-[11px] text-slate-400 font-mono">—</span>}
                        </td>
                      )}
                    </motion.tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-mono">No vessel records found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/90 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Showing {logs.length} record(s) for {activePort?.name || '—'}</span>
            <span>Live sync with terminal operations database</span>
          </div>
        </div>
      </main>

      {/* ===== ADD ARRIVAL MODAL ===== */}
      <AnimatePresence>
        {showAddArrivalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500" /><h3 className="font-bold text-slate-900 dark:text-white">Add Vessel Arrival</h3></div>
                <button onClick={() => setShowAddArrivalModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddArrival} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Vessel Name *</label>
                    <input type="text" required placeholder="e.g. MSC Magna" value={arrivalForm.vessel_name} onChange={(e) => setArrivalForm(f => ({ ...f, vessel_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">MMSI *</label>
                    <input type="number" required placeholder="357431000" value={arrivalForm.vessel_mmsi} onChange={(e) => setArrivalForm(f => ({ ...f, vessel_mmsi: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Vessel Type</label>
                    <select value={arrivalForm.vessel_type} onChange={(e) => setArrivalForm(f => ({ ...f, vessel_type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white">
                      {['Container', 'Bulk Carrier', 'Tanker', 'RoRo', 'General Cargo', 'LNG Carrier'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Cargo Type</label>
                    <input type="text" placeholder="Electronics, Steel..." value={arrivalForm.cargo_type} onChange={(e) => setArrivalForm(f => ({ ...f, cargo_type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Flag</label>
                    <input type="text" placeholder="Panama" value={arrivalForm.vessel_flag} onChange={(e) => setArrivalForm(f => ({ ...f, vessel_flag: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">ETA *</label>
                    <input type="datetime-local" required value={arrivalForm.eta} onChange={(e) => setArrivalForm(f => ({ ...f, eta: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddArrivalModal(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                  <button type="submit" disabled={arrivalSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm disabled:opacity-60 transition-all">
                    {arrivalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ship className="w-4 h-4" />}
                    Add to Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== EDIT ETA MODAL ===== */}
      <AnimatePresence>
        {editEtaTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-slate-900 dark:text-white">Edit ETA</h3></div>
                <button onClick={() => setEditEtaTarget(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revising ETA for <span className="font-bold text-slate-900 dark:text-white">{editEtaTarget.vessel_name}</span></p>
              <form onSubmit={handleEditEta} className="space-y-4">
                <input type="datetime-local" required value={editEtaValue} onChange={(e) => setEditEtaValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:outline-none" />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditEtaTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                  <button type="submit" disabled={editEtaSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm disabled:opacity-60 transition-all">
                    {editEtaSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Update ETA
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== CONFIRM MARK ARRIVED ===== */}
      <AnimatePresence>
        {markArrivedTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-500"><CheckCircle className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Mark as Arrived?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"><span className="font-bold">{markArrivedTarget.vessel_name}</span> will be marked as docked.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setMarkArrivedTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                <button onClick={handleMarkArrived} disabled={markArrivedSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {markArrivedSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm Arrival
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== CONFIRM CANCEL ARRIVAL ===== */}
      <AnimatePresence>
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-slate-500/15 text-slate-500"><XCircle className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Cancel Arrival?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"><span className="font-bold">{cancelTarget.vessel_name}</span> will be removed from the schedule.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCancelTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Keep</button>
                <button onClick={handleCancelArrival} disabled={cancelSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {cancelSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Cancel Arrival
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== CONFIRM MARK DEPARTED ===== */}
      <AnimatePresence>
        {departTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-500"><Navigation className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Mark as Departed?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"><span className="font-bold">{departTarget.vessel_name}</span> will depart and its berth will be freed.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDepartTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                <button onClick={handleMarkDeparted} disabled={departSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {departSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Confirm Departure
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== SYNC WITH API — AIS SUGGESTIONS PANEL ===== */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Satellite className="w-5 h-5 text-cyan-500" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">AIS Sync — Detected Signal Changes</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Live vessel telemetry vs. your port schedule. Review and confirm each change.</p>
                  </div>
                </div>
                <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {syncSuggestions.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-mono text-xs">
                    No live AIS signal changes detected. Your schedule is up to date.
                  </div>
                ) : (
                  syncSuggestions.map((s) => (
                    <div
                      key={s.arrival_id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{s.vessel_name}</span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">MMSI {s.vessel_mmsi}</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            s.confidence === 'high'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                          }`}>
                            {s.confidence.toUpperCase()} CONFIDENCE
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          Currently <strong>{s.current_status}</strong> → AIS suggests{' '}
                          <strong className={s.suggested_status === 'Docked' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {s.suggested_status}
                          </strong>
                        </p>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-3 flex-wrap">
                          {s.distance_nm !== undefined && <span>{s.distance_nm} nm from port</span>}
                          {s.ais_speed_knots !== undefined && <span>{s.ais_speed_knots} kts</span>}
                          {s.last_ais_update && <span>Last AIS ping: {new Date(s.last_ais_update).toLocaleTimeString()}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDismissSuggestion(s.arrival_id)}
                          disabled={applyingSuggestionId === s.arrival_id}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleApplySuggestion(s)}
                          disabled={applyingSuggestionId === s.arrival_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold shadow-sm transition-all disabled:opacity-60 ${
                            s.suggested_status === 'Docked' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        >
                          {applyingSuggestionId === s.arrival_id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : (s.suggested_status === 'Docked' ? <CheckCircle className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />)
                          }
                          Confirm {s.suggested_status}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};