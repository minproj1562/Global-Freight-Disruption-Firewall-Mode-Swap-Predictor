import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layers, Filter, Play, Eye, EyeOff, Ship, Anchor, AlertTriangle, Route as RouteIcon, Tag, Radio, X, CloudRain, Skull, Snowflake } from 'lucide-react';

export interface LayerVisibilityState {
  vessels: boolean;
  ports: boolean;
  disruptions: boolean;
  routes: boolean;
  vesselNames: boolean;
  secondaryInfra: boolean;
  weather?: boolean;
  piracy?: boolean;
  iceCoverage?: boolean;
}

interface MapToolbarProps {
  activeTab: 'none' | 'search' | 'layers' | 'filters' | 'replay';
  onTabChange: (tab: 'none' | 'search' | 'layers' | 'filters' | 'replay') => void;
  layers: LayerVisibilityState;
  onToggleLayer: (layerKey: keyof LayerVisibilityState) => void;
  className?: string;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  activeTab,
  onTabChange,
  layers,
  onToggleLayer,
  className = '',
}) => {
  const togglePanel = (tab: 'search' | 'layers' | 'filters' | 'replay') => {
    onTabChange(activeTab === tab ? 'none' : tab);
  };

  const layerItems: { key: keyof LayerVisibilityState; label: string; icon: any; color: string }[] = [
    { key: 'vessels', label: 'Vessels Fleet', icon: Ship, color: 'text-amber-400' },
    { key: 'ports', label: 'Port Terminals', icon: Anchor, color: 'text-sky-400' },
    { key: 'disruptions', label: 'Disruption Zones', icon: AlertTriangle, color: 'text-rose-400' },
    { key: 'routes', label: 'Transit Routes', icon: RouteIcon, color: 'text-indigo-400' },
    { key: 'vesselNames', label: 'Vessel Call Names', icon: Tag, color: 'text-emerald-400' },
    { key: 'secondaryInfra', label: 'Lighthouses & AtoN', icon: Radio, color: 'text-purple-400' },
    { key: 'weather', label: 'Weather (Storms/Waves)', icon: CloudRain, color: 'text-cyan-400' },
    { key: 'piracy', label: 'Piracy High-Risk Zones', icon: Skull, color: 'text-orange-400' },
    { key: 'iceCoverage', label: 'Ice Coverage Overlay', icon: Snowflake, color: 'text-blue-300' },
  ];

  return (
    <div className={`relative flex flex-col items-start gap-2 ${className}`}>
      {/* Expanded Layers Panel */}
      <AnimatePresence>
        {activeTab === 'layers' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="glass-panel rounded-2xl p-4 shadow-2xl border border-slate-700/80 w-64 text-slate-100 mb-1"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold font-mono text-white">MAP LAYERS</span>
              </div>
              <button
                onClick={() => onTabChange('none')}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {layerItems.map(({ key, label, icon: Icon, color }) => {
                const isActive = layers[key];

                return (
                  <button
                    key={key}
                    onClick={() => onToggleLayer(key)}
                    type="button"
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                      isActive
                        ? 'bg-slate-800/80 text-white border border-slate-700'
                        : 'bg-slate-950/40 text-slate-500 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span>{label}</span>
                    </div>
                    {isActive ? (
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar Buttons Strip */}
      <div className="flex items-center gap-2 p-1.5 glass-panel rounded-2xl border border-slate-700/80 shadow-2xl">
        {[
          { tab: 'search' as const, label: 'Search', icon: Search },
          { tab: 'layers' as const, label: 'Layers', icon: Layers },
          { tab: 'filters' as const, label: 'Filters', icon: Filter },
          { tab: 'replay' as const, label: 'Replay', icon: Play },
        ].map(({ tab, label, icon: Icon }) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => togglePanel(tab)}
              type="button"
              title={`Toggle ${label} Panel`}
              aria-label={`Toggle ${label} Panel`}
              className={`relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold scale-105'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800/80 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
