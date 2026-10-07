// frontend/src/features/admin/SystemHealthMonitor.tsx
// Page 4.1 — System Health Monitor
// Status cards for Database, AIS Poller, Weather Poller, Port Congestion Poller. API call usage chart. Error log table.

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Radio,
  CloudSun,
  Activity,
  RefreshCw,
  BarChart3,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  getSystemHealthCards,
  syncSystemPollerCard,
  getApiUsageHistory,
  getSystemErrorLogs,
  toggleErrorLogResolve,
  SystemHealthCardData,
  SystemErrorLogData,
  ApiUsageDataPoint,
} from '@/services/api';

export const SystemHealthMonitor: React.FC = () => {
  const [healthCards, setHealthCards] = useState<SystemHealthCardData[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsageDataPoint[]>([]);
  const [errorLogs, setErrorLogs] = useState<SystemErrorLogData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchHealthData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [cards, usage, logs] = await Promise.all([
        getSystemHealthCards(),
        getApiUsageHistory(),
        getSystemErrorLogs(),
      ]);
      setHealthCards(Array.isArray(cards) ? cards : []);
      setApiUsage(Array.isArray(usage) ? usage : []);
      setErrorLogs(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      console.error('Failed to load operational health telemetry:', err);
      setLoadError(err?.message || 'Could not connect to the system monitoring service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const handleManualSync = async (id: string) => {
    setSyncingId(id);
    try {
      const updatedCard = await syncSystemPollerCard(id);
      setHealthCards((prev) => prev.map((card) => (card.id === id ? updatedCard : card)));
    } catch (err) {
      setHealthCards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, lastSync: 'Just now' } : card))
      );
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleResolveError = async (id: string) => {
    try {
      const updatedLog = await toggleErrorLogResolve(id);
      setErrorLogs((prev) => prev.map((log) => (log.id === id ? updatedLog : log)));
    } catch (err) {
      setErrorLogs((prev) =>
        prev.map((log) => (log.id === id ? { ...log, resolved: !log.resolved } : log))
      );
    }
  };

  const filteredLogs = errorLogs.filter((log) => {
    const matchesFilter = logFilter === 'all' || log.severity.toLowerCase() === logFilter;
    const matchesSearch =
      log.service.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.code.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Each system component gets a quiet, consistent tint — just enough to tell them apart at a glance
  const getPollerStyle = (id: string) => {
    switch (id) {
      case 'db':
        return { icon: <Database className="w-5 h-5" />, tint: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      case 'ais':
        return { icon: <Radio className="w-5 h-5" />, tint: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' };
      case 'weather':
        return { icon: <CloudSun className="w-5 h-5" />, tint: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' };
      case 'congestion':
        return { icon: <Activity className="w-5 h-5" />, tint: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' };
      default:
        return { icon: <Activity className="w-5 h-5" />, tint: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300' };
    }
  };

  const getStatusBadge = (status: SystemHealthCardData['status']) => {
    if (status === 'Operational') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
    if (status === 'Degraded') return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
    return 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
  };

  const getSeverityBadge = (severity: SystemErrorLogData['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
      case 'ERROR':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
      case 'WARNING':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'INFO':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const operationalCount = healthCards.filter((c) => c.status === 'Operational').length;
  const readinessPct = healthCards.length ? Math.round((operationalCount / healthCards.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>System Health</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            System & Fleet Monitoring
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live status of the database, vessel tracking feed, weather updates, and port congestion data.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {readinessPct}% Systems Operational
        </div>
      </div>

      {loadError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-center justify-between text-amber-700 dark:text-amber-400 text-sm">
          <span>{loadError}</span>
          <button
            onClick={fetchHealthData}
            className="px-3 py-1.5 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 rounded-lg text-amber-800 dark:text-amber-300 font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* STATUS CARDS */}
      {isLoading && healthCards.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse h-56" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthCards.map((card) => {
            const style = getPollerStyle(card.id);
            return (
              <motion.div
                key={card.id}
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${style.tint}`}>{style.icon}</div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(card.status)}`}>
                      {card.status}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">{card.name}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{card.details}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                    {card.metrics.map((m, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{m.label}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500">Last updated: {card.lastSync}</span>
                  <button
                    onClick={() => handleManualSync(card.id)}
                    disabled={syncingId === card.id}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === card.id ? 'animate-spin text-violet-500' : ''}`} />
                    {syncingId === card.id ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ACTIVITY CHART */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              Data Traffic — Last 24 Hours
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Volume of incoming vessel positions, weather updates, and port data.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-sky-500" /> Vessel Tracking
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-amber-500" /> Weather
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-violet-500" /> Port Data
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={apiUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aisGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="weatherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '10px', border: '1px solid #334155' }}
                itemStyle={{ fontSize: '12px', color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="aisRequests" name="Vessel Tracking" stroke="#0ea5e9" fillOpacity={1} fill="url(#aisGrad)" />
              <Area type="monotone" dataKey="weatherRequests" name="Weather" stroke="#f59e0b" fillOpacity={1} fill="url(#weatherGrad)" />
              <Area type="monotone" dataKey="portRequests" name="Port Data" stroke="#8b5cf6" fillOpacity={1} fill="url(#portGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ERROR LOG TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-rose-500" />
              System Alerts & Issues
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A record of connection problems and warnings reported by the system.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <input
              type="text"
              placeholder="Search alerts..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-medium">Time</th>
                <th className="py-3 px-4 font-medium">Service</th>
                <th className="py-3 px-4 font-medium">Severity</th>
                <th className="py-3 px-4 font-medium">Details</th>
                <th className="py-3 px-4 font-medium">Technical Trace</th>
                <th className="py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{log.service}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getSeverityBadge(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-700 dark:text-slate-300 text-xs">{log.code}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 max-w-md">{log.message}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <pre className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-[10px] text-slate-500 dark:text-slate-400 overflow-x-auto max-w-xs border border-slate-200 dark:border-slate-700">
                      {log.stackTrace}
                    </pre>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleResolveError(log.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        log.resolved
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {log.resolved ? 'Resolved' : 'Mark Resolved'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};