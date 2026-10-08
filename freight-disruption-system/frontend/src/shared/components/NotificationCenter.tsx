// frontend/src/shared/components/NotificationCenter.tsx
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, AlertTriangle, Info } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

interface NotificationCenterProps {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
}

const SEVERITY_STYLE: Record<string, string> = {
  HIGH: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  MEDIUM: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  LOW: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  INFO: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300',
};

/**
 * A bell icon with a badge count. Clicking it opens a dropdown list of
 * active alerts. Every alert has its own "X" so a manager can clear it
 * individually without having to deal with every warning on the page at once.
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({ items, onDismiss }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const highPriorityCount = items.filter((i) => i.severity === 'HIGH').length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="View alerts"
        className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {items.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[19px] h-[19px] px-1 rounded-full text-[11px] font-bold text-white ${
              highPriorityCount > 0 ? 'bg-rose-500' : 'bg-amber-500'
            }`}
          >
            {items.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50"
          >
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <span className="font-bold text-base text-slate-900 dark:text-white">Alerts</span>
              <span className="text-sm text-slate-400 font-medium">{items.length} active</span>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Nothing needs your attention right now.
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`relative p-3 pr-9 rounded-xl border text-sm ${SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.INFO}`}
                    >
                      <div className="flex items-start gap-2">
                        {item.severity === 'HIGH' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold leading-snug">{item.title}</p>
                          <p className="text-xs opacity-80 mt-0.5 leading-snug">{item.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDismiss(item.id)}
                        aria-label="Dismiss alert"
                        className="absolute top-2.5 right-2.5 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};