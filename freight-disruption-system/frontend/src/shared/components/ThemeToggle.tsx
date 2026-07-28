import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
        isDark
          ? 'bg-slate-800/80 text-amber-400 hover:bg-slate-700/80 border border-slate-700/60 shadow-md'
          : 'bg-white/90 text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-md'
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          {isDark ? <Sun className="w-5 h-5 fill-amber-400/20" /> : <Moon className="w-5 h-5 fill-slate-700/20" />}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};
