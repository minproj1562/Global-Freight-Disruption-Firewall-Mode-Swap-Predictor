// frontend/src/components/admin/AdminSidebar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Ship,
  Users,
  Database,
  LogOut,
  Menu,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export interface AdminSidebarProps {
  activeTab: '4.1' | '4.2' | '4.3' | '4.4' | '4.5';
  onSelectTab: (tab: '4.1' | '4.2' | '4.3' | '4.4' | '4.5') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onSelectTab }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems: Array<{ id: '4.1' | '4.2' | '4.3' | '4.4' | '4.5'; name: string; icon: React.ElementType }> = [
    { id: '4.1', name: 'System Health', icon: Activity },
    { id: '4.2', name: 'Disruptions', icon: AlertTriangle },
    { id: '4.3', name: 'Vessel Fleet', icon: Ship },
    { id: '4.4', name: 'User Management', icon: Users },
    { id: '4.5', name: 'Data Management', icon: Database },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth/admin');
  };

  const sidebarVariants = {
    expanded: { width: '240px' },
    collapsed: { width: '64px' },
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
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
      >
        {/* LOGO / COLLAPSE TOGGLE */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
              >
                <div className="w-7 h-7 rounded-md bg-violet-600 text-white flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Admin Panel
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${!isExpanded ? 'mx-auto' : ''}`}
            title={isExpanded ? 'Collapse menu' : 'Expand menu'}
          >
            {isExpanded ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* NAV ITEMS */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (window.innerWidth < 768) setIsExpanded(false);
                }}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
                } ${!isExpanded ? 'justify-center' : ''}`}
              >
                <Icon size={19} className="flex-shrink-0" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* USER + LOGOUT */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`flex items-center mb-3 px-1 ${!isExpanded ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-3 overflow-hidden whitespace-nowrap"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {user?.name || user?.username || 'Administrator'}
                  </p>
                  <p className="text-xs text-slate-400">System Administrator</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors ${!isExpanded ? 'justify-center' : ''}`}
            title="Log out"
          >
            <LogOut size={19} className="flex-shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Log Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};