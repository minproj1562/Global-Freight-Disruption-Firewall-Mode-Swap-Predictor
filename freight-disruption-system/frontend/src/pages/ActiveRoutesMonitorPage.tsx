import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship,
  Search,
  RefreshCw,
  Compass,
  Package,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { ConnectionIndicator } from '../shared/components/ConnectionIndicator';
import { MapView } from '../features/map/MapView';
import { useToast } from '@/components/ui/use-toast';
import {
  ActiveRoute,
  Vessel,
  Port,
  Disruption,
  SecondaryInfrastructure,
  RouteStatus,
  DisruptionSeverity,
  RecommendedAction,
} from '../types';
import {
  getActiveRoutes,
  getActiveRoutesStats,
  getMapVessels,
  getMapPorts,
  getMapDisruptions,
  getSecondaryInfrastructure,
} from '@/services/api';

type SortField =
  | 'vessel_name'
  | 'origin_port_name'
  | 'destination_port_name'
  | 'mode'
  | 'eta'
  | 'delay_hours'
  | 'status'
  | 'risk_level'
  | 'progress_percent';
type SortOrder = 'asc' | 'desc';

export const ActiveRoutesMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data & Loading States - Real Live Backend APIs Only
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [_stats, setStats] = useState({
    total_active_routes: 0,
    delayed_routes: 0,
    critical_hazard_routes: 0,
    avg_delay_hours: 0,
    high_risk_routes: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [_errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Map Entities for Bottom Mini Map
  const [mapVessels, setMapVessels] = useState<Vessel[]>([]);
  const [mapPorts, setMapPorts] = useState<Port[]>([]);
  const [mapDisruptions, setMapDisruptions] = useState<Disruption[]>([]);
  const [mapSecondaryInfra, setMapSecondaryInfra] = useState<SecondaryInfrastructure[]>([]);

  const { user } = useAuthStore();
  const userOrg = user?.organization || 'Flexport Global Logistics';

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVesselType, setSelectedVesselType] = useState<string>('all');
  const [selectedFlag, setSelectedFlag] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [myCargoOnly, setMyCargoOnly] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  // Sorting & Pagination States
  const [sortField, setSortField] = useState<SortField>('risk_level');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Mini Map View Selected Vessel
  const [selectedVesselForMap, setSelectedVesselForMap] = useState<ActiveRoute | null>(null);

  const fetchLiveFleetData = async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);

      // Fetch live routes and summary stats from backend
      const [activeFleet, statsData, vesselsData, portsData, disruptionsData, infraData] =
        await Promise.all([
          getActiveRoutes({ limit: 250 }),
          getActiveRoutesStats().catch(() => ({
            total_active_routes: 0,
            delayed_routes: 0,
            critical_hazard_routes: 0,
            avg_delay_hours: 0,
            high_risk_routes: 0,
          })),
          getMapVessels().catch(() => []),
          getMapPorts().catch(() => []),
          getMapDisruptions().catch(() => []),
          getSecondaryInfrastructure().catch(() => []),
        ]);

      setRoutes(activeFleet || []);
      setStats(statsData);
      setMapVessels(vesselsData);
      setMapPorts(portsData);
      setMapDisruptions(disruptionsData);
      setMapSecondaryInfra(infraData);
    } catch (err: any) {
      console.error('[Active Routes API Error]:', err);
      setErrorMessage(err?.message || 'Failed to connect to Active Fleet API');
      toast({
        title: 'Fleet API Connection Error',
        description: err?.message || 'Unable to load real-time active routes from backend.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFleetData();
  }, []);

  // Filter Options Extracted from Dataset
  const vesselTypesList = useMemo(() => {
    const typesSet = new Set(routes.map((r) => r.vessel_type));
    return Array.from(typesSet);
  }, [routes]);

  const flagsList = useMemo(() => {
    const flagsSet = new Set(routes.map((r) => r.vessel_flag));
    return Array.from(flagsSet);
  }, [routes]);

  const companiesList = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.consignor_company) set.add(r.consignor_company);
      if (r.carrier_name) set.add(r.carrier_name);
    });
    return Array.from(set);
  }, [routes]);

  const myCargoCount = useMemo(() => {
    const userOrgLower = userOrg.toLowerCase();
    return routes.filter((r) =>
      (r.consignor_company && r.consignor_company.toLowerCase().includes(userOrgLower)) ||
      (r.carrier_name && r.carrier_name.toLowerCase().includes(userOrgLower)) ||
      userOrgLower.includes((r.consignor_company || '').toLowerCase())
    ).length;
  }, [routes, userOrg]);

  // Filter & Sort Logic
  const filteredAndSortedRoutes = useMemo(() => {
    let result = [...routes];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.vessel_name.toLowerCase().includes(q) ||
          r.vessel_mmsi?.toString().includes(q) ||
          r.vessel_imo.toString().includes(q) ||
          r.vessel_flag.toLowerCase().includes(q) ||
          r.origin_port_name.toLowerCase().includes(q) ||
          r.destination_port_name.toLowerCase().includes(q) ||
          r.current_location_name.toLowerCase().includes(q) ||
          r.cargo_summary.toLowerCase().includes(q) ||
          (r.carrier_name && r.carrier_name.toLowerCase().includes(q)) ||
          (r.consignor_company && r.consignor_company.toLowerCase().includes(q))
      );
    }

    // My Cargo Only filter
    if (myCargoOnly) {
      const userOrgLower = userOrg.toLowerCase();
      result = result.filter(
        (r) =>
          (r.consignor_company && r.consignor_company.toLowerCase().includes(userOrgLower)) ||
          (r.carrier_name && r.carrier_name.toLowerCase().includes(userOrgLower)) ||
          userOrgLower.includes((r.consignor_company || '').toLowerCase())
      );
    } else if (selectedCompany !== 'all') {
      const compLower = selectedCompany.toLowerCase();
      result = result.filter(
        (r) =>
          (r.consignor_company && r.consignor_company.toLowerCase().includes(compLower)) ||
          (r.carrier_name && r.carrier_name.toLowerCase().includes(compLower))
      );
    }

    // Vessel Type filter
    if (selectedVesselType !== 'all') {
      result = result.filter((r) => r.vessel_type.toLowerCase() === selectedVesselType.toLowerCase());
    }

    // Flag filter
    if (selectedFlag !== 'all') {
      result = result.filter((r) => r.vessel_flag.toLowerCase() === selectedFlag.toLowerCase());
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter((r) => r.status.toLowerCase() === selectedStatus.toLowerCase());
    }

    // Risk level filter
    if (selectedRisk !== 'all') {
      result = result.filter((r) => r.risk_level.toLowerCase() === selectedRisk.toLowerCase());
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField as keyof ActiveRoute];
      let bVal: any = b[sortField as keyof ActiveRoute];

      if (sortField === 'risk_level') {
        const riskWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        aVal = riskWeight[a.risk_level] || 0;
        bVal = riskWeight[b.risk_level] || 0;
      }

      if (sortField === 'delay_hours') {
        aVal = a.delay_hours;
        bVal = b.delay_hours;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [routes, searchQuery, selectedVesselType, selectedFlag, selectedStatus, selectedRisk, sortField, sortOrder]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredAndSortedRoutes.length / pageSize) || 1;
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRoutes.slice(start, start + pageSize);
  }, [filteredAndSortedRoutes, currentPage, pageSize]);

  // Toggle Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Status Badge Colors
  const getStatusBadge = (status: RouteStatus) => {
    switch (status) {
      case 'On Schedule':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Delayed':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Rerouted':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Critical Hazard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse';
      case 'At Anchor':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  // Risk Badge Colors
  const getRiskBadge = (risk: DisruptionSeverity) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  // Helper to extract display string from recommended_action
  const getActionString = (action?: string | RecommendedAction): string => {
    if (!action) return 'continue';
    if (typeof action === 'string') return action;
    return action.action_type || 'continue';
  };

  // Recommended Action Button Trigger
  const handleActionClick = (route: ActiveRoute) => {
    const actionStr = getActionString(route.recommended_action).toLowerCase();
    if (actionStr.includes('reroute')) {
      navigate('/dashboard/reroute-planner', {
        state: {
          vesselId: route.vessel_id,
          vesselName: route.vessel_name,
          originPort: route.origin_port_name,
          destinationPort: route.destination_port_name,
        },
      });
    } else {
      toast({
        title: `Action: ${getActionString(route.recommended_action).toUpperCase()}`,
        description: `Operational command sent for ${route.vessel_name}.`,
      });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      <LogisticsManagerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto ml-16">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                  PAGE 1.4 — ACTIVE FLEET MONITOR
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  ML GRADIENT BOOSTING ACTIVE
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Real-time tracking of 220+ active commercial voyages with ML delay & risk scoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLiveFleetData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Fleet API'}</span>
            </button>
            <ConnectionIndicator />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">TOTAL MONITORED FLEET</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{routes.length} Vessels</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">ACTIVE DELAYS</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-300 mt-1">
                {routes.filter((r) => (r.delay_hours ?? 0) > 0).length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">CRITICAL RISK</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-300 mt-1">
                {routes.filter((r) => r.risk_level === 'critical').length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
              <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">AVG ML PREDICTED DELAY</div>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-300 mt-1">
                {routes.length > 0
                  ? (routes.reduce((acc, r) => acc + (r.delay_hours ?? 0), 0) / routes.length).toFixed(1)
                  : '0.0'}{' '}
                hrs
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">ON SCHEDULE RATE</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-300 mt-1">
                {routes.length > 0
                  ? (
                      (routes.filter((r) => r.status === 'On Schedule').length / routes.length) *
                      100
                    ).toFixed(0)
                  : '0'}
                %
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. TOP FILTER BAR */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by vessel, MMSI, origin, destination, or cargo..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Vessel Type */}
                <select
                  value={selectedVesselType}
                  onChange={(e) => {
                    setSelectedVesselType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Vessel Type: All</option>
                  {vesselTypesList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                {/* Flag */}
                <select
                  value={selectedFlag}
                  onChange={(e) => {
                    setSelectedFlag(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Flag: All</option>
                  {flagsList.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                {/* Status */}
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Status: All</option>
                  <option value="On Schedule">On Schedule</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Rerouted">Rerouted</option>
                  <option value="Critical Hazard">Critical Hazard</option>
                  <option value="At Anchor">At Anchor</option>
                </select>

                {/* Risk Level */}
                <select
                  value={selectedRisk}
                  onChange={(e) => {
                    setSelectedRisk(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Risk: All</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>

                {/* Carrier / Logistics Company */}
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    if (e.target.value !== 'all') setMyCargoOnly(false);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Carrier: All ({routes.length})</option>
                  {companiesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* My Cargo Only Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMyCargoOnly(!myCargoOnly);
                    setSelectedCompany('all');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-sm ${
                    myCargoOnly
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/50'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                  title={`Filter to consignments for ${userOrg}`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>My Cargo ({myCargoCount})</span>
                </button>

                {/* Reset Filters */}
                {(searchQuery ||
                  selectedVesselType !== 'all' ||
                  selectedFlag !== 'all' ||
                  selectedStatus !== 'all' ||
                  selectedRisk !== 'all' ||
                  selectedCompany !== 'all' ||
                  myCargoOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedVesselType('all');
                      setSelectedFlag('all');
                      setSelectedStatus('all');
                      setSelectedRisk('all');
                      setSelectedCompany('all');
                      setMyCargoOnly(false);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-mono transition-all"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MAIN 200+ ACTIVE FLEET TABLE */}
          {/* ========================================================================= */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-xl overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                      onClick={() => handleSort('vessel_name')}
                    >
                      Vessel / MMSI {sortField === 'vessel_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-3.5 px-4">Current Location</th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                      onClick={() => handleSort('origin_port_name')}
                    >
                      Origin → Destination {sortField === 'origin_port_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-3.5 px-4">Mode</th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSort('eta')}>
                      ETA Original {sortField === 'eta' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-3.5 px-4 text-cyan-600 dark:text-cyan-400">ETA Predicted (ML)</th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                      onClick={() => handleSort('delay_hours')}
                    >
                      Delay (Hrs + Prob %){' '}
                      {sortField === 'delay_hours' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                      onClick={() => handleSort('risk_level')}
                    >
                      ML Risk {sortField === 'risk_level' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                      onClick={() => handleSort('status')}
                    >
                      Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-3.5 px-4 text-center">Recommended Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
                        <div>Loading 220+ active fleet voyages from live API...</div>
                      </td>
                    </tr>
                  ) : paginatedRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        No active routes match the specified filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRoutes.map((route) => {
                      const isSelected = selectedVesselForMap?.id === route.id;

                      return (
                        <tr
                          key={route.id}
                          onClick={() => setSelectedVesselForMap(route)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all ${
                            isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-500 dark:border-cyan-400' : ''
                          }`}
                        >
                          {/* Vessel / MMSI */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{route.vessel_name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              MMSI: {route.vessel_mmsi} • {route.vessel_flag}
                            </div>
                          </td>

                          {/* Current Location */}
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">
                            <div className="truncate">{route.current_location_name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {route.current_coordinates[1].toFixed(2)}°, {route.current_coordinates[0].toFixed(2)}°
                            </div>
                          </td>

                          {/* Origin -> Destination & Cargo Consignment */}
                          <td className="py-3 px-4">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {route.origin_port_name.replace('Port of ', '')} →{' '}
                              {route.destination_port_name.replace('Port of ', '')}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {route.cargo_summary}
                            </div>
                            {(route.consignor_company || route.carrier_name) && (() => {
                              const compName = route.consignor_company || route.carrier_name || '';
                              const isMyCargo = Boolean(
                                userOrg &&
                                (compName.toLowerCase().includes(userOrg.toLowerCase()) ||
                                 userOrg.toLowerCase().includes(compName.toLowerCase()))
                              );

                              return (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {compName}
                                  </span>
                                  {isMyCargo && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                      ★ MY CARGO
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Mode */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {route.mode}
                            </span>
                          </td>

                          {/* ETA Original */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {route.eta}
                          </td>

                          {/* ETA Predicted (ML) */}
                          <td className="py-3 px-4 text-cyan-600 dark:text-cyan-300 font-bold whitespace-nowrap">
                            {route.eta_predicted_ml}
                          </td>

                          {/* Delay (Hrs + Prob %) */}
                          <td className="py-3 px-4">
                            {(route.delay_hours ?? 0) > 0 ? (
                              <div>
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  +{route.delay_hours} hrs
                                </span>
                                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                  {route.delay_probability_pct}% prob
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">0.0 hrs</span>
                            )}
                          </td>

                          {/* Risk Level & ML Risk Score */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getRiskBadge(
                                  route.risk_level
                                )}`}
                              >
                                {route.risk_level}
                              </span>
                              <div className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                                Score: <strong className="text-slate-800 dark:text-slate-200">{route.ml_risk_score ?? (route.delay_probability_pct ? (route.delay_probability_pct / 100).toFixed(2) : '0.15')}</strong>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadge(
                                route.status
                              )}`}
                            >
                              {route.status}
                            </span>
                          </td>

                          {/* Recommended Action */}
                          <td className="py-3 px-4 text-center">
                            {(() => {
                              const actionStr = getActionString(route.recommended_action);
                              const actionLower = actionStr.toLowerCase();
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActionClick(route);
                                  }}
                                  className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase transition-all shadow-sm ${
                                    actionLower.includes('reroute')
                                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-mono hover:opacity-90 shadow-rose-500/20'
                                      : actionLower.includes('speed')
                                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25'
                                      : actionLower.includes('wait')
                                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40 hover:bg-purple-500/25'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {actionStr}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="text-slate-900 dark:text-white font-bold">
                  {paginatedRoutes.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="text-slate-900 dark:text-white font-bold">
                  {Math.min(currentPage * pageSize, filteredAndSortedRoutes.length)}
                </span>{' '}
                of <span className="text-slate-900 dark:text-white font-bold">{filteredAndSortedRoutes.length}</span> vessels
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all text-slate-700 dark:text-slate-300 shadow-sm"
                >
                  Previous
                </button>
                <span className="px-2 text-slate-500 dark:text-slate-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all text-slate-700 dark:text-slate-300 shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. BOTTOM MINI MAP WITH ALL VESSELS PLOTTED */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl space-y-3 transition-colors duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-wide">
                  LIVE MINI MAP — ALL FLEET POSITIONS & THREAT OVERLAYS (LIVE API)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {selectedVesselForMap
                  ? `Focused Vessel: ${selectedVesselForMap.vessel_name}`
                  : 'Click any row in the table above to highlight on map'}
              </span>
            </div>

            <div className="w-full h-[340px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
              <MapView
                vessels={mapVessels}
                ports={mapPorts}
                disruptions={mapDisruptions}
                routes={[]}
                secondaryInfra={mapSecondaryInfra}
                layers={{
                  vessels: true,
                  ports: true,
                  disruptions: true,
                  routes: true,
                  vesselNames: true,
                  secondaryInfra: false,
                }}
                selectedVesselTypeFilters={[]}
                selectedVessel={
                  selectedVesselForMap
                    ? mapVessels.find((v) => v.id === selectedVesselForMap.vessel_id) || null
                    : null
                }
                selectedPort={null}
                onSelectVessel={() => {}}
                onSelectPort={() => {}}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
