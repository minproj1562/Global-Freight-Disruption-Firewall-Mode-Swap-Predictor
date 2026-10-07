import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { useTheme } from '@/shared/hooks/useTheme';
import { RegionalExposure } from '@/types/executiveSummaryTypes';
import { 
  Globe2, 
  MapPin, 
  Layers, 
  RotateCcw, 
  Ship, 
  DollarSign,
  Maximize2
} from 'lucide-react';

interface Props {
  data: RegionalExposure[];
}

export const ExposureMap: React.FC<Props> = ({ data }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();
  const [selectedRegion, setSelectedRegion] = useState<RegionalExposure | null>(null);

  const totalCargoExposure = data.reduce((acc, curr) => acc + curr.cargoValueAtRisk, 0);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

    const mapStyle = theme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [40, 20],
      zoom: 1.6,
      attributionControl: false,
    });

    map.scrollZoom.disable();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: data.map(region => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: region.coordinates
          },
          properties: {
            code: region.regionCode,
            name: region.regionName,
            exposure: region.cargoValueAtRisk,
            routes: region.affectedRoutes
          }
        }))
      };

      map.addSource('exposure-data', {
        type: 'geojson',
        data: geojson
      });

      // Outer Glow Pulse Layer
      map.addLayer({
        id: 'exposure-glow',
        type: 'circle',
        source: 'exposure-data',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'exposure'],
            0, 16,
            20000000, 48
          ],
          'circle-color': '#38bdf8',
          'circle-opacity': 0.22,
          'circle-blur': 0.8
        }
      });

      // Core Choropleth Circles (Single-Hue Sky/Blue scale)
      map.addLayer({
        id: 'exposure-circles',
        type: 'circle',
        source: 'exposure-data',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'exposure'],
            0, 10,
            20000000, 34
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'exposure'],
            0, '#bae6fd',
            5000000, '#38bdf8',
            10000000, '#0284c7',
            16000000, '#0369a1',
            20000000, '#0c4a6e'
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12
      });

      map.on('mouseenter', 'exposure-circles', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
          const { name, exposure, routes } = feature.properties as any;
          const formattedExposure = `$${(exposure / 1000000).toFixed(1)}M`;

          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          popup.setLngLat(coordinates)
            .setHTML(`
              <div style="background: #0f172a; color: #f8fafc; padding: 10px 14px; border-radius: 10px; font-family: sans-serif; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155;">
                <div style="font-weight: 700; font-size: 13px; color: #38bdf8; margin-bottom: 4px;">${name}</div>
                <div style="font-size: 12px; margin-bottom: 2px;">Cargo at Risk: <strong style="color: #ffffff; font-family: monospace;">${formattedExposure}</strong></div>
                <div style="font-size: 11px; color: #94a3b8;">Active Vessels in Corridor: <strong style="color: #e2e8f0;">${routes}</strong></div>
              </div>
            `)
            .addTo(map);
        }
      });

      map.on('mouseleave', 'exposure-circles', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      map.on('click', 'exposure-circles', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const match = data.find(d => d.regionName === feature.properties?.name);
          if (match) setSelectedRegion(match);
        }
      });
    });

    return () => {
      map.remove();
    };
  }, [data]);

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      const mapStyle = theme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11';
      mapRef.current.setStyle(mapStyle);
    }
  }, [theme]);

  const handleFlyToRegion = (region: RegionalExposure) => {
    setSelectedRegion(region);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: region.coordinates,
        zoom: 3.8,
        speed: 1.2,
        curve: 1.4,
        essential: true
      });
    }
  };

  const handleResetMap = () => {
    setSelectedRegion(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [40, 20],
        zoom: 1.6,
        essential: true
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white dark:bg-[#12151E] border border-stone-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden flex flex-col relative shadow-sm"
      aria-label="Regional cargo exposure map"
    >
      {/* Header Bar */}
      <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Regional Cargo Exposure Map
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Single-hue gradient reflects total monetary cargo values traversing high-disruption corridors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
            Total Exposure: ${(totalCargoExposure / 1000000).toFixed(1)}M USD
          </span>
          <button
            type="button"
            onClick={handleResetMap}
            className="p-1.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 text-xs flex items-center gap-1 transition-colors"
            title="Reset to Global View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive Quick-Jump Region Pills */}
      <div className="px-4 py-2 bg-stone-50 dark:bg-slate-900/50 border-b border-stone-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-sky-500" />
          Focus Region:
        </span>
        {data.map((r) => {
          const isSelected = selectedRegion?.regionCode === r.regionCode;
          return (
            <button
              key={r.regionCode}
              type="button"
              onClick={() => handleFlyToRegion(r)}
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-all text-xs flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 border border-stone-200/60 dark:border-slate-700'
              }`}
            >
              <span>{r.regionName}</span>
              <span className={`font-mono text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                ${(r.cargoValueAtRisk / 1000000).toFixed(1)}M
              </span>
            </button>
          );
        })}
      </div>

      {/* Map Surface */}
      <div className="relative w-full h-[360px]">
        <div ref={mapContainerRef} className="absolute inset-0" />
        
        {/* Floating Gradient Legend (Single-Hue Sky to Deep Navy) */}
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-3 text-xs shadow-lg border border-slate-200 dark:border-slate-700 z-10 w-48">
          <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
            <span>Cargo at Risk</span>
            <span className="text-[10px] text-sky-500 font-mono">USD</span>
          </div>
          <div className="w-full h-2 bg-gradient-to-r from-sky-200 via-sky-500 to-sky-900 rounded-full mb-1" />
          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[10px] font-mono">
            <span>$0</span>
            <span>$8M</span>
            <span>$16M+</span>
          </div>
        </div>

        {/* Selected Region HUD Card (if any) */}
        {selectedRegion && (
          <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-3.5 text-xs shadow-xl border border-sky-500/30 z-10 max-w-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-slate-900 dark:text-slate-50 text-sm">
                {selectedRegion.regionName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400">
                {selectedRegion.regionCode}
              </span>
            </div>
            <div className="space-y-1 font-mono text-xs mt-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Cargo Exposure:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  ${(selectedRegion.cargoValueAtRisk / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Vessels Passing:</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {selectedRegion.affectedRoutes} routes
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
