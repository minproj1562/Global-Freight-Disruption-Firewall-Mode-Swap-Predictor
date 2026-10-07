// frontend/src/services/fleetService.ts
/**
 * FLEET REGISTRATION SERVICE LAYER
 * 
 * Manages the Logistics Manager's registered vessel fleet.
 * NOTE: Adding a vessel associates existing metadata with the manager's fleet.
 * Positional/telemetry data (coordinates, speed, heading, etc.) is sourced dynamically
 * from the AIS layer, matching on MMSI.
 * 
 * FASTAPI REPLACEMENT POINT:
 *   - GET /api/v1/fleet/vessels
 *   - POST /api/v1/fleet/vessels
 *   - DELETE /api/v1/fleet/vessels/{id}
 */

import { RegisteredVessel, VesselType } from '../types';
import { lookupAISByMMSI } from './aisService';

const STORAGE_KEY = 'global_freight_my_fleet_vessels';

const INITIAL_SEED_FLEET: Array<{
  id: string;
  name: string;
  imo: number;
  mmsi: number;
  vessel_type: VesselType;
  flag: string;
  registered_at: string;
  notes?: string;
}> = [
  {
    id: 'fleet-01',
    name: 'EVER GIVEN',
    imo: 9811000,
    mmsi: 353136000,
    vessel_type: 'Container',
    flag: 'Panama (PA)',
    registered_at: '2026-06-12T08:00:00Z',
    notes: 'Asia-Europe Flagship Container Carrier (20,124 TEU)',
  },
  {
    id: 'fleet-02',
    name: 'COSCO SHIPPING UNIVERSE',
    imo: 9795610,
    mmsi: 477123400,
    vessel_type: 'Container',
    flag: 'Hong Kong (HK)',
    registered_at: '2026-06-15T10:30:00Z',
    notes: 'Ultra Large Container Vessel assigned to Cape Route',
  },
  {
    id: 'fleet-03',
    name: 'MSC OSCAR',
    imo: 9703296,
    mmsi: 374567000,
    vessel_type: 'Container',
    flag: 'Panama (PA)',
    registered_at: '2026-07-01T14:15:00Z',
    notes: 'Assigned to Bab-el-Mandeb Red Sea transit corridor',
  },
  {
    id: 'fleet-04',
    name: 'PACIFIC HORIZON EXPLORER',
    imo: 9552140,
    mmsi: 999888777, // Deliberate unmatched MMSI to demonstrate realistic "No live AIS data" state
    vessel_type: 'Cargo',
    flag: 'Marshall Islands (MH)',
    registered_at: '2026-07-20T09:00:00Z',
    notes: 'Dry dock maintenance period — transponder powered off',
  },
];

/**
 * Helper to fetch raw registered vessel entries from localStorage or seeds
 */
const getStoredFleetMetadata = (): typeof INITIAL_SEED_FLEET => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored fleet, using defaults', err);
  }

  // Save seed items
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_FLEET));
  return INITIAL_SEED_FLEET;
};

/**
 * Returns the registered fleet, dynamically decorated with live AIS telemetry where available.
 */
export const getRegisteredFleet = async (): Promise<RegisteredVessel[]> => {
  const metadataList = getStoredFleetMetadata();

  const enrichedList: RegisteredVessel[] = await Promise.all(
    metadataList.map(async (meta) => {
      const aisResult = await lookupAISByMMSI(meta.mmsi);

      if (aisResult.found && aisResult.vessel) {
        const ais = aisResult.vessel;
        return {
          ...meta,
          has_live_ais: true,
          current_lat: ais.latitude,
          current_lon: ais.longitude,
          speed: ais.speed,
          course: ais.course,
          heading: ais.heading,
          navigation_status: ais.navigation_status,
          destination: ais.destination,
          eta: ais.eta,
          last_ais_update: ais.timestamp,
        };
      }

      // Valid realistic data state: registered vessel currently has no live transponder signal
      return {
        ...meta,
        has_live_ais: false,
        navigation_status: 'No live AIS data found for this vessel',
      };
    })
  );

  return enrichedList;
};

/**
 * Registers a new vessel to the Logistics Manager's fleet.
 */
export const addVesselToFleet = async (vessel: {
  name: string;
  mmsi: number;
  imo: number;
  vessel_type: VesselType;
  flag: string;
  notes?: string;
}): Promise<RegisteredVessel> => {
  const current = getStoredFleetMetadata();

  const newEntry = {
    id: `fleet-${Date.now()}`,
    name: vessel.name.trim(),
    mmsi: Number(vessel.mmsi),
    imo: Number(vessel.imo),
    vessel_type: vessel.vessel_type,
    flag: vessel.flag.trim(),
    registered_at: new Date().toISOString(),
    notes: vessel.notes?.trim() || 'Custom registered vessel',
  };

  const updated = [newEntry, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Decorate with live AIS immediately
  const aisResult = await lookupAISByMMSI(newEntry.mmsi);
  if (aisResult.found && aisResult.vessel) {
    const ais = aisResult.vessel;
    return {
      ...newEntry,
      has_live_ais: true,
      current_lat: ais.latitude,
      current_lon: ais.longitude,
      speed: ais.speed,
      course: ais.course,
      heading: ais.heading,
      navigation_status: ais.navigation_status,
      destination: ais.destination,
      eta: ais.eta,
      last_ais_update: ais.timestamp,
    };
  }

  return {
    ...newEntry,
    has_live_ais: false,
    navigation_status: 'No live AIS data found for this vessel',
  };
};

/**
 * Removes a vessel from the Logistics Manager's fleet.
 */
export const removeVesselFromFleet = async (vesselId: string): Promise<boolean> => {
  const current = getStoredFleetMetadata();
  const filtered = current.filter((v) => v.id !== vesselId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

/**
 * Checks if a given vessel MMSI is in My Fleet.
 */
export const isVesselInFleet = (mmsi: number): boolean => {
  const current = getStoredFleetMetadata();
  return current.some((v) => v.mmsi === mmsi);
};
