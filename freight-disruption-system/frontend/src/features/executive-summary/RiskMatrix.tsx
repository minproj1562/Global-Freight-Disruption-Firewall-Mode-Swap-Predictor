import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
  TooltipProps
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/shared/hooks/useTheme';
import { RiskMatrixEntry } from '@/types/executiveSummaryTypes';
import { 
  Filter, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  ShieldAlert, 
  Sparkles,
  Compass
} from 'lucide-react';

interface Props {
  data: RiskMatrixEntry[];
  onTriggerSimulation?: (disruptionName: string) => void;
}

const severityColors = {
  low: '#10B981',
  medium: '#FBBF24',
  high: '#F97316',
  critical: '#EF4444'
};

export const RiskMatrix: React.FC<Props> = ({ data, onTriggerSimulation }) => {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [inspectedEntry, setInspectedEntry] = useState<RiskMatrixEntry | null>(null);

  const categories = useMemo(() => {
    const set = new Set(data.map(d => d.category));
    return ['All', ...Array.from(set)];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (selectedCategory !== 'All' && d.category !== selectedCategory) return false;
      if (selectedSeverity !== 'All' && d.severity !== selectedSeverity) return false;
      return true;
    });
  }, [data, selectedCategory, selectedSeverity]);

  const bgColors = useMemo(() => {
    const isDark = theme === 'dark';
    return {
      low: isDark ? '#10B9810a' : '#10B98108',
      medium: isDark ? '#FBBF240a' : '#FBBF2408',
      high: isDark ? '#EF444414' : '#EF44440c',
      grid: isDark ? '#334155' : '#f1f5f9',
      text: isDark ? '#94a3b8' : '#64748b'
    };
  }, [theme]);

  const handleBubbleClick = (entry: any) => {
    if (entry && entry.payload) {
      setInspectedEntry(entry.payload as RiskMatrixEntry);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 relative shadow-sm"
    >
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Risk Matrix (Likelihood vs Impact)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Bubble size reflects financial exposure · Click any bubble to inspect incident triage
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown/Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0 text-xs">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'bg-stone-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Severity quick toggles */}
          <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs">
            {['All', 'critical', 'high'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-0.5 rounded-md font-medium capitalize transition-all ${
                  selectedSeverity === sev
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Scatter Chart Area */}
        <div className={`${inspectedEntry ? 'lg:col-span-8' : 'lg:col-span-12'} w-full h-[360px] relative transition-all`} aria-label="Risk Matrix Chart">
          {/* Quadrant Zone Labels */}
          <div className="absolute top-2 left-10 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider z-10 pointer-events-none bg-amber-500/10 px-1.5 py-0.5 rounded">
            Zone II: High Impact (Triage)
          </div>
          <div className="absolute top-2 right-4 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider z-10 pointer-events-none bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/20">
            Zone I: Catastrophic Hazards
          </div>
          <div className="absolute bottom-8 left-10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider z-10 pointer-events-none bg-emerald-500/10 px-1.5 py-0.5 rounded">
            Zone IV: Low Severity
          </div>
          <div className="absolute bottom-8 right-4 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider z-10 pointer-events-none bg-amber-500/10 px-1.5 py-0.5 rounded">
            Zone III: Frequent Minor
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={bgColors.grid} />
              
              {/* Quadrant Background Shading */}
              <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill={bgColors.low} />
              <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill={bgColors.medium} />
              <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill={bgColors.medium} />
              <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill={bgColors.high} />

              <XAxis
                type="number"
                dataKey="likelihood"
                name="Likelihood"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                label={{ value: 'Likelihood (%) →', position: 'bottom', fill: bgColors.text, fontSize: 11, dy: 8 }}
                stroke={bgColors.grid}
                tick={{ fill: bgColors.text, fontSize: 10 }}
              />
              
              <YAxis
                type="number"
                dataKey="impact"
                name="Impact"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                label={{ value: '← Severity Impact (%)', angle: -90, position: 'insideLeft', fill: bgColors.text, fontSize: 11, dx: 15 }}
                stroke={bgColors.grid}
                tick={{ fill: bgColors.text, fontSize: 10 }}
              />
              
              <ZAxis
                type="number"
                dataKey="financialExposure"
                range={[70, 480]}
                name="Financial Exposure"
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              <Scatter 
                name="Risks" 
                data={filteredData}
                onClick={handleBubbleClick}
                className="cursor-pointer"
              >
                {filteredData.map((entry) => {
                  const isSelected = inspectedEntry?.id === entry.id;
                  return (
                    <Cell
                      key={entry.id}
                      fill={severityColors[entry.severity]}
                      fillOpacity={isSelected ? 0.95 : 0.72}
                      stroke={isSelected ? '#ffffff' : severityColors[entry.severity]}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Bubble Inspector Side Drawer */}
        <AnimatePresence>
          {inspectedEntry && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-850/80 border border-stone-200 dark:border-slate-800 shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: severityColors[inspectedEntry.severity] }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                      {inspectedEntry.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedEntry(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                    title="Close Inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 leading-snug">
                  {inspectedEntry.name}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Exposure</span>
                    <span className="text-sm font-mono font-bold text-rose-500">
                      ${(inspectedEntry.financialExposure / 1000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Severity</span>
                    <span className="text-xs font-semibold capitalize" style={{ color: severityColors[inspectedEntry.severity] }}>
                      {inspectedEntry.severity} Risk
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Likelihood</span>
                    <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                      {inspectedEntry.likelihood}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Impact</span>
                    <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                      {inspectedEntry.impact}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onTriggerSimulation ? onTriggerSimulation(inspectedEntry.name) : alert(`Simulating mitigation plan for ${inspectedEntry.name}`)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Simulate Mode-Swap Bypass
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Summary Strip */}
      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Critical: {data.filter(d => d.severity === 'critical').length}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            High: {data.filter(d => d.severity === 'high').length}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Medium: {data.filter(d => d.severity === 'medium').length}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Low: {data.filter(d => d.severity === 'low').length}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Total Exposure in Scatter: ${((data.reduce((a, c) => a + c.financialExposure, 0)) / 1000000).toFixed(1)}M USD
        </span>
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as RiskMatrixEntry;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-slate-50 p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs w-60 z-50">
        <div className="font-semibold text-sm mb-1.5 text-white leading-tight">{data.name}</div>
        <div className="space-y-1 font-mono">
          <div className="flex justify-between font-sans text-slate-400">
            <span>Category:</span>
            <span className="text-slate-200">{data.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Likelihood:</span>
            <span className="text-slate-200 font-bold">{data.likelihood}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Impact:</span>
            <span className="text-slate-200 font-bold">{data.impact}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Exposure:</span>
            <span className="font-bold text-rose-400">${(data.financialExposure / 1000000).toFixed(2)}M</span>
          </div>
          <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-sans">
            <span className="text-[10px] text-indigo-300">Click bubble to inspect</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
              style={{
                backgroundColor: `${severityColors[data.severity]}25`,
                color: severityColors[data.severity]
              }}
            >
              {data.severity}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
