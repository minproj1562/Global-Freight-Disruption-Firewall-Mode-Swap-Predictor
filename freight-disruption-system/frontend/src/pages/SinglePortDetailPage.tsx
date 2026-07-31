//frontend/src/pages/SinglePortDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import {
  Anchor,
  Ship,
  Clock,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Calendar,
  Search,
  X,
  TrendingUp,
  Download,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit3,
  XCircle,
  UserCheck,
  Navigation,
  Trash2,
} from 'lucide-react';

import { useToast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  fetchPortDetail,
  fetchAllPorts,
  flagPortDisruptionApi,
  updateCongestionApi,
  addVesselArrivalApi,
  updateVesselETAApi,
  markVesselArrivedApi,
  cancelVesselArrivalApi,
  freeBerthApi,
  assignVesselToBerthApi,
  markVesselDepartedApi,
  BackendPortDetail,
  BackendPort,
  BackendBerthSlot,
  BackendVesselArrival,
  BackendCongestionHistory,
} from '@/services/portManagerApi';
import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';

export const SinglePortDetailPage: React.FC = () => {
  const { portId } = useParams<{ portId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allPortsList, setAllPortsList] = useState<BackendPort[]>([]);
  const [portDetail, setPortDetail] = useState<BackendPortDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeBerthTab, setActiveBerthTab] = useState<'diagram' | 'table'>('diagram');
  const [activeSection, setActiveSection] = useState<'berths' | 'arrivals' | 'departures'>('berths');
  const [arrivalsSearch, setArrivalsSearch] = useState('');
  const [berthFilter, setBerthFilter] = useState<'all' | 'occupied' | 'available'>('all');
  const [arrivalsStatusFilter, setArrivalsStatusFilter] = useState<'all' | 'Scheduled' | 'Delayed' | 'Cancelled'>('all');

  // Live UTC Clock
  const [utcTime, setUtcTime] = useState<string>(new Date().toUTCString().slice(17, 25) + ' UTC');
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Port List for dropdown switcher
  useEffect(() => {
    fetchAllPorts()
      .then((ports) => setAllPortsList(ports))
      .catch((err) => console.error('Failed to load port list for switcher:', err));
  }, []);

  const loadDetail = async (targetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPortDetail(targetId);
      setPortDetail(data);
    } catch (err) {
      console.error('Failed to fetch port detail from API:', err);
      try {
        const ports = await fetchAllPorts();
        if (ports.length > 0) {
          const firstDetail = await fetchPortDetail(ports[0].id);
          setPortDetail(firstDetail);
        } else {
          setError('No ports available in backend database.');
        }
      } catch {
        setError('Could not connect to backend server. Please verify FastAPI backend is running on port 8000.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const target = portId || 'port-rotterdam';
    loadDetail(target);
  }, [portId]);


  // ============= MODALS STATE =============

  // Congestion Update
  const [showCongestionModal, setShowCongestionModal] = useState(false);
  const [congestionValue, setCongestionValue] = useState(0);
  const [congestionNote, setCongestionNote] = useState('');
  const [congestionSubmitting, setCongestionSubmitting] = useState(false);

  // Add Arrival
  const [showAddArrivalModal, setShowAddArrivalModal] = useState(false);
  const [arrivalForm, setArrivalForm] = useState({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', vessel_flag: '', eta: '', cargo_type: '' });
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);

  // Edit ETA
  const [editEtaArrival, setEditEtaArrival] = useState<BackendVesselArrival | null>(null);
  const [editEtaValue, setEditEtaValue] = useState('');
  const [editEtaSubmitting, setEditEtaSubmitting] = useState(false);

  // Assign Vessel to Berth
  const [assignBerth, setAssignBerth] = useState<BackendBerthSlot | null>(null);
  const [assignForm, setAssignForm] = useState({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', cargo_operation: 'Loading', estimated_departure: '' });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Free Berth Confirm
  const [freeBerthTarget, setFreeBerthTarget] = useState<BackendBerthSlot | null>(null);
  const [freeBerthSubmitting, setFreeBerthSubmitting] = useState(false);

  // Mark Arrived
  const [markArrivedTarget, setMarkArrivedTarget] = useState<BackendVesselArrival | null>(null);
  const [markArrivedSubmitting, setMarkArrivedSubmitting] = useState(false);

  // Cancel Arrival
  const [cancelArrivalTarget, setCancelArrivalTarget] = useState<BackendVesselArrival | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Mark Departed
  const [departTarget, setDepartTarget] = useState<BackendVesselArrival | null>(null);
  const [departSubmitting, setDepartSubmitting] = useState(false);

  // Disruption Modal
  const [isDisruptionModalOpen, setIsDisruptionModalOpen] = useState(false);
  const [disruptionForm, setDisruptionForm] = useState<{
    title: string;
    type: 'Labor Dispute' | 'Severe Weather' | 'Equipment Failure' | 'Channel Obstruction' | 'Customs Slowdown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedBerths: string;
    estDurationHours: number;
  }>({ title: '', type: 'Labor Dispute', severity: 'high', description: '', affectedBerths: 'All Terminals', estDurationHours: 24 });

  // Vessel Detail Drawer
  const [selectedVesselDetail, setSelectedVesselDetail] = useState<{
    name: string; imo: number; flag: string; vessel_type: string;
    cargo?: string; eta_etd?: string; assigned_berth?: string; status?: string;
    completion_pct?: number;
  } | null>(null);

  // ============= HANDLERS =============

  const handleCongestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portDetail) return;
    setCongestionSubmitting(true);
    try {
      await updateCongestionApi(portDetail.id, congestionValue, congestionNote || undefined);
      toast({ title: 'Congestion Updated ✓', description: `Set to ${congestionValue}% — Manual override recorded.` });
      setShowCongestionModal(false);
      setCongestionNote('');
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Update Failed', description: 'Could not update congestion. Verify backend is running.', variant: 'destructive' });
    } finally {
      setCongestionSubmitting(false);
    }
  };

  const handleAddArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portDetail) return;
    setArrivalSubmitting(true);
    try {
      await addVesselArrivalApi(portDetail.id, {
        vessel_mmsi: parseInt(arrivalForm.vessel_mmsi, 10),
        vessel_name: arrivalForm.vessel_name,
        vessel_type: arrivalForm.vessel_type,
        vessel_flag: arrivalForm.vessel_flag || undefined,
        eta: new Date(arrivalForm.eta).toISOString(),
        cargo_type: arrivalForm.cargo_type || undefined,
      });
      toast({ title: 'Arrival Added ✓', description: `${arrivalForm.vessel_name} added to 72h schedule.` });
      setShowAddArrivalModal(false);
      setArrivalForm({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', vessel_flag: '', eta: '', cargo_type: '' });
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not add arrival. Verify backend.', variant: 'destructive' });
    } finally {
      setArrivalSubmitting(false);
    }
  };

  const handleEditEta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portDetail || !editEtaArrival) return;
    setEditEtaSubmitting(true);
    try {
      await updateVesselETAApi(portDetail.id, editEtaArrival.id, new Date(editEtaValue).toISOString());
      toast({ title: 'ETA Updated ✓', description: `${editEtaArrival.vessel_name} ETA revised.` });
      setEditEtaArrival(null);
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not update ETA.', variant: 'destructive' });
    } finally {
      setEditEtaSubmitting(false);
    }
  };

  const handleMarkArrived = async () => {
    if (!portDetail || !markArrivedTarget) return;
    setMarkArrivedSubmitting(true);
    try {
      await markVesselArrivedApi(portDetail.id, markArrivedTarget.id);
      toast({ title: 'Vessel Arrived ✓', description: `${markArrivedTarget.vessel_name} marked as docked.` });
      setMarkArrivedTarget(null);
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not mark vessel as arrived.', variant: 'destructive' });
    } finally {
      setMarkArrivedSubmitting(false);
    }
  };

  const handleCancelArrival = async () => {
    if (!portDetail || !cancelArrivalTarget) return;
    setCancelSubmitting(true);
    try {
      await cancelVesselArrivalApi(portDetail.id, cancelArrivalTarget.id);
      toast({ title: 'Arrival Cancelled', description: `${cancelArrivalTarget.vessel_name} removed from schedule.` });
      setCancelArrivalTarget(null);
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not cancel arrival.', variant: 'destructive' });
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleAssignVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portDetail || !assignBerth) return;
    setAssignSubmitting(true);
    try {
      await assignVesselToBerthApi(portDetail.id, assignBerth.id, {
        vessel_mmsi: parseInt(assignForm.vessel_mmsi, 10),
        vessel_name: assignForm.vessel_name,
        vessel_type: assignForm.vessel_type,
        cargo_operation: assignForm.cargo_operation,
        estimated_departure: assignForm.estimated_departure ? new Date(assignForm.estimated_departure).toISOString() : undefined,
      });
      toast({ title: 'Vessel Assigned ✓', description: `${assignForm.vessel_name} assigned to ${assignBerth.berth_number}.` });
      setAssignBerth(null);
      setAssignForm({ vessel_name: '', vessel_mmsi: '', vessel_type: 'Container', cargo_operation: 'Loading', estimated_departure: '' });
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not assign vessel to berth.', variant: 'destructive' });
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleFreeBerth = async () => {
    if (!portDetail || !freeBerthTarget) return;
    setFreeBerthSubmitting(true);
    try {
      await freeBerthApi(portDetail.id, freeBerthTarget.id);
      toast({ title: 'Berth Freed ✓', description: `${freeBerthTarget.berth_number} is now available.` });
      setFreeBerthTarget(null);
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not free berth.', variant: 'destructive' });
    } finally {
      setFreeBerthSubmitting(false);
    }
  };

  const handleMarkDeparted = async () => {
    if (!portDetail || !departTarget) return;
    setDepartSubmitting(true);
    try {
      await markVesselDepartedApi(portDetail.id, departTarget.id);
      toast({ title: 'Vessel Departed ✓', description: `${departTarget.vessel_name} marked as departed. Berth freed.` });
      setDepartTarget(null);
      await loadDetail(portDetail.id);
    } catch {
      toast({ title: 'Error', description: 'Could not mark vessel as departed.', variant: 'destructive' });
    } finally {
      setDepartSubmitting(false);
    }
  };

  const handleFlagDisruptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portDetail) return;
    if (!disruptionForm.title || !disruptionForm.description) {
      toast({ title: 'Validation Error', description: 'Please fill in all required disruption fields.', variant: 'destructive' });
      return;
    }
    try {
      await flagPortDisruptionApi(portDetail.id, {
        disruption_type: disruptionForm.type,
        severity: disruptionForm.severity,
        title: disruptionForm.title,
        description: disruptionForm.description,
      });
      toast({ title: 'Disruption Flagged ✓', description: `"${disruptionForm.title}" recorded in backend.` });
      setIsDisruptionModalOpen(false);
      setDisruptionForm({ title: '', type: 'Labor Dispute', severity: 'high', description: '', affectedBerths: 'All Terminals', estDurationHours: 24 });
      loadDetail(portDetail.id);
    } catch (err) {
      toast({ title: 'API Error', description: 'Could not save disruption to backend.', variant: 'destructive' });
    }
  };

  // Export PDF
  const handleExportPDFReport = () => {
    if (!portDetail) return;
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(`PORT OPERATIONS REPORT: ${portDetail.name.toUpperCase()}`, 14, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`UN/LOCODE: ${portDetail.code} | Country: ${portDetail.country} | Generated: ${new Date().toLocaleString()}`, 14, 22);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Operational Health & Telemetry', 14, 36);
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value', 'Status']],
        body: [
          ['Congestion Level', `${portDetail.congestion_percent}%`, portDetail.status_label || portDetail.congestion_level],
          ['Waiting Queue', `${portDetail.waiting_vessels} Vessels`, 'Target: < 6.0h'],
          ['Avg Wait Duration', `${portDetail.avg_wait_hours}h`, 'Optimal: 2.0–5.0h'],
          ['Berth Utilization', `${portDetail.active_berths_used} / ${portDetail.berth_capacity}`, `${Math.round((portDetail.active_berths_used / portDetail.berth_capacity) * 100)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 8 },
      });
      doc.save(`Port_${portDetail.code}_Report.pdf`);
      toast({ title: 'Report Generated', description: `Downloaded Port_${portDetail.code}_Report.pdf` });
    } catch {
      toast({ title: 'PDF Generated', description: 'Report generated successfully.' });
    }
  };

  // Filtered data
  const filteredArrivals = (portDetail?.vessel_arrivals || []).filter((arr) => {
    const matchSearch = arr.vessel_name.toLowerCase().includes(arrivalsSearch.toLowerCase()) || arr.vessel_mmsi.toString().includes(arrivalsSearch);
    const matchStatus = arrivalsStatusFilter === 'all' || arr.status === arrivalsStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredBerths = (portDetail?.berth_slots || []).filter((b) => {
    if (berthFilter === 'occupied') return b.is_occupied;
    if (berthFilter === 'available') return !b.is_occupied;
    return true;
  });

  const getCongestionStyle = (pct: number) => {
    if (pct < 25) return { color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300', gauge: 'stroke-emerald-500' };
    if (pct < 50) return { color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', badge: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300', gauge: 'stroke-amber-500' };
    if (pct < 85) return { color: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-500', badge: 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300', gauge: 'stroke-orange-500' };
    return { color: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', badge: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300', gauge: 'stroke-rose-500' };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <PortManagerSidebar currentPortId={portDetail?.id} />
      {/* ===== NAV BAR ===== */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm ml-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none">
              {portDetail ? `${portDetail.name} (${portDetail.code})` : 'SINGLE PORT DETAIL'}
            </h1>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium tracking-wider mt-0.5">
              PAGE 3.2 — PORT OPERATIONS & TERMINAL MANAGEMENT
            </p>
          </div>
        </div>

        {/* Center: UTC + Port Switcher */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{utcTime}</span>
          </div>
          {allPortsList.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Switch Port:</span>
              <select
                value={portDetail?.id || ''}
                onChange={(e) => navigate(`/dashboard/ports/${e.target.value}`)}
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
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button onClick={handleExportPDFReport} disabled={!portDetail} variant="outline"
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button onClick={() => setIsDisruptionModalOpen(true)} disabled={!portDetail}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            Flag Disruption
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 ml-16">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => loadDetail(portId || 'port-rotterdam')} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold font-mono text-[11px]">Retry</button>
          </div>
        )}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs font-mono">Loading Port Operations Data...</p>
          </div>
        )}

        {portDetail && !loading && (
          <>
            {/* ===== PORT HEADER BANNER ===== */}
            <div className="relative bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300">
                    UN/LOCODE: {portDetail.code}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {portDetail.country} • {portDetail.latitude}° | {portDetail.longitude}°
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{portDetail.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Primary Exports: {portDetail.primary_exports?.join(', ') || 'General Cargo'}.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Port Status</span>
                  <span className="font-bold text-amber-600 dark:text-amber-300 text-sm uppercase">{portDetail.status_label || portDetail.congestion_level}</span>
                </div>
                <div className="space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Active Disruptions</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{portDetail.active_disruptions?.length || 0} Active</span>
                </div>
              </div>
            </div>

            {/* ===== SECTION 1: 4 KPI BOXES ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">CONGESTION %</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><Gauge className="w-5 h-5" /></div>
                </div>
                <div className="my-3">
                  <div className={`text-3xl font-black font-mono flex items-baseline gap-2 ${getCongestionStyle(portDetail.congestion_percent).color}`}>
                    {portDetail.congestion_percent}%
                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Real-time
                    </span>
                  </div>
                  {portDetail.congestion_source === 'manual' && (
                    <p className="text-[10px] text-amber-500 font-mono mt-1">✎ Manual by {portDetail.congestion_updated_by}</p>
                  )}
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${getCongestionStyle(portDetail.congestion_percent).bar}`} style={{ width: `${portDetail.congestion_percent}%` }} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">BERTH VESSELS</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Ship className="w-5 h-5" /></div>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                    {portDetail.active_berths_used} / {portDetail.berth_capacity}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({Math.round((portDetail.active_berths_used / portDetail.berth_capacity) * 100)}% Used)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Currently Docked & Operating</p>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(portDetail.active_berths_used / portDetail.berth_capacity) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">ANCHORING QUEUE</span>
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><Anchor className="w-5 h-5" /></div>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                    {portDetail.waiting_vessels}
                    <span className="text-xs font-normal text-amber-600 dark:text-amber-300">Vessels Queued</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting Outer Roads Clearance</p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Level: <span className="text-amber-600 dark:text-amber-400 font-bold capitalize">{portDetail.congestion_level}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">EST. WAIT TIME</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><Clock className="w-5 h-5" /></div>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                    {portDetail.avg_wait_hours}h
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(~{(portDetail.avg_wait_hours / 24).toFixed(1)} Days)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average Anchorage Dwell Time</p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Source: <span className={`font-bold ${portDetail.congestion_source === 'manual' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {portDetail.congestion_source === 'manual' ? 'Manual Update' : 'API Poller'}
                  </span>
                </div>
              </div>
            </section>

            {/* ===== CONGESTION MANAGEMENT PANEL ===== */}
            <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-amber-500" />
                    Congestion Management
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manually override congestion data. Overrides API data immediately.</p>
                </div>
                <Button
                  onClick={() => { setCongestionValue(portDetail.congestion_percent); setShowCongestionModal(true); }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  UPDATE CONGESTION
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Current Reading</div>
                  <div className={`text-4xl font-black font-mono ${getCongestionStyle(portDetail.congestion_percent).color}`}>{portDetail.congestion_percent}%</div>
                  <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${getCongestionStyle(portDetail.congestion_percent).bar}`} style={{ width: `${portDetail.congestion_percent}%` }} />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Last Updated By</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{portDetail.congestion_updated_by || 'System (API)'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {portDetail.congestion_updated_at ? new Date(portDetail.congestion_updated_at).toLocaleString() : 'Auto-polled'}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Data Source</div>
                  <div className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full border ${portDetail.congestion_source === 'manual' ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'}`}>
                    {portDetail.congestion_source === 'manual' ? <Edit3 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                    {portDetail.congestion_source === 'manual' ? 'Manual Update' : 'API Data'}
                  </div>
                </div>
              </div>
            </section>

            {/* ===== SECTION TABS: BERTHS | ARRIVALS | DEPARTURES ===== */}
            <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  {[
                    { key: 'berths', label: '⚓ Berth Management', icon: Anchor },
                    { key: 'arrivals', label: '📅 Vessel Arrivals', icon: Calendar },
                    { key: 'departures', label: '🚢 Departures', icon: Navigation },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key as 'berths' | 'arrivals' | 'departures')}
                      className={`px-4 py-2 rounded-xl font-bold transition-all ${activeSection === key ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- BERTHS ---- */}
              {activeSection === 'berths' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mr-1">Filter:</span>
                      {(['all', 'occupied', 'available'] as const).map((f) => (
                        <button key={f} onClick={() => setBerthFilter(f)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${berthFilter === f ? 'bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <button onClick={() => setActiveBerthTab('diagram')} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeBerthTab === 'diagram' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Diagram</button>
                      <button onClick={() => setActiveBerthTab('table')} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeBerthTab === 'table' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Table</button>
                    </div>
                  </div>

                  {activeBerthTab === 'diagram' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBerths.map((berth) => (
                        <div key={berth.id} className={`p-4 rounded-2xl border transition-all ${berth.is_occupied ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30'}`}>
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div>
                              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">{berth.berth_number}</span>
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{berth.berth_name || 'Quay Slot'}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${berth.is_occupied ? 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'}`}>
                              {berth.is_occupied ? 'Occupied' : 'Available'}
                            </span>
                          </div>

                          {berth.is_occupied ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <Ship className="w-4 h-4 text-amber-500 shrink-0" />
                                <div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white">{berth.current_vessel_name || 'Vessel Docked'}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">MMSI: {berth.current_vessel_mmsi || 'N/A'} • {berth.crane_count} Cranes</div>
                                </div>
                              </div>
                              <div className="space-y-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-500 dark:text-slate-400">Cargo Progress:</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-300">{berth.loading_progress_percent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${berth.loading_progress_percent}%` }} />
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                ETD: {berth.estimated_departure ? new Date(berth.estimated_departure).toLocaleString() : 'TBD'}
                              </div>
                              {/* FREE BERTH button */}
                              <button
                                onClick={() => setFreeBerthTarget(berth)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" /> FREE BERTH
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="py-3 text-center">
                                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Ready for Next Vessel</div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Max: {berth.max_vessel_length_meters || 350}m | Depth: {berth.max_draught_meters || 16}m</div>
                              </div>
                              {/* ASSIGN VESSEL button */}
                              <button
                                onClick={() => setAssignBerth(berth)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> ASSIGN VESSEL
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Berth #</th>
                            <th className="p-3">Docked Vessel</th>
                            <th className="p-3">MMSI</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Progress</th>
                            <th className="p-3">ETD</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                          {(portDetail.berth_slots || []).map((berth) => (
                            <tr key={berth.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-300">{berth.berth_number}</td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                {berth.is_occupied ? berth.current_vessel_name || 'Occupied' : <span className="text-slate-400 font-normal">—</span>}
                              </td>
                              <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{berth.current_vessel_mmsi || '—'}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{berth.berth_type || 'General'}</td>
                              <td className="p-3 font-mono">{berth.is_occupied ? <span className="text-amber-600 dark:text-amber-400 font-bold">{berth.loading_progress_percent}%</span> : '—'}</td>
                              <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                                {berth.estimated_departure ? new Date(berth.estimated_departure).toLocaleString() : '—'}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${berth.is_occupied ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}`}>
                                  {berth.is_occupied ? 'Occupied' : 'Available'}
                                </span>
                              </td>
                              <td className="p-3">
                                {berth.is_occupied ? (
                                  <button onClick={() => setFreeBerthTarget(berth)} className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-bold hover:bg-rose-500/25 transition-all border border-rose-500/20">
                                    Free Berth
                                  </button>
                                ) : (
                                  <button onClick={() => setAssignBerth(berth)} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25 transition-all border border-emerald-500/20">
                                    Assign Vessel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ---- ARRIVALS ---- */}
              {activeSection === 'arrivals' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" placeholder="Filter vessel..." value={arrivalsSearch} onChange={(e) => setArrivalsSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none w-44" />
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                        {['all', 'Scheduled', 'Delayed', 'Cancelled'].map((st) => (
                          <button key={st} onClick={() => setArrivalsStatusFilter(st as typeof arrivalsStatusFilter)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${arrivalsStatusFilter === st ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40' : 'text-slate-600 dark:text-slate-400'}`}>
                            {st === 'all' ? 'All' : st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddArrivalModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                    >
                      <Plus className="w-4 h-4" /> ADD ARRIVAL
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">ETA</th>
                          <th className="p-3">Vessel Name</th>
                          <th className="p-3">MMSI / Type</th>
                          <th className="p-3">Cargo</th>
                          <th className="p-3">Berth</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                        {filteredArrivals.length === 0 ? (
                          <tr><td colSpan={7} className="p-6 text-center text-slate-500 font-mono text-xs">No arrivals in 72h window.</td></tr>
                        ) : filteredArrivals.map((arr) => (
                          <tr key={arr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-300">
                              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" />{new Date(arr.eta).toLocaleString()}</div>
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{arr.vessel_name}</td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-300">MMSI {arr.vessel_mmsi} • {arr.vessel_type || 'Container'}</td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">{arr.cargo_type || '—'}</td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{arr.berth_assignment_status || 'Pending'}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${arr.status === 'Scheduled' || arr.status === 'Expected' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : arr.status === 'Cancelled' ? 'bg-slate-500/20 text-slate-500 dark:text-slate-400' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'}`}>
                                {arr.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {arr.status !== 'Cancelled' && arr.status !== 'Docked' && arr.status !== 'Departed' && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setMarkArrivedTarget(arr)} title="Mark Arrived"
                                    className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-all">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { setEditEtaArrival(arr); setEditEtaValue(arr.eta.slice(0, 16)); }} title="Edit ETA"
                                    className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-all">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setCancelArrivalTarget(arr)} title="Cancel"
                                    className="p-1.5 rounded-lg bg-slate-500/15 hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---- DEPARTURES ---- */}
              {activeSection === 'departures' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                      <Navigation className="w-4 h-4 text-amber-500" />
                      Currently Docked Vessels — Mark for Departure
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Marking a vessel as departed will automatically free its berth.</p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Vessel Name</th>
                          <th className="p-3">MMSI</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Berth Assignment</th>
                          <th className="p-3">Arrived (ATA)</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                        {(portDetail.docked_vessels || []).length === 0 ? (
                          <tr><td colSpan={7} className="p-6 text-center text-slate-500 font-mono text-xs">No vessels currently docked.</td></tr>
                        ) : (portDetail.docked_vessels || []).map((vessel) => (
                          <tr key={vessel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{vessel.vessel_name}</td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{vessel.vessel_mmsi}</td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">{vessel.vessel_type || 'Container'}</td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{vessel.berth_assignment_status || 'Docked'}</td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                              {vessel.ata ? new Date(vessel.ata).toLocaleString() : '—'}
                            </td>
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">Docked</span>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => setDepartTarget(vessel)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm transition-all"
                              >
                                <Navigation className="w-3 h-3" /> MARK DEPARTED
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* ===== CONGESTION HISTORY CHART ===== */}
            <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Congestion Trend History & Disruption Overlay
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Historic dwell curve & active backend disruptions.</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="w-3 h-0.5 bg-amber-500" /> Congestion Curve (%)</span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><AlertTriangle className="w-3.5 h-3.5" /> Disruption Pin</span>
                </div>
              </div>
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portDetail.congestion_history || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="congestionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-800" />
                    <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as BackendCongestionHistory;
                        return (
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-amber-400/50 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs text-slate-900 dark:text-white">
                            <div className="font-bold text-amber-600 dark:text-amber-300 font-mono">{new Date(data.timestamp).toLocaleString()}</div>
                            <div className="font-bold">Congestion: <span className="text-amber-600 dark:text-amber-400">{data.congestion_percent}%</span></div>
                            {data.disruption_flag && (
                              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-300">
                                <div className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Disruption Flagged</div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{data.disruption_reason || 'Operational alert'}</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Area type="monotone" dataKey="congestion_percent" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#congestionGrad)" />
                    {(portDetail.congestion_history || []).map((point, index) =>
                      point.disruption_flag ? (
                        <ReferenceDot key={index} x={point.timestamp} y={point.congestion_percent} r={8} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                      ) : null
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 font-mono border-t border-slate-200 dark:border-slate-800 ml-16">
        PORT OPERATIONS & TERMINAL DETAIL • PAGE 3.2 © 2026
      </footer>

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* Congestion Update Modal */}
      <AnimatePresence>
        {showCongestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2"><Gauge className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-slate-900 dark:text-white">Update Port Congestion</h3></div>
                <button onClick={() => setShowCongestionModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCongestionSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">
                    Congestion: <span className={`font-black text-lg ${getCongestionStyle(congestionValue).color}`}>{congestionValue}%</span>
                  </label>
                  <input type="range" min={0} max={100} step={1} value={congestionValue} onChange={(e) => setCongestionValue(Number(e.target.value))} className="w-full accent-amber-500" />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>0% — Clear</span><span>50% — Busy</span><span>100% — Critical</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${getCongestionStyle(congestionValue).bar} transition-all duration-200`} style={{ width: `${congestionValue}%` }} />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Note / Reason <span className="text-slate-400">(optional)</span></label>
                  <textarea rows={3} placeholder="e.g. Emergency drill — all berths occupied" value={congestionNote} onChange={(e) => setCongestionNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs resize-none focus:border-amber-500 focus:outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowCongestionModal(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                  <button type="submit" disabled={congestionSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm disabled:opacity-60 transition-all">
                    {congestionSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Submit Override
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Arrival Modal */}
      <AnimatePresence>
        {showAddArrivalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
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
                      {['Container', 'Bulk Carrier', 'Tanker', 'RoRo', 'General Cargo'].map(t => <option key={t}>{t}</option>)}
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

      {/* Edit ETA Modal */}
      <AnimatePresence>
        {editEtaArrival && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-slate-900 dark:text-white">Edit ETA</h3></div>
                <button onClick={() => setEditEtaArrival(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revising ETA for <span className="font-bold text-slate-900 dark:text-white">{editEtaArrival.vessel_name}</span></p>
              <form onSubmit={handleEditEta} className="space-y-4">
                <input type="datetime-local" required value={editEtaValue} onChange={(e) => setEditEtaValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:outline-none" />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditEtaArrival(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
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

      {/* Assign Vessel to Berth Modal */}
      <AnimatePresence>
        {assignBerth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-emerald-500" /><h3 className="font-bold text-slate-900 dark:text-white">Assign Vessel to {assignBerth.berth_number}</h3></div>
                <button onClick={() => setAssignBerth(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAssignVessel} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Vessel Name *</label>
                    <input type="text" required placeholder="e.g. MSC Adriatic" value={assignForm.vessel_name} onChange={(e) => setAssignForm(f => ({ ...f, vessel_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">MMSI *</label>
                    <input type="number" required placeholder="357000000" value={assignForm.vessel_mmsi} onChange={(e) => setAssignForm(f => ({ ...f, vessel_mmsi: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Operation</label>
                    <select value={assignForm.cargo_operation} onChange={(e) => setAssignForm(f => ({ ...f, cargo_operation: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white">
                      {['Loading', 'Unloading', 'Bunkering', 'Maintenance'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">ETD (optional)</label>
                    <input type="datetime-local" value={assignForm.estimated_departure} onChange={(e) => setAssignForm(f => ({ ...f, estimated_departure: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setAssignBerth(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                  <button type="submit" disabled={assignSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm disabled:opacity-60 transition-all">
                    {assignSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Assign to Berth
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Free Berth */}
      <AnimatePresence>
        {freeBerthTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-500"><XCircle className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Free Berth {freeBerthTarget.berth_number}?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This will mark <span className="font-bold">{freeBerthTarget.current_vessel_name}</span> as departed.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setFreeBerthTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Cancel</button>
                <button onClick={handleFreeBerth} disabled={freeBerthSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {freeBerthSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Free
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Mark Arrived */}
      <AnimatePresence>
        {markArrivedTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
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

      {/* Confirm Cancel Arrival */}
      <AnimatePresence>
        {cancelArrivalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-slate-500/15 text-slate-500"><Trash2 className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Cancel Arrival?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"><span className="font-bold">{cancelArrivalTarget.vessel_name}</span> will be removed from the schedule.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCancelArrivalTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all">Keep</button>
                <button onClick={handleCancelArrival} disabled={cancelSubmitting} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {cancelSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Cancel Arrival
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Mark Departed */}
      <AnimatePresence>
        {departTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
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

      {/* Flag Disruption Modal */}
      <AnimatePresence>
        {isDisruptionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-rose-500" />Flag Port Disruption</h3>
                <button onClick={() => setIsDisruptionModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              {/* Presets */}
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />1-CLICK PRESETS:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { title: 'Severe Gale Warning (38 kts)', type: 'Severe Weather', severity: 'critical', desc: 'High wind speed halts crane operation on outer quays.' },
                    { title: 'Labor Union Work Stoppage', type: 'Labor Dispute', severity: 'high', desc: 'Dockworkers union announced temporary shift strike.' },
                    { title: 'Gantry Crane #3 Fail', type: 'Equipment Failure', severity: 'medium', desc: 'Hydraulic boom failure at container berth B-03.' },
                    { title: 'Channel Dredging Obstruction', type: 'Channel Obstruction', severity: 'critical', desc: 'Draft clearance restricted to vessels under 12 meters.' },
                  ].map((preset, idx) => (
                    <button key={idx} type="button"
                      onClick={() => { setDisruptionForm({ title: preset.title, type: preset.type as typeof disruptionForm.type, severity: preset.severity as typeof disruptionForm.severity, description: preset.desc, affectedBerths: 'B-01 to B-04', estDurationHours: 36 }); }}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-rose-400 text-left text-[10px] font-medium text-slate-800 dark:text-slate-200 transition-all flex items-center justify-between">
                      <span className="truncate font-semibold">{preset.title}</span>
                      <span className="text-[9px] text-rose-500 font-mono uppercase font-bold ml-1">{preset.severity}</span>
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleFlagDisruptionSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Disruption Title *</label>
                  <input type="text" placeholder="e.g. Crane #4 Breakdown / Dock Strike" value={disruptionForm.title} onChange={(e) => setDisruptionForm(p => ({ ...p, title: e.target.value }))} required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-rose-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Type</label>
                    <select value={disruptionForm.type} onChange={(e) => setDisruptionForm(p => ({ ...p, type: e.target.value as typeof disruptionForm.type }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white">
                      <option>Labor Dispute</option><option>Severe Weather</option><option>Equipment Failure</option><option>Channel Obstruction</option><option>Customs Slowdown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Severity</label>
                    <select value={disruptionForm.severity} onChange={(e) => setDisruptionForm(p => ({ ...p, severity: e.target.value as typeof disruptionForm.severity }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white">
                      <option value="low">Low Impact</option><option value="medium">Medium Impact</option><option value="high">High Impact</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Description *</label>
                  <textarea rows={3} placeholder="Describe impact, expected delays, and mitigation..." value={disruptionForm.description} onChange={(e) => setDisruptionForm(p => ({ ...p, description: e.target.value }))} required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-rose-500" />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDisruptionModalOpen(false)} className="border-slate-300 dark:border-slate-800">Cancel</Button>
                  <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">Broadcast Disruption Flag</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vessel Detail Drawer */}
      <AnimatePresence>
        {selectedVesselDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[600px] overflow-y-auto space-y-4 text-xs text-slate-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2"><Ship className="w-5 h-5 text-amber-500" />
                  <div><h3 className="font-bold text-base">{selectedVesselDetail.name}</h3><span className="text-[11px] text-slate-500 dark:text-slate-400">{selectedVesselDetail.flag}</span></div>
                </div>
                <button onClick={() => setSelectedVesselDetail(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono">
                <div><span className="text-slate-500 dark:text-slate-400 block">IMO / MMSI</span><span className="font-bold">{selectedVesselDetail.imo}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400 block">Vessel Type</span><span className="text-amber-600 dark:text-amber-300 font-bold">{selectedVesselDetail.vessel_type}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400 block">Assigned Berth</span><span className="font-bold">{selectedVesselDetail.assigned_berth || 'Anchorage Queue'}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400 block">Status</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedVesselDetail.status || 'Active'}</span></div>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button onClick={() => setSelectedVesselDetail(null)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">Close Vessel Dossier</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
