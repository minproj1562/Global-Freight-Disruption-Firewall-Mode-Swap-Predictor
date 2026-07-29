// src/components/port/PortHealthCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { PortData } from '../../types/port';
import { CongestionGauge } from './CongestionGauge';
import { Ship, Clock, Anchor, AlertOctagon, ArrowUpRight, CloudRain, CheckCircle2 } from 'lucide-react';

interface PortHealthCardProps {
  port: PortData;
  onSelectPort: (portId: string) => void;
}

export const PortHealthCard: React.FC<PortHealthCardProps> = ({ port, onSelectPort }) => {
  const getStatusBadge = () => {
    switch (port.status) {
      case 'disrupted':
        return {
          label: 'Disrupted',
          bg: 'bg-red-500/20 border-red-500/40 text-red-400',
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
        };
      case 'heavy':
        return {
          label: 'Heavy Congestion',
          bg: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
        };
      case 'moderate':
        return {
          label: 'Moderate Traffic',
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case 'optimal':
      default:
        return {
          label: 'Optimal Flow',
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelectPort(port.id)}
      className="relative bg-slate-900/80 border border-white/15 rounded-3xl p-6 shadow-xl backdrop-blur-xl hover:border-amber-400/50 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer group flex flex-col justify-between overflow-hidden"
    >
      {/* Top Accent Gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
              {port.region} • {port.code}
            </span>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
              {port.name}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{port.country}</span>
              <span>•</span>
              <CloudRain className="w-3 h-3 text-slate-400" />
              <span>{port.temperatureC}°C {port.weatherCondition}</span>
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.bg}`}
          >
            {badge.icon}
            {badge.label}
          </span>
        </div>

        {/* Content Grid: Gauge + Key Stats */}
        <div className="grid grid-cols-12 gap-4 items-center my-4 py-3 bg-slate-950/60 rounded-2xl border border-white/5 px-4">
          {/* Gauge Column */}
          <div className="col-span-5 flex justify-center border-r border-white/10 pr-2">
            <CongestionGauge percentage={port.congestionRate} size={94} strokeWidth={8} />
          </div>

          {/* Metrics Column */}
          <div className="col-span-7 space-y-2.5 pl-2">
            {/* Docked vs Waiting */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Ship className="w-3.5 h-3.5 text-blue-400" /> Docked / Waiting
              </span>
              <span className="font-bold text-white">
                <span className="text-emerald-400">{port.dockedVessels}</span> /{' '}
                <span className="text-amber-400">{port.waitingVessels}</span>
              </span>
            </div>

            {/* Est Wait Time */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Est. Wait Time
              </span>
              <span className="font-extrabold text-amber-300">{port.avgWaitHours} hrs</span>
            </div>

            {/* Berth Occupancy */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-cyan-400" /> Berth Capacity
              </span>
              <span className="font-medium text-slate-200">
                {port.occupiedBerths}/{port.totalBerths} occupied
              </span>
            </div>
          </div>
        </div>

        {/* Active Disruption Banner if present */}
        {port.activeDisruptions.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 mb-3 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-red-200">
              <strong className="text-red-300 font-semibold block">
                {port.activeDisruptions[0].title}
              </strong>
              {port.activeDisruptions[0].description}
            </div>
          </div>
        )}
      </div>

      {/* Footer Card Button */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px]">Updated {port.lastUpdated}</span>
        <span className="inline-flex items-center gap-1 font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
          View Detail Page 3.2 <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </motion.div>
  );
};
