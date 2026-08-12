// frontend/src/pages/CongestionForecastPage.tsx
// Page 1.5 — Congestion Forecast (Ripple-Heat) Map
// Enterprise Logistics SaaS — Palantir Foundry / Flexport / MarineTraffic Inspired UI
// FASTAPI REPLACEMENT POINT: Replace mock data with live REST endpoints:
// GET /api/v1/ports/congestion-forecast?horizon={now|plus_24h|plus_48h|plus_72h}

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Flame,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Anchor,
  Clock,
  Globe,
  Layers,
  MapPin,
  RefreshCw,
  Info,
  Compass,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { ConnectionIndicator } from '../shared/components/ConnectionIndicator';
import { MapView } from '../features/map/MapView';
import { MapToolbar, LayerVisibilityState } from '../features/map/MapToolbar';
import { useToast } from '@/components/ui/use-toast';
import {
  PortCongestionForecast,
  CongestionTimeHorizon,
  CongestionTrend,
  CongestionTrendPoint,
} from '../types';
import { MOCK_CONGESTION_FORECASTS } from '../shared/mock/congestionForecastMockData';
import { MOCK_VESSELS, MOCK_PORTS, MOCK_DISRUPTIONS, MOCK_ROUTES, MOCK_SECONDARY_INFRASTRUCTURE } from '../shared/mock/mockData';

export const CongestionForecastPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [forecasts, setForecasts] = useState<PortCongestionForecast[]>(MOCK_CONGESTION_FORECASTS);
  const [selectedHorizon, setSelectedHorizon] = useState<CongestionTimeHorizon>('now');
  const [selectedPortId, setSelectedPortId] = useState<string>(MOCK_CONGESTION_FORECASTS[0].port_id);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Map Layer Toggles State (reusing existing layer toggle pattern)
  const [layers, setLayers] = useState<LayerVisibilityState>({
    vessels: false, // Default off for heat map clarity
    ports: true,
    disruptions: true,
    routes: false,
    vesselNames: false,
    secondaryInfra: false,
  });

  // Simulated initial load timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Selected Port Object (defaults to #1 most congested if invalid)
  const selectedPortForecast = useMemo(() => {
    return forecasts.find((f) => f.port_id === selectedPortId) || forecasts[0];
  }, [forecasts, selectedPortId]);

  // Top Ports sorted by Congestion Score for currently selected time horizon
  const sortedTopPorts = useMemo(() => {
    return [...forecasts].sort(
      (a, b) => (b.congestion_scores[selectedHorizon] || 0) - (a.congestion_scores[selectedHorizon] || 0)
    );
  }, [forecasts, selectedHorizon]);

  // Transform forecast timeline for Recharts line comparison
  const chartData = useMemo(() => {
    if (!selectedPortForecast) return [];

    const horizons: { label: string; key: CongestionTimeHorizon }[] = [
      { label: 'NOW', key: 'now' },
      { label: '+24h', key: 'plus_24h' },
      { label: '+48h', key: 'plus_48h' },
      { label: '+72h', key: 'plus_72h' },
    ];

    return horizons.map((h) => {
      const point: CongestionTrendPoint = {
        horizonLabel: h.label,
        horizonKey: h.key,
        selectedPortScore: selectedPortForecast.congestion_scores[h.key],
      };

      // Add alternative ports series data
      selectedPortForecast.alternative_ports.forEach((alt) => {
        point[alt.port_name] = alt.congestion_scores[h.key];
      });

      return point;
    });
  }, [selectedPortForecast]);

  // Toggle Layer Visibility
  const handleToggleLayer = (layerKey: keyof LayerVisibilityState) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: 'Congestion Matrix Refreshed',
        description: `Updated port queue predictions for horizon [${selectedHorizon.toUpperCase()}].`,
      });
    }, 700);
  };

  // Trend Icon Renderer
  const renderTrendBadge = (trend: CongestionTrend) => {
    if (trend === 'up') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Worsening</span>
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Easing</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
        <Minus className="w-3.5 h-3.5" />
        <span>Stable</span>
      </span>
    );
  };

  // Score Badge Color Helper
  const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold animate-pulse';
    if (score >= 70) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-bold';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/40 font-semibold';
    return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-medium';
  };

  // Line stroke colors for Recharts alternative ports comparison
  const altLineColors = ['#38b0f8', '#10b981', '#a855f7', '#f43f5e'];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <PortManagerSidebar />

      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR / NAV HEADER */}
      {/* ========================================================================= */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 shadow-lg ml-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 shadow-md">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                CONGESTION FORECAST (RIPPLE-HEAT) MAP
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">
                {selectedHorizon} HORIZON
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
              PAGE 1.5 • PREDICTIVE PORT BOTTLENECK & RIPPLE HEATMAP DYNAMICS
            </p>
          </div>
        </div>

        {/* TIME HORIZON SEGMENTED CONTROL (NOW / +24h / +48h / +72h) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
          {[
            { key: 'now', label: 'NOW' },
            { key: 'plus_24h', label: '+24h' },
            { key: 'plus_48h', label: '+48h' },
            { key: 'plus_72h', label: '+72h' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedHorizon(item.key as CongestionTimeHorizon)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedHorizon === item.key
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ConnectionIndicator className="hidden sm:flex" />

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all"
            title="Refresh Congestion Forecasts"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-500' : ''}`} />
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. FULLSCREEN MAPBOX CANVAS WITH HEATMAP OVERLAY */}
      {/* ========================================================================= */}
      <main className="w-full h-full">
        <MapView
          vessels={MOCK_VESSELS}
          ports={MOCK_PORTS}
          disruptions={MOCK_DISRUPTIONS}
          routes={MOCK_ROUTES}
          secondaryInfra={MOCK_SECONDARY_INFRASTRUCTURE}
          layers={layers}
          selectedVesselTypeFilters={[]}
          selectedVessel={null}
          selectedPort={MOCK_PORTS.find((p) => p.id === selectedPortId) || null}
          onSelectVessel={() => {}}
          onSelectPort={(p) => {
            if (p) setSelectedPortId(p.id);
          }}
          showHeatOverlay={true}
          congestionForecasts={forecasts}
          selectedTimeHorizon={selectedHorizon}
          className="w-full h-full"
        />
      </main>

      {/* ========================================================================= */}
      {/* 3. FLOATING HEATMAP LEGEND PANEL */}
      {/* ========================================================================= */}
      <div className="absolute top-20 left-20 z-20 glass-panel p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white/85 dark:bg-slate-950/85 backdrop-blur-md hidden md:block">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white mb-2">
          <Flame className="w-4 h-4 text-rose-500" />
          <span>CONGESTION DENSITY SCALE</span>
        </div>
        <div className="w-48 h-3 rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 via-amber-400 via-rose-500 to-purple-600 shadow-inner" />
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
          <span>Low (0)</span>
          <span>Medium (50)</span>
          <span>Critical (100)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TOP 10 CONGESTED PORTS TABLE PANEL (LEFT OVERLAY) */}
      {/* ========================================================================= */}
      <div className="absolute left-20 bottom-6 top-36 z-20 w-80 lg:w-96 flex flex-col glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl overflow-hidden hidden md:flex">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white">
            <Anchor className="w-4 h-4 text-amber-500" />
            <span>TOP CONGESTED PORTS</span>
          </div>
          <span className="text-[10px] font-mono text-rose-500 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
            HORIZON: {selectedHorizon.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/80">
          {sortedTopPorts.map((port, idx) => {
            const isSelected = port.port_id === selectedPortId;
            const score = port.congestion_scores[selectedHorizon];

            return (
              <div
                key={port.port_id}
                onClick={() => setSelectedPortId(port.port_id)}
                className={`p-3 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-rose-500/15 dark:bg-rose-500/20 border-l-4 border-rose-500'
                    : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                    idx === 0
                      ? 'bg-rose-500 text-white'
                      : idx === 1
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block truncate">
                      {port.port_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {port.port_code} • {port.region}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderTrendBadge(port.trend)}
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-mono border ${getScoreBadgeClass(score)}`}>
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FORECAST COMPARISON LINE CHART PANEL (RIGHT OVERLAY) */}
      {/* ========================================================================= */}
      <div className="absolute right-6 bottom-6 top-20 z-20 w-80 lg:w-[440px] flex flex-col glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl overflow-hidden hidden md:flex">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white">
              <Activity className="w-4 h-4 text-sky-500" />
              <span>FORECAST WINDOW (NOW → +72H)</span>
            </div>
            <h3 className="text-sm font-bold font-mono text-amber-500 mt-1">
              {selectedPortForecast.port_name} ({selectedPortForecast.port_code})
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Waiting Vessels: <strong className="text-white">{selectedPortForecast.waiting_vessels_count}</strong> • Berth Util: <strong className="text-white">{selectedPortForecast.berth_utilization_percent}%</strong>
            </p>
          </div>

          <span className={`px-2.5 py-1 rounded-xl text-xs font-mono border ${getScoreBadgeClass(selectedPortForecast.congestion_scores[selectedHorizon])}`}>
            Score: {selectedPortForecast.congestion_scores[selectedHorizon]}
          </span>
        </div>

        {/* RECHARTS LINE CHART */}
        <div className="flex-1 p-4 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="horizonLabel" stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '8px' }} />
                
                {/* Primary Selected Port Line */}
                <Line
                  type="monotone"
                  dataKey="selectedPortScore"
                  name={selectedPortForecast.port_name}
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#ef4444' }}
                  activeDot={{ r: 7 }}
                />

                {/* Alternative Nearby Ports Comparison Lines */}
                {selectedPortForecast.alternative_ports.map((alt, idx) => (
                  <Line
                    key={alt.port_id}
                    type="monotone"
                    dataKey={alt.port_name}
                    name={alt.port_name}
                    stroke={altLineColors[idx % altLineColors.length]}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* NEARBY ALTERNATIVE PORTS DIVERSIFICATION CARDS */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>NEARBY ALTERNATIVE DIVERSION PORTS</span>
              <span className="text-emerald-500">OPTIMAL DIVERSION TARGETS</span>
            </h4>

            <div className="space-y-2">
              {selectedPortForecast.alternative_ports.map((alt, idx) => (
                <div
                  key={alt.port_id}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {alt.port_name} ({alt.port_code})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Avg Wait: {alt.avg_wait_hours} hrs • Region: {alt.region}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-emerald-400 font-bold block">
                      Score: {alt.congestion_scores[selectedHorizon]}
                    </span>
                    <button
                      onClick={() => {
                        navigate('/dashboard/reroute-planner', {
                          state: {
                            destinationPort: alt.port_name,
                            disruptionToAvoid: `Congestion at ${selectedPortForecast.port_name}`,
                          },
                        });
                      }}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5 justify-end font-bold"
                    >
                      <span>Reroute Here</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
