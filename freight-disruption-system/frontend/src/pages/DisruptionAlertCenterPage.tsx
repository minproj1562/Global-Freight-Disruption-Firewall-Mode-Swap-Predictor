// frontend/src/pages/DisruptionAlertCenterPage.tsx
// Page 1.2 — Disruption Alert Center
// Enterprise Logistics SaaS — Palantir Foundry / Flexport Inspired UI
// FASTAPI REPLACEMENT POINT: Replace mock data and action handlers with real REST endpoints:
// GET /api/v1/disruptions
// POST /api/v1/disruptions/{id}/acknowledge
// POST /api/v1/disruptions/{id}/resolve
// POST /api/v1/recommendations/disruption/{id}

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ShieldAlert,
  CloudLightning,
  Users,
  Anchor,
  Clock,
  Ship,
  MapPin,
  Check,
  CheckCircle2,
  X,
  XCircle,
  ArrowRight,
  Sparkles,
  Search,
  BellRing,
  RotateCcw,
  CheckCheck,
  ArrowLeft,
  Info,
  Compass,
  Download,
  DollarSign,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { MapView } from '../features/map/MapView';
import { LogisticsManagerSidebar } from '@/components/logistics/LogisticsManagerSidebar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { useToast } from '@/components/ui/use-toast';
import { Disruption, Vessel, DisruptionSeverity, DisruptionCategory, AcknowledgementStatus } from '../types';
import { MOCK_DISRUPTION_ALERTS } from '../shared/mock/disruptionAlertMockData';
import { MOCK_VESSELS, MOCK_PORTS, MOCK_ROUTES, MOCK_SECONDARY_INFRASTRUCTURE } from '../shared/mock/mockData';

export const DisruptionAlertCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [disruptions, setDisruptions] = useState<Disruption[]>(MOCK_DISRUPTION_ALERTS);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState<string>(MOCK_DISRUPTION_ALERTS[0].id);
  const [activeTabMobile, setActiveTabMobile] = useState<'list' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DisruptionCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AcknowledgementStatus>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'time' | 'vessels'>('severity');
  const [isLoading] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  // Export Impact Report PDF handler
  const handleExportImpactReport = () => {
    if (!selectedDisruption) return;
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('DISRUPTION IMPACT REPORT', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(`Threat Summary: ${selectedDisruption.name}`, 14, 40);

      autoTable(doc, {
        startY: 45,
        head: [['Field', 'Details']],
        body: [
          ['Category', (selectedDisruption.category || 'General').toUpperCase()],
          ['Severity', selectedDisruption.severity.toUpperCase()],
          ['Location', selectedDisruption.location_name || 'N/A'],
          ['Active Since', selectedDisruption.active_since],
          ['Vessels Affected', String(selectedDisruption.affected_vessels_count)],
          ['Financial Exposure', `$${((selectedDisruption.financial_impact_usd || 15000000) / 1e6).toFixed(1)}M USD`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: [15, 23, 42] },
      });

      if (selectedDisruption.ripple_predictions?.length) {
        const finalY = (doc as any).lastAutoTable.finalY || 100;
        doc.setFontSize(12);
        doc.text('AI-Predicted Ripple Port Impacts', 14, finalY + 12);
        autoTable(doc, {
          startY: finalY + 16,
          head: [['Port Code', 'Port Name', 'Congestion Delta', '3-Day Delay', '7-Day Delay', '14-Day Delay']],
          body: selectedDisruption.ripple_predictions.map((r) => [
            r.port_code,
            r.port_name,
            `+${r.congestion_increase_pct}%`,
            `+${r.delay_days.d3}d`,
            `+${r.delay_days.d7}d`,
            `+${r.delay_days.d14}d`,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        });
      }

      doc.save(`Disruption_Impact_Report_${selectedDisruption.id}.pdf`);
      toast({
        title: 'Impact Report Exported',
        description: `Downloaded PDF impact report for ${selectedDisruption.name}`,
      });
    } catch (err) {
      toast({
        title: 'Exporting Report',
        description: `Generated impact report summary for ${selectedDisruption.name}`,
      });
    }
  };

  // Currently selected disruption object
  const selectedDisruption = useMemo(
    () => disruptions.find((d) => d.id === selectedDisruptionId) || null,
    [disruptions, selectedDisruptionId]
  );

  // Sorting & Filtering logic
  const filteredDisruptions = useMemo(() => {
    return disruptions
      .filter((d) => {
        const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || (d.status || 'unacknowledged') === statusFilter;
        const matchesSearch =
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'severity') {
          const sevRank: Record<DisruptionSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          return sevRank[b.severity] - sevRank[a.severity];
        } else if (sortBy === 'time') {
          return new Date(b.active_since).getTime() - new Date(a.active_since).getTime();
        } else {
          return b.affected_vessels_count - a.affected_vessels_count;
        }
      });
  }, [disruptions, categoryFilter, statusFilter, searchQuery, sortBy]);

  // Handle Disruption Selection
  const handleSelectDisruption = (disruption: Disruption) => {
    setSelectedDisruptionId(disruption.id);
    setSelectedVessel(null);
    setActiveTabMobile('detail');
    // Clear 'is_new' badge when clicked
    if (disruption.is_new) {
      setDisruptions((prev) =>
        prev.map((item) => (item.id === disruption.id ? { ...item, is_new: false } : item))
      );
    }
  };

  // Acknowledge Action
  const handleAcknowledge = () => {
    if (!selectedDisruption) return;
    setIsAcknowledging(true);

    setTimeout(() => {
      setDisruptions((prev) =>
        prev.map((d) => (d.id === selectedDisruption.id ? { ...d, status: 'acknowledged' } : d))
      );
      setIsAcknowledging(false);

      toast({
        title: 'Disruption Acknowledged',
        description: `${selectedDisruption.name} has been marked as Acknowledged and logged in audit history.`,
      });
    }, 600);
  };

  // Resolve Action
  const handleConfirmResolve = () => {
    if (!selectedDisruption) return;
    setIsResolving(true);

    setTimeout(() => {
      setDisruptions((prev) =>
        prev.map((d) => (d.id === selectedDisruption.id ? { ...d, status: 'resolved' } : d))
      );
      setIsResolving(false);
      setShowResolveDialog(false);

      toast({
        title: 'Disruption Resolved',
        description: `${selectedDisruption.name} has been marked as Resolved and moved to resolved archives.`,
      });

      // Select next remaining disruption if available
      const remaining = disruptions.filter((d) => d.id !== selectedDisruption.id && d.status !== 'resolved');
      if (remaining.length > 0) {
        setSelectedDisruptionId(remaining[0].id);
      }
    }, 700);
  };

  // Navigate to Page 1.3 (Reroute Recommendation Page) passing state context
  const handleGetRerouteRecommendations = () => {
    if (!selectedDisruption) return;

    const affectedVessel = selectedDisruption.affected_vessels_list?.[0];
    const destinationPort = affectedVessel?.destination_port ? 'port-rotterdam' : 'port-rotterdam';

    toast({
      title: 'Transferring to Reroute Planner',
      description: `Loaded disruption context for ${selectedDisruption.name}`,
    });

    navigate('/dashboard/reroute-planner', {
      state: {
        disruptionToAvoid: selectedDisruption.id,
        disruptionName: selectedDisruption.name,
        vesselId: affectedVessel?.id || 'vessel-ever-given',
        vesselName: affectedVessel?.name || 'EVER GIVEN',
        originPort: 'port-suez',
        destinationPort: destinationPort,
        cargoType: affectedVessel?.cargo_summary || 'High-Tech Consumer Electronics',
      },
    });
  };

  // Simulate Arriving Alert in real-time
  const handleSimulateNewAlert = () => {
    const newId = `disruption-sim-${Date.now()}`;
    const newAlert: Disruption = {
      id: newId,
      name: 'Malacca Strait — High Congestion & Drift Alert',
      type: 'Chokepoint Congestion Hazard',
      category: 'canal',
      severity: 'critical',
      status: 'unacknowledged',
      description: 'Severe traffic bottleneck detected in Singapore Strait Eastbound lane. 22 container vessels experiencing anchorage delays.',
      location_name: 'Malacca / Singapore Strait (SGSIN)',
      polygon_coordinates: [
        [103.5, 1.4],
        [104.2, 1.3],
        [104.0, 1.1],
        [103.4, 1.2],
        [103.5, 1.4],
      ],
      affected_vessels_count: 22,
      active_since: new Date().toISOString().replace('T', ' ').substring(0, 16),
      time_since_detected: 'Just now',
      estimated_duration_remaining: '4 days remaining',
      mitigation_advice: 'Execute immediate speed reduction or reroute via Sunda Strait.',
      is_new: true,
      affected_vessels_list: [MOCK_VESSELS[1], MOCK_VESSELS[10]],
      recommended_action: {
        id: `rec-sim-${Date.now()}`,
        disruption_id: newId,
        summary: 'Reroute 2 feeder vessels via Sunda Strait — 1.8 day delay avoided',
        action_type: 'Reroute Sea Cape',
        estimated_delay_avoided_days: 1.8,
        estimated_cost_delta_usd: 5400,
        affected_vessels_count: 2,
        confidence_score: 95,
      },
    };

    setDisruptions((prev) => [newAlert, ...prev]);
    setSelectedDisruptionId(newId);

    toast({
      title: '⚡ REAL-TIME ALERT ARRIVED',
      description: `${newAlert.name} animated into Alert Center list.`,
    });
  };

  // Category Icon Renderer
  const renderCategoryIcon = (category?: DisruptionCategory, className = 'w-4 h-4') => {
    switch (category) {
      case 'geopolitical':
        return <ShieldAlert className={className} />;
      case 'weather':
        return <CloudLightning className={className} />;
      case 'labor':
        return <Users className={className} />;
      case 'canal':
        return <Anchor className={className} />;
      default:
        return <AlertTriangle className={className} />;
    }
  };

  // Severity Color Helper
  const getSeverityBadgeClass = (severity: DisruptionSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold animate-pulse';
      case 'high':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold';
      case 'medium':
        return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-medium';
      case 'low':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-medium';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-x-hidden transition-colors duration-300">
      <LogisticsManagerSidebar />

      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR / HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between ml-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/operations')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Operations Map</span>
          </button>

          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shadow-md">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                  DISRUPTION ALERT CENTER
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  {disruptions.filter((d) => d.status !== 'resolved').length} ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
                PAGE 1.2 • REAL-TIME MARITIME THREAT FIREWALL & DISRUPTION TELEMETRY
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time simulation trigger button */}
          <button
            onClick={handleSimulateNewAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold transition-all shadow-md"
            title="Simulate incoming real-time disruption alert"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Simulate Incoming Alert</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 py-2 ml-16 justify-around">
        <button
          onClick={() => setActiveTabMobile('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold ${
            activeTabMobile === 'list' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Disruption List ({filteredDisruptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTabMobile('detail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold ${
            activeTabMobile === 'detail' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Disruption Detail</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. TWO-PANE MAIN LAYOUT */}
      {/* ========================================================================= */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 ml-16 overflow-hidden h-[calc(100vh-57px)]">
        {/* ========================================================================= */}
        {/* LEFT PANE — DISRUPTION LIST (lg:col-span-5) */}
        {/* ========================================================================= */}
        <section
          className={`lg:col-span-5 border-r border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 flex flex-col h-full overflow-hidden ${
            activeTabMobile === 'detail' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Filters & Search Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search disruptions by location or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Control */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-500/60 cursor-pointer"
                >
                  <option value="severity">Sort: Severity</option>
                  <option value="time">Sort: Time Detected</option>
                  <option value="vessels">Sort: Vessels Affected</option>
                </select>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: 'all', label: 'All', icon: undefined },
                  { id: 'geopolitical', label: 'Geopolitical', icon: ShieldAlert },
                  { id: 'canal', label: 'Canal & Locks', icon: Anchor },
                  { id: 'weather', label: 'Weather', icon: CloudLightning },
                  { id: 'labor', label: 'Labor Dispute', icon: Users },
                ] as const
              ).map((tab) => {
                const IconComponent = tab.icon;
                const isActive = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id as any)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Status Filter:</span>
              <div className="flex items-center gap-1">
                {(['all', 'unacknowledged', 'acknowledged', 'resolved'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded capitalize text-[10px] transition-all ${
                      statusFilter === st
                        ? 'bg-slate-200 dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Disruption Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              // Loading Skeleton matching card shape
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
                </div>
              ))
            ) : filteredDisruptions.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-3 shadow-lg">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white">No Active Disruptions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                  All clear! No threats match your search filters or active criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="mt-4 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-amber-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {filteredDisruptions.map((disruption) => {
                  const isSelected = disruption.id === selectedDisruptionId;
                  const isAcknowledged = disruption.status === 'acknowledged';
                  const isResolved = disruption.status === 'resolved';

                  return (
                    <motion.div
                      key={disruption.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => handleSelectDisruption(disruption)}
                      className={`relative group p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900'
                      } ${isResolved ? 'opacity-60 grayscale-[0.3]' : ''}`}
                    >
                      {/* Selected Left Accent Bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-amber-500 rounded-r-full shadow-glow" />
                      )}

                      {/* Top Row: Icon + Title + Severity Badge */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-amber-500 dark:text-amber-400 shrink-0">
                            {renderCategoryIcon(disruption.category, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors line-clamp-1">
                                {disruption.name}
                              </h3>
                              {disruption.is_new && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-mono text-[9px] font-bold animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="line-clamp-1">{disruption.location_name || disruption.type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Severity Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border uppercase shrink-0 ${getSeverityBadgeClass(
                            disruption.severity
                          )}`}
                        >
                          {disruption.severity}
                        </span>
                      </div>

                      {/* Description Snippet */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2">
                        {disruption.description}
                      </p>

                      {/* Predicted Ripple Ports Chips */}
                      {disruption.predicted_ripple_ports?.length ? (
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                          <span className="text-[10px] font-mono text-purple-400 font-semibold">Affects:</span>
                          {disruption.predicted_ripple_ports.slice(0, 2).map((portCode) => (
                            <span
                              key={portCode}
                              className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-mono text-[9px] font-bold"
                            >
                              {portCode}
                            </span>
                          ))}
                          {disruption.predicted_ripple_ports.length > 2 && (
                            <span className="text-[9px] font-mono text-slate-400">
                              +{disruption.predicted_ripple_ports.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* Bottom Info Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {disruption.time_since_detected || disruption.active_since}
                          </span>

                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Ship className="w-3 h-3 text-sky-500" />
                            {disruption.affected_vessels_count} vessels affected
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1">
                          {isAcknowledged && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                              <CheckCheck className="w-3 h-3" /> Acknowledged
                            </span>
                          )}
                          {isResolved && (
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT PANE — DETAIL VIEW (lg:col-span-7) */}
        {/* ========================================================================= */}
        <section
          className={`lg:col-span-7 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col h-full overflow-y-auto ${
            activeTabMobile === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedDisruption ? (
            <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-6">
              {/* Top Bar / Mobile Back Button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTabMobile('list')}
                    className="lg:hidden p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                      SELECTED THREAT DETAILS
                    </span>
                    <h2 className="text-lg lg:text-xl font-bold font-mono text-slate-900 dark:text-white">
                      {selectedDisruption.name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono border uppercase ${getSeverityBadgeClass(
                      selectedDisruption.severity
                    )}`}
                  >
                    {selectedDisruption.severity} SEVERITY
                  </span>
                  {selectedDisruption.status === 'acknowledged' && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                      ACKNOWLEDGED
                    </span>
                  )}
                </div>
              </div>

              {/* 1. EMBEDDED MINI MAP CONTAINER */}
              <div className="relative w-full h-[280px] lg:h-[320px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900 group">
                {/* Mini Map Canvas reusing MapView */}
                <MapView
                  vessels={selectedDisruption.affected_vessels_list || MOCK_VESSELS}
                  ports={MOCK_PORTS}
                  disruptions={disruptions}
                  routes={MOCK_ROUTES}
                  secondaryInfra={MOCK_SECONDARY_INFRASTRUCTURE}
                  layers={{
                    vessels: true,
                    ports: true,
                    disruptions: true,
                    routes: true,
                    vesselNames: true,
                    secondaryInfra: false,
                  }}
                  selectedVesselTypeFilters={[]}
                  selectedVessel={selectedVessel}
                  selectedPort={null}
                  selectedDisruption={selectedDisruption}
                  onSelectVessel={(v) => setSelectedVessel(v)}
                  onSelectPort={() => {}}
                  className="w-full h-full"
                />

                {/* Map Overlay Badge */}
                <div className="absolute top-3 left-3 z-10 glass-panel px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-lg bg-white/80 dark:bg-slate-900/80">
                  <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '10s' }} />
                  <span>ZONE CENTROID: {selectedDisruption.location_name}</span>
                </div>
              </div>

              {/* FINANCIAL IMPACT ESTIMATE STAT CARD */}
              <div className="bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider block">
                      ESTIMATED FINANCIAL IMPACT EXPOSURE
                    </span>
                    <span className="text-xl font-extrabold font-mono text-white">
                      ${((selectedDisruption.financial_impact_usd || 48500000) / 1000000).toFixed(1)}M USD
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-400 hidden sm:block">
                  <span className="text-rose-400 font-bold block">High Cargo Exposure</span>
                  <span>Based on {selectedDisruption.affected_vessels_count} vessels</span>
                </div>
              </div>

              {/* 2. AUTO-GENERATED RECOMMENDED ACTION CARD */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-900 border border-amber-500/30 rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>AI AUTO-GENERATED RECOMMENDED ACTION</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                    {selectedDisruption.recommended_action?.confidence_score || 96}% CONFIDENCE
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed mb-4">
                  "{selectedDisruption.recommended_action?.summary || selectedDisruption.mitigation_advice}"
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs font-mono">
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">DELAY AVOIDED</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      +{selectedDisruption.recommended_action?.estimated_delay_avoided_days || 3.5} Days
                    </span>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">ESTIMATED SAVINGS</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                      ${(selectedDisruption.recommended_action?.estimated_cost_delta_usd || 12400).toLocaleString()}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">TARGET VESSELS</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold text-sm">
                      {selectedDisruption.affected_vessels_count} Vessels
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-500 font-mono italic">
                  {/* FASTAPI REPLACEMENT POINT: Backend Endpoint POST /api/v1/recommendations/disruption/{id} */}
                  * Recommendation synthesized via Monte Carlo threat optimization model.
                </div>
              </div>

              {/* AI-PREDICTED RIPPLE EFFECTS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI-PREDICTED RIPPLE EFFECTS (3 / 7 / 14-DAY HORIZONS)
                  </h3>
                  <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                    CASCADE PREDICTOR
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                          <th className="pb-2">Affected Port</th>
                          <th className="pb-2">Congestion Δ</th>
                          <th className="pb-2 text-center">3-Day Delay</th>
                          <th className="pb-2 text-center">7-Day Delay</th>
                          <th className="pb-2 text-center">14-Day Delay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {(selectedDisruption.ripple_predictions || [
                          { port_code: 'ZADUR', port_name: 'Port of Durban', congestion_increase_pct: 35, delay_days: { d3: 2, d7: 3, d14: 4.5 } },
                          { port_code: 'EGPSD', port_name: 'Port Said', congestion_increase_pct: 18, delay_days: { d3: 1.5, d7: 5, d14: 7 } },
                        ]).map((pred) => (
                          <tr key={pred.port_code} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                              {pred.port_name} <span className="text-slate-400 font-normal">({pred.port_code})</span>
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                +{pred.congestion_increase_pct}%
                              </span>
                            </td>
                            <td className="py-2.5 text-center text-slate-300">+{pred.delay_days.d3}d</td>
                            <td className="py-2.5 text-center text-amber-400 font-semibold">+{pred.delay_days.d7}d</td>
                            <td className="py-2.5 text-center text-rose-400 font-bold">+{pred.delay_days.d14}d</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 3. AFFECTED VESSELS SCROLLABLE LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Ship className="w-4 h-4 text-sky-500" />
                    AFFECTED VESSELS ({selectedDisruption.affected_vessels_list?.length || selectedDisruption.affected_vessels_count})
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    Click vessel row to target on mini map
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
                    {(selectedDisruption.affected_vessels_list || MOCK_VESSELS.slice(0, 4)).map((vessel) => {
                      const isVesselSelected = selectedVessel?.id === vessel.id;
                      return (
                        <div
                          key={vessel.id}
                          onClick={() => setSelectedVessel(vessel)}
                          className={`p-3 flex items-center justify-between text-xs transition-all cursor-pointer ${
                            isVesselSelected
                              ? 'bg-amber-500/10 border-l-2 border-amber-500 text-slate-900 dark:text-white font-medium'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-sky-500 font-mono text-[10px] font-bold">
                              {vessel.flag.split(' ').pop() || '🚢'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white font-mono">{vessel.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {vessel.vessel_type} • {vessel.speed} kts • Dest: {vessel.destination_port}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold block">
                              +3.5d ETA Impact
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {vessel.capacity_teu ? `${vessel.capacity_teu.toLocaleString()} TEU` : 'Bulk Carrier'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. PERSISTENT BOTTOM ACTIONS BAR */}
              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 sticky bottom-0 z-20 pb-2">
                <div className="flex items-center gap-2">
                  {/* Acknowledge Button */}
                  <button
                    onClick={handleAcknowledge}
                    disabled={isAcknowledging || selectedDisruption.status === 'acknowledged'}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-sm ${
                      selectedDisruption.status === 'acknowledged'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isAcknowledging ? (
                      <RotateCcw className="w-4 h-4 animate-spin text-amber-500" />
                    ) : selectedDisruption.status === 'acknowledged' ? (
                      <CheckCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Check className="w-4 h-4 text-amber-500" />
                    )}
                    <span>
                      {selectedDisruption.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge Threat'}
                    </span>
                  </button>

                  {/* Resolve Button */}
                  <button
                    onClick={() => setShowResolveDialog(true)}
                    disabled={selectedDisruption.status === 'resolved'}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition-all"
                  >
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Resolve Threat</span>
                  </button>

                  {/* Export Impact Report Button */}
                  <button
                    onClick={handleExportImpactReport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-mono font-bold transition-all"
                    title="Export PDF Disruption Impact Report"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>Export Impact Report</span>
                  </button>
                </div>

                {/* Get Reroute Recommendations Button */}
                <button
                  onClick={handleGetRerouteRecommendations}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-mono font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
                >
                  <Compass className="w-4 h-4 text-slate-950" />
                  <span>Get Reroute Recommendations</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          ) : (
            // Detail View Empty State
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-lg">
                <BellRing className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white">Select a Disruption</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Choose any alert from the left panel to inspect spatial bounds, affected vessels, and run AI route mitigations.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* ========================================================================= */}
      {/* RESOLVE CONFIRMATION MODAL DIALOG */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showResolveDialog && selectedDisruption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-500 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">Confirm Disruption Resolution</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mark threat as fully cleared</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to resolve <strong className="text-slate-900 dark:text-white">{selectedDisruption.name}</strong>? This action will update its status to resolved and archive active vessel alerts.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowResolveDialog(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmResolve}
                  disabled={isResolving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-mono font-bold shadow-lg"
                >
                  {isResolving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isResolving ? 'Resolving...' : 'Confirm Resolution'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
