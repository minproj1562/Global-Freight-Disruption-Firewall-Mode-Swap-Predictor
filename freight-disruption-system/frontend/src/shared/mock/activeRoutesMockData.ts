// frontend/src/shared/mock/activeRoutesMockData.ts
// FASTAPI REPLACEMENT POINT: Replace MOCK_ACTIVE_ROUTES with GET /api/v1/routes/active
import { ActiveRoute } from '../../types';

export const MOCK_ACTIVE_ROUTES: ActiveRoute[] = [
  {
    id: 'route-ever-given-01',
    vessel_id: 'vessel-ever-given',
    vessel_name: 'EVER GIVEN',
    vessel_imo: 9811000,
    vessel_flag: 'Panama (PA)',
    vessel_type: 'Container',
    origin_port_name: 'Shanghai International Port',
    origin_port_code: 'CNSHA',
    destination_port_name: 'Port of Rotterdam',
    destination_port_code: 'NLRTM',
    current_location_name: 'Northern Red Sea / Suez Approach',
    current_coordinates: [33.8, 27.5],
    mode: 'sea',
    eta: '2026-08-18 14:00',
    status: 'Critical Hazard',
    risk_level: 'critical',
    risk_reason: 'Red Sea Missile Threat & Suez Queue',
    cargo_summary: '20,000 TEU High-Tech Consumer Electronics & Automotive Components',
    waypoints: [
      [121.47, 31.23], // Shanghai
      [103.85, 1.29],  // Singapore
      [80.0, 6.0],     // Sri Lanka
      [43.2, 12.6],    // Bab-el-Mandeb
      [33.8, 27.5],    // Current Red Sea
      [32.55, 29.93],  // Suez Canal
      [14.5, 35.9],    // Med
      [3.9, 51.95],    // Rotterdam
    ],
    progress_percent: 68,
    avg_speed_knots: 18.4,
    distance_remaining_nm: 2450,
  },
  {
    id: 'route-cosco-shipping-universe-02',
    vessel_id: 'vessel-cosco-universe',
    vessel_name: 'COSCO SHIPPING UNIVERSE',
    vessel_imo: 9795610,
    vessel_flag: 'Hong Kong (HK)',
    vessel_type: 'Container',
    origin_port_name: 'Ningbo-Zhoushan Port',
    origin_port_code: 'CNNGB',
    destination_port_name: 'Port of Hamburg',
    destination_port_code: 'DEHAM',
    current_location_name: 'Cape of Good Hope Bypass (South Africa)',
    current_coordinates: [18.4, -34.4],
    mode: 'multimodal',
    multimodal_modes: ['sea', 'rail'],
    eta: '2026-08-22 09:30',
    status: 'Rerouted',
    risk_level: 'medium',
    risk_reason: 'Cape Reroute Active (+10 Days)',
    cargo_summary: '21,237 TEU Industrial Heavy Machinery & Lithium Ion Battery Packs',
    waypoints: [
      [121.85, 29.88], // Ningbo
      [103.85, 1.29],  // Singapore
      [80.0, -5.0],    // Indian Ocean
      [18.4, -34.4],   // Cape of Good Hope
      [-17.4, 14.7],   // West Africa
      [-9.1, 38.7],    // Lisbon
      [9.9, 53.5],     // Hamburg
    ],
    progress_percent: 54,
    avg_speed_knots: 19.8,
    distance_remaining_nm: 4200,
  },
  {
    id: 'route-msc-oscar-03',
    vessel_id: 'vessel-msc-oscar',
    vessel_name: 'MSC OSCAR',
    vessel_imo: 9703296,
    vessel_flag: 'Panama (PA)',
    vessel_type: 'Container',
    origin_port_name: 'Singapore Port',
    origin_port_code: 'SGSIN',
    destination_port_name: 'Port of Antwerp-Bruges',
    destination_port_code: 'BEANR',
    current_location_name: 'Bab-el-Mandeb Strait Entrance',
    current_coordinates: [43.5, 12.8],
    mode: 'sea',
    eta: '2026-08-16 18:00',
    status: 'Delayed',
    risk_level: 'high',
    risk_reason: 'Houthi Drone Alert & Escort Convoy Waiting',
    cargo_summary: '19,224 TEU General Apparel, Footwear & Solar Modules',
    waypoints: [
      [103.85, 1.29],  // Singapore
      [76.0, 9.0],     // Arabian Sea
      [43.5, 12.8],    // Current Strait
      [32.55, 29.93],  // Suez
      [4.3, 51.3],     // Antwerp
    ],
    progress_percent: 62,
    avg_speed_knots: 14.2,
    distance_remaining_nm: 3100,
  },
  {
    id: 'route-cma-cgm-antoine-04',
    vessel_id: 'vessel-cma-antoine',
    vessel_name: 'CMA CGM ANTOINE DE SAINT EXUPERY',
    vessel_imo: 9776418,
    vessel_flag: 'France (FR)',
    vessel_type: 'Container',
    origin_port_name: 'Port of Piraeus',
    origin_port_code: 'GRPIR',
    destination_port_name: 'Port of Felixstowe',
    destination_port_code: 'GBFXT',
    current_location_name: 'Strait of Gibraltar Transit',
    current_coordinates: [-5.6, 35.9],
    mode: 'multimodal',
    multimodal_modes: ['sea', 'rail'],
    eta: '2026-08-14 06:00',
    status: 'On Schedule',
    risk_level: 'low',
    cargo_summary: '20,776 TEU European Railway Equipment & Transshipment Goods',
    waypoints: [
      [23.6, 37.9],  // Piraeus
      [14.5, 36.8],  // Sicily Channel
      [-5.6, 35.9],  // Gibraltar
      [1.3, 51.9],   // Felixstowe
    ],
    progress_percent: 78,
    avg_speed_knots: 21.0,
    distance_remaining_nm: 1120,
  },
  {
    id: 'route-oocl-hong-kong-05',
    vessel_id: 'vessel-oocl-hk',
    vessel_name: 'OOCL HONG KONG',
    vessel_imo: 9776171,
    vessel_flag: 'Hong Kong (HK)',
    vessel_type: 'Container',
    origin_port_name: 'Shenzhen Yantian Port',
    origin_port_code: 'CNSZX',
    destination_port_name: 'Port of Los Angeles',
    destination_port_code: 'USLAX',
    current_location_name: 'Mid-Pacific Transpacific Transit',
    current_coordinates: [-165.0, 32.0],
    mode: 'sea',
    eta: '2026-08-15 22:00',
    status: 'On Schedule',
    risk_level: 'low',
    cargo_summary: '21,413 TEU Consumer Retail & E-Commerce Merchandise',
    waypoints: [
      [114.27, 22.57], // Yantian
      [140.0, 30.0],   // East Tokyo
      [-165.0, 32.0],  // Mid Pacific
      [-118.25, 33.74] // Los Angeles
    ],
    progress_percent: 71,
    avg_speed_knots: 22.5,
    distance_remaining_nm: 1980,
  },
  {
    id: 'route-stena-imperator-06',
    vessel_id: 'vessel-stena-imp',
    vessel_name: 'STENA IMPERATOR',
    vessel_imo: 9667526,
    vessel_flag: 'United Kingdom (GB)',
    vessel_type: 'Tanker',
    origin_port_name: 'Ras Tanura Terminal',
    origin_port_code: 'SARAN',
    destination_port_name: 'Port of Rotterdam (Petrochemical)',
    destination_port_code: 'NLRTM',
    current_location_name: 'Strait of Hormuz Exit',
    current_coordinates: [56.4, 26.2],
    mode: 'sea',
    eta: '2026-08-25 04:00',
    status: 'At Anchor',
    risk_level: 'high',
    risk_reason: 'Naval Inspection & Congestion Standstill',
    cargo_summary: '150,000 DWT Crude Petroleum Light Sweet Grade',
    waypoints: [
      [50.1, 26.6],  // Ras Tanura
      [56.4, 26.2],  // Hormuz
      [60.0, 15.0],  // Arabian Sea
      [18.4, -34.4], // Cape
      [3.9, 51.95],  // Rotterdam
    ],
    progress_percent: 18,
    avg_speed_knots: 0.2,
    distance_remaining_nm: 6850,
  },
  {
    id: 'route-air-express-freight-07',
    vessel_id: 'air-cargo-cv7821',
    vessel_name: 'CARGOLUX AIR FREIGHT CV7821',
    vessel_imo: 747801,
    vessel_flag: 'Luxembourg (LU)',
    vessel_type: 'Special',
    origin_port_name: 'Dubai Al Maktoum Airport / Jebel Ali Hub',
    origin_port_code: 'AEDXB',
    destination_port_name: 'Frankfurt CargoCity South',
    destination_port_code: 'DEFRA',
    current_location_name: 'Air Cargo Corridor over Anatolia (Turkey)',
    current_coordinates: [35.2, 39.1],
    mode: 'air',
    eta: '2026-08-12 02:15',
    status: 'On Schedule',
    risk_level: 'low',
    cargo_summary: '110 Tons High-Value Semiconductor Wafers & Pharmaceuticals',
    waypoints: [
      [55.17, 24.9],  // Dubai
      [45.0, 33.0],   // Iraq airspace
      [35.2, 39.1],   // Turkey
      [8.57, 50.03],  // Frankfurt
    ],
    progress_percent: 65,
    avg_speed_knots: 480.0,
    distance_remaining_nm: 1150,
  },
  {
    id: 'route-silk-road-rail-08',
    vessel_id: 'rail-express-sr991',
    vessel_name: 'EURASIA SILK ROAD EXPRESS SR991',
    vessel_imo: 881023,
    vessel_flag: 'Kazakhstan (KZ)',
    vessel_type: 'Special',
    origin_port_name: 'Xi\'an Inland Port',
    origin_port_code: 'CNXAN',
    destination_port_name: 'Duisburg Intermodal Terminal',
    destination_port_code: 'DEDUI',
    current_location_name: 'Malaszewicze Railway Border (Poland)',
    current_coordinates: [23.5, 52.0],
    mode: 'rail',
    eta: '2026-08-13 11:00',
    status: 'Delayed',
    risk_level: 'medium',
    risk_reason: 'Gauge Swap & Border Custom Processing Queue',
    cargo_summary: '82 Block Train Containers — Automotive Spare Parts & Precision Tools',
    waypoints: [
      [108.9, 34.2],  // Xi'an
      [80.2, 44.2],   // Khorgos
      [69.2, 51.1],   // Astana
      [23.5, 52.0],   // Malaszewicze
      [6.76, 51.43],  // Duisburg
    ],
    progress_percent: 82,
    avg_speed_knots: 35.0,
    distance_remaining_nm: 820,
  },
  {
    id: 'route-multi-sea-air-09',
    vessel_id: 'multimodal-sa-404',
    vessel_name: 'EMIRATES SEA-AIR LOGISTICS HYBRID',
    vessel_imo: 994012,
    vessel_flag: 'United Arab Emirates (AE)',
    vessel_type: 'Cargo',
    origin_port_name: 'Port of Colombo',
    origin_port_code: 'LKCMB',
    destination_port_name: 'Chicago O\'Hare Logistics Hub',
    destination_port_code: 'USORD',
    current_location_name: 'Sea-to-Air Swap at Jebel Ali / DXB Air Cargo Hub',
    current_coordinates: [55.0, 24.9],
    mode: 'multimodal',
    multimodal_modes: ['sea', 'air'],
    eta: '2026-08-14 16:30',
    status: 'Rerouted',
    risk_level: 'medium',
    risk_reason: 'Sea -> Air Fast Swap Executed to Avoid Red Sea Delay',
    cargo_summary: '45 TEU High-Margin Fashion Apparel & Perishable Goods',
    waypoints: [
      [79.84, 6.93],  // Colombo
      [55.0, 24.9],   // Dubai Jebel Ali
      [-87.9, 41.97], // Chicago O'Hare
    ],
    progress_percent: 58,
    avg_speed_knots: 320.0,
    distance_remaining_nm: 6400,
  },
  {
    id: 'route-panama-feeder-10',
    vessel_id: 'vessel-hapag-lloyd',
    vessel_name: 'VALPARAISO EXPRESS',
    vessel_imo: 9708784,
    vessel_flag: 'Germany (DE)',
    vessel_type: 'Container',
    origin_port_name: 'Port of Valparaiso',
    origin_port_code: 'CLVAP',
    destination_port_name: 'Manzanillo International Terminal',
    destination_port_code: 'PAMAN',
    current_location_name: 'Panama Canal Pacific Anchorage',
    current_coordinates: [-79.5, 8.9],
    mode: 'sea',
    eta: '2026-08-16 10:00',
    status: 'Delayed',
    risk_level: 'high',
    risk_reason: 'Freshwater Draft Restriction & Booking Transit Slot Delay',
    cargo_summary: '10,500 TEU Refrigerated Agricultural Exports & Minerals',
    waypoints: [
      [-71.6, -33.0], // Valparaiso
      [-79.5, 8.9],   // Panama Pacific
      [-79.9, 9.3],   // Colon MIT
    ],
    progress_percent: 88,
    avg_speed_knots: 1.5,
    distance_remaining_nm: 65,
  },
  {
    id: 'route-maersk-mc-kinney-11',
    vessel_id: 'vessel-maersk-mckinney',
    vessel_name: 'MAERSK MC-KINNEY MOLLER',
    vessel_imo: 9619907,
    vessel_flag: 'Denmark (DK)',
    vessel_type: 'Container',
    origin_port_name: 'Tanjung Pelepas Port',
    origin_port_code: 'MYTPP',
    destination_port_name: 'Bremerhaven Port',
    destination_port_code: 'DEBRV',
    current_location_name: 'South Atlantic Ocean Transit',
    current_coordinates: [-8.2, 4.1],
    mode: 'sea',
    eta: '2026-08-20 08:00',
    status: 'On Schedule',
    risk_level: 'low',
    cargo_summary: '18,270 TEU Consumer Goods & Renewable Wind Turbine Blades',
    waypoints: [
      [103.55, 1.36], // Tanjung Pelepas
      [18.4, -34.4],  // Cape
      [-8.2, 4.1],    // South Atlantic
      [8.5, 53.5],    // Bremerhaven
    ],
    progress_percent: 60,
    avg_speed_knots: 20.2,
    distance_remaining_nm: 3600,
  },
  {
    id: 'route-multi-sea-rail-road-12',
    vessel_id: 'vessel-ever-glory',
    vessel_name: 'EVER GLORY',
    vessel_imo: 9811012,
    vessel_flag: 'Panama (PA)',
    vessel_type: 'Container',
    origin_port_name: 'Busan North Port',
    origin_port_code: 'KRPUS',
    destination_port_name: 'Prague Intermodal Logistics Park',
    destination_port_code: 'CZPRG',
    current_location_name: 'Adriatic Sea Approach to Koper Port',
    current_coordinates: [13.7, 45.5],
    mode: 'multimodal',
    multimodal_modes: ['sea', 'rail', 'road'],
    eta: '2026-08-14 14:00',
    status: 'On Schedule',
    risk_level: 'low',
    cargo_summary: '14,000 TEU Electronics & Auto Assemblies via Port of Koper Rail Corridor',
    waypoints: [
      [129.04, 35.1], // Busan
      [32.55, 29.93], // Suez
      [13.7, 45.5],   // Koper
      [14.4, 50.08],  // Prague
    ],
    progress_percent: 92,
    avg_speed_knots: 16.8,
    distance_remaining_nm: 290,
  }
];
