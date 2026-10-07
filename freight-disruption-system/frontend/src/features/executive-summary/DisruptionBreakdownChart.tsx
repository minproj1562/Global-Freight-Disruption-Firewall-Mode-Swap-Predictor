import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DisruptionTypeBreakdown } from '@/types/executiveSummaryTypes';
import { PieChart as PieIcon, ShieldAlert } from 'lucide-react';

interface DisruptionBreakdownChartProps {
  data: DisruptionTypeBreakdown[];
  onSelectCategory?: (category: string | null) => void;
}

export const DisruptionBreakdownChart: React.FC<DisruptionBreakdownChartProps> = ({ 
  data,
  onSelectCategory 
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const totalIncidents = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  const handleSliceClick = (entry: DisruptionTypeBreakdown) => {
    const next = selectedType === entry.type ? null : entry.type;
    setSelectedType(next);
    if (onSelectCategory) onSelectCategory(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 w-full flex flex-col justify-between shadow-sm"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 font-sans">
              Disruption Breakdown
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {totalIncidents} Active Incidents
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Click any segment to filter risk matrix
        </p>
      </div>

      <div className="w-full h-[180px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={75}
              paddingAngle={3}
              dataKey="count"
              nameKey="type"
              stroke="transparent"
              onClick={handleSliceClick}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell 
                  key={entry.type} 
                  fill={entry.color} 
                  opacity={selectedType && selectedType !== entry.type ? 0.35 : 1}
                  stroke={selectedType === entry.type ? '#ffffff' : 'transparent'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-50">
            {selectedType ? data.find(d => d.type === selectedType)?.count : totalIncidents}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {selectedType || 'Total'}
          </span>
        </div>
      </div>

      {/* Interactive Legend with Percentage Badges */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-stone-100 dark:border-slate-800/80">
        {data.map((entry) => {
          const pct = Math.round((entry.count / totalIncidents) * 100);
          const isSelected = selectedType === entry.type;

          return (
            <button
              key={entry.type}
              type="button"
              onClick={() => handleSliceClick(entry)}
              className={`flex items-center justify-between text-left p-1 rounded-md transition-colors ${
                isSelected 
                  ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-600' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {entry.type}
                </span>
              </div>
              <span className="text-[10px] font-mono font-medium text-slate-400 shrink-0 ml-1">
                {pct}%
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DisruptionTypeBreakdown;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-3 py-2 shadow-xl border border-slate-700/80 font-sans text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-slate-200">{data.type}</span>
        </div>
        <div className="flex items-center justify-between gap-4 font-mono">
          <span className="text-slate-400 font-sans">Active:</span>
          <span className="font-bold text-white">{data.count} alerts</span>
        </div>
      </div>
    );
  }
  return null;
};
