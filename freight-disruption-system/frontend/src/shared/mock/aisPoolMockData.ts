// frontend/src/shared/mock/aisPoolMockData.ts
/**
 * SIMULATED AIS VESSEL POOL
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * This file implements simulated AIS (Automatic Identification System) maritime data
 * used as the project's frontend AIS layer. In real-world maritime operations, AIS
 * transponders transmit VHF packets containing dynamic positional telemetry and static
 * voyage/vessel metadata.
 * 
 * BACKEND INTEGRATION PATH:
 * This simulated pool will be replaced by FastAPI backend endpoints:
 *   - GET /api/v1/ais/vessels (returns active AIS stream)
 *   - GET /api/v1/ais/lookup?mmsi={mmsi} (queries live Redis/PostGIS AIS store)
 *   - GET /api/v1/ais/search?q={query} (full-text search over live transponders)
 */

import { AISVesselData } from '../../types';

export const INITIAL_SIMULATED_AIS_POOL: AISVesselData[] = [
  {
    mmsi: 353136000,
    imo: 9811000,
    name: 'EVER GIVEN',
    vessel_type: 'Container',
    flag: 'Panama (PA)',
    latitude: 27.52,
    longitude: 34.18,
    speed: 18.4,
    course: 334,
    heading: 335,
    navigation_status: 'Under way using engine',
    destination: 'Port of Rotterdam (NLRTM)',
    eta: '2026-08-18 14:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 477123400,
    imo: 9795610,
    name: 'COSCO SHIPPING UNIVERSE',
    vessel_type: 'Container',
    flag: 'Hong Kong (HK)',
    latitude: -34.42,
    longitude: 18.41,
    speed: 19.8,
    course: 310,
    heading: 308,
    navigation_status: 'Under way using engine',
    destination: 'Port of Hamburg (DEHAM)',
    eta: '2026-08-22 09:30 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 374567000,
    imo: 9703296,
    name: 'MSC OSCAR',
    vessel_type: 'Container',
    flag: 'Panama (PA)',
    latitude: 12.82,
    longitude: 43.51,
    speed: 14.2,
    course: 315,
    heading: 316,
    navigation_status: 'Restricted manoeuvrability',
    destination: 'Port of Antwerp (BEANR)',
    eta: '2026-08-16 18:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 431678000,
    imo: 9845049,
    name: 'ONE APUS',
    vessel_type: 'Container',
    flag: 'Japan (JP)',
    latitude: 31.45,
    longitude: 135.22,
    speed: 21.0,
    course: 82,
    heading: 80,
    navigation_status: 'Under way using engine',
    destination: 'Port of Los Angeles (USLAX)',
    eta: '2026-08-25 06:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 219018501,
    imo: 9619907,
    name: 'MAERSK MC-KINNEY MOLLER',
    vessel_type: 'Container',
    flag: 'Denmark (DK)',
    latitude: 1.28,
    longitude: 103.85,
    speed: 0.1,
    course: 180,
    heading: 178,
    navigation_status: 'At anchor',
    destination: 'Port of Singapore (SGSIN)',
    eta: '2026-08-10 12:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 228386800,
    imo: 9776418,
    name: 'CMA CGM ANTOINE DE SAINT EXUPERY',
    vessel_type: 'Container',
    flag: 'France (FR)',
    latitude: 36.14,
    longitude: -5.35,
    speed: 17.6,
    course: 85,
    heading: 86,
    navigation_status: 'Under way using engine',
    destination: 'Port of Piraeus (GRPIR)',
    eta: '2026-08-15 08:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 538008123,
    imo: 9781889,
    name: 'FRONT ALTAIR',
    vessel_type: 'Tanker',
    flag: 'Marshall Islands (MH)',
    latitude: 25.12,
    longitude: 56.41,
    speed: 13.5,
    course: 145,
    heading: 146,
    navigation_status: 'Under way using engine',
    destination: 'Port of Ras Tanura (SARST)',
    eta: '2026-08-12 22:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 205432000,
    imo: 9235268,
    name: 'TI OCEANIA',
    vessel_type: 'Tanker',
    flag: 'Belgium (BE)',
    latitude: 22.84,
    longitude: 60.12,
    speed: 12.0,
    course: 210,
    heading: 212,
    navigation_status: 'Under way using engine',
    destination: 'Fujairah Anchorage (AEFJR)',
    eta: '2026-08-14 04:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 357891000,
    imo: 9755432,
    name: 'BERGE OLYMPUS',
    vessel_type: 'Bulk Carrier',
    flag: 'Isle of Man (IM)',
    latitude: -20.31,
    longitude: 118.57,
    speed: 11.2,
    course: 330,
    heading: 328,
    navigation_status: 'Under way using engine',
    destination: 'Port Hedland (AUPHE)',
    eta: '2026-08-11 16:30 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 211284560,
    imo: 9811024,
    name: 'HAPAG-LLOYD AL DAHNA',
    vessel_type: 'Container',
    flag: 'Germany (DE)',
    latitude: 53.54,
    longitude: 9.94,
    speed: 0.2,
    course: 90,
    heading: 90,
    navigation_status: 'Moored',
    destination: 'Port of Hamburg (DEHAM)',
    eta: '2026-08-08 10:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 636019888,
    imo: 9839272,
    name: 'VALE BRASIL',
    vessel_type: 'Bulk Carrier',
    flag: 'Liberia (LR)',
    latitude: -2.52,
    longitude: -44.29,
    speed: 14.8,
    course: 45,
    heading: 47,
    navigation_status: 'Under way using engine',
    destination: 'Port of Qingdao (CNTAO)',
    eta: '2026-09-02 12:00 UTC',
    timestamp: new Date().toISOString(),
  },
  {
    mmsi: 311000854,
    imo: 9722302,
    name: 'PACIFIC CARRIER',
    vessel_type: 'Cargo',
    flag: 'Bahamas (BS)',
    latitude: 21.30,
    longitude: -157.86,
    speed: 15.1,
    course: 260,
    heading: 262,
    navigation_status: 'Under way using engine',
    destination: 'Honolulu Harbor (USHNL)',
    eta: '2026-08-13 18:00 UTC',
    timestamp: new Date().toISOString(),
  },
];

/**
 * State container for simulated live moving AIS vessels.
 * Periodically updates vessel positions, course slight drift, and timestamps
 * to simulate dynamic real-time AIS transponder packets.
 */
class AISSimulationStore {
  private pool: AISVesselData[];
  private lastTick: number;

  constructor() {
    this.pool = [...INITIAL_SIMULATED_AIS_POOL];
    this.lastTick = Date.now();
  }

  public getPool(): AISVesselData[] {
    this.advanceSimulation();
    return this.pool;
  }

  public advanceSimulation(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastTick) / 1000;
    if (elapsedSeconds < 2) return; // limit calculation frequency

    this.lastTick = now;
    const hours = elapsedSeconds / 3600;

    this.pool = this.pool.map((vessel) => {
      if (vessel.navigation_status === 'At anchor' || vessel.navigation_status === 'Moored') {
        return {
          ...vessel,
          timestamp: new Date().toISOString(),
        };
      }

      // Small realistic speed and course micro-variation
      const speedJitter = (Math.random() - 0.5) * 0.2;
      const currentSpeed = Math.max(5, Math.min(25, vessel.speed + speedJitter));
      const courseRad = (vessel.course * Math.PI) / 180;

      // Distance traveled in degrees (approx 60 nautical miles per degree)
      const distDegrees = (currentSpeed * hours) / 60;
      const dLat = Math.cos(courseRad) * distDegrees;
      const dLon = Math.sin(courseRad) * distDegrees;

      return {
        ...vessel,
        latitude: parseFloat((vessel.latitude + dLat).toFixed(4)),
        longitude: parseFloat((vessel.longitude + dLon).toFixed(4)),
        speed: parseFloat(currentSpeed.toFixed(1)),
        timestamp: new Date().toISOString(),
      };
    });
  }

  public findByMMSI(mmsi: number | string): AISVesselData | null {
    this.advanceSimulation();
    const num = typeof mmsi === 'string' ? parseInt(mmsi.trim(), 10) : mmsi;
    if (isNaN(num)) return null;
    return this.pool.find((v) => v.mmsi === num) || null;
  }

  public search(query: string): AISVesselData[] {
    this.advanceSimulation();
    const q = query.trim().toLowerCase();
    if (!q) return this.pool.slice(0, 10);

    return this.pool.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.mmsi.toString().includes(q) ||
        v.imo.toString().includes(q) ||
        v.flag.toLowerCase().includes(q) ||
        v.vessel_type.toLowerCase().includes(q)
    );
  }
}

export const aisSimulationInstance = new AISSimulationStore();
