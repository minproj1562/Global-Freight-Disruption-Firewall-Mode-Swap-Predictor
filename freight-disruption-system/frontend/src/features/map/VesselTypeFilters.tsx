import React from 'react';
import { VesselType, DisruptionStatus } from '../../types';

interface VesselTypeFiltersProps {
  selectedTypes: VesselType[];
  onToggleType: (type: VesselType) => void;
  selectedFlags?: string[];
  onToggleFlag?: (flag: string) => void;
  selectedRiskLevels?: DisruptionStatus[];
  onToggleRiskLevel?: (risk: DisruptionStatus) => void;
  className?: string;
}

const ALL_TYPES: { type: VesselType; label: string; icon: string }[] = [
  { type: 'Container', label: 'Containers', icon: '📦' },
  { type: 'Tanker', label: 'Tankers', icon: '🛢️' },
  { type: 'Bulk Carrier', label: 'Bulk Carriers', icon: '🪨' },
  { type: 'Cargo', label: 'General Cargo', icon: '🚢' },
  { type: 'Special', label: 'Special / Tug', icon: '⚓' },
];

const FLAG_OPTIONS = [
  { flag: 'Panama 🇵🇦', label: 'Panama 🇵🇦' },
  { flag: 'Liberia 🇱🇷', label: 'Liberia 🇱🇷' },
  { flag: 'Marshall Islands 🇲🇭', label: 'Marshall Is. 🇲🇭' },
  { flag: 'Singapore 🇸🇬', label: 'Singapore 🇸🇬' },
  { flag: 'Denmark 🇩🇰', label: 'Denmark 🇩🇰' },
];

const RISK_LEVELS: { status: DisruptionStatus; label: string; icon: string }[] = [
  { status: 'normal', label: 'Normal', icon: '✅' },
  { status: 'at-risk', label: 'At Risk', icon: '⚠️' },
  { status: 'disrupted', label: 'Disrupted', icon: '🚨' },
];

export const VesselTypeFilters: React.FC<VesselTypeFiltersProps> = ({
  selectedTypes,
  onToggleType,
  selectedFlags = [],
  onToggleFlag,
  selectedRiskLevels = [],
  onToggleRiskLevel,
  className = '',
}) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. Vessel Type Chips */}
      <div>
        <span className="text-[10px] font-mono font-bold text-amber-400 px-1 tracking-wider uppercase block mb-1.5">
          VESSEL TYPE:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {ALL_TYPES.map(({ type, label, icon }) => {
            const isSelected = selectedTypes.includes(type);

            return (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                type="button"
                className={`py-1 px-2.5 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold scale-[1.02]'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Flag Dimension Chips */}
      {onToggleFlag && (
        <div className="pt-2 border-t border-slate-800">
          <span className="text-[10px] font-mono font-bold text-amber-400 px-1 tracking-wider uppercase block mb-1.5">
            FLAG REGISTRY:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {FLAG_OPTIONS.map(({ flag, label }) => {
              const isSelected = selectedFlags.includes(flag);

              return (
                <button
                  key={flag}
                  onClick={() => onToggleFlag(flag)}
                  type="button"
                  className={`py-1 px-2.5 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold scale-[1.02]'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Risk Level Chips */}
      {onToggleRiskLevel && (
        <div className="pt-2 border-t border-slate-800">
          <span className="text-[10px] font-mono font-bold text-amber-400 px-1 tracking-wider uppercase block mb-1.5">
            RISK STATUS:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {RISK_LEVELS.map(({ status, label, icon }) => {
              const isSelected = selectedRiskLevels.includes(status);

              return (
                <button
                  key={status}
                  onClick={() => onToggleRiskLevel(status)}
                  type="button"
                  className={`py-1 px-2.5 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold scale-[1.02]'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
