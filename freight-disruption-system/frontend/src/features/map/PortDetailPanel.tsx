import React from 'react';
import { motion } from 'framer-motion';
import { X, Anchor, Clock, Ship, AlertOctagon, BarChart3, PackageCheck, MapPin } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Port } from '../../types';

interface PortDetailPanelProps {
  port: Port;
  onClose: () => void;
}

export const PortDetailPanel: React.FC<PortDetailPanelProps> = ({ port, onClose }) => {
  const chartData = (port.congestion_history || [30, 40, 50, 60, 75, 80]).map((val, idx) => ({
    time: `Day-${port.congestion_history.length - idx}`,
    congestion: val,
  }));

  const getCongestionBadge = () => {
    switch (port.congestion_level) {
      case 'critical':
        return { label: 'CRITICAL CONGESTION', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
      case 'high':
        return { label: 'HIGH CONGESTION', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
      case 'medium':
        return { label: 'MODERATE CONGESTION', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
      default:
        return { label: 'LOW CONGESTION', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    }
  };

  const badge = getCongestionBadge();
  const berthUtilizationPercent = Math.round((port.active_berths_used / port.berth_capacity) * 100);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[420px] lg:w-[460px] glass-panel border-l border-slate-700/80 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                PORT TERMINAL TELEMETRY
              </span>
              <h2 className="text-xl font-bold font-mono text-white tracking-tight">{port.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle & Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300">
            {port.code} • {port.country}
          </span>
          <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        {/* Key Operational Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Ship className="w-3.5 h-3.5 text-amber-400" />
              <span>Waiting Vessels</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{port.waiting_vessels}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Avg Anchorage Wait</span>
            </div>
            <p className="text-2xl font-bold text-rose-400">{port.avg_wait_hours} hrs</p>
          </div>

          <div className="col-span-2 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Berth Capacity Utilization</span>
              </span>
              <span className="font-bold text-sky-400">{berthUtilizationPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  berthUtilizationPercent > 90
                    ? 'bg-rose-500'
                    : berthUtilizationPercent > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${berthUtilizationPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>{port.active_berths_used} Berths Occupied</span>
              <span>{port.berth_capacity} Total Berths</span>
            </div>
          </div>
        </div>

        {/* Congestion Sparkline Chart */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 mb-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span>CONGESTION INDEX TREND (7 DAYS)</span>
            <span className="text-sky-400">{port.congestion_history[port.congestion_history.length - 1]}% Index</span>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38b0f8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38b0f8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="congestion" stroke="#38b0f8" strokeWidth={2} fillOpacity={1} fill="url(#portGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Primary Exports & Location */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal Coordinates: {port.latitude.toFixed(4)}°, {port.longitude.toFixed(4)}°</span>
          </div>
          {port.primary_exports && (
            <div>
              <span className="text-slate-400 block mb-1.5">PRIMARY EXPORT COMMODITIES:</span>
              <div className="flex flex-wrap gap-1.5">
                {port.primary_exports.map((exp, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 text-center">
        <button
          onClick={onClose}
          type="button"
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
        >
          Close Terminal Telemetry
        </button>
      </div>
    </motion.div>
  );
};
