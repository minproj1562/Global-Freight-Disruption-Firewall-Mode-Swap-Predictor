//frontend/src/pages/PortOverviewPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Anchor,
  Globe,
  Ship,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Activity,
  User,
  LogOut,
} from 'lucide-react';
import { EXTENDED_PORTS_DATA, ExtendedPortDetail } from '@/shared/mock/portMockData';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

// Helper to convert Lat/Lon to SVG World Map (x, y) coordinates
const geoToCanvas = (lat: number, lon: number, width: number, height: number) => {
  const x = ((lon + 180) * (width / 360));
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (width * mercN) / (2 * Math.PI);
  return { x: Math.max(20, Math.min(width - 20, x)), y: Math.max(20, Math.min(height - 20, y)) };
};

export const PortOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [hoveredPort, setHoveredPort] = useState<ExtendedPortDetail | null>(null);

  // Filter Ports
  const filteredPorts = EXTENDED_PORTS_DATA.filter((port) => {
    const matchesSearch =
      port.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      port.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      port.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterLevel === 'all' || port.congestion_level === filterLevel;

    return matchesSearch && matchesFilter;
  });

  // Top 6 Ports for 6 Port Health Cards
  const top6HealthCards = EXTENDED_PORTS_DATA.slice(0, 6);

  // Congestion Level Color Utilities
  const getCongestionBadge = (level: string, pct: number) => {
    if (pct < 25 || level === 'low') {
      return {
        bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        gauge: 'stroke-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        mapFill: '#10b981',
      };
    }
    if (pct < 50 || level === 'medium') {
      return {
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
        gauge: 'stroke-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        mapFill: '#f59e0b',
      };
    }
    if (pct < 85 || level === 'high') {
      return {
        bg: 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300',
        dot: 'bg-orange-500',
        gauge: 'stroke-orange-500',
        text: 'text-orange-600 dark:text-orange-400',
        mapFill: '#f97316',
      };
    }
    return {
      bg: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500 animate-ping',
      gauge: 'stroke-rose-500',
      text: 'text-rose-600 dark:text-rose-400',
      mapFill: '#ef4444',
    };
  };

  const mapWidth = 900;
  const mapHeight = 450;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between transition-colors duration-300">
      {/* ========================================================================= */}
      {/* 1. NAV BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-2 shadow-md shadow-amber-500/20 text-slate-950">
            <Anchor className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none">
              PORT OPERATIONS COMMAND
            </h1>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium tracking-wider mt-0.5">
              PAGE 3.1 — GLOBAL PORT OVERVIEW
            </p>
          </div>
        </div>

        {/* Center Tabs Navigation */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Link
            to="/dashboard/ports"
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300"
          >
            Port Overview (Page 3.1)
          </Link>
          <Link
            to="/dashboard/ports/port-rotterdam"
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            Single Port Detail (Page 3.2)
          </Link>
          <Link
            to="/dashboard/operations"
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            Fleet Disruption Map
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/auth/port-manager"
            className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all font-bold"
          >
            <User className="w-3.5 h-3.5" />
            Port Manager Auth
          </Link>
          <ThemeToggle />
          {user && (
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* ========================================================================= */}
        {/* TOP CONTROLS & FILTER BAR */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-md backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Global Port Health & Congestion Index
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold">
                6 KEY PORTS + WORLD MAP
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select any port card or map indicator to open Page 3.2 Single Port Detail.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search port or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none w-48 sm:w-60"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-amber-500 ml-2" />
              {(['all', 'low', 'medium', 'high', 'critical'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-mono capitalize transition-all ${
                    filterLevel === lvl
                      ? 'bg-amber-400 text-slate-950 font-bold shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: 6 PORT HEALTH CARDS */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              PORT HEALTH CARDS (TOP GLOBAL MARITIME HUBS)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Click any card to launch Page 3.2 Single Port Detail
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {top6HealthCards.map((port) => {
              const styles = getCongestionBadge(port.congestion_level, port.congestion_percent);
              const totalBerths = port.berth_capacity;
              const usedBerths = port.active_berths_used;

              return (
                <motion.div
                  key={port.id}
                  whileHover={{ scale: 1.02, translateY: -4 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => navigate(`/dashboard/ports/${port.id}`)}
                  className="cursor-pointer group relative bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/90 hover:border-amber-500/50 rounded-3xl p-5 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {port.code}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{port.country}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors mt-1">
                          {port.name}
                        </h4>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                        {port.status_label}
                      </span>
                    </div>

                    {/* Middle Section: Radial Gauge + Metrics */}
                    <div className="grid grid-cols-12 gap-4 items-center my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60">
                      {/* Radial Congestion Gauge */}
                      <div className="col-span-5 flex flex-col items-center justify-center relative">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            className="stroke-slate-200 dark:stroke-slate-800"
                            strokeWidth="7"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            className={`transition-all duration-1000 ${styles.gauge}`}
                            strokeWidth="7"
                            strokeDasharray={200}
                            strokeDashoffset={200 - (200 * port.congestion_percent) / 100}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-base font-extrabold ${styles.text}`}>
                            {port.congestion_percent}%
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono">CONGESTION</span>
                        </div>
                      </div>

                      {/* Stats Breakdown */}
                      <div className="col-span-7 space-y-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Ship className="w-3.5 h-3.5 text-amber-500" /> Docked Vessels:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {usedBerths}/{totalBerths}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Anchor className="w-3.5 h-3.5 text-amber-500" /> Waiting Queue:
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-300 font-mono">
                            {port.waiting_vessels} ships
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Avg Wait Time:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {port.avg_wait_hours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer CTA */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Lat: {port.latitude.toFixed(2)} | Lon: {port.longitude.toFixed(2)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Single Port Detail (Page 3.2) <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: WORLD MAP COLOR-CODED BY CONGESTION */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                Global Interactive Port Map (Color-Coded Congestion)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pulsing radar points mapped to live port coordinates. Click any node to open Page 3.2.
              </p>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Legend:</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low (&lt;25%)
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate (25-50%)
              </span>
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High (50-85%)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Critical (&gt;85%)
              </span>
            </div>
          </div>

          {/* SVG Map Canvas Container */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-2 min-h-[420px] flex items-center justify-center">
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              className="w-full h-auto max-h-[500px]"
            >
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#cbd5e1" strokeWidth="0.5" className="dark:stroke-slate-800" />
                </pattern>
              </defs>

              <rect width={mapWidth} height={mapHeight} className="fill-slate-100 dark:fill-slate-950" />
              <rect width={mapWidth} height={mapHeight} fill="url(#grid)" opacity="0.5" />

              {/* Equator & Prime Meridian lines */}
              <line x1="0" y1={mapHeight / 2} x2={mapWidth} y2={mapHeight / 2} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4,4" className="dark:stroke-slate-700" />
              <line x1={mapWidth / 2} y1="0" x2={mapWidth / 2} y2={mapHeight} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4,4" className="dark:stroke-slate-700" />

              {/* Continents Outline */}
              <g className="fill-slate-200 stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-800" strokeWidth="1">
                {/* North America */}
                <path d="M 120,80 L 220,70 L 280,130 L 200,220 L 150,180 L 80,120 Z" />
                {/* South America */}
                <path d="M 230,240 L 310,250 L 270,390 L 220,380 L 210,290 Z" />
                {/* Europe */}
                <path d="M 430,70 L 530,60 L 550,130 L 460,150 L 420,110 Z" />
                {/* Africa */}
                <path d="M 420,160 L 520,160 L 550,280 L 480,360 L 420,280 Z" />
                {/* Asia */}
                <path d="M 540,60 L 800,50 L 820,200 L 720,240 L 560,160 Z" />
                {/* Australia */}
                <path d="M 720,280 L 820,280 L 800,370 L 710,350 Z" />
              </g>

              {/* Render Port Nodes */}
              {filteredPorts.map((port) => {
                const { x, y } = geoToCanvas(port.latitude, port.longitude, mapWidth, mapHeight);
                const badge = getCongestionBadge(port.congestion_level, port.congestion_percent);
                const isHovered = hoveredPort?.id === port.id;

                return (
                  <g
                    key={port.id}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/dashboard/ports/${port.id}`)}
                    onMouseEnter={() => setHoveredPort(port)}
                    onMouseLeave={() => setHoveredPort(null)}
                  >
                    {/* Outer Pulsing Ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 18 : 12}
                      fill={badge.mapFill}
                      opacity={port.congestion_percent > 70 ? 0.35 : 0.2}
                      className="animate-ping"
                    />

                    {/* Outer Solid Radar Circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 12 : 8}
                      fill={badge.mapFill}
                      opacity="0.3"
                    />

                    {/* Center Point */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4}
                      fill={badge.mapFill}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />

                    {/* Port Label */}
                    <text
                      x={x + 10}
                      y={y + 4}
                      className="fill-slate-900 dark:fill-slate-100 font-mono text-[10px] font-bold pointer-events-none drop-shadow"
                    >
                      {port.code} ({port.congestion_percent}%)
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Floating Card */}
            {hoveredPort && (
              <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-64 text-xs space-y-2 pointer-events-none">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{hoveredPort.name}</span>
                  <span className="font-mono text-amber-600 dark:text-amber-300 font-bold">{hoveredPort.code}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Congestion</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{hoveredPort.congestion_percent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Wait Time</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{hoveredPort.avg_wait_hours} hours</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Docked Vessels</span>
                    <span className="font-bold text-slate-900 dark:text-white">{hoveredPort.active_berths_used}/{hoveredPort.berth_capacity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Waiting Queue</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{hoveredPort.waiting_vessels} ships</span>
                  </div>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-300 font-mono pt-1 text-center border-t border-slate-200 dark:border-slate-800">
                  Click to open Page 3.2 Single Port Detail →
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 font-mono border-t border-slate-200 dark:border-slate-800">
        GLOBAL FREIGHT DISRUPTION FIREWALL • PAGE 3.1 PORT OVERVIEW &copy; 2026
      </footer>
    </div>
  );
};
