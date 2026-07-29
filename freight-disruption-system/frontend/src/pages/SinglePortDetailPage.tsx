import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar,
  Layers,
  Activity,
  Plus,
  ShieldAlert,
  Wind,
  Thermometer,
  Eye,
  Info,
  X,
  FileText,
  User,
  LogOut,
  Sliders,
  TrendingUp,
} from 'lucide-react';

import {
  EXTENDED_PORTS_DATA,
  ExtendedPortDetail,
  BerthDetail,
  ArrivingVessel,
  TimelinePoint,
} from '@/shared/mock/portMockData';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { Button } from '@/components/ui/button';

export const SinglePortDetailPage: React.FC = () => {
  const { portId } = useParams<{ portId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  // Find matching port or default to Rotterdam
  const initialPort =
    EXTENDED_PORTS_DATA.find((p) => p.id === portId) || EXTENDED_PORTS_DATA[0];

  const [currentPort, setCurrentPort] = useState<ExtendedPortDetail>(initialPort);
  const [activeBerthTab, setActiveBerthTab] = useState<'diagram' | 'table'>('diagram');
  const [arrivalsTimeFilter, setArrivalsTimeFilter] = useState<'24h' | '48h' | '72h'>('72h');
  const [arrivalsSearch, setArrivalsSearch] = useState('');

  // Selected Vessel for Drawer/Modal
  const [selectedVesselDetail, setSelectedVesselDetail] = useState<{
    name: string;
    imo: number;
    flag: string;
    vessel_type: string;
    cargo?: string;
    length?: number;
    eta_etd?: string;
    assigned_berth?: string;
    status?: string;
    teus_handled?: number;
    completion_pct?: number;
  } | null>(null);

  // Disruption Modal State
  const [isDisruptionModalOpen, setIsDisruptionModalOpen] = useState(false);
  const [disruptionForm, setDisruptionForm] = useState({
    title: '',
    type: 'Labor Dispute' as const,
    severity: 'high' as const,
    description: '',
    affectedBerths: 'All Terminals',
    estDurationHours: 24,
  });

  // Filter 72h Arrivals Schedule
  const filteredArrivals = currentPort.arrivals_72h.filter((arr) => {
    const matchesSearch =
      arr.name.toLowerCase().includes(arrivalsSearch.toLowerCase()) ||
      arr.origin_port.toLowerCase().includes(arrivalsSearch.toLowerCase()) ||
      arr.imo.toString().includes(arrivalsSearch);

    const maxHours = arrivalsTimeFilter === '24h' ? 24 : arrivalsTimeFilter === '48h' ? 48 : 72;
    const matchesTime = arr.hours_until_arrival <= maxHours;

    return matchesSearch && matchesTime;
  });

  // Handle Flagging Port as Disrupted
  const handleFlagDisruptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!disruptionForm.title || !disruptionForm.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required disruption fields.",
        variant: "destructive",
      });
      return;
    }

    // Add new timeline disruption point & increase congestion percent
    const newTimelinePoint: TimelinePoint = {
      timestamp: 'Now (Disrupted)',
      congestion_percent: Math.min(100, currentPort.congestion_percent + 15),
      disruption_event: {
        id: `dis-user-${Date.now()}`,
        title: disruptionForm.title,
        type: disruptionForm.type,
        severity: disruptionForm.severity,
        time_label: 'Just Now (Manual Flag)',
        impact_description: disruptionForm.description,
      },
    };

    setCurrentPort((prev) => ({
      ...prev,
      congestion_percent: Math.min(100, prev.congestion_percent + 15),
      status_label: disruptionForm.severity === 'critical' ? 'Critical Disruption' : 'High Congestion',
      timeline: [...prev.timeline, newTimelinePoint],
    }));

    toast({
      title: "Port Disruption Flagged Successfully!",
      description: `Disruption "${disruptionForm.title}" recorded for ${currentPort.name}. Incoming vessels notified.`,
    });

    setIsDisruptionModalOpen(false);
    setDisruptionForm({
      title: '',
      type: 'Labor Dispute',
      severity: 'high',
      description: '',
      affectedBerths: 'All Terminals',
      estDurationHours: 24,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between transition-colors duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP NAV BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/ports')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center gap-1.5 text-xs font-mono font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Port Overview (3.1)
          </button>
          <div className="hidden sm:block border-l border-slate-200 dark:border-slate-800 pl-3">
            <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-2">
              {currentPort.name} ({currentPort.code})
            </h1>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium tracking-wider mt-0.5">
              PAGE 3.2 — SINGLE PORT OPERATIONS & TERMINAL DETAIL
            </p>
          </div>
        </div>

        {/* Center Quick Switcher Dropdown */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Switch Port:</span>
          <select
            value={currentPort.id}
            onChange={(e) => {
              const target = EXTENDED_PORTS_DATA.find((p) => p.id === e.target.value);
              if (target) {
                setCurrentPort(target);
                navigate(`/dashboard/ports/${target.id}`);
              }
            }}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            {EXTENDED_PORTS_DATA.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsDisruptionModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-1.5 transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            Flag Port as Disrupted
          </Button>
          <ThemeToggle />
          {user && (
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* ========================================================================= */}
        {/* PORT HEADER BANNER */}
        {/* ========================================================================= */}
        <div className="relative bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300">
                UN/LOCODE: {currentPort.code}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {currentPort.country} • Lat: {currentPort.latitude}° | Lon: {currentPort.longitude}°
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              {currentPort.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Primary Terminal Exports: {currentPort.primary_exports?.join(', ')}. Monitoring real-time berth utilization & AIS arrivals.
            </p>
          </div>

          {/* Weather & Tide Widget */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temp:
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{currentPort.weather.temp_c}°C</span>
            </div>
            <div className="space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                <Wind className="w-3.5 h-3.5 text-amber-500" /> Wind:
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{currentPort.weather.wind_kts} kts</span>
            </div>
            <div className="space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                <Eye className="w-3.5 h-3.5 text-amber-500" /> Tide:
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-300 text-xs">{currentPort.weather.tide_status}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: 4 KPI BOXES */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1: Congestion % */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">CONGESTION %</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Gauge className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                {currentPort.congestion_percent}%
                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +3.2% 24h
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live Terminal Dwell Metric</p>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  currentPort.congestion_percent > 70
                    ? 'bg-rose-500'
                    : currentPort.congestion_percent > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${currentPort.congestion_percent}%` }}
              />
            </div>
          </div>

          {/* KPI 2: Berth Vessels */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">BERTH VESSELS</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Ship className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                {currentPort.active_berths_used} / {currentPort.berth_capacity}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({Math.round((currentPort.active_berths_used / currentPort.berth_capacity) * 100)}% Used)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Currently Docked & Operating</p>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${(currentPort.active_berths_used / currentPort.berth_capacity) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* KPI 3: Anchoring (Queue Size) */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">ANCHORING QUEUE</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <Anchor className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                {currentPort.waiting_vessels}
                <span className="text-xs font-normal text-amber-600 dark:text-amber-300">Vessels Queued</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting Outer Roads Clearance</p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Status: <span className="text-amber-600 dark:text-amber-400 font-bold">{currentPort.status_label}</span>
            </div>
          </div>

          {/* KPI 4: Est. Wait Time */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">EST. WAIT TIME</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-2">
                {currentPort.avg_wait_hours}h
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  (~{(currentPort.avg_wait_hours / 24).toFixed(1)} Days)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average Anchorage Dwell Time</p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Queue Velocity: <span className="text-emerald-600 dark:text-emerald-400 font-bold">1.4 ships/hr</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: BERTH STATUS TABLE + VISUAL BERTH DIAGRAM */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Anchor className="w-5 h-5 text-amber-500" />
                Terminal Berth Allocation & Live Quay Map
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Interactive graphical representation of docked ships and active crane operations.
              </p>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setActiveBerthTab('diagram')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeBerthTab === 'diagram'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Visual Berth Diagram
              </button>
              <button
                onClick={() => setActiveBerthTab('table')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeBerthTab === 'table'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Berth Data Table
              </button>
            </div>
          </div>

          {/* VISUAL BERTH DIAGRAM VIEW */}
          {activeBerthTab === 'diagram' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPort.berths.map((berth) => {
                  const isOccupied = berth.status.startsWith('Occupied');
                  const vessel = berth.current_vessel;

                  return (
                    <div
                      key={berth.berth_id}
                      onClick={() => {
                        if (vessel) {
                          setSelectedVesselDetail({
                            name: vessel.name,
                            imo: vessel.imo,
                            flag: vessel.flag,
                            vessel_type: vessel.vessel_type,
                            cargo: vessel.cargo_type,
                            length: vessel.length_meters,
                            eta_etd: vessel.estimated_departure,
                            assigned_berth: berth.berth_number,
                            status: berth.status,
                            teus_handled: vessel.teus_handled,
                            completion_pct: vessel.completion_pct,
                          });
                        }
                      }}
                      className={`p-4 rounded-2xl border transition-all ${
                        vessel ? 'cursor-pointer hover:border-amber-400' : ''
                      } ${
                        isOccupied
                          ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800'
                          : berth.status === 'Available'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30'
                      }`}
                    >
                      {/* Berth Header */}
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                            {berth.berth_number}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{berth.berth_name}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isOccupied
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300'
                              : berth.status === 'Available'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {berth.status}
                        </span>
                      </div>

                      {/* Berth Specs & Vessel Visual */}
                      {vessel ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <Ship className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                {vessel.name}
                                <span className="text-[10px] text-slate-500 font-mono">{vessel.flag}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                IMO {vessel.imo} • {vessel.length_meters}m • {vessel.cranes_assigned} Quay Cranes
                              </div>
                            </div>
                          </div>

                          {/* TEU Cargo Progress */}
                          <div className="space-y-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500 dark:text-slate-400">Loading/Discharge Progress:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-300">{vessel.completion_pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                                style={{ width: `${vessel.completion_pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between pt-1">
                            <span>ETD: {vessel.estimated_departure.split(' ')[1]}</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold underline">Inspect Vessel →</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center space-y-1">
                          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {berth.status === 'Available' ? 'Ready for Next Vessel' : 'Under Engineering Maintenance'}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            Max Length: {berth.length_meters}m | Depth: {berth.depth_meters}m
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* BERTH DATA TABLE VIEW */
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Berth #</th>
                    <th className="p-3">Docked Vessel</th>
                    <th className="p-3">IMO / MMSI</th>
                    <th className="p-3">Vessel Type</th>
                    <th className="p-3">Cargo Progress</th>
                    <th className="p-3">ETD</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                  {currentPort.berths.map((berth) => (
                    <tr
                      key={berth.berth_id}
                      onClick={() => {
                        if (berth.current_vessel) {
                          setSelectedVesselDetail({
                            name: berth.current_vessel.name,
                            imo: berth.current_vessel.imo,
                            flag: berth.current_vessel.flag,
                            vessel_type: berth.current_vessel.vessel_type,
                            cargo: berth.current_vessel.cargo_type,
                            length: berth.current_vessel.length_meters,
                            eta_etd: berth.current_vessel.estimated_departure,
                            assigned_berth: berth.berth_number,
                            status: berth.status,
                            teus_handled: berth.current_vessel.teus_handled,
                            completion_pct: berth.current_vessel.completion_pct,
                          });
                        }
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-300">{berth.berth_number}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {berth.current_vessel ? (
                          <div className="flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-amber-500" />
                            {berth.current_vessel.name} ({berth.current_vessel.flag})
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {berth.current_vessel ? berth.current_vessel.imo : '—'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {berth.current_vessel ? berth.current_vessel.vessel_type : '—'}
                      </td>
                      <td className="p-3 font-mono">
                        {berth.current_vessel ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {berth.current_vessel.completion_pct}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        {berth.current_vessel ? berth.current_vessel.estimated_departure : '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            berth.status.startsWith('Occupied')
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                              : berth.status === 'Available'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {berth.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: VESSEL ARRIVALS SCHEDULE FOR NEXT 72 HOURS */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Vessel Arrivals Schedule (Next 72 Hours)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Incoming AIS radar timeline. Click any arriving vessel for complete dossier.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Arrivals */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter vessel or origin..."
                  value={arrivalsSearch}
                  onChange={(e) => setArrivalsSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none w-44"
                />
              </div>

              {/* Time Window Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                {(['24h', '48h', '72h'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setArrivalsTimeFilter(tf)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      arrivalsTimeFilter === tf
                        ? 'bg-amber-400 text-slate-950 font-bold shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tf} Window
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Arrivals Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">ETA (Arrival Time)</th>
                  <th className="p-3">Vessel Name</th>
                  <th className="p-3">IMO / Type</th>
                  <th className="p-3">Origin Port</th>
                  <th className="p-3">Assigned Berth</th>
                  <th className="p-3">Wait Est.</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                {filteredArrivals.map((arr) => (
                  <tr
                    key={arr.id}
                    onClick={() =>
                      setSelectedVesselDetail({
                        name: arr.name,
                        imo: arr.imo,
                        flag: arr.flag,
                        vessel_type: arr.vessel_type,
                        cargo: arr.cargo_description,
                        eta_etd: arr.eta,
                        assigned_berth: arr.assigned_berth,
                        status: arr.status,
                      })
                    }
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {arr.eta}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {arr.name} <span className="text-[10px] text-slate-400 font-normal">{arr.flag}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                      IMO {arr.imo} • {arr.vessel_type}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{arr.origin_port}</td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{arr.assigned_berth}</td>
                    <td className="p-3 font-mono text-amber-600 dark:text-amber-400 font-bold">{arr.estimated_wait_hours}h</td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          arr.status === 'On Schedule'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : arr.status === 'Priority Clearance'
                            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                            : arr.status === 'Anchored'
                            ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                            : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {arr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: CONGESTION HISTORY CHART WITH DISRUPTION OVERLAY */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Congestion Trend History & Disruption Overlay
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Historic 7-day dwell curve + 72-hour AI forecast with operational disruption events overlaid.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-3 h-0.5 bg-amber-500" /> Congestion Curve (%)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Disruption Flag Pin
              </span>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentPort.timeline} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="congestionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-800" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TimelinePoint;
                      return (
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-amber-400/50 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs text-slate-900 dark:text-white">
                          <div className="font-bold text-amber-600 dark:text-amber-300 font-mono">{data.timestamp}</div>
                          <div className="font-bold">
                            Congestion Level: <span className="text-amber-600 dark:text-amber-400">{data.congestion_percent}%</span>
                          </div>
                          {data.disruption_event && (
                            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-300 space-y-1">
                              <div className="font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> {data.disruption_event.title}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{data.disruption_event.impact_description}</p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="congestion_percent"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#congestionGrad)"
                />

                {/* Render Disruption Overlay Dots */}
                {currentPort.timeline.map((point, index) => {
                  if (point.disruption_event) {
                    return (
                      <ReferenceDot
                        key={index}
                        x={point.timestamp}
                        y={point.congestion_percent}
                        r={8}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: FLAG PORT AS DISRUPTED */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDisruptionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Flag Port Operational Disruption
                </h3>
                <button
                  onClick={() => setIsDisruptionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFlagDisruptionSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Disruption Event Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Crane #4 Hydraulic Breakdown / Dock Strike"
                    value={disruptionForm.title}
                    onChange={(e) => setDisruptionForm((p) => ({ ...p, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Disruption Type</label>
                    <select
                      value={disruptionForm.type}
                      onChange={(e) => setDisruptionForm((p) => ({ ...p, type: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="Labor Dispute">Labor Dispute</option>
                      <option value="Severe Weather">Severe Weather / Typhoon</option>
                      <option value="Equipment Failure">Equipment Failure</option>
                      <option value="Channel Obstruction">Channel Dredging / Blockage</option>
                      <option value="Customs Slowdown">Customs System Slowdown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Severity Level</label>
                    <select
                      value={disruptionForm.severity}
                      onChange={(e) => setDisruptionForm((p) => ({ ...p, severity: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                      <option value="critical">Critical (Stop Cargo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Description & Operational Advice *</label>
                  <textarea
                    rows={3}
                    placeholder="Describe impact on incoming vessels, expected delays, and mitigation instructions..."
                    value={disruptionForm.description}
                    onChange={(e) => setDisruptionForm((p) => ({ ...p, description: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-rose-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDisruptionModalOpen(false)}
                    className="border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                    Broadcast Disruption Flag
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: VESSEL DETAILS DRAWER / POPUP */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedVesselDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full h-full max-h-[600px] overflow-y-auto space-y-4 text-xs text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-base">{selectedVesselDetail.name}</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{selectedVesselDetail.flag}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVesselDetail(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">IMO Number</span>
                    <span className="font-bold">{selectedVesselDetail.imo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Vessel Type</span>
                    <span className="text-amber-600 dark:text-amber-300 font-bold">{selectedVesselDetail.vessel_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Assigned Location</span>
                    <span className="font-bold">{selectedVesselDetail.assigned_berth || 'Anchorage Queue'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Status</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedVesselDetail.status || 'Active'}</span>
                  </div>
                </div>

                {selectedVesselDetail.cargo && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block font-semibold mb-1">Cargo Summary</span>
                    <p className="text-slate-700 dark:text-slate-200">{selectedVesselDetail.cargo}</p>
                  </div>
                )}

                {selectedVesselDetail.completion_pct !== undefined && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Loading Completion:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedVesselDetail.completion_pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${selectedVesselDetail.completion_pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button
                  onClick={() => setSelectedVesselDetail(null)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Close Vessel Dossier
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-4 text-center text-xs text-slate-500 font-mono border-t border-slate-200 dark:border-slate-800">
        PORT OPERATIONS & TERMINAL DETAIL • PAGE 3.2 &copy; 2026
      </footer>
    </div>
  );
};
