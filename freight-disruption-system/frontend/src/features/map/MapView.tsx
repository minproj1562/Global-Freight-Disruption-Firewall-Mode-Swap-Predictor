import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Vessel, Port, Disruption, Route, SecondaryInfrastructure, VesselType, PortCongestionForecast, CongestionTimeHorizon, ActiveRoute } from '../../types';
import { useTheme } from '../../shared/hooks/useTheme';
import { LayerVisibilityState } from './MapToolbar';

interface MapViewProps {
  vessels: Vessel[];
  ports: Port[];
  disruptions: Disruption[];
  routes: Route[];
  secondaryInfra: SecondaryInfrastructure[];
  layers: LayerVisibilityState;
  selectedVesselTypeFilters: VesselType[];
  selectedVessel: Vessel | null;
  selectedPort: Port | null;
  onSelectVessel: (vessel: Vessel | null) => void;
  onSelectPort: (port: Port | null) => void;
  onOpenVesselQuickPopup?: (vessel: Vessel, point: { x: number; y: number }) => void;
  replayProgress?: number; // 0-100
  selectedDisruption?: Disruption | null;
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  // Congestion Heatmap & Active Route Highlighting extensions
  showHeatOverlay?: boolean;
  congestionForecasts?: PortCongestionForecast[];
  selectedTimeHorizon?: CongestionTimeHorizon;
  highlightedActiveRoute?: ActiveRoute | null;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const MapView: React.FC<MapViewProps> = ({
  vessels,
  ports,
  disruptions,
  routes,
  secondaryInfra,
  layers,
  selectedVesselTypeFilters,
  selectedVessel,
  selectedPort,
  onSelectVessel,
  onSelectPort,
  onOpenVesselQuickPopup,
  replayProgress = 100,
  selectedDisruption,
  initialCenter = [45.0, 20.0],
  initialZoom = 3,
  className = 'w-full h-full min-h-screen',
  showHeatOverlay = false,
  congestionForecasts = [],
  selectedTimeHorizon = 'now',
  highlightedActiveRoute = null,
}) => {

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const portMarkersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const infraMarkersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const animFrameRef = useRef<number | null>(null);

  const { theme } = useTheme();

  // Initialize Mapbox Map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: initialZoom,
      pitch: 30,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      // Add Vessel GeoJSON source with clustering enabled
      map.addSource('vessels-cluster-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 7, // Cluster at zoom levels 0-7, uncluster at zoom >= 8
        clusterRadius: 45,
      });

      // Cluster Circle Layer
      map.addLayer({
        id: 'vessel-clusters',
        type: 'circle',
        source: 'vessels-cluster-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#0e94e6', // < 5 vessels: freight blue
            5,
            '#f59e0b', // 5-15 vessels: amber
            15,
            '#ef4444', // > 15 vessels: red
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#0f172a',
          'circle-opacity': 0.85,
        },
      });

      // Cluster Count Text Layer
      map.addLayer({
        id: 'vessel-cluster-count',
        type: 'symbol',
        source: 'vessels-cluster-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Cluster Click Handler — Expand zoom on click
      map.on('click', 'vessel-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['vessel-clusters'] });
        const feature = features[0] as any;
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId !== undefined) {
          const source = map.getSource('vessels-cluster-source') as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !feature?.geometry || feature.geometry.type !== 'Point') return;
            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom: (zoom || 8) + 1,
              duration: 1000,
            });
          });
        }
      });

      map.on('mouseenter', 'vessel-clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'vessel-clusters', () => {
        map.getCanvas().style.cursor = '';
      });

      // Course Trail Source & Layer
      map.addSource('vessel-course-trails', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'vessel-course-trails-line',
        type: 'line',
        source: 'vessel-course-trails',
        paint: {
          'line-color': ['get', 'trailColor'],
          'line-width': 2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.75,
        },
      });
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Mapbox Style when Theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const targetStyle = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
    mapRef.current.setStyle(targetStyle);
  }, [theme]);

  // Render Disruption Zones Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateDisruptions = () => {
      disruptions.forEach((disruption) => {
        const sourceId = `source-${disruption.id}`;
        const fillLayerId = `fill-${disruption.id}`;
        const lineLayerId = `line-${disruption.id}`;

        const geojson: any = {
          type: 'Feature',
          properties: {
            id: disruption.id,
            name: disruption.name,
            severity: disruption.severity,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [disruption.polygon_coordinates],
          },
        };

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': disruption.severity === 'critical' ? '#ef4444' : '#f59e0b',
              'fill-opacity': 0.22,
            },
          });

          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': disruption.severity === 'critical' ? '#ef4444' : '#f59e0b',
              'line-width': 2.5,
              'line-dasharray': [2, 2],
            },
          });
        }

        // Toggle layer visibility
        const visibility = layers.disruptions ? 'visible' : 'none';
        if (map.getLayer(fillLayerId)) map.setLayoutProperty(fillLayerId, 'visibility', visibility);
        if (map.getLayer(lineLayerId)) map.setLayoutProperty(lineLayerId, 'visibility', visibility);
      });
    };

    if (map.isStyleLoaded()) {
      updateDisruptions();
    } else {
      map.once('style.load', updateDisruptions);
    }
  }, [disruptions, layers.disruptions]);

  // Render Weather, Piracy, and Ice Coverage Overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateAddonOverlays = () => {
      // 1. Weather Overlay (Storm cells / Wave Swells)
      const weatherGeoJSON: any = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'North Atlantic Gale Warning (Wave Height 8.5m)' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-45.0, 52.0], [-25.0, 58.0], [-15.0, 48.0], [-35.0, 42.0], [-45.0, 52.0]]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Typhoon Gaemi Wave Swell Zone' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[120.0, 20.0], [130.0, 25.0], [128.0, 32.0], [118.0, 28.0], [120.0, 20.0]]],
            },
          },
        ],
      };

      if (!map.getSource('source-weather-overlay')) {
        map.addSource('source-weather-overlay', { type: 'geojson', data: weatherGeoJSON });
        map.addLayer({
          id: 'fill-weather-overlay',
          type: 'fill',
          source: 'source-weather-overlay',
          paint: { 'fill-color': '#06b6d4', 'fill-opacity': 0.18 },
        });
        map.addLayer({
          id: 'line-weather-overlay',
          type: 'line',
          source: 'source-weather-overlay',
          paint: { 'line-color': '#0891b2', 'line-width': 2, 'line-dasharray': [4, 2] },
        });
      }
      const weatherVis = layers.weather ? 'visible' : 'none';
      if (map.getLayer('fill-weather-overlay')) map.setLayoutProperty('fill-weather-overlay', 'visibility', weatherVis);
      if (map.getLayer('line-weather-overlay')) map.setLayoutProperty('line-weather-overlay', 'visibility', weatherVis);

      // 2. Piracy High-Risk Zones (Somali Basin & Gulf of Guinea)
      const piracyGeoJSON: any = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Gulf of Guinea Piracy High Risk Area' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-2.0, 4.0], [8.0, 4.0], [8.0, -2.0], [-2.0, -2.0], [-2.0, 4.0]]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Somali Basin HRA' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[48.0, 12.0], [60.0, 12.0], [58.0, -2.0], [45.0, 2.0], [48.0, 12.0]]],
            },
          },
        ],
      };

      if (!map.getSource('source-piracy-overlay')) {
        map.addSource('source-piracy-overlay', { type: 'geojson', data: piracyGeoJSON });
        map.addLayer({
          id: 'fill-piracy-overlay',
          type: 'fill',
          source: 'source-piracy-overlay',
          paint: { 'fill-color': '#f97316', 'fill-opacity': 0.2 },
        });
        map.addLayer({
          id: 'line-piracy-overlay',
          type: 'line',
          source: 'source-piracy-overlay',
          paint: { 'line-color': '#ea580c', 'line-width': 2, 'line-dasharray': [2, 2] },
        });
      }
      const piracyVis = layers.piracy ? 'visible' : 'none';
      if (map.getLayer('fill-piracy-overlay')) map.setLayoutProperty('fill-piracy-overlay', 'visibility', piracyVis);
      if (map.getLayer('line-piracy-overlay')) map.setLayoutProperty('line-piracy-overlay', 'visibility', piracyVis);

      // 3. Ice Coverage Overlay (Arctic & Baltic Sea Pack Ice)
      const iceGeoJSON: any = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Arctic Drift Pack Ice Shelf' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-170.0, 72.0], [170.0, 72.0], [170.0, 85.0], [-170.0, 85.0], [-170.0, 72.0]]],
            },
          },
        ],
      };

      if (!map.getSource('source-ice-overlay')) {
        map.addSource('source-ice-overlay', { type: 'geojson', data: iceGeoJSON });
        map.addLayer({
          id: 'fill-ice-overlay',
          type: 'fill',
          source: 'source-ice-overlay',
          paint: { 'fill-color': '#bae6fd', 'fill-opacity': 0.3 },
        });
        map.addLayer({
          id: 'line-ice-overlay',
          type: 'line',
          source: 'source-ice-overlay',
          paint: { 'line-color': '#38bdf8', 'line-width': 2, 'line-dasharray': [6, 3] },
        });
      }
      const iceVis = layers.iceCoverage ? 'visible' : 'none';
      if (map.getLayer('fill-ice-overlay')) map.setLayoutProperty('fill-ice-overlay', 'visibility', iceVis);
      if (map.getLayer('line-ice-overlay')) map.setLayoutProperty('line-ice-overlay', 'visibility', iceVis);
    };

    if (map.isStyleLoaded()) {
      updateAddonOverlays();
    } else {
      map.once('style.load', updateAddonOverlays);
    }
  }, [layers.weather, layers.piracy, layers.iceCoverage]);

  // Render Transit Route Lines with Animated Dash Effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let dashOffset = 0;

    const updateRoutes = () => {
      routes.forEach((route) => {
        const sourceId = `source-route-${route.id}`;
        const layerId = `layer-route-${route.id}`;

        const geojson: any = {
          type: 'Feature',
          properties: {
            id: route.id,
            requires_reroute: route.requires_reroute,
          },
          geometry: {
            type: 'LineString',
            coordinates: route.waypoints,
          },
        };

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': route.requires_reroute ? '#ef4444' : '#38b0f8',
              'line-width': route.requires_reroute ? 4 : 2,
              'line-opacity': 0.85,
              'line-dasharray': route.requires_reroute ? [3, 2] : [4, 4],
            },
          });
        }

        const visibility = layers.routes ? 'visible' : 'none';
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
      });
    };

    if (map.isStyleLoaded()) {
      updateRoutes();
    } else {
      map.once('style.load', updateRoutes);
    }

    // Dash animation step
    const animateDash = () => {
      dashOffset = (dashOffset - 0.2) % 8;
      // Requests subtle animation redraw if map ready
      animFrameRef.current = requestAnimationFrame(animateDash);
    };

    animFrameRef.current = requestAnimationFrame(animateDash);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [routes, layers.routes]);

  // Render Vessels: Cluster Source + Extrapolated Course Trails + HTML Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Filter vessels based on active vessel type filters
    const filteredVessels = vessels.filter((v) =>
      selectedVesselTypeFilters.length === 0 ? true : selectedVesselTypeFilters.includes(v.vessel_type)
    );

    const activeMarkerIds = new Set<string>();

    if (layers.vessels) {
      // 1. Update Cluster Source GeoJSON Data & Course Trails GeoJSON Data
      const vesselPointFeatures: any[] = [];
      const courseTrailFeatures: any[] = [];

      filteredVessels.forEach((vessel) => {
        let lon = vessel.longitude;
        let lat = vessel.latitude;
        if (replayProgress < 100) {
          const delta = (100 - replayProgress) * 0.05;
          lon -= Math.cos((vessel.course * Math.PI) / 180) * delta;
          lat -= Math.sin((vessel.course * Math.PI) / 180) * delta;
        }

        vesselPointFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: { id: vessel.id, name: vessel.name, status: vessel.status },
        });

        // Projected course trail (short line segment extrapolated from current heading & speed)
        const trailLength = (vessel.speed / 20) * 0.4; // Extrapolation distance in deg
        const targetLon = lon + Math.sin((vessel.course * Math.PI) / 180) * trailLength;
        const targetLat = lat + Math.cos((vessel.course * Math.PI) / 180) * trailLength;

        let trailColor = '#f59e0b'; // amber
        if (vessel.vessel_type === 'Tanker') trailColor = '#ef4444';
        if (vessel.vessel_type === 'Bulk Carrier') trailColor = '#38b0f8';
        if (vessel.vessel_type === 'Cargo') trailColor = '#10b981';

        courseTrailFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [lon, lat],
              [targetLon, targetLat],
            ],
          },
          properties: { trailColor },
        });
      });

      // Update Mapbox GeoJSON sources
      if (map.getSource('vessels-cluster-source')) {
        (map.getSource('vessels-cluster-source') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: vesselPointFeatures,
        });
      }

      if (map.getSource('vessel-course-trails')) {
        (map.getSource('vessel-course-trails') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: courseTrailFeatures,
        });
        if (map.getLayer('vessel-course-trails-line')) {
          map.setLayoutProperty('vessel-course-trails-line', 'visibility', 'visible');
        }
      }

      // 2. Render Unclustered Vessel SVG Markers
      filteredVessels.forEach((vessel) => {
        activeMarkerIds.add(vessel.id);

        let lon = vessel.longitude;
        let lat = vessel.latitude;
        if (replayProgress < 100) {
          const delta = (100 - replayProgress) * 0.05;
          lon -= Math.cos((vessel.course * Math.PI) / 180) * delta;
          lat -= Math.sin((vessel.course * Math.PI) / 180) * delta;
        }

        if (markersRef.current[vessel.id]) {
          markersRef.current[vessel.id].setLngLat([lon, lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'vessel-marker-wrapper relative cursor-pointer group';

          let colorClass = 'text-amber-400';
          if (vessel.vessel_type === 'Tanker') colorClass = 'text-rose-400';
          if (vessel.vessel_type === 'Bulk Carrier') colorClass = 'text-sky-400';
          if (vessel.vessel_type === 'Cargo') colorClass = 'text-emerald-400';
          if (vessel.vessel_type === 'Special') colorClass = 'text-purple-400';

          const isAlert = vessel.status !== 'normal';
          // BACKEND INTEGRATION: isAnomalous flag is populated from Isolation Forest model output (POST /api/v1/ml/anomaly-detect)
          const isAnomalous = Boolean((vessel as any).isAnomalous);

          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              ${
                isAlert
                  ? `<div class="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping"></div>`
                  : ''
              }
              ${
                isAnomalous
                  ? `<div class="absolute -inset-2.5 rounded-full border-2 border-rose-500 animate-pulse"></div>
                     <div class="absolute -top-3 -right-3 w-4 h-4 rounded-full bg-rose-600 border border-slate-950 flex items-center justify-center text-white text-[8px] font-bold shadow-md z-10" title="Anomaly Detected (Isolation Forest ML)">!</div>`
                  : ''
              }
              <div style="transform: rotate(${vessel.heading}deg);" class="transition-transform duration-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="${colorClass} drop-shadow-md">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
              </div>
              <div class="vessel-label-box absolute top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono text-white whitespace-nowrap border border-slate-800 pointer-events-none shadow-md ${
                layers.vesselNames ? 'block' : 'hidden'
              }">
                ${vessel.name}${isAnomalous ? ' <span class="text-rose-400 font-bold">⚠</span>' : ''}
              </div>
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectVessel(vessel);
            if (onOpenVesselQuickPopup) {
              onOpenVesselQuickPopup(vessel, { x: e.clientX, y: e.clientY });
            }
          });

          const marker = new mapboxgl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
          markersRef.current[vessel.id] = marker;
        }
      });
    } else {
      // Clear GeoJSON sources if vessels layer hidden
      if (map.getSource('vessels-cluster-source')) {
        (map.getSource('vessels-cluster-source') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      if (map.getLayer('vessel-course-trails-line')) {
        map.setLayoutProperty('vessel-course-trails-line', 'visibility', 'none');
      }
    }

    // Clean up markers no longer active or hidden by layer
    Object.keys(markersRef.current).forEach((id) => {
      if (!activeMarkerIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [vessels, layers.vessels, layers.vesselNames, selectedVesselTypeFilters, replayProgress]);

  // Render Port Markers with Congestion Glow Rings
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activePortIds = new Set<string>();

    if (layers.ports) {
      ports.forEach((port) => {
        activePortIds.add(port.id);

        if (!portMarkersRef.current[port.id]) {
          const el = document.createElement('div');
          el.className = 'port-marker-wrapper relative cursor-pointer';

          let ringColor = 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400';
          if (port.congestion_level === 'medium') ringColor = 'border-yellow-500/60 bg-yellow-500/20 text-yellow-400';
          if (port.congestion_level === 'high') ringColor = 'border-amber-500/60 bg-amber-500/20 text-amber-400';
          if (port.congestion_level === 'critical') ringColor = 'border-rose-500/60 bg-rose-500/30 text-rose-400 animate-pulse';

          el.innerHTML = `
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 ${ringColor} shadow-lg backdrop-blur-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectPort(port);
          });

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([port.longitude, port.latitude])
            .addTo(map);

          portMarkersRef.current[port.id] = marker;
        }
      });
    }

    Object.keys(portMarkersRef.current).forEach((id) => {
      if (!activePortIds.has(id)) {
        portMarkersRef.current[id].remove();
        delete portMarkersRef.current[id];
      }
    });
  }, [ports, layers.ports]);

  // Render Secondary Infrastructure Markers (Lighthouses / AtoN)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeInfraIds = new Set<string>();

    if (layers.secondaryInfra) {
      secondaryInfra.forEach((infra) => {
        activeInfraIds.add(infra.id);

        if (!infraMarkersRef.current[infra.id]) {
          const el = document.createElement('div');
          el.className = 'infra-marker p-1 rounded-full bg-purple-500/30 border border-purple-400/80 text-purple-300 shadow-md';
          el.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
          `;

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([infra.longitude, infra.latitude])
            .addTo(map);

          infraMarkersRef.current[infra.id] = marker;
        }
      });
    }

    Object.keys(infraMarkersRef.current).forEach((id) => {
      if (!activeInfraIds.has(id)) {
        infraMarkersRef.current[id].remove();
        delete infraMarkersRef.current[id];
      }
    });
  }, [secondaryInfra, layers.secondaryInfra]);

  // Fly To when selectedVessel, selectedPort, or selectedDisruption changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedDisruption && selectedDisruption.polygon_coordinates?.length) {
      const lons = selectedDisruption.polygon_coordinates.map((c) => c[0]);
      const lats = selectedDisruption.polygon_coordinates.map((c) => c[1]);
      const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;

      map.flyTo({
        center: [avgLon, avgLat],
        zoom: 5.5,
        pitch: 25,
        duration: 1200,
      });
    } else if (selectedVessel) {
      map.flyTo({
        center: [selectedVessel.longitude, selectedVessel.latitude],
        zoom: 7,
        pitch: 45,
        duration: 1500,
      });
    } else if (selectedPort) {
      map.flyTo({
        center: [selectedPort.longitude, selectedPort.latitude],
        zoom: 9,
        pitch: 35,
        duration: 1500,
      });
    }
  }, [selectedVessel, selectedPort, selectedDisruption]);

  // Render Heatmap Overlay for Port Congestion Forecast
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'port-congestion-heatmap-source';
    const layerId = 'port-congestion-heatmap-layer';

    const updateHeatmap = () => {
      if (!showHeatOverlay || !congestionForecasts || congestionForecasts.length === 0) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
        return;
      }

      const horizon = selectedTimeHorizon || 'now';
      const features = congestionForecasts.map((f) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [f.longitude, f.latitude],
        },
        properties: {
          score: f.congestion_scores[horizon] || 50,
          name: f.port_name,
        },
      }));

      const geojson: any = {
        type: 'FeatureCollection',
        features,
      };

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.addLayer(
          {
            id: layerId,
            type: 'heatmap',
            source: sourceId,
            maxzoom: 9,
            paint: {
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'score'],
                0, 0,
                50, 0.5,
                100, 1,
              ],
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                9, 3,
              ],
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(16, 185, 129, 0)',
                0.2, 'rgba(56, 176, 248, 0.6)',
                0.4, 'rgba(245, 158, 11, 0.75)',
                0.7, 'rgba(239, 68, 68, 0.85)',
                1.0, 'rgba(168, 85, 247, 0.95)',
              ],
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 25,
                5, 55,
                9, 90,
              ],
              'heatmap-opacity': 0.8,
            },
          },
          map.getLayer('vessel-clusters') ? 'vessel-clusters' : undefined
        );
      } else {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      }
    };

    if (map.isStyleLoaded()) {
      updateHeatmap();
    } else {
      map.once('style.load', updateHeatmap);
    }
  }, [showHeatOverlay, congestionForecasts, selectedTimeHorizon]);

  // Render Highlighted Active Route Line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'active-route-highlight-source';
    const layerId = 'active-route-highlight-line';

    const updateActiveRoute = () => {
      if (!highlightedActiveRoute || !highlightedActiveRoute.waypoints || highlightedActiveRoute.waypoints.length === 0) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
        return;
      }

      const geojson: any = {
        type: 'Feature',
        properties: {
          status: highlightedActiveRoute.status,
          risk: highlightedActiveRoute.risk_level,
        },
        geometry: {
          type: 'LineString',
          coordinates: highlightedActiveRoute.waypoints,
        },
      };

      const lineColor =
        highlightedActiveRoute.risk_level === 'critical'
          ? '#ef4444'
          : highlightedActiveRoute.risk_level === 'high'
          ? '#f59e0b'
          : '#10b981';

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': lineColor,
            'line-width': 4,
            'line-opacity': 0.9,
            'line-dasharray': [3, 2],
          },
        });
      } else {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
          map.setPaintProperty(layerId, 'line-color', lineColor);
        }
      }

      if (highlightedActiveRoute.waypoints.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        highlightedActiveRoute.waypoints.forEach((pt) => bounds.extend(pt as [number, number]));
        map.fitBounds(bounds, { padding: 50, duration: 1200 });
      }
    };

    if (map.isStyleLoaded()) {
      updateActiveRoute();
    } else {
      map.once('style.load', updateActiveRoute);
    }
  }, [highlightedActiveRoute]);

  return <div ref={mapContainerRef} className={className} />;
};


