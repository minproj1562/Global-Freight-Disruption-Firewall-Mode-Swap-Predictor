// frontend/src/pages/VesselRegistryPage.tsx
/**
 * VESSEL REGISTRY / MY FLEET PAGE
 * 
 * Allows the Logistics Manager to manage vessels associated with their organisation.
 * 
 * ARCHITECTURAL NOTES:
 * - This is not actual AIS registration; vessels exist within the simulated AIS pool.
 *   The Logistics Manager is associating known vessels with their organisational fleet.
 * - Live AIS telemetry (position, speed, course, heading, nav status, timestamp) is
 *   dynamically queried from the simulated AIS service by matching MMSI numbers.
 * - If a registered vessel's MMSI is not found in the simulated AIS pool, the system
 *   displays "No live AIS data found for this vessel" as a valid, realistic data state.
 * - Fleet state persists in browser localStorage via fleetService.
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { RegisteredVessel, AISVesselData, VesselType } from '@/types';
import { getRegisteredFleet, addVesselToFleet, removeVesselFromFleet } from '@/services/fleetService';
import { searchAISVessels } from '@/services/aisService';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/shared/components/EmptyState';

const VESSEL_TYPES: VesselType[] = ['Container', 'Tanker', 'Bulk Carrier', 'Cargo', 'Special'];

export const VesselRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fleet, setFleet] = useState<RegisteredVessel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableSearch, setTableSearch] = useState<string>('');

  // Search-to-Register state
  const [aisSearchQuery, setAisSearchQuery] = useState<string>('');
  const [aisSearchResults, setAisSearchResults] = useState<AISVesselData[]>([]);
  const [isSearchingAis, setIsSearchingAis] = useState<boolean>(false);

  // Manual Add Modal state
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

  // Load fleet from service
  const loadFleet = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getRegisteredFleet();
      setFleet(data);
    } catch (err) {
      console.error('Failed to load registered fleet', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();

    // Periodic live AIS polling interval to simulate live dynamic AIS coordinates
    const interval = setInterval(() => {
      loadFleet(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Search simulated AIS pool
  useEffect(() => {
    if (!aisSearchQuery.trim()) {
      setAisSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAis(true);
      try {
        const results = await searchAISVessels(aisSearchQuery);
        setAisSearchResults(results);
      } catch (err) {
        console.error('Error querying simulated AIS pool', err);
      } finally {
        setIsSearchingAis(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [aisSearchQuery]);

  // Handle adding vessel from AIS search hit
  const handleAddFromAis = async (vessel: AISVesselData) => {
    // Check if already in fleet
    if (fleet.some((f) => f.mmsi === vessel.mmsi)) {
      toast({
        title: 'Vessel Already Registered',
        description: `${vessel.name} (MMSI: ${vessel.mmsi}) is already part of your organisation fleet.`,
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
        notes: `Registered via live AIS transponder search (${vessel.destination})`,
      });

      setFleet((prev) => [added, ...prev]);
      setAisSearchQuery('');
      setAisSearchResults([]);

      toast({
        title: 'Vessel Added to My Fleet',
        description: `Successfully linked ${vessel.name} to your registered fleet with live AIS telemetry.`,
      });
    } catch (err) {
      toast({
        title: 'Registration Error',
        description: 'Failed to add vessel to fleet.',
        variant: 'destructive',
      });
    }
  };

  // Handle manual modal submission
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
        description: 'MMSI and IMO must be numerical digits.',
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
          ? `${added.name} registered. Live AIS transponder signal linked successfully!`
          : `${added.name} registered. Note: No live AIS signal currently found for MMSI ${added.mmsi}.`,
      });
    } catch (err) {
      toast({
        title: 'Registration Error',
        description: 'Failed to register vessel.',
        variant: 'destructive',
      });
    }
  };

  // Handle removing vessel
  const handleRemoveVessel = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from your fleet?`)) {
      await removeVesselFromFleet(id);
      setFleet((prev) => prev.filter((v) => v.id !== id));
      toast({
        title: 'Vessel Removed',
        description: `${name} has been removed from your organisation's registered fleet.`,
      });
    }
  };

  // Filtered registered vessels for the table
  const filteredFleet = fleet.filter((v) => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.mmsi.toString().includes(q) ||
      v.imo.toString().includes(q) ||
      v.vessel_type.toLowerCase().includes(q) ||
      v.flag.toLowerCase().includes(q) ||
      (v.navigation_status && v.navigation_status.toLowerCase().includes(q))
    );
  });

  const liveAisCount = fleet.filter((v) => v.has_live_ais).length;
  const noAisCount = fleet.filter((v) => !v.has_live_ais).length;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      <LogisticsManagerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto ml-16">
        {/* Header Strip */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  Page 1.8 • FLEET MANAGEMENT
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Organisational Vessel Registry
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                Vessel Registry & My Fleet
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold transition-all shadow-sm hover:opacity-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vessel Manually</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/operations')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Global Map</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Top KPI Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                  TOTAL REGISTERED FLEET
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {fleet.length} Vessels
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Ship className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                  LIVE AIS DETECTED
                </span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {liveAisCount} Active
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                  NO LIVE SIGNAL / UNMATCHED
                </span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {noAisCount} Vessels
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                  TELEMETRY ENGINE
                </span>
                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  Simulated AIS Stream
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Section: Search-to-Register Flow */}
          <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white uppercase">
                    SEARCH-TO-REGISTER: DISCOVER LIVE AIS VESSELS
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Search the simulated AIS vessel pool by Vessel Name, MMSI, or IMO to register directly to your fleet.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-500" /> Live Simulated AIS Pool
              </span>
            </div>

            {/* Search Input Bar (Reusing MapSearch Pattern) */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={aisSearchQuery}
                  onChange={(e) => setAisSearchQuery(e.target.value)}
                  placeholder="Search simulated AIS vessels by name (e.g. EVER GIVEN), MMSI (e.g. 353136000), or IMO (e.g. 9811000)..."
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
                {aisSearchQuery && (
                  <button
                    onClick={() => setAisSearchQuery('')}
                    className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Live Search Results Dropdown / Preview Cards */}
              <AnimatePresence>
                {aisSearchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 max-h-96 overflow-y-auto font-mono text-xs space-y-2"
                  >
                    {isSearchingAis ? (
                      <div className="p-6 text-center text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                        <span>Querying simulated AIS pool...</span>
                      </div>
                    ) : aisSearchResults.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        No vessels matching &quot;{aisSearchQuery}&quot; found in the simulated AIS pool.
                      </div>
                    ) : (
                      aisSearchResults.map((vessel) => {
                        const isAlreadyRegistered = fleet.some((f) => f.mmsi === vessel.mmsi);

                        return (
                          <div
                            key={vessel.mmsi}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-cyan-500/50 transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {vessel.name}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                                  {vessel.vessel_type}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Flag: {vessel.flag}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                                <span>MMSI: <strong className="text-slate-900 dark:text-slate-200">{vessel.mmsi}</strong></span>
                                <span>IMO: <strong className="text-slate-900 dark:text-slate-200">{vessel.imo}</strong></span>
                                <span>Speed: <strong>{vessel.speed} kn</strong></span>
                                <span>Pos: <strong>{vessel.latitude.toFixed(2)}°, {vessel.longitude.toFixed(2)}°</strong></span>
                                <span>Dest: <strong>{vessel.destination}</strong></span>
                              </div>
                            </div>

                            <button
                              disabled={isAlreadyRegistered}
                              onClick={() => handleAddFromAis(vessel)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm ${
                                isAlreadyRegistered
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                  : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold shadow-cyan-500/20'
                              }`}
                            >
                              {isAlreadyRegistered ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>In My Fleet</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5 text-slate-950" />
                                  <span>Add to My Fleet</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Section: Registered Vessel List Table */}
          <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white uppercase">
                    ORGANISATION REGISTERED FLEET ({filteredFleet.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Vessels assigned to your logistics operations with live transponder telemetry status.
                </p>
              </div>

              {/* Table search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter registered fleet..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Vessel Name</th>
                    <th className="py-3 px-4">IMO</th>
                    <th className="py-3 px-4">MMSI</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Flag</th>
                    <th className="py-3 px-4">Current Position</th>
                    <th className="py-3 px-4">Speed</th>
                    <th className="py-3 px-4">Navigation / Status</th>
                    <th className="py-3 px-4">Last AIS Update</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="space-y-2">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : filteredFleet.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <EmptyState
                          title="No Registered Vessels"
                          description={
                            tableSearch
                              ? 'No vessels match your search query.'
                              : 'Your fleet currently has no vessels registered. Use the search bar above or click "Add Vessel Manually" to begin.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredFleet.map((vessel) => {
                      return (
                        <tr
                          key={vessel.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Vessel Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  vessel.has_live_ais ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`}
                                title={vessel.has_live_ais ? 'Live AIS Active' : 'No Live AIS Signal'}
                              />
                              <span>{vessel.name}</span>
                            </div>
                          </td>

                          {/* IMO */}
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                            {vessel.imo}
                          </td>

                          {/* MMSI */}
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono font-bold">
                            {vessel.mmsi}
                          </td>

                          {/* Vessel Type */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {vessel.vessel_type}
                            </span>
                          </td>

                          {/* Flag */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {vessel.flag}
                          </td>

                          {/* Current Position */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {vessel.has_live_ais && vessel.current_lat != null && vessel.current_lon != null ? (
                              <span className="text-cyan-700 dark:text-cyan-300 font-bold flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-cyan-500" />
                                {vessel.current_lat.toFixed(3)}°, {vessel.current_lon.toFixed(3)}°
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400/90 italic text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                                No live AIS data found for this vessel
                              </span>
                            )}
                          </td>

                          {/* Speed */}
                          <td className="py-3.5 px-4">
                            {vessel.has_live_ais && vessel.speed != null ? (
                              <span className="font-bold text-slate-900 dark:text-white">
                                {vessel.speed} kn
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* Navigation Status */}
                          <td className="py-3.5 px-4 max-w-xs truncate">
                            {vessel.has_live_ais ? (
                              <span className="text-slate-800 dark:text-slate-200">
                                {vessel.navigation_status || 'Under way using engine'}
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                                Signal Offline
                              </span>
                            )}
                          </td>

                          {/* Last AIS Update */}
                          <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {vessel.has_live_ais && vessel.last_ais_update ? (
                              <span>{new Date(vessel.last_ais_update).toLocaleTimeString()} UTC</span>
                            ) : (
                              <span>N/A</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {vessel.has_live_ais && (
                                <button
                                  onClick={() => navigate('/dashboard/operations')}
                                  title="View on Global Map"
                                  className="p-1.5 rounded-lg text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-all border border-transparent hover:border-cyan-500/30"
                                >
                                  <Compass className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveVessel(vessel.id, vessel.name)}
                                title="Remove from My Fleet"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all border border-transparent hover:border-rose-500/30"
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
        </main>
      </div>

      {/* Manual Add Vessel Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 font-mono space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                    REGISTER VESSEL METADATA
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register a vessel to your organisation. Positional telemetry (GPS coordinates, speed, heading) will dynamically link if this MMSI is broadcasting in the simulated AIS stream.
              </p>

              <form onSubmit={handleManualAddSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    VESSEL NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. EVER GIVEN"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      MMSI NUMBER *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.mmsi}
                      onChange={(e) => setFormData({ ...formData, mmsi: e.target.value })}
                      placeholder="e.g. 353136000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      IMO NUMBER *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.imo}
                      onChange={(e) => setFormData({ ...formData, imo: e.target.value })}
                      placeholder="e.g. 9811000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      VESSEL TYPE
                    </label>
                    <select
                      value={formData.vessel_type}
                      onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value as VesselType })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    >
                      {VESSEL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      FLAG STATE
                    </label>
                    <input
                      type="text"
                      value={formData.flag}
                      onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                      placeholder="e.g. Panama (PA)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    OPERATIONAL NOTES (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Asia-Europe Lane Container Flagship"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/20"
                  >
                    Register Vessel
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
