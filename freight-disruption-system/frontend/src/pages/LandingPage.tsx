// frontend/src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Anchor, ShieldCheck, ArrowUpRight, Cpu, Radio, Network, BarChart3 } from 'lucide-react';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { TransportAnimation } from '@/components/landing/TransportAnimation';
import { RoleCard, RoleCardProps } from '@/components/landing/RoleCard';
import { MaritimeLogo } from '@/components/landing/MaritimeLogo';
import { fetchLandingTelemetryApi, LandingTelemetryData } from '@/services/portManagerApi';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [utcTime, setUtcTime] = useState<string>('');
  const [telemetry, setTelemetry] = useState<LandingTelemetryData | null>(null);

  // UTC Live Clock
  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real-time DB telemetry for Landing Page
  useEffect(() => {
    let cancelled = false;
    fetchLandingTelemetryApi()
      .then((data) => {
        if (!cancelled) {
          setTelemetry(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load landing telemetry:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRoleClick = (role: string) => {
    if (role === 'port') {
      navigate('/dashboard/ports');
    } else if (role === 'operations') {
      navigate('/dashboard/operations');
    } else if (role === 'admin') {
      navigate('/dashboard/admin');
    } else {
      navigate('/login', { state: { role } });
    }
  };

  // Real data-driven role card definitions
  const roles: (Omit<RoleCardProps, 'onClick' | 'delay'> & { role: string })[] = [
    {
      portalId: 'PORTAL 01',
      nodeCode: 'SYS_NODE // 01',
      domain: 'VOYAGE & AIS ROUTING',
      title: 'Global Fleet Ops',
      subtitle: 'Fleet Operations & AI Mode-Swap',
      description: 'Real-time multi-ocean AIS tracking, automated sea-to-rail/air freight re-routing, and voyage cost optimization.',
      icon: Ship,
      color: '#06b6d4',
      glowColor: '#38bdf8',
      metrics: [
        {
          label: 'VESSELS MONITORED',
          value: telemetry ? `${telemetry.total_tracked_vessels} AIS LIVE` : '12+ LIVE',
        },
        {
          label: 'PORT QUEUE TOTAL',
          value: telemetry ? `${telemetry.waiting_vessels_total} IN QUEUE` : '38 IN QUEUE',
        },
      ],
      features: [
        'Live Satellite AIS Telemetry',
        'Autonomous Mode-Swap Trigger',
        'Voyage ETA & Bunker Simulator',
      ],
      role: 'operations',
    },
    {
      portalId: 'PORTAL 02',
      nodeCode: 'SYS_NODE // 02',
      domain: 'TERMINAL & QUAY OPS',
      title: 'Port Operations',
      subtitle: 'Terminal Quay & Berth Intelligence',
      description: 'Live terminal congestion monitoring, digital twin berth allocation, downstream arrival surge prediction & vessel logs.',
      icon: Anchor,
      color: '#10b981',
      glowColor: '#34d399',
      metrics: [
        {
          label: 'NETWORK PORTS',
          value: telemetry ? `${telemetry.total_ports} STATIONS` : '50 STATIONS',
        },
        {
          label: 'BERTHS OCCUPIED',
          value: telemetry ? `${telemetry.active_berths} / ${telemetry.total_berths}` : '320 / 480',
        },
      ],
      features: [
        'Digital Twin Berth Allocation',
        'Downstream Arrival Surge AI',
        'Vessel Manifest Clearance Logs',
      ],
      role: 'port',
    },
    {
      portalId: 'PORTAL 03',
      nodeCode: 'SYS_NODE // 03',
      domain: 'DEFENSE & GOVERNANCE',
      title: 'Admin Command',
      subtitle: 'Mission Control & Firewall Overrides',
      description: 'System health oversight, manual disruption event injection, platform-wide audit matrices & fleet database governance.',
      icon: ShieldCheck,
      color: '#f59e0b',
      glowColor: '#fbbf24',
      metrics: [
        {
          label: 'ACTIVE DISRUPTIONS',
          value: telemetry ? `${telemetry.active_disruptions_count} ALERTS` : '0 ALERTS',
        },
        {
          label: 'GLOBAL AVG CONGESTION',
          value: telemetry ? `${telemetry.avg_global_congestion_pct}%` : '52.4%',
        },
      ],
      features: [
        'Manual Disruption Event Injection',
        'Global Fleet DB Synchronization',
        'Credential & Access Governance',
      ],
      role: 'admin',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background - oceanic sky, aurora, static wave gradients */}
      <AnimatedBackground />

      {/* Transport Animations - planes, ships, trains */}
      <TransportAnimation />

      {/* ======== MAIN CONTENT ======== */}
      <div className="relative z-20 flex min-h-screen flex-col items-center px-4 sm:px-6 lg:px-8">

        {/* ======== TOP ENTERPRISE NAVBAR ======== */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-7xl flex items-center justify-between pt-6 pb-4 border-b border-cyan-500/15"
        >
          {/* Brand Logo & Title */}
          <MaritimeLogo size={36} />

          {/* Center Telemetry Status Pill (Desktop) */}
          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/70 border border-cyan-500/30 backdrop-blur-xl shadow-lg shadow-cyan-950/20 text-xs font-mono">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 font-bold tracking-wider">
              {telemetry?.system_status === 'DEFENSE_ACTIVE' ? 'FIREWALL ELEVATED DEFENSE' : 'FIREWALL ACTIVE'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{telemetry?.total_ports || 50} GLOBAL HUBS</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-semibold">{utcTime}</span>
          </div>

          {/* Right Action Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-200 bg-slate-900/80 border border-slate-700/80 hover:border-cyan-400/50 hover:bg-slate-800/90 transition-all shadow-md"
            >
              <span>ACCESS LOGIN</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </motion.header>

        {/* ======== HERO SECTION ======== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-7xl w-full py-8 md:py-12">
          
          {/* Hero Content Card */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-8 p-6 sm:p-10 md:p-12 rounded-[32px] max-w-5xl border shadow-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(6, 26, 50, 0.55) 0%, rgba(3, 15, 30, 0.75) 100%)',
              borderColor: 'rgba(56, 189, 248, 0.22)',
              boxShadow: '0 25px 60px -15px rgba(2, 6, 23, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Ambient Cyan Radial Light */}
            <div
              className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, #0d9488 50%, transparent 70%)' }}
            />

            {/* Overline Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-[0.16em] uppercase mb-6 border"
              style={{
                background: 'rgba(6, 182, 212, 0.1)',
                color: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                boxShadow: '0 0 20px -3px rgba(6, 182, 212, 0.25)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>MARITIME FREIGHT FIREWALL • LIVE AIS STREAM</span>
            </motion.div>

            {/* Main Headline — Enhanced for Oceanic Harmony */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mb-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] select-none"
            >
              <span className="block text-slate-100 font-mono tracking-tight text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1">
                Autonomous Freight Defense
              </span>
              <span
                className="block text-transparent bg-clip-text font-sans font-black tracking-tight"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 30%, #2dd4bf 70%, #10b981 100%)',
                  textShadow: '0 0 40px rgba(56, 189, 248, 0.25)',
                }}
              >
                Global Disruption Firewall
              </span>
              <span
                className="block text-transparent bg-clip-text font-mono font-bold text-2xl sm:text-3xl md:text-4xl mt-2 tracking-tight"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #fde047 0%, #f59e0b 50%, #fbbf24 100%)',
                }}
              >
                & Predictive Mode-Swap Engine
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-slate-200/90 leading-relaxed font-normal mb-8"
            >
              Next-generation maritime intelligence platform. Predict port congestions, automate emergency sea-to-rail mode shifts, and govern global logistics with real-time AIS telemetry.
            </motion.p>

            {/* Live Enterprise Scale Ribbon (REAL DATA WIRED) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-cyan-500/20 text-left font-mono"
            >
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">
                  <Radio className="w-3 h-3 text-cyan-400" /> SATELLITE AIS
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  {telemetry ? `${telemetry.total_tracked_vessels}` : '...'}
                </div>
                <div className="text-[10px] text-slate-400">Vessels Monitored</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
                  <Network className="w-3 h-3 text-emerald-400" /> MONITORED PORTS
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  {telemetry ? `${telemetry.total_ports} Hubs` : '50 Hubs'}
                </div>
                <div className="text-[10px] text-slate-400">International Quays</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">
                  <Cpu className="w-3 h-3 text-amber-400" /> ACTIVE BERTHS
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  {telemetry ? `${telemetry.active_berths}` : '...'}
                </div>
                <div className="text-[10px] text-slate-400">Berths in Operation</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-bold uppercase tracking-wider mb-0.5">
                  <BarChart3 className="w-3 h-3 text-sky-400" /> GLOBAL CONGESTION
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  {telemetry ? `${telemetry.avg_global_congestion_pct}%` : '...'}
                </div>
                <div className="text-[10px] text-slate-400">Fleet Average Load</div>
              </div>
            </motion.div>
          </motion.div>



          {/* ======== OPERATIONAL ROLE CARDS SECTION ======== */}
          <div className="w-full max-w-6xl mb-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest text-cyan-300 uppercase bg-cyan-950/50 border border-cyan-500/30 mb-2">
                <span>SECURE ACCESS PLATFORMS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                Select Mission Control Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                Role-based telemetry portals engineered for port commanders, fleet operators & executive dispatchers
              </p>
            </motion.div>

            {/* 3-Column Enterprise Cards Grid */}
            <div className="grid gap-6 md:grid-cols-3 items-stretch">
              {roles.map((role, index) => (
                <RoleCard
                  key={role.role}
                  {...role}
                  onClick={() => handleRoleClick(role.role)}
                  delay={0.75 + index * 0.12}
                />
              ))}
            </div>
          </div>

          {/* ======== ENTERPRISE ARCHITECTURE HIGHLIGHTS STRIP ======== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="w-full max-w-6xl mb-12 p-6 rounded-2xl bg-slate-950/50 border border-cyan-500/15 backdrop-blur-xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-mono">
              <div className="space-y-1.5 border-l-2 border-cyan-500/50 pl-3">
                <div className="text-cyan-400 font-bold text-[11px] tracking-wider">01 // PREDICTIVE SURGE AI</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Monte Carlo models project arrival ripples 5–10 days ahead before bottleneck cascading occurs.
                </p>
              </div>

              <div className="space-y-1.5 border-l-2 border-emerald-500/50 pl-3">
                <div className="text-emerald-400 font-bold text-[11px] tracking-wider">02 // AUTONOMOUS MODE-SWAP</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Calculates instant modal shifts (Sea → Rail / Air Freight) factoring in cargo weight & cold-chain SLA.
                </p>
              </div>

              <div className="space-y-1.5 border-l-2 border-teal-500/50 pl-3">
                <div className="text-teal-400 font-bold text-[11px] tracking-wider">03 // REAL-TIME AIS TELEMETRY</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Sub-5-second satellite feeds capturing vessel draught, speed over ground, heading & waypoint logs.
                </p>
              </div>

              <div className="space-y-1.5 border-l-2 border-amber-500/50 pl-3">
                <div className="text-amber-400 font-bold text-[11px] tracking-wider">04 // QUAY & BERTH TWIN</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Live occupancy diagrams tracking crane assignments, loading progress & terminal turnaround times.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ======== ENTERPRISE FOOTER ======== */}
        <footer className="w-full max-w-7xl pb-8 pt-4 border-t border-cyan-500/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400 font-bold tracking-wider">NAVICORE MARITIME LOGISTICS DEFENSE PLATFORM</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>UN/LOCODE CERTIFIED</span>
            <span>•</span>
            <span>AIS CLASS-A SATELLITE LINK</span>
            <span>•</span>
            <span>&copy; 2026 ALL RIGHTS RESERVED</span>
          </div>
        </footer>
      </div>
    </div>
  );
};