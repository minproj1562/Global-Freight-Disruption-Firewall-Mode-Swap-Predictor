// src/pages/SinglePortDetailPage.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePortStore } from '../store/portStore';
import { Vessel } from '../types/port';
import { BerthDiagram } from '../components/port/BerthDiagram';
import { BerthStatusTable } from '../components/port/BerthStatusTable';
import { Arrivals72hSchedule } from '../components/port/Arrivals72hSchedule';
import { CongestionHistoryChart } from '../components/port/CongestionHistoryChart';
import { DisruptionModal } from '../components/port/DisruptionModal';
import { VesselDetailModal } from '../components/port/VesselDetailModal';
import { CongestionGauge } from '../components/port/CongestionGauge';
import {
  ArrowLeft,
  ShieldAlert,
  Anchor,
  Ship,
  Clock,
  Activity,
  CloudRain,
  Share2,
  Download,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SinglePortDetailPage: React.FC = () => {
  const { portId } = useParams<{ portId: string }>();
  const navigate = useNavigate();

  const {
    ports,
    selectedPortId,
    selectPort,
    getSelectedPort,
    openVesselModal,
    openDisruptionModal,
  } = usePortStore();

  useEffect(() => {
    if (portId && portId !== selectedPortId) {
      selectPort(portId);
    }
  }, [portId, selectedPortId, selectPort]);

  const currentPort = getSelectedPort();

  const handleVesselSelect = (vessel: Vessel) => {
    openVesselModal(vessel);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-400 selection:text-slate-950 pb-20">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-white/10 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Back link & Port Title */}
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/port"
              className="p-2.5 bg-white/5 hover:bg-amber-400 hover:text-slate-950 text-amber-400 rounded-xl border border-white/10 transition-all font-semibold text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Page 3.1 Overview</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">{currentPort.name}</h1>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {currentPort.code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase ${
                    currentPort.status === 'disrupted'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : currentPort.status === 'heavy'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {currentPort.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{currentPort.country} • {currentPort.region}</span>
                <span>•</span>
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentPort.temperatureC}°C {currentPort.weatherCondition} ({currentPort.windSpeedKnots} kts wind)</span>
              </p>
            </div>
          </div>

          {/* Actions & Port Switcher */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Quick Select Port Dropdown */}
            <select
              value={currentPort.id}
              onChange={(e) => {
                selectPort(e.target.value);
                navigate(`/dashboard/port/${e.target.value}`);
              }}
              className="bg-slate-950 border border-white/15 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>

            {/* Flag Disruption Action Button */}
            <Button
              onClick={openDisruptionModal}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              Flag Port as Disrupted
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Active Disruption Banner if present */}
        {currentPort.activeDisruptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-red-950/80 via-red-900/60 to-slate-900 border-2 border-red-500/50 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/40 text-red-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400 block">
                  CRITICAL DISRUPTION ACTIVE • {currentPort.activeDisruptions[0].type.toUpperCase()}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {currentPort.activeDisruptions[0].title}
                </h3>
                <p className="text-xs text-red-200 mt-1 max-w-3xl">
                  {currentPort.activeDisruptions[0].description}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-red-500/30 px-4 py-2 rounded-2xl text-xs font-semibold text-red-300 whitespace-nowrap">
              Impact Score: {currentPort.activeDisruptions[0].impactScore}/100
            </div>
          </motion.div>
        )}

        {/* 4 KPI Boxes */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI 1: Congestion % */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 shadow-xl backdrop-blur-xl relative overflow-hidden flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                1. Congestion %
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-300">
                  {currentPort.congestionRate}%
                </span>
                <span className="text-xs font-bold text-emerald-400">+3.2% vs 24h</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Quay & Harbor Capacity</p>
            </div>
            <div className="shrink-0">
              <CongestionGauge percentage={currentPort.congestionRate} size={70} strokeWidth={6} showLabel={false} />
            </div>
          </motion.div>

          {/* KPI 2: Berth Vessels */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                2. Berth Vessels
              </span>
              <Anchor className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-white">
                {currentPort.occupiedBerths}{' '}
                <span className="text-slate-400 text-lg font-normal">/ {currentPort.totalBerths}</span>
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              {Math.round((currentPort.occupiedBerths / currentPort.totalBerths) * 100)}% Berth Utilization
            </p>
          </motion.div>

          {/* KPI 3: Anchoring Vessels */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                3. Anchoring Queue
              </span>
              <Ship className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-amber-400">
                {currentPort.anchoringCount} <span className="text-slate-400 text-lg font-normal">Vessels</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Waiting outside harbor gates</p>
          </motion.div>

          {/* KPI 4: Est. Wait Time */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                4. Est. Wait Time
              </span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-white">
                {currentPort.avgWaitHours} <span className="text-amber-300 text-lg font-normal">Hours</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Average queue delay per vessel</p>
          </motion.div>
        </section>

        {/* Section: Visual Berth Layout Diagram */}
        <section>
          <BerthDiagram berths={currentPort.berths} onSelectVessel={handleVesselSelect} />
        </section>

        {/* Section: Berth Status Table */}
        <section>
          <BerthStatusTable berths={currentPort.berths} onSelectVessel={handleVesselSelect} />
        </section>

        {/* Section: Arrivals Schedule for 72h */}
        <section>
          <Arrivals72hSchedule
            arrivals={currentPort.arrivals72h}
            onSelectVessel={handleVesselSelect}
          />
        </section>

        {/* Section: Congestion History Chart with Disruption Overlay */}
        <section>
          <CongestionHistoryChart history={currentPort.congestionHistory} />
        </section>
      </main>

      {/* Interactive Modals */}
      <DisruptionModal />
      <VesselDetailModal />
    </div>
  );
};
