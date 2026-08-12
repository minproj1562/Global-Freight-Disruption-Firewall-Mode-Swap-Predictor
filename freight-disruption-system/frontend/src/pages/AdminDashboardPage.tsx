// frontend/src/pages/AdminDashboardPage.tsx
// DASHBOARD 3: ADMIN DASHBOARD
// For: System Administrator | Purpose: Manage data, users, system health
// Sub-pages: Page 4.1 System Health | Page 4.2 Disruptions | Page 4.3 Vessel Fleet | Page 4.4 User Management | Page 4.5 Data Management

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Activity,
  AlertTriangle,
  Ship,
  ShieldCheck,
  Users,
  Database,
} from 'lucide-react';
import { SystemHealthMonitor } from '@/features/admin/SystemHealthMonitor';
import { DisruptionManagement } from '@/features/admin/DisruptionManagement';
import { VesselManagement } from '@/features/admin/VesselManagement';
import { UserManagement } from '@/features/admin/UserManagement';
import { DataManagement } from '@/features/admin/DataManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

export const AdminDashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab') as '4.1' | '4.2' | '4.3' | '4.4' | '4.5' | null;

  // Sub-page state: '4.1' | '4.2' | '4.3' | '4.4' | '4.5'
  const [activeTab, setActiveTab] = useState<'4.1' | '4.2' | '4.3' | '4.4' | '4.5'>(
    initialTabParam || '4.1'
  );

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
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>DASHBOARD 3: ADMIN DASHBOARD • SYSTEM ADMINISTRATOR</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              System Administration & Data Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Manage system users & RBAC roles, ingest manual dataset CSVs, monitor database stats, run data cleanups, and track vessel fleet telemetry.
            </p>
          </div>

          {/* SUB-NAVIGATION TABS (4.1, 4.2, 4.3, 4.4, 4.5) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('4.1')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.1'
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>4.1 Health</span>
            </button>

            <button
              onClick={() => setActiveTab('4.2')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
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
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.3'
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Ship className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>4.3 Vessels</span>
            </button>

            <button
              onClick={() => setActiveTab('4.4')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.4'
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>4.4 Users</span>
            </button>

            <button
              onClick={() => setActiveTab('4.5')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === '4.5'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>4.5 Data Mgmt</span>
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

          {activeTab === '4.4' && (
            <motion.div
              key="4.4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UserManagement />
            </motion.div>
          )}

          {activeTab === '4.5' && (
            <motion.div
              key="4.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DataManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

