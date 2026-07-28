import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, ShieldAlert, AlertTriangle, GitPullRequest, Clock } from 'lucide-react';
import { KPISnapshot } from '../../types';
import { useConnection } from '../../shared/hooks/useConnection';

interface KPIBarProps {
  kpis: KPISnapshot;
  className?: string;
}

export const KPIBar: React.FC<KPIBarProps> = ({ kpis, className = '' }) => {
  const { lastSyncedSecondsAgo } = useConnection();
  const [prevSnapshot, setPrevSnapshot] = useState<KPISnapshot>(kpis);
  const [flashStat, setFlashStat] = useState<string | null>(null);

  useEffect(() => {
    if (
      kpis.total_vessels !== prevSnapshot.total_vessels ||
      kpis.active_disruptions !== prevSnapshot.active_disruptions ||
      kpis.vessels_affected !== prevSnapshot.vessels_affected ||
      kpis.routes_needing_reroute !== prevSnapshot.routes_needing_reroute
    ) {
      setFlashStat('updated');
      setPrevSnapshot(kpis);
      const timer = setTimeout(() => setFlashStat(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [kpis, prevSnapshot]);

  const stats = [
    {
      id: 'total_vessels',
      label: 'TOTAL ACTIVE VESSELS',
      value: kpis.total_vessels,
      icon: Ship,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      id: 'active_disruptions',
      label: 'ACTIVE DISRUPTIONS',
      value: kpis.active_disruptions,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'vessels_affected',
      label: 'VESSELS AFFECTED',
      value: kpis.vessels_affected,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'routes_needing_reroute',
      label: 'MODE-SWAPS NEEDED',
      value: kpis.routes_needing_reroute,
      icon: GitPullRequest,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'last_updated',
      label: 'LAST TELEMETRY SYNC',
      value: `${lastSyncedSecondsAgo}s ago`,
      icon: Clock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      isTime: true,
    },
  ];

  return (
    <div
      aria-live="polite"
      className={`glass-panel rounded-2xl p-2.5 shadow-2xl overflow-x-auto scrollbar-none max-w-full ${className}`}
    >
      <div className="flex items-center gap-3 min-w-max">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isFlashing = flashStat === 'updated';

          return (
            <div
              key={stat.id}
              className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all duration-300 ${stat.bg} ${
                isFlashing ? 'ring-2 ring-amber-400/60 scale-[1.02]' : ''
              }`}
            >
              <div className={`p-2 rounded-lg bg-slate-900/80 ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-medium text-slate-400 tracking-wider">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={String(stat.value)}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className={`text-base font-bold font-mono tracking-tight text-white ${
                        stat.isTime ? 'text-xs font-sans text-slate-300' : ''
                      }`}
                    >
                      {stat.value}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
