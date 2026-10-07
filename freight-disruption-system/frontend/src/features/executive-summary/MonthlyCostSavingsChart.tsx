import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MonthlySavingsPoint } from '@/types/executiveSummaryTypes';
import { useTheme } from '@/shared/hooks/useTheme';
import { TrendingUp, Layers } from 'lucide-react';

interface MonthlyCostSavingsChartProps {
  data: MonthlySavingsPoint[];
}

export const MonthlyCostSavingsChart: React.FC<MonthlyCostSavingsChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'gross' | 'net'>('net');

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      netSavings: d.savings - d.rerouteCost,
    }));
  }, [data]);

  const peakMonth = useMemo(() => {
    return [...chartData].sort((a, b) => b.savings - a.savings)[0];
  }, [chartData]);

  const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';

  const formatYAxis = (tickItem: number) => {
    return `$${Math.round(tickItem / 1000)}k`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 w-full flex flex-col justify-between shadow-sm"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 font-sans">
              Monthly Cost Savings
            </h3>
          </div>

          <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('net')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                viewMode === 'net'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Net Savings
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gross')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                viewMode === 'gross'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Gross
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span>{viewMode === 'net' ? 'Net saved after rerouting fees' : 'Total avoided delays'}</span>
          <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
            Peak: {peakMonth?.month} (${(peakMonth?.savings / 1000).toFixed(0)}k)
          </span>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradientIndigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={1} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="barGradientEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              dx={-6}
            />
            <Tooltip 
              content={<CustomTooltip viewMode={viewMode} />} 
              cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc', opacity: 0.6 }} 
            />
            <Bar
              dataKey={viewMode === 'net' ? 'netSavings' : 'savings'}
              fill={viewMode === 'net' ? 'url(#barGradientEmerald)' : 'url(#barGradientIndigo)'}
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          YTD Net Saved: $3.12M
        </span>
        <span className="font-mono">12-Month Median: $285k</span>
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlySavingsPoint & { netSavings: number };
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-700/80 font-sans text-xs">
        <p className="font-semibold text-slate-200 mb-1.5">{label} 2026</p>
        <div className="flex flex-col gap-1 font-mono">
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400 font-sans">Gross Savings:</span>
            <span className="font-bold text-emerald-400">
              ${data.savings.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400 font-sans">Reroute Cost:</span>
            <span className="text-rose-400">
              -${data.rerouteCost.toLocaleString()}
            </span>
          </div>
          <div className="pt-1 border-t border-slate-700 flex justify-between items-center gap-4 font-bold">
            <span className="text-slate-300 font-sans">Net Value:</span>
            <span className="text-indigo-300">
              ${data.netSavings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
