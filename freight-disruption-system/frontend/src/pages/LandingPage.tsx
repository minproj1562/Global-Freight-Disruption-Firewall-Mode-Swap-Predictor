// frontend/src/pages/LandingPage.tsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ship, Anchor, Settings, ArrowRight, ShieldCheck } from 'lucide-react';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { TransportAnimation } from '@/components/landing/TransportAnimation';
import { RoleCard } from '@/components/landing/RoleCard';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleClick = (role: string) => {
    if (role === 'port') {
      // Direct navigation to dedicated Port Manager Registration & Login
      navigate('/auth/port-manager');
    } else if (role === 'operations') {
      navigate('/dashboard/operations');
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
      description: 'Dedicated Port Manager Portal: Registration, Login & Port Health',
      icon: Anchor,
      color: '#10B981',
      role: 'port',
    },
    {
      title: 'Admin Command',
      description: 'System management, simulations & validation',
      icon: Settings,
      color: '#8B5CF6',
      role: 'admin',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Background - sky, stars, ocean */}
      <AnimatedBackground />

      {/* Transport Animations - planes, ships, trains */}
      <TransportAnimation />

      {/* ======== MAIN CONTENT (z-20 so it sits above everything) ======== */}
      <div className="relative z-20 flex min-h-screen flex-col items-center px-4">

        {/* Top bar - Header nav with direct Port Manager link */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl flex items-center justify-between pt-6 pb-2 px-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-2 shadow-md shadow-amber-500/20 text-slate-950">
              <Ship className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-sm font-bold font-mono text-white tracking-tight block">
                FREIGHT FIREWALL
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-medium tracking-wider block">
                MARITIME LOGISTICS SYSTEM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/port-manager"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-mono font-bold shadow-lg"
            >
              <Anchor className="w-4 h-4 text-emerald-400" />
              Port Manager Reg / Login →
            </Link>
            <Link
              to="/dashboard/ports"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-mono"
            >
              Port Overview (3.1)
            </Link>
          </div>
        </motion.header>

        {/* ======== HERO SECTION ======== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full py-8">
          
          {/* Prominent Port Manager Quick Access Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/60 border border-emerald-500/40 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Anchor className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Port Operations & Terminal Managers Portal
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    EXCLUSIVE FLOW
                  </span>
                </h4>
                <p className="text-xs text-slate-300">
                  Full Manager Registration (Full Name, Employee ID, Email, Mobile, Assigned Port, Username, Password) & Login
                </p>
              </div>
            </div>

            <Link
              to="/auth/port-manager"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all shrink-0 flex items-center gap-1.5"
            >
              Open Port Manager Auth <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-center mb-10"
          >
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mb-5 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
            >
              <span className="relative inline-block">
                <span className="relative bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Global Freight Disruption
                </span>
              </span>
              <br />
              <span className="relative inline-block mt-2">
                <span className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Firewall & Mode-Swap Predictor
                </span>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto max-w-2xl text-base text-gray-300/90 md:text-lg leading-relaxed"
            >
              AI-powered maritime route optimization, port congestion monitoring, and live terminal operations.
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