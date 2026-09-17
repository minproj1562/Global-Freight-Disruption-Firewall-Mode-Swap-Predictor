// frontend/src/pages/simulation/ScenarioStudioPanel.tsx
// Page 2.1 — Scenario Studio (Batch & Parameter Sweep)
// Full Dark & Light Mode Theme Support

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Play,
  Download,
  FileText,
  LineChart,
  CheckCircle2,
  RefreshCw,
  Search,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/components/ui/use-toast';
import {
  MOCK_DISRUPTIONS_STUDIO,
  MOCK_ORIGIN_PORTS,
  MOCK_DESTINATION_PORTS,
  MOCK_VESSEL_CHOICES,
  generateParameterSweepScenarios,
  ScenarioResultItem,
} from '@/shared/mock/simulationMockData';

interface ScenarioStudioPanelProps {
  initialVesselId?: string;
  initialOrigin?: string;
  initialDestination?: string;
}

export const ScenarioStudioPanel: React.FC<ScenarioStudioPanelProps> = ({
  initialVesselId,
  initialOrigin,
  initialDestination,
}) => {
  const { toast } = useToast();

  // Scenario Configuration State
  const [scenarioName, setScenarioName] = useState('Q4 Global Disruption Stress Test');
  const [scenarioType, setScenarioType] = useState<'Single' | 'Batch' | 'Parameter Sweep' | 'Network-Wide'>('Parameter Sweep');

  // Multi-select Origins & Destinations
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>(
    initialOrigin ? [initialOrigin] : ['Shanghai (CNSHA)', 'Singapore (SGSIN)']
  );
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(
    initialDestination ? [initialDestination] : ['Rotterdam (NLRTM)', 'Hamburg (DEHAM)']
  );
  const [selectedVessels, setSelectedVessels] = useState<string[]>(
    initialVesselId ? ['Ever Given (Container - 20,124 TEU)'] : ['Ever Given (Container - 20,124 TEU)', 'MSC Oscar (19,224 TEU)']
  );
  const [disruptionTemplate, setDisruptionTemplate] = useState('Suez Canal Blockade (Severe Chokepoint Shut)');

  // Variable Parameter Sweep Controls
  const [fuelMin, setFuelMin] = useState(400);
  const [fuelMax, setFuelMax] = useState(800);
  const [fuelStep, setFuelStep] = useState(50);

  const [congestionMin, setCongestionMin] = useState(30);
  const [congestionMax, setCongestionMax] = useState(90);
  const [congestionStep, setCongestionStep] = useState(10);

  // Compute calculated scenario count
  const fuelStepsCount = useMemo(() => {
    return Math.floor((fuelMax - fuelMin) / fuelStep) + 1;
  }, [fuelMin, fuelMax, fuelStep]);

  const congestionStepsCount = useMemo(() => {
    return Math.floor((congestionMax - congestionMin) / congestionStep) + 1;
  }, [congestionMin, congestionMax, congestionStep]);

  const totalCalculatedScenarios = useMemo(() => {
    if (scenarioType === 'Single') return 1;
    if (scenarioType === 'Batch') return selectedOrigins.length * selectedDestinations.length * selectedVessels.length;
    return Math.min(63, fuelStepsCount * congestionStepsCount);
  }, [scenarioType, selectedOrigins, selectedDestinations, selectedVessels, fuelStepsCount, congestionStepsCount]);

  // Simulation State
  const [isRunning, setIsRunning] = useState(false);
  const [progressPct, setProgressPct] = useState(100);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(63);

  // Generated Scenario Data State
  const [scenarios, setScenarios] = useState<ScenarioResultItem[]>(() =>
    generateParameterSweepScenarios()
  );

  // Table Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'optimal' | 'acceptable' | 'high-risk'>('all');

  // Visualization Modal State
  const [showVizModal, setShowVizModal] = useState(false);

  // Toggle helpers for multi-select arrays
  const toggleOrigin = (origin: string) => {
    setSelectedOrigins((prev) =>
      prev.includes(origin) ? (prev.length > 1 ? prev.filter((o) => o !== origin) : prev) : [...prev, origin]
    );
  };

  const toggleDestination = (dest: string) => {
    setSelectedDestinations((prev) =>
      prev.includes(dest) ? (prev.length > 1 ? prev.filter((d) => d !== dest) : prev) : [...prev, dest]
    );
  };

  const toggleVessel = (vessel: string) => {
    setSelectedVessels((prev) =>
      prev.includes(vessel) ? (prev.length > 1 ? prev.filter((v) => v !== vessel) : prev) : [...prev, vessel]
    );
  };

  // Run Batch Simulation Handler
  const handleRunBatchSimulation = () => {
    if (isRunning) return;

    setIsRunning(true);
    setProgressPct(0);
    setCurrentScenarioIndex(0);

    const total = totalCalculatedScenarios;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const currentPct = Math.min(100, Math.round((step / total) * 100));
      setProgressPct(currentPct);
      setCurrentScenarioIndex(step);

      if (step >= total) {
        clearInterval(interval);
        setIsRunning(false);

        // Generate updated data set
        const updated = generateParameterSweepScenarios(
          selectedOrigins[0] || 'Shanghai',
          selectedDestinations[0] || 'Rotterdam',
          selectedVessels[0] || 'Ever Given',
          disruptionTemplate
        );
        setScenarios(updated.slice(0, totalCalculatedScenarios));

        toast({
          title: 'Batch Simulation Complete',
          description: `Successfully evaluated ${totalCalculatedScenarios} scenarios across fuel & congestion parameter surfaces.`,
        });
      }
    }, 40);
  };

  // Export All to CSV Action
  const handleExportCSV = () => {
    const headers = [
      'Scenario ID',
      'Name',
      'Fuel Price (USD/ton)',
      'Congestion (%)',
      'Origin',
      'Destination',
      'Vessel',
      'Strategy',
      'Total Cost (USD)',
      'Time (Hours)',
      'Carbon (Tons CO2)',
      'Risk Score (%)',
      'Status',
    ];

    const rows = scenarios.map((s) => [
      s.id,
      `"${s.name}"`,
      s.fuelPriceUsd,
      s.congestionPct,
      `"${s.origin}"`,
      `"${s.destination}"`,
      `"${s.vessel}"`,
      `"${s.rerouteStrategy}"`,
      s.costUsd,
      s.timeHours,
      s.carbonTons,
      s.riskScorePct,
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Parameter_Sweep_Batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'CSV Export Successful',
      description: `Exported ${scenarios.length} scenario data rows to CSV file.`,
    });
  };

  // Export Comparison Report PDF Action
  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF('landscape');

      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 25, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('SCENARIO STUDIO — PARAMETER SWEEP BATCH COMPARISON REPORT', 14, 16);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()} | Total Scenarios: ${scenarios.length}`, 190, 16);

      const tableData = scenarios.slice(0, 25).map((s) => [
        s.id,
        s.fuelPriceUsd,
        `${s.congestionPct}%`,
        s.rerouteStrategy,
        `$${s.costUsd.toLocaleString()}`,
        `${s.timeHours} hrs`,
        `${s.carbonTons} t`,
        `${s.riskScorePct}%`,
        s.status.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: 32,
        head: [['ID', 'Fuel ($)', 'Congestion', 'Strategy', 'Cost (USD)', 'Time', 'Carbon', 'Risk', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [245, 158, 11] },
        styles: { fontSize: 8 },
      });

      doc.save(`Scenario_Sweep_Report_${Date.now()}.pdf`);

      toast({
        title: 'PDF Report Downloaded',
        description: 'Batch comparison report generated successfully.',
      });
    } catch (err) {
      toast({
        title: 'PDF Generation Failed',
        description: 'Failed to build PDF report.',
      });
    }
  };

  // Filtered Scenarios for Display
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rerouteStrategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [scenarios, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                PAGE 2.1 • BATCH & PARAMETER SWEEP
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                Max 63 Scenarios / Batch
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              SCENARIO STUDIO — STRESS-TEST ENGINE
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-1 max-w-2xl">
              Configure multi-dimensional disruption experiments across fuel price fluctuations, port congestion levels, and chokepoint shutdown templates to generate full trade-off matrices for strategic business cases.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBatchSimulation}
              disabled={isRunning}
              className={`px-5 py-3 rounded-2xl font-mono text-xs font-bold transition-all shadow-xl flex items-center gap-2 ${
                isRunning
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 transform hover:scale-[1.02]'
              }`}
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'SIMULATING BATCH...' : `RUN BATCH (${totalCalculatedScenarios} SCENARIOS)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* LEFT PANEL: SCENARIO CONFIGURATION (lg:col-span-5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 lg:p-6 shadow-xl dark:shadow-2xl space-y-5 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>1. SCENARIO CONFIGURATION</span>
            </div>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              {totalCalculatedScenarios} Active Scenarios
            </span>
          </div>

          {/* Scenario Name Input */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SCENARIO EXPERIMENT NAME
            </label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500/80"
            />
          </div>

          {/* Scenario Type Selection */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              EXPERIMENT TYPE
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {(['Single', 'Batch', 'Parameter Sweep', 'Network-Wide'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScenarioType(type)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold transition-all text-center ${
                    scenarioType === type
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Origin Ports Multi-select Chips */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ORIGIN PORTS (MULTI-SELECT)
            </label>
            <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {MOCK_ORIGIN_PORTS.map((port) => {
                const isSelected = selectedOrigins.includes(port.name);
                return (
                  <button
                    key={port.id}
                    type="button"
                    onClick={() => toggleOrigin(port.name)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium transition-all flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-amber-500" />}
                    <span>{port.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Ports Multi-select Chips */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              DESTINATION PORTS (MULTI-SELECT)
            </label>
            <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {MOCK_DESTINATION_PORTS.map((port) => {
                const isSelected = selectedDestinations.includes(port.name);
                return (
                  <button
                    key={port.id}
                    type="button"
                    onClick={() => toggleDestination(port.name)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium transition-all flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/50'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-sky-500" />}
                    <span>{port.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vessel Selection Chips */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              VESSEL(S) SELECTION
            </label>
            <div className="space-y-1.5 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {MOCK_VESSEL_CHOICES.map((vessel) => {
                const isSelected = selectedVessels.includes(vessel.name);
                return (
                  <button
                    key={vessel.id}
                    type="button"
                    onClick={() => toggleVessel(vessel.name)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono text-left transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <span>{vessel.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Disruption Template Dropdown */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1">
              DISRUPTION TEMPLATE
            </label>
            <select
              value={disruptionTemplate}
              onChange={(e) => setDisruptionTemplate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500/80 cursor-pointer"
            >
              {MOCK_DISRUPTIONS_STUDIO.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} (+{d.delayDays}d base delay)
                </option>
              ))}
            </select>
          </div>

          {/* Variable Parameters Controls (Fuel Price Sweep & Congestion Sweep) */}
          <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-amber-600 dark:text-amber-400">VARIABLE SWEEP PARAMETERS</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {fuelStepsCount} Fuel × {congestionStepsCount} Congestion = {fuelStepsCount * congestionStepsCount} Scenarios
              </span>
            </div>

            {/* Fuel Price Range ($400 - $800 step $50) */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Fuel Price Range ($/ton):</span>
                <span className="text-amber-600 dark:text-amber-300 font-bold">${fuelMin} – ${fuelMax} (Step ${fuelStep})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Min ($)</label>
                  <input
                    type="number"
                    value={fuelMin}
                    onChange={(e) => setFuelMin(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Max ($)</label>
                  <input
                    type="number"
                    value={fuelMax}
                    onChange={(e) => setFuelMax(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Step ($)</label>
                  <input
                    type="number"
                    value={fuelStep}
                    onChange={(e) => setFuelStep(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Congestion Range (30% - 90% step 10%) */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Congestion Index Range (%):</span>
                <span className="text-sky-600 dark:text-sky-300 font-bold">{congestionMin}% – {congestionMax}% (Step {congestionStep}%)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Min (%)</label>
                  <input
                    type="number"
                    value={congestionMin}
                    onChange={(e) => setCongestionMin(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Max (%)</label>
                  <input
                    type="number"
                    value={congestionMax}
                    onChange={(e) => setCongestionMax(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Step (%)</label>
                  <input
                    type="number"
                    value={congestionStep}
                    onChange={(e) => setCongestionStep(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: PROGRESS BAR, RESULTS TABLE, BATCH ACTIONS (lg:col-span-7) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Progress Bar & Batch Action Header */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl dark:shadow-2xl space-y-4 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>2. BATCH EXECUTION & ACTION MATRIX</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Evaluated {scenarios.length} scenarios across parameter space
                </p>
              </div>

              {/* Batch Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm"
                  title="Export All Scenarios to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleGeneratePDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm"
                  title="Generate PDF Comparison Report"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>PDF Report</span>
                </button>

                <button
                  onClick={() => setShowVizModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 transition-all shadow-sm"
                >
                  <LineChart className="w-3.5 h-3.5 text-amber-500" />
                  <span>Visualize</span>
                </button>
              </div>
            </div>

            {/* Batch Simulation Progress Bar */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                  {isRunning ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span>
                    {isRunning ? `Evaluating Scenario #${currentScenarioIndex}...` : 'Batch Run Ready / Complete'}
                  </span>
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{progressPct}%</span>
              </div>

              {/* Progress Slider Track */}
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>0 Scenarios</span>
                <span>Target: Up to 63 Scenarios</span>
              </div>
            </div>
          </div>

          {/* Scenarios Result Table Section */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl dark:shadow-2xl space-y-4 transition-colors duration-300">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter scenarios by strategy or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-end sm:self-auto font-mono text-[11px]">
                {(['all', 'optimal', 'acceptable', 'high-risk'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg uppercase font-bold transition-all ${
                      statusFilter === status
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-300 dark:border-slate-700 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-3">SCENARIO ID</th>
                    <th className="py-3 px-3">FUEL ($)</th>
                    <th className="py-3 px-3">CONGESTION</th>
                    <th className="py-3 px-3">REROUTE STRATEGY</th>
                    <th className="py-3 px-3">COST (USD)</th>
                    <th className="py-3 px-3">TIME (HRS)</th>
                    <th className="py-3 px-3">CARBON</th>
                    <th className="py-3 px-3">RISK %</th>
                    <th className="py-3 px-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                  {filteredScenarios.slice(0, 15).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">{item.id}</td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">${item.fuelPriceUsd}</td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">{item.congestionPct}%</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans text-xs">{item.rerouteStrategy}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">${item.costUsd.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{item.timeHours}h</td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{item.carbonTons}t</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold ${
                            item.riskScorePct > 70
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.riskScorePct > 45
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.riskScorePct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            item.status === 'optimal'
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                              : item.status === 'high-risk'
                              ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40'
                              : 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredScenarios.length > 15 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                  Showing top 15 of {filteredScenarios.length} scenarios. Export CSV for full 63-scenario sweep dataset.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Surface Visualization Modal */}
      <AnimatePresence>
        {showVizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    PARAMETER SWEEP VISUALIZATION SURFACE
                  </h3>
                </div>
                <button
                  onClick={() => setShowVizModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Surface Matrix Grid Bar Cards */}
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                  Cost trajectory matrix across 9 Fuel Price steps ($400 - $800) vs 7 Congestion steps (30% - 90%).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  {scenarios.slice(0, 9).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        <span>Fuel: ${s.fuelPriceUsd}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">Congestion: {s.congestionPct}%</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white mb-1">${s.costUsd.toLocaleString()}</div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (s.costUsd / 220000) * 100)}%` }}
                          className="h-full bg-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setShowVizModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-white"
                >
                  Close Surface View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
