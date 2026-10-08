// frontend/src/pages/RouteDetailPage.tsx
/**
 * ROUTE INTELLIGENCE & CORRIDOR COMMAND CENTER
 * 
 * Implements dedicated architectural views for:
 * 1. COSCO SHIPPING UNIVERSE (/dashboard/routes/route-cosco-shipping-universe-02):
 *    - Multimodal Voyage Command (SEA → RAIL → ROAD)
 *    - Current Route vs Cape Alternative Arbitrage
 * 2. Priority Airlift #3 (/dashboard/routes/route-rec-3):
 *    - Mode-Swap Decision Center (SEA → ROAD → AIR → ROAD)
 *    - Economic & transit time trade-off analysis (Cost Δ, Time saved, Carbon impact)
 *    - Transfer operations manifest (Port → Road → Airport → Airlift → Consignee)
 * 3. EVER GIVEN (/dashboard/routes/route-ever-given-01):
 *    - Maritime Disruption Response (Bab-el-Mandeb threat surface)
 *    - 3-Stage transoceanic leg execution
 *    - Response Options & Recommended Mitigation protocol
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertTriangle,
  Clock,
  Shield,
  DollarSign,
  Leaf,
  Navigation,
  ExternalLink,
  ChevronRight,
  Radio,
  FileText,
  TrendingDown,
  Info,
  Calendar,
  Gauge,
  Activity,
  ArrowUpRight,
  Crosshair,
  Maximize2
} from 'lucide-react';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { RouteDetailMap } from '@/features/map/RouteDetailMap';
import { DetailedRoute, RouteLeg, LegTransportMode } from '@/types';
import { getRouteDetailById } from '@/services/routeDetailService';
import { EmptyState } from '@/shared/components/EmptyState';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

const ROUTE_PRESETS = [
  {
    id: 'route-cosco-shipping-universe-02',
    name: 'COSCO UNIVERSE',
    modes: ['sea', 'rail', 'road'],
    label: 'Multimodal 1 (Sea → Rail → Road)',
    vessel: 'COSCO SHIPPING UNIVERSE',
    desc: 'Cape bypass to Hamburg port with electric block train to Brussels.',
  },
  {
    id: 'route-rec-3',
    name: 'Priority Airlift #3',
    modes: ['sea', 'road', 'air', 'road'],
    label: 'Multimodal 2 (Sea → Road → Air → Road)',
    vessel: 'EVER GIVEN (Air Transfer)',
    desc: 'Salalah feeder to Dubai DWC tarmac with Boeing 777F airlift to Frankfurt.',
  },
  {
    id: 'route-ever-given-01',
    name: 'EVER GIVEN (Ocean)',
    modes: ['sea'],
    label: 'Pure Sea (Active Ocean Waypoints)',
    vessel: 'EVER GIVEN',
    desc: 'Full ocean navigation through Bab-el-Mandeb threat surface with naval escort.',
  },
];

export const RouteDetailPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [route, setRoute] = useState<DetailedRoute | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeg, setSelectedLeg] = useState<RouteLeg | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'financial' | 'risk'>('itinerary');

  const currentRouteId = routeId || 'route-rec-3';

  // Scenario flags
  const isCosco = currentRouteId.includes('universe') || currentRouteId.includes('cosco');
  const isAirPriority = currentRouteId.includes('rec-3');
  const isEverGiven = currentRouteId.includes('ever-given');

  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRouteDetailById(currentRouteId, location.state);
        if (isMounted) {
          if (data) {
            setRoute(data);
            setSelectedLeg(data.legs[data.active_leg_index] || data.legs[0] || null);
          } else {
            setError('The requested journey corridor could not be resolved.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to resolve multimodal route geometry.');
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
  }, [currentRouteId, location.state]);

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
        return <Navigation className={className} />;
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> COMPLETED
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span> IN TRANSIT
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-stone-200 dark:border-slate-700">
            UPCOMING
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-stone-50/70 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      <LogisticsManagerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto ml-16">
        {/* Compact Operational Header Bar */}
        <header className="border-b border-stone-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md px-6 py-3 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard/vessel-registry')}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 border border-stone-200 dark:border-slate-800 transition-colors"
                title="Return to Fleet Intelligence"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  <span>Page 1.7</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>
                    {isCosco && 'VOYAGE COMMAND · MULTIMODAL 1'}
                    {isAirPriority && 'MODE-SWAP DECISION CENTER · MULTIMODAL 2'}
                    {isEverGiven && 'MARITIME DISRUPTION RESPONSE · PURE SEA'}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-400">{currentRouteId}</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{route?.name || 'Corridor Intelligence'}</span>
                </h1>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => navigate('/dashboard/reroute-planner')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Simulate Mode-Swap</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard/active-routes')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200/80 dark:border-slate-700 transition-colors font-medium"
              >
                <span>Active Routes</span>
              </button>

              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Route Scenario Switcher Ribbon */}
        <div className="bg-stone-100/90 dark:bg-slate-900/80 border-b border-stone-200/80 dark:border-slate-800/80 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-500" />
              Scenario Switcher:
            </span>
            {ROUTE_PRESETS.map((p) => {
              const isCurrent = currentRouteId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/dashboard/routes/${p.id}`)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold shrink-0 transition-all flex items-center gap-2 border ${
                    isCurrent
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-750 border-stone-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {p.modes.map((m, i) => (
                      <span key={i} className="opacity-80">
                        {getModeIcon(m, 'w-3 h-3')}
                      </span>
                    ))}
                  </div>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <main className="p-4 sm:p-6 space-y-5 max-w-7xl w-full mx-auto flex-1">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 rounded-2xl bg-stone-100 dark:bg-slate-800 animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-stone-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 h-[440px] rounded-2xl bg-stone-100 dark:bg-slate-800 animate-pulse" />
                <div className="lg:col-span-5 h-[440px] rounded-2xl bg-stone-100 dark:bg-slate-800 animate-pulse" />
              </div>
            </div>
          ) : error || !route ? (
            <div className="p-12 text-center">
              <EmptyState
                title="Corridor Could Not Be Resolved"
                description={error || 'No route data could be loaded for this identifier.'}
                actionLabel="Return to Active Routes"
                onAction={() => navigate('/dashboard/active-routes')}
              />
            </div>
          ) : (
            <>
              {/* Contextual Scenario Command Header */}
              {isCosco && (
                <section className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          MULTIMODAL VOYAGE COMMAND
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          CAPE BYPASS ACTIVE
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {route.vessel_name} · Ningbo → Hamburg → Brussels (Sea → Rail → Road)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Shipment circumnavigates the Cape of Good Hope to avoid Red Sea drone attacks, berthing at Hamburg Waltershof. Containers transfer to DB Cargo electric block train to Brussels with final mile road transport.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono shrink-0">
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">CURRENT MODE</span>
                        <span className="font-bold text-sky-600 dark:text-sky-400 uppercase">{route.current_mode}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">CORRIDOR ETA</span>
                        <span className="font-bold text-slate-900 dark:text-white">{route.eta.slice(0, 10)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">TOTAL FREIGHT</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{route.cost}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">RISK STATUS</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">MITIGATED</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {isAirPriority && (
                <section className="bg-white dark:bg-[#12151E] border border-purple-500/30 rounded-2xl p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          MODE-SWAP DECISION CENTER
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          HIGH-VALUE AIRLIFT INTERVENTION
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Priority Sea-Air Hybrid Airlift · Salalah → Dubai DWC → Frankfurt → Rotterdam
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        High-tech electronics and medical perishables transferred off ocean carrier at Salalah to bypass European railway strikes and canal delays. Emirates SkyCargo Boeing 777F flight cuts 14.3 days off transit.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono shrink-0">
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">TRANSIT TIME</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">4.2 Days (vs 18.5d)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">DAYS GAINED</span>
                        <span className="font-bold text-emerald-500">+14.3 Days</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">AIRLIFT COST</span>
                        <span className="font-bold text-amber-500">$215,000 USD</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">DECISION CONFIDENCE</span>
                        <span className="font-bold text-cyan-500">98% Selected</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {isEverGiven && (
                <section className="bg-white dark:bg-[#12151E] border border-rose-500/30 rounded-2xl p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          MARITIME DISRUPTION RESPONSE
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          BAB-EL-MANDEB HOTZONE
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {route.vessel_name} · Shanghai → Suez Approach → Rotterdam (Pure Sea Transit)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Currently entering Northern Red Sea threat surface. Anti-ship missile hazard advisory active. Naval escort liaison assigned while evaluating Cape diversion or Salalah mode-swap alternatives.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono shrink-0">
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">ACTIVE LEG</span>
                        <span className="font-bold text-rose-500">Leg 2 of 3</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">REMAINING DIST</span>
                        <span className="font-bold text-slate-900 dark:text-white">2,450 NM</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">SPEED OVER GROUND</span>
                        <span className="font-bold text-cyan-500">18.4 Knots</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">RISK RATING</span>
                        <span className="font-bold text-rose-500 uppercase">CRITICAL</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Mode-Swap Decision Visual (Air Priority Scenario) */}
              {isAirPriority && (
                <section className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Mode-Swap Decision Architecture · Economic & Operational Trade-Off
                    </span>
                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                      Recommendation: AIRLIFT AUTHORIZED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    {/* Baseline Sea Route */}
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">OPTION A: CONTINUE PURE SEA</span>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">18.5 Days Transit</div>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div>Cost: <strong>$142,500 USD</strong></div>
                        <div>Demurrage Risk: <strong className="text-rose-500">High ($18.5k/day)</strong></div>
                        <div>Delay Risk: <strong className="text-rose-500">+14 Days at Congested Terminals</strong></div>
                        <div>Carbon: <strong>340 Tons CO₂</strong></div>
                      </div>
                    </div>

                    {/* Decision Fork Arrow */}
                    <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/30 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase font-sans">MODE-SWAP TRIGGER</span>
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                        Cargo value exceeding $12.4M triggers automatic mode-swap authorization. Air intervention cost premium of +$72,500 offsets an estimated $260,000 in supply chain demurrage.
                      </p>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                        Net Value Saved: ~$187,500
                      </div>
                    </div>

                    {/* Proposed Air Route */}
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/40 space-y-2">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase font-sans">OPTION B: PRIORITY AIRLIFT (#3)</span>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">4.2 Days (Sea → Air → Road)</div>
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div>Cost: <strong>$215,000 USD</strong> (+$72.5k premium)</div>
                        <div>Demurrage Avoided: <strong className="text-emerald-500">100% Protected</strong></div>
                        <div>Time Saved: <strong className="text-emerald-500">14.3 Days Gained</strong></div>
                        <div>Carbon: <strong>1,420 Tons CO₂</strong></div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Response Options (EVER GIVEN Disruption Scenario) */}
              {isEverGiven && (
                <section className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-500" />
                      Disruption Mitigation Protocols · Evaluated Scenarios
                    </span>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                      Naval Escort Protocol Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-600 dark:text-rose-400">1. CONTINUE VIA BAB-EL-MANDEB</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">Current</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Transiting with naval convoy escort. Insurance war-risk surcharge applied ($45k).
                      </p>
                      <div className="text-[11px] text-rose-500 font-bold">Threat: High · Delay: +2.5 Days</div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">2. DIVERT VIA CAPE OF GOOD HOPE</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-slate-800 text-slate-500">Option</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Full circumnavigation south of Africa. Eliminates missile threat entirely.
                      </p>
                      <div className="text-[11px] text-indigo-500 font-bold">Threat: Zero · Delay: +9.5 Days</div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">3. INTERMODAL MODE-SWAP AT SALALAH</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400">Fastest</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Discharge high-priority containers to air cargo in Dubai.
                      </p>
                      <div className="text-[11px] text-emerald-500 font-bold">Threat: Zero · Time Gained: +14.3 Days</div>
                    </div>
                  </div>
                </section>
              )}

              {/* Multimodal Journey Sequence Ribbon */}
              <section className="p-4 rounded-2xl bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                    <span>INTERMODAL TRANSIT SEQUENCE ({route.legs.length} LEGS) · CLICK LEG TO FOCUS MAP</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {route.legs.map((leg, idx) => {
                      const isSelected = selectedLeg?.id === leg.id;
                      const isActive = leg.status === 'active';

                      return (
                        <React.Fragment key={leg.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedLeg(leg)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all ${
                              isSelected
                                ? 'ring-2 ring-cyan-500 shadow-md ' + getModeBadgeClass(leg.mode)
                                : isActive
                                ? 'shadow-xs ' + getModeBadgeClass(leg.mode)
                                : 'bg-stone-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:border-stone-300'
                            }`}
                          >
                            {getModeIcon(leg.mode, 'w-3.5 h-3.5')}
                            <span>{leg.mode.toUpperCase()}</span>
                            {isActive && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                            )}
                          </button>
                          {idx < route.legs.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                  <div className="bg-stone-50 dark:bg-slate-900 p-2.5 rounded-xl border border-stone-200/80 dark:border-slate-800 text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">TOTAL CORRIDOR DISTANCE</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block max-w-xs">
                      {route.total_distance}
                    </span>
                  </div>
                </div>
              </section>

              {/* Main Visualization Grid: Interactive Map (7 Cols) + Itinerary Timeline (5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Constrained Interactive Route Map */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-cyan-500" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono">
                          Multimodal Geographic Journey Map
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          Live Transponder Coords
                        </span>
                      </div>
                    </div>

                    {/* Map Surface */}
                    <div className="h-[440px] w-full rounded-xl overflow-hidden relative shadow-inner">
                      <RouteDetailMap
                        route={route}
                        selectedLegId={selectedLeg?.id}
                        onSelectLeg={(leg) => setSelectedLeg(leg)}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Selected Leg Inspector Footnote */}
                    {selectedLeg && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg border ${getModeBadgeClass(selectedLeg.mode)}`}>
                            {getModeIcon(selectedLeg.mode, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              Leg #{selectedLeg.leg_order}: {selectedLeg.origin.name} → {selectedLeg.destination.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                              {selectedLeg.carrier_name || 'Carrier Transit'} • {selectedLeg.vehicle_type || 'Transport unit'}
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

                {/* Right: Detailed Itinerary Manifest (5 Cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-500" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono">
                          Itinerary & Transport Manifest
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                        {route.legs.length} LEGS EN ROUTE
                      </span>
                    </div>

                    {/* Timeline List */}
                    <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200 dark:before:bg-slate-800">
                      {route.legs.map((leg) => {
                        const isCurrentActive = leg.status === 'active';
                        const isSelected = selectedLeg?.id === leg.id;

                        return (
                          <div
                            key={leg.id}
                            onClick={() => setSelectedLeg(leg)}
                            className={`relative pl-10 cursor-pointer transition-all ${
                              isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            <div
                              className={`absolute left-1.5 top-3 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-md z-10 ${
                                isCurrentActive
                                  ? 'bg-cyan-500 border-white dark:border-slate-950 text-slate-950 ring-3 ring-cyan-500/30'
                                  : leg.status === 'completed'
                                  ? 'bg-emerald-500 border-white dark:border-slate-950 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                              }`}
                            >
                              {getModeIcon(leg.mode, 'w-2.5 h-2.5')}
                            </div>

                            <div
                              className={`p-3.5 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-850 border-cyan-500 ring-2 ring-cyan-500/20 shadow-md'
                                  : isCurrentActive
                                  ? 'bg-cyan-50/40 dark:bg-cyan-950/20 border-cyan-500/40'
                                  : 'bg-stone-50/70 dark:bg-slate-900/60 border-stone-200/80 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getModeBadgeClass(leg.mode)}`}>
                                    {leg.mode.toUpperCase()}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                    Leg #{leg.leg_order}
                                  </span>
                                </div>
                                {getStatusBadge(leg.status)}
                              </div>

                              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5 flex-wrap">
                                <span>{leg.origin.name}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                <span>{leg.destination.name}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-stone-200/60 dark:border-slate-800">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">DISTANCE</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {leg.distance_formatted || `${leg.distance} units`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">TRANSIT TIME</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {leg.duration}
                                  </span>
                                </div>
                              </div>

                              {(leg.carrier_name || leg.vehicle_type) && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-stone-100 dark:border-slate-800">
                                  <span className="text-slate-400">Carrier: </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {leg.carrier_name} ({leg.vehicle_type})
                                  </span>
                                </div>
                              )}

                              {leg.notes && (
                                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 italic mt-1.5 leading-snug">
                                  {leg.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Deep-Dive Intelligence Tabs */}
              <section className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-stone-100 dark:border-slate-800 pb-3 mb-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('itinerary')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'itinerary'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Waypoint Telemetry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('financial')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'financial'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cost & Carbon Arbitrage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('risk')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'risk'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Disruption Safeguards</span>
                  </button>
                </div>

                {/* Tab Content 1: Waypoints Table */}
                {activeTab === 'itinerary' && (
                  <div className="space-y-3 text-xs font-mono">
                    <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">
                      Sequential GPS navigation waypoints computed for this multimodal corridor:
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-stone-200/60 dark:border-slate-800">
                      <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-slate-800/40 text-slate-500 text-[11px] uppercase border-b border-stone-200/80 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Leg</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">Waypoint / Intermodal Node</th>
                            <th className="py-2.5 px-3">GPS Coordinates</th>
                            <th className="py-2.5 px-3">Distance</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
                          {route.legs.map((l) => (
                            <tr key={l.id} className="hover:bg-stone-50/60 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">#{l.leg_order}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getModeBadgeClass(l.mode)}`}>
                                  {l.mode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                {l.origin.name} → {l.destination.name}
                              </td>
                              <td className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400">
                                {Array.isArray(l.origin.coordinates) ? `${l.origin.coordinates[1]?.toFixed(2)}°N, ${l.origin.coordinates[0]?.toFixed(2)}°E` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{l.distance_formatted || `${l.distance} units`}</td>
                              <td className="py-2.5 px-3">{getStatusBadge(l.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Cost & Carbon Arbitrage */}
                {activeTab === 'financial' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                    <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-sans font-bold text-slate-400 block uppercase">Freight Expenditure</span>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {route.cost || '$180,000 USD'}
                      </div>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        Reflects negotiated intermodal contract rates inclusive of container terminal handling.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-sans font-bold text-slate-400 block uppercase">Demurrage Mitigation</span>
                      <div className="text-2xl font-bold text-emerald-500">
                        {isCosco ? '11.5 Days Avoided' : isAirPriority ? '14.3 Days Avoided' : 'On-Schedule Convoy'}
                      </div>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        Avoided terminal congestion penalties estimated at $18,500/day.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-sans font-bold text-slate-400 block uppercase">Carbon Footprint</span>
                      <div className="text-2xl font-bold text-indigo-500">
                        {isAirPriority ? '1,420 Tons CO₂' : '340 Tons CO₂'}
                      </div>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        Balanced modal choice balances urgency against European CSRD emissions boundaries.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Risk & Disruption Safeguards */}
                {activeTab === 'risk' && (
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                      <Shield className="w-4 h-4 text-cyan-500" />
                      <span>Firewall Safeguard Protocol</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                      {isCosco && 'COSCO SHIPPING UNIVERSE diverted via Cape of Good Hope and German/Belgian rail networks to bypass ongoing missile and drone hazard corridors in the Bab-el-Mandeb Strait. Cargo transships seamlessly onto electric freight rail at Hamburg Waltershof.'}
                      {isAirPriority && 'Priority Hybrid Airlift initiated from Salalah via Dubai DWC and Frankfurt CargoCity North. High-value consumer electronics bypass European regional rail strikes and canal delays, arriving 14 days ahead of pure maritime estimates.'}
                      {isEverGiven && 'EVER GIVEN currently navigating active ocean route under close surveillance with AIS transponder position updates logged every 5 seconds. Naval escort alert protocols active through Bab-el-Mandeb waters.'}
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default RouteDetailPage;
