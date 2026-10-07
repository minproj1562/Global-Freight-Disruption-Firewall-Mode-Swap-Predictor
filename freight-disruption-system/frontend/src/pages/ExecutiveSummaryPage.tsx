import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { ROIHero } from '@/features/executive-summary/ROIHero';
import { KPICards } from '@/features/executive-summary/KPICards';
import { MonthlyCostSavingsChart } from '@/features/executive-summary/MonthlyCostSavingsChart';
import { DisruptionBreakdownChart } from '@/features/executive-summary/DisruptionBreakdownChart';
import { SavingsTrendChart } from '@/features/executive-summary/SavingsTrendChart';
import { RiskMatrix } from '@/features/executive-summary/RiskMatrix';
import { ExposureMap } from '@/features/executive-summary/ExposureMap';
import { HighRiskTable } from '@/features/executive-summary/HighRiskTable';
import { DecisionAuditTrail } from '@/features/executive-summary/DecisionAuditTrail';
import { ExportControl } from '@/features/executive-summary/ExportControl';
import { ExecutiveSummarySkeleton } from '@/features/executive-summary/ExecutiveSummarySkeleton';
import {
  MOCK_ROI_SNAPSHOT,
  MOCK_EXECUTIVE_KPIS,
  MOCK_MONTHLY_SAVINGS,
  MOCK_DISRUPTION_BREAKDOWN,
  MOCK_RISK_MATRIX_ENTRIES,
  MOCK_REGIONAL_EXPOSURE,
  MOCK_HIGH_RISK_DISRUPTIONS,
  MOCK_DECISION_AUDIT,
} from '@/shared/mock/execSummaryMockData';
import { 
  ShieldCheck, 
  RotateCw, 
  Layers, 
  Radio, 
  DownloadCloud, 
  Compass,
  FileSpreadsheet
} from 'lucide-react';

export const ExecutiveSummaryPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const riskMatrixRef = useRef<HTMLDivElement>(null);
  const auditTrailRef = useRef<HTMLDivElement>(null);
  const topRisksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 700);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/70 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <LogisticsManagerSidebar />
      <main className="pl-16 min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          {/* Top Executive Header Bar (Compact & Sleek) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200/60 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>Logistics Firewall · Page 1.6</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-slate-500 dark:text-slate-400">Executive Intelligence</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Risk Register & Executive Summary
              </h1>
            </div>

            {/* Quick Actions & Live Engine Stats */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100/80 dark:bg-slate-800/60 border border-stone-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px]">142 Vessels Synced</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-400 text-[11px]">Updated: {lastRefreshed}</span>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-stone-200/60 dark:border-slate-700/60 transition-colors"
                title="Refresh Live Data"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
              </button>

              <ThemeToggle />
            </div>
          </div>

          {isLoading ? (
            <ExecutiveSummarySkeleton />
          ) : (
            <div className="space-y-5 sm:space-y-6 pb-12">
              {/* Section 1: Compact Executive ROI Command Banner */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ROIHero 
                  data={MOCK_ROI_SNAPSHOT} 
                  onExploreDisruptions={() => scrollToSection(riskMatrixRef)}
                  onExploreAudit={() => scrollToSection(auditTrailRef)}
                />
              </motion.div>

              {/* Section 2: Top 5 KPIs Strip (Clean & Informative) */}
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                aria-label="Key performance indicators"
              >
                <KPICards data={MOCK_EXECUTIVE_KPIS} />
              </motion.section>

              {/* Section 3: Three Analytics Charts in Responsive Grid */}
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                aria-label="Executive analytics charts"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <MonthlyCostSavingsChart data={MOCK_MONTHLY_SAVINGS} />
                <DisruptionBreakdownChart 
                  data={MOCK_DISRUPTION_BREAKDOWN} 
                  onSelectCategory={() => scrollToSection(riskMatrixRef)}
                />
                <SavingsTrendChart data={MOCK_MONTHLY_SAVINGS} />
              </motion.section>

              {/* Section 4: Risk Matrix (Scatter & Incident Triage) */}
              <motion.section
                ref={riskMatrixRef}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4 }}
                aria-label="Risk assessment matrix"
              >
                <RiskMatrix data={MOCK_RISK_MATRIX_ENTRIES} />
              </motion.section>

              {/* Section 5: Regional Cargo Exposure Map */}
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4 }}
                aria-label="Regional exposure map"
              >
                <ExposureMap data={MOCK_REGIONAL_EXPOSURE} />
              </motion.section>

              {/* Section 6: Top 5 Highest Risk Disruptions Table */}
              <motion.section
                ref={topRisksRef}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4 }}
                aria-label="Highest risk disruptions"
              >
                <HighRiskTable data={MOCK_HIGH_RISK_DISRUPTIONS} />
              </motion.section>

              {/* Section 7: Decision Audit Trail */}
              <motion.section
                ref={auditTrailRef}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4 }}
                aria-label="Decision audit trail"
              >
                <DecisionAuditTrail data={MOCK_DECISION_AUDIT} />
              </motion.section>

              {/* Section 8: Export Dossier Engine */}
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4 }}
                aria-label="Report export control"
              >
                <ExportControl />
              </motion.section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
