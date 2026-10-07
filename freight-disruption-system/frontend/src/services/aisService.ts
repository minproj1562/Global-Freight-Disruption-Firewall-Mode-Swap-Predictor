// frontend/src/services/aisService.ts
/**
 * AIS SERVICE LAYER
 * 
 * ARCHITECTURE & FASTAPI REPLACEMENT POINT:
 * Current Flow: Mock Vessel Pool -> AIS Mock Service -> Vessel Registry / Map / Dashboard
 * Future Backend Flow: FastAPI Backend -> AIS Service -> Frontend
 * 
 * Future Endpoints:
 *   - GET /api/v1/ais/search?q={query}
 *   - GET /api/v1/ais/vessels/{mmsi}
 *   - GET /api/v1/ais/stream
 */

import { AISLookupResult, AISVesselData } from '../types';
import { aisSimulationInstance } from '../shared/mock/aisPoolMockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Search the simulated AIS vessel pool by name, MMSI, or IMO.
 */
export const searchAISVessels = async (query: string): Promise<AISVesselData[]> => {
  // Try real backend if available, fallback to simulated pool
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ais/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {
    // Seamless fallback to simulated AIS pool
  }

  return aisSimulationInstance.search(query);
};

/**
 * Look up a specific vessel's live AIS transponder packet by MMSI.
 */
export const lookupAISByMMSI = async (mmsi: number | string): Promise<AISLookupResult> => {
  const mmsiNum = typeof mmsi === 'string' ? parseInt(mmsi.trim(), 10) : mmsi;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ais/vessels/${mmsiNum}`);
    if (res.ok) {
      const data = await res.json();
      return { found: true, vessel: data, match_field: 'mmsi' };
    }
  } catch (_e) {
    // Fallback to simulated AIS pool
  }

  const foundVessel = aisSimulationInstance.findByMMSI(mmsiNum);
  if (foundVessel) {
    return {
      found: true,
      vessel: foundVessel,
      match_field: 'mmsi',
    };
  }

  return {
    found: false,
    vessel: null,
  };
};

/**
 * Returns all active vessels in the simulated AIS pool with up-to-date coordinates.
 */
export const getSimulatedAISPool = async (): Promise<AISVesselData[]> => {
  return aisSimulationInstance.getPool();
};
