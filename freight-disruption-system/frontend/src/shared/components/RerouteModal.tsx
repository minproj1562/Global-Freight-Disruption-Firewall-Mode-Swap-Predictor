// Mode-Swap Reroute Plan Execution Modal
// FASTAPI REPLACEMENT POINT: Connect "Execute Reroute Plan" to POST /api/v1/reroutes/execute

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plane, Train, Truck, ArrowRight, ShieldCheck, DollarSign, Clock, Leaf, CheckCircle2, Loader2 } from 'lucide-react';
import { ModeSwapOption, Vessel } from '../../types';
import { useToast } from '../../components/ui/use-toast';

interface RerouteModalProps {
  vessel: Vessel;
  option?: ModeSwapOption;
  route?: any;
  onClose: () => void;
}

const DEFAULT_OPTION: ModeSwapOption = {
  id: 'opt-default',
  mode: 'Sea -> Rail',
  estimated_time_saving_days: 4,
  estimated_cost_delta_usd: 12000,
  co2_impact_percent: -15,
  feasibility_score: 92,
  recommended_carrier: 'Intermodal Rail Transit',
  hub_port_code: 'RTM-RAIL',
  transit_summary: 'Shift container freight to express rail corridor around bottleneck.'
};

export const RerouteModal: React.FC<RerouteModalProps> = ({ vessel, option = DEFAULT_OPTION, onClose }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const { toast } = useToast();

  const getModeIcon = () => {
    switch (option.mode) {
      case 'Sea -> Air':
        return Plane;
      case 'Sea -> Rail':
        return Train;
      case 'Sea -> Road (Truck)':
        return Truck;
      default:
        return Plane;
    }
  };

  const ModeIcon = getModeIcon();

  const handleExecute = async () => {
    setIsExecuting(true);
    // Simulate FastAPI backend dispatch call
    await new Promise((res) => setTimeout(res, 1400));
    setIsExecuting(false);
    setIsExecuted(true);

    toast({
      title: "Mode-Swap Order Dispatched",
      description: `Reroute plan for ${vessel.name} issued to ${option.recommended_carrier}.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl relative text-slate-100 overflow-hidden"
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close mode-swap modal"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isExecuted ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ModeIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                  AI MODE-SWAP PREDICTOR
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {option.mode} Reroute Strategy
                </h2>
              </div>
            </div>

            {/* Target Vessel & Route Header */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 font-mono">TARGET VESSEL</span>
                <p className="text-sm font-bold text-white font-mono">{vessel.name}</p>
                <p className="text-xs text-slate-400">IMO {vessel.imo} • {vessel.vessel_type}</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  {vessel.destination_port}
                </span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  {option.hub_port_code} Hub
                </span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Time Saved</span>
                </div>
                <p className="text-lg font-bold font-mono text-emerald-400">
                  -{option.estimated_time_saving_days} Days
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Est. Cost Delta</span>
                </div>
                <p className="text-lg font-bold font-mono text-amber-400">
                  +${(option.estimated_cost_delta_usd / 1000).toFixed(0)}k
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Leaf className="w-3.5 h-3.5 text-sky-400" />
                  <span>CO₂ Impact</span>
                </div>
                <p className="text-lg font-bold font-mono text-sky-400">
                  {option.co2_impact_percent > 0 ? `+${option.co2_impact_percent}%` : `${option.co2_impact_percent}%`}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Feasibility</span>
                </div>
                <p className="text-lg font-bold font-mono text-indigo-400">
                  {option.feasibility_score}%
                </p>
              </div>
            </div>

            {/* Carrier & Summary */}
            <div className="space-y-3 mb-6 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-slate-400 font-mono">RECOMMENDED CARRIER / NETWORK:</span>
                <p className="text-sm font-semibold text-white mt-0.5">{option.recommended_carrier}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-slate-400 font-mono">INTERMODAL EXECUTION SUMMARY:</span>
                <p className="text-slate-300 leading-relaxed mt-1">{option.transit_summary}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                type="button"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                type="button"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    Dispatching Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Authorize Mode-Swap Execution
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Success Dispatch Confirmation */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Mode-Swap Plan Dispatched</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
              Operational manifest updated. Intermodal bookings issued to <strong className="text-amber-400">{option.recommended_carrier}</strong> via {option.hub_port_code}.
            </p>
            <button
              onClick={onClose}
              type="button"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg transition-colors"
            >
              Return to Live Map
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
