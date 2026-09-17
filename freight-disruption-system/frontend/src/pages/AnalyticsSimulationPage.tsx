// frontend/src/pages/AnalyticsSimulationPage.tsx
// DASHBOARD 2: ANALYTICS & SIMULATION LAB
// Purpose: Deep strategic planning, model validation, business case building
// Pages: 2.1 Scenario Studio, 2.2 Monte Carlo Explorer, 2.3 Multi-Objective Optimizer (NSGA-II)
// Full Dark & Light Mode Theme Support

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Activity,
  Boxes,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { useToast } from '@/components/ui/use-toast';
import { ScenarioStudioPanel } from './simulation/ScenarioStudioPanel';
import { MonteCarloExplorerPanel } from './simulation/MonteCarloExplorerPanel';
import { NSGA2OptimizerPanel } from './simulation/NSGA2OptimizerPanel';

export type SimulationTab = 'scenario-studio' | 'monte-carlo' | 'nsga-optimizer';

export const AnalyticsSimulationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Read location state or query params for pre-filling context from Operations pages
  const navState = location.state as {
    vesselId?: string;
    vesselName?: string;
    originPort?: string;
    destinationPort?: string;
    disruptionTemplate?: string;
    tab?: SimulationTab;
  } | null;

  const initialTabFromUrl = (searchParams.get('tab') as SimulationTab) || navState?.tab || 'scenario-studio';
  const [activeTab, setActiveTab] = useState<SimulationTab>(initialTabFromUrl);

  const vesselId = searchParams.get('vesselId') || navState?.vesselId;
  const originPort = searchParams.get('origin') || navState?.originPort;
  const destinationPort = searchParams.get('destination') || navState?.destinationPort;

  // Sync activeTab with URL tab param
  useEffect(() => {
    const tabFromQuery = searchParams.get('tab') as SimulationTab;
    if (tabFromQuery && tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [searchParams]);

  // Show Toast if arrived with context pre-filled
  useEffect(() => {
    if (vesselId || navState?.vesselName || originPort) {
      toast({
        title: 'Context Loaded into Simulator',
        description: `Loaded parameters for ${navState?.vesselName || vesselId || 'Selected Cargo Vessel'}.`,
      });
    }
  }, []);

  const handleTabChange = (tab: SimulationTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('tab', tab);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-x-hidden transition-colors duration-300">
      <LogisticsManagerSidebar />

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION & BRANDING HEADER BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between ml-16 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/operations')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Operations Command</span>
          </button>

          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-md">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                  ANALYTICS & SIMULATION LAB
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  DASHBOARD 2 • ROUTE ANALYST
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
                STRATEGIC PLANNING • MODEL VALIDATION • NSGA-II PARETO OPTIMIZATION
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SUB-HEADER SEGMENTED TAB NAVIGATION (PAGES 2.1, 2.2, 2.3) */}
      {/* ========================================================================= */}
      <div className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 ml-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-1 bg-slate-200/70 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-800 w-full sm:w-auto font-mono text-xs">
            <button
              onClick={() => handleTabChange('scenario-studio')}
              className={`py-2 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'scenario-studio'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>2.1 Scenario Studio</span>
            </button>

            <button
              onClick={() => handleTabChange('monte-carlo')}
              className={`py-2 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'monte-carlo'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>2.2 Monte Carlo</span>
            </button>

            <button
              onClick={() => handleTabChange('nsga-optimizer')}
              className={`py-2 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'nsga-optimizer'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>2.3 NSGA-II 3D Scatter</span>
            </button>
          </div>

          {vesselId && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono text-amber-600 dark:text-amber-400 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Context: Vessel {vesselId}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TAB CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 ml-16">
        <AnimatePresence mode="wait">
          {activeTab === 'scenario-studio' && (
            <motion.div
              key="scenario-studio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ScenarioStudioPanel
                initialVesselId={vesselId || undefined}
                initialOrigin={originPort || undefined}
                initialDestination={destinationPort || undefined}
              />
            </motion.div>
          )}

          {activeTab === 'monte-carlo' && (
            <motion.div
              key="monte-carlo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MonteCarloExplorerPanel />
            </motion.div>
          )}

          {activeTab === 'nsga-optimizer' && (
            <motion.div
              key="nsga-optimizer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <NSGA2OptimizerPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
