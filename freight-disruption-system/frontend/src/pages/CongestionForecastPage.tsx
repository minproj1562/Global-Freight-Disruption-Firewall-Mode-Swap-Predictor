// frontend/src/pages/CongestionForecastPage.tsx
// Page 1.5 — Congestion Forecast (Ripple-Heat) Map — real Prophet-backed data
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
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
  RefreshCw,
  ChevronRight,
  RadioTower,
  Loader2,
} from 'lucide-react';

import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { ConnectionIndicator } from '../shared/components/ConnectionIndicator';
import { MapView } from '../features/map/MapView';
import { LayerVisibilityState } from '../features/map/MapToolbar';
import { useToast } from '@/components/ui/use-toast';
import {
  PortCongestionForecast,
  CongestionTimeHorizon,
  CongestionTrend,
  CongestionTrendPoint,
} from '../types';
import {
  fetchCongestionRippleMap,
  fetchPortForecastDetail,
  fetchPortCongestionHistory,
  getMapVessels,
  getMapPorts,
  getMapDisruptions,
  getMapRoutes,
  getSecondaryInfrastructure,
} from '../services/api';

const REFRESH_INTERVAL_MS = 60000;

export const CongestionForecastPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [forecasts, setForecasts] = useState<PortCongestionForecast[]>([]);
  const [selectedHorizon, setSelectedHorizon] = useState<CongestionTimeHorizon>('now');
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>('');

  const [detailLoading, setDetailLoading] = useState(false);
  const [confidenceChartData, setConfidenceChartData] = useState<any[]>([]);
  const [forecastMeta, setForecastMeta] = useState<{ mae: number; mape: number; confidence_score: number } | null>(null);

  // Map data — real, fetched once and refreshed alongside the forecast
  const [mapVessels, setMapVessels] = useState<any[]>([]);
  const [mapPorts, setMapPorts] = useState<any[]>([]);
  const [mapDisruptions, setMapDisruptions] = useState<any[]>([]);
  const [mapRoutes, setMapRoutes] = useState<any[]>([]);
  const [mapInfra, setMapInfra] = useState<any[]>([]);

  const [layers] = useState<LayerVisibilityState>({
    vessels: false,
    ports: true,
    disruptions: true,
    routes: false,
    vesselNames: false,
    secondaryInfra: false,
  });

  const loadForecasts = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCongestionRippleMap(10);
      setForecasts(data.forecasts as PortCongestionForecast[]);
      setGeneratedAt(data.generated_at);
      if (!selectedPortId && data.forecasts.length > 0) {
        setSelectedPortId(data.forecasts[0].port_id);
      }
    } catch (err) {
      console.error('Failed to load congestion forecasts:', err);
      if (!silent) setLoadError('Could not load live congestion forecasts. Check that the forecasting service is running.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [selectedPortId]);

  const loadMapLayers = useCallback(async () => {
    try {
      const [vessels, ports, disruptions, routes, infra] = await Promise.all([
        getMapVessels(),
        getMapPorts(),
        getMapDisruptions(),
        getMapRoutes(),
        getSecondaryInfrastructure(),
      ]);
      setMapVessels(vessels);
      setMapPorts(ports);
      setMapDisruptions(disruptions);
      setMapRoutes(routes);
      setMapInfra(infra);
    } catch (err) {
      console.warn('Map layer data unavailable:', err);
    }
  }, []);

  useEffect(() => {
    loadForecasts(false);
    loadMapLayers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => loadForecasts(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadForecasts]);

  // Selected Port Object
  const selectedPortForecast = useMemo(() => {
    return forecasts.find((f) => f.port_id === selectedPortId) || forecasts[0];
  }, [forecasts, selectedPortId]);

  // Load the real Prophet confidence-band chart whenever the selected port changes
  useEffect(() => {
    if (!selectedPortForecast) return;
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([
      fetchPortForecastDetail(selectedPortForecast.port_id, 14),
      fetchPortCongestionHistory(selectedPortForecast.port_id, 14),
    ])
      .then(([forecastDetail, history]) => {
        if (cancelled) return;
        const historyPoints = history.history.map((h) => ({
          date: h.timestamp.slice(0, 10),
          actual: h.congestion_percent,
          forecast: null,
          band_lower: null,
          band_upper: null,
        }));
        const forecastPoints = forecastDetail.forecast_data.map((f) => ({
          date: f.ds,
          actual: null,
          forecast: f.yhat,
          band_lower: f.yhat_lower,
          band_upper: f.yhat_upper,
        }));
        setConfidenceChartData([...historyPoints, ...forecastPoints]);
        setForecastMeta({
          mae: forecastDetail.mae,
          mape: forecastDetail.mape,
          confidence_score: forecastDetail.confidence_score,
        });
      })
      .catch((err) => console.warn('Could not load Prophet detail chart:', err))
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPortForecast?.port_id]);

  const sortedTopPorts = useMemo(() => {
    return [...forecasts].sort(
      (a, b) => (b.congestion_scores[selectedHorizon] || 0) - (a.congestion_scores[selectedHorizon] || 0)
    );
  }, [forecasts, selectedHorizon]);

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
      selectedPortForecast.alternative_ports.forEach((alt) => {
        point[alt.port_name] = alt.congestion_scores[h.key];
      });
      return point;
    });
  }, [selectedPortForecast]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([loadForecasts(true), loadMapLayers()]).finally(() => {
      setIsRefreshing(false);
      toast({
        title: 'Congestion Forecast Refreshed',
        description: `Congestion predictions refreshed.`,
      });
    });
  };

  const renderTrendBadge = (trend: CongestionTrend) => {
    if (trend === 'up') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
          <TrendingUp className="w-3.5 h-3.5" /><span>Worsening</span>
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <TrendingDown className="w-3.5 h-3.5" /><span>Easing</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
        <Minus className="w-3.5 h-3.5" /><span>Stable</span>
      </span>
    );
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold animate-pulse';
    if (score >= 70) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-bold';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/40 font-semibold';
    return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-medium';
  };

  const altLineColors = ['#38b0f8', '#10b981', '#a855f7', '#f43f5e'];

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-xs font-mono">Loading live port congestion forecasts...</p>
        </div>
      </div>
    );
  }

  if (loadError || !selectedPortForecast) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-center max-w-md px-6">
          <p className="text-sm text-rose-500 font-mono">{loadError || 'No forecast data available yet.'}</p>
          <button onClick={() => loadForecasts(false)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <LogisticsManagerSidebar />

      {/* ===== TOP COMMAND BAR ===== */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 shadow-lg ml-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 shadow-md">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                PORT CONGESTION OUTLOOK
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">
                {selectedHorizon} HORIZON
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:flex items-center gap-1.5">
              <RadioTower className="w-3 h-3 text-emerald-500 animate-pulse" />
              Live forecast • Updated {generatedAt ? new Date(generatedAt).toLocaleTimeString() : '—'}
            </p>
          </div>
        </div>

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
                selectedHorizon === item.key ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ConnectionIndicator className="hidden sm:flex" />
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all" title="Refresh Congestion Forecasts">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-500' : ''}`} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ===== MAP CANVAS ===== */}
      <main className="w-full h-full">
        <MapView
          vessels={mapVessels}
          ports={mapPorts}
          disruptions={mapDisruptions}
          routes={mapRoutes}
          secondaryInfra={mapInfra}
          layers={layers}
          selectedVesselTypeFilters={[]}
          selectedVessel={null}
          selectedPort={mapPorts.find((p: any) => p.id === selectedPortId) || null}
          onSelectVessel={() => {}}
          onSelectPort={(p: any) => { if (p) setSelectedPortId(p.id); }}
          showHeatOverlay={true}
          congestionForecasts={forecasts}
          selectedTimeHorizon={selectedHorizon}
          className="w-full h-full"
        />
      </main>

      {/* ===== HEATMAP LEGEND ===== */}
      <div className="absolute top-20 left-20 z-20 glass-panel p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white/85 dark:bg-slate-950/85 backdrop-blur-md hidden md:block">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white mb-2">
          <Flame className="w-4 h-4 text-rose-500" />
          <span>CONGESTION LEVEL</span>
        </div>
        <div className="w-48 h-3 rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 via-amber-400 via-rose-500 to-purple-600 shadow-inner" />
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
          <span>Low (0)</span><span>Medium (50)</span><span>Critical (100)</span>
        </div>
      </div>

      {/* ===== TOP CONGESTED PORTS PANEL ===== */}
      <div className="absolute left-20 bottom-6 top-36 z-20 w-80 lg:w-96 flex flex-col glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl overflow-hidden hidden md:flex">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white">
            <Anchor className="w-4 h-4 text-amber-500" /><span>BUSIEST PORTS</span>
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
              <div key={port.port_id} onClick={() => setSelectedPortId(port.port_id)} className={`p-3 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 ${isSelected ? 'bg-rose-500/15 dark:bg-rose-500/20 border-l-4 border-rose-500' : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/60'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block truncate">{port.port_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{port.port_code} • {port.region}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderTrendBadge(port.trend)}
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-mono border ${getScoreBadgeClass(score)}`}>{score}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== FORECAST PANEL (comparison + real Prophet confidence band) ===== */}
      <div className="absolute right-6 bottom-6 top-20 z-20 w-80 lg:w-[440px] flex flex-col glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl overflow-hidden hidden md:flex">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white">
              <Activity className="w-4 h-4 text-sky-500" /><span>CONGESTION TREND (NEXT 3 DAYS)</span>
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

        <div className="flex-1 p-4 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="horizonLabel" stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="selectedPortScore" name={selectedPortForecast.port_name} stroke="#ef4444" strokeWidth={3} dot={{ r: 5, fill: '#ef4444' }} activeDot={{ r: 7 }} />
                {selectedPortForecast.alternative_ports.map((alt, idx) => (
                  <Line key={alt.port_id} type="monotone" dataKey={alt.port_name} name={alt.port_name} stroke={altLineColors[idx % altLineColors.length]} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* REAL PROPHET 14-DAY FORECAST WITH CONFIDENCE BAND */}
          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">14-DAY CONGESTION FORECAST</h4>
              {forecastMeta && (
                <span className="text-[10px] font-mono text-emerald-500">Confidence: {forecastMeta.confidence_score.toFixed(0)}%</span>
              )}
            </div>
            <div className="w-full h-40">
              {detailLoading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={confidenceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontFamily="monospace" tick={{ fontSize: 9 }} interval={Math.max(1, Math.floor(confidenceChartData.length / 6))} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '10px', fontFamily: 'monospace', color: '#fff' }} />
                    <Area type="monotone" dataKey="band_upper" stroke="none" fill="#f59e0b" fillOpacity={0.12} />
                    <Area type="monotone" dataKey="band_lower" stroke="none" fill="#0f172a" fillOpacity={1} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            {forecastMeta && (
              <p className="text-[9px] font-mono text-slate-400 mt-1">Avg. error: ±{forecastMeta.mae.toFixed(1)} points • Margin: {forecastMeta.mape.toFixed(1)}%</p>
            )}
          </div>

          {/* ALTERNATIVE DIVERSION PORTS */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>NEARBY ALTERNATIVE PORTS</span>
              <span className="text-emerald-500">LESS BUSY OPTIONS</span>
            </h4>
            <div className="space-y-2">
              {selectedPortForecast.alternative_ports.map((alt) => (
                <div key={alt.port_id} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{alt.port_name} ({alt.port_code})</span>
                    <span className="text-[10px] text-slate-400">Avg Wait: {alt.avg_wait_hours} hrs • Region: {alt.region}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold block">Score: {alt.congestion_scores[selectedHorizon]}</span>
                    <button
                      onClick={() => navigate('/dashboard/reroute-planner', { state: { destinationPort: alt.port_name, disruptionToAvoid: `Congestion at ${selectedPortForecast.port_name}` } })}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5 justify-end font-bold"
                    >
                      <span>Reroute Here</span><ChevronRight className="w-3 h-3" />
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