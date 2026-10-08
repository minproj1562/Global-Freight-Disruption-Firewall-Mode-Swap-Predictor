// frontend/src/features/map/FleetSituationMap.tsx
/**
 * FLEET SITUATION MAP
 * 
 * Interactive Mapbox surface displaying monitored fleet positions,
 * navigational headings, route lines, status rings, and controls.
 */

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { RegisteredVessel } from '@/types';
import { useTheme } from '@/shared/hooks/useTheme';
import { 
  Compass, 
  Maximize2, 
  Crosshair, 
  RotateCcw, 
  Layers, 
  Ship, 
  Radio, 
  AlertTriangle 
} from 'lucide-react';

interface FleetSituationMapProps {
  vessels: RegisteredVessel[];
  selectedVessel: RegisteredVessel | null;
  onSelectVessel: (vessel: RegisteredVessel) => void;
  className?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const FleetSituationMap: React.FC<FleetSituationMapProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  className = 'w-full h-full min-h-[460px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ id: string; marker: mapboxgl.Marker }[]>([]);
  const { theme } = useTheme();

  const [is3D, setIs3D] = useState(true);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [45.0, 20.0],
      zoom: 2.5,
      pitch: 24,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync theme
  const prevThemeRef = useRef(theme);
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    const targetStyle = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
    mapRef.current.setStyle(targetStyle);
  }, [theme]);

  // Render Vessel Markers & Situation Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderFleetMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      let hasValidCoords = false;

      vessels.forEach((v) => {
        if (v.current_lat == null || v.current_lon == null) return;
        if (isNaN(v.current_lat) || isNaN(v.current_lon)) return;

        const lngLat: [number, number] = [v.current_lon, v.current_lat];
        bounds.extend(lngLat);
        hasValidCoords = true;

        const isSelected = selectedVessel?.id === v.id;
        const headingDeg = v.heading ?? v.course ?? 0;

        const el = document.createElement('div');
        el.className = 'fleet-situation-marker group cursor-pointer relative';

        const statusColor = v.has_live_ais 
          ? (isSelected ? 'bg-cyan-500 border-white text-slate-950' : 'bg-slate-900 border-cyan-400 text-cyan-400')
          : 'bg-slate-800 border-amber-500/80 text-amber-400';

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${isSelected ? '<div class="absolute -inset-2.5 rounded-full bg-cyan-400/30 animate-ping"></div>' : ''}
            <div class="w-8 h-8 rounded-full border-2 ${statusColor} shadow-lg flex items-center justify-center transition-all group-hover:scale-115">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform: rotate(${headingDeg}deg);">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
            <div class="hidden group-hover:flex absolute bottom-9.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-950/95 text-[11px] font-mono text-white whitespace-nowrap border border-slate-700 shadow-2xl z-40 flex-col items-center">
              <span class="font-bold text-cyan-300">${v.name}</span>
              <span class="text-[9px] text-slate-400">${v.speed ? v.speed + ' kn' : 'Stationary'} · ${v.destination || 'In Transit'}</span>
            </div>
          </div>
        `;

        el.onclick = () => {
          onSelectVessel(v);
        };

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map);

        markersRef.current.push({ id: v.id, marker });
      });

      // If user selected a vessel, smoothly fly to it
      if (selectedVessel && selectedVessel.current_lat != null && selectedVessel.current_lon != null) {
        map.flyTo({
          center: [selectedVessel.current_lon, selectedVessel.current_lat],
          zoom: 5.5,
          pitch: 35,
          duration: 1200,
          essential: true,
        });
      } else if (hasValidCoords && !selectedVessel) {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 6,
          duration: 1000,
        });
      }
    };

    if (map.loaded() || map.isStyleLoaded()) {
      renderFleetMarkers();
    } else {
      map.once('load', renderFleetMarkers);
      map.once('style.load', renderFleetMarkers);
    }
  }, [vessels, selectedVessel]);

  const handleFitFleet = () => {
    if (!mapRef.current) return;
    const bounds = new mapboxgl.LngLatBounds();
    let hasValid = false;
    vessels.forEach((v) => {
      if (v.current_lat != null && v.current_lon != null) {
        bounds.extend([v.current_lon, v.current_lat]);
        hasValid = true;
      }
    });
    if (hasValid) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 6, duration: 900 });
    }
  };

  const handleFocusSelected = () => {
    if (!mapRef.current || !selectedVessel || selectedVessel.current_lat == null || selectedVessel.current_lon == null) return;
    mapRef.current.flyTo({
      center: [selectedVessel.current_lon, selectedVessel.current_lat],
      zoom: 6.2,
      pitch: 40,
      duration: 1000,
      essential: true,
    });
  };

  const handleToggle3D = () => {
    if (!mapRef.current) return;
    const nextPitch = is3D ? 0 : 38;
    setIs3D(!is3D);
    mapRef.current.easeTo({ pitch: nextPitch, duration: 500 });
  };

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-stone-900 shadow-sm">
      <div ref={mapContainerRef} className={className} />

      {/* Floating Tactical Overlay Header */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-stone-200/80 dark:border-slate-800 text-xs font-mono shadow-md">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="font-bold text-slate-800 dark:text-slate-200">FLEET SITUATION SURFACE</span>
        <span className="text-slate-400">·</span>
        <span className="text-cyan-600 dark:text-cyan-400">{vessels.filter(v => v.has_live_ais).length} Active Feeds</span>
      </div>

      {/* Map Interactive Controls Ribbon */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-stone-200/80 dark:border-slate-800 shadow-md">
        <button
          type="button"
          onClick={handleFitFleet}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          title="Fit bounds to all monitored vessels"
        >
          <Maximize2 className="w-3.5 h-3.5 text-cyan-500" />
          <span>Fit Fleet</span>
        </button>

        <button
          type="button"
          onClick={handleFocusSelected}
          disabled={!selectedVessel || selectedVessel.current_lat == null}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          title="Focus camera on inspected vessel"
        >
          <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
          <span>Focus Selected</span>
        </button>

        <button
          type="button"
          onClick={handleToggle3D}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          title="Toggle 2D / 3D Pitch Perspective"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>{is3D ? '2D View' : '3D Pitch'}</span>
        </button>
      </div>

      {/* Legend Ribbon at Bottom Left */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border border-stone-200/80 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span>Active Telemetry</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Dormant / In Port</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
};
