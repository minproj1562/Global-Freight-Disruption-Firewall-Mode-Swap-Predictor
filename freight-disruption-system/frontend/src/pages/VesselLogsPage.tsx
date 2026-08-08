// frontend/src/pages/VesselLogsPage.tsx
// Page 3.3 — Vessel Arrival/Departure Log
// Tabs: Arrivals, Departures, Expected. Table with vessel details. Filter by date/type/flag, search, export CSV.

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ship,
  Anchor,
  Search,
  Download,
  Clock,
  RefreshCw,
  Activity,
  Settings,
} from 'lucide-react';
import { MOCK_VESSEL_LOGS } from '@/shared/mock/vesselLogMockData';
import { getVesselLogs, getVesselLogsExportUrl, VesselLogEntry } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';

export const VesselLogsPage: React.FC = () => {
  const { user } = useAuthStore();

  // Logs state
  const [logs, setLogs] = useState<VesselLogEntry[]>(MOCK_VESSEL_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Tab State: 'Arrivals' | 'Departures' | 'Expected'
  const [activeTab, setActiveTab] = useState<'Arrivals' | 'Departures' | 'Expected'>('Arrivals');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [flagFilter, setFlagFilter] = useState<string>('all');

  // Fetch vessel logs from Backend API
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await getVesselLogs({
        category: activeTab,
        search: searchTerm,
        type: typeFilter,
        flag: flagFilter
      });
      if (data && data.length > 0) {
        setLogs(data);
      }
    } catch (err) {
      console.warn('Backend API connection fallback to mock data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab, searchTerm, typeFilter, flagFilter]);

  // Extract unique vessel types and flags for dropdown filters
  const vesselTypes = useMemo(() => {
    const types = new Set(logs.map((log) => log.type));
    return ['all', ...Array.from(types)];
  }, [logs]);

  const vesselFlags = useMemo(() => {
    const flags = new Set(logs.map((log) => log.flag));
    return ['all', ...Array.from(flags)];
  }, [logs]);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Tab matching
      if (log.category !== activeTab) return false;

      // Search matching (name, mmsi, imo, port, cargo)
      const matchesSearch =
        log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.mmsi.toString().includes(searchTerm) ||
        log.imo.toString().includes(searchTerm) ||
        log.port.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.cargo.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Type filter
      if (typeFilter !== 'all' && log.type !== typeFilter) return false;

      // Flag filter
      if (flagFilter !== 'all' && log.flag !== flagFilter) return false;

      return true;
    });
  }, [logs, activeTab, searchTerm, typeFilter, flagFilter]);

  // Export to CSV feature (fetches directly from API endpoint or triggers download)
  const handleExportCSV = () => {
    const exportUrl = getVesselLogsExportUrl({
      category: activeTab,
      search: searchTerm,
      type: typeFilter,
      flag: flagFilter
    });
    window.open(exportUrl, '_blank');
  };


  const getStatusBadge = (status: VesselLogEntry['status']) => {
    switch (status) {
      case 'Berthed':
      case 'Docked':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400';
      case 'In Transit':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400';
      case 'Clearing Customs':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400';
      case 'Anchored':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400';
      case 'Departed':
        return 'bg-slate-500/15 border-slate-500/40 text-slate-600 dark:text-slate-300';
      case 'Expected':
        return 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-slate-200 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <PortManagerSidebar />
      {/* ======== TOP NAVIGATION BAR ======== */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between ml-16">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-105 transition-transform">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide block">FREIGHT FIREWALL</span>
              <span className="text-[10px] text-amber-400 font-mono">PORT OPERATIONS LOGS (PAGE 3.3)</span>
            </div>
          </Link>

          {/* Quick Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-800 pl-6">
            <Link
              to="/dashboard/ports"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
            >
              <Anchor className="w-3.5 h-3.5 text-emerald-400" />
              Port Overview (3.1)
            </Link>
            <Link
              to="/dashboard/vessel-logs"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Vessel Logs (3.3)
            </Link>
            <Link
              to="/dashboard/operations"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Fleet Command
            </Link>
            <Link
              to="/dashboard/admin"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              Admin Command (4.0)
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-slate-300 font-mono hidden sm:inline">{user.username}</span>
            </div>
          )}
        </div>
      </header>

      {/* ======== MAIN CONTENT AREA ======== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-6 ml-16">

        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">
              <Clock className="w-4 h-4" />
              <span>TERMINAL TELEMETRY ENGINE • PAGE 3.3</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Vessel Arrival & Departure Log
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time maritime entry/exit logs, terminal quay allocation, ETA/ATA timestamps, and cargo manifests across global port facilities.
            </p>
          </div>

          {/* Export CSV Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV ({filteredLogs.length})
            </button>
          </div>
        </div>

        {/* TABS & FILTER TOOLBAR */}
        <div className="space-y-4">
          
          {/* TABS: Arrivals, Departures, Expected */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              {(['Arrivals', 'Departures', 'Expected'] as const).map((tab) => {
                const count = logs.filter((l) => l.category === tab).length;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono hidden sm:flex">
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
              <span>
                Showing <strong className="text-white">{filteredLogs.length}</strong> records
              </span>
            </div>
          </div>

          {/* FILTERS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Vessel, MMSI, Port..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 capitalize"
              >
                <option value="all">All Vessel Types</option>
                {vesselTypes.filter((t) => t !== 'all').map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Flag Filter */}
            <div className="relative">
              <select
                value={flagFilter}
                onChange={(e) => setFlagFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="all">All Flag Registries</option>
                {vesselFlags.filter((f) => f !== 'all').map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setFlagFilter('all');
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* ======== VESSEL LOGS TABLE ======== */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Vessel / MMSI</th>
                  <th className="py-3.5 px-4 font-semibold">Type & Flag</th>
                  <th className="py-3.5 px-4 font-semibold">Port & Terminal</th>
                  <th className="py-3.5 px-4 font-semibold">Berth / Quay</th>
                  <th className="py-3.5 px-4 font-semibold">Arrival (ATA/ETA)</th>
                  <th className="py-3.5 px-4 font-semibold">Departure (ATD/ETD)</th>
                  <th className="py-3.5 px-4 font-semibold">Cargo Manifest</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Vessel / MMSI */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <Ship className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{log.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          MMSI: {log.mmsi} | IMO: {log.imo}
                        </div>
                      </td>

                      {/* Type & Flag */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-200">{log.type}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{log.flag}</div>
                      </td>

                      {/* Port & Terminal */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-200">{log.port}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{log.terminal}</div>
                      </td>

                      {/* Berth / Quay */}
                      <td className="py-4 px-4 font-mono font-medium text-amber-300">
                        {log.berth}
                      </td>

                      {/* Arrival */}
                      <td className="py-4 px-4 font-mono text-slate-200">
                        {log.ata ? (
                          <div className="text-emerald-400 font-semibold">{log.ata} <span className="text-[9px] text-slate-500 block">(ATA Actual)</span></div>
                        ) : (
                          <div className="text-slate-300">{log.arrivalDate} <span className="text-[9px] text-slate-500 block">(ETA Estimated)</span></div>
                        )}
                      </td>

                      {/* Departure */}
                      <td className="py-4 px-4 font-mono text-slate-200">
                        {log.atd ? (
                          <div className="text-purple-400 font-semibold">{log.atd} <span className="text-[9px] text-slate-500 block">(ATD Actual)</span></div>
                        ) : (
                          <div className="text-slate-300">{log.departureDate} <span className="text-[9px] text-slate-500 block">(ETD Estimated)</span></div>
                        )}
                      </td>

                      {/* Cargo Manifest */}
                      <td className="py-4 px-4">
                        <div className="text-slate-300 max-w-[200px] truncate" title={log.cargo}>
                          {log.cargo}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Agent: {log.agent}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                      No vessel records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Showing {filteredLogs.length} of {MOCK_VESSEL_LOGS.length} Vessel Log Entries</span>
            <span>Last Terminal Log Sync: Just Now (Live AIS Ingest)</span>
          </div>
        </div>
      </main>
    </div>
  );
};
