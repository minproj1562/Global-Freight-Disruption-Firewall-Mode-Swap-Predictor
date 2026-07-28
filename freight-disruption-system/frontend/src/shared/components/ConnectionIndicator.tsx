import React from 'react';
import { RefreshCw, Radio } from 'lucide-react';
import { useConnection } from '../hooks/useConnection';

export const ConnectionIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { status, secondsToNextUpdate, lastSyncedSecondsAgo, triggerManualRefresh } = useConnection();

  const getStatusBadge = () => {
    switch (status) {
      case 'live':
        return {
          label: 'LIVE AIS STREAM',
          colorClass: 'bg-emerald-500',
          pulseClass: 'bg-emerald-400 animate-ping opacity-75',
          textClass: 'text-emerald-400',
        };
      case 'reconnecting':
        return {
          label: 'SYNCING...',
          colorClass: 'bg-amber-500',
          pulseClass: 'bg-amber-400 animate-ping opacity-75',
          textClass: 'text-amber-400',
        };
      case 'disconnected':
        return {
          label: 'OFFLINE',
          colorClass: 'bg-rose-500',
          pulseClass: 'bg-rose-400 animate-ping opacity-75',
          textClass: 'text-rose-400',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md bg-slate-900/70 border border-slate-700/60 shadow-lg text-slate-200 dark:bg-slate-950/80 ${className}`}
    >
      {/* Pulsing Status Dot */}
      <div className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className={`absolute inline-flex h-full w-full rounded-full ${badge.pulseClass}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${badge.colorClass}`} />
      </div>

      {/* Label */}
      <span className={`font-mono text-[11px] font-semibold tracking-wider ${badge.textClass}`}>
        {badge.label}
      </span>

      <div className="h-3.5 w-px bg-slate-700/80" />

      {/* Last Synced & Countdown */}
      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
        <Radio className="w-3 h-3 text-slate-400" />
        <span>Synced {lastSyncedSecondsAgo}s ago</span>
        <span className="text-slate-500">({secondsToNextUpdate}s)</span>
      </div>

      {/* Manual Refresh Button */}
      <button
        onClick={triggerManualRefresh}
        type="button"
        title="Trigger manual telemetry sync"
        aria-label="Manual refresh telemetry"
        className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors ml-1"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${status === 'reconnecting' ? 'animate-spin text-amber-400' : ''}`} />
      </button>
    </div>
  );
};
