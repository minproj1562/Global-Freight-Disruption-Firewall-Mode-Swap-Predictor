import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Anchor, 
  FileText,
  LogOut, 
  Menu, 
  ChevronLeft 
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export interface PortManagerSidebarProps {
  currentPortId?: string;
}

export const PortManagerSidebar: React.FC<PortManagerSidebarProps> = ({ currentPortId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore(); 

  const navItems = [
    { name: 'Port Overview', icon: Globe, route: '/dashboard/ports' },
    { name: 'Vessel Logs', icon: FileText, route: '/dashboard/vessel-logs' },
    { name: 'Port Detail', icon: Anchor, route: `/dashboard/ports/${currentPortId || 'port-rotterdam'}` },
  ];


  const handleLogout = () => {
    logout();
    navigate('/login');
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
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-lg text-slate-900 dark:text-white overflow-hidden whitespace-nowrap"
            >
              Port Manager
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 ${!isExpanded ? 'mx-auto' : ''}`}
        >
          {isExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          // Highlight active if exact match or if it's a prefix (e.g. /dashboard/ports/123)
          const isActive = location.pathname === item.route || 
            (item.route !== '/dashboard/ports' && location.pathname.startsWith(item.route));

          const Icon = item.icon;

          return (
            <Link
              key={item.route}
              to={item.route}
              className={`flex items-center px-3 py-3 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              } ${!isExpanded ? 'justify-center' : ''}`}
            >
              <div className="flex-shrink-0">
                <Icon size={20} className={isActive ? 'text-amber-500' : ''} />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="ml-3 font-mono text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className={`flex items-center mb-4 px-2 ${!isExpanded ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
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
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.portName || 'Port Officer'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center px-3 py-3 rounded-2xl transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 group ${!isExpanded ? 'justify-center' : ''}`}
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
