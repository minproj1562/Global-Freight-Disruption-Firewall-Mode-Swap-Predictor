// src/components/port/BerthDiagram.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Berth, Vessel } from '../../types/port';
import { Anchor, Wrench, Container, Clock, Ship, User, ExternalLink } from 'lucide-react';

interface BerthDiagramProps {
  berths: Berth[];
  onSelectVessel: (vessel: Vessel) => void;
}

export const BerthDiagram: React.FC<BerthDiagramProps> = ({ berths, onSelectVessel }) => {
  return (
    <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-2">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Anchor className="w-5 h-5 text-amber-400" />
            Live Berth Layout & Quay Crane Visualizer
          </h3>
          <p className="text-xs text-slate-400">
            Real-time graphical representation of quay berths, container gantries, and docked vessels. Click any berth vessel for complete manifest.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Occupied
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Vacant
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Maintenance
          </span>
        </div>
      </div>

      {/* Visual Quay Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {berths.map((berth) => {
          const isOccupied = berth.status === 'Occupied' && berth.currentVessel;
          const isMaintenance = berth.status === 'Maintenance';

          return (
            <motion.div
              key={berth.id}
              whileHover={{ scale: 1.02 }}
              className={`relative rounded-2xl border p-4 transition-all ${
                isOccupied
                  ? 'bg-slate-950/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                  : isMaintenance
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-950/40 border-white/10 hover:border-blue-400/40'
              }`}
            >
              {/* Berth Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-amber-400 text-slate-950">
                    {berth.berthNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">
                    {berth.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isOccupied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isMaintenance
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {berth.status}
                </span>
              </div>

              {/* Berth Visual Body */}
              {isOccupied && berth.currentVessel ? (
                <div
                  onClick={() => onSelectVessel(berth.currentVessel!)}
                  className="cursor-pointer group/vessel bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/10 transition-colors"
                >
                  {/* Vessel Hull Graphic representation */}
                  <div className="relative h-14 bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 rounded-lg p-2 flex items-center justify-between border border-blue-400/30 overflow-hidden mb-3">
                    <div className="relative z-10">
                      <h4 className="text-xs font-extrabold text-white group-hover/vessel:text-amber-300 transition-colors flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5 text-amber-400" />
                        {berth.currentVessel.name}
                      </h4>
                      <p className="text-[10px] text-slate-300 font-medium">
                        {berth.currentVessel.imo} • {berth.currentVessel.type}
                      </p>
                    </div>
                    <div className="text-right relative z-10">
                      <span className="text-[10px] text-amber-300 font-bold block">
                        {berth.currentVessel.lengthMeters}m LOA
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {berth.currentVessel.draftMeters}m Draft
                      </span>
                    </div>

                    {/* Background Container Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:8px_8px]" />
                  </div>

                  {/* Operational Status & Gantries */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Container className="w-3 h-3 text-emerald-400" /> Cargo Activity
                      </span>
                      <span className="font-semibold text-emerald-400 text-[11px]">
                        {berth.cargoActivity || 'Unloading'} ({berth.opsProgressPercent || 50}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${berth.opsProgressPercent || 50}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> Vacancy in:
                      </span>
                      <span className="font-bold text-white">{berth.estimatedVacancy}</span>
                    </div>
                  </div>
                </div>
              ) : isMaintenance ? (
                <div className="py-6 px-4 text-center bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Wrench className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-amber-300">Under Scheduled Maintenance</p>
                  <p className="text-[10px] text-slate-400 mt-1">{berth.estimatedVacancy}</p>
                </div>
              ) : (
                <div className="py-6 px-4 text-center bg-blue-500/5 rounded-xl border border-dashed border-blue-500/20">
                  <Anchor className="w-8 h-8 text-blue-400/50 mx-auto mb-2" />
                  <p className="text-xs font-bold text-blue-300">Berth Available</p>
                  <p className="text-[10px] text-slate-400 mt-1">Ready for incoming ship allocation</p>
                </div>
              )}

              {/* Quay Specifications footer */}
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span>Max LOA: {berth.maxLengthMeters}m</span>
                <span>Max Draft: {berth.maxDraftMeters}m</span>
                <span className="text-amber-400 font-semibold">{berth.craneCount} Gantries</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
