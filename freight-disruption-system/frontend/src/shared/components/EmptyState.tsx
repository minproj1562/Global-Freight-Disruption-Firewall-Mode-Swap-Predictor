import React from 'react';
import { SearchX, FilterX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'search' | 'filter';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  type = 'search',
}) => {
  const Icon = type === 'search' ? SearchX : FilterX;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
      <div className="p-3.5 rounded-full bg-slate-800/80 text-amber-400 mb-3 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
