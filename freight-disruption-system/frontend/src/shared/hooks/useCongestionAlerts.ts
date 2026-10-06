//frontend/src/shared/hooks/useCongestionAlerts.ts
// Task 2 — Port Propagation: dedicated WebSocket hook for /ws/alerts.
// Deliberately separate from ConnectionContext/useConnection, which is a
// generic app-wide freshness indicator used by roles (e.g. Port Manager)
// that never connect to this per-user-scoped congestion alert channel.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

export interface AffectedRouteSummary {
  route_id: string;
  route_name: string;
  logistics_manager_id: string;
  user_id: string;
}

export interface CongestionAlertPayload {
  event_type: string;
  port_id: string;
  port_name: string;
  port_code: string;
  congestion_percent: number;
  congestion_level: string;
  updated_by?: string | null;
  affected_routes: AffectedRouteSummary[];
  affected_user_ids: string[];
  timestamp: string;
}

export type AlertSocketStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// http:// -> ws://   https:// -> wss://
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

const MAX_BACKOFF_MS = 30000;

export function useCongestionAlerts() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  const [status, setStatus] = useState<AlertSocketStatus>('disconnected');
  const [alerts, setAlerts] = useState<CongestionAlertPayload[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const mountedRef = useRef(true);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const connect = useCallback(() => {
    // Only Logistics Managers (route owners) and Admins (monitoring copy)
    // are authorized by the backend /ws/alerts endpoint.
    if (!token || !(role === 'operations' || role === 'admin')) {
      setStatus('disconnected');
      return;
    }

    clearReconnectTimer();
    setStatus((prev) => (prev === 'live' ? prev : 'connecting'));

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_BASE_URL}/ws/alerts?token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error('[CongestionAlerts] Failed to open WebSocket:', err);
      setStatus('disconnected');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      backoffRef.current = 1000;
      setStatus('live');
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const payload: CongestionAlertPayload = JSON.parse(event.data);
        setAlerts((prev) => [payload, ...prev].slice(0, 50));
      } catch (err) {
        console.error('[CongestionAlerts] Failed to parse incoming message:', err);
      }
    };

    ws.onerror = () => {
      // onclose fires immediately after onerror for browser WebSockets;
      // reconnect logic lives there to avoid double-handling.
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setStatus('reconnecting');
      const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
      reconnectTimerRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        connect();
      }, delay);
    };
  }, [token, role]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop firing post-unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const clearAlerts = useCallback(() => setAlerts([]), []);
  const latestAlert = alerts[0] || null;

  return { status, alerts, latestAlert, clearAlerts };
}
