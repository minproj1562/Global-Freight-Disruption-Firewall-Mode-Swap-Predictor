// frontend/src/shared/mock/adminMockData.ts
import { AdminUser, DatabaseStats, UploadHistoryItem, CleanupOperationLog } from '@/types/adminUserTypes';


export interface AdminVessel {
  id: string;
  mmsi: number;
  imo: number;
  name: string;
  type: 'Container' | 'Tanker' | 'Bulk Carrier' | 'LNG Carrier' | 'Ro-Ro' | 'Chemical Tanker' | 'Tug / Support';
  flag: string;
  dwt: number;
  currentPort: string;
  status: 'Underway' | 'At Anchor' | 'Moored' | 'Maintenance' | 'Inactive';
  lastAisUpdate: string;
  isActive: boolean;
}

export interface SystemHealthCard {
  id: string;
  name: string;
  status: 'Operational' | 'Degraded' | 'Offline' | 'Maintenance';
  uptimePct: number;
  latencyMs: number;
  lastSync: string;
  details: string;
  metrics: { label: string; value: string }[];
}

export interface ApiUsageDataPoint {
  time: string; // e.g. "00:00", "01:00"
  totalRequests: number;
  aisRequests: number;
  weatherRequests: number;
  portRequests: number;
  errorCount: number;
}

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  service: 'AIS Poller' | 'Weather Poller' | 'Port Analytics' | 'Database Engine' | 'Reroute Optimizer' | 'WebSocket Gateway';
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  stackTrace: string;
  resolved: boolean;
}

export interface ManagedDisruption {
  id: string;
  type: 'Extreme Weather / Typhoon' | 'Port Strike & Labor Action' | 'Military & Geopolitical Blockade' | 'Chokepoint / Canal Blockage' | 'Terminal Equipment Failure' | 'Cyber Incident';
  locationName: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  radiusNm: number;
  description: string;
  affectedVesselsCount: number;
  resolved: boolean;
}

// -------------------------------------------------------------
// 1. 50 PRE-SEEDED VESSELS DATASET
// -------------------------------------------------------------
export const INITIAL_50_VESSELS: AdminVessel[] = [
  { id: 'V-01', mmsi: 211330000, imo: 9811000, name: 'EVER GIVEN', type: 'Container', flag: 'Panama 🇵🇦', dwt: 220940, currentPort: 'Port of Rotterdam', status: 'Moored', lastAisUpdate: '10s ago', isActive: true },
  { id: 'V-02', mmsi: 636019821, imo: 9776432, name: 'MSC GULSUN', type: 'Container', flag: 'Liberia 🇱🇷', dwt: 232618, currentPort: 'Port of Singapore', status: 'Underway', lastAisUpdate: '25s ago', isActive: true },
  { id: 'V-03', mmsi: 311000854, imo: 9839270, name: 'HMM ALGECIRAS', type: 'Container', flag: 'Panama 🇵🇦', dwt: 232311, currentPort: 'Port of Hamburg', status: 'At Anchor', lastAisUpdate: '5s ago', isActive: true },
  { id: 'V-04', mmsi: 477308900, imo: 9708681, name: 'CMA CGM ANTOINE', type: 'Container', flag: 'France 🇫🇷', dwt: 217673, currentPort: 'Port of Antwerp', status: 'Moored', lastAisUpdate: '42s ago', isActive: true },
  { id: 'V-05', mmsi: 538007204, imo: 9786839, name: 'BERGE SPITZBERGEN', type: 'Bulk Carrier', flag: 'Marshall Islands 🇲🇭', dwt: 388000, currentPort: 'Port of Qingdao', status: 'Underway', lastAisUpdate: '18s ago', isActive: true },
  { id: 'V-06', mmsi: 235112890, imo: 9694500, name: 'MOL TRIUMPH', type: 'Container', flag: 'Marshall Islands 🇲🇭', dwt: 192672, currentPort: 'Port of Los Angeles', status: 'At Anchor', lastAisUpdate: '12s ago', isActive: true },
  { id: 'V-07', mmsi: 636092781, imo: 9812444, name: 'VALE BRASIL', type: 'Bulk Carrier', flag: 'Singapore 🇸🇬', dwt: 400000, currentPort: 'Port of Tubarão', status: 'Moored', lastAisUpdate: '30s ago', isActive: true },
  { id: 'V-08', mmsi: 563004500, imo: 9743210, name: 'GASLOG GLASGOW', type: 'LNG Carrier', flag: 'Bermuda 🇧🇲', dwt: 95000, currentPort: 'Ras Laffan Port', status: 'Moored', lastAisUpdate: '8s ago', isActive: true },
  { id: 'V-09', mmsi: 218763000, imo: 9632064, name: 'MAERSK MC-KINNEY', type: 'Container', flag: 'Denmark 🇩🇰', dwt: 194153, currentPort: 'Port of Shanghai', status: 'Underway', lastAisUpdate: '15s ago', isActive: true },
  { id: 'V-10', mmsi: 352001429, imo: 9720002, name: 'TI OCEANIA', type: 'Tanker', flag: 'Belgium 🇧🇪', dwt: 441585, currentPort: 'Ras Tanura', status: 'At Anchor', lastAisUpdate: '55s ago', isActive: true },
  { id: 'V-11', mmsi: 431008920, imo: 9765432, name: 'HOEGH TARGET', type: 'Ro-Ro', flag: 'Norway 🇳🇴', dwt: 22000, currentPort: 'Bremerhaven', status: 'Moored', lastAisUpdate: '2s ago', isActive: true },
  { id: 'V-12', mmsi: 636018320, imo: 9750011, name: 'OOCL HONG KONG', type: 'Container', flag: 'Hong Kong 🇭🇰', dwt: 191317, currentPort: 'Port of Busan', status: 'Underway', lastAisUpdate: '33s ago', isActive: true },
  { id: 'V-13', mmsi: 229345000, imo: 9801111, name: 'AL NEFUD', type: 'LNG Carrier', flag: 'Malta 🇲🇹', dwt: 122000, currentPort: 'Port of Qatargas', status: 'Moored', lastAisUpdate: '14s ago', isActive: true },
  { id: 'V-14', mmsi: 374889000, imo: 9820012, name: 'COSCO SHIPPING UNIVERSE', type: 'Container', flag: 'Hong Kong 🇭🇰', dwt: 198500, currentPort: 'Port of Ningbo', status: 'Underway', lastAisUpdate: '40s ago', isActive: true },
  { id: 'V-15', mmsi: 566123000, imo: 9734123, name: 'PACIFIC DISCOVERY', type: 'Bulk Carrier', flag: 'Singapore 🇸🇬', dwt: 180000, currentPort: 'Port of Newcastle', status: 'At Anchor', lastAisUpdate: '22s ago', isActive: true },
  { id: 'V-16', mmsi: 212555000, imo: 9654321, name: 'NORDIC FREEDOM', type: 'Tanker', flag: 'Cyprus 🇨🇾', dwt: 158000, currentPort: 'Port of Houston', status: 'Moored', lastAisUpdate: '6s ago', isActive: true },
  { id: 'V-17', mmsi: 311098000, imo: 9798765, name: 'SEVEN SEAS VOYAGER', type: 'Chemical Tanker', flag: 'Bahamas 🇧🇸', dwt: 45000, currentPort: 'Port of Rotterdam', status: 'Maintenance', lastAisUpdate: '3m ago', isActive: false },
  { id: 'V-18', mmsi: 440112000, imo: 9812345, name: 'HYUNDAI PRIDE', type: 'Container', flag: 'South Korea 🇰🇷', dwt: 140000, currentPort: 'Port of Incheon', status: 'Underway', lastAisUpdate: '19s ago', isActive: true },
  { id: 'V-19', mmsi: 636015555, imo: 9768899, name: 'STAR ATLANTIC', type: 'Bulk Carrier', flag: 'Liberia 🇱🇷', dwt: 82000, currentPort: 'Port of Vancouver', status: 'Moored', lastAisUpdate: '11s ago', isActive: true },
  { id: 'V-20', mmsi: 244880000, imo: 9845566, name: 'SMART TUG TITAN', type: 'Tug / Support', flag: 'Netherlands 🇳🇱', dwt: 1500, currentPort: 'Port of Rotterdam', status: 'Moored', lastAisUpdate: '1s ago', isActive: true },
  { id: 'V-21', mmsi: 351222000, imo: 9711223, name: 'PANAMAX STAR', type: 'Bulk Carrier', flag: 'Panama 🇵🇦', dwt: 75000, currentPort: 'Port of Santos', status: 'At Anchor', lastAisUpdate: '45s ago', isActive: true },
  { id: 'V-22', mmsi: 538099888, imo: 9723344, name: 'MARSHALL TITAN', type: 'Tanker', flag: 'Marshall Islands 🇲🇭', dwt: 318000, currentPort: 'Fujairah Anchorage', status: 'At Anchor', lastAisUpdate: '50s ago', isActive: true },
  { id: 'V-23', mmsi: 211888999, imo: 9856677, name: 'HAMBURG EXPRESS', type: 'Container', flag: 'Germany 🇩🇪', dwt: 142000, currentPort: 'Port of Hamburg', status: 'Underway', lastAisUpdate: '8s ago', isActive: true },
  { id: 'V-24', mmsi: 228999000, imo: 9867788, name: 'MARSEILLE BREEZE', type: 'Ro-Ro', flag: 'France 🇫🇷', dwt: 18500, currentPort: 'Port of Marseille', status: 'Moored', lastAisUpdate: '16s ago', isActive: true },
  { id: 'V-25', mmsi: 477112233, imo: 9781122, name: 'ORIENT GLORY', type: 'Container', flag: 'Hong Kong 🇭🇰', dwt: 165000, currentPort: 'Port of Shenzhen', status: 'Underway', lastAisUpdate: '29s ago', isActive: true },
  { id: 'V-26', mmsi: 563445566, imo: 9792233, name: 'SINGAPORE COURAGE', type: 'LNG Carrier', flag: 'Singapore 🇸🇬', dwt: 98000, currentPort: 'Port of Tokyo', status: 'Underway', lastAisUpdate: '17s ago', isActive: true },
  { id: 'V-27', mmsi: 311778899, imo: 9803344, name: 'CARIBBEAN PEARL', type: 'Chemical Tanker', flag: 'Bahamas 🇧🇸', dwt: 38000, currentPort: 'Port of Kingston', status: 'At Anchor', lastAisUpdate: '1m ago', isActive: true },
  { id: 'V-28', mmsi: 636099111, imo: 9814455, name: 'MONROVIA EXPRESS', type: 'Container', flag: 'Liberia 🇱🇷', dwt: 110000, currentPort: 'Port of Durban', status: 'Moored', lastAisUpdate: '38s ago', isActive: true },
  { id: 'V-29', mmsi: 209554433, imo: 9825566, name: 'CYPRUS VOYAGER', type: 'Bulk Carrier', flag: 'Cyprus 🇨🇾', dwt: 63000, currentPort: 'Port of Piraeus', status: 'Maintenance', lastAisUpdate: '10m ago', isActive: false },
  { id: 'V-30', mmsi: 431998877, imo: 9836677, name: 'NIPPON SPIRIT', type: 'Tanker', flag: 'Japan 🇯🇵', dwt: 300000, currentPort: 'Port of Yokohama', status: 'Underway', lastAisUpdate: '5s ago', isActive: true },
  { id: 'V-31', mmsi: 229112244, imo: 9847788, name: 'VALLETTA PRINCE', type: 'Container', flag: 'Malta 🇲🇹', dwt: 135000, currentPort: 'Port of Gioia Tauro', status: 'Moored', lastAisUpdate: '24s ago', isActive: true },
  { id: 'V-32', mmsi: 374112255, imo: 9858899, name: 'PANAMA MARU', type: 'Container', flag: 'Panama 🇵🇦', dwt: 120000, currentPort: 'Port of Colon', status: 'Underway', lastAisUpdate: '13s ago', isActive: true },
  { id: 'V-33', mmsi: 538223344, imo: 9869900, name: 'MAJURO BULKER', type: 'Bulk Carrier', flag: 'Marshall Islands 🇲🇭', dwt: 95000, currentPort: 'Port of Richards Bay', status: 'At Anchor', lastAisUpdate: '48s ago', isActive: true },
  { id: 'V-34', mmsi: 219001122, imo: 9870011, name: 'DANISH MONARCH', type: 'Container', flag: 'Denmark 🇩🇰', dwt: 175000, currentPort: 'Port of Aarhus', status: 'Moored', lastAisUpdate: '7s ago', isActive: true },
  { id: 'V-35', mmsi: 257334455, imo: 9881122, name: 'VIKING GUARDIAN', type: 'Ro-Ro', flag: 'Norway 🇳🇴', dwt: 21000, currentPort: 'Port of Gothenburg', status: 'Underway', lastAisUpdate: '31s ago', isActive: true },
  { id: 'V-36', mmsi: 636088776, imo: 9892233, name: 'AFRICAN PHOENIX', type: 'Bulk Carrier', flag: 'Liberia 🇱🇷', dwt: 58000, currentPort: 'Port of Casablanca', status: 'Moored', lastAisUpdate: '20s ago', isActive: true },
  { id: 'V-37', mmsi: 352998811, imo: 9903344, name: 'BALBOA TRADER', type: 'Container', flag: 'Panama 🇵🇦', dwt: 88000, currentPort: 'Port of Manzanillo', status: 'Underway', lastAisUpdate: '14s ago', isActive: true },
  { id: 'V-38', mmsi: 566887799, imo: 9914455, name: 'LION CITY ENERGY', type: 'LNG Carrier', flag: 'Singapore 🇸🇬', dwt: 105000, currentPort: 'Port of Bintulu', status: 'Moored', lastAisUpdate: '3s ago', isActive: true },
  { id: 'V-39', mmsi: 477665544, imo: 9925566, name: 'PEARL RIVER DISPATCH', type: 'Container', flag: 'Hong Kong 🇭🇰', dwt: 150000, currentPort: 'Port of Guangzhou', status: 'Underway', lastAisUpdate: '27s ago', isActive: true },
  { id: 'V-40', mmsi: 211002233, imo: 9936677, name: 'RHINE LEADER', type: 'Tug / Support', flag: 'Germany 🇩🇪', dwt: 2100, currentPort: 'Port of Duisburg', status: 'Moored', lastAisUpdate: '9s ago', isActive: true },
  { id: 'V-41', mmsi: 311445566, imo: 9947788, name: 'NASSAU EXPLORER', type: 'Chemical Tanker', flag: 'Bahamas 🇧🇸', dwt: 52000, currentPort: 'Port of Freeport', status: 'Inactive', lastAisUpdate: '25m ago', isActive: false },
  { id: 'V-42', mmsi: 229778899, imo: 9958899, name: 'MEDITERRANEAN HERO', type: 'Container', flag: 'Malta 🇲🇹', dwt: 160000, currentPort: 'Port of Marsaxlokk', status: 'Underway', lastAisUpdate: '15s ago', isActive: true },
  { id: 'V-43', mmsi: 440998811, imo: 9969900, name: 'BUSAN TITAN', type: 'Container', flag: 'South Korea 🇰🇷', dwt: 210000, currentPort: 'Port of Gwangyang', status: 'Moored', lastAisUpdate: '21s ago', isActive: true },
  { id: 'V-44', mmsi: 538776655, imo: 9970011, name: 'PACIFIC SENTINEL', type: 'Tanker', flag: 'Marshall Islands 🇲🇭', dwt: 298000, currentPort: 'Port of Kaohsiung', status: 'At Anchor', lastAisUpdate: '41s ago', isActive: true },
  { id: 'V-45', mmsi: 636077889, imo: 9981122, name: 'ATLANTIC CHALLENGER', type: 'Bulk Carrier', flag: 'Liberia 🇱🇷', dwt: 178000, currentPort: 'Port of Norfolk', status: 'Underway', lastAisUpdate: '11s ago', isActive: true },
  { id: 'V-46', mmsi: 218998877, imo: 9992233, name: 'COPENHAGEN ZEPHYR', type: 'Container', flag: 'Denmark 🇩🇰', dwt: 115000, currentPort: 'Port of Gdansk', status: 'Moored', lastAisUpdate: '4s ago', isActive: true },
  { id: 'V-47', mmsi: 351887766, imo: 9901122, name: 'COLON EXPRESS', type: 'Container', flag: 'Panama 🇵🇦', dwt: 92000, currentPort: 'Port of Balboa', status: 'Underway', lastAisUpdate: '36s ago', isActive: true },
  { id: 'V-48', mmsi: 563223311, imo: 9902233, name: 'TEMASEK VOYAGER', type: 'Tanker', flag: 'Singapore 🇸🇬', dwt: 110000, currentPort: 'Port of Jurong', status: 'Moored', lastAisUpdate: '18s ago', isActive: true },
  { id: 'V-49', mmsi: 235667788, imo: 9903355, name: 'THAMES PIONEER', type: 'Chemical Tanker', flag: 'United Kingdom 🇬🇧', dwt: 34000, currentPort: 'Port of London', status: 'Underway', lastAisUpdate: '12s ago', isActive: true },
  { id: 'V-50', mmsi: 477889900, imo: 9904466, name: 'VICTORIA STAR', type: 'Ro-Ro', flag: 'Hong Kong 🇭🇰', dwt: 24000, currentPort: 'Port of Melbourne', status: 'At Anchor', lastAisUpdate: '29s ago', isActive: true },
];

// -------------------------------------------------------------
// 2. SYSTEM HEALTH POLLERS & DATABASE CARDS
// -------------------------------------------------------------
export const SYSTEM_HEALTH_CARDS: SystemHealthCard[] = [
  {
    id: 'db',
    name: 'PostgreSQL / TimescaleDB',
    status: 'Operational',
    uptimePct: 99.99,
    latencyMs: 12,
    lastSync: '0.4s ago',
    details: 'Primary relational & time-series spatial database engine running smoothly.',
    metrics: [
      { label: 'Active Connections', value: '48 / 120' },
      { label: 'Cache Hit Ratio', value: '99.4%' },
      { label: 'DB Query Latency', value: '12 ms' },
      { label: 'Storage Used', value: '142.8 GB (35%)' },
    ],
  },
  {
    id: 'ais',
    name: 'AIS Telemetry Stream Poller',
    status: 'Operational',
    uptimePct: 99.95,
    latencyMs: 45,
    lastSync: '1.1s ago',
    details: 'Satellite & terrestrial AIS signal ingestion pipeline parsing live MMSI position frames.',
    metrics: [
      { label: 'Ingest Throughput', value: '5,240 msg/sec' },
      { label: 'Active Vessels Tracked', value: '50 Vessels' },
      { label: 'Packet Drop Rate', value: '0.001%' },
      { label: 'Buffer Queue Depth', value: '14 msgs' },
    ],
  },
  {
    id: 'weather',
    name: 'NOAA / OpenWeather Poller',
    status: 'Operational',
    uptimePct: 99.88,
    latencyMs: 120,
    lastSync: '42s ago',
    details: 'Global maritime wave height, wind vector & typhoon tracking weather poller.',
    metrics: [
      { label: 'Last Fetch', value: '42s ago' },
      { label: 'Weather Grids Updated', value: '1,840 sectors' },
      { label: 'API Quota Remaining', value: '86.4%' },
      { label: 'Alert Generation', value: 'Active' },
    ],
  },
  {
    id: 'congestion',
    name: 'Port Congestion Analytics Poller',
    status: 'Operational',
    uptimePct: 99.75,
    latencyMs: 180,
    lastSync: '2 min ago',
    details: 'Automated queue calculation, waiting hours computation & berth bottleneck detector.',
    metrics: [
      { label: 'Monitored Ports', value: '18 Major Ports' },
      { label: 'Avg Wait Calculations', value: 'Every 5 min' },
      { label: 'Mode-Swap Trigger', value: 'Armed' },
      { label: 'Accuracy Rating', value: '98.6%' },
    ],
  },
];

// -------------------------------------------------------------
// 3. API CALL USAGE CHART DATA (24 Hours)
// -------------------------------------------------------------
export const API_USAGE_HISTORY: ApiUsageDataPoint[] = [
  { time: '00:00', totalRequests: 42000, aisRequests: 28000, weatherRequests: 8000, portRequests: 6000, errorCount: 4 },
  { time: '02:00', totalRequests: 39000, aisRequests: 26000, weatherRequests: 7500, portRequests: 5500, errorCount: 2 },
  { time: '04:00', totalRequests: 45000, aisRequests: 30000, weatherRequests: 8500, portRequests: 6500, errorCount: 3 },
  { time: '06:00', totalRequests: 58000, aisRequests: 38000, weatherRequests: 11000, portRequests: 9000, errorCount: 5 },
  { time: '08:00', totalRequests: 82000, aisRequests: 52000, weatherRequests: 16000, portRequests: 14000, errorCount: 8 },
  { time: '10:00', totalRequests: 110000, aisRequests: 70000, weatherRequests: 22000, portRequests: 18000, errorCount: 12 },
  { time: '12:00', totalRequests: 125000, aisRequests: 80000, weatherRequests: 24000, portRequests: 21000, errorCount: 9 },
  { time: '14:00', totalRequests: 132000, aisRequests: 85000, weatherRequests: 25000, portRequests: 22000, errorCount: 15 },
  { time: '16:00', totalRequests: 128000, aisRequests: 82000, weatherRequests: 24000, portRequests: 22000, errorCount: 11 },
  { time: '18:00', totalRequests: 98000, aisRequests: 64000, weatherRequests: 19000, portRequests: 15000, errorCount: 7 },
  { time: '20:00', totalRequests: 74000, aisRequests: 49000, weatherRequests: 14000, portRequests: 11000, errorCount: 6 },
  { time: '22:00', totalRequests: 55000, aisRequests: 36000, weatherRequests: 11000, portRequests: 8000, errorCount: 3 },
];

// -------------------------------------------------------------
// 4. SYSTEM ERROR LOGS DATASET
// -------------------------------------------------------------
export const INITIAL_ERROR_LOGS: SystemErrorLog[] = [
  {
    id: 'ERR-901',
    timestamp: '2026-07-31 14:48:12',
    service: 'AIS Poller',
    severity: 'WARNING',
    code: 'AIS_LATENCY_SPIKE',
    message: 'Terrestrial station station_rotterdam_04 experienced 1.8s delay in packet broadcast.',
    stackTrace: 'at TelemetryStreamBuffer.processChunk (ais_poller.py:142)\n  at Socket.onMessage (stream_ingest.py:88)',
    resolved: true,
  },
  {
    id: 'ERR-902',
    timestamp: '2026-07-31 13:22:05',
    service: 'Weather Poller',
    severity: 'ERROR',
    code: 'WEATHER_API_RATE_LIMIT_WARNING',
    message: 'NOAA GFS endpoint returned HTTP 429 Too Many Requests. Retried with backup provider ECMWF.',
    stackTrace: 'at WeatherFetcher.fetchGfsGrid (weather_service.py:204)\n  at RetryStrategy.execute (http_client.py:56)',
    resolved: true,
  },
  {
    id: 'ERR-903',
    timestamp: '2026-07-31 11:05:44',
    service: 'Database Engine',
    severity: 'CRITICAL',
    code: 'DEADLOCK_PREVENTED',
    message: 'Concurrent update on table port_wait_times prevented by TimescaleDB hypertable row lock.',
    stackTrace: 'at TransactionManager.commit (db_pool.py:94)\n  at CongestionWorker.updatePortStats (port_worker.py:312)',
    resolved: false,
  },
  {
    id: 'ERR-904',
    timestamp: '2026-07-31 09:14:18',
    service: 'Reroute Optimizer',
    severity: 'WARNING',
    code: 'MODE_SWAP_RAIL_CAPACITY_WARN',
    message: 'Rotterdam-Duisburg rail freight hub capacity reached 92% threshold for Mode-Swap option.',
    stackTrace: 'at ModeSwapEvaluator.checkRailHub (mode_swap.py:118)\n  at RouteCalculator.evaluateOptions (reroute.py:45)',
    resolved: true,
  },
  {
    id: 'ERR-905',
    timestamp: '2026-07-30 22:40:01',
    service: 'WebSocket Gateway',
    severity: 'INFO',
    code: 'CLIENT_DISCONNECT_CLEANUP',
    message: 'Client session ID ws_usr_8812 disconnected gracefully after 4 hours active stream.',
    stackTrace: 'at WebSocketServer.handleDisconnect (ws_gateway.py:175)',
    resolved: true,
  },
];

// -------------------------------------------------------------
// 5. MANAGED DISRUPTIONS DATASET (For Page 4.2)
// -------------------------------------------------------------
export const INITIAL_DISRUPTIONS: ManagedDisruption[] = [
  {
    id: 'DIS-01',
    type: 'Military & Geopolitical Blockade',
    locationName: 'Strait of Hormuz (Chokepoint)',
    latitude: 26.56,
    longitude: 56.25,
    startDate: '2026-07-28 00:00',
    endDate: '2026-08-10 23:59',
    severity: 'critical',
    radiusNm: 150,
    description: 'Heightened military drills & missile test zone blocking commercial oil tankers and container vessels through Persian Gulf entrance.',
    affectedVesselsCount: 14,
    resolved: false,
  },
  {
    id: 'DIS-02',
    type: 'Extreme Weather / Typhoon',
    locationName: 'East China Sea (Typhoon Gaemi)',
    latitude: 28.40,
    longitude: 125.10,
    startDate: '2026-07-30 06:00',
    endDate: '2026-08-03 18:00',
    severity: 'high',
    radiusNm: 280,
    description: 'Category 4 Super Typhoon generating 11-meter swell waves and 140 knot wind gusts along Shanghai-Ningbo maritime corridor.',
    affectedVesselsCount: 22,
    resolved: false,
  },
  {
    id: 'DIS-03',
    type: 'Port Strike & Labor Action',
    locationName: 'Port of Los Angeles & Long Beach',
    latitude: 33.74,
    longitude: -118.26,
    startDate: '2026-07-29 12:00',
    endDate: '2026-08-01 12:00',
    severity: 'medium',
    radiusNm: 40,
    description: 'Dockworker union 24-hour shift slowdown causing 6-day vessel queuing delays at container berth cranes.',
    affectedVesselsCount: 9,
    resolved: false,
  },
  {
    id: 'DIS-04',
    type: 'Chokepoint / Canal Blockage',
    locationName: 'Panama Canal (Gatun Lake Drought)',
    latitude: 9.15,
    longitude: -79.85,
    startDate: '2026-07-15 00:00',
    endDate: '2026-08-15 00:00',
    severity: 'high',
    radiusNm: 60,
    description: 'Draft restrictions limited to 44 feet due to low reservoir levels, forcing Neo-Panamax vessels to wait or reroute via Cape Horn.',
    affectedVesselsCount: 31,
    resolved: false,
  },
];

// User Management Mock Data

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'USR-101',
    name: 'Sarah Jenkins',
    email: 'sarah.j@freightfirewall.com',
    role: 'Admin',
    lastLogin: '2026-08-12 10:45 AM',
    status: 'Active',
    createdAt: '2025-01-15',
    assignedPort: 'Global Control HQ',
    department: 'System Architecture',
    phone: '+1 (555) 019-2834',
  },
  {
    id: 'USR-102',
    name: 'Captain Alex Morgan',
    email: 'a.morgan@portofrotterdam.com',
    role: 'Port Manager',
    lastLogin: '2026-08-12 09:12 AM',
    status: 'Active',
    createdAt: '2025-03-20',
    assignedPort: 'Port of Rotterdam',
    department: 'Port Operations',
    phone: '+31 10 252 1000',
  },
  {
    id: 'USR-103',
    name: 'Elena Rostova',
    email: 'e.rostova@globalmaritime.io',
    role: 'Logistics Manager',
    lastLogin: '2026-08-11 04:30 PM',
    status: 'Active',
    createdAt: '2025-04-10',
    assignedPort: 'Hamburg Hub',
    department: 'Supply Chain Logistics',
    phone: '+49 40 3770 0',
  },
  {
    id: 'USR-104',
    name: 'Marcus Vance',
    email: 'm.vance@supplychain.ai',
    role: 'Analyst',
    lastLogin: '2026-08-09 02:15 PM',
    status: 'Inactive',
    createdAt: '2025-06-05',
    assignedPort: 'Analytics Unit',
    department: 'Risk & Prediction',
    phone: '+1 (555) 432-8765',
  },
  {
    id: 'USR-105',
    name: 'David Chen',
    email: 'd.chen@singaporeport.gov.sg',
    role: 'Port Manager',
    lastLogin: '2026-08-12 11:02 AM',
    status: 'Active',
    createdAt: '2025-02-28',
    assignedPort: 'Port of Singapore',
    department: 'Maritime Authority',
    phone: '+65 6375 1600',
  },
  {
    id: 'USR-106',
    name: 'Amira Al-Mansoor',
    email: 'amira@dubaisupply.ae',
    role: 'Viewer',
    lastLogin: '2026-07-28 01:20 PM',
    status: 'Suspended',
    createdAt: '2025-09-12',
    assignedPort: 'Jebel Ali Port',
    department: 'External Audit',
    phone: '+971 4 881 1111',
  },
  {
    id: 'USR-107',
    name: 'Henrik Visser',
    email: 'h.visser@maersk-tech.com',
    role: 'Logistics Manager',
    lastLogin: '2026-08-12 08:05 AM',
    status: 'Active',
    createdAt: '2025-11-01',
    assignedPort: 'Antwerp Gateway',
    department: 'Fleet Dispatch',
    phone: '+45 33 63 33 63',
  },
];

// Page 4.5 Data Management Mock Data
export const INITIAL_DATABASE_STATS: DatabaseStats = {
  totalRecords: 14850230,
  totalSizeGb: 4.82,
  engine: 'PostgreSQL 16.2 / TimescaleDB 2.14 (HA Cluster)',
  status: 'Healthy',
  activeConnections: 18,
  maxConnections: 100,
  lastBackup: '2026-08-12 03:00 AM (Automated Snapshot)',
  tables: [
    {
      tableName: 'ais_telemetry_logs',
      description: 'High-frequency vessel coordinate, speed, course & MMSI satellite telemetry',
      recordCount: 12450000,
      sizeMb: 3480.5,
      lastUpdated: '2 seconds ago',
      category: 'Telemetry',
    },
    {
      tableName: 'congestion_history',
      description: 'Historical and predicted port waiting times & berth bottleneck metrics',
      recordCount: 1840000,
      sizeMb: 920.2,
      lastUpdated: '1 minute ago',
      category: 'Analytics',
    },
    {
      tableName: 'simulated_routes',
      description: 'Monte Carlo stochastic route simulations & Dijkstra mode-swap candidates',
      recordCount: 520000,
      sizeMb: 450.8,
      lastUpdated: '15 minutes ago',
      category: 'Analytics',
    },
    {
      tableName: 'vessels',
      description: 'Global fleet index, IMO/MMSI details, dimensions & draught specs',
      recordCount: 50,
      sizeMb: 1.4,
      lastUpdated: '2 hours ago',
      category: 'Core Entities',
    },
    {
      tableName: 'ports',
      description: 'Major global ports, berth capacity, coordinates & infrastructure metadata',
      recordCount: 24,
      sizeMb: 0.6,
      lastUpdated: 'Yesterday',
      category: 'Core Entities',
    },
    {
      tableName: 'active_disruptions',
      description: 'Geopolitical hazards, typhoons, strikes & chokepoint blockades',
      recordCount: 16,
      sizeMb: 0.2,
      lastUpdated: '10 minutes ago',
      category: 'Telemetry',
    },
    {
      tableName: 'users',
      description: 'System admin, port manager & logistics operator credentials & RBAC roles',
      recordCount: 7,
      sizeMb: 0.1,
      lastUpdated: 'Just now',
      category: 'System',
    },
  ],
};

export const INITIAL_UPLOAD_HISTORY: UploadHistoryItem[] = [
  {
    id: 'UPL-901',
    fileName: 'ais_telemetry_2026_q3_batch1.csv',
    datasetType: 'AIS Telemetry',
    uploadedBy: 'Sarah Jenkins',
    uploadedAt: '2026-08-11 16:45',
    recordsIngested: 250000,
    fileSizeBytes: 28400000, // ~28.4 MB
    status: 'Success',
  },
  {
    id: 'UPL-902',
    fileName: 'global_port_berth_capacities_2026.json',
    datasetType: 'Ports Database',
    uploadedBy: 'Captain Alex Morgan',
    uploadedAt: '2026-08-10 11:20',
    recordsIngested: 24,
    fileSizeBytes: 142000, // ~142 KB
    status: 'Success',
  },
  {
    id: 'UPL-903',
    fileName: 'imo_fleet_vessels_update.csv',
    datasetType: 'Vessel Directory',
    uploadedBy: 'David Chen',
    uploadedAt: '2026-08-08 09:15',
    recordsIngested: 50,
    fileSizeBytes: 380000,
    status: 'Success',
  },
  {
    id: 'UPL-904',
    fileName: 'suez_canal_congestion_feed_aug.csv',
    datasetType: 'Congestion CSV',
    uploadedBy: 'Elena Rostova',
    uploadedAt: '2026-08-05 14:02',
    recordsIngested: 12500,
    fileSizeBytes: 1850000,
    status: 'Success',
  },
];

export const INITIAL_CLEANUP_LOGS: CleanupOperationLog[] = [
  {
    id: 'CLN-501',
    operationType: 'Delete Old AIS',
    executedBy: 'Sarah Jenkins',
    executedAt: '2026-08-01 02:00',
    recordsAffected: 1500000,
    sizeFreedMb: 420.5,
    details: 'Purged raw AIS telemetry points older than 30 days.',
  },
  {
    id: 'CLN-502',
    operationType: 'Delete Old Simulations',
    executedBy: 'System Auto-Maintenance',
    executedAt: '2026-08-05 03:00',
    recordsAffected: 320000,
    sizeFreedMb: 280.0,
    details: 'Pruned expired Monte Carlo route simulation cache.',
  },
];

