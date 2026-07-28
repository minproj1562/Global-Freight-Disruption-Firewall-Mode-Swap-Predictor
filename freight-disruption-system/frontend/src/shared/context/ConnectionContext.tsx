// Connection State & Auto-Refresh Context
// FASTAPI / WEBSOCKET REPLACEMENT POINT: Replace mock 12-second polling with WebSocket push stream:
// const ws = new WebSocket('wss://api.freightfirewall.com/ws/telemetry');
// ws.onmessage = (event) => { updateVesselData(JSON.parse(event.data)); setStatus('live'); };

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ConnectionStatus = 'live' | 'reconnecting' | 'disconnected';

interface ConnectionContextType {
  status: ConnectionStatus;
  secondsToNextUpdate: number;
  lastSyncedSecondsAgo: number;
  triggerManualRefresh: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

const POLLING_INTERVAL_SECONDS = 12;

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('live');
  const [secondsToNextUpdate, setSecondsToNextUpdate] = useState<number>(POLLING_INTERVAL_SECONDS);
  const [lastSyncedSecondsAgo, setLastSyncedSecondsAgo] = useState<number>(0);

  const triggerManualRefresh = useCallback(() => {
    setStatus('reconnecting');
    setTimeout(() => {
      setStatus('live');
      setLastSyncedSecondsAgo(0);
      setSecondsToNextUpdate(POLLING_INTERVAL_SECONDS);
    }, 600);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastSyncedSecondsAgo((prev) => prev + 1);

      setSecondsToNextUpdate((prev) => {
        if (prev <= 1) {
          // Trigger refresh tick
          setLastSyncedSecondsAgo(0);
          return POLLING_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        status,
        secondsToNextUpdate,
        lastSyncedSecondsAgo,
        triggerManualRefresh,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
