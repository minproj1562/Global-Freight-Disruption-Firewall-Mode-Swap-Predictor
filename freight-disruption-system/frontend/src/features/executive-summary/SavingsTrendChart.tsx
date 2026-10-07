import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MonthlySavingsPoint } from '@/types/executiveSummaryTypes';
import { useTheme } from '@/shared/hooks/useTheme';
import { TrendingUp, Target } from 'lucide-react';

interface SavingsTrendChartProps {
  data: MonthlySavingsPoint[];
}

export const SavingsTrendChart: React.FC<SavingsTrendChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const [metricMode, setMetricMode] = useState<'cumulative' | 'runRate'>('cumulative');

  // Compute cumulative savings and 3-month moving average
  const chartData = useMemo(() => {
    let runningTotal = 0;
    return data.map((item, idx) => {
      runningTotal += item.savings;
      return {
        ...item,
        cumulativeSavings: runningTotal,
      };
    });
  }, [data]);

  const totalCumulative = useMemo(() => {
    return chartData[chartData.length - 1]?.cumulativeSavings || 0;
  }, [chartData]);

  const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';

  const formatYAxis = (tickItem: number) => {
    if (tickItem >= 1000000) {
      return `$${(tickItem / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(tickItem / 1000)}k`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 w-full flex flex-col justify-between shadow-sm"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 font-sans">
              Savings Trajectory
            </h3>
          </div>

          <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setMetricMode('cumulative')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                metricMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Cumulative
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('runRate')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                metricMode === 'runRate'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Monthly Rate
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span>{metricMode === 'cumulative' ? '12-month value accumulation' : 'Month-over-month volume'}</span>
          <span className="text-[11px] font-mono font-medium text-indigo-600 dark:text-indigo-400">
            Total: ${(totalCumulative / 1000000).toFixed(2)}M
          </span>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradientIndigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="areaGradientSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
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
            <Tooltip content={<CustomTooltip metricMode={metricMode} />} />
            <Area
              type="monotone"
              dataKey={metricMode === 'cumulative' ? 'cumulativeSavings' : 'savings'}
              stroke={metricMode === 'cumulative' ? '#6366F1' : '#0ea5e9'}
              strokeWidth={2.5}
              fill={metricMode === 'cumulative' ? 'url(#areaGradientIndigo)' : 'url(#areaGradientSky)'}
              activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
              dot={{ r: 2.5, fill: metricMode === 'cumulative' ? '#6366F1' : '#0ea5e9', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Target className="w-3 h-3 text-indigo-400" />
          FY26 Forecast: $3.85M
        </span>
        <span className="font-mono text-emerald-500 font-medium">+24.8% vs Target</span>
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label, metricMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlySavingsPoint & { cumulativeSavings: number };
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-700/80 font-sans text-xs">
        <p className="font-semibold text-slate-200 mb-1.5">{label} 2026</p>
        <div className="flex flex-col gap-1 font-mono">
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400 font-sans">Monthly Saved:</span>
            <span className="font-bold text-emerald-400">
              ${data.savings.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400 font-sans">Cumulative Value:</span>
            <span className="font-bold text-indigo-300">
              ${data.cumulativeSavings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
