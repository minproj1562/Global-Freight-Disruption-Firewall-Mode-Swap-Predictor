// frontend/src/context/SimulationContext.tsx
// Shared corridor state across all 3 simulation pages (Scenario Studio, Monte Carlo, Route Optimizer)
// Ensures origin, destination, vessel, disruption template, and market stress preset stay synchronized.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSimulationTemplates } from '@/services/api';

// ── Market Stress Presets ──────────────────────────────────────────────
export type MarketStressPreset = 'normal' | 'peak-congestion' | 'chokepoint-crisis' | 'fuel-shock';

export interface StressPresetConfig {
  id: MarketStressPreset;
  label: string;
  icon: string;
  description: string;
  fuelMin: number;
  fuelMax: number;
  fuelStep: number;
  congestionMin: number;
  congestionMax: number;
  congestionStep: number;
  color: string;
}

export const STRESS_PRESETS: StressPresetConfig[] = [
  {
    id: 'normal',
    label: 'Normal Market (Baseline)',
    icon: '🛡️',
    description: 'Standard quarterly budget. Fuel $580–$640/MT, 1–3 day port wait.',
    fuelMin: 540, fuelMax: 680, fuelStep: 40,
    congestionMin: 20, congestionMax: 50, congestionStep: 10,
    color: '#22c55e',
  },
  {
    id: 'peak-congestion',
    label: 'Peak Season / Congestion Surge',
    icon: '⚡',
    description: 'Holiday peak season. Fuel $650–$720/MT, 4–8 day port queues.',
    fuelMin: 600, fuelMax: 760, fuelStep: 40,
    congestionMin: 50, congestionMax: 85, congestionStep: 10,
    color: '#f59e0b',
  },
  {
    id: 'chokepoint-crisis',
    label: 'Chokepoint Crisis / Canal Detour',
    icon: '🚨',
    description: 'Suez/Red Sea detour scenario. Fuel $750–$850/MT, 8–15 day delays.',
    fuelMin: 700, fuelMax: 900, fuelStep: 50,
    congestionMin: 60, congestionMax: 95, congestionStep: 10,
    color: '#ef4444',
  },
  {
    id: 'fuel-shock',
    label: 'Bunker Fuel Shock (OPEC Supply Cut)',
    icon: '🛢️',
    description: 'OPEC oil supply shock. Fuel $800–$950/MT, 2–4 day port wait.',
    fuelMin: 750, fuelMax: 1000, fuelStep: 50,
    congestionMin: 25, congestionMax: 55, congestionStep: 10,
    color: '#a855f7',
  },
];

// ── Template Types ─────────────────────────────────────────────────────
export interface PortOption {
  id: string;
  name: string;
  fullName?: string;
  country?: string;
}

export interface VesselOption {
  id: string;
  name: string;
  teu?: number;
  type?: string;
}

export interface DisruptionOption {
  id: string;
  name: string;
  severity: string;
  delayDays: number;
  description?: string;
}

export interface SimulationTemplates {
  disruptionTemplates: DisruptionOption[];
  originPorts: PortOption[];
  destinationPorts: PortOption[];
  vessels: VesselOption[];
}

// ── Context Shape ──────────────────────────────────────────────────────
interface SimulationContextValue {
  selectedOrigin: string;
  setSelectedOrigin: (v: string) => void;
  selectedDestination: string;
  setSelectedDestination: (v: string) => void;
  selectedVessel: string;
  setSelectedVessel: (v: string) => void;
  disruptionTemplate: string;
  setDisruptionTemplate: (v: string) => void;

  stressPreset: MarketStressPreset;
  setStressPreset: (v: MarketStressPreset) => void;
  activePresetConfig: StressPresetConfig;

  fuelMin: number; setFuelMin: (v: number) => void;
  fuelMax: number; setFuelMax: (v: number) => void;
  fuelStep: number; setFuelStep: (v: number) => void;
  congestionMin: number; setCongestionMin: (v: number) => void;
  congestionMax: number; setCongestionMax: (v: number) => void;
  congestionStep: number; setCongestionStep: (v: number) => void;
  isCustomRanges: boolean;
  setIsCustomRanges: (v: boolean) => void;

  templates: SimulationTemplates;
  templatesLoaded: boolean;
}

const DEFAULT_TEMPLATES: SimulationTemplates = {
  disruptionTemplates: [
    { id: 'auto-detect', name: '⚡ Auto-Detect Live Corridor Disruptions (Recommended)', severity: 'dynamic', delayDays: 0 },
    { id: 'suez-blockade', name: 'Suez Canal Blockade (Severe Chokepoint Shut)', severity: 'critical', delayDays: 12 },
    { id: 'hormuz-blockade', name: 'Strait of Hormuz Military Blockade & Drone Hazard', severity: 'critical', delayDays: 10 },
    { id: 'panama-drought', name: 'Panama Canal Drought (Draft Restrictions)', severity: 'high', delayDays: 8 },
    { id: 'red-sea-conflict', name: 'Red Sea Geopolitical Armed Threat', severity: 'critical', delayDays: 14 },
    { id: 'uswc-dock-strike', name: 'US West Coast Dockworkers Labor Strike', severity: 'medium', delayDays: 6 },
  ],
  originPorts: [
    { id: 'CNSHA', name: 'Shanghai (CNSHA)', fullName: 'Shanghai (CNSHA) - China', country: 'China' },
    { id: 'INBOM', name: 'Mumbai (INBOM)', fullName: 'Port of Mumbai (INBOM) - India', country: 'India' },
    { id: 'INMUN', name: 'Mundra (INMUN)', fullName: 'Port of Mundra (INMUN) - India', country: 'India' },
    { id: 'SGSIN', name: 'Singapore (SGSIN)', fullName: 'Port of Singapore (SGSIN) - Singapore', country: 'Singapore' },
    { id: 'AEJEA', name: 'Jebel Ali (AEJEA)', fullName: 'Jebel Ali, Dubai (AEJEA) - UAE', country: 'UAE' },
  ],
  destinationPorts: [
    { id: 'NLRTM', name: 'Rotterdam (NLRTM)', fullName: 'Port of Rotterdam (NLRTM) - Netherlands', country: 'Netherlands' },
    { id: 'DEHAM', name: 'Hamburg (DEHAM)', fullName: 'Port of Hamburg (DEHAM) - Germany', country: 'Germany' },
    { id: 'BEANR', name: 'Antwerp (BEANR)', fullName: 'Port of Antwerp (BEANR) - Belgium', country: 'Belgium' },
    { id: 'GBFXT', name: 'Felixstowe (GBFXT)', fullName: 'Port of Felixstowe (GBFXT) - United Kingdom', country: 'United Kingdom' },
    { id: 'USLAX', name: 'Los Angeles (USLAX)', fullName: 'Port of Los Angeles (USLAX) - United States', country: 'United States' },
  ],
  vessels: [
    { id: 'vessel-ever-given', name: 'Ever Given (Ultra Large Container - 20,124 TEU)', teu: 20124 },
    { id: 'vessel-cma-antoine', name: 'CMA CGM Antoine de Saint Exupéry (20,600 TEU)', teu: 20600 },
    { id: 'vessel-bharat-seva', name: 'SCI Bharat Seva (Indian Flagged Panamax - 4,800 TEU)', teu: 4800 },
    { id: 'vessel-maersk-mckinney', name: 'Maersk Mc-Kinney Møller (18,270 TEU)', teu: 18270 },
    { id: 'vessel-msc-oscar', name: 'MSC Oscar (19,224 TEU)', teu: 19224 },
  ],
};

const defaultPreset = STRESS_PRESETS[0];

const SimulationContext = createContext<SimulationContextValue | null>(null);

export const useSimulationContext = (): SimulationContextValue => {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulationContext must be used within <SimulationProvider>');
  return ctx;
};

interface SimulationProviderProps {
  children: React.ReactNode;
  initialOrigin?: string;
  initialDestination?: string;
  initialVessel?: string;
  initialDisruption?: string;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({
  children,
  initialOrigin,
  initialDestination,
  initialVessel,
  initialDisruption,
}) => {
  const [selectedOrigin, setSelectedOrigin] = useState(initialOrigin || 'Shanghai (CNSHA)');
  const [selectedDestination, setSelectedDestination] = useState(initialDestination || 'Rotterdam (NLRTM)');
  const [selectedVessel, setSelectedVessel] = useState(initialVessel || 'Ever Given (Ultra Large Container - 20,124 TEU)');
  const [disruptionTemplate, setDisruptionTemplate] = useState(initialDisruption || '⚡ Auto-Detect Live Corridor Disruptions (Recommended)');

  const [stressPreset, setStressPresetRaw] = useState<MarketStressPreset>('normal');
  const [isCustomRanges, setIsCustomRanges] = useState(false);

  const [fuelMin, setFuelMin] = useState(defaultPreset.fuelMin);
  const [fuelMax, setFuelMax] = useState(defaultPreset.fuelMax);
  const [fuelStep, setFuelStep] = useState(defaultPreset.fuelStep);
  const [congestionMin, setCongestionMin] = useState(defaultPreset.congestionMin);
  const [congestionMax, setCongestionMax] = useState(defaultPreset.congestionMax);
  const [congestionStep, setCongestionStep] = useState(defaultPreset.congestionStep);

  const [templates, setTemplates] = useState<SimulationTemplates>(DEFAULT_TEMPLATES);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  const setStressPreset = useCallback((preset: MarketStressPreset) => {
    setStressPresetRaw(preset);
    setIsCustomRanges(false);
    const cfg = STRESS_PRESETS.find((p) => p.id === preset) || defaultPreset;
    setFuelMin(cfg.fuelMin);
    setFuelMax(cfg.fuelMax);
    setFuelStep(cfg.fuelStep);
    setCongestionMin(cfg.congestionMin);
    setCongestionMax(cfg.congestionMax);
    setCongestionStep(cfg.congestionStep);
  }, []);

  const activePresetConfig = STRESS_PRESETS.find((p) => p.id === stressPreset) || defaultPreset;

  useEffect(() => {
    getSimulationTemplates()
      .then((data) => {
        if (data?.originPorts?.length) {
          setTemplates({
            disruptionTemplates: data.disruptionTemplates || DEFAULT_TEMPLATES.disruptionTemplates,
            originPorts: data.originPorts || DEFAULT_TEMPLATES.originPorts,
            destinationPorts: data.destinationPorts || DEFAULT_TEMPLATES.destinationPorts,
            vessels: data.vessels || DEFAULT_TEMPLATES.vessels,
          });
          setTemplatesLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('SimulationContext: Using default templates:', err);
        setTemplatesLoaded(true);
      });
  }, []);

  const value: SimulationContextValue = {
    selectedOrigin, setSelectedOrigin,
    selectedDestination, setSelectedDestination,
    selectedVessel, setSelectedVessel,
    disruptionTemplate, setDisruptionTemplate,
    stressPreset, setStressPreset,
    activePresetConfig,
    fuelMin, setFuelMin,
    fuelMax, setFuelMax,
    fuelStep, setFuelStep,
    congestionMin, setCongestionMin,
    congestionMax, setCongestionMax,
    congestionStep, setCongestionStep,
    isCustomRanges, setIsCustomRanges,
    templates,
    templatesLoaded,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};
