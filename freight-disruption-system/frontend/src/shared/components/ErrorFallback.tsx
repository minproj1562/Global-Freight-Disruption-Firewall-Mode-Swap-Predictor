import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface ErrorFallbackProps {
  error: string;
  onRetry: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-500/10 border border-rose-500/30 rounded-2xl">
      <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 mb-3">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">Telemetry Stream Interrupted</h3>
      <p className="text-xs text-rose-300 max-w-md mb-4 font-mono">{error}</p>
      <button
        onClick={onRetry}
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-xl transition-all shadow-lg"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Retry Connection
      </button>
    </div>
  );
};
