import React from 'react';
import { Ship, Navigation, Gauge, MapPin, ArrowRight, AlertTriangle } from 'lucide-react';
import { Vessel } from '../../types';

interface VesselQuickPopupProps {
  vessel: Vessel;
  position?: { x: number; y: number } | null;
  onViewFullDetails: (vessel: Vessel) => void;
  onClose: () => void;
}

export const VesselQuickPopup: React.FC<VesselQuickPopupProps> = ({
  vessel,
  position,
  onViewFullDetails,
  onClose,
}) => {
  const getStatusBadge = () => {
    switch (vessel.status) {
      case 'disrupted':
        return { label: 'DISRUPTED', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
      case 'at-risk':
        return { label: 'AT RISK', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
      default:
        return { label: 'NORMAL', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    }
  };

  const badge = getStatusBadge();

  // Position popup near click point if provided, otherwise top center
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${Math.min(Math.max(position.x - 140, 20), window.innerWidth - 300)}px`,
        top: `${Math.min(Math.max(position.y - 120, 80), window.innerHeight - 260)}px`,
        zIndex: 50,
      }
    : {};

  return (
    <div
      style={style}
      className="w-72 glass-panel p-4 rounded-2xl border border-slate-700/80 shadow-2xl text-slate-100 relative"
    >
      {/* Status & Name Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge.bg}`}>
            {badge.label}
          </span>
          <h4 className="text-sm font-bold font-mono text-white mt-1 leading-snug">
            {vessel.name}
          </h4>
          <p className="text-[11px] text-slate-400">{vessel.flag} • IMO {vessel.imo}</p>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
        >
          ✕
        </button>
      </div>

      {/* Alert Banner if at risk */}
      {vessel.current_risk_reason && (
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 mb-3 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-tight">{vessel.current_risk_reason}</span>
        </div>
      )}

      {/* AIS Telemetry Data */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs mb-3 font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
          <span>{vessel.speed} kn</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span>{vessel.course}°</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-slate-300 truncate">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{vessel.destination_port}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onViewFullDetails(vessel)}
        type="button"
        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
      >
        <span>View Full Details & Mode-Swaps</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
