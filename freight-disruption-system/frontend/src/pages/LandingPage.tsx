// frontend/src/pages/LandingPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Anchor, Settings, LogIn, UserPlus } from 'lucide-react';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { TransportAnimation } from '@/components/landing/TransportAnimation';
import { RoleCard } from '@/components/landing/RoleCard';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const roles = [
    {
      title: 'Operations',
      description: 'Real-time monitoring, reroute decisions & executive KPIs',
      icon: Ship,
      color: '#2563EB',
      role: 'operations',
    },
    {
      title: 'Port',
      description: 'Monitor port health, congestion & vessel arrivals',
      icon: Anchor,
      color: '#059669',
      role: 'port',
    },
    {
      title: 'Admin',
      description: 'System management, simulations & validation',
      icon: Settings,
      color: '#7C3AED',
      role: 'admin',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <AnimatedBackground />
      
      {/* Transport Animations */}
      <TransportAnimation />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center"
        >
          {/* Logo/Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
            className="mb-6 flex justify-center"
          >
            <div className="rounded-full bg-gradient-to-br from-maritime-gold to-maritime-amber p-4 shadow-2xl">
              <Ship className="h-16 w-16 text-maritime-deep" strokeWidth={2} />
            </div>
          </motion.div>

          {/* Title */}
          <h1 className="mb-4 text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Global Freight
            </span>
            <br />
            <span className="bg-gradient-to-r from-maritime-gold to-maritime-amber bg-clip-text text-transparent">
              Disruption Firewall
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-lg text-gray-300 md:text-xl">
            Real-time maritime logistics monitoring with AI-powered route optimization
            and Monte Carlo simulations
          </p>

          {/* Stats */}
          <div className="mt-8 flex justify-center gap-8">
            {[
              { value: '<5min', label: 'Decision Time' },
              { value: '2000+', label: 'MC Simulations' },
              { value: '24/7', label: 'Live Monitoring' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-maritime-gold">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Auth Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 flex justify-center gap-4"
          >
            <Button
              onClick={() => navigate('/login')}
              className="bg-maritime-gold hover:bg-maritime-amber text-maritime-deep font-semibold px-8 py-6 text-lg"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
            <Button
              onClick={() => navigate('/register')}
              variant="outline"
              className="border-maritime-gold text-maritime-gold hover:bg-maritime-gold/10 font-semibold px-8 py-6 text-lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Register
            </Button>
          </motion.div>
        </motion.div>

        {/* Role Cards */}
        <div className="w-full max-w-6xl">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-8 text-center text-2xl font-semibold text-white"
          >
            Explore Our Dashboards
          </motion.h2>

          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((role, index) => (
              <RoleCard
                key={role.role}
                {...role}
                onClick={() => navigate('/login')}
                delay={0.6 + index * 0.1}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center text-sm text-gray-400"
        >
          <p>Powered by Monte Carlo Engine • NetworkX • OR-Tools</p>
          <p className="mt-2">Research Project © 2024</p>
        </motion.div>
      </div>
    </div>
  );
};