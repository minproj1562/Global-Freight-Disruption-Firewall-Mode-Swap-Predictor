// src/components/port/VesselDetailModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortStore } from '../../store/portStore';
import { Ship, X, Anchor, Calendar, ShieldAlert, User, Compass, ArrowRight } from 'lucide-react';

export const VesselDetailModal: React.FC = () => {
  const { selectedVessel, isVesselModalOpen, closeVesselModal } = usePortStore();

  if (!isVesselModalOpen || !selectedVessel) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-amber-400/40 rounded-3xl p-6 shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-2xl shadow-lg">
                <Ship className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{selectedVessel.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {selectedVessel.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {selectedVessel.imo} • Flag: {selectedVessel.flag} ({selectedVessel.flagCode})
                </p>
              </div>
            </div>
            <button
              onClick={closeVesselModal}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid Spec */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-6">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10">
              <span className="text-slate-400 text-[10px] block">Length Overall (LOA)</span>
              <span className="font-extrabold text-amber-300 text-sm">{selectedVessel.lengthMeters} meters</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10">
              <span className="text-slate-400 text-[10px] block">Beam & Draft</span>
              <span className="font-extrabold text-white text-sm">
                {selectedVessel.beamMeters}m / {selectedVessel.draftMeters}m
              </span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10">
              <span className="text-slate-400 text-[10px] block">Deadweight (DWT)</span>
              <span className="font-extrabold text-white text-sm">
                {selectedVessel.dwtTons.toLocaleString()} tons
              </span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10">
              <span className="text-slate-400 text-[10px] block">Current Status</span>
              <span className="font-extrabold text-emerald-400 text-sm">{selectedVessel.status}</span>
            </div>
          </div>

          {/* Cargo Manifest & Master Specs */}
          <div className="space-y-3 text-xs mb-6 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
            <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
              Vessel Operations & Cargo Manifest
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Commanding Captain</span>
                <span className="font-semibold text-white flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  {selectedVessel.captain}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Assigned Berth / Location</span>
                <span className="font-semibold text-amber-300 flex items-center gap-1.5 mt-0.5">
                  <Anchor className="w-3.5 h-3.5 text-amber-400" />
                  {selectedVessel.assignedBerth || 'Anchorage Area (Awaiting Pilot)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Cargo Classification</span>
                <span className="font-semibold text-white mt-0.5 block">{selectedVessel.cargoType}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Payload Tonnage</span>
                <span className="font-semibold text-emerald-300 mt-0.5 block">
                  {selectedVessel.cargoTonnage.toLocaleString()} TEU / Tons
                </span>
              </div>
            </div>

            {selectedVessel.hazardousCargo && (
              <div className="mt-2 bg-red-500/20 border border-red-500/30 p-2.5 rounded-xl flex items-center gap-2 text-red-300">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-semibold text-[11px]">
                  HAZMAT Alert: Vessel carrying dangerous goods (Class 3 / Class 8 Flammable/Corrosive)
                </span>
              </div>
            )}
          </div>

          {/* Route & Schedule Timeline */}
          <div className="flex items-center justify-between text-xs bg-slate-950/80 p-3 rounded-2xl border border-white/10 mb-6">
            <div>
              <span className="text-[10px] text-slate-400 block">Origin Port</span>
              <span className="font-bold text-white">{selectedVessel.originPort}</span>
            </div>
            <div className="text-amber-400 font-bold flex items-center gap-1">
              ETA {new Date(selectedVessel.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Destination Port</span>
              <span className="font-bold text-white">{selectedVessel.destinationPort}</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-[10px] text-slate-400">
              Priority: <strong className="text-amber-300">{selectedVessel.priority}</strong>
            </span>
            <button
              onClick={closeVesselModal}
              className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg"
            >
              Close Manifest
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
