// frontend/src/pages/ActiveRoutesMonitorPage.tsx
// Page 1.4 — Active Routes Monitor
// Enterprise Logistics SaaS — Palantir Foundry / Flexport / MarineTraffic Inspired UI
// FASTAPI REPLACEMENT POINT: Replace mock dataset imports with live REST & WebSocket hooks:
// GET /api/v1/routes/active?mode={mode}&status={status}&risk={risk}&search={search}

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Route,
  Ship,
  Train,
  Plane,
  Layers,
  ArrowRight,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Anchor,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';

import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { ConnectionIndicator } from '../shared/components/ConnectionIndicator';
import { MapView } from '../features/map/MapView';
import { useToast } from '@/components/ui/use-toast';
import { ActiveRoute, TransportMode, RouteStatus, DisruptionSeverity } from '../types';
import { MOCK_ACTIVE_ROUTES } from '../shared/mock/activeRoutesMockData';
import { MOCK_PORTS, MOCK_VESSELS, MOCK_DISRUPTIONS, MOCK_SECONDARY_INFRASTRUCTURE } from '../shared/mock/mockData';

type SortField = 'vessel_name' | 'origin_port_name' | 'destination_port_name' | 'mode' | 'eta' | 'status' | 'risk_level' | 'progress_percent';
type SortOrder = 'asc' | 'desc';

export const ActiveRoutesMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data & Loading States
  const [routes, setRoutes] = useState<ActiveRoute[]>(MOCK_ACTIVE_ROUTES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  // Sorting & Pagination States
  const [sortField, setSortField] = useState<SortField>('risk_level');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Accordion Expand State
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  // Initial simulated load effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Refresh handler (Polling sync)
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: 'Active Routes Refreshed',
        description: 'Live AIS vessel telemetry and multimodal transit status updated.',
      });
    }, 800);
  };

  // Mode Icon & Badge Component
  const renderModeBadge = (route: ActiveRoute) => {
    if (route.mode === 'sea') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
          <Ship className="w-3.5 h-3.5 text-sky-500" />
          <span>Sea Freight</span>
        </span>
      );
    }
    if (route.mode === 'rail') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
          <Train className="w-3.5 h-3.5 text-purple-500" />
          <span>Rail Express</span>
        </span>
      );
    }
    if (route.mode === 'air') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
          <Plane className="w-3.5 h-3.5 text-indigo-500" />
          <span>Air Cargo</span>
        </span>
      );
    }
    // Multimodal
    return (
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm">
        <Layers className="w-3.5 h-3.5 text-amber-500" />
        <span>Multimodal</span>
        <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-amber-500/30 text-[10px]">
          {route.multimodal_modes?.includes('sea') && <Ship className="w-3 h-3 text-sky-400" />}
          {route.multimodal_modes?.includes('rail') && <Train className="w-3 h-3 text-purple-400" />}
          {route.multimodal_modes?.includes('air') && <Plane className="w-3 h-3 text-indigo-400" />}
        </div>
      </div>
    );
  };

  // Semantic Status Color Helper
  const getStatusBadgeClass = (status: RouteStatus) => {
    switch (status) {
      case 'On Schedule':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold';
      case 'Delayed':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold';
      case 'Rerouted':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold';
      case 'Critical Hazard':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold animate-pulse';
      case 'At Anchor':
        return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-medium';
    }
  };

  // Semantic Risk Level Color Helper
  const getRiskBadgeClass = (risk: DisruptionSeverity) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'high':
        return 'bg-amber-600/20 text-amber-700 dark:text-amber-300 border-amber-600/40 font-bold';
      case 'critical':
        return 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold uppercase';
    }
  };

  // Filtering & Sorting Logic
  const filteredRoutes = useMemo(() => {
    return routes
      .filter((r) => {
        const matchesMode = selectedMode === 'all' || r.mode === selectedMode;
        const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
        const matchesRisk = selectedRisk === 'all' || r.risk_level === selectedRisk;
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          !query ||
          r.vessel_name.toLowerCase().includes(query) ||
          r.origin_port_name.toLowerCase().includes(query) ||
          r.destination_port_name.toLowerCase().includes(query) ||
          r.current_location_name.toLowerCase().includes(query) ||
          r.cargo_summary.toLowerCase().includes(query);
        return matchesMode && matchesStatus && matchesRisk && matchesSearch;
      })
      .sort((a, b) => {
        let valueA: any = a[sortField];
        let valueB: any = b[sortField];

        if (sortField === 'risk_level') {
          const rank: Record<DisruptionSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          valueA = rank[a.risk_level];
          valueB = rank[b.risk_level];
        }

        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [routes, selectedMode, selectedStatus, selectedRisk, searchQuery, sortField, sortOrder]);

  // Pagination Math
  const totalPages = Math.ceil(filteredRoutes.length / pageSize) || 1;
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoutes.slice(start, start + pageSize);
  }, [filteredRoutes, currentPage, pageSize]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMode, selectedStatus, selectedRisk, searchQuery]);

  // Header Sort Click Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Navigate to Page 1.3 Reroute Planner with state context
  const handleRerouteAction = (route: ActiveRoute, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    toast({
      title: 'Transferring to Reroute Planner',
      description: `Loaded route data for ${route.vessel_name} (${route.origin_port_code} -> ${route.destination_port_code})`,
    });

    navigate('/dashboard/reroute-planner', {
      state: {
        originPort: route.origin_port_name,
        destinationPort: route.destination_port_name,
        vesselId: route.vessel_id,
        vesselName: route.vessel_name,
        cargoType: route.cargo_summary,
        disruptionToAvoid: route.risk_reason || 'disruption-red-sea-critical',
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <PortManagerSidebar />

      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR / NAV HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between ml-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shadow-md">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                ACTIVE ROUTES MONITOR
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {filteredRoutes.length} IN TRANSIT
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
              PAGE 1.4 • MULTIMODAL FREIGHT TELEMETRY & LIVE ROUTE MONITORING
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionIndicator className="hidden sm:flex" />

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all"
            title="Refresh Route Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 lg:p-8 ml-16 max-w-7xl mx-auto w-full space-y-5">
        
        {/* FILTER BAR ABOVE TABLE */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by vessel, port, location, or cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Quick Status Pill Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 font-bold whitespace-nowrap">
                <Filter className="w-3 h-3 text-amber-500" /> MODE:
              </span>
              {[
                { id: 'all', label: 'All Modes' },
                { id: 'sea', label: 'Sea' },
                { id: 'rail', label: 'Rail' },
                { id: 'air', label: 'Air' },
                { id: 'multimodal', label: 'Multimodal' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all ${
                    selectedMode === m.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Filters: Status & Risk Level Dropdowns / Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs font-mono">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Status:</span>
              {['all', 'On Schedule', 'Delayed', 'Rerouted', 'Critical Hazard', 'At Anchor'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                    selectedStatus === s
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {s === 'all' ? 'All Statuses' : s}
                </button>
              ))}
            </div>

            {/* Risk Level Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Risk Level:</span>
              {['all', 'low', 'medium', 'high', 'critical'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRisk(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition-all ${
                    selectedRisk === r
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DATA TABLE CONTAINER */}
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {isLoading ? (
            /* Table Skeleton Loader */
            <div className="p-6 space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-800/80 rounded-xl w-1/4 animate-pulse" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-900/60 rounded-xl w-full animate-pulse flex items-center justify-between px-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/5" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/8" />
                </div>
              ))}
            </div>
          ) : isError ? (
            /* Error Fallback State */
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold font-mono">Failed to load route telemetry</h3>
              <p className="text-xs text-slate-500">Connecting to backend service failed. Retrying...</p>
              <button
                onClick={() => { setIsError(false); setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-mono text-xs font-bold rounded-xl"
              >
                Retry Request
              </button>
            </div>
          ) : filteredRoutes.length === 0 ? (
            /* Empty State */
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center mx-auto shadow-inner border border-slate-200 dark:border-slate-800">
                <Route className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white">No active routes found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active logistics routes match your selected mode, status, or search query. Try broadening your filter criteria.
              </p>
              <button
                onClick={() => { setSelectedMode('all'); setSelectedStatus('all'); setSelectedRisk('all'); setSearchQuery(''); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-amber-500 border border-amber-500/30 font-mono text-xs font-bold rounded-xl hover:bg-amber-500/10 transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Render Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th onClick={() => handleSort('vessel_name')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>Vessel</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('origin_port_name')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>Origin</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('destination_port_name')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>Destination</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Current Location</th>
                    <th onClick={() => handleSort('mode')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>Mode</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('eta')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>ETA</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('status')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('risk_level')} className="py-3.5 px-4 cursor-pointer hover:text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <span>Risk Level</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs font-mono">
                  {paginatedRoutes.map((route) => {
                    const isExpanded = expandedRouteId === route.id;
                    const isRiskHighOrCritical = route.risk_level === 'high' || route.risk_level === 'critical';

                    return (
                      <React.Fragment key={route.id}>
                        <tr
                          onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                          className={`group cursor-pointer transition-colors duration-150 ${
                            isExpanded
                              ? 'bg-amber-500/10 dark:bg-amber-500/10'
                              : isRiskHighOrCritical
                              ? 'hover:bg-rose-500/5 dark:hover:bg-rose-500/10'
                              : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          {/* Vessel Column */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg border ${
                                isRiskHighOrCritical
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                <Ship className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block group-hover:text-amber-500 transition-colors">
                                  {route.vessel_name}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  IMO {route.vessel_imo} • {route.vessel_flag}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Origin Column */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {route.origin_port_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {route.origin_port_code}
                            </span>
                          </td>

                          {/* Destination Column */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {route.destination_port_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {route.destination_port_code}
                            </span>
                          </td>

                          {/* Current Location */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <span className="text-slate-700 dark:text-slate-300 block truncate" title={route.current_location_name}>
                              {route.current_location_name}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-500" />
                              {route.current_coordinates[1].toFixed(2)}°N, {route.current_coordinates[0].toFixed(2)}°E
                            </span>
                          </td>

                          {/* Mode Column */}
                          <td className="py-3.5 px-4">
                            {renderModeBadge(route)}
                          </td>

                          {/* ETA Column */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-900 dark:text-slate-200 font-bold block">
                              {route.eta}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {route.distance_remaining_nm} nm left
                            </span>
                          </td>

                          {/* Status Column */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] border inline-block ${getStatusBadgeClass(route.status)}`}>
                              {route.status}
                            </span>
                          </td>

                          {/* Risk Level Column */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] border inline-block ${getRiskBadgeClass(route.risk_level)}`}>
                              {route.risk_level}
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleRerouteAction(route, e)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
                                title="Run Mode-Swap & Reroute Predictor"
                              >
                                <Compass className="w-3.5 h-3.5" />
                                <span>Reroute</span>
                              </button>

                              <button
                                onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                                title="Toggle Route Mini Map Preview"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ACCORDION EXPANDED MINI MAP & DETAILS PANEL */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="p-0 border-b border-amber-500/30">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  className="bg-slate-900/90 dark:bg-slate-950/90 p-4 lg:p-6 space-y-4 border-t border-amber-500/20"
                                >
                                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-amber-400 font-mono tracking-tight">
                                          ROUTE PREVIEW & TELEMETRY: {route.vessel_name}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                          {route.cargo_summary}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                                        Origin: <strong className="text-white">{route.origin_port_name}</strong> → Destination: <strong className="text-white">{route.destination_port_name}</strong>
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {route.risk_reason && (
                                        <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5">
                                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                          <span>HAZARD: {route.risk_reason}</span>
                                        </div>
                                      )}

                                      <button
                                        onClick={(e) => handleRerouteAction(route, e)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-mono font-bold shadow-lg shadow-amber-500/20 transition-all"
                                      >
                                        <Compass className="w-4 h-4" />
                                        <span>Get AI Reroute Recommendation</span>
                                        <ArrowRight className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* CONSTRAINED MAPVIEW MINI PREVIEW */}
                                  <div className="relative w-full h-[280px] lg:h-[320px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
                                    <MapView
                                      vessels={MOCK_VESSELS}
                                      ports={MOCK_PORTS}
                                      disruptions={MOCK_DISRUPTIONS}
                                      routes={[]}
                                      secondaryInfra={MOCK_SECONDARY_INFRASTRUCTURE}
                                      layers={{
                                        vessels: true,
                                        ports: true,
                                        disruptions: true,
                                        routes: false,
                                        vesselNames: true,
                                        secondaryInfra: false,
                                      }}
                                      selectedVesselTypeFilters={[]}
                                      selectedVessel={MOCK_VESSELS.find((v) => v.id === route.vessel_id) || null}
                                      selectedPort={null}
                                      onSelectVessel={() => {}}
                                      onSelectPort={() => {}}
                                      highlightedActiveRoute={route}
                                      className="w-full h-full"
                                    />

                                    {/* Route Progress Overlay Card */}
                                    <div className="absolute bottom-3 left-3 right-3 z-10 glass-panel p-3 rounded-xl border border-slate-800 bg-slate-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-white">
                                      <div className="flex items-center gap-3">
                                        <span className="text-amber-400 font-bold">PROGRESS: {route.progress_percent}%</span>
                                        <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                                          <div
                                            className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full"
                                            style={{ width: `${route.progress_percent}%` }}
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4 text-slate-300">
                                        <span>AVG SPEED: <strong className="text-white">{route.avg_speed_knots} knots</strong></span>
                                        <span>REMAINING: <strong className="text-white">{route.distance_remaining_nm} nm</strong></span>
                                        <span>ETA: <strong className="text-amber-400">{route.eta}</strong></span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION FOOTER */}
          {!isLoading && !isError && filteredRoutes.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
              <div>
                Showing <strong className="text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, filteredRoutes.length)}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{filteredRoutes.length}</strong> active routes
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Show per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-500/20 hover:text-amber-500 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 font-bold text-slate-900 dark:text-white">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-500/20 hover:text-amber-500 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
