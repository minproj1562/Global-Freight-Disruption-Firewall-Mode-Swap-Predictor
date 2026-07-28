import React from 'react';
import { motion } from 'framer-motion';
import { X, Ship, Gauge, Navigation, MapPin, Anchor, ShieldAlert, GitPullRequest, Calendar, Layers } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Vessel, Route } from '../../types';

interface VesselDetailPanelProps {
  vessel: Vessel;
  route?: Route | null;
  onClose: () => void;
  onOpenReroute: (vessel: Vessel) => void;
}

export const VesselDetailPanel: React.FC<VesselDetailPanelProps> = ({
  vessel,
  route,
  onClose,
  onOpenReroute,
}) => {
  const chartData = (vessel.speed_history || [18, 17, 16, 18, 19.5]).map((val, idx) => ({
    time: `T-${vessel.speed_history.length - idx}h`,
    speed: val,
  }));

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[420px] lg:w-[460px] glass-panel border-l border-slate-700/80 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                AIS TELEMETRY PANEL
              </span>
              <h2 className="text-xl font-bold font-mono text-white tracking-tight">{vessel.name}</h2>
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

        {/* Status Tag */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-slate-200">
            {vessel.flag}
          </span>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
              vessel.status === 'disrupted'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : vessel.status === 'at-risk'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            Status: {vessel.status}
          </span>
        </div>

        {/* Risk Reason Alert */}
        {vessel.current_risk_reason && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 mb-6 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-rose-200 font-bold mb-0.5">DISRUPTION ALERT</strong>
              <p className="leading-relaxed">{vessel.current_risk_reason}</p>
            </div>
          </div>
        )}

        {/* AIS Coordinates & Speed Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-mono">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Speed (kn)</span>
            </div>
            <p className="text-xl font-bold text-white">{vessel.speed} kn</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              <span>Heading / Course</span>
            </div>
            <p className="text-xl font-bold text-white">{vessel.heading}° / {vessel.course}°</p>
          </div>

          <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Coordinates</span>
            </div>
            <p className="text-sm font-bold text-emerald-400">
              {vessel.latitude.toFixed(4)}° N, {vessel.longitude.toFixed(4)}° E
            </p>
          </div>
        </div>

        {/* Speed Trend Sparkline Chart */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 mb-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span>SPEED HISTORY (PAST 12 HOURS)</span>
            <span className="text-amber-400">{vessel.speed} kn avg</span>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="speed" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#speedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vessel Particulars */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs mb-6 font-mono">
          <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 mb-2">
            VESSEL SPECIFICATIONS & CARGO
          </h4>
          <div className="flex justify-between">
            <span className="text-slate-400">IMO / MMSI:</span>
            <span className="text-slate-200 font-semibold">{vessel.imo} / {vessel.mmsi}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Vessel Type:</span>
            <span className="text-slate-200 font-semibold">{vessel.vessel_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Length / Draught:</span>
            <span className="text-slate-200 font-semibold">{vessel.length_meters || 399}m / {vessel.draught_meters || 15.5}m</span>
          </div>
          {vessel.capacity_teu && vessel.capacity_teu > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Max TEU Capacity:</span>
              <span className="text-amber-400 font-semibold">{vessel.capacity_teu.toLocaleString()} TEU</span>
            </div>
          )}
          {vessel.cargo_summary && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-400 block mb-1">Manifest Summary:</span>
              <p className="text-slate-300 font-sans text-xs">{vessel.cargo_summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reroute Action Footer */}
      <div className="pt-4 border-t border-slate-800">
        {route?.requires_reroute || vessel.status !== 'normal' ? (
          <button
            onClick={() => onOpenReroute(vessel)}
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <GitPullRequest className="w-4 h-4" />
            <span>View Recommended Mode-Swaps</span>
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-400 font-mono font-medium">
            Vessel is on nominal schedule. No mode-swap required.
          </div>
        )}
      </div>
    </motion.div>
  );
};
