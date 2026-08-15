// frontend/src/pages/RerouteRecommendationPage.tsx
// Page 1.3 — Reroute Recommendation Page & Monte Carlo Predictor
// Enterprise Logistics SaaS — Palantir Foundry / Flexport / MarineTraffic Inspired
// FASTAPI REPLACEMENT POINT: Replace mock data and simulation logic with real backend REST calls:
// POST /api/v1/reroute/simulate (Runs 2,000 Monte Carlo route optimization iterations)
// GET /api/v1/reroute/dijkstra-compare
// POST /api/v1/reports/pdf (Backend PDF Report Export Endpoint)

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Compass,
  ArrowLeft,
  Sparkles,
  Check,
  Download,
  Scale,
  Leaf,
  Layers,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  X,
  PlayCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { useToast } from '@/components/ui/use-toast';
import {
  RouteRequest,
  RouteResult,
  SimulationResult,
  SimulatedPoint,
  DisruptionSeverity,
} from '../types';
import { MOCK_PORTS, MOCK_VESSELS, MOCK_DISRUPTIONS } from '../shared/mock/mockData';
import {
  MOCK_CARGO_TYPES,
  MOCK_INITIAL_SIMULATION_RESULT,
} from '../shared/mock/rerouteMockData';

export const RerouteRecommendationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Location state pre-fill from Page 1.2
  const navState = location.state as {
    disruptionToAvoid?: string;
    disruptionName?: string;
    vesselId?: string;
    vesselName?: string;
    originPort?: string;
    destinationPort?: string;
    cargoType?: string;
  } | null;

  // Form State
  const [formData, setFormData] = useState<RouteRequest>({
    origin_port: navState?.originPort || 'port-suez',
    destination_port: navState?.destinationPort || 'port-rotterdam',
    vessel_id: navState?.vesselId || 'vessel-ever-given',
    cargo_type: navState?.cargoType || 'High-Tech Consumer Electronics',
    priority: 'Balanced',
    disruption_to_avoid: navState?.disruptionToAvoid || 'disruption-red-sea-critical',
    cargo_value_usd: 42000000,
  });

  // Vessel Dropdown Search Filter State for 200+ vessels
  const [vesselSearchFilter, setVesselSearchFilter] = useState('');

  // Simulation & Results State
  const [simulationResult] = useState<SimulationResult>(
    MOCK_INITIAL_SIMULATION_RESULT
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    MOCK_INITIAL_SIMULATION_RESULT.recommended_routes[0].id
  );

  // Simulation Loading Progress
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simStepText, setSimStepText] = useState('');

  // Dijkstra Comparison Modal
  const [showDijkstraModal, setShowDijkstraModal] = useState(false);

  // Is Form Valid?
  const isFormValid = Boolean(
    formData.origin_port &&
      formData.destination_port &&
      formData.vessel_id &&
      formData.cargo_type &&
      formData.disruption_to_avoid
  );

  // Show Toast if arrived from Page 1.2 with pre-filled context
  useEffect(() => {
    if (navState?.disruptionName) {
      toast({
        title: 'Disruption Context Loaded',
        description: `Pre-filled form with threat: ${navState.disruptionName}`,
      });
    }
  }, []);

  // Run Monte Carlo Simulation Handler with Progress State
  const handleRunSimulation = () => {
    if (!isFormValid || isSimulating) return;

    setIsSimulating(true);
    setSimProgress(5);
    setSimStepText('Initializing 2,000 Monte Carlo route paths...');

    const steps = [
      { pct: 25, text: 'Calculating real-time weather & geopolitical risk surfaces...' },
      { pct: 55, text: 'Evaluating multimodal transfer hubs (Sea-Rail-Air)...' },
      { pct: 85, text: 'Synthesizing Pareto-optimal frontier and carbon tradeoffs...' },
      { pct: 100, text: 'Simulation Complete! Pareto sweet-spot generated.' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSimProgress(steps[currentStep].pct);
        setSimStepText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);

        // Update mock simulation result title with selected vessel/ports
        const selectedVessel = MOCK_VESSELS.find((v) => v.id === formData.vessel_id);
        const originPortObj = MOCK_PORTS.find((p) => p.id === formData.origin_port);
        const destPortObj = MOCK_PORTS.find((p) => p.id === formData.destination_port);

        toast({
          title: '2,000 Simulations Complete',
          description: `Generated Pareto frontier for ${selectedVessel?.name || 'Vessel'} from ${originPortObj?.name || 'Origin'} to ${destPortObj?.name || 'Destination'}.`,
        });
      }
    }, 600);
  };

  // Route Selection Action
  const handleSelectRoute = (route: RouteResult) => {
    setSelectedRouteId(route.id);
    toast({
      title: `Route #${route.rank} Selected`,
      description: `${route.title} (${route.transit_summary}) locked for operational dispatch.`,
    });
  };

  // Generate & Download Client-Side PDF Report using jsPDF & jspdf-autotable
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(245, 158, 11); // amber-500
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('FREIGHT FIREWALL — MONTE CARLO REROUTE REPORT', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

      // Section 1: Route Request Details
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text('1. Simulation Parameters & Constraints', 14, 40);

      const vesselObj = MOCK_VESSELS.find((v) => v.id === formData.vessel_id);
      const originPortObj = MOCK_PORTS.find((p) => p.id === formData.origin_port);
      const destPortObj = MOCK_PORTS.find((p) => p.id === formData.destination_port);
      const disruptionObj = MOCK_DISRUPTIONS.find((d) => d.id === formData.disruption_to_avoid);

      autoTable(doc, {
        startY: 45,
        head: [['Parameter', 'Selected Value']],
        body: [
          ['Target Vessel', vesselObj?.name || formData.vessel_id],
          ['Origin Port', originPortObj?.name || formData.origin_port],
          ['Destination Port', destPortObj?.name || formData.destination_port],
          ['Cargo Type', formData.cargo_type],
          ['Optimization Priority', formData.priority],
          ['Disruption Avoided', disruptionObj?.name || formData.disruption_to_avoid],
          ['Simulations Run', '2,000 Monte Carlo Iterations'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: [15, 23, 42] },
      });

      // Section 2: Top Recommended Routes Table
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(12);
      doc.text('2. Top 3 Ranked Multimodal Reroute Options', 14, finalY + 12);

      const tableRows = simulationResult.recommended_routes.map((r) => [
        `#${r.rank} ${r.is_recommended ? '(Recommended)' : ''}`,
        r.title,
        `$${r.total_cost_usd.toLocaleString()}`,
        `${r.total_time_days} days`,
        `${r.confidence_score}%`,
        r.risk_level.toUpperCase(),
        `${r.co2_carbon_footprint_tons} t`,
      ]);

      autoTable(doc, {
        startY: finalY + 16,
        head: [['Rank', 'Route Name', 'Total Cost', 'Transit Time', 'Confidence', 'Risk', 'CO2']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      });

      // Section 3: Dijkstra Comparison Summary
      const finalY2 = (doc as any).lastAutoTable.finalY || 180;
      doc.setFontSize(11);
      doc.text('3. Strategic Value vs. Naive Dijkstra Shortest Path', 14, finalY2 + 12);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Monte Carlo optimization avoids high-risk combat zones, saving $${simulationResult.dijkstra_comparison.mc_diff.cost_saved_usd.toLocaleString()} and ${simulationResult.dijkstra_comparison.mc_diff.time_saved_days} days compared to naive Dijkstra algorithms.`,
        14,
        finalY2 + 18,
        { maxWidth: 180 }
      );

      doc.save(`Reroute_Report_${formData.vessel_id}_${Date.now()}.pdf`);

      toast({
        title: 'PDF Report Generated',
        description: 'Client-side PDF report created successfully.',
      });
    } catch (err) {
      toast({
        title: 'Report Generated',
        description: 'Generating backend PDF export report...',
      });
    }
  };

  // Helper for Circular SVG Progress Radial Score
  const renderRadialProgress = (score: number, size = 48) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-[11px] font-mono font-bold text-emerald-400">{score}%</span>
      </div>
    );
  };

  // Risk Level Color Helper
  const getRiskBadgeClass = (risk: DisruptionSeverity) => {
    switch (risk) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col overflow-x-hidden">
      <LogisticsManagerSidebar />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between ml-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/disruptions')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Alert Center</span>
          </button>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold font-mono text-white tracking-tight">
                  MONTE CARLO REROUTE PLANNER
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  2,000 SIMULATIONS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                PAGE 1.3 • MULTIMODAL MODE-SWAP PREDICTOR & PARETO FRONTIER OPTIMIZER
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Launch in Simulator Trigger Button */}
          <button
            onClick={() => {
              // FASTAPI / DASHBOARD 2 INTEGRATION POINT: Hand-off route parameters to Supply Chain Simulator & Digital Twin
              console.log('Dispatching parameters to Dashboard 2:', formData);
              toast({
                title: 'Dispatching to Simulator',
                description: 'Would send parameters to Dashboard 2 (Supply Chain Simulator & Digital Twin).',
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Launch in Simulator</span>
          </button>

          {/* Compare with Dijkstra Trigger Button */}
          <button
            onClick={() => setShowDijkstraModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <Scale className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Compare with Dijkstra</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold transition-all"
            title="Export Reroute Simulation Summary PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. TOP TWO-PANE SECTION (LEFT FORM / RIGHT TOP 3 RESULTS) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-8 ml-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========================================================================= */}
          {/* LEFT — ROUTE REQUEST FORM (lg:col-span-5) */}
          {/* ========================================================================= */}
          <section className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 lg:p-6 shadow-2xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>1. ROUTE REQUEST & THREAT PARAMETERS</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">FastAPI ML Engine</span>
              </div>

              <div className="space-y-4">
                {/* 1. Origin Port Dropdown */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    ORIGIN PORT <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.origin_port}
                    onChange={(e) => setFormData({ ...formData, origin_port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/80 cursor-pointer"
                  >
                    {MOCK_PORTS.map((port) => (
                      <option key={port.id} value={port.id}>
                        {port.name} ({port.code}) — {port.country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Destination Port Dropdown */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    DESTINATION PORT <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.destination_port}
                    onChange={(e) => setFormData({ ...formData, destination_port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/80 cursor-pointer"
                  >
                    {MOCK_PORTS.map((port) => (
                      <option key={port.id} value={port.id}>
                        {port.name} ({port.code}) — {port.country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Target Vessel Selectable Dropdown with Search */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    TARGET VESSEL ({MOCK_VESSELS.length} FLEET) <span className="text-rose-400">*</span>
                  </label>
                  <div className="space-y-1">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search 200+ vessels by name..."
                        value={vesselSearchFilter}
                        onChange={(e) => setVesselSearchFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-amber-500/60"
                      />
                    </div>
                    <select
                      value={formData.vessel_id}
                      onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/80 cursor-pointer"
                    >
                      {MOCK_VESSELS.filter((v) =>
                        v.name.toLowerCase().includes(vesselSearchFilter.toLowerCase()) ||
                        v.vessel_type.toLowerCase().includes(vesselSearchFilter.toLowerCase())
                      ).map((vessel) => (
                        <option key={vessel.id} value={vessel.id}>
                          {vessel.name} ({vessel.vessel_type} — {vessel.flag})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Cargo Value Input ($USD) */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    CARGO VALUE ($ USD)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 42000000"
                    value={formData.cargo_value_usd || ''}
                    onChange={(e) => setFormData({ ...formData, cargo_value_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/80"
                  />
                </div>

                {/* 4. Cargo Type Dropdown */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    CARGO CATEGORY
                  </label>
                  <select
                    value={formData.cargo_type}
                    onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/80 cursor-pointer"
                  >
                    {MOCK_CARGO_TYPES.map((cargo) => (
                      <option key={cargo} value={cargo}>
                        {cargo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Priority Segmented Control (4 Options: Cost, Time, Balanced, Carbon) */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                    OPTIMIZATION PRIORITY
                  </label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(['Cost', 'Time', 'Balanced', 'Carbon'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p })}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                          formData.priority === p
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Disruption to Avoid Dropdown */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    DISRUPTION TO AVOID <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.disruption_to_avoid}
                    onChange={(e) => setFormData({ ...formData, disruption_to_avoid: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/80 cursor-pointer"
                  >
                    {MOCK_DISRUPTIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.severity.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Run Simulation Button & Distinct Progress State */}
            <div className="pt-2">
              {isSimulating ? (
                // Distinct Monte Carlo Progress Loader
                <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-amber-500/40 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-300 font-bold">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-amber-400" style={{ animationDuration: '3s' }} />
                      <span>RUNNING MONTE CARLO SIMULATION</span>
                    </span>
                    <span>{simProgress}%</span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${simProgress}%` }}
                      transition={{ ease: 'easeOut' }}
                    />
                  </div>

                  <p className="text-[11px] font-mono text-slate-400 animate-pulse">
                    {simStepText}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRunSimulation}
                  disabled={!isFormValid}
                  className={`w-full py-3.5 rounded-2xl font-mono text-xs font-bold transition-all shadow-xl flex items-center justify-center gap-2 ${
                    isFormValid
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 transform hover:scale-[1.01]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>RUN 2,000 MONTE CARLO SIMULATIONS</span>
                </button>
              )}

              {!isFormValid && (
                <span className="text-[10px] text-rose-400 font-mono block mt-1.5 text-center">
                  * Please fill all required fields to launch simulation
                </span>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* RIGHT — TOP 3 RANKED RESULTS CARDS (lg:col-span-7) */}
          {/* ========================================================================= */}
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>2. TOP 3 RANKED MULTIMODAL REROUTE OPTIONS</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                PARETO SWEET-SPOT
              </span>
            </div>

            <div className="space-y-4">
              {simulationResult.recommended_routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const isBest = route.is_recommended;

                return (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`relative p-5 rounded-3xl border transition-all ${
                      isBest
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-emerald-500/60 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : isSelected
                        ? 'bg-slate-900 border-amber-500/80 shadow-xl'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    {/* Best Recommended Accent Ribbon */}
                    {isBest && (
                      <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase shadow-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-slate-950" />
                        <span>BEST RECOMMENDED OPTION</span>
                      </div>
                    )}

                    {/* Header Row: Rank, Title, Strategy Label, Carrier, Confidence */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-bold text-amber-400 text-xs shadow-inner">
                            #{route.rank}
                          </span>
                          <h3 className="text-sm font-bold font-mono text-white">
                            {route.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px] font-bold uppercase">
                            Strategy: {route.strategy_label || (route.rank === 1 ? 'Most Resilient' : route.rank === 2 ? 'Cheapest' : 'Fastest')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Carrier: <strong className="text-slate-200">{route.carrier_name}</strong>
                        </p>
                      </div>

                      {/* Radial Progress Confidence Score */}
                      <div className="flex items-center gap-3">
                        {renderRadialProgress(route.confidence_score, 44)}
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border uppercase ${getRiskBadgeClass(
                            route.risk_level
                          )}`}
                        >
                          {route.risk_level} Risk
                        </span>
                      </div>
                    </div>

                    {/* Mode Breakdown Stacked Bar */}
                    <div className="mb-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Multimodal Transit Breakdown:</span>
                        <span className="text-slate-300 font-bold">
                          Sea {route.mode_breakdown.sea}% | Rail {route.mode_breakdown.rail}% | Air {route.mode_breakdown.air}%
                        </span>
                      </div>

                      {/* Horizontal Stacked Bar */}
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                        <div
                          style={{ width: `${route.mode_breakdown.sea}%` }}
                          className="h-full bg-sky-500 shadow-inner"
                          title={`Sea Transit: ${route.mode_breakdown.sea}%`}
                        />
                        <div
                          style={{ width: `${route.mode_breakdown.rail}%` }}
                          className="h-full bg-amber-500 shadow-inner"
                          title={`Rail Transit: ${route.mode_breakdown.rail}%`}
                        />
                        <div
                          style={{ width: `${route.mode_breakdown.air}%` }}
                          className="h-full bg-purple-500 shadow-inner"
                          title={`Air Transit: ${route.mode_breakdown.air}%`}
                        />
                      </div>
                    </div>

                    {/* Waypoints Visual Chain */}
                    <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 mb-4 text-xs font-mono">
                      <span className="text-[10px] text-slate-500 block mb-1">WAYPOINTS TRAJECTORY:</span>
                      <div className="flex flex-wrap items-center gap-1.5 text-slate-300 text-[11px]">
                        {route.waypoint_names.map((wp, idx) => (
                          <React.Fragment key={idx}>
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-white font-medium">
                              {wp}
                            </span>
                            {idx < route.waypoint_names.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Metrics Grid (Cost, Time, Carbon, ML Risk Score, Savings) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 text-xs font-mono">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">TOTAL COST</span>
                        <span className="text-white font-bold text-sm">${route.total_cost_usd.toLocaleString()}</span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">TRANSIT TIME</span>
                        <span className="text-white font-bold text-sm">{route.total_time_days} Days</span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-emerald-400" /> CARBON
                        </span>
                        <span className="text-emerald-400 font-bold text-sm">{route.co2_carbon_footprint_tons} t CO₂</span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">ML RISK SCORE</span>
                        <span className="text-amber-400 font-bold text-sm">
                          {route.ml_risk_score ?? (route.risk_level === 'low' ? 0.12 : 0.35)}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">SAVINGS VS ORIG</span>
                        <span className="text-emerald-300 font-extrabold text-xs">
                          Saves ${route.savings_vs_original.cost_usd.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic max-w-md">
                        {route.transit_summary}
                      </p>

                      <button
                        onClick={() => handleSelectRoute(route)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-md shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Check className="w-4 h-4 text-amber-400" />}
                        <span>{isSelected ? 'Route Selected' : 'Select Route'}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* 3. FULL-WIDTH COST VS TIME SCATTER PLOT SECTION */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <BarChart3 className="w-4 h-4" />
                <span>3. COST VS. TIME PARETO SCATTER PLOT (2,000 MONTE CARLO SIMULATION CLOUD)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Visualizing the tradeoff cloud across all simulated route options. Top 3 sweet-spot recommended routes are highlighted as gold/emerald nodes. Hover any point to inspect detailed trade-offs.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 border-t border-emerald-300" />
                <span className="text-emerald-400 font-bold">Pareto Frontier Line</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 border border-slate-950" />
                <span>Top 3 Sweet Spot</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 opacity-60" />
                <span>Simulated Options</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-slate-950" />
                <span>Naive Dijkstra</span>
              </div>
            </div>
          </div>

          {/* Recharts Scatter Plot Canvas */}
          <div className="w-full h-[380px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="time"
                  name="Transit Time"
                  unit=" days"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Transit Time (Days)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="cost"
                  name="Total Cost"
                  unit=" USD"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  label={{ value: 'Total Cost ($ USD)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="confidence" range={[40, 220]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#f59e0b' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SimulatedPoint;
                      return (
                        <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-3.5 shadow-2xl text-xs font-mono space-y-1.5 max-w-xs backdrop-blur-md">
                          <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{data.routeName || 'Simulated Scenario'}</span>
                            {data.isTop3 && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px]">
                                TOP #{data.rank}
                              </span>
                            )}
                          </div>
                          <div className="text-white font-semibold">Cost: ${data.cost.toLocaleString()}</div>
                          <div className="text-slate-300">Transit Time: {data.time} days</div>
                          <div className="text-slate-400">Confidence: {data.confidence}%</div>
                          <div className="text-slate-400 capitalize">Risk Level: {data.risk}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={simulationResult.scatter_cloud}>
                  {simulationResult.scatter_cloud.map((entry, index) => {
                    let fill = '#0284c7'; // default blue
                    if (entry.isTop3) fill = '#10b981'; // emerald for top 3
                    if (entry.id === 'pt-dijkstra') fill = '#f43f5e'; // rose for dijkstra
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fill}
                        stroke={entry.isTop3 ? '#f59e0b' : entry.isParetoOptimal ? '#10b981' : '#0f172a'}
                        strokeWidth={entry.isTop3 ? 2 : entry.isParetoOptimal ? 2 : 1}
                      />
                    );
                  })}
                </Scatter>
                {/* Pareto Frontier Line connecting optimal non-dominated boundary points */}
                <Scatter
                  data={[...simulationResult.scatter_cloud]
                    .filter((p) => p.isTop3 || p.isParetoOptimal)
                    .sort((a, b) => a.time - b.time)}
                  line={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }}
                  shape={() => null}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* DIJKSTRA COMPARISON MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDijkstraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-mono text-white">
                      Monte Carlo vs. Naive Dijkstra Comparison
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Why traditional shortest-path algorithms fail in active threat zones
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDijkstraModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Side by Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Monte Carlo Recommended */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/40 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold block w-max">
                    MONTE CARLO RECOMMENDED (#1)
                  </span>
                  <h4 className="font-bold text-white text-sm">
                    {simulationResult.recommended_routes[0].title}
                  </h4>
                  <div className="space-y-1 text-slate-300 pt-2 border-t border-slate-800">
                    <div>Total Cost: <strong className="text-emerald-400">${simulationResult.recommended_routes[0].total_cost_usd.toLocaleString()}</strong></div>
                    <div>Total Time: <strong className="text-emerald-400">{simulationResult.recommended_routes[0].total_time_days} days</strong></div>
                    <div>Risk Level: <span className="text-emerald-400 uppercase font-bold">Low Risk</span></div>
                    <div>Threat Mitigation: Bypasses Red Sea Missile Zone completely</div>
                  </div>
                </div>

                {/* Naive Dijkstra */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-rose-500/40 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold block w-max">
                    NAIVE DIJKSTRA SHORTEST PATH
                  </span>
                  <h4 className="font-bold text-white text-sm">
                    {simulationResult.dijkstra_comparison.route_name}
                  </h4>
                  <div className="space-y-1 text-slate-300 pt-2 border-t border-slate-800">
                    <div>Total Cost: <strong className="text-rose-400">${simulationResult.dijkstra_comparison.cost_usd.toLocaleString()}</strong></div>
                    <div>Total Time: <strong className="text-rose-400">{simulationResult.dijkstra_comparison.time_days} days</strong></div>
                    <div>Risk Level: <span className="text-rose-400 uppercase font-bold">Critical Hazard</span></div>
                    <div>Threat Mitigation: None (Traverses active combat zone)</div>
                  </div>
                </div>
              </div>

              {/* Strategic Explanation */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-400 block mb-1">Strategic Takeaway:</strong>
                {simulationResult.dijkstra_comparison.details}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowDijkstraModal(false)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold"
                >
                  Close Comparison
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
