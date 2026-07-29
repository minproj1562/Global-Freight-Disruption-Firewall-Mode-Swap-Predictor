// src/store/portStore.ts
import { create } from 'zustand';
import { PortData, Vessel, DisruptionEvent } from '../types/port';
import { mockPorts } from '../data/mockPortData';

interface PortStoreState {
  ports: PortData[];
  selectedPortId: string;
  selectedVessel: Vessel | null;
  isVesselModalOpen: boolean;
  isDisruptionModalOpen: boolean;
  
  // Actions
  selectPort: (portId: string) => void;
  getSelectedPort: () => PortData;
  openVesselModal: (vessel: Vessel) => void;
  closeVesselModal: () => void;
  openDisruptionModal: () => void;
  closeDisruptionModal: () => void;
  flagPortDisrupted: (portId: string, disruption: Omit<DisruptionEvent, 'id' | 'startDate'>) => void;
  updateBerthStatus: (portId: string, berthId: string, status: 'Occupied' | 'Vacant' | 'Maintenance' | 'Reserved') => void;
}

export const usePortStore = create<PortStoreState>((set, get) => ({
  ports: mockPorts,
  selectedPortId: 'port-rotterdam', // Default to Rotterdam
  selectedVessel: null,
  isVesselModalOpen: false,
  isDisruptionModalOpen: false,

  selectPort: (portId: string) => {
    set({ selectedPortId: portId });
  },

  getSelectedPort: () => {
    const { ports, selectedPortId } = get();
    return ports.find((p) => p.id === selectedPortId) || ports[0];
  },

  openVesselModal: (vessel: Vessel) => {
    set({ selectedVessel: vessel, isVesselModalOpen: true });
  },

  closeVesselModal: () => {
    set({ isVesselModalOpen: false, selectedVessel: null });
  },

  openDisruptionModal: () => {
    set({ isDisruptionModalOpen: true });
  },

  closeDisruptionModal: () => {
    set({ isDisruptionModalOpen: false });
  },

  flagPortDisrupted: (portId, disruptionData) => {
    const newDisruption: DisruptionEvent = {
      id: `dis-${Date.now()}`,
      startDate: new Date().toISOString().split('T')[0],
      ...disruptionData,
    };

    set((state) => ({
      ports: state.ports.map((port) => {
        if (port.id === portId) {
          const updatedActive = [newDisruption, ...port.activeDisruptions];
          const newCongestion = Math.min(100, Math.max(port.congestionRate, 88));
          return {
            ...port,
            status: 'disrupted' as const,
            congestionRate: newCongestion,
            activeDisruptions: updatedActive,
            congestionHistory: [
              ...port.congestionHistory,
              {
                date: 'Today (ALERT)',
                congestionRate: newCongestion,
                waitingVessels: port.waitingVessels + 4,
                avgWaitHours: port.avgWaitHours + 6,
                disruption: newDisruption,
              },
            ],
            lastUpdated: 'Just now (Disruption Flagged)',
          };
        }
        return port;
      }),
    }));
  },

  updateBerthStatus: (portId, berthId, newStatus) => {
    set((state) => ({
      ports: state.ports.map((port) => {
        if (port.id === portId) {
          return {
            ...port,
            berths: port.berths.map((b) =>
              b.id === berthId ? { ...b, status: newStatus } : b
            ),
          };
        }
        return port;
      }),
    }));
  },
}));
