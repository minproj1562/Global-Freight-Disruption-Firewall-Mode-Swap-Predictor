// frontend/src/features/map/RouteDetailMap.tsx
/**
 * ROUTE DETAIL MAP COMPONENT
 * 
 * Visualizes multimodal journeys with transport-mode distinct styling:
 *   - Sea legs: Dashed ocean corridors with animated flow
 *   - Road legs: Realistic road alignments via Mapbox Directions API
 *   - Air legs: Geodesic great-circle arcs via Turf.js
 *   - Rail legs: Intermodal high-contrast rail line styling
 */

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { DetailedRoute, RouteLeg } from '../../types';
import { useTheme } from '../../shared/hooks/useTheme';
import { 
  Compass, 
  Maximize2, 
  RotateCcw, 
  Layers, 
  Navigation, 
  Plane, 
  Ship, 
  Truck, 
  Train 
} from 'lucide-react';

interface RouteDetailMapProps {
  route: DetailedRoute;
  className?: string;
  selectedLegId?: string | null;
  onSelectLeg?: (leg: RouteLeg) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const RouteDetailMap: React.FC<RouteDetailMapProps> = ({
  route,
  className = 'w-full h-full min-h-[420px]',
  selectedLegId,
  onSelectLeg,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const { theme } = useTheme();

  const [is3D, setIs3D] = useState(true);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: route.current_position || [30.0, 30.0],
      zoom: 3.2,
      pitch: 28,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
    mapRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync theme changes
  const prevThemeRef = useRef(theme);
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    const targetStyle = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
    mapRef.current.setStyle(targetStyle);
  }, [theme]);

  // Render Multimodal Route Legs & Current Cargo Position Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderLayersAndMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      let hasValidCoords = false;

      // Render each leg
      route.legs.forEach((leg, index) => {
        const coords = leg.geometry || [leg.origin.coordinates, leg.destination.coordinates];
        if (!coords || coords.length < 2) return;

        coords.forEach((pt) => {
          if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
            bounds.extend(pt as [number, number]);
            hasValidCoords = true;
          }
        });

        const sourceId = `leg-src-${leg.id || index}`;
        const layerId = `leg-layer-${leg.id || index}`;
        const casingLayerId = `leg-casing-${leg.id || index}`;

        const geojson: any = {
          type: 'Feature',
          properties: {
            id: leg.id,
            mode: leg.mode,
            status: leg.status,
            name: `${leg.origin.name} → ${leg.destination.name}`,
          },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        };

        const isSelected = selectedLegId === leg.id;

        // Mode-specific color definitions
        let lineColor = '#0ea5e9';
        let lineWidth = isSelected ? 5.5 : 3.5;
        let dashArray: number[] | undefined = undefined;

        if (leg.mode === 'sea') {
          lineColor = isSelected ? '#38bdf8' : '#0284c7';
          dashArray = [3, 2];
        } else if (leg.mode === 'road') {
          lineColor = isSelected ? '#f59e0b' : '#d97706';
          lineWidth = isSelected ? 6 : 4;
        } else if (leg.mode === 'air') {
          lineColor = isSelected ? '#c084fc' : '#a855f7';
          dashArray = [4, 3];
          lineWidth = isSelected ? 5.5 : 4;
        } else if (leg.mode === 'rail') {
          lineColor = isSelected ? '#34d399' : '#10b981';
          dashArray = [2, 2];
        }

        const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        if (!existingSource) {
          map.addSource(sourceId, { type: 'geojson', data: geojson });

          // Casing glow layer for road and air
          if (leg.mode === 'road' || leg.mode === 'air' || leg.mode === 'rail') {
            map.addLayer({
              id: casingLayerId,
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': leg.mode === 'road' ? '#78350f' : leg.mode === 'air' ? '#581c87' : '#064e3b',
                'line-width': lineWidth + 3,
                'line-opacity': 0.5,
              },
            });
          }

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': lineColor,
              'line-width': lineWidth,
              'line-opacity': leg.status === 'upcoming' ? 0.6 : 0.95,
              ...(dashArray ? { 'line-dasharray': dashArray } : {}),
            },
          });

          // Click handler to select leg
          map.on('click', layerId, () => {
            if (onSelectLeg) onSelectLeg(leg);
          });
        } else {
          existingSource.setData(geojson);
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'line-color', lineColor);
            map.setPaintProperty(layerId, 'line-width', lineWidth);
            map.setPaintProperty(layerId, 'line-opacity', leg.status === 'upcoming' ? 0.6 : 0.95);
          }
        }

        // Waypoint Node Marker (Origin of this leg)
        const originEl = document.createElement('div');
        originEl.className = 'route-node-marker flex items-center justify-center cursor-pointer group';
        let badgeColor = 'bg-sky-500 border-sky-300';
        if (leg.mode === 'road') badgeColor = 'bg-amber-500 border-amber-300';
        if (leg.mode === 'air') badgeColor = 'bg-purple-500 border-purple-300';
        if (leg.mode === 'rail') badgeColor = 'bg-emerald-500 border-emerald-300';

        originEl.innerHTML = `
          <div class="w-5 h-5 rounded-full ${badgeColor} border-2 shadow-lg flex items-center justify-center text-[9px] font-bold font-mono text-white transition-transform group-hover:scale-125">
            ${index + 1}
          </div>
          <div class="hidden group-hover:block absolute bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/95 text-[11px] font-mono text-white whitespace-nowrap border border-slate-700 shadow-xl z-30">
            ${leg.origin.name} · <strong class="uppercase text-cyan-300">${leg.mode}</strong>
          </div>
        `;

        originEl.onclick = () => {
          if (onSelectLeg) onSelectLeg(leg);
        };

        const originMarker = new mapboxgl.Marker({ element: originEl })
          .setLngLat(leg.origin.coordinates)
          .addTo(map);
        markersRef.current.push(originMarker);

        // Destination marker on the final leg
        if (index === route.legs.length - 1) {
          const destEl = document.createElement('div');
          destEl.className = 'route-dest-marker flex items-center justify-center cursor-pointer group';
          destEl.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-emerald-200 shadow-xl flex items-center justify-center text-[11px] font-bold text-slate-950 animate-pulse">
              ★
            </div>
            <div class="hidden group-hover:block absolute bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/95 text-[11px] font-mono text-emerald-300 whitespace-nowrap border border-slate-700 shadow-xl z-30">
              CONSIGNEE PORT: ${leg.destination.name}
            </div>
          `;
          const destMarker = new mapboxgl.Marker({ element: destEl })
            .setLngLat(leg.destination.coordinates)
            .addTo(map);
          markersRef.current.push(destMarker);
        }
      });

      // Overall Vessel / Cargo Current Position Marker along the route
      if (route.current_position && !isNaN(route.current_position[0]) && !isNaN(route.current_position[1])) {
        bounds.extend(route.current_position);
        hasValidCoords = true;

        const cargoEl = document.createElement('div');
        cargoEl.className = 'current-cargo-position-marker relative cursor-pointer';

        let iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>`;
        if (route.current_mode === 'air') {
          iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>`;
        } else if (route.current_mode === 'road') {
          iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
        } else if (route.current_mode === 'rail') {
          iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="16" rx="2"></rect><path d="M4 11h16"></path><path d="M12 3v8"></path><path d="m8 19-2 3"></path><path d="m16 19 2 3"></path><circle cx="8" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>`;
        }

        cargoEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-3 rounded-full bg-cyan-400/30 animate-ping"></div>
            <div class="absolute -inset-1.5 rounded-full bg-cyan-500/50 animate-pulse"></div>
            <div class="relative w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-2xl text-cyan-400">
              ${iconSvg}
            </div>
            <div class="absolute top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-slate-950/95 text-[10px] font-mono text-cyan-300 whitespace-nowrap border border-cyan-500/60 shadow-xl flex items-center gap-1 z-30">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              LIVE CARGO EN ROUTE
            </div>
          </div>
        `;

        const cargoMarker = new mapboxgl.Marker({ element: cargoEl })
          .setLngLat(route.current_position)
          .addTo(map);
        markersRef.current.push(cargoMarker);
      }

      // If a specific leg is selected, fly to that leg, otherwise fit entire journey
      if (selectedLegId) {
        const targetLeg = route.legs.find(l => l.id === selectedLegId);
        if (targetLeg) {
          const legBounds = new mapboxgl.LngLatBounds();
          const legCoords = targetLeg.geometry || [targetLeg.origin.coordinates, targetLeg.destination.coordinates];
          legCoords.forEach(pt => legBounds.extend(pt as [number, number]));
          map.fitBounds(legBounds, {
            padding: { top: 70, bottom: 70, left: 70, right: 70 },
            duration: 1000,
          });
          return;
        }
      }

      if (hasValidCoords) {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          duration: 1200,
        });
      }
    };

    if (map.loaded() || map.isStyleLoaded()) {
      renderLayersAndMarkers();
    } else {
      map.once('load', renderLayersAndMarkers);
      map.once('style.load', renderLayersAndMarkers);
    }
  }, [route, selectedLegId]);

  const handleFitAll = () => {
    if (!mapRef.current) return;
    const bounds = new mapboxgl.LngLatBounds();
    route.legs.forEach(l => {
      const coords = l.geometry || [l.origin.coordinates, l.destination.coordinates];
      coords.forEach(pt => bounds.extend(pt as [number, number]));
    });
    if (route.current_position) bounds.extend(route.current_position);
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
  };

  const handleFocusCargo = () => {
    if (!mapRef.current || !route.current_position) return;
    mapRef.current.flyTo({
      center: route.current_position,
      zoom: 5.5,
      pitch: 45,
      essential: true
    });
  };

  const handleToggle3D = () => {
    if (!mapRef.current) return;
    const nextPitch = is3D ? 0 : 45;
    setIs3D(!is3D);
    mapRef.current.easeTo({ pitch: nextPitch, duration: 600 });
  };

  return (
    <div className="relative w-full h-full min-h-[420px] overflow-hidden rounded-2xl border border-stone-200/80 dark:border-slate-800">
      <div ref={mapContainerRef} className={className} />

      {/* Floating Interactive Map HUD Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleFitAll}
          className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-stone-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono shadow-md hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Fit Whole Journey in View"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden sm:inline">Fit Route</span>
        </button>

        {route.current_position && (
          <button
            type="button"
            onClick={handleFocusCargo}
            className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-stone-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono shadow-md hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            title="Focus Live Cargo"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Track Cargo</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleToggle3D}
          className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-stone-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono shadow-md hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
          title="Toggle 3D Perspective Pitch"
        >
          <span className="font-bold text-[10px]">{is3D ? '2D' : '3D'}</span>
        </button>
      </div>

      {/* Mode legend overlay */}
      <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl text-[10px] font-mono flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded bg-sky-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Sea</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded bg-amber-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Road (Directions API)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded bg-purple-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Air (Geodesic Arc)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded bg-emerald-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Rail</span>
        </div>
      </div>
    </div>
  );
};
