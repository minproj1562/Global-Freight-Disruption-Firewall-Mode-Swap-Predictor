// frontend/src/pages/OperationsDashboard.tsx
// Flagship Operations Command Center — Live Global Freight Disruption Firewall & Mode-Swap Predictor
// FASTAPI REPLACEMENT POINT: Replace mock dataset imports with live REST & WebSocket hooks:
// REST: GET /api/v1/vessels, GET /api/v1/ports, GET /api/v1/disruptions, GET /api/v1/routes, GET /api/v1/kpis
// WEBSOCKET: ws://backend:8000/api/v1/ws/telemetry

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, User, LogOut, Layers, X, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { PortManagerSidebar } from '@/components/port-manager/PortManagerSidebar';
import { MapView } from '../features/map/MapView';
import { MapSearch } from '../features/map/MapSearch';
import { MapToolbar, LayerVisibilityState } from '../features/map/MapToolbar';
import { VesselTypeFilters } from '../features/map/VesselTypeFilters';
import { ReplayControlBar } from '../features/map/ReplayControlBar';
import { VesselQuickPopup } from '../features/map/VesselQuickPopup';
import { VesselDetailPanel } from '../features/map/VesselDetailPanel';
import { PortDetailPanel } from '../features/map/PortDetailPanel';
import { KPIBar } from '../features/kpis/KPIBar';
import { ConnectionIndicator } from '../shared/components/ConnectionIndicator';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { RerouteModal } from '../shared/components/RerouteModal';
import { Vessel, Port, SearchResult, VesselType } from '../types';
import {
  MOCK_VESSELS,
  MOCK_PORTS,
  MOCK_DISRUPTIONS,
  MOCK_ROUTES,
  MOCK_KPIS,
  MOCK_SECONDARY_INFRASTRUCTURE,
} from '../shared/mock/mockData';

export const OperationsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();

  // Layer Visibility State
  const [layers, setLayers] = useState<LayerVisibilityState>({
    vessels: true,
    ports: true,
    disruptions: true,
    routes: true,
    vesselNames: true,
    secondaryInfra: false,
  });

  // Filter State
  const [selectedVesselTypes, setSelectedVesselTypes] = useState<VesselType[]>([]);

  // Toolbar Tab & Panel State
  const [activeToolbarTab, setActiveToolbarTab] = useState<'none' | 'search' | 'layers' | 'filters' | 'replay'>('none');

  // Replay Control State
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(100);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4>(1);

  // Selection & Details State
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [quickPopupVessel, setQuickPopupVessel] = useState<Vessel | null>(null);
  const [quickPopupPoint, setQuickPopupPoint] = useState<{ x: number; y: number } | null>(null);
  const [rerouteModalVessel, setRerouteModalVessel] = useState<Vessel | null>(null);

  // Toggle single map layer
  const handleToggleLayer = (layerKey: keyof LayerVisibilityState) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Toggle single vessel type filter
  const handleToggleVesselType = (type: VesselType) => {
    setSelectedVesselTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Replay playback interval timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setReplayProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1 * replaySpeed;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, replaySpeed]);

  // Handle Search Result Selection
  const handleSelectSearchResult = (result: SearchResult) => {
    if (result.type === 'vessel') {
      const vessel = MOCK_VESSELS.find((v) => v.id === result.id) || (result.item as Vessel);
      setSelectedVessel(vessel);
      setSelectedPort(null);
      setQuickPopupVessel(vessel);
      setQuickPopupPoint({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    } else if (result.type === 'port') {
      const port = MOCK_PORTS.find((p) => p.id === result.id) || (result.item as Port);
      setSelectedPort(port);
      setSelectedVessel(null);
    }
  };

  // Get matching route for selected vessel
  const selectedRoute = selectedVessel
    ? MOCK_ROUTES.find((r) => r.vessel_id === selectedVessel.id)
    : null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <PortManagerSidebar />

      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR / NAV HEADER */}
      {/* ========================================================================= */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 shadow-lg ml-16">
        {/* Left Branding & Back to Port Dashboard */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/ports')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-mono font-bold transition-all shadow-sm"
            title="Return to Port Manager Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Port Dashboard</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-3 border-l border-slate-800 pl-3">
            <div className="rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-2 shadow-md shadow-amber-500/20 text-slate-950">
              <Ship className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-mono text-white tracking-tight leading-none">
                FREIGHT FIREWALL
              </h1>
              <p className="text-[10px] text-amber-400 font-mono font-medium tracking-wider mt-0.5">
                MODE-SWAP PREDICTOR • LIVE MAP
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search Bar & Connection Status */}
        <div className="flex items-center gap-3">
          <MapSearch
            vessels={MOCK_VESSELS}
            ports={MOCK_PORTS}
            disruptions={MOCK_DISRUPTIONS}
            onSelectResult={handleSelectSearchResult}
            className="hidden md:block"
          />
          <ConnectionIndicator className="hidden sm:flex" />
        </div>

        {/* Right Tools & User Profile */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* User Role Badge & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-white font-semibold">{user?.name || 'Operator'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                {role || 'Operations'}
              </span>
            </div>

            <button
              onClick={logout}
              type="button"
              title="Sign Out of Command Center"
              aria-label="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search & Status Bar (visible < sm) */}
      <div className="sm:hidden absolute top-14 left-0 right-0 z-25 p-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <MapSearch
          vessels={MOCK_VESSELS}
          ports={MOCK_PORTS}
          disruptions={MOCK_DISRUPTIONS}
          onSelectResult={handleSelectSearchResult}
          className="w-full"
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING KPI BAR (TOP SUB-HEADER) */}
      {/* ========================================================================= */}
      <div className="absolute top-16 sm:top-20 left-4 right-4 z-20 pointer-events-none flex justify-center">
        <KPIBar kpis={MOCK_KPIS} className="pointer-events-auto" />
      </div>

      {/* ========================================================================= */}
      {/* 3. FULLSCREEN MAPBOX CANVAS */}
      {/* ========================================================================= */}
      <main className="w-full h-full">
        <MapView
          vessels={MOCK_VESSELS}
          ports={MOCK_PORTS}
          disruptions={MOCK_DISRUPTIONS}
          routes={MOCK_ROUTES}
          secondaryInfra={MOCK_SECONDARY_INFRASTRUCTURE}
          layers={layers}
          selectedVesselTypeFilters={selectedVesselTypes}
          selectedVessel={selectedVessel}
          selectedPort={selectedPort}
          onSelectVessel={(vessel) => {
            setSelectedVessel(vessel);
            setSelectedPort(null);
          }}
          onSelectPort={(port) => {
            setSelectedPort(port);
            setSelectedVessel(null);
          }}
          onOpenVesselQuickPopup={(vessel, point) => {
            setQuickPopupVessel(vessel);
            setQuickPopupPoint(point);
          }}
          replayProgress={replayProgress}
        />
      </main>

      {/* ========================================================================= */}
      {/* 4. EXPANDABLE FLOATING TOOLBAR (LEFT SIDE) */}
      {/* ========================================================================= */}
      <div className="absolute left-4 top-36 sm:top-44 z-20 hidden md:block">
        <MapToolbar
          activeTab={activeToolbarTab}
          onTabChange={setActiveToolbarTab}
          layers={layers}
          onToggleLayer={handleToggleLayer}
        />
      </div>

      {/* Expanded Filters Panel (When Filter Tab Clicked in Toolbar) */}
      <AnimatePresence>
        {activeToolbarTab === 'filters' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-16 top-44 z-25 glass-panel rounded-2xl p-4 border border-slate-700/80 shadow-2xl w-72"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-bold font-mono text-amber-400">FILTER BY VESSEL TYPE</span>
              <button onClick={() => setActiveToolbarTab('none')} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <VesselTypeFilters
              selectedTypes={selectedVesselTypes}
              onToggleType={handleToggleVesselType}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Toolbar Trigger Button (< md) */}
      <div className="md:hidden absolute left-4 top-36 z-20">
        <button
          onClick={() => setActiveToolbarTab(activeToolbarTab === 'none' ? 'layers' : 'none')}
          className="p-3 rounded-2xl glass-panel border border-slate-700 text-amber-400 shadow-xl"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. FLOATING REPLAY CONTROL BAR (BOTTOM CENTER) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {(activeToolbarTab === 'replay' || replayProgress < 100) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
            <ReplayControlBar
              isPlaying={isPlaying}
              playbackProgress={replayProgress}
              speed={replaySpeed}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={setReplayProgress}
              onChangeSpeed={(spd: number) => setReplaySpeed(spd as 1 | 2 | 4)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. QUICK INFO WINDOW POPUP (SINGLE CLICK ON VESSEL) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {quickPopupVessel && quickPopupPoint && (
          <VesselQuickPopup
            vessel={quickPopupVessel}
            position={quickPopupPoint}
            onClose={() => setQuickPopupVessel(null)}
            onViewFullDetails={(vessel) => {
              setSelectedVessel(vessel);
              setQuickPopupVessel(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 7. SLIDE-IN DETAIL PANELS (RIGHT SIDE / RESPONSIVE BOTTOM SHEET) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedVessel && (
          <VesselDetailPanel
            vessel={selectedVessel}
            route={selectedRoute}
            onClose={() => setSelectedVessel(null)}
            onOpenReroute={(vessel) => setRerouteModalVessel(vessel)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPort && (
          <PortDetailPanel
            port={selectedPort}
            onClose={() => setSelectedPort(null)}
          />
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. MODE-SWAP REROUTE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {rerouteModalVessel && (
          <RerouteModal
            vessel={rerouteModalVessel}
            route={MOCK_ROUTES.find((r) => r.vessel_id === rerouteModalVessel.id) || null}
            onClose={() => setRerouteModalVessel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
