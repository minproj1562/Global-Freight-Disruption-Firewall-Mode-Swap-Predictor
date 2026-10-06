// frontend/src/pages/AdminDashboardPage.tsx
// DASHBOARD 3: ADMIN DASHBOARD
// For: System Administrator | Purpose: Manage data, users, system health
// Sub-pages: 4.1 System Health | 4.2 Disruptions | 4.3 Vessel Fleet | 4.4 User Management | 4.5 Data Management

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Ship,
  Users,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { SystemHealthMonitor } from '@/features/admin/SystemHealthMonitor';
import { DisruptionManagement } from '@/features/admin/DisruptionManagement';
import { VesselManagement } from '@/features/admin/VesselManagement';
import { UserManagement } from '@/features/admin/UserManagement';
import { DataManagement } from '@/features/admin/DataManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

type AdminTab = '4.1' | '4.2' | '4.3' | '4.4' | '4.5';

const TABS: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: '4.1', label: 'System Health', icon: Activity },
  { id: '4.2', label: 'Disruptions', icon: AlertTriangle },
  { id: '4.3', label: 'Vessel Fleet', icon: Ship },
  { id: '4.4', label: 'User Management', icon: Users },
  { id: '4.5', label: 'Data Management', icon: Database },
];

export const AdminDashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab') as AdminTab | null;
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTabParam || '4.1');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans flex flex-col transition-colors duration-300">
      <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-6 lg:px-10 py-4 flex items-center justify-between ml-16">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-sm shadow-violet-600/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
              Admin Control Center
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
              Freight Disruption System
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8 space-y-6 ml-16">

        {/* PAGE HEADER */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Administration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Manage user accounts and permissions, upload or clean up datasets, monitor
            database health, and keep track of the vessel fleet and active disruptions.
          </p>

          {/* SEGMENTED TAB SWITCHER */}
          <div className="mt-5 flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE SECTION */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === '4.1' && <SystemHealthMonitor />}
            {activeTab === '4.2' && <DisruptionManagement />}
            {activeTab === '4.3' && <VesselManagement />}
            {activeTab === '4.4' && <UserManagement />}
            {activeTab === '4.5' && <DataManagement />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};