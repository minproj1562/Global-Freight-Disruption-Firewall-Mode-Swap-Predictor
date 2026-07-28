import React from 'react';
import { motion } from 'framer-motion';
import { VesselType } from '../../types';

interface VesselTypeFiltersProps {
  selectedTypes: VesselType[];
  onToggleType: (type: VesselType) => void;
  className?: string;
}

const ALL_TYPES: { type: VesselType; label: string; icon: string }[] = [
  { type: 'Container', label: 'Containers', icon: '📦' },
  { type: 'Tanker', label: 'Tankers', icon: '🛢️' },
  { type: 'Bulk Carrier', label: 'Bulk Carriers', icon: '🪨' },
  { type: 'Cargo', label: 'General Cargo', icon: '🚢' },
  { type: 'Special', label: 'Special / Tug', icon: '⚓' },
];

export const VesselTypeFilters: React.FC<VesselTypeFiltersProps> = ({
  selectedTypes,
  onToggleType,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 p-1.5 glass-panel rounded-2xl border border-slate-700/80 ${className}`}>
      <span className="text-[10px] font-mono font-bold text-slate-400 px-2 tracking-wider uppercase">
        FILTER FLEET:
      </span>
      {ALL_TYPES.map(({ type, label, icon }) => {
        const isSelected = selectedTypes.includes(type);

        return (
          <button
            key={type}
            onClick={() => onToggleType(type)}
            type="button"
            className={`relative py-1.5 px-3 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              isSelected
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold scale-[1.02]'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
