import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { HighRiskDisruption, MitigationStatus } from '@/types/executiveSummaryTypes';

interface Props {
  data: HighRiskDisruption[];
  onTriageDisruption?: (id: string) => void;
}

const severityColors = {
  low: '#10B981',
  medium: '#FBBF24',
  high: '#F97316',
  critical: '#EF4444'
};

const badgeStyles: Record<MitigationStatus, string> = {
  Unmitigated: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  Monitoring: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Mitigating: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  Mitigated: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
};

export const HighRiskTable: React.FC<Props> = ({ data, onTriageDisruption }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [triagedItems, setTriagedItems] = useState<Record<string, MitigationStatus>>({});

  const maxExposure = useMemo(() => {
    return Math.max(...data.map(d => d.financialExposure), 1);
  }, [data]);

  const filteredData = useMemo(() => {
    return data
      .map(item => ({
        ...item,
        mitigationStatus: triagedItems[item.id] || item.mitigationStatus
      }))
      .filter(item => {
        const matchesSearch = 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.region.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || item.mitigationStatus === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.financialExposure - a.financialExposure);
  }, [data, searchQuery, statusFilter, triagedItems]);

  const handleQuickMitigate = (id: string, current: MitigationStatus) => {
    const nextStatus: MitigationStatus = 
      current === 'Unmitigated' ? 'Mitigating' :
      current === 'Mitigating' ? 'Mitigated' : 'Monitoring';
    
    setTriagedItems(prev => ({
      ...prev,
      [id]: nextStatus
    }));

    if (onTriageDisruption) onTriageDisruption(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-sm"
      aria-label="Highest risk disruptions table"
    >
      {/* Top Header & Search/Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Top 5 Highest-Risk Disruptions
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ranked by direct financial cargo exposure · Real-time mitigation status tracking
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter disruption..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs">
            {['All', 'Unmitigated', 'Mitigating'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-slate-400 text-xs gap-2">
          <ShieldAlert className="w-8 h-8 opacity-40 text-slate-400" />
          <p>No disruptions match your search criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-100 dark:border-slate-800/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/70 dark:bg-slate-800/40 border-b border-stone-200/60 dark:border-slate-800">
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Rank</th>
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Disruption Incident</th>
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Financial Exposure</th>
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Region</th>
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Routes Affected</th>
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Mitigation Status</th>
                <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px] text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
              {filteredData.slice(0, 5).map((item, index) => {
                const exposureRatio = (item.financialExposure / maxExposure) * 100;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-stone-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-400">
                      #{index + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: severityColors[item.severity] }}
                        />
                        <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ${(item.financialExposure / 1000000).toFixed(2)}M
                        </span>
                        {/* Micro Exposure Visual Meter */}
                        <div className="w-full h-1 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-rose-500 rounded-full" 
                            style={{ width: `${exposureRatio}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                      {item.region}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.affectedRoutes} vessels
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyles[item.mitigationStatus]}`}>
                        {item.mitigationStatus}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleQuickMitigate(item.id, item.mitigationStatus)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-stone-200/60 dark:border-slate-700 transition-all"
                        title="Click to cycle mitigation status"
                      >
                        Advance Triage
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
