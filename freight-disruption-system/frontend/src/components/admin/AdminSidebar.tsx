// frontend/src/components/admin/AdminSidebar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  Ship, 
  LogOut, 
  Menu, 
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export interface AdminSidebarProps {
  activeTab: '4.1' | '4.2' | '4.3';
  onSelectTab: (tab: '4.1' | '4.2' | '4.3') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onSelectTab }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore(); 

  const navItems: Array<{ id: '4.1' | '4.2' | '4.3'; name: string; icon: React.ElementType }> = [
    { id: '4.1', name: '4.1 System Health', icon: Activity },
    { id: '4.2', name: '4.2 Disruptions', icon: AlertTriangle },
    { id: '4.3', name: '4.3 Vessel Fleet', icon: Ship },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth/admin');
  };

  const sidebarVariants = {
    expanded: { width: '240px' },
    collapsed: { width: '64px' }
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
            className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[2px] transition-all"
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
        <div className="p-4 flex items-center justify-between">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
              >
                <div className="p-1 rounded-lg bg-purple-500/20 text-purple-500">
                  <ShieldCheck size={18} />
                </div>
                <span className="font-bold text-base text-slate-900 dark:text-white">
                  Admin Command
                </span>
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
                className={`w-full flex items-center px-3 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                } ${!isExpanded ? 'justify-center' : ''}`}
              >
                <div className="flex-shrink-0">
                  <Icon size={20} className={isActive ? 'text-purple-600 dark:text-purple-400' : ''} />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="ml-3 font-mono text-xs whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`flex items-center mb-4 px-2 ${!isExpanded ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-md shadow-purple-600/20">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="ml-3 overflow-hidden whitespace-nowrap"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {user?.name || user?.username || 'Administrator'}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                    System Administrator
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-3 rounded-2xl transition-all duration-200 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 group ${!isExpanded ? 'justify-center' : ''}`}
            title="Log Out of Admin Dashboard"
          >
            <div className="flex-shrink-0">
              <LogOut size={20} />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="ml-3 font-mono text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  LOG OUT
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};
