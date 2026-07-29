// src/components/port/WorldPortMap.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortData } from '../../types/port';
import { Anchor, AlertTriangle, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface WorldPortMapProps {
  ports: PortData[];
  onSelectPort: (portId: string) => void;
}

export const WorldPortMap: React.FC<WorldPortMapProps> = ({ ports, onSelectPort }) => {
  const [hoveredPort, setHoveredPort] = useState<PortData | null>(null);

  // Map latitude (-90 to 90) and longitude (-180 to 180) to percentage X and Y positions
  const getCoordinates = (lat: number, lng: number) => {
    // Equirectangular approximation projection
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  const getStatusColor = (rate: number, status: string) => {
    if (status === 'disrupted' || rate >= 80) return { bg: 'bg-red-500', ring: 'ring-red-400', hex: '#EF4444' };
    if (rate >= 50) return { bg: 'bg-amber-500', ring: 'ring-amber-400', hex: '#F59E0B' };
    return { bg: 'bg-emerald-500', ring: 'ring-emerald-400', hex: '#10B981' };
  };

  return (
    <div className="relative w-full bg-slate-950/80 border border-white/15 rounded-3xl p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 mb-4 gap-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Anchor className="w-5 h-5 text-amber-400" />
            Global Port Congestion & Traffic Heatmap
          </h2>
          <p className="text-xs text-slate-400">
            Interactive maritime nodes. Click any port pin to open detailed single-port telemetry (Page 3.2).
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> &lt;50% Low
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> 50-79% Moderate
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> 80%+ Disrupted
          </span>
        </div>
      </div>

      {/* World Map Container */}
      <div className="relative w-full aspect-[2/1] min-h-[360px] bg-slate-900/90 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
        {/* SVG World Silhouette & Maritime Route Lines */}
        <svg
          viewBox="0 0 1000 500"
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        >
          {/* Graticule Grid */}
          <line x1="0" y1="250" x2="1000" y2="250" stroke="#334155" strokeWidth="0.5" strokeDasharray="4" />
          <line x1="500" y1="0" x2="500" y2="500" stroke="#334155" strokeWidth="0.5" strokeDasharray="4" />
          
          {/* Shipping Lane Paths */}
          <path d="M 515 105 Q 600 180 780 240 T 915 160" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,3" className="animate-pulse" />
          <path d="M 280 150 Q 400 120 515 105 T 650 320" fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="3,3" />

          {/* Continents Outline approximation */}
          <path
            d="M 150 120 Q 200 80 280 100 T 320 220 T 200 350 Z 
               M 450 100 Q 520 80 580 120 T 540 260 T 480 320 Z 
               M 700 100 Q 820 80 900 140 T 850 300 T 720 240 Z"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.5"
          />
        </svg>

        {/* Port Node Markers */}
        {ports.map((port) => {
          const coords = getCoordinates(port.lat, port.lng);
          const color = getStatusColor(port.congestionRate, port.status);

          return (
            <div
              key={port.id}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: coords.x, top: coords.y }}
              onMouseEnter={() => setHoveredPort(port)}
              onMouseLeave={() => setHoveredPort(null)}
              onClick={() => onSelectPort(port.id)}
            >
              {/* Outer Pulsing Aura */}
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0.2, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute inset-0 rounded-full ${color.bg} blur-sm`}
              />

              {/* Pin Center */}
              <div
                className={`relative flex items-center justify-center w-6 h-6 rounded-full ${color.bg} text-slate-950 font-bold text-[10px] shadow-lg border-2 border-white group-hover:scale-125 transition-transform duration-300`}
              >
                {port.status === 'disrupted' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                ) : (
                  <span>{port.code.substring(2)}</span>
                )}
              </div>

              {/* Port Code Label */}
              <span className="absolute left-1/2 -translate-x-1/2 top-7 text-[10px] font-bold tracking-wider text-slate-200 bg-slate-950/80 px-2 py-0.5 rounded border border-white/10 whitespace-nowrap shadow-md">
                {port.name.replace('Port of ', '')}
              </span>
            </div>
          );
        })}

        {/* Hover Floating Glassmorphism Tooltip */}
        <AnimatePresence>
          {hoveredPort && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-6 left-6 z-30 bg-slate-900/95 border border-white/20 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl max-w-xs text-white"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-2">
                <div>
                  <h4 className="font-bold text-sm text-amber-400">{hoveredPort.name}</h4>
                  <p className="text-[11px] text-slate-400">{hoveredPort.country} ({hoveredPort.code})</p>
                </div>
                <span
                  className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                  style={{
                    backgroundColor: `${getStatusColor(hoveredPort.congestionRate, hoveredPort.status).hex}25`,
                    color: getStatusColor(hoveredPort.congestionRate, hoveredPort.status).hex,
                  }}
                >
                  {hoveredPort.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Congestion</span>
                  <span className="font-extrabold text-amber-300 text-sm">{hoveredPort.congestionRate}%</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Est. Wait</span>
                  <span className="font-extrabold text-white text-sm">{hoveredPort.avgWaitHours}h</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Docked Vessels</span>
                  <span className="font-bold text-white">{hoveredPort.dockedVessels}</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Anchoring Queue</span>
                  <span className="font-bold text-amber-400">{hoveredPort.waitingVessels}</span>
                </div>
              </div>

              {hoveredPort.activeDisruptions.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-300 bg-red-500/20 border border-red-500/30 p-2 rounded-lg mb-3">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{hoveredPort.activeDisruptions[0].title}</span>
                </div>
              )}

              <button
                onClick={() => onSelectPort(hoveredPort.id)}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
              >
                <span>View Full Telemetry (Page 3.2)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
