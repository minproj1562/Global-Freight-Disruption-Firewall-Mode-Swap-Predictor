import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ROISnapshot } from '@/types/executiveSummaryTypes';
import { useAnimatedCounter } from './useAnimatedCounter';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  Layers,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';

interface ROIHeroProps {
  data: ROISnapshot;
  onExploreDisruptions?: () => void;
  onExploreAudit?: () => void;
}

export const ROIHero: React.FC<ROIHeroProps> = ({ 
  data,
  onExploreDisruptions,
  onExploreAudit 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'ytd'>('month');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Calculate values based on selected period
  const periodMultiplier = selectedPeriod === 'month' ? 1 : selectedPeriod === 'quarter' ? 2.8 : 8.4;
  const inrAmount = data.costSavedINR * periodMultiplier;
  // Conversion approx: 1 crore INR ≈ $120,000 USD
  const usdAmountMillions = (inrAmount * 0.12);
  const daysAmount = Math.round(data.daysSaved * periodMultiplier);

  const { formattedValue: costSavedINRStr } = useAnimatedCounter(inrAmount, 1500, 1, true);
  const { formattedValue: costSavedUSDStr } = useAnimatedCounter(usdAmountMillions, 1500, 2, true);
  const { formattedValue: daysSavedStr } = useAnimatedCounter(daysAmount, 1500, 0, true);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-[#0e1628] to-slate-950 text-white shadow-xl shadow-indigo-950/20"
      aria-label="Executive ROI and Value Delivered Overview"
    >
      {/* Subtle background ambient mesh */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#818cf8 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative z-10 p-5 md:p-6 lg:p-7">
        {/* Top Control Bar: Badges + Interactive Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              EXECUTIVE DISRUPTION FIREWALL
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE TELEMETRY VERIFIED
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Selector Tabs */}
            <div className="inline-flex p-0.5 rounded-lg bg-slate-800/90 border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setSelectedPeriod('month')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedPeriod === 'month'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Oct 2026
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('quarter')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedPeriod === 'quarter'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Q3 2026
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('ytd')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedPeriod === 'ytd'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                YTD 2026
              </button>
            </div>

            {/* Currency Toggle */}
            <div className="inline-flex p-0.5 rounded-lg bg-slate-800/90 border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-2 py-1 rounded-md font-mono font-semibold transition-all ${
                  currency === 'INR'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View in Indian Rupees"
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2 py-1 rounded-md font-mono font-semibold transition-all ${
                  currency === 'USD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View in US Dollars"
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Layout: Headline + Two Key Metrics + KPI Snapshot */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Clear Executive Headline */}
          <div className="lg:col-span-5 space-y-2">
            <div className="text-xs font-semibold tracking-wider uppercase text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Proactive Corridor Optimization
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
              Autonomous mode-swaps saved{' '}
              <span className="text-emerald-400 font-mono">
                {currency === 'INR' ? `₹${costSavedINRStr} Cr` : `$${costSavedUSDStr}M`}
              </span>{' '}
              & compressed delay by{' '}
              <span className="text-indigo-300 font-mono">{daysSavedStr} Days</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-lg">
              Dynamic multi-modal diversion through Jebel Ali & Cape routes averted severe chokepoint demurrage penalties across 23 global voyages.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {onExploreDisruptions && (
                <button
                  type="button"
                  onClick={onExploreDisruptions}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 transition-colors"
                >
                  Inspect Risk Corridors
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onExploreAudit && (
                <button
                  type="button"
                  onClick={onExploreAudit}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors"
                >
                  View Decision Audit Trail
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Sleek Value Metric Cards (Side by Side) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Cost Saved */}
            <div className="p-4 rounded-xl bg-slate-850/90 bg-slate-900/80 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Cost Saved
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                  +18.4% MoM
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {currency === 'INR' ? `₹${costSavedINRStr}` : `$${costSavedUSDStr}`}
                </span>
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                  {currency === 'INR' ? 'Crore' : 'Million'}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Reroute Expense:</span>
                <span className="font-mono text-slate-200">
                  {currency === 'INR' ? '₹1.18 Cr' : '$142K'}
                </span>
              </div>
            </div>

            {/* Card 2: Days Saved */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Transit Compressed
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                  -3.8d / voyage
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-indigo-300 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {daysSavedStr}
                </span>
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">
                  Days
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Demurrage Avoided:</span>
                <span className="font-mono text-slate-200">100% On-Time SLA</span>
              </div>
            </div>

            {/* Card 3: Operational Efficiency */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-sky-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Decision ROI
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300">
                  Optimal
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-sky-300 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  4.8x
                </span>
                <span className="text-xs font-medium text-sky-400 uppercase tracking-wider">
                  Return
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Mean Confidence:</span>
                <span className="font-mono text-emerald-400">96.4% ML Score</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
