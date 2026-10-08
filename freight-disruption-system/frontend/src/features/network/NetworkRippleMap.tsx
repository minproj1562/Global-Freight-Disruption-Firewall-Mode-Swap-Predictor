// frontend/src/features/network/NetworkRippleMap.tsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTheme } from '@/shared/hooks/useTheme';
import type { GraphNode, GraphEdge } from '@/services/portManagerApi';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface NetworkRippleMapProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  heightClassName?: string;
}

// This is the SINGLE source of truth for what each color means on this
// map — both the port dots AND the connection lines use these exact same
// colors. Previously, lines used a separate "risk level" color system
// (which included green for "low risk") while the page's legend only
// explained these 4 colors — causing a mismatch where a real incoming
// threat could render green and confuse Port Managers. Now there is only
// ever ONE color meaning per relationship, matching the on-page legend.
const RELATION_COLOR: Record<string, string> = {
  self: '#8b5cf6',              // Your Port
  incoming_threat: '#e11d48',   // Could delay you
  outgoing_impact: '#f59e0b',   // You could delay them
  connected: '#64748b',         // Just a regular trade connection, no issue
};

/**
 * A live map of this port's trade connections. Your port sits in the
 * middle; lines show which ports feed trouble into you (red) and which
 * ports you affect in turn (amber). Line THICKNESS shows how big the
 * effect is — a thicker line means a bigger expected impact, not a
 * different kind of connection. Built with the same mapping library used
 * on the main fleet map, so it feels consistent across the system.
 */
export const NetworkRippleMap: React.FC<NetworkRippleMapProps> = ({ nodes, edges, heightClassName = 'h-96' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center = nodes.find((n) => n.is_center);
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center:
        center && center.longitude != null && center.latitude != null
          ? [center.longitude, center.latitude]
          : [20, 20],
      zoom: 2.4,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('ripple-edges', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ripple-edges-line',
        type: 'line',
        source: 'ripple-edges',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
          // All connection lines use the same dashed style — this is a
          // deliberate visual convention (matches how trade routes are
          // drawn on the main fleet map too), NOT a signal by itself.
          // Only COLOR (who it affects) and THICKNESS (how much) carry meaning.
          'line-dasharray': [2, 1.5],
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevTheme = useRef(theme);
  useEffect(() => {
    if (!mapRef.current || prevTheme.current === theme) return;
    prevTheme.current = theme;
    mapRef.current.setStyle(theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const validNodes = nodes.filter(
        (n) => n.latitude != null && n.longitude != null && !isNaN(n.latitude as number) && !isNaN(n.longitude as number)
      );
      const nodeById: Record<string, GraphNode> = {};
      validNodes.forEach((n) => (nodeById[n.port_id] = n));

      const edgeFeatures = edges
        .map((e) => {
          const from = nodeById[e.from_port_id];
          const to = nodeById[e.to_port_id];
          if (!from || !to) return null;

          // Color is decided purely by relationship direction — this
          // always matches the 4-color legend shown on the page, with
          // no hidden "risk level" color swap.
          let color = RELATION_COLOR.connected;
          if (e.direction === 'incoming') color = RELATION_COLOR.incoming_threat;
          if (e.direction === 'outgoing') color = RELATION_COLOR.outgoing_impact;

          // Magnitude is shown through thickness + opacity instead of color.
          // A bigger expected effect = a bolder, more solid-looking line.
          const width = e.predicted_increase_pct >= 15 ? 4.5 : e.predicted_increase_pct >= 5 ? 3 : 1.5;
          const opacity = e.direction === 'neutral' ? 0.45 : e.predicted_increase_pct >= 5 ? 0.9 : 0.6;

          return {
            type: 'Feature' as const,
            properties: { color, width, opacity },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [from.longitude as number, from.latitude as number],
                [to.longitude as number, to.latitude as number],
              ],
            },
          };
        })
        .filter(Boolean);

      const edgeSource = map.getSource('ripple-edges') as mapboxgl.GeoJSONSource | undefined;
      if (edgeSource) edgeSource.setData({ type: 'FeatureCollection', features: edgeFeatures as any });

      const bounds = new mapboxgl.LngLatBounds();
      validNodes.forEach((node) => {
        const lon = node.longitude as number;
        const lat = node.latitude as number;
        bounds.extend([lon, lat]);

        const color = node.is_center ? RELATION_COLOR.self : RELATION_COLOR[node.relation] || RELATION_COLOR.connected;
        const size = node.is_center ? 22 : 15;
        const pulse = !node.is_center && node.relation !== 'connected' && node.risk_level === 'HIGH';

        const el = document.createElement('div');
        el.style.position = 'relative';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.innerHTML = `
          ${pulse ? `<div style="position:absolute;inset:-6px;border-radius:9999px;background:${color}55;animation:ripplePulse 1.8s ease-out infinite;"></div>` : ''}
          <div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>
        `;

        // These labels are written to match the on-page legend text
        // word-for-word, so a Port Manager sees the exact same phrase
        // whether they're reading the legend or hovering a port on the map.
        const statusLabel = node.is_center
          ? 'Your Port'
          : node.relation === 'incoming_threat'
          ? 'Could Delay You'
          : node.relation === 'outgoing_impact'
          ? 'You Could Delay Them'
          : 'Regularly Connected';

        const popupHtml = `
          <div style="font-family: inherit; min-width: 190px; padding: 2px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${node.port_name}</div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">${node.port_code}</div>
            <div style="font-size:13px;margin-bottom:2px;">Congestion: <b>${node.congestion_percent.toFixed(0)}%</b></div>
            <div style="font-size:13px;">Status: <b>${statusLabel}</b></div>
          </div>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(popupHtml))
          .addTo(map);

        markersRef.current.push(marker);
      });

      if (validNodes.length > 1) {
        map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 6 });
      } else if (validNodes.length === 1) {
        map.flyTo({ center: [validNodes[0].longitude as number, validNodes[0].latitude as number], zoom: 4 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);
  }, [nodes, edges]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex items-center justify-center ${heightClassName} rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-400`}>
        Map unavailable — mapping service key not configured.
      </div>
    );
  }

  return (
    <div className={`relative w-full ${heightClassName} rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800`}>
      <style>{`
        @keyframes ripplePulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};