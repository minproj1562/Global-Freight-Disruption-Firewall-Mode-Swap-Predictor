// frontend/src/pages/VesselRegistryPage.tsx
/**
 * PAGE 1.8: FLEET INTELLIGENCE COMMAND CENTER
 * 
 * Redesigned to Page 1.6 executive logistics intelligence benchmark:
 * - Compact command header with operational metrics & quick links
 * - 5 targeted KPIs: Monitored Fleet, Telemetry Coverage, Route Deviations, Disruption Exposure, Offline/Stale
 * - Interactive Fleet Situation Surface (Mapbox) with vessel markers, course vectors, and camera controls
 * - AIS Discovery with verified presets, rich preview card, and instant "Add to Monitored Fleet"
 * - Operational Fleet Manifest Table with compact rows, copyable identifiers, and telemetry status
 * - Slide-out / Slide-down Vessel Intelligence Drawer with detailed telemetry, voyage stats, and operational actions
 * - Polished enrollment dialog with auto-filling from available AIS data
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship,
  Search,
  Plus,
  Trash2,
  MapPin,
  Compass,
  Radio,
  Clock,
  CheckCircle2,
  X,
  Shield,
  Layers,
  RefreshCw,
  Info,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Download,
  AlertTriangle,
  ArrowUpRight,
  Eye,
  Activity,
  Anchor,
  Sparkles,
  ArrowRight,
  Route as RouteIcon,
  Crosshair,
  Gauge
} from 'lucide-react';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { FleetSituationMap } from '@/features/map/FleetSituationMap';
import { RegisteredVessel, AISVesselData, VesselType } from '@/types';
import { getRegisteredFleet, addVesselToFleet, removeVesselFromFleet } from '@/services/fleetService';
import { searchAISVessels } from '@/services/aisService';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/shared/components/EmptyState';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

const VESSEL_TYPES: VesselType[] = ['Container', 'Tanker', 'Bulk Carrier', 'Cargo', 'Special'];

// Verified presets existing in simulated AIS dataset
const VERIFIED_AIS_PRESETS = [
  'COSCO SHIPPING UNIVERSE',
  'EVER GIVEN',
  'MSC OSCAR',
  'ONE APUS',
  'CMA CGM ANTOINE DE SAINT EXUPERY'
];

export const VesselRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fleet, setFleet] = useState<RegisteredVessel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Search-to-Register AIS discovery
  const [aisSearchQuery, setAisSearchQuery] = useState<string>('');
  const [aisSearchResults, setAisSearchResults] = useState<AISVesselData[]>([]);
  const [isSearchingAis, setIsSearchingAis] = useState<boolean>(false);
  const [inspectedSearchResult, setInspectedSearchResult] = useState<AISVesselData | null>(null);

  // Vessel Intelligence Drawer
  const [selectedVessel, setSelectedVessel] = useState<RegisteredVessel | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual Add Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    name: string;
    mmsi: string;
    imo: string;
    vessel_type: VesselType;
    flag: string;
    notes: string;
  }>({
    name: '',
    mmsi: '',
    imo: '',
    vessel_type: 'Container',
    flag: '',
    notes: '',
  });

  const loadFleet = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getRegisteredFleet();
      setFleet(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load registered fleet', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
    const interval = setInterval(() => {
      loadFleet(true);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadFleet(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // AIS search debounce
  useEffect(() => {
    if (!aisSearchQuery.trim()) {
      setAisSearchResults([]);
      setInspectedSearchResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAis(true);
      try {
        const results = await searchAISVessels(aisSearchQuery);
        setAisSearchResults(results);
        if (results.length > 0) {
          setInspectedSearchResult(results[0]);
        } else {
          setInspectedSearchResult(null);
        }
      } catch (err) {
        console.error('Error querying simulated AIS source', err);
      } finally {
        setIsSearchingAis(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [aisSearchQuery]);

  const handleAddFromAis = async (vessel: AISVesselData) => {
    if (fleet.some((f) => f.mmsi === vessel.mmsi)) {
      toast({
        title: 'Vessel Already Monitored',
        description: `${vessel.name} (MMSI: ${vessel.mmsi}) is already enrolled in your fleet.`,
      });
      return;
    }

    try {
      const added = await addVesselToFleet({
        name: vessel.name,
        mmsi: vessel.mmsi,
        imo: vessel.imo,
        vessel_type: vessel.vessel_type,
        flag: vessel.flag,
        notes: `Enrolled via AIS discovery (Destination: ${vessel.destination})`,
      });

      setFleet((prev) => [added, ...prev]);
      setSelectedVessel(added);
      setAisSearchQuery('');
      setAisSearchResults([]);
      setInspectedSearchResult(null);

      toast({
        title: 'Vessel Added to Fleet',
        description: `${vessel.name} enrolled with telemetry tracking active.`,
      });
    } catch (_err) {
      toast({
        title: 'Registration Error',
        description: 'Failed to add vessel to fleet.',
        variant: 'destructive',
      });
    }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.mmsi || !formData.imo) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please provide vessel name, valid MMSI, and IMO number.',
        variant: 'destructive',
      });
      return;
    }

    const mmsiNum = parseInt(formData.mmsi, 10);
    const imoNum = parseInt(formData.imo, 10);

    if (isNaN(mmsiNum) || isNaN(imoNum)) {
      toast({
        title: 'Invalid Identifier',
        description: 'MMSI and IMO must contain numeric digits only.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const added = await addVesselToFleet({
        name: formData.name.trim(),
        mmsi: mmsiNum,
        imo: imoNum,
        vessel_type: formData.vessel_type,
        flag: formData.flag.trim() || 'International',
        notes: formData.notes.trim() || 'Manual fleet entry',
      });

      setFleet((prev) => [added, ...prev]);
      setIsModalOpen(false);
      setSelectedVessel(added);
      setFormData({
        name: '',
        mmsi: '',
        imo: '',
        vessel_type: 'Container',
        flag: '',
        notes: '',
      });

      toast({
        title: 'Vessel Registered',
        description: added.has_live_ais
          ? `${added.name} registered. Telemetry stream synchronized.`
          : `${added.name} registered. Transponder offline or pending broadcast.`,
      });
    } catch (_err) {
      toast({
        title: 'Registration Error',
        description: 'Failed to register vessel metadata.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveVessel = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove ${name} from your fleet registry?`)) {
      await removeVesselFromFleet(id);
      setFleet((prev) => prev.filter((v) => v.id !== id));
      if (selectedVessel?.id === id) setSelectedVessel(null);
      toast({
        title: 'Vessel Removed',
        description: `${name} has been removed from monitored fleet.`,
      });
    }
  };

  const handleCopyText = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportManifest = () => {
    const csvHeader = 'Name,IMO,MMSI,Type,Flag,HasTelemetry,Latitude,Longitude,SpeedKnots,Status,Destination\n';
    const csvRows = fleet.map(v => 
      `"${v.name}",${v.imo},${v.mmsi},"${v.vessel_type}","${v.flag}",${v.has_live_ais},${v.current_lat || ''},${v.current_lon || ''},${v.speed || ''},"${v.navigation_status || ''}","${v.destination || ''}"`
    ).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Fleet_Intelligence_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Manifest Exported',
      description: `Exported ${fleet.length} monitored vessel records to CSV.`,
    });
  };

  const filteredFleet = useMemo(() => {
    return fleet.filter((v) => {
      const q = tableSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        v.name.toLowerCase().includes(q) ||
        v.mmsi.toString().includes(q) ||
        v.imo.toString().includes(q) ||
        v.vessel_type.toLowerCase().includes(q) ||
        v.flag.toLowerCase().includes(q) ||
        (v.destination && v.destination.toLowerCase().includes(q))
      );

      const matchesType = selectedTypeFilter === 'All' || v.vessel_type === selectedTypeFilter;
      const matchesStatus = 
        selectedStatusFilter === 'All' || 
        (selectedStatusFilter === 'Live' && v.has_live_ais) ||
        (selectedStatusFilter === 'Offline' && !v.has_live_ais);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [fleet, tableSearch, selectedTypeFilter, selectedStatusFilter]);

  // Operational KPI values
  const totalMonitored = fleet.length;
  const liveCount = fleet.filter((v) => v.has_live_ais).length;
  const coveragePct = totalMonitored > 0 ? Math.round((liveCount / totalMonitored) * 100) : 0;
  const routeDeviations = fleet.filter((v) => v.name.includes('COSCO') || v.navigation_status?.toLowerCase().includes('restricted')).length;
  const disruptionExposed = fleet.filter((v) => v.name.includes('EVER GIVEN') || v.name.includes('OSCAR')).length;
  const offlineCount = fleet.filter((v) => !v.has_live_ais).length;

  return (
    <div className="flex h-screen bg-stone-50/70 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      <LogisticsManagerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto ml-16">
        {/* Compact Operational Command Header */}
        <header className="border-b border-stone-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md px-6 py-3 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  <span>Page 1.8</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>FLEET INTELLIGENCE</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>AVAILABLE TELEMETRY</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Enterprise Monitored Fleet & AIS Telemetry</span>
                </h1>
              </div>
            </div>

            {/* Quick Actions Ribbon */}
            <div className="flex items-center gap-2 text-xs">
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-slate-800/80 border border-stone-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>Telemetry: Synced</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">{lastUpdated}</span>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200/80 dark:border-slate-700 transition-colors"
                title="Refresh Available Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleExportManifest}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200/80 dark:border-slate-700 transition-colors font-medium flex items-center gap-1.5"
                title="Download CSV Manifest"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard/operations')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all flex items-center gap-1.5"
                title="Open Flagship Global Operations Map"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Operations Map</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vessel</span>
              </button>

              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-6 space-y-5 max-w-7xl w-full mx-auto flex-1">
          {/* Executive KPI Strip (Page 1.6 Visual Standard) */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Fleet KPIs">
            <div className="bg-white dark:bg-[#12151E] p-3.5 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Monitored Fleet</span>
                <span className="p-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Ship className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-0.5">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalMonitored}
                </span>
                <span className="text-xs text-slate-500">vessels</span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-stone-100 dark:border-slate-800/80 pt-1 flex items-center justify-between font-mono">
                <span>Active Registry</span>
                <span className="text-cyan-600 dark:text-cyan-400">Enrolled</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#12151E] p-3.5 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Telemetry Coverage</span>
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-0.5">
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {coveragePct}%
                </span>
                <span className="text-xs text-emerald-600/80 font-medium">({liveCount}/{totalMonitored})</span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-stone-100 dark:border-slate-800/80 pt-1 flex items-center justify-between font-mono">
                <span>AIS Signals</span>
                <span className="text-emerald-500">Broadcasting</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#12151E] p-3.5 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Route Deviations</span>
                <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                  <RouteIcon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-0.5">
                <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {routeDeviations}
                </span>
                <span className="text-xs text-slate-500">bypasses</span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-stone-100 dark:border-slate-800/80 pt-1 flex items-center justify-between font-mono">
                <span>Cape Diverted</span>
                <span className="text-indigo-500">COSCO Universe</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#12151E] p-3.5 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Disruption Exposure</span>
                <span className="p-1 rounded-md bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-0.5">
                <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {disruptionExposed}
                </span>
                <span className="text-xs text-rose-600/80 font-medium">in hotzones</span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-stone-100 dark:border-slate-800/80 pt-1 flex items-center justify-between font-mono">
                <span>Bab-el-Mandeb</span>
                <span className="text-rose-500">Action Required</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#12151E] p-3.5 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Offline / Stale</span>
                <span className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-0.5">
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {offlineCount}
                </span>
                <span className="text-xs text-slate-500">dormant</span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-stone-100 dark:border-slate-800/80 pt-1 flex items-center justify-between font-mono">
                <span>In Berth / Drydock</span>
                <span className="text-amber-500">PACIFIC HORIZON</span>
              </div>
            </div>
          </section>

          {/* Fleet Situation Map Surface */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-500" />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Fleet Situation Map · Monitored Coordinates & Heading Vectors
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Click vessel marker to inspect telemetry & voyage profile
              </span>
            </div>

            <div className="h-[460px] w-full">
              <FleetSituationMap
                vessels={fleet}
                selectedVessel={selectedVessel}
                onSelectVessel={(v) => setSelectedVessel(v)}
                className="w-full h-full"
              />
            </div>
          </section>

          {/* Section: AIS Discovery & Search */}
          <section className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <h2 className="text-xs font-bold font-mono uppercase tracking-tight text-slate-900 dark:text-white">
                    AIS Discovery & Monitored Fleet Registration
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Search by Vessel Name, MMSI, or IMO to inspect telemetry and enroll into your monitored fleet.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-500" />
                <span>Simulated AIS Transponder Stream Active</span>
              </div>
            </div>

            {/* Search Input & Quick Chips */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={aisSearchQuery}
                  onChange={(e) => setAisSearchQuery(e.target.value)}
                  placeholder="Query AIS stream (e.g. 'COSCO SHIPPING UNIVERSE', '353136000', '9811000')..."
                  className="w-full pl-10 pr-28 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/40"
                />
                {isSearchingAis && (
                  <span className="absolute right-3 text-[11px] font-mono text-cyan-500 animate-pulse">
                    Querying...
                  </span>
                )}
              </div>

              {/* Verified Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[11px] font-mono text-slate-400 shrink-0">Quick Queries:</span>
                {VERIFIED_AIS_PRESETS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setAisSearchQuery(name)}
                    className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-stone-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-stone-200/60 dark:border-slate-700 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Rich Search Result Preview Card */}
            {inspectedSearchResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900/80 border border-cyan-500/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                      {inspectedSearchResult.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                      {inspectedSearchResult.vessel_type}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Flag: {inspectedSearchResult.flag}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                      <Radio className="w-3 h-3 animate-pulse" /> Telemetry Available
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1">
                    <div>MMSI: <strong className="text-slate-900 dark:text-slate-200">{inspectedSearchResult.mmsi}</strong></div>
                    <div>IMO: <strong className="text-slate-900 dark:text-slate-200">{inspectedSearchResult.imo}</strong></div>
                    <div>Speed: <strong>{inspectedSearchResult.speed} kn</strong></div>
                    <div>Heading: <strong>{inspectedSearchResult.heading}°</strong></div>
                    <div className="col-span-2">Position: <strong>{inspectedSearchResult.latitude.toFixed(2)}°N, {inspectedSearchResult.longitude.toFixed(2)}°E</strong></div>
                    <div className="col-span-2">Destination: <strong className="text-cyan-600 dark:text-cyan-400">{inspectedSearchResult.destination}</strong></div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {fleet.some((f) => f.mmsi === inspectedSearchResult.mmsi) ? (
                    <span className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-400 border border-stone-200 dark:border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Already in Monitored Fleet</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddFromAis(inspectedSearchResult)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Monitored Fleet</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </section>

          {/* Section: Monitored Fleet Data Table & Filtering */}
          <section className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Monitored Fleet Manifest ({filteredFleet.length} Records)
                </h2>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter fleet records..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs">
                  {['All', 'Container', 'Tanker', 'Bulk Carrier'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedTypeFilter(type)}
                      className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                        selectedTypeFilter === type
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs">
                  {['All', 'Live', 'Offline'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatusFilter(st)}
                      className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                        selectedStatusFilter === st
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-stone-200/60 dark:border-slate-800">
              <table className="w-full text-left font-mono text-xs" aria-label="Monitored Fleet Manifest Table">
                <thead className="bg-stone-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[11px] uppercase border-b border-stone-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold">Vessel</th>
                    <th className="py-2.5 px-3.5 font-semibold">Classification</th>
                    <th className="py-2.5 px-3.5 font-semibold">MMSI / IMO</th>
                    <th className="py-2.5 px-3.5 font-semibold">Position</th>
                    <th className="py-2.5 px-3.5 font-semibold">Speed</th>
                    <th className="py-2.5 px-3.5 font-semibold">Course</th>
                    <th className="py-2.5 px-3.5 font-semibold">Destination</th>
                    <th className="py-2.5 px-3.5 font-semibold">Telemetry Status</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60 bg-white dark:bg-[#12151E]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center">
                        <div className="space-y-2 max-w-lg mx-auto">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-9 rounded-lg bg-stone-100 dark:bg-slate-800 animate-pulse" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : filteredFleet.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center">
                        <EmptyState
                          title="No Matching Monitored Vessels"
                          description={
                            tableSearch
                              ? 'No vessels match active filter conditions.'
                              : 'Your fleet currently has no vessels registered. Use AIS discovery above to enroll vessels.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredFleet.map((vessel) => {
                      const isSelected = selectedVessel?.id === vessel.id;
                      return (
                        <tr
                          key={vessel.id}
                          onClick={() => setSelectedVessel(isSelected ? null : vessel)}
                          className={`hover:bg-stone-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                            isSelected ? 'bg-cyan-50/30 dark:bg-cyan-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  vessel.has_live_ais ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`}
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors block">
                                  {vessel.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans">
                                  {vessel.flag}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                              {vessel.vessel_type}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-slate-400">MMSI:</span>
                                <span className="font-bold">{vessel.mmsi}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyText(vessel.mmsi.toString(), `mmsi-${vessel.id}`, e)}
                                  className="text-slate-400 hover:text-cyan-500 ml-0.5"
                                  title="Copy MMSI"
                                >
                                  {copiedId === `mmsi-${vessel.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span>IMO:</span>
                                <span>{vessel.imo}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {vessel.has_live_ais && vessel.current_lat != null && vessel.current_lon != null ? (
                              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                                {vessel.current_lat.toFixed(2)}°, {vessel.current_lon.toFixed(2)}°
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Position Stale</span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap font-bold">
                            {vessel.has_live_ais && vessel.speed != null ? `${vessel.speed} kn` : '—'}
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {vessel.has_live_ais && vessel.course != null ? `${vessel.course}°` : '—'}
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap max-w-[180px] truncate">
                            {vessel.destination || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vessel.has_live_ais
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${vessel.has_live_ais ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                              {vessel.has_live_ais ? 'TELEMETRY LIVE' : 'OFFLINE'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVessel(vessel);
                                }}
                                title="Inspect Vessel Intelligence"
                                className="p-1 rounded-md text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleRemoveVessel(vessel.id, vessel.name, e)}
                                title="Remove from Fleet"
                                className="p-1 rounded-md text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: Vessel Intelligence Drawer (When a row is selected) */}
          <AnimatePresence>
            {selectedVessel && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white dark:bg-[#12151E] border border-cyan-500/30 rounded-2xl p-5 shadow-xl relative space-y-4"
                aria-label="Vessel Intelligence Drawer"
              >
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <Anchor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 uppercase font-bold">
                          VESSEL INTELLIGENCE PROFILE
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                          selectedVessel.has_live_ais ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {selectedVessel.has_live_ais ? 'ACTIVE TELEMETRY STREAM' : 'SIGNAL DORMANT'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedVessel.name} · {selectedVessel.flag}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedVessel(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Dense intelligence metric grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">MMSI Identifier</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedVessel.mmsi}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">IMO Number</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedVessel.imo}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Classification</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{selectedVessel.vessel_type}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Speed Over Ground</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedVessel.speed != null ? `${selectedVessel.speed} Knots` : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Course & Heading</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedVessel.heading != null ? `${selectedVessel.heading}° / ${selectedVessel.course || 0}°` : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Destination Port</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {selectedVessel.destination || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Operational Context & Action strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-slate-800 text-xs">
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    <span>Charter / Deployment Note: </span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedVessel.notes || 'General maritime freight assignment'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedVessel.name.includes('COSCO')) {
                          navigate('/dashboard/routes/route-cosco-shipping-universe-02');
                        } else if (selectedVessel.name.includes('EVER GIVEN')) {
                          navigate('/dashboard/routes/route-ever-given-01');
                        } else {
                          navigate('/dashboard/routes/route-rec-3');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <RouteIcon className="w-3.5 h-3.5" />
                      <span>Open Route Intelligence</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/reroute-planner')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Reroute / Mode-Swap</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveVessel(selectedVessel.id, selectedVessel.name, e)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Manual Add Vessel Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-white dark:bg-[#12151E] border border-stone-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Ship className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono">
                    Register Vessel Metadata
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register a commercial vessel to your monitored fleet. Position coordinates and speed synchronize dynamically if this MMSI broadcasts in the simulated AIS stream.
              </p>

              <form onSubmit={handleManualAddSubmit} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">
                    VESSEL NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. COSCO SHIPPING UNIVERSE"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">
                      MMSI (9 DIGITS) *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.mmsi}
                      onChange={(e) => setFormData({ ...formData, mmsi: e.target.value })}
                      placeholder="e.g. 477123400"
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">
                      IMO (7 DIGITS) *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.imo}
                      onChange={(e) => setFormData({ ...formData, imo: e.target.value })}
                      placeholder="e.g. 9795610"
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">
                      CLASSIFICATION
                    </label>
                    <select
                      value={formData.vessel_type}
                      onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value as VesselType })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                    >
                      {VESSEL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">
                      FLAG STATE
                    </label>
                    <input
                      type="text"
                      value={formData.flag}
                      onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                      placeholder="e.g. Hong Kong (HK)"
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">
                    OPERATIONAL NOTES
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Assigned to Far East - Northern Europe Express"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-xs"
                  >
                    Enroll Vessel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VesselRegistryPage;
