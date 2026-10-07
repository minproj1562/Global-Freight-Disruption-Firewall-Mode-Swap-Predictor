import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Settings2, 
  Sparkles,
  Download
} from 'lucide-react';
import { ExportPeriod } from '@/types/executiveSummaryTypes';

const periods: { label: string; value: ExportPeriod; desc: string }[] = [
  { label: 'Daily Flash', value: 'daily', desc: 'Past 24h operational anomalies & reroutes' },
  { label: 'Weekly Summary', value: 'weekly', desc: '7-day cost variance & chokepoint forecast' },
  { label: 'Monthly Board Brief', value: 'monthly', desc: 'Comprehensive ROI & risk register dossier' }
];

export const ExportControl: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<ExportPeriod>('monthly');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [includeRiskMatrix, setIncludeRiskMatrix] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsReady(false);
    setProgress(15);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGenerating(false);
            setIsReady(true);
            setProgress(100);
            
            // Trigger browser download simulation
            const dummyFilename = `NaviCore_Executive_Risk_Report_${activePeriod}_${new Date().toISOString().slice(0, 10)}.${reportFormat}`;
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('NaviCore Executive Risk Register & ROI Report'));
            element.setAttribute('download', dummyFilename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            setTimeout(() => {
              setIsReady(false);
              setProgress(0);
            }, 4000);
          }, 600);
          return 95;
        }
        return prev + 25;
      });
    }, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-sm"
      aria-label="Export report control center"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Side: Info & Period Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Executive Dossier Export Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Compile signed C-suite briefings with automated ROI validation, vessel transponder heatmaps, and mitigation audit trails.
          </p>

          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {periods.map((period) => {
              const isActive = activePeriod === period.value;
              return (
                <button
                  key={period.value}
                  type="button"
                  onClick={() => setActivePeriod(period.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2 border ${
                    isActive
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-xs'
                      : 'bg-stone-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-stone-200/60 dark:border-slate-700/60 hover:bg-stone-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                  <span>{period.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Export Options & Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:border-l lg:border-stone-100 lg:dark:border-slate-800/80 lg:pl-6">
          <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAuditLogs}
                onChange={(e) => setIncludeAuditLogs(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Operator Audit Trails</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRiskMatrix}
                onChange={(e) => setIncludeRiskMatrix(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Risk Matrix Scatter Chart</span>
            </label>
          </div>

          <div className="flex flex-col gap-2 min-w-[210px]">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-md ${
                isGenerating
                  ? 'bg-indigo-700 opacity-90 cursor-wait'
                  : isReady
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Dossier ({progress}%)...</span>
                </>
              ) : isReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Report Downloaded!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Generate Executive Dossier</span>
                </>
              )}
            </button>

            {/* Progress indicator during compilation */}
            {isGenerating && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
