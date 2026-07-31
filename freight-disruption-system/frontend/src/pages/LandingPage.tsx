// frontend/src/pages/LandingPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Anchor, Settings } from 'lucide-react';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { TransportAnimation } from '@/components/landing/TransportAnimation';
import { RoleCard } from '@/components/landing/RoleCard';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

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

  const roles = [
    {
      title: 'Global Fleet Ops',
      description: 'Real-time vessel tracking, reroute decisions & executive KPIs',
      icon: Ship,
      color: '#3B82F6',
      role: 'operations',
    },
    {
      title: 'Port Operations',
      description: 'Live terminal congestion, vessel arrivals & berth status',
      icon: Anchor,
      color: '#10B981',
      role: 'port',
    },
    {
      title: 'Admin Command',
      description: 'System health monitoring, disruption management & vessel fleet controls',
      icon: Settings,
      color: '#8B5CF6',
      role: 'admin',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-100 font-sans">
      {/* Background - sky, aurora, ocean waves */}
      <AnimatedBackground />

      {/* Transport Animations - planes, ships, trains */}
      <TransportAnimation />

      {/* ======== MAIN CONTENT ======== */}
      <div className="relative z-20 flex min-h-screen flex-col items-center px-4">

        {/* Top bar Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl flex items-center justify-between pt-8 pb-4 px-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-2.5 shadow-lg shadow-amber-500/20 text-slate-950">
              <Ship className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-base font-bold font-mono text-white tracking-tight block">
                FREIGHT FIREWALL
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-medium tracking-wider block">
                MARITIME LOGISTICS SYSTEM
              </span>
            </div>
          </div>
        </motion.header>

        {/* ======== HERO SECTION ======== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-center mb-12 p-8 md:p-12 rounded-3xl bg-slate-950/40 border border-slate-700/40 backdrop-blur-md shadow-2xl shadow-emerald-950/30"
          >
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mb-6 text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl drop-shadow-lg"
            >
              <span className="relative inline-block">
                <span className="relative bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                  Global Freight Disruption
                </span>
              </span>
              <br />
              <span className="relative inline-block mt-3">
                <span className="relative bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  Firewall & Mode-Swap Predictor
                </span>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto max-w-3xl text-base text-slate-200/90 md:text-lg leading-relaxed font-normal drop-shadow"
            >
              AI-powered maritime route optimization, port congestion monitoring, live terminal operations, and automated disruption mitigation.
            </motion.p>
          </motion.div>

          {/* ======== ROLE CARDS ======== */}
          <div className="w-full max-w-5xl mb-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-6 text-center text-xl md:text-2xl font-bold text-white"
            >
              Select Operational Portal
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-3 px-2">
              {roles.map((role, index) => (
                <RoleCard
                  key={role.role}
                  {...role}
                  onClick={() => handleRoleClick(role.role)}
                  delay={0.8 + index * 0.1}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ======== FOOTER ======== */}
        <footer className="w-full pb-6 pt-4 text-center text-xs text-slate-500 font-mono">
          GLOBAL FREIGHT DISRUPTION FIREWALL & PORT MANAGEMENT PLATFORM &copy; 2026
        </footer>
      </div>
    </div>
  );
};