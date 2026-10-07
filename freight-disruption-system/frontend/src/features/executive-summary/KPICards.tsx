import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExecutiveSummaryKPIs } from '@/types/executiveSummaryTypes';
import { useAnimatedCounter } from './useAnimatedCounter';
import { 
  DollarSign, 
  Route, 
  Clock, 
  AlertTriangle, 
  Ship, 
  ArrowUpRight, 
  CheckCircle2,
  Info
} from 'lucide-react';

interface KPICardsProps {
  data: ExecutiveSummaryKPIs;
  onFilterMetric?: (metricId: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({ data, onFilterMetric }) => {
  const [activeKpi, setActiveKpi] = useState<string | null>(null);

  const kpis = [
    {
      id: 'cost-saved',
      label: 'Cost Saved This Month',
      value: data.costSavedThisMonth / 1000000,
      prefix: '$',
      suffix: 'M',
      decimals: 2,
      trend: '+18.4% vs Sep',
      trendPositive: true,
      subtext: 'Net rerouting savings',
      Icon: DollarSign,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
      sparkBars: [40, 55, 60, 48, 75, 85, 100]
    },
    {
      id: 'routes-rerouted',
      label: 'Routes Rerouted',
      value: data.routesRerouted,
      prefix: '',
      suffix: '',
      decimals: 0,
      trend: '23 of 28 analyzed',
      trendPositive: true,
      subtext: '82% bypass execution',
      Icon: Route,
      iconColor: 'text-indigo-500 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20',
      badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40',
      sparkBars: [30, 45, 60, 50, 70, 80, 92]
    },
    {
      id: 'avg-decision',
      label: 'Avg Decision Time',
      value: data.avgDecisionTimeMinutes,
      prefix: '',
      suffix: 'm',
      decimals: 1,
      trend: '-72% vs Manual',
      trendPositive: true,
      subtext: 'Benchmark: 15.0 min',
      Icon: Clock,
      iconColor: 'text-sky-500 dark:text-sky-400',
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20',
      badgeClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40',
      sparkBars: [85, 75, 60, 50, 42, 35, 28]
    },
    {
      id: 'active-disruptions',
      label: 'Active Disruptions',
      value: data.activeDisruptions,
      prefix: '',
      suffix: '',
      decimals: 0,
      trend: '3 Critical Triage',
      trendPositive: false,
      subtext: '7 monitored zones',
      Icon: AlertTriangle,
      iconColor: 'text-amber-500 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      sparkBars: [50, 60, 75, 65, 80, 70, 68]
    },
    {
      id: 'vessels-at-risk',
      label: 'Vessels at Risk',
      value: data.vesselsAtRisk,
      prefix: '',
      suffix: '',
      decimals: 0,
      trend: '100% Diversions Safe',
      trendPositive: true,
      subtext: '12 transponders alerted',
      Icon: Ship,
      iconColor: 'text-rose-500 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
      sparkBars: [70, 65, 80, 85, 60, 50, 45]
    },
  ];

  const handleCardClick = (id: string) => {
    setActiveKpi(activeKpi === id ? null : id);
    if (onFilterMetric) onFilterMetric(id);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {kpis.map((kpi, index) => (
        <KPICard
          key={kpi.id}
          kpi={kpi}
          index={index}
          isSelected={activeKpi === kpi.id}
          onClick={() => handleCardClick(kpi.id)}
        />
      ))}
    </div>
  );
};

interface KPICardProps {
  kpi: {
    id: string;
    label: string;
    value: number;
    prefix: string;
    suffix: string;
    decimals: number;
    trend: string;
    trendPositive: boolean;
    subtext: string;
    Icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    badgeClass: string;
    sparkBars: number[];
  };
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ kpi, index, isSelected, onClick }) => {
  const { formattedValue } = useAnimatedCounter(kpi.value, 1500, kpi.decimals, true);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
      className={`text-left relative p-4 rounded-xl transition-all border ${
        isSelected
          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
          : 'bg-white dark:bg-[#12151E] border-stone-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
      }`}
      aria-label={`${kpi.label}: ${kpi.prefix}${formattedValue}${kpi.suffix}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.iconBg}`}>
          <kpi.Icon className={`w-4 h-4 ${kpi.iconColor}`} />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${kpi.badgeClass}`}>
          {kpi.trend}
        </span>
      </div>

      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mb-1">
        {kpi.label}
      </div>

      <div className="flex items-baseline justify-between gap-1">
        <span
          className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-50 tracking-tight"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {kpi.prefix}{formattedValue}{kpi.suffix}
        </span>

        {/* Micro Sparkline Bar Indicator */}
        <div className="flex items-end gap-0.5 h-4 opacity-80" aria-hidden="true">
          {kpi.sparkBars.map((heightPct, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-sm ${
                idx === kpi.sparkBars.length - 1
                  ? 'bg-indigo-500 dark:bg-indigo-400'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
              style={{ height: `${heightPct}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>{kpi.subtext}</span>
        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
      </div>
    </motion.button>
  );
};
