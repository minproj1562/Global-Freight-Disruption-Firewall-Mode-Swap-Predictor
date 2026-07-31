// frontend/src/pages/AdminDashboardPage.tsx
// DASHBOARD 3: ADMIN DASHBOARD
// For: System Administrator | Purpose: Manage data, users, system health
// Sub-pages: Page 4.1 — System Health Monitor | Page 4.2 — Disruption Management | Page 4.3 — Vessel Management

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Activity,
  AlertTriangle,
  Ship,
  ShieldCheck,
} from 'lucide-react';
import { SystemHealthMonitor } from '@/features/admin/SystemHealthMonitor';
import { DisruptionManagement } from '@/features/admin/DisruptionManagement';
import { VesselManagement } from '@/features/admin/VesselManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

export const AdminDashboardPage: React.FC = () => {
  // Sub-page state: '4.1' | '4.2' | '4.3'
  const [activeTab, setActiveTab] = useState<'4.1' | '4.2' | '4.3'>('4.1');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* ======== TOP NAVIGATION BAR ======== */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between ml-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-wide block">FREIGHT FIREWALL</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">SYSTEM ADMINISTRATOR CONTROL CENTER</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* ======== MAIN CONTENT AREA ======== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-6 ml-16">

        {/* DASHBOARD HEADER & SUB-PAGE SWITCHER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>DASHBOARD 3: ADMIN DASHBOARD • SYSTEM ADMINISTRATOR</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              System Administration & Control Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Purpose: Manage data, users, system health, live disruptions, and 50 pre-seeded maritime vessel telemetry streams.
            </p>
          </div>

          {/* SUB-NAVIGATION TABS (4.1, 4.2, 4.3) */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('4.1')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.1'
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>4.1 System Health</span>
            </button>

            <button
              onClick={() => setActiveTab('4.2')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.2'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>4.2 Disruptions</span>
            </button>

            <button
              onClick={() => setActiveTab('4.3')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.3'
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Ship className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>4.3 Vessel Fleet</span>
            </button>
          </div>
        </div>

        {/* ACTIVE SUB-PAGE RENDER */}
        <AnimatePresence mode="wait">
          {activeTab === '4.1' && (
            <motion.div
              key="4.1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SystemHealthMonitor />
            </motion.div>
          )}

          {activeTab === '4.2' && (
            <motion.div
              key="4.2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DisruptionManagement />
            </motion.div>
          )}

          {activeTab === '4.3' && (
            <motion.div
              key="4.3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <VesselManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
