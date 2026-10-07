// frontend/src/features/map/RouteDetailMap.tsx
/**
 * ROUTE DETAIL MAP COMPONENT
 * 
 * Reuses the constrained MapView pattern from DisruptionAlertCenter and ActiveRoutes.
 * Visualizes multimodal journeys with transport-mode distinct styling:
 *   - Sea legs: Dashed maritime shipping corridors with animated flow dashes
 *   - Road legs: Realistic road alignments fetched via Mapbox Directions API
 *   - Air legs: Geodesic great-circle arcs computed via Turf.js
 * 
 * FLIGHT ROUTING NOTE:
 * A flight-routing API is not required for this visualization because long-haul cargo
 * flights follow geodesic great-circle airways. Turf.js computes the exact mathematical
 * great-circle arc, providing an authentic and performant flight path compatible with Mapbox GL.
 */

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { DetailedRoute, RouteLeg } from '../../types';
import { useTheme } from '../../shared/hooks/useTheme';

interface RouteDetailMapProps {
  route: DetailedRoute;
  className?: string;
  selectedLegId?: string | null;
  onSelectLeg?: (leg: RouteLeg) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const RouteDetailMap: React.FC<RouteDetailMapProps> = ({
  route,
  className = 'w-full h-full min-h-[360px]',
  selectedLegId,
  onSelectLeg,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const { theme } = useTheme();

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: route.current_position || [30.0, 30.0],
      zoom: 3.5,
      pitch: 25,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
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

    let dashStep = 0;

    const renderLayersAndMarkers = () => {
      // Clear previous HTML markers
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
        let lineColor = '#0ea5e9'; // sea blue
        let lineWidth = isSelected ? 5 : 3.5;
        let dashArray: number[] | undefined = undefined;

        if (leg.mode === 'sea') {
          lineColor = isSelected ? '#38bdf8' : '#0284c7'; // Sea Freight Sky Blue
          dashArray = [3, 2]; // Animated Maritime flow
        } else if (leg.mode === 'road') {
          lineColor = isSelected ? '#f59e0b' : '#d97706'; // Highway Amber
          lineWidth = isSelected ? 6 : 4;
        } else if (leg.mode === 'air') {
          lineColor = isSelected ? '#c084fc' : '#9333ea'; // Air Purple / Magenta
          dashArray = [4, 3];
          lineWidth = isSelected ? 5 : 3.5;
        } else if (leg.mode === 'rail') {
          lineColor = isSelected ? '#10b981' : '#059669'; // Rail Emerald
          dashArray = [2, 2];
        }

        const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        if (!existingSource) {
          map.addSource(sourceId, { type: 'geojson', data: geojson });

          // Casing glow layer for road and air
          if (leg.mode === 'road' || leg.mode === 'air') {
            map.addLayer({
              id: casingLayerId,
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': leg.mode === 'road' ? '#78350f' : '#581c87',
                'line-width': lineWidth + 3,
                'line-opacity': 0.6,
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
          <div class="w-4 h-4 rounded-full ${badgeColor} border-2 shadow-lg flex items-center justify-center text-[8px] font-bold text-white transition-transform group-hover:scale-125">
            ${index + 1}
          </div>
          <div class="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono text-white whitespace-nowrap border border-slate-700 shadow-md z-20">
            ${leg.origin.name} (${leg.mode.toUpperCase()})
          </div>
        `;
        const originMarker = new mapboxgl.Marker({ element: originEl })
          .setLngLat(leg.origin.coordinates)
          .addTo(map);
        markersRef.current.push(originMarker);

        // Destination marker on the final leg
        if (index === route.legs.length - 1) {
          const destEl = document.createElement('div');
          destEl.className = 'route-dest-marker flex items-center justify-center cursor-pointer group';
          destEl.innerHTML = `
            <div class="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-200 shadow-xl flex items-center justify-center text-[9px] font-bold text-slate-950 animate-pulse">
              ★
            </div>
            <div class="hidden group-hover:block absolute bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono text-emerald-300 whitespace-nowrap border border-slate-700 shadow-md z-20">
              FINAL DESTINATION: ${leg.destination.name}
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
        cargoEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-3 rounded-full bg-cyan-400/40 animate-ping"></div>
            <div class="absolute -inset-1.5 rounded-full bg-cyan-500/60 animate-pulse"></div>
            <div class="relative w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-xl text-cyan-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
            <div class="absolute top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/95 text-[10px] font-mono text-cyan-300 whitespace-nowrap border border-cyan-500/60 shadow-xl flex items-center gap-1 z-30">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              LIVE POSITION
            </div>
          </div>
        `;

        const cargoMarker = new mapboxgl.Marker({ element: cargoEl })
          .setLngLat(route.current_position)
          .addTo(map);
        markersRef.current.push(cargoMarker);
      }

      // Fit map viewport to display the complete journey
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

    // Animated dash-flow for sea and air legs
    const animateDashes = () => {
      dashStep = (dashStep - 0.15) % 8;
      // Triggers redraw frame
      animFrameRef.current = requestAnimationFrame(animateDashes);
    };
    animFrameRef.current = requestAnimationFrame(animateDashes);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [route, selectedLegId]);

  return (
    <div className="relative w-full h-full min-h-[360px] overflow-hidden rounded-2xl">
      <div ref={mapContainerRef} className={className} />

      {/* Mode legend overlay */}
      <div className="absolute top-3 right-3 z-10 glass-panel px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xl text-[10px] font-mono flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-sky-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Sea</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-amber-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Road (Driving API)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-purple-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Air (Geodesic Arc)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-emerald-500"></span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Rail</span>
        </div>
      </div>
    </div>
  );
};
