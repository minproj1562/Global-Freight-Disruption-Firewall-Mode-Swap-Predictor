// frontend/src/components/simulation/SimulationSidebar.tsx
// Dedicated sidebar for the Simulation Lab with live corridor sync indicator and page tabs.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Sliders,
  Activity,
  TrendingUp,
  ArrowLeft,
  Menu,
  ChevronLeft,
  Anchor,
  Navigation,
  Ship,
} from 'lucide-react';
import { useSimulationContext } from '@/context/SimulationContext';
import type { SimulationTab } from '@/pages/AnalyticsSimulationPage';

interface SimulationSidebarProps {
  activeTab: SimulationTab;
  onTabChange: (tab: SimulationTab) => void;
}

export const SimulationSidebar: React.FC<SimulationSidebarProps> = ({ activeTab, onTabChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { selectedOrigin, selectedDestination, selectedVessel } = useSimulationContext();

  const originShort = selectedOrigin.match(/\(([^)]+)\)/)?.[1] || selectedOrigin.slice(0, 8);
  const destShort = selectedDestination.match(/\(([^)]+)\)/)?.[1] || selectedDestination.slice(0, 8);
  const vesselShort = selectedVessel.split('(')[0].trim().slice(0, 16);

  const navItems = [
    { id: 'scenario-studio' as SimulationTab, name: 'Scenario Studio', subtitle: 'Corridor & Disruption Sandbox', icon: Sliders, color: 'amber' },
    { id: 'monte-carlo' as SimulationTab, name: 'Monte Carlo Explorer', subtitle: 'Risk & Budget Contingency', icon: Activity, color: 'emerald' },
    { id: 'nsga-optimizer' as SimulationTab, name: 'Route Optimizer', subtitle: 'Cost vs Speed vs ESG', icon: TrendingUp, color: 'sky' },
  ];

  const sidebarVariants = {
    expanded: { width: '260px' },
    collapsed: { width: '64px' },
  };

  const colorMap: Record<string, { active: string; badge: string; icon: string }> = {
    amber: { active: 'bg-amber-500 text-slate-950', badge: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30', icon: 'text-amber-500' },
    emerald: { active: 'bg-emerald-500 text-slate-950', badge: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30', icon: 'text-emerald-500' },
    sky: { active: 'bg-sky-500 text-slate-950', badge: 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/30', icon: 'text-sky-500' },
  };

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={isExpanded ? 'expanded' : 'collapsed'}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 shadow-xl"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
              >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-sky-500/20 text-emerald-500">
                  <Cpu size={18} />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block leading-tight">
                    Simulation Lab
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Digital Twin Engine
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 ${!isExpanded ? 'mx-auto' : ''}`}
            title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Live Corridor Sync Card */}
        {isExpanded && (
          <div className="mx-3 mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active Corridor (Synced)
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Anchor className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">{originShort}</span>
                <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{destShort}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Ship className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{vesselShort}</span>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Page Tabs */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const colors = colorMap[item.color];

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? `${colors.active} shadow-md font-bold`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={item.name}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${isActive ? '' : colors.icon}`}
                />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="ml-3 overflow-hidden whitespace-nowrap text-left"
                    >
                      <span className="block text-xs font-bold leading-tight">{item.name}</span>
                      <span className={`block text-[9px] leading-tight ${isActive ? 'opacity-80' : 'text-slate-500 dark:text-slate-500'}`}>
                        {item.subtitle}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Return to Operations */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate('/dashboard/operations')}
            className={`w-full flex items-center px-3 py-2.5 rounded-2xl transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 ${!isExpanded ? 'justify-center' : ''}`}
            title="Return to Operations Command"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="ml-3 text-xs font-bold font-mono overflow-hidden whitespace-nowrap"
                >
                  Operations Command
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};
