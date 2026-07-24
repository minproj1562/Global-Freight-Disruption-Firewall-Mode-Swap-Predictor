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
    // Navigate to login with role pre-selected
    navigate('/login', { state: { role } });
  };

  const roles = [
    {
      title: 'Operations',
      description: 'Real-time monitoring, reroute decisions & executive KPIs',
      icon: Ship,
      color: '#3B82F6',
      role: 'operations',
    },
    {
      title: 'Port',
      description: 'Monitor port health, congestion & vessel arrivals',
      icon: Anchor,
      color: '#10B981',
      role: 'port',
    },
    {
      title: 'Admin',
      description: 'System management, simulations & validation',
      icon: Settings,
      color: '#8B5CF6',
      role: 'admin',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background - sky, stars, ocean */}
      <AnimatedBackground />

      {/* Transport Animations - planes, ships, trains */}
      <TransportAnimation />

      {/* ======== MAIN CONTENT (z-20 so it sits above everything) ======== */}
      <div className="relative z-20 flex min-h-screen flex-col items-center px-4">

        {/* Top bar - subtle logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex justify-center pt-6 pb-2"
        >
          <img
            src="/reroute-ripple-logo.png"
            alt="Reroute Ripple"
            className="h-14 md:h-16 w-auto opacity-90 drop-shadow-[0_0_12px_rgba(200,164,92,0.25)]"
          />
        </motion.div>

        {/* ======== HERO SECTION ======== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-center mb-12"
          >
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mb-5 text-5xl font-bold leading-tight md:text-6xl lg:text-7xl"
            >
              <span className="relative inline-block">
                <span className="relative bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Global Freight
                </span>
              </span>
              <br />
              <span className="relative inline-block mt-2">
                <span className="relative bg-gradient-to-r from-maritime-gold via-maritime-amber to-yellow-500 bg-clip-text text-transparent">
                  Disruption Firewall
                </span>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto max-w-2xl text-lg text-gray-300/90 md:text-xl leading-relaxed"
            >
              AI-powered route optimization with real-time monitoring and
              <span className="text-maritime-gold font-semibold"> Monte Carlo simulations</span>
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-wrap justify-center gap-6 md:gap-10"
            >
              {[
                { value: '<5min', label: 'Decision Time', icon: '⚡' },
                { value: '2000+', label: 'MC Simulations', icon: '🎲' },
                { value: '24/7', label: 'Live Monitoring', icon: '📡' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + index * 0.1, type: 'spring' }}
                >
                  <div className="text-center bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-xl px-5 py-3 hover:bg-white/[0.08] transition-all duration-300 cursor-default">
                    <div className="text-2xl mb-0.5">{stat.icon}</div>
                    <div className="text-xl font-bold text-maritime-gold">
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* ======== ROLE CARDS ======== */}
          <div className="w-full max-w-5xl mb-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mb-8 text-center text-2xl md:text-3xl font-bold text-white"
            >
              Select Your <span className="text-maritime-gold">Dashboard</span>
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-3 px-2">
              {roles.map((role, index) => (
                <RoleCard
                  key={role.role}
                  {...role}
                  onClick={() => handleRoleClick(role.role)}
                  delay={1.3 + index * 0.12}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ======== FOOTER - always visible above waves ======== */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="w-full pb-6 pt-4 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/[0.08] rounded-full px-5 py-2.5">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Monte Carlo Engine
              </span>
              <span className="text-gray-600">•</span>
              <span>NetworkX</span>
              <span className="text-gray-600">•</span>
              <span>OR-Tools</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Research Project © 2025
          </p>
        </motion.footer>
      </div>
    </div>
  );
};