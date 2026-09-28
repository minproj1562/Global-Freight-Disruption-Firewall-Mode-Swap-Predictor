import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Anchor,
  Ship,
  Clock,
  Activity,
  Loader2,
  AlertCircle,
  Gauge,
  CheckCircle,
  Plus,
  LayoutGrid,
  List,
  X,
  Zap,
  Map as MapIcon,
  Globe,
  RefreshCw,
  Search,
  Navigation,
  Calendar,
  Edit3,
  Trash2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';
import { useAuthStore } from '@/store/authStore';
import {
  fetchAllPorts,
  fetchPortDetail,
  updateCongestionApi,
  addVesselArrivalApi,
  updateVesselETAApi,
  markVesselArrivedApi,
  cancelVesselArrivalApi,
  markVesselDepartedApi,
  fetchNetworkPortTelemetry,
  BackendPort,
  BackendPortDetail,
  BackendVesselArrival,
  NetworkPortTelemetry,
} from '@/services/portManagerApi';
import { useToast } from '@/components/ui/use-toast';

const geoToCanvas = (lat: number, lon: number, width: number, height: number) => {
  const x = (lon + 180) * (width / 360);
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (width * mercN) / (2 * Math.PI);
  return { x: Math.max(20, Math.min(width - 20, x)), y: Math.max(20, Math.min(height - 20, y)) };
};

// Simplified continent outlines
const CONTINENT_PATHS = [
  "M 120 40 L 280 30 L 320 120 L 260 200 L 150 180 Z", // North America
  "M 260 200 L 330 220 L 310 370 L 270 410 L 230 300 Z", // South America
  "M 410 60 L 530 40 L 580 90 L 510 130 L 430 110 Z", // Europe
  "M 430 140 L 560 140 L 540 290 L 480 340 L 420 230 Z", // Africa
  "M 560 50 L 780 30 L 840 140 L 720 240 L 610 190 L 570 100 Z", // Asia
  "M 710 290 L 820 280 L 850 340 L 760 410 L 690 350 Z" // Australia
];

const getCongestionStyle = (pct: number) => {
  if (pct < 25) return { color: 'text-emerald-500', bar: 'bg-emerald-500', ring: 'ring-emerald-500/30', badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300', label: 'LOW', hex: '#10b981' };
  if (pct < 50) return { color: 'text-amber-500', bar: 'bg-amber-500', ring: 'ring-amber-500/30', badge: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300', label: 'MODERATE', hex: '#f59e0b' };
  if (pct < 85) return { color: 'text-orange-500', bar: 'bg-orange-500', ring: 'ring-orange-500/30', badge: 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300', label: 'HIGH', hex: '#f97316' };
  return { color: 'text-rose-500', bar: 'bg-rose-500', ring: 'ring-rose-500/30 animate-pulse', badge: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300', label: 'CRITICAL', hex: '#ef4444' };
};

const checkIsNetworkPort = (port: BackendPort, assignedPortId?: string): boolean => {
  if (!port) return false;
  if (port.relation === 'self' || port.relation === 'network') return true;
  if (assignedPortId && port.id === assignedPortId) return true;
  return false;
};

export const PortOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuthStore();
  const userPortName = user?.portName || 'Port of Rotterdam';

  const [ports, setPorts] = useState<BackendPort[]>([]);
  const [assignedPort, setAssignedPort] = useState<BackendPort | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Congestion Update Modal — Operational Inputs & API Integration
  const [showCongestionModal, setShowCongestionModal] = useState(false);
  const [congestionValue, setCongestionValue] = useState(0);
  const [congestionNote, setCongestionNote] = useState('');
  const [congestionSubmitting, setCongestionSubmitting] = useState(false);
  const [selectedPortIdForUpdate, setSelectedPortIdForUpdate] = useState<string | null>(null);

  // Logical Operational Inputs (Berths, Anchorage Queue, Conditions)
  const [totalBerthsCount, setTotalBerthsCount] = useState(16);
  const [occupiedBerthsCount, setOccupiedBerthsCount] = useState(10);
  const [anchorageQueueCount, setAnchorageQueueCount] = useState(2);
  const [operatingCondition, setOperatingCondition] = useState<'normal' | 'busy' | 'severe' | 'lockdown'>('busy');
  const [apiBaselineCongestion, setApiBaselineCongestion] = useState(50);

  const recalculateCongestion = (
    total: number,
    occupied: number,
    queue: number,
    condition: 'normal' | 'busy' | 'severe' | 'lockdown'
  ) => {
    const safeTotal = Math.max(1, total);
    const berthRatio = Math.min(1, Math.max(0, occupied / safeTotal));
    const berthContrib = berthRatio * 70;
    const queueContrib = Math.min(22, queue * 3.5);
    const conditionContrib = condition === 'normal' ? 0 : condition === 'busy' ? 5 : condition === 'severe' ? 12 : 20;
    const finalVal = Math.min(100, Math.max(5, Math.round(berthContrib + queueContrib + conditionContrib)));
    setCongestionValue(finalVal);
  };

  const handleOpenCongestionModal = (port: BackendPort) => {
    setSelectedPortIdForUpdate(port.id);
    const total = port.berth_capacity || 16;
    setTotalBerthsCount(total);
    const curr = port.congestion_percent || 45;
    setApiBaselineCongestion(curr);
    const occ = port.active_berths_used ?? Math.min(total, Math.max(1, Math.round((curr / 100) * total)));
    setOccupiedBerthsCount(occ);
    const q = port.waiting_vessels ?? (curr > 75 ? 4 : curr > 50 ? 2 : 0);
    setAnchorageQueueCount(q);
    const cond = curr > 80 ? 'severe' : curr > 55 ? 'busy' : 'normal';
    setOperatingCondition(cond);
    setCongestionValue(curr);
    setCongestionNote('');
    setShowCongestionModal(true);
  };

  const handleSyncWithLiveApi = () => {
    const total = totalBerthsCount || 16;
    const occ = Math.min(total, Math.max(1, Math.round((apiBaselineCongestion / 100) * total)));
    setOccupiedBerthsCount(occ);
    const q = apiBaselineCongestion > 75 ? 4 : apiBaselineCongestion > 50 ? 2 : 0;
    setAnchorageQueueCount(q);
    const cond = apiBaselineCongestion > 80 ? 'severe' : apiBaselineCongestion > 55 ? 'busy' : 'normal';
    setOperatingCondition(cond);
    setCongestionValue(apiBaselineCongestion);
    setCongestionNote('Synced with live AIS satellite telemetry baseline.');
    toast({
      title: 'Synced with Live AIS API',
      description: `Reset to live satellite computed rate: ${apiBaselineCongestion}%`,
    });
  };

  // Add Arrival Modal
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [arrivalForm, setArrivalForm] = useState({
    vessel_name: '',
    vessel_mmsi: '',
    vessel_type: 'Container',
    vessel_flag: '',
    eta: '',
    cargo_type: '',
  });
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);

  // Filter state for Map & Cards: 'all' | 'network' | 'alerts'
  const [viewFilter, setViewFilter] = useState<'all' | 'network' | 'alerts'>('all');

  // Map Hover State
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  // Network Detail Modal State
  const [selectedNetworkPortForDetail, setSelectedNetworkPortForDetail] = useState<BackendPort | null>(null);
  const [showNetworkDetailModal, setShowNetworkDetailModal] = useState<boolean>(false);

  // Selected Network Port for the Dashboard Telemetry Section
  const [selectedDashboardNetworkPortId, setSelectedDashboardNetworkPortId] = useState<string | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<NetworkPortTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(false);

  // Vessel Traffic Section State
  const [managedPortDetail, setManagedPortDetail] = useState<BackendPortDetail | null>(null);
  const [vesselTab, setVesselTab] = useState<'arrivals' | 'departures'>('arrivals');
  const [vesselSearch, setVesselSearch] = useState('');
  const [editEtaArrival, setEditEtaArrival] = useState<BackendVesselArrival | null>(null);
  const [editEtaValue, setEditEtaValue] = useState('');
  const [editEtaSubmitting, setEditEtaSubmitting] = useState(false);
  const [markArrivedTarget, setMarkArrivedTarget] = useState<BackendVesselArrival | null>(null);
  const [markArrivedSubmitting, setMarkArrivedSubmitting] = useState(false);
  const [cancelArrivalTarget, setCancelArrivalTarget] = useState<BackendVesselArrival | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [departTarget, setDepartTarget] = useState<BackendVesselArrival | null>(null);
  const [departSubmitting, setDepartSubmitting] = useState(false);

  // Live UTC Clock
  const [utcTime, setUtcTime] = useState<string>(new Date().toUTCString().slice(17, 25) + ' UTC');
  useEffect(() => {
    const t = setInterval(() => setUtcTime(new Date().toUTCString().slice(17, 25) + ' UTC'), 1000);
    return () => clearInterval(t);
  }, []);

  const loadPortDetail = async (portId: string) => {
    try {
      const detail = await fetchPortDetail(portId);
      setManagedPortDetail(detail);
    } catch (err) {
      console.error('Failed to fetch port detail for vessels:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const basePorts = await fetchAllPorts();
      
      let managerPort = basePorts[0];
      if (basePorts.length > 0) {
        const uPortLower = userPortName.toLowerCase().replace(/port\s+of\s+/i, '').trim();
        managerPort = basePorts.find(p => {
          const pName = p.name.toLowerCase().replace(/port\s+of\s+/i, '').trim();
          const pId = p.id.toLowerCase().replace(/^port-/, '').trim();
          return pName.includes(uPortLower) || uPortLower.includes(pName) || pId.includes(uPortLower) || uPortLower.includes(pId);
        }) || basePorts[0];

        setAssignedPort(managerPort);
        setCongestionValue(managerPort.congestion_percent);
        // Also load vessel arrivals/departures for this port
        await loadPortDetail(managerPort.id);
      }

      const allPortsWithRelation = await fetchAllPorts(undefined, undefined, managerPort?.id);
      setPorts(allPortsWithRelation);
    } catch (err) {
      console.error('Failed to fetch port data:', err);
      setError('Could not connect to backend server. Please verify backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Fetch real-time AI telemetry whenever selected network port changes
  useEffect(() => {
    const networkPortsList = ports.filter(p => checkIsNetworkPort(p, assignedPort?.id) && p.id !== assignedPort?.id);
    const targetPortId = selectedDashboardNetworkPortId ?? networkPortsList[0]?.id;
    if (!targetPortId) return;

    let cancelled = false;
    setTelemetryLoading(true);
    fetchNetworkPortTelemetry(targetPortId, assignedPort?.id)
      .then(data => { if (!cancelled) { setLiveTelemetry(data); } })
      .catch(err => console.error('Telemetry fetch error:', err))
      .finally(() => { if (!cancelled) setTelemetryLoading(false); });

    return () => { cancelled = true; };
  }, [selectedDashboardNetworkPortId, ports, assignedPort?.id]);

  const handleCongestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPortId = selectedPortIdForUpdate || assignedPort?.id;
    if (!targetPortId) return;
    
    const targetPort = ports.find(p => p.id === targetPortId);
    
    setCongestionSubmitting(true);
    try {
      await updateCongestionApi(targetPortId, congestionValue, congestionNote || undefined);
      toast({ title: 'Congestion Updated ✓', description: `Port ${targetPort?.code} set to ${congestionValue}% — Manual override recorded.` });
      setShowCongestionModal(false);
      setCongestionNote('');
      setSelectedPortIdForUpdate(null);
      await loadData();
    } catch {
      toast({ title: 'Update Failed', description: 'Could not update congestion. Please verify backend.', variant: 'destructive' });
    } finally {
      setCongestionSubmitting(false);
    }
  };

  const handleAddArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedPort) return;
    if (!arrivalForm.vessel_name || !arrivalForm.vessel_mmsi || !arrivalForm.eta) {
      toast({ title: 'Validation', description: 'Vessel name, MMSI, and ETA are required.', variant: 'destructive' });
      return;
    }
    setArrivalSubmitting(true);
    try {
      await addVesselArrivalApi(assignedPort.id, {
        vessel_mmsi: parseInt(arrivalForm.vessel_mmsi, 10),
        vessel_name: arrivalForm.vessel_name,
        vessel_type: arrivalForm.vessel_type,
        vessel_flag: arrivalForm.vessel_flag || undefined,
        eta: new Date(arrivalForm.eta).toISOString(),
        cargo_type: arrivalForm.cargo_type || undefined,
      });
      toast({ title: 'Arrival Added ✓', description: `${arrivalForm.vessel_name} added to arrival schedule.` });
      setShowArrivalModal(false);
      setArrivalForm({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', vessel_flag: '', eta: '', cargo_type: '' });
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Could not add arrival. Ensure backend is running.', variant: 'destructive' });
    } finally {
      setArrivalSubmitting(false);
    }
  };

  // Vessel traffic handlers
  const handleMarkArrived = async () => {
    if (!managedPortDetail || !markArrivedTarget) return;
    setMarkArrivedSubmitting(true);
    try {
      await markVesselArrivedApi(managedPortDetail.id, markArrivedTarget.id);
      toast({ title: 'Vessel Arrived ✓', description: `${markArrivedTarget.vessel_name} marked as docked.` });
      setMarkArrivedTarget(null);
      await loadPortDetail(managedPortDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not mark vessel as arrived.', variant: 'destructive' });
    } finally {
      setMarkArrivedSubmitting(false);
    }
  };

  const handleEditEta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedPortDetail || !editEtaArrival || !editEtaValue) return;
    setEditEtaSubmitting(true);
    try {
      await updateVesselETAApi(managedPortDetail.id, editEtaArrival.id, new Date(editEtaValue).toISOString());
      toast({ title: 'ETA Updated ✓', description: `${editEtaArrival.vessel_name} ETA updated.` });
      setEditEtaArrival(null);
      setEditEtaValue('');
      await loadPortDetail(managedPortDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not update ETA.', variant: 'destructive' });
    } finally {
      setEditEtaSubmitting(false);
    }
  };

  const handleCancelArrival = async () => {
    if (!managedPortDetail || !cancelArrivalTarget) return;
    setCancelSubmitting(true);
    try {
      await cancelVesselArrivalApi(managedPortDetail.id, cancelArrivalTarget.id);
      toast({ title: 'Arrival Cancelled', description: `${cancelArrivalTarget.vessel_name} removed from schedule.` });
      setCancelArrivalTarget(null);
      await loadPortDetail(managedPortDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not cancel arrival.', variant: 'destructive' });
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleMarkDeparted = async () => {
    if (!managedPortDetail || !departTarget) return;
    setDepartSubmitting(true);
    try {
      await markVesselDepartedApi(managedPortDetail.id, departTarget.id);
      toast({ title: 'Vessel Departed ✓', description: `${departTarget.vessel_name} marked as departed. Berth freed.` });
      setDepartTarget(null);
      await loadPortDetail(managedPortDetail.id);
      await loadData(); // refresh port cards too since berth freed
    } catch {
      toast({ title: 'Error', description: 'Could not mark vessel as departed.', variant: 'destructive' });
    } finally {
      setDepartSubmitting(false);
    }
  };

  // Filtered arrivals/departures
  const filteredArrivals = useMemo(() => {
    if (!managedPortDetail?.vessel_arrivals) return [];
    return managedPortDetail.vessel_arrivals.filter(a => {
      if (vesselSearch) {
        const q = vesselSearch.toLowerCase();
        if (!a.vessel_name.toLowerCase().includes(q) && !String(a.vessel_mmsi).includes(q)) return false;
      }
      return true;
    });
  }, [managedPortDetail?.vessel_arrivals, vesselSearch]);

  const filteredDepartures = useMemo(() => {
    if (!managedPortDetail?.docked_vessels) return [];
    return managedPortDetail.docked_vessels.filter(d => {
      if (vesselSearch) {
        const q = vesselSearch.toLowerCase();
        if (!d.vessel_name.toLowerCase().includes(q) && !String(d.vessel_mmsi).includes(q)) return false;
      }
      return true;
    });
  }, [managedPortDetail?.docked_vessels, vesselSearch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <PortManagerSidebar />
      
      <div className="flex-1 ml-16 flex flex-col">
        {/* ===== NAVBAR ===== */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-2 shadow-md shadow-amber-500/20 text-slate-950">
              <Anchor className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                PORT OPERATIONS COMMAND
              </h1>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium tracking-wider mt-0.5">
                PAGE 3.1 — PORT OVERVIEW DASHBOARD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{utcTime}</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-8">
          {error && (
            <div className="max-w-6xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
              <button onClick={loadData} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold font-mono text-[11px]">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
              <p className="text-sm font-mono tracking-widest uppercase">Initializing Port Data...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* ===== WORLD MAP SECTION ===== */}
              <motion.section 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Maritime Network</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Live shipping routes, regional congestion, and telemetry connections.</p>
                    </div>
                  </div>

                  {/* Filter Mode Toggle */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                    <button
                      onClick={() => setViewFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${viewFilter === 'all' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      🌐 All Global Ports ({ports.length})
                    </button>
                    <button
                      onClick={() => setViewFilter('network')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${viewFilter === 'network' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      ⚡ Network Routes
                    </button>
                    <button
                      onClick={() => setViewFilter('alerts')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${viewFilter === 'alerts' ? 'bg-rose-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      🚨 Disruption Alerts ({ports.filter(p => p.congestion_percent >= 50).length})
                    </button>
                  </div>
                </div>

                <div className="relative w-full aspect-[2/1] bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Map Grid Background */}
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  
                  <svg viewBox="0 0 900 450" className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Equator & Prime Meridian */}
                    <line x1="0" y1="225" x2="900" y2="225" className="stroke-slate-300 dark:stroke-slate-700/50" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="450" y1="0" x2="450" y2="450" className="stroke-slate-300 dark:stroke-slate-700/50" strokeWidth="1" strokeDasharray="4 4" />
                    
                    {/* Continents */}
                    {CONTINENT_PATHS.map((path, idx) => (
                      <path key={idx} d={path} className="fill-slate-200/50 dark:fill-slate-800/30 stroke-slate-300 dark:stroke-slate-700/50" strokeWidth="1" />
                    ))}

                    {/* CONNECTING SHIPPING ROUTE ARCHES (STRICTLY ONLY VISIBLE IN 'network' FILTER MODE) */}
                    {viewFilter === 'network' && assignedPort && ports.map(destPort => {
                      if (destPort.id === assignedPort.id) return null;
                      // Check if destPort is in the network using checkIsNetworkPort helper
                      const isNetwork = checkIsNetworkPort(destPort, assignedPort.id);
                      if (!isNetwork && destPort.id !== hoveredPortId) return null;

                      const p1 = geoToCanvas(assignedPort.latitude, assignedPort.longitude, 900, 450);
                      const p2 = geoToCanvas(destPort.latitude, destPort.longitude, 900, 450);
                      const midX = (p1.x + p2.x) / 2;
                      const midY = (p1.y + p2.y) / 2 - 40; // Curve arc upwards for high visibility
                      const style = getCongestionStyle(destPort.congestion_percent);
                      
                      return (
                        <g key={`route-${assignedPort.id}-${destPort.id}`}>
                          {/* Outer Glow */}
                          <path
                            d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="4"
                            opacity="0.3"
                          />
                          {/* Animated Dashed Corridor */}
                          <path
                            d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                            fill="none"
                            stroke={style.hex}
                            strokeWidth="2.2"
                            strokeDasharray="6 4"
                            opacity="0.95"
                            className="animate-pulse"
                          />
                        </g>
                      );
                    })}

                    {/* Ports */}
                    {ports.map(port => {
                      const pos = geoToCanvas(port.latitude, port.longitude, 900, 450);
                      const style = getCongestionStyle(port.congestion_percent);
                      const isHovered = hoveredPortId === port.id;
                      const isSelf = port.id === assignedPort?.id || port.relation === 'self';
                      const isNetwork = checkIsNetworkPort(port, assignedPort?.id);

                      // 1. Strict Map Filtering for Network and Alerts View Modes
                      if (viewFilter === 'network' && !isNetwork) {
                        return null; // Completely hide non-network ports in Network mode
                      }

                      if (viewFilter === 'alerts' && port.congestion_percent < 50) {
                        return null; // Completely hide non-disrupted ports in Alerts mode
                      }

                      // 2. Resolve visual styles based on relation
                      let radiusBase = 4;
                      let colorHex = style.hex;
                      let strokeColor = '#ffffff';
                      let strokeWidth = '1';
                      let opacity = 1.0;
                      
                      if (isSelf) {
                        radiusBase = 9;
                        colorHex = '#3b82f6'; // Bright blue for home station
                        strokeColor = '#dbeafe';
                        strokeWidth = '3';
                      } else if (isNetwork) {
                        radiusBase = 7;
                        colorHex = '#f59e0b'; // Amber for trading partners
                        strokeColor = '#fef3c7';
                        strokeWidth = '2.5';
                      } else {
                        // Context other ports (in 'all' mode)
                        radiusBase = 3.5;
                        colorHex = '#94a3b8'; // Muted slate for context ports
                        opacity = 0.6;
                      }

                      return (
                        <g 
                          key={port.id}
                          transform={`translate(${pos.x}, ${pos.y})`}
                          className="cursor-pointer pointer-events-auto"
                          onMouseEnter={() => setHoveredPortId(port.id)}
                          onMouseLeave={() => setHoveredPortId(null)}
                          onClick={() => {
                            setSelectedNetworkPortForDetail(port);
                            setShowNetworkDetailModal(true);
                          }}
                          opacity={opacity}
                        >
                          {/* Pulsing ring for alerts/congested ports */}
                          {port.congestion_percent >= 50 && (
                            <circle r={isHovered ? radiusBase * 4.5 : radiusBase * 3.2} fill="#ef4444" fillOpacity="0.25" className="animate-pulse" />
                          )}
                          <circle r={isHovered ? radiusBase * 3 : radiusBase * 2} fill={colorHex} fillOpacity="0.3" />
                          <circle r={isHovered ? radiusBase * 2 : radiusBase} fill={colorHex} stroke={strokeColor} strokeWidth={strokeWidth} />
                          
                          {/* Marker Badge Tag for Home Port */}
                          {isSelf && (
                            <g transform="translate(0, -20)">
                              <rect x="-38" y="-12" width="76" height="16" rx="4" fill="#2563eb" stroke="#bfdbfe" strokeWidth="1" />
                              <text x="0" y="0" textAnchor="middle" className="text-[9.5px] font-mono font-extrabold fill-white tracking-wider">
                                🏠 MY PORT
                              </text>
                            </g>
                          )}

                          {/* Marker Badge Tag for Network Partners */}
                          {isNetwork && !isSelf && (
                            <g transform="translate(0, -18)">
                              <rect x="-40" y="-11" width="80" height="15" rx="4" fill="#d97706" stroke="#fef3c7" strokeWidth="1" />
                              <text x="0" y="0" textAnchor="middle" className="text-[9px] font-mono font-bold fill-white tracking-wider">
                                ⚡ NETWORK
                              </text>
                            </g>
                          )}

                          {/* Marker Badge Tag for Alerts Mode */}
                          {viewFilter === 'alerts' && port.relation === 'other' && (
                            <g transform="translate(0, -16)">
                              <rect x="-35" y="-11" width="70" height="14" rx="4" fill="#dc2626" stroke="#fecaca" strokeWidth="1" />
                              <text x="0" y="-1" textAnchor="middle" className="text-[8.5px] font-mono font-bold fill-white tracking-wider">
                                ⚠️ ALERT
                              </text>
                            </g>
                          )}

                          {port.relation === 'other' && viewFilter === 'all' && isHovered && (
                            <text 
                              y="-14" 
                              textAnchor="middle" 
                              className="text-[9.5px] font-mono font-bold fill-slate-800 dark:fill-slate-100 drop-shadow-md"
                            >
                              {port.code}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Floating Hover Card */}
                  <AnimatePresence>
                    {hoveredPortId && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl pointer-events-none min-w-[200px]"
                      >
                        {(() => {
                          const p = ports.find(x => x.id === hoveredPortId);
                          if (!p) return null;
                          const s = getCongestionStyle(p.congestion_percent);
                          return (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{p.name}</h4>
                                  <span className="text-[10px] font-mono text-slate-500">{p.code} • {p.country}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${s.badge}`}>
                                  {p.status_label}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                <div>
                                  <div className="text-[9px] text-slate-400 font-mono uppercase">Congestion</div>
                                  <div className={`font-bold text-sm ${s.color}`}>{p.congestion_percent}%</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-400 font-mono uppercase">Wait Time</div>
                                  <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{p.avg_wait_hours}h</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-400 font-mono uppercase">Vessels Docked</div>
                                  <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{p.active_berths_used} / {p.berth_capacity}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-400 font-mono uppercase">Waiting</div>
                                  <div className="font-bold text-sm text-orange-500">{p.waiting_vessels}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Legend Overlay */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[10px] font-mono font-bold shadow-sm">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;25%</span>
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><div className="w-2 h-2 rounded-full bg-amber-500" /> 25-50%</span>
                    <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400"><div className="w-2 h-2 rounded-full bg-orange-500" /> 50-85%</span>
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><div className="w-2 h-2 rounded-full bg-rose-500" /> &gt;85%</span>
                  </div>
                </div>
              </motion.section>

              {/* ===== DEDICATED NETWORK CORRIDOR TELEMETRY DASHBOARD SECTION ===== */}
              {(() => {
                const networkPortsList = ports.filter(p => checkIsNetworkPort(p, assignedPort?.id) && p.id !== assignedPort?.id);
                const activeTelemetryPort = networkPortsList.find(p => p.id === selectedDashboardNetworkPortId) || networkPortsList[0];
                if (!activeTelemetryPort) return null;
                const t = liveTelemetry;
                const ai = t?.ai_impact_prediction;
                const route = t?.route_status;
                const contact = t?.manager_contact;

                return (
                  <motion.section
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
                  >
                    {/* Header & Network Port Selector Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                            ⚡ REAL-TIME AI NETWORK CORRIDOR TELEMETRY
                          </span>
                          {t && <span className="text-[10px] font-mono text-slate-400">Synced: {t.last_sync_timestamp}</span>}
                          {telemetryLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                          Network Partner: {activeTelemetryPort.name} ({activeTelemetryPort.country})
                        </h3>
                      </div>

                      {/* Network Port Selection Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                        {networkPortsList.map(np => {
                          const isSelected = activeTelemetryPort.id === np.id;
                          return (
                            <button
                              key={np.id}
                              onClick={() => setSelectedDashboardNetworkPortId(np.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {np.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5-MODULE NETWORK MONITORING TELEMETRY DASHBOARD */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                      {/* Column 1: Trade Metrics & Route Status */}
                      <div className="space-y-4">
                        {/* Trade Volume & Reliability */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="text-xs font-mono font-bold text-slate-400 uppercase">📊 Trade Volume & Reliability</div>
                          <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                              <div className="text-[9px] text-slate-400">TEU / Month</div>
                              <div className="text-xs font-black text-slate-900 dark:text-white">{t?.trade_volume_teu_monthly ?? '—'}</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                              <div className="text-[9px] text-slate-400">Frequency</div>
                              <div className="text-xs font-black text-slate-900 dark:text-white">{t?.voyage_frequency ?? '—'}</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                              <div className="text-[9px] text-slate-400">On-Time</div>
                              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{t ? `${t.historical_reliability_pct}%` : '—'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Route Status & Alternative Paths */}
                        <div className="bg-amber-500/5 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-500/20 space-y-2 text-xs font-mono">
                          <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                            <span className="truncate pr-2">📍 {route?.corridor_name ?? `${activeTelemetryPort.name} ↔ Your Port`}</span>
                            <span className={`font-extrabold shrink-0 ${route?.route_status?.includes('OPEN') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {route?.route_status ?? '...'}
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            ⏱️ {route?.est_travel_days ?? '12–14 Days'} • {route?.weather_condition ?? 'Clear ⛅'}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            🌊 Sea State: <strong>{route?.sea_state ?? 'Moderate'}</strong>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[9.5px] pt-1 border-t border-amber-500/10">
                            🔀 Alt: <strong>{route?.alternative_route ?? '...'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Vessel Arrival Schedule (Next 7 Days) */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between font-mono">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Ship className="w-4 h-4 text-emerald-500" /> Vessel Schedule (Next 7 Days)
                          </h4>
                          <span className="text-[9px] text-slate-400 font-normal">Direct Sailings</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="text-[9px] text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="py-1.5 px-1">Vessel</th>
                                <th className="py-1.5 px-1">Departure</th>
                                <th className="py-1.5 px-1">Arrival</th>
                                <th className="py-1.5 px-1">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                              {(t?.vessel_schedule ?? []).map(v => (
                                <tr key={v.id}>
                                  <td className="py-2 px-1 font-bold text-slate-900 dark:text-white">{v.vessel_name}</td>
                                  <td className="py-2 px-1 text-slate-500">{v.departure_time}</td>
                                  <td className="py-2 px-1 text-slate-500">{v.arrival_time}</td>
                                  <td className="py-2 px-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                      v.status_code === 'ON_TIME'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    }`}>{v.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Column 3: AI Impact Prediction & Contact Info */}
                      <div className="space-y-4">
                        {/* AI Impact Prediction — REAL DATA */}
                        <div className={`p-4 rounded-2xl border space-y-2 text-xs font-mono ${
                          ai?.risk_level === 'CRITICAL_RIPPLE'
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                            : ai?.risk_level === 'HIGH_RIPPLE'
                            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                        }`}>
                          <div className="font-bold flex items-center justify-between text-indigo-700 dark:text-indigo-300">
                            <span>📈 Real-Time AI Surge Model</span>
                            <span className="text-[9px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-300">{ai ? `${ai.confidence_score_pct}% confidence` : 'AI Engine'}</span>
                          </div>
                          {ai && (
                            <div className="px-2 py-1 rounded-lg text-[9px] font-bold tracking-wide" style={{ background: ai.risk_level === 'CRITICAL_RIPPLE' ? 'rgba(239,68,68,0.15)' : ai.risk_level === 'HIGH_RIPPLE' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)' }}>
                              {ai.risk_badge}
                            </div>
                          )}
                          <p className="text-slate-700 dark:text-slate-300 leading-snug">
                            {ai?.ai_insight_narrative ?? `If ${activeTelemetryPort.name} congestion stays at ${activeTelemetryPort.congestion_percent}%, your station will experience a +${activeTelemetryPort.congestion_percent >= 60 ? '18%' : '12%'} arrival surge in 5 days.`}
                          </p>
                          {ai && (
                            <div className="text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 pt-0.5 border-t border-indigo-200/50 dark:border-indigo-800/30">
                              💡 {ai.ai_recommendation}
                            </div>
                          )}
                        </div>

                        {/* Direct Port Manager Contact Info — REAL DATA */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                          <div className="font-bold text-slate-800 dark:text-slate-200">📞 Port Manager Direct Contact</div>
                          <div className="text-slate-600 dark:text-slate-400">{contact?.role ?? 'Chief Ops Officer'}</div>
                          <div className="text-slate-600 dark:text-slate-400">Manager: <strong className="text-slate-900 dark:text-white">{contact?.manager_name ?? '—'}</strong></div>
                          <div className="text-slate-600 dark:text-slate-400">Email: <strong className="text-indigo-600 dark:text-indigo-400">{contact?.email ?? '—'}</strong></div>
                          <div className="text-slate-600 dark:text-slate-400">Phone: <strong>{contact?.phone ?? '—'}</strong></div>
                          <div className="text-slate-500 dark:text-slate-500">VHF: <strong>{contact?.vhf_channel ?? '—'}</strong></div>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                );
              })()}

              {/* ===== PORT HEALTH CARDS ===== */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {viewFilter === 'alerts' ? 'High Disruption Alert Stations' : 'My Network Port Health Status'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Showing {ports.filter(p => viewFilter === 'alerts' ? p.congestion_percent >= 50 : checkIsNetworkPort(p, assignedPort?.id)).length} Network Stations
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {ports
                    .filter(p => viewFilter === 'alerts' ? p.congestion_percent >= 50 : checkIsNetworkPort(p, assignedPort?.id))
                    .map((port, idx) => {
                    const style = getCongestionStyle(port.congestion_percent);
                    const radius = 36;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (port.congestion_percent / 100) * circumference;
                    
                    const isUserPort = role === 'admin' || (() => {
                      const uPort = userPortName.toLowerCase().replace(/port\s+of\s+/i, '').trim();
                      const pName = port.name.toLowerCase().replace(/port\s+of\s+/i, '').trim();
                      const pId = port.id.toLowerCase().replace(/^port-/, '').trim();
                      return pName.includes(uPort) || uPort.includes(pName) || pId.includes(uPort) || uPort.includes(pId);
                    })();

                    return (
                      <motion.div
                        key={port.id}
                        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.05 }}
                        className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                        onClick={() => navigate(`/dashboard/ports/${port.id}`)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {port.name}
                              </h4>
                              {isUserPort ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 shrink-0">
                                  🟢 Managed Station
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0">
                                  <Globe className="w-2.5 h-2.5 text-slate-400" /> Network View
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-slate-500">{port.code} • {port.country}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${style.badge}`}>
                              {port.status_label}
                            </div>
                            {isUserPort && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCongestionModal(port);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all"
                              >
                                <Gauge className="w-3 h-3" /> Update
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Radial Gauge */}
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle 
                                cx="50" cy="50" r={radius} 
                                className="fill-none stroke-slate-100 dark:stroke-slate-800" 
                                strokeWidth="8" 
                              />
                              <circle 
                                cx="50" cy="50" r={radius} 
                                className={`fill-none ${style.color.replace('text-', 'stroke-')} transition-all duration-1000 ease-out`} 
                                strokeWidth="8"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-xl font-black font-mono ${style.color}`}>{port.congestion_percent}%</span>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-2">
                            <div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mb-0.5"><Ship className="w-3 h-3"/> Docked</div>
                              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{port.active_berths_used} <span className="text-xs font-normal text-slate-400">/ {port.berth_capacity}</span></div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mb-0.5"><Anchor className="w-3 h-3"/> Waiting</div>
                              <div className="text-sm font-bold text-orange-500">{port.waiting_vessels} <span className="text-xs font-normal text-slate-400">vessels</span></div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mb-0.5"><Clock className="w-3 h-3"/> Avg Wait Time</div>
                              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{port.avg_wait_hours} <span className="text-xs font-normal text-slate-400">hours</span></div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* ===== QUICK ACTIONS ===== */}
              {assignedPort && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Actions</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-2">Port Manager Controls for {assignedPort.code}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => handleOpenCongestionModal(assignedPort)}
                      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300/60 dark:border-amber-500/30 hover:border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-all"
                    >
                      <div className="p-3 rounded-2xl bg-amber-500/20 group-hover:bg-amber-500/30"><Gauge className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300">UPDATE CONGESTION</div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-500 font-mono mt-0.5">Override API data</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowArrivalModal(true)}
                      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-300/60 dark:border-blue-500/30 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-all"
                    >
                      <div className="p-3 rounded-2xl bg-blue-500/20 group-hover:bg-blue-500/30"><Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-blue-800 dark:text-blue-300">ADD ARRIVAL</div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-500 font-mono mt-0.5">Schedule new vessel</div>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate(`/dashboard/ports/${assignedPort.id}`)}
                      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-300/60 dark:border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all"
                    >
                      <div className="p-3 rounded-2xl bg-emerald-500/20 group-hover:bg-emerald-500/30"><LayoutGrid className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">VIEW ALL BERTHS</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono mt-0.5">Berth diagram & table</div>
                      </div>
                    </button>

                    <button
                      onClick={() => document.getElementById('port-vessels-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300/60 dark:border-purple-500/30 hover:border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-all"
                    >
                      <div className="p-3 rounded-2xl bg-purple-500/20 group-hover:bg-purple-500/30"><List className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-purple-800 dark:text-purple-300">VIEW ALL VESSELS</div>
                        <div className="text-[10px] text-purple-600 dark:text-purple-500 font-mono mt-0.5">Arrivals & departures</div>
                      </div>
                    </button>
                  </div>
                </motion.section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ===== CONGESTION UPDATE MODAL (OPERATIONAL INPUTS & API SYNC) ===== */}
      <AnimatePresence>
        {showCongestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-lg space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Port Congestion Management</h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Operational berth calculation & AIS satellite telemetry sync
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowCongestionModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* API Telemetry Coexistence Strip */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">LIVE AIS SATELLITE TELEMETRY</div>
                  <div className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                    {apiBaselineCongestion}% Baseline Congestion
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSyncWithLiveApi}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-sm"
                  title="Reset to live satellite AIS telemetry rate"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync with Live API</span>
                </button>
              </div>

              <form onSubmit={handleCongestionSubmit} className="space-y-4 text-xs font-mono">
                {/* 1. Berth Occupancy Counter */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">ACTIVE BERTH OCCUPANCY</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Vessels docked & transferring cargo</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                      {Math.round((occupiedBerthsCount / Math.max(1, totalBerthsCount)) * 100)}% Load
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(0, occupiedBerthsCount - 1);
                          setOccupiedBerthsCount(val);
                          recalculateCongestion(totalBerthsCount, val, anchorageQueueCount, operatingCondition);
                        }}
                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                      >
                        -
                      </button>
                      <span className="text-base font-bold text-slate-900 dark:text-white w-8 text-center">
                        {occupiedBerthsCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(totalBerthsCount, occupiedBerthsCount + 1);
                          setOccupiedBerthsCount(val);
                          recalculateCongestion(totalBerthsCount, val, anchorageQueueCount, operatingCondition);
                        }}
                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      of <strong>{totalBerthsCount}</strong> Total Terminal Berths
                    </span>
                  </div>
                </div>

                {/* 2. Anchorage Waiting Queue */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">OUTER ROADSTEAD / ANCHORAGE QUEUE</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Vessels waiting outside port limits</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      anchorageQueueCount > 4
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : anchorageQueueCount > 1
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {anchorageQueueCount} Ships Waiting
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const val = Math.max(0, anchorageQueueCount - 1);
                        setAnchorageQueueCount(val);
                        recalculateCongestion(totalBerthsCount, occupiedBerthsCount, val, operatingCondition);
                      }}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                    >
                      -
                    </button>
                    <span className="text-base font-bold text-slate-900 dark:text-white w-8 text-center">
                      {anchorageQueueCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const val = Math.min(25, anchorageQueueCount + 1);
                        setAnchorageQueueCount(val);
                        recalculateCongestion(totalBerthsCount, occupiedBerthsCount, val, operatingCondition);
                      }}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                    >
                      +
                    </button>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">
                      (+3.5% queue congestion per waiting vessel)
                    </span>
                  </div>
                </div>

                {/* 3. Terminal Operational Condition */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    TERMINAL OPERATIONAL CONDITION
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { key: 'normal' as const, label: 'Optimal Flow', badge: 'bg-emerald-500' },
                      { key: 'busy' as const, label: 'High Traffic', badge: 'bg-amber-500' },
                      { key: 'severe' as const, label: 'Severe Weather', badge: 'bg-orange-500' },
                      { key: 'lockdown' as const, label: 'Crane Halt', badge: 'bg-rose-500' },
                    ].map((cond) => (
                      <button
                        key={cond.key}
                        type="button"
                        onClick={() => {
                          setOperatingCondition(cond.key);
                          recalculateCongestion(totalBerthsCount, occupiedBerthsCount, anchorageQueueCount, cond.key);
                        }}
                        className={`p-2 rounded-xl text-center border text-[10px] font-bold transition-all ${
                          operatingCondition === cond.key
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Resulting Computed Congestion Index */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-700 dark:text-amber-300 font-bold">
                      CALCULATED CONGESTION INDEX:
                    </span>
                    <span className={`font-black text-xl ${getCongestionStyle(congestionValue).color}`}>
                      {congestionValue}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCongestionStyle(congestionValue).bar} transition-all duration-300`}
                      style={{ width: `${congestionValue}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-slate-600 dark:text-slate-400">
                    Formula: {occupiedBerthsCount}/{totalBerthsCount} berths active ({Math.round((occupiedBerthsCount / totalBerthsCount) * 70)}%) + {anchorageQueueCount} anchored ships ({Math.round(Math.min(22, anchorageQueueCount * 3.5))}%) + condition factor.
                  </div>
                </div>

                {/* 5. Note / Reason */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    OPERATIONAL LOG / REASON <span className="text-slate-400">(logged in audit history)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder={`e.g. Berth maintenance on quay 3; ${anchorageQueueCount} vessels awaiting pilot boarding`}
                    value={congestionNote}
                    onChange={(e) => setCongestionNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs resize-none focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCongestionModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={congestionSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-60 transition-all"
                  >
                    {congestionSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Submit Verified Override</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== ADD ARRIVAL MODAL ===== */}
      <AnimatePresence>
        {showArrivalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pl-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Add Vessel Arrival</h3>
                </div>
                <button onClick={() => setShowArrivalModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddArrival} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Vessel Name *</label>
                    <input
                      type="text" required placeholder="e.g. MSC Magna"
                      value={arrivalForm.vessel_name}
                      onChange={(e) => setArrivalForm(f => ({ ...f, vessel_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">MMSI *</label>
                    <input
                      type="number" required placeholder="e.g. 357431000"
                      value={arrivalForm.vessel_mmsi}
                      onChange={(e) => setArrivalForm(f => ({ ...f, vessel_mmsi: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Vessel Type</label>
                    <select
                      value={arrivalForm.vessel_type}
                      onChange={(e) => setArrivalForm(f => ({ ...f, vessel_type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                    >
                      {['Container', 'Bulk Carrier', 'Tanker', 'RoRo', 'General Cargo', 'LNG Carrier'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Flag</label>
                    <input
                      type="text" placeholder="e.g. Panama"
                      value={arrivalForm.vessel_flag}
                      onChange={(e) => setArrivalForm(f => ({ ...f, vessel_flag: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Cargo Type</label>
                    <input
                      type="text" placeholder="e.g. Electronics"
                      value={arrivalForm.cargo_type}
                      onChange={(e) => setArrivalForm(f => ({ ...f, cargo_type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">ETA (local) *</label>
                    <input
                      type="datetime-local" required
                      value={arrivalForm.eta}
                      onChange={(e) => setArrivalForm(f => ({ ...f, eta: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowArrivalModal(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={arrivalSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-60 transition-all"
                  >
                    {arrivalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ship className="w-4 h-4" />}
                    Add to Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ===== NETWORK PORT TELEMETRY & SCHEDULE MODAL ===== */}
      <AnimatePresence>
        {showNetworkDetailModal && selectedNetworkPortForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pl-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-5 text-slate-900 dark:text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                      ⚡ DIRECT NETWORK CORRIDOR TELEMETRY
                    </span>
                    <span className="text-xs font-mono text-slate-400">UN/LOCODE: {selectedNetworkPortForDetail.code}</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedNetworkPortForDetail.name} ({selectedNetworkPortForDetail.country})</h2>
                </div>
                <button
                  onClick={() => setShowNetworkDetailModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. OVERVIEW & METRICS ROW */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Congestion %</div>
                  <div className={`text-xl font-black ${getCongestionStyle(selectedNetworkPortForDetail.congestion_percent).color}`}>
                    {selectedNetworkPortForDetail.congestion_percent}%
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Avg Wait Time</div>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200">{selectedNetworkPortForDetail.avg_wait_hours} hrs</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Monthly Volume</div>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200">2.5M TEU</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Reliability</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">94.2%</div>
                </div>
              </div>

              {/* 2. VESSEL ARRIVAL & DEPARTURE SCHEDULE (NEXT 7 DAYS) */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Ship className="w-4 h-4 text-emerald-500" /> Vessel Schedule (Next 7 Days)
                  </h4>
                  <span className="text-[10px] text-slate-400">Direct Route Connections</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-2">Vessel Name</th>
                        <th className="py-2 px-2">Departure (Their Port)</th>
                        <th className="py-2 px-2">Arrival (Your Port)</th>
                        <th className="py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white">MSC Aurora</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">Today 14:00 (ATD)</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">Sep 15 08:00 (ETA)</td>
                        <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">On Time ✅</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white">Maersk Blue</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">Tomorrow 06:00 (ETD)</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">Sep 16 12:00 (ETA)</td>
                        <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">Delayed ⚠️ (+6h)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white">COSCO Galaxy</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">Sep 12 08:00 (ETD)</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">Sep 17 14:00 (ETA)</td>
                        <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">On Time ✅</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. ROUTE STATUS & ALTERNATIVES */}
              <div className="bg-amber-500/5 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-500/20 space-y-2 text-xs font-mono">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-500" /> Maritime Route Status & Alternatives
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-300">
                  <div>Direct Route: <strong>{selectedNetworkPortForDetail.name} → {assignedPort?.name || 'Your Port'}</strong></div>
                  <div>Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">OPEN ✅</span> • Weather: <strong>Clear ⛅</strong></div>
                  <div>Est. Sea Travel Time: <strong>12–14 Days</strong></div>
                  <div>Suez / Strait Impact: <strong className="text-emerald-600 dark:text-emerald-400">Fully Operational</strong></div>
                  <div className="md:col-span-2 text-slate-500 dark:text-slate-400 pt-1 border-t border-amber-500/10">
                    🔀 Recommended Alt. Route: <strong>{selectedNetworkPortForDetail.name} → Dubai → {assignedPort?.name || 'Your Port'} (+3 days delay)</strong>
                  </div>
                </div>
              </div>

              {/* 4. AI-PREDICTED IMPACT ON YOUR PORT */}
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between font-bold text-indigo-700 dark:text-indigo-300">
                  <span className="flex items-center gap-2">📈 AI-Predicted Impact on YOUR Port</span>
                  <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-300">Monte Carlo Model v2.4</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Current Congestion at {selectedNetworkPortForDetail.name}: <strong>{selectedNetworkPortForDetail.congestion_percent}%</strong>. If this congestion continues over the next 48 hours, your station will experience a <strong>+{selectedNetworkPortForDetail.congestion_percent >= 60 ? "18%" : "12%"} vessel arrival surge</strong> in 5 days.
                </p>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 font-bold flex items-center gap-2">
                  <span>💡 AI Recommendation:</span>
                  <span>Free up 2 extra berths by Sep 15 to absorb downstream arrival surge.</span>
                </div>
              </div>

              {/* 5. CONTACT INFO & ACTIONS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                  <div>📞 Port Manager: <strong className="text-slate-900 dark:text-white">Jan de Vries (Chief Ops)</strong></div>
                  <div>Email: <strong className="text-indigo-600 dark:text-indigo-400">j.devries@{selectedNetworkPortForDetail.id.replace('port-', '')}port.org</strong> • Phone: <strong>+31 10 252 1000</strong></div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setShowNetworkDetailModal(false);
                      navigate(`/dashboard/ports/${selectedNetworkPortForDetail.id}`);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md"
                  >
                    Open Page 3.2 Detail →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
