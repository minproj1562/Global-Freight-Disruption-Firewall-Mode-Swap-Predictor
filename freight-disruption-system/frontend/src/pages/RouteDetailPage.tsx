// frontend/src/pages/RouteDetailPage.tsx
/**
 * ROUTE DETAIL PAGE
 * 
 * Deep-dive journey analysis for a selected route.
 * Opened from:
 *   - "Reroute" action on Active Routes Monitor row
 *   - "View Route" on selected Reroute Recommendation card
 * 
 * Displays:
 *   - Route Summary KPIs (Origin/Dest, Status, Distance, Duration, ETA, Cost, Risk, Mode)
 *   - Multimodal Sequence Strip (e.g. SEA → ROAD → AIR → ROAD)
 *   - Route Detail Map (Sea dash-flow, Mapbox Directions road legs, Turf.js geodesic air arcs, live cargo marker)
 *   - Vertical Itinerary / Timeline with carrier & vehicle information and active leg highlighting
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Ship,
  Truck,
  Plane,
  Train,
  Compass,
  MapPin,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { RouteDetailMap } from '@/features/map/RouteDetailMap';
import { DetailedRoute, RouteLeg, LegTransportMode } from '@/types';
import { getRouteDetailById } from '@/services/routeDetailService';
import { EmptyState } from '@/shared/components/EmptyState';

export const RouteDetailPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [route, setRoute] = useState<DetailedRoute | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeg, setSelectedLeg] = useState<RouteLeg | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const id = routeId || 'route-rec-3';
        const data = await getRouteDetailById(id, location.state);
        if (isMounted) {
          if (data) {
            setRoute(data);
            setSelectedLeg(data.legs[data.active_leg_index] || data.legs[0] || null);
          } else {
            setError('The requested route could not be found.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load route details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [routeId, location.state]);

  const getModeIcon = (mode: LegTransportMode | string, className: string = 'w-4 h-4') => {
    switch (mode) {
      case 'sea':
        return <Ship className={className} />;
      case 'road':
        return <Truck className={className} />;
      case 'air':
        return <Plane className={className} />;
      case 'rail':
        return <Train className={className} />;
      default:
        return <Compass className={className} />;
    }
  };

  const getModeBadgeClass = (mode: LegTransportMode | string) => {
    switch (mode) {
      case 'sea':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30';
      case 'road':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'air':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'rail':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> COMPLETED
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> ACTIVE
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            UPCOMING
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      <LogisticsManagerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto ml-16">
        {/* Header Strip */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-slate-200 dark:border-slate-800"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  Page 1.7 • ROUTE INTELLIGENCE
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {route?.id || routeId}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{route?.name || 'Route Journey Overview'}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => navigate('/dashboard/reroute-planner')}
              className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Simulate Alternative</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/active-routes')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <span>Active Fleet</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="space-y-6">
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
              <div className="h-[400px] rounded-3xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            </div>
          ) : error || !route ? (
            <div className="p-12 text-center">
              <EmptyState
                title="Route Information Unavailable"
                description={error || 'No route data could be loaded for this identifier.'}
                actionLabel="Return to Active Routes"
                onAction={() => navigate('/dashboard/active-routes')}
              />
            </div>
          ) : (
            <>
              {/* Multimodal Pathway Strip (e.g., SEA → ROAD → AIR → ROAD) */}
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    MULTIMODAL JOURNEY SEQUENCE
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {route.legs.map((leg, idx) => (
                      <React.Fragment key={leg.id}>
                        <button
                          onClick={() => setSelectedLeg(leg)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all ${
                            selectedLeg?.id === leg.id
                              ? 'ring-2 ring-cyan-500 scale-105 shadow-md ' + getModeBadgeClass(leg.mode)
                              : leg.status === 'active'
                              ? 'shadow-sm ' + getModeBadgeClass(leg.mode)
                              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {getModeIcon(leg.mode, 'w-3.5 h-3.5')}
                          <span>{leg.mode.toUpperCase()}</span>
                          {leg.status === 'active' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                          )}
                        </button>
                        {idx < route.legs.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-right">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">CARGO ASSIGNMENT</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block max-w-xs">
                      {route.vessel_name || route.cargo_summary || 'General Cargo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Route Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
                {/* 1. Origin -> Destination */}
                <div className="col-span-2 bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">ORIGIN → DESTINATION</span>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="truncate">{route.origin_port_name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{route.destination_port_name}</span>
                  </div>
                </div>

                {/* 2. Current Status */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">STATUS</span>
                  <span className="font-bold text-xs px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 inline-block">
                    {route.status}
                  </span>
                </div>

                {/* 3. Total Distance */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">TOTAL DISTANCE</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {route.total_distance}
                  </span>
                </div>

                {/* 4. Duration */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">DURATION</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {route.estimated_duration}
                  </span>
                </div>

                {/* 5. ETA */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">ETA</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 text-xs">
                    {route.eta}
                  </span>
                </div>

                {/* 6. Total Cost */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">TOTAL COST</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {route.cost || (route.total_cost_usd ? `$${route.total_cost_usd.toLocaleString()}` : 'N/A')}
                  </span>
                </div>

                {/* 7. Risk Level */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">RISK LEVEL</span>
                  <span
                    className={`font-bold uppercase text-xs px-2 py-0.5 rounded-lg border inline-block ${
                      route.risk_level === 'critical'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                        : route.risk_level === 'high'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    }`}
                  >
                    {route.risk_level}
                  </span>
                </div>
              </div>

              {/* Main Visualization Grid: Map + Vertical Itinerary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Constrained MapView (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-cyan-500" />
                        <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white uppercase">
                          MULTIMODAL JOURNEY MAP
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                          Live Telemetry Position
                        </span>
                      </div>
                    </div>

                    {/* Constrained MapView Container */}
                    <div className="h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative">
                      <RouteDetailMap
                        route={route}
                        selectedLegId={selectedLeg?.id}
                        onSelectLeg={(leg) => setSelectedLeg(leg)}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Selected Leg Details Footnote */}
                    {selectedLeg && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${getModeBadgeClass(selectedLeg.mode)}`}>
                            {getModeIcon(selectedLeg.mode, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              Leg #{selectedLeg.leg_order}: {selectedLeg.origin.name} → {selectedLeg.destination.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {selectedLeg.carrier_name || 'Carrier Pending'} • {selectedLeg.vehicle_type || 'Transport unit'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {selectedLeg.distance_formatted || `${selectedLeg.distance} units`}
                          </div>
                          <div className="text-[11px] text-cyan-600 dark:text-cyan-400">
                            {selectedLeg.duration}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Vertical Itinerary Timeline (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-500" />
                        <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white uppercase">
                          ITINERARY / TIMELINE
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        {route.legs.length} LEGS TOTAL
                      </span>
                    </div>

                    {/* Timeline List */}
                    <div className="space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {route.legs.map((leg) => {
                        const isCurrentActive = leg.status === 'active';
                        const isSelected = selectedLeg?.id === leg.id;

                        return (
                          <motion.div
                            key={leg.id}
                            onClick={() => setSelectedLeg(leg)}
                            whileHover={{ x: 3 }}
                            className={`relative pl-12 cursor-pointer transition-all ${
                              isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* Node icon pill on vertical line */}
                            <div
                              className={`absolute left-2.5 top-3 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md z-10 ${
                                isCurrentActive
                                  ? 'bg-cyan-500 border-white dark:border-slate-950 text-slate-950 ring-4 ring-cyan-500/30'
                                  : leg.status === 'completed'
                                  ? 'bg-emerald-500 border-white dark:border-slate-950 text-slate-950'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
                              }`}
                            >
                              {getModeIcon(leg.mode, 'w-3 h-3')}
                            </div>

                            {/* Leg Card Container */}
                            <div
                              className={`p-4 rounded-2xl border transition-all ${
                                isCurrentActive
                                  ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/20'
                                  : isSelected
                                  ? 'bg-white dark:bg-slate-800/80 border-amber-500/60 shadow-md'
                                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              {/* Leg Header Row */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getModeBadgeClass(leg.mode)}`}>
                                    {leg.mode.toUpperCase()}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                    Leg #{leg.leg_order}
                                  </span>
                                </div>
                                {getStatusBadge(leg.status)}
                              </div>

                              {/* Waypoint Connection */}
                              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 flex-wrap">
                                <span>{leg.origin.name}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                <span>{leg.destination.name}</span>
                              </div>

                              {/* Details Metrics */}
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">DISTANCE</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {leg.distance_formatted || `${leg.distance} NM`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">TRANSIT DURATION</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {leg.duration}
                                  </span>
                                </div>
                              </div>

                              {/* Carrier & Vehicle Type */}
                              {(leg.carrier_name || leg.vehicle_type) && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                                  <span className="text-slate-400">Carrier:</span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {leg.carrier_name || 'Standard Logistics'} ({leg.vehicle_type || 'Cargo Unit'})
                                  </span>
                                </div>
                              )}

                              {leg.notes && (
                                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 italic mt-1.5 line-clamp-2">
                                  {leg.notes}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
export default RouteDetailPage;
