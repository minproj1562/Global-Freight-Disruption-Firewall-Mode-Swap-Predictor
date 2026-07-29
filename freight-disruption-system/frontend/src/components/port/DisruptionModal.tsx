// src/components/port/DisruptionModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortStore } from '../../store/portStore';
import { useToast } from '../ui/use-toast';
import { AlertTriangle, X, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export const DisruptionModal: React.FC = () => {
  const { isDisruptionModalOpen, closeDisruptionModal, getSelectedPort, flagPortDisrupted } =
    usePortStore();
  const { toast } = useToast();

  const currentPort = getSelectedPort();

  const [formData, setFormData] = useState({
    title: '',
    type: 'weather' as 'weather' | 'strike' | 'equipment' | 'channel_block' | 'cyber',
    severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
    description: '',
    mitigationPlan: '',
    impactScore: 80,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isDisruptionModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      flagPortDisrupted(currentPort.id, {
        title: formData.title || 'Port Operational Disruption Flagged',
        type: formData.type,
        severity: formData.severity,
        description: formData.description || 'Declared manual disruption by Port Manager.',
        mitigationPlan: formData.mitigationPlan,
        impactScore: Number(formData.impactScore),
      });

      setIsSubmitting(false);
      closeDisruptionModal();

      toast({
        title: '⚠️ Port Disruption Flagged & Broadcasted!',
        description: `Disruption status logged for ${currentPort.name}. Logistics firewall alerted.`,
      });
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Flag Port Disruption</h3>
                <p className="text-xs text-slate-400">Target: {currentPort.name}</p>
              </div>
            </div>
            <button
              onClick={closeDisruptionModal}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Disruption Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Crane Technicians Strike or Severe Storm Warning"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
              />
            </div>

            {/* Type & Severity Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full p-3 bg-slate-950 border border-white/15 rounded-xl text-white focus:outline-none focus:border-red-400"
                >
                  <option value="weather">Weather / Typhoon</option>
                  <option value="strike">Labor Strike / Dispute</option>
                  <option value="equipment">Gantry Crane Failure</option>
                  <option value="channel_block">Channel / Harbor Blockade</option>
                  <option value="cyber">IT / Cyber Outage</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Severity Level</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full p-3 bg-slate-950 border border-white/15 rounded-xl text-white focus:outline-none focus:border-red-400"
                >
                  <option value="low">Low (Minor Delay)</option>
                  <option value="medium">Medium (Moderate Delay)</option>
                  <option value="high">High (Severe Backlog)</option>
                  <option value="critical">Critical (Total Halt)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Detailed Impact Description
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe current operational status, affected berths, and expected impact on vessel turnaround..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
              />
            </div>

            {/* Mitigation Plan */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Mitigation / Contingency Action Plan
              </label>
              <input
                type="text"
                placeholder="e.g., Redirecting incoming feeder vessels to secondary berths"
                value={formData.mitigationPlan}
                onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDisruptionModal}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Flagging Disruption...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" /> Broadcast Port Disruption Flag
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
