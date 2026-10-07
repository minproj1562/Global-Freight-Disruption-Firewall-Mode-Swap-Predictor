import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Calendar, 
  Check, 
  Copy, 
  Filter,
  FileCheck2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay, subDays } from 'date-fns';
import { DecisionAuditEntry } from '@/types/executiveSummaryTypes';

interface Props {
  data: DecisionAuditEntry[];
}

export const DecisionAuditTrail: React.FC<Props> = ({ data }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePresetDate = (preset: 'all' | 'oct' | '7d') => {
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'oct') {
      setFromDate('2026-10-01');
      setToDate('2026-10-31');
    } else if (preset === '7d') {
      const today = new Date();
      setFromDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    }
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return data
      .filter((entry) => {
        const entryDate = parseISO(entry.timestamp);
        if (fromDate && isBefore(entryDate, startOfDay(parseISO(fromDate)))) return false;
        if (toDate && isAfter(entryDate, endOfDay(parseISO(toDate)))) return false;

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches =
            entry.user.toLowerCase().includes(q) ||
            entry.route.toLowerCase().includes(q) ||
            entry.rationale.toLowerCase().includes(q) ||
            entry.id.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data, fromDate, toDate, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-sm"
      aria-label="Decision Audit Trail Section"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Decision Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of mode-swap recommendations & predicted vs actual variances
          </p>
        </div>

        {/* Search, Presets & Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative min-w-[190px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, route, rationale..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          {/* Quick presets */}
          <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handlePresetDate('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                !fromDate && !toDate
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('oct')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                fromDate === '2026-10-01'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Oct 2026
            </button>
          </div>

          {/* From / To Date Pickers */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-hidden"
              title="From Date"
            />
            <span>–</span>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-hidden"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-stone-100 dark:border-slate-800/80">
        <table className="w-full text-left border-collapse text-xs" aria-label="Decision Audit Trail Table">
          <thead>
            <tr className="bg-stone-50/70 dark:bg-slate-800/40 border-b border-stone-200/60 dark:border-slate-800">
              <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Timestamp</th>
              <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Officer / User</th>
              <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Voyage Corridor</th>
              <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Options Evaluated</th>
              <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">Predicted vs Actual</th>
              <th className="px-3.5 py-2.5 uppercase tracking-wider text-slate-400 font-semibold text-[11px] text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
            {currentData.length > 0 ? (
              currentData.map((entry) => {
                const costDiff = entry.actualCostUSD - entry.predictedCostUSD;
                const isOver = costDiff > 0;
                const isExpanded = expandedId === entry.id;

                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => toggleRow(entry.id)}
                      className={`hover:bg-stone-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                        isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleRow(entry.id);
                        }
                      }}
                      aria-expanded={isExpanded}
                    >
                      <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{format(parseISO(entry.timestamp), 'dd MMM yyyy, HH:mm')}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(entry.id, e)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy Entry ID"
                          >
                            {copiedId === entry.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {entry.user}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={entry.route}>
                        {entry.route}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap">
                          {entry.alternativesConsidered.length} pathways
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-slate-400">
                            Pred: ${(entry.predictedCostUSD).toLocaleString()} · {entry.predictedTimeDays.toFixed(1)}d
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Act: ${(entry.actualCostUSD).toLocaleString()} · {entry.actualTimeDays.toFixed(1)}d
                            </span>
                            {costDiff !== 0 && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 ${
                                  isOver
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isOver ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                ${Math.abs(Math.round(costDiff / 1000))}k {isOver ? 'over' : 'saved'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        <ChevronDown className={`w-4 h-4 inline-block transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} />
                      </td>
                    </tr>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={6} className="px-4 py-4 bg-stone-50/80 dark:bg-slate-900/60 border-b border-stone-200 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-8">
                                <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                  Operator Rationale & Simulation Context
                                </h4>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-850 p-3 rounded-lg border border-stone-200/60 dark:border-slate-800">
                                  {entry.rationale}
                                </p>
                              </div>
                              <div className="md:col-span-4">
                                <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                  Evaluated Alternative Modes
                                </h4>
                                <div className="flex flex-col gap-1.5">
                                  {entry.alternativesConsidered.map((alt, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white dark:bg-slate-850 border border-stone-200/60 dark:border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between"
                                    >
                                      <span>{alt}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">Mode #{idx + 1}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                  No decision audit entries match your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} records
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-[11px]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
