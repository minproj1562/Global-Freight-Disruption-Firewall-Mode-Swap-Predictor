// frontend/src/features/admin/SystemHealthMonitor.tsx
// Page 4.1 — System Health Monitor
// Status cards for Database, AIS Poller, Weather Poller, Port Congestion Poller. API call usage chart. Error log table.

import React, { useState } from 'react';
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
  SYSTEM_HEALTH_CARDS,
  API_USAGE_HISTORY,
  INITIAL_ERROR_LOGS,
  SystemErrorLog,
} from '@/shared/mock/adminMockData';

export const SystemHealthMonitor: React.FC = () => {
  const [healthCards, setHealthCards] = useState(SYSTEM_HEALTH_CARDS);
  const [errorLogs, setErrorLogs] = useState<SystemErrorLog[]>(INITIAL_ERROR_LOGS);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Manual Trigger Sync for Pollers
  const handleManualSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setHealthCards((prev) =>
        prev.map((card) =>
          card.id === id ? { ...card, lastSync: 'Just now (0.1s)' } : card
        )
      );
      setSyncingId(null);
    }, 1000);
  };

  // Resolve Error Log Action
  const handleToggleResolveError = (id: string) => {
    setErrorLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, resolved: !log.resolved } : log))
    );
  };

  // Filter Error Logs
  const filteredLogs = errorLogs.filter((log) => {
    const matchesFilter = logFilter === 'all' || log.severity.toLowerCase() === logFilter;
    const matchesSearch =
      log.service.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.code.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getPollerIcon = (id: string) => {
    switch (id) {
      case 'db':
        return <Database className="w-5 h-5 text-emerald-400" />;
      case 'ais':
        return <Radio className="w-5 h-5 text-cyan-400" />;
      case 'weather':
        return <CloudSun className="w-5 h-5 text-amber-400" />;
      case 'congestion':
        return <Activity className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getSeverityBadge = (severity: SystemErrorLog['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/15 border-red-500/40 text-red-400';
      case 'ERROR':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
      case 'WARNING':
        return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300';
      case 'INFO':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-400';
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100 transition-colors">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>PAGE 4.1 • SYSTEM INFRASTRUCTURE HEALTH</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Health & Poller Monitor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status of Database engines, live AIS ingestion pollers, weather grid updates, and system error trace logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            ALL SYSTEMS OPERATIONAL (99.98%)
          </div>
        </div>
      </div>

      {/* ======== 1. STATUS CARDS FOR DB & POLLERS ======== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {healthCards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ y: -3 }}
            className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  {getPollerIcon(card.id)}
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {card.status}
                </span>
              </div>

              <h3 className="font-bold text-white text-sm">{card.name}</h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{card.details}</p>

              {/* Key Metrics */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                {card.metrics.map((m, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block font-mono">{m.label}</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Footer Sync Trigger */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Sync: {card.lastSync}</span>
              <button
                onClick={() => handleManualSync(card.id)}
                disabled={syncingId === card.id}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncingId === card.id ? 'animate-spin text-purple-400' : ''}`} />
                {syncingId === card.id ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ======== 2. API CALL USAGE CHART ======== */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              API Call Usage & Telemetry Requests (24h)
            </h3>
            <p className="text-xs text-slate-400">Hourly throughput across AIS, Weather, Port Congestion & Disruption REST/WS APIs.</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded-sm bg-cyan-500" />
              <span>AIS Telemetry</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              <span>Weather Grid</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <span className="w-3 h-3 rounded-sm bg-purple-500" />
              <span>Port Analytics</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={API_USAGE_HISTORY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aisGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="weatherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="aisRequests" name="AIS Stream" stroke="#06b6d4" fillOpacity={1} fill="url(#aisGrad)" />
              <Area type="monotone" dataKey="weatherRequests" name="Weather API" stroke="#f59e0b" fillOpacity={1} fill="url(#weatherGrad)" />
              <Area type="monotone" dataKey="portRequests" name="Port Engine" stroke="#a855f7" fillOpacity={1} fill="url(#portGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ======== 3. ERROR LOG TABLE ======== */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-red-400" />
              System Error & Operational Log Audit
            </h3>
            <p className="text-xs text-slate-400">Captured backend exception tracebacks, rate limit alerts & database hypertable locks.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none capitalize"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Filter logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Code & Message</th>
                <th className="py-3 px-4 font-semibold">Stack Trace</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">{log.service}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadge(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-amber-300 text-[11px]">{log.code}</div>
                    <div className="text-slate-300 text-xs mt-0.5 max-w-md">{log.message}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <pre className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400 overflow-x-auto max-w-xs border border-slate-800">
                      {log.stackTrace}
                    </pre>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleResolveError(log.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        log.resolved
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {log.resolved ? '✓ Resolved' : 'Mark Resolved'}
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
