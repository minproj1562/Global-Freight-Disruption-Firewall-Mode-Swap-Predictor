// src/pages/PortOverviewPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePortStore } from '../store/portStore';
import { useAuthStore } from '../store/authStore';
import { WorldPortMap } from '../components/port/WorldPortMap';
import { PortHealthCard } from '../components/port/PortHealthCard';
import {
  Anchor,
  Search,
  Filter,
  Activity,
  ShieldAlert,
  Ship,
  Clock,
  LogOut,
  UserCheck,
  Building,
  RefreshCw,
} from 'lucide-react';

export const PortOverviewPage: React.FC = () => {
  const { ports, selectPort } = usePortStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');

  // Navigate to Page 3.2 (Single Port Detail)
  const handleSelectPort = (portId: string) => {
    selectPort(portId);
    navigate(`/dashboard/port/${portId}`);
  };

  const filteredPorts = ports.filter((port) => {
    const matchesSearch =
      port.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      port.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      port.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion = regionFilter === 'ALL' || port.region === regionFilter;

    return matchesSearch && matchesRegion;
  });

  // Calculate global summary stats across the 6 ports
  const avgCongestion = Math.round(
    ports.reduce((acc, p) => acc + p.congestionRate, 0) / ports.length
  );
  const totalDocked = ports.reduce((acc, p) => acc + p.dockedVessels, 0);
  const totalWaiting = ports.reduce((acc, p) => acc + p.waitingVessels, 0);
  const activeDisruptionCount = ports.reduce((acc, p) => acc + p.activeDisruptions.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-400 selection:text-slate-950 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-white/10 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl text-slate-950 shadow-lg">
              <Anchor className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  MARITIME LOGISTICS FIREWALL
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                  Page 3.1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Global Port Overview & Real-Time Congestion Telemetry
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-2xl text-xs">
                <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-extrabold">
                  {user.name ? user.name.charAt(0) : 'P'}
                </div>
                <div>
                  <span className="font-bold text-white block truncate max-w-[140px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-amber-300 block">
                    {user.employeeId || 'Port Manager'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2.5 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Banner Summary Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-white/15 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
            <span className="text-xs text-slate-400 font-medium block">Monitored Global Ports</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-extrabold text-white">6 Ports</span>
              <Building className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/15 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
            <span className="text-xs text-slate-400 font-medium block">Average Congestion</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-extrabold text-amber-300">{avgCongestion}%</span>
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/15 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
            <span className="text-xs text-slate-400 font-medium block">Docked / Waiting Ships</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-extrabold text-white">
                <span className="text-emerald-400">{totalDocked}</span> /{' '}
                <span className="text-amber-400">{totalWaiting}</span>
              </span>
              <Ship className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/15 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
            <span className="text-xs text-slate-400 font-medium block">Active Disruption Alerts</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-extrabold text-red-400">{activeDisruptionCount}</span>
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>

        {/* Section 1: Interactive World Map color-coded by congestion */}
        <section>
          <WorldPortMap ports={ports} onSelectPort={handleSelectPort} />
        </section>

        {/* Section 2: 6 "Port Health Cards" Grid */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-amber-400" />
                6 Global Port Health Cards
              </h2>
              <p className="text-xs text-slate-400">
                Click on any card to dive into Page 3.2 Single Port Telemetry, Berth Diagrams & 72h Arrivals Schedule.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search port or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPorts.map((port) => (
              <PortHealthCard key={port.id} port={port} onSelectPort={handleSelectPort} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
