# backend/app/services/admin_seeding.py
from sqlalchemy.orm import Session
from app.models.vessels import Vessel, VesselLog
from app.models.disruptions import GlobalDisruption
from app.models.system import SystemHealthCard, SystemErrorLog

# Data constants from frontend mock datasets
INITIAL_50_VESSELS_DATA = [
    {"mmsi": 211330000, "imo": 9811000, "name": "EVER GIVEN", "vessel_type": "Container", "flag": "Panama 🇵🇦", "dwt": 220940, "current_port": "Port of Rotterdam", "status": "Moored", "last_ais_update_str": "10s ago", "is_active": True},
    {"mmsi": 636019821, "imo": 9776432, "name": "MSC GULSUN", "vessel_type": "Container", "flag": "Liberia 🇱🇷", "dwt": 232618, "current_port": "Port of Singapore", "status": "Underway", "last_ais_update_str": "25s ago", "is_active": True},
    {"mmsi": 311000854, "imo": 9839270, "name": "HMM ALGECIRAS", "vessel_type": "Container", "flag": "Panama 🇵🇦", "dwt": 232311, "current_port": "Port of Hamburg", "status": "At Anchor", "last_ais_update_str": "5s ago", "is_active": True},
    {"mmsi": 477308900, "imo": 9708681, "name": "CMA CGM ANTOINE", "vessel_type": "Container", "flag": "France 🇫🇷", "dwt": 217673, "current_port": "Port of Antwerp", "status": "Moored", "last_ais_update_str": "42s ago", "is_active": True},
    {"mmsi": 538007204, "imo": 9786839, "name": "BERGE SPITZBERGEN", "vessel_type": "Bulk Carrier", "flag": "Marshall Islands 🇲🇭", "dwt": 388000, "current_port": "Port of Qingdao", "status": "Underway", "last_ais_update_str": "18s ago", "is_active": True},
    {"mmsi": 235112890, "imo": 9694500, "name": "MOL TRIUMPH", "vessel_type": "Container", "flag": "Marshall Islands 🇲🇭", "dwt": 192672, "current_port": "Port of Los Angeles", "status": "At Anchor", "last_ais_update_str": "12s ago", "is_active": True},
    {"mmsi": 636092781, "imo": 9812444, "name": "VALE BRASIL", "vessel_type": "Bulk Carrier", "flag": "Singapore 🇸🇬", "dwt": 400000, "current_port": "Port of Tubarão", "status": "Moored", "last_ais_update_str": "30s ago", "is_active": True},
    {"mmsi": 563004500, "imo": 9743210, "name": "GASLOG GLASGOW", "vessel_type": "LNG Carrier", "flag": "Bermuda 🇧🇲", "dwt": 95000, "current_port": "Ras Laffan Port", "status": "Moored", "last_ais_update_str": "8s ago", "is_active": True},
    {"mmsi": 218763000, "imo": 9632064, "name": "MAERSK MC-KINNEY", "vessel_type": "Container", "flag": "Denmark 🇩🇰", "dwt": 194153, "current_port": "Port of Shanghai", "status": "Underway", "last_ais_update_str": "15s ago", "is_active": True},
    {"mmsi": 352001429, "imo": 9720002, "name": "TI OCEANIA", "vessel_type": "Tanker", "flag": "Belgium 🇧🇪", "dwt": 441585, "current_port": "Ras Tanura", "status": "At Anchor", "last_ais_update_str": "55s ago", "is_active": True},
    {"mmsi": 431008920, "imo": 9765432, "name": "HOEGH TARGET", "vessel_type": "Ro-Ro", "flag": "Norway 🇳🇴", "dwt": 22000, "current_port": "Bremerhaven", "status": "Moored", "last_ais_update_str": "2s ago", "is_active": True},
    {"mmsi": 636018320, "imo": 9750011, "name": "OOCL HONG KONG", "vessel_type": "Container", "flag": "Hong Kong 🇭🇰", "dwt": 191317, "current_port": "Port of Busan", "status": "Underway", "last_ais_update_str": "33s ago", "is_active": True},
    {"mmsi": 229345000, "imo": 9801111, "name": "AL NEFUD", "vessel_type": "LNG Carrier", "flag": "Malta 🇲🇹", "dwt": 122000, "current_port": "Port of Qatargas", "status": "Moored", "last_ais_update_str": "14s ago", "is_active": True},
    {"mmsi": 374889000, "imo": 9820012, "name": "COSCO SHIPPING UNIVERSE", "vessel_type": "Container", "flag": "Hong Kong 🇭🇰", "dwt": 198500, "current_port": "Port of Ningbo", "status": "Underway", "last_ais_update_str": "40s ago", "is_active": True},
    {"mmsi": 566123000, "imo": 9734123, "name": "PACIFIC DISCOVERY", "vessel_type": "Bulk Carrier", "flag": "Singapore 🇸🇬", "dwt": 180000, "current_port": "Port of Newcastle", "status": "At Anchor", "last_ais_update_str": "22s ago", "is_active": True},
    {"mmsi": 212555000, "imo": 9654321, "name": "NORDIC FREEDOM", "vessel_type": "Tanker", "flag": "Cyprus 🇨🇾", "dwt": 158000, "current_port": "Port of Houston", "status": "Moored", "last_ais_update_str": "6s ago", "is_active": True},
    {"mmsi": 311098000, "imo": 9798765, "name": "SEVEN SEAS VOYAGER", "vessel_type": "Chemical Tanker", "flag": "Bahamas 🇧🇸", "dwt": 45000, "current_port": "Port of Rotterdam", "status": "Maintenance", "last_ais_update_str": "3m ago", "is_active": False},
    {"mmsi": 440112000, "imo": 9812345, "name": "HYUNDAI PRIDE", "vessel_type": "Container", "flag": "South Korea 🇰🇷", "dwt": 140000, "current_port": "Port of Incheon", "status": "Underway", "last_ais_update_str": "19s ago", "is_active": True},
    {"mmsi": 636015555, "imo": 9768899, "name": "STAR ATLANTIC", "vessel_type": "Bulk Carrier", "flag": "Liberia 🇱🇷", "dwt": 82000, "current_port": "Port of Vancouver", "status": "Moored", "last_ais_update_str": "11s ago", "is_active": True},
    {"mmsi": 244880000, "imo": 9845566, "name": "SMART TUG TITAN", "vessel_type": "Tug / Support", "flag": "Netherlands 🇳🇱", "dwt": 1500, "current_port": "Port of Rotterdam", "status": "Moored", "last_ais_update_str": "1s ago", "is_active": True},
    {"mmsi": 351222000, "imo": 9711223, "name": "PANAMAX STAR", "vessel_type": "Bulk Carrier", "flag": "Panama 🇵🇦", "dwt": 75000, "current_port": "Port of Santos", "status": "At Anchor", "last_ais_update_str": "45s ago", "is_active": True},
    {"mmsi": 538099888, "imo": 9723344, "name": "MARSHALL TITAN", "vessel_type": "Tanker", "flag": "Marshall Islands 🇲🇭", "dwt": 318000, "current_port": "Fujairah Anchorage", "status": "At Anchor", "last_ais_update_str": "50s ago", "is_active": True},
    {"mmsi": 211888999, "imo": 9856677, "name": "HAMBURG EXPRESS", "vessel_type": "Container", "flag": "Germany 🇩🇪", "dwt": 142000, "current_port": "Port of Hamburg", "status": "Underway", "last_ais_update_str": "8s ago", "is_active": True},
    {"mmsi": 228999000, "imo": 9867788, "name": "MARSEILLE BREEZE", "vessel_type": "Ro-Ro", "flag": "France 🇫🇷", "dwt": 18500, "current_port": "Port of Marseille", "status": "Moored", "last_ais_update_str": "16s ago", "is_active": True},
    {"mmsi": 477112233, "imo": 9781122, "name": "ORIENT GLORY", "vessel_type": "Container", "flag": "Hong Kong 🇭🇰", "dwt": 165000, "current_port": "Port of Shenzhen", "status": "Underway", "last_ais_update_str": "29s ago", "is_active": True},
    {"mmsi": 563445566, "imo": 9792233, "name": "SINGAPORE COURAGE", "vessel_type": "LNG Carrier", "flag": "Singapore 🇸🇬", "dwt": 98000, "current_port": "Port of Tokyo", "status": "Underway", "last_ais_update_str": "17s ago", "is_active": True},
    {"mmsi": 311778899, "imo": 9803344, "name": "CARIBBEAN PEARL", "vessel_type": "Chemical Tanker", "flag": "Bahamas 🇧🇸", "dwt": 38000, "current_port": "Port of Kingston", "status": "At Anchor", "last_ais_update_str": "1m ago", "is_active": True},
    {"mmsi": 636099111, "imo": 9814455, "name": "MONROVIA EXPRESS", "vessel_type": "Container", "flag": "Liberia 🇱🇷", "dwt": 110000, "current_port": "Port of Durban", "status": "Moored", "last_ais_update_str": "38s ago", "is_active": True},
    {"mmsi": 209554433, "imo": 9825566, "name": "CYPRUS VOYAGER", "vessel_type": "Bulk Carrier", "flag": "Cyprus 🇨🇾", "dwt": 63000, "current_port": "Port of Piraeus", "status": "Maintenance", "last_ais_update_str": "10m ago", "is_active": False},
    {"mmsi": 431998877, "imo": 9836677, "name": "NIPPON SPIRIT", "vessel_type": "Tanker", "flag": "Japan 🇯🇵", "dwt": 300000, "current_port": "Port of Yokohama", "status": "Underway", "last_ais_update_str": "5s ago", "is_active": True},
    {"mmsi": 229112244, "imo": 9847788, "name": "VALLETTA PRINCE", "vessel_type": "Container", "flag": "Malta 🇲🇹", "dwt": 135000, "current_port": "Port of Gioia Tauro", "status": "Moored", "last_ais_update_str": "24s ago", "is_active": True},
    {"mmsi": 374112255, "imo": 9858899, "name": "PANAMA MARU", "vessel_type": "Container", "flag": "Panama 🇵🇦", "dwt": 120000, "current_port": "Port of Colon", "status": "Underway", "last_ais_update_str": "13s ago", "is_active": True},
    {"mmsi": 538223344, "imo": 9869900, "name": "MAJURO BULKER", "vessel_type": "Bulk Carrier", "flag": "Marshall Islands 🇲🇭", "dwt": 95000, "current_port": "Port of Richards Bay", "status": "At Anchor", "last_ais_update_str": "48s ago", "is_active": True},
    {"mmsi": 219001122, "imo": 9870011, "name": "DANISH MONARCH", "vessel_type": "Container", "flag": "Denmark 🇩🇰", "dwt": 175000, "current_port": "Port of Aarhus", "status": "Moored", "last_ais_update_str": "7s ago", "is_active": True},
    {"mmsi": 257334455, "imo": 9881122, "name": "VIKING GUARDIAN", "vessel_type": "Ro-Ro", "flag": "Norway 🇳🇴", "dwt": 21000, "current_port": "Port of Gothenburg", "status": "Underway", "last_ais_update_str": "31s ago", "is_active": True},
    {"mmsi": 636088776, "imo": 9892233, "name": "AFRICAN PHOENIX", "vessel_type": "Bulk Carrier", "flag": "Liberia 🇱🇷", "dwt": 58000, "current_port": "Port of Casablanca", "status": "Moored", "last_ais_update_str": "20s ago", "is_active": True},
    {"mmsi": 352998811, "imo": 9903344, "name": "BALBOA TRADER", "vessel_type": "Container", "flag": "Panama 🇵🇦", "dwt": 88000, "current_port": "Port of Manzanillo", "status": "Underway", "last_ais_update_str": "14s ago", "is_active": True},
    {"mmsi": 566887799, "imo": 9914455, "name": "LION CITY ENERGY", "vessel_type": "LNG Carrier", "flag": "Singapore 🇸🇬", "dwt": 105000, "current_port": "Port of Bintulu", "status": "Moored", "last_ais_update_str": "3s ago", "is_active": True},
    {"mmsi": 477665544, "imo": 9925566, "name": "PEARL RIVER DISPATCH", "vessel_type": "Container", "flag": "Hong Kong 🇭🇰", "dwt": 150000, "current_port": "Port of Guangzhou", "status": "Underway", "last_ais_update_str": "27s ago", "is_active": True},
    {"mmsi": 211002233, "imo": 9936677, "name": "RHINE LEADER", "vessel_type": "Tug / Support", "flag": "Germany 🇩🇪", "dwt": 2100, "current_port": "Port of Duisburg", "status": "Moored", "last_ais_update_str": "9s ago", "is_active": True},
    {"mmsi": 311445566, "imo": 9947788, "name": "NASSAU EXPLORER", "vessel_type": "Chemical Tanker", "flag": "Bahamas 🇧🇸", "dwt": 52000, "current_port": "Port of Freeport", "status": "Inactive", "last_ais_update_str": "25m ago", "is_active": False},
    {"mmsi": 229778899, "imo": 9958899, "name": "MEDITERRANEAN HERO", "vessel_type": "Container", "flag": "Malta 🇲🇹", "dwt": 160000, "current_port": "Port of Marsaxlokk", "status": "Underway", "last_ais_update_str": "15s ago", "is_active": True},
    {"mmsi": 440998811, "imo": 9969900, "name": "BUSAN TITAN", "vessel_type": "Container", "flag": "South Korea 🇰🇷", "dwt": 210000, "current_port": "Port of Gwangyang", "status": "Moored", "last_ais_update_str": "21s ago", "is_active": True},
    {"mmsi": 538776655, "imo": 9970011, "name": "PACIFIC SENTINEL", "vessel_type": "Tanker", "flag": "Marshall Islands 🇲🇭", "dwt": 298000, "current_port": "Port of Kaohsiung", "status": "At Anchor", "last_ais_update_str": "41s ago", "is_active": True},
    {"mmsi": 636077889, "imo": 9981122, "name": "ATLANTIC CHALLENGER", "vessel_type": "Bulk Carrier", "flag": "Liberia 🇱🇷", "dwt": 178000, "current_port": "Port of Norfolk", "status": "Underway", "last_ais_update_str": "11s ago", "is_active": True},
    {"mmsi": 218998877, "imo": 9992233, "name": "COPENHAGEN ZEPHYR", "vessel_type": "Container", "flag": "Denmark 🇩🇰", "dwt": 115000, "current_port": "Port of Gdansk", "status": "Moored", "last_ais_update_str": "4s ago", "is_active": True},
    {"mmsi": 351887766, "imo": 9901122, "name": "COLON EXPRESS", "vessel_type": "Container", "flag": "Panama 🇵🇦", "dwt": 92000, "current_port": "Port of Balboa", "status": "Underway", "last_ais_update_str": "36s ago", "is_active": True},
    {"mmsi": 563223311, "imo": 9902233, "name": "TEMASEK VOYAGER", "vessel_type": "Tanker", "flag": "Singapore 🇸🇬", "dwt": 110000, "current_port": "Port of Jurong", "status": "Moored", "last_ais_update_str": "18s ago", "is_active": True},
    {"mmsi": 235667788, "imo": 9903355, "name": "THAMES PIONEER", "vessel_type": "Chemical Tanker", "flag": "United Kingdom 🇬🇧", "dwt": 34000, "current_port": "Port of London", "status": "Underway", "last_ais_update_str": "12s ago", "is_active": True},
    {"mmsi": 477889900, "imo": 9904466, "name": "VICTORIA STAR", "vessel_type": "Ro-Ro", "flag": "Hong Kong 🇭🇰", "dwt": 24000, "current_port": "Port of Melbourne", "status": "At Anchor", "last_ais_update_str": "29s ago", "is_active": True},
]

INITIAL_VESSEL_LOGS_DATA = [
    {
        "mmsi": 211330000,
        "imo": 9811000,
        "name": "EVER GIVEN",
        "vessel_type": "Container",
        "flag": "Panama 🇵🇦",
        "port": "Port of Rotterdam",
        "terminal": "ECT Delta Container Terminal",
        "berth": "Berth 540",
        "arrival_date": "2026-07-31 08:30",
        "departure_date": "2026-08-02 18:00",
        "ata": "2026-07-31 08:15",
        "etd": "2026-08-02 18:00",
        "status": "Berthed",
        "category": "Arrivals",
        "cargo": "20,124 TEU (Electronics, Auto Parts)",
        "agent": "Evergreen Shipping Lines",
        "draft": 15.8,
    },
    {
        "mmsi": 636019821,
        "imo": 9776432,
        "name": "MSC GULSUN",
        "vessel_type": "Container",
        "flag": "Liberia 🇱🇷",
        "port": "Port of Singapore",
        "terminal": "Pasir Panjang Terminal 4",
        "berth": "Berth P28",
        "arrival_date": "2026-07-31 06:15",
        "departure_date": "2026-08-01 22:00",
        "ata": "2026-07-31 06:05",
        "etd": "2026-08-01 22:00",
        "status": "Docked",
        "category": "Arrivals",
        "cargo": "23,756 TEU (Perishables, Textiles)",
        "agent": "MSC Mediterranean Shipping Co",
        "draft": 16.2,
    },
    {
        "mmsi": 311000854,
        "imo": 9839270,
        "name": "HMM ALGECIRAS",
        "vessel_type": "Container",
        "flag": "Panama 🇵🇦",
        "port": "Port of Hamburg",
        "terminal": "Burchardkai Container Terminal",
        "berth": "Berth CTB-3",
        "arrival_date": "2026-07-30 14:20",
        "departure_date": "2026-07-31 16:45",
        "ata": "2026-07-30 14:10",
        "atd": "2026-07-31 16:45",
        "status": "Departed",
        "category": "Departures",
        "cargo": "23,964 TEU (Heavy Machinery)",
        "agent": "HMM Global Logistics",
        "draft": 15.4,
    },
    {
        "mmsi": 477308900,
        "imo": 9708681,
        "name": "CMA CGM ANTOINE DE SAINT EXUPERY",
        "vessel_type": "Container",
        "flag": "France 🇫🇷",
        "port": "Port of Antwerp-Bruges",
        "terminal": "MPET Deurganckdock",
        "berth": "Berth 1742",
        "arrival_date": "2026-07-31 11:00",
        "departure_date": "2026-08-02 12:00",
        "ata": "2026-07-31 10:50",
        "etd": "2026-08-02 12:00",
        "status": "Clearing Customs",
        "category": "Arrivals",
        "cargo": "20,600 TEU (Consumer Goods)",
        "agent": "CMA CGM Agencies",
        "draft": 15.5,
    },
    {
        "mmsi": 538007204,
        "imo": 9786839,
        "name": "BERGE SPITZBERGEN",
        "vessel_type": "Bulk Carrier",
        "flag": "Marshall Islands 🇲🇭",
        "port": "Port of Qingdao",
        "terminal": "Qingdao Qianwan Ore Terminal",
        "berth": "Berth QO-2",
        "arrival_date": "2026-07-29 19:40",
        "departure_date": "2026-07-31 13:10",
        "ata": "2026-07-29 19:30",
        "atd": "2026-07-31 13:10",
        "status": "Departed",
        "category": "Departures",
        "cargo": "388,000 MT Iron Ore",
        "agent": "Berge Bulk Maritime",
        "draft": 23.1,
    },
    {
        "mmsi": 235112890,
        "imo": 9694500,
        "name": "MOL TRIUMPH",
        "vessel_type": "Container",
        "flag": "Marshall Islands 🇲🇭",
        "port": "Port of Los Angeles",
        "terminal": "APM Terminals Pier 400",
        "berth": "Berth 401",
        "arrival_date": "2026-08-01 04:00",
        "departure_date": "2026-08-04 14:00",
        "eta": "2026-08-01 04:00",
        "etd": "2026-08-04 14:00",
        "status": "Expected",
        "category": "Expected",
        "cargo": "20,170 TEU (Electronics, Apparel)",
        "agent": "ONE Line (Ocean Network Express)",
        "draft": 15.2,
    },
    {
        "mmsi": 636092781,
        "imo": 9812444,
        "name": "VALE BRASIL",
        "vessel_type": "Bulk Carrier",
        "flag": "Singapore 🇸🇬",
        "port": "Port of Tubarão",
        "terminal": "Pier 1 Ore Dock",
        "berth": "Berth P1-A",
        "arrival_date": "2026-08-01 09:30",
        "departure_date": "2026-08-03 21:00",
        "eta": "2026-08-01 09:30",
        "etd": "2026-08-03 21:00",
        "status": "Expected",
        "category": "Expected",
        "cargo": "400,000 MT Iron Ore",
        "agent": "Vale Shipping Corp",
        "draft": 23.0,
    },
    {
        "mmsi": 563004500,
        "imo": 9743210,
        "name": "GASLOG GLASGOW",
        "vessel_type": "LNG Carrier",
        "flag": "Bermuda 🇧🇲",
        "port": "Ras Laffan Port",
        "terminal": "LNG Berth 3",
        "berth": "Berth RL-3",
        "arrival_date": "2026-07-31 02:15",
        "departure_date": "2026-07-31 18:30",
        "ata": "2026-07-31 02:00",
        "etd": "2026-07-31 18:30",
        "status": "Berthed",
        "category": "Arrivals",
        "cargo": "174,000 m³ Liquefied Natural Gas",
        "agent": "GasLog Partners LP",
        "draft": 11.8,
    },
    {
        "mmsi": 218763000,
        "imo": 9632064,
        "name": "MAERSK MC-KINNEY MOLLER",
        "vessel_type": "Container",
        "flag": "Denmark 🇩🇰",
        "port": "Port of Shanghai",
        "terminal": "Yangshan Deepwater Port Phase 4",
        "berth": "Berth Y4-8",
        "arrival_date": "2026-07-30 08:00",
        "departure_date": "2026-07-31 11:30",
        "ata": "2026-07-30 07:45",
        "atd": "2026-07-31 11:30",
        "status": "Departed",
        "category": "Departures",
        "cargo": "18,270 TEU (Industrial Components)",
        "agent": "Maersk Line A/S",
        "draft": 15.6,
    },
    {
        "mmsi": 352001429,
        "imo": 9720002,
        "name": "TI OCEANIA",
        "vessel_type": "Tanker",
        "flag": "Belgium 🇧🇪",
        "port": "Port of Ras Tanura",
        "terminal": "Sea Island Crude Terminal",
        "berth": "Berth SI-4",
        "arrival_date": "2026-08-01 14:00",
        "departure_date": "2026-08-04 06:00",
        "eta": "2026-08-01 14:00",
        "etd": "2026-08-04 06:00",
        "status": "Expected",
        "category": "Expected",
        "cargo": "441,585 DWT Crude Oil",
        "agent": "Euronav NV",
        "draft": 24.5,
    },
    {
        "mmsi": 431008920,
        "imo": 9765432,
        "name": "HOEGH TARGET",
        "vessel_type": "Ro-Ro",
        "flag": "Norway 🇳🇴",
        "port": "Port of Bremerhaven",
        "terminal": "Auto Terminal Bremerhaven",
        "berth": "Berth AT-12",
        "arrival_date": "2026-07-31 09:45",
        "departure_date": "2026-08-01 15:00",
        "ata": "2026-07-31 09:30",
        "etd": "2026-08-01 15:00",
        "status": "Docked",
        "category": "Arrivals",
        "cargo": "8,500 CEU (Electric Vehicles & Trucks)",
        "agent": "Höegh Autoliners",
        "draft": 9.2,
    },
    {
        "mmsi": 636018320,
        "imo": 9750011,
        "name": "OOCL HONG KONG",
        "vessel_type": "Container",
        "flag": "Hong Kong 🇭🇰",
        "port": "Port of Busan",
        "terminal": "Busan New Port Pier 2",
        "berth": "Berth BNP-2",
        "arrival_date": "2026-07-30 22:15",
        "departure_date": "2026-07-31 14:20",
        "ata": "2026-07-30 22:00",
        "atd": "2026-07-31 14:20",
        "status": "Departed",
        "category": "Departures",
        "cargo": "21,413 TEU (Semiconductors & Display Panels)",
        "agent": "Orient Overseas Container Line",
        "draft": 15.7,
    },
]

INITIAL_GLOBAL_DISRUPTIONS_DATA = [
    {
        "disruption_type": "Military & Geopolitical Blockade",
        "location_name": "Strait of Hormuz (Chokepoint)",
        "latitude": 26.56,
        "longitude": 56.25,
        "start_date": "2026-07-28 00:00",
        "end_date": "2026-08-10 23:59",
        "severity": "critical",
        "radius_nm": 150.0,
        "description": "Heightened military drills & missile test zone blocking commercial oil tankers and container vessels through Persian Gulf entrance.",
        "affected_vessels_count": 14,
        "resolved": False,
    },
    {
        "disruption_type": "Extreme Weather / Typhoon",
        "location_name": "East China Sea (Typhoon Gaemi)",
        "latitude": 28.40,
        "longitude": 125.10,
        "start_date": "2026-07-30 06:00",
        "end_date": "2026-08-03 18:00",
        "severity": "high",
        "radius_nm": 280.0,
        "description": "Category 4 Super Typhoon generating 11-meter swell waves and 140 knot wind gusts along Shanghai-Ningbo maritime corridor.",
        "affected_vessels_count": 22,
        "resolved": False,
    },
    {
        "disruption_type": "Port Strike & Labor Action",
        "location_name": "Port of Los Angeles & Long Beach",
        "latitude": 33.74,
        "longitude": -118.26,
        "start_date": "2026-07-29 12:00",
        "end_date": "2026-08-01 12:00",
        "severity": "medium",
        "radius_nm": 40.0,
        "description": "Dockworker union 24-hour shift slowdown causing 6-day vessel queuing delays at container berth cranes.",
        "affected_vessels_count": 9,
        "resolved": False,
    },
    {
        "disruption_type": "Chokepoint / Canal Blockage",
        "location_name": "Panama Canal (Gatun Lake Drought)",
        "latitude": 9.15,
        "longitude": -79.85,
        "start_date": "2026-07-15 00:00",
        "end_date": "2026-08-15 00:00",
        "severity": "high",
        "radius_nm": 60.0,
        "description": "Draft restrictions limited to 44 feet due to low reservoir levels, forcing Neo-Panamax vessels to wait or reroute via Cape Horn.",
        "affected_vessels_count": 31,
        "resolved": False,
    },
]

INITIAL_SYSTEM_CARDS_DATA = [
    {
        "id": "db",
        "name": "PostgreSQL / TimescaleDB",
        "status": "Operational",
        "uptime_pct": 99.99,
        "latency_ms": 12.0,
        "last_sync": "0.4s ago",
        "details": "Primary relational & time-series spatial database engine running smoothly.",
        "metrics": [
            {"label": "Active Connections", "value": "48 / 120"},
            {"label": "Cache Hit Ratio", "value": "99.4%"},
            {"label": "DB Query Latency", "value": "12 ms"},
            {"label": "Storage Used", "value": "142.8 GB (35%)"},
        ],
    },
    {
        "id": "ais",
        "name": "AIS Telemetry Stream Poller",
        "status": "Operational",
        "uptime_pct": 99.95,
        "latency_ms": 45.0,
        "last_sync": "1.1s ago",
        "details": "Satellite & terrestrial AIS signal ingestion pipeline parsing live MMSI position frames.",
        "metrics": [
            {"label": "Ingest Throughput", "value": "5,240 msg/sec"},
            {"label": "Active Vessels Tracked", "value": "50 Vessels"},
            {"label": "Packet Drop Rate", "value": "0.001%"},
            {"label": "Buffer Queue Depth", "value": "14 msgs"},
        ],
    },
    {
        "id": "weather",
        "name": "NOAA / OpenWeather Poller",
        "status": "Operational",
        "uptime_pct": 99.88,
        "latency_ms": 120.0,
        "last_sync": "42s ago",
        "details": "Global maritime wave height, wind vector & typhoon tracking weather poller.",
        "metrics": [
            {"label": "Last Fetch", "value": "42s ago"},
            {"label": "Weather Grids Updated", "value": "1,840 sectors"},
            {"label": "API Quota Remaining", "value": "86.4%"},
            {"label": "Alert Generation", "value": "Active"},
        ],
    },
    {
        "id": "congestion",
        "name": "Port Congestion Analytics Poller",
        "status": "Operational",
        "uptime_pct": 99.75,
        "latency_ms": 180.0,
        "last_sync": "2 min ago",
        "details": "Automated queue calculation, waiting hours computation & berth bottleneck detector.",
        "metrics": [
            {"label": "Monitored Ports", "value": "18 Major Ports"},
            {"label": "Avg Wait Calculations", "value": "Every 5 min"},
            {"label": "Mode-Swap Trigger", "value": "Armed"},
            {"label": "Accuracy Rating", "value": "98.6%"},
        ],
    },
]

INITIAL_ERROR_LOGS_DATA = [
    {
        "timestamp_str": "2026-07-31 14:48:12",
        "service": "AIS Poller",
        "severity": "WARNING",
        "code": "AIS_LATENCY_SPIKE",
        "message": "Terrestrial station station_rotterdam_04 experienced 1.8s delay in packet broadcast.",
        "stack_trace": "at TelemetryStreamBuffer.processChunk (ais_poller.py:142)\n  at Socket.onMessage (stream_ingest.py:88)",
        "resolved": True,
    },
    {
        "timestamp_str": "2026-07-31 13:22:05",
        "service": "Weather Poller",
        "severity": "ERROR",
        "code": "WEATHER_API_RATE_LIMIT_WARNING",
        "message": "NOAA GFS endpoint returned HTTP 429 Too Many Requests. Retried with backup provider ECMWF.",
        "stack_trace": "at WeatherFetcher.fetchGfsGrid (weather_service.py:204)\n  at RetryStrategy.execute (http_client.py:56)",
        "resolved": True,
    },
    {
        "timestamp_str": "2026-07-31 11:05:44",
        "service": "Database Engine",
        "severity": "CRITICAL",
        "code": "DEADLOCK_PREVENTED",
        "message": "Concurrent update on table port_wait_times prevented by TimescaleDB hypertable row lock.",
        "stack_trace": "at TransactionManager.commit (db_pool.py:94)\n  at CongestionWorker.updatePortStats (port_worker.py:312)",
        "resolved": False,
    },
    {
        "timestamp_str": "2026-07-31 09:14:18",
        "service": "Reroute Optimizer",
        "severity": "WARNING",
        "code": "MODE_SWAP_RAIL_CAPACITY_WARN",
        "message": "Rotterdam-Duisburg rail freight hub capacity reached 92% threshold for Mode-Swap option.",
        "stack_trace": "at ModeSwapEvaluator.checkRailHub (mode_swap.py:118)\n  at RouteCalculator.evaluateOptions (reroute.py:45)",
        "resolved": True,
    },
    {
        "timestamp_str": "2026-07-30 22:40:01",
        "service": "WebSocket Gateway",
        "severity": "INFO",
        "code": "CLIENT_DISCONNECT_CLEANUP",
        "message": "Client session ID ws_usr_8812 disconnected gracefully after 4 hours active stream.",
        "stack_trace": "at WebSocketServer.handleDisconnect (ws_gateway.py:175)",
        "resolved": True,
    },
]

from app.models.users import User
from app.models.data_management import DataUploadLog, DataCleanupLog
from app.core.security import get_password_hash

INITIAL_ADMIN_USERS_DATA = [
    {
        "name": "Sarah Jenkins",
        "email": "sarah.j@freightfirewall.com",
        "username": "sarah_jenkins",
        "role": "Admin",
        "last_login": "2026-08-12 10:45 AM",
        "status_label": "Active",
        "is_active": True,
        "assigned_port": "Global Control HQ",
        "department": "System Architecture",
        "phone": "+1 (555) 019-2834",
    },
    {
        "name": "Captain Alex Morgan",
        "email": "a.morgan@portofrotterdam.com",
        "username": "alex_morgan",
        "role": "Port Manager",
        "last_login": "2026-08-12 09:12 AM",
        "status_label": "Active",
        "is_active": True,
        "assigned_port": "Port of Rotterdam",
        "department": "Port Operations",
        "phone": "+31 10 252 1000",
    },
    {
        "name": "Elena Rostova",
        "email": "e.rostova@globalmaritime.io",
        "username": "elena_rostova",
        "role": "Logistics Manager",
        "last_login": "2026-08-11 04:30 PM",
        "status_label": "Active",
        "is_active": True,
        "assigned_port": "Hamburg Hub",
        "department": "Supply Chain Logistics",
        "phone": "+49 40 3770 0",
    },
    {
        "name": "Marcus Vance",
        "email": "m.vance@supplychain.ai",
        "username": "marcus_vance",
        "role": "Analyst",
        "last_login": "2026-08-09 02:15 PM",
        "status_label": "Inactive",
        "is_active": False,
        "assigned_port": "Analytics Unit",
        "department": "Risk & Prediction",
        "phone": "+1 (555) 432-8765",
    },
    {
        "name": "David Chen",
        "email": "d.chen@singaporeport.gov.sg",
        "username": "david_chen",
        "role": "Port Manager",
        "last_login": "2026-08-12 11:02 AM",
        "status_label": "Active",
        "is_active": True,
        "assigned_port": "Port of Singapore",
        "department": "Maritime Authority",
        "phone": "+65 6375 1600",
    },
    {
        "name": "Amira Al-Mansoor",
        "email": "amira@dubaisupply.ae",
        "username": "amira_mansoor",
        "role": "Viewer",
        "last_login": "2026-07-28 01:20 PM",
        "status_label": "Suspended",
        "is_active": False,
        "assigned_port": "Jebel Ali Port",
        "department": "External Audit",
        "phone": "+971 4 881 1111",
    },
    {
        "name": "Henrik Visser",
        "email": "h.visser@maersk-tech.com",
        "username": "henrik_visser",
        "role": "Logistics Manager",
        "last_login": "2026-08-12 08:05 AM",
        "status_label": "Active",
        "is_active": True,
        "assigned_port": "Antwerp Gateway",
        "department": "Fleet Dispatch",
        "phone": "+45 33 63 33 63",
    },
]

INITIAL_UPLOAD_LOGS_DATA = [
    {
        "file_name": "ais_telemetry_2026_q3_batch1.csv",
        "dataset_type": "AIS Telemetry",
        "uploaded_by": "Sarah Jenkins",
        "uploaded_at_str": "2026-08-11 16:45",
        "records_ingested": 250000,
        "file_size_bytes": 28400000,
        "status": "Success",
    },
    {
        "file_name": "global_port_berth_capacities_2026.json",
        "dataset_type": "Ports Database",
        "uploaded_by": "Captain Alex Morgan",
        "uploaded_at_str": "2026-08-10 11:20",
        "records_ingested": 24,
        "file_size_bytes": 142000,
        "status": "Success",
    },
    {
        "file_name": "imo_fleet_vessels_update.csv",
        "dataset_type": "Vessel Directory",
        "uploaded_by": "David Chen",
        "uploaded_at_str": "2026-08-08 09:15",
        "records_ingested": 50,
        "file_size_bytes": 380000,
        "status": "Success",
    },
    {
        "file_name": "suez_canal_congestion_feed_aug.csv",
        "dataset_type": "Congestion CSV",
        "uploaded_by": "Elena Rostova",
        "uploaded_at_str": "2026-08-05 14:02",
        "records_ingested": 12500,
        "file_size_bytes": 1850000,
        "status": "Success",
    },
]

INITIAL_CLEANUP_LOGS_DATA = [
    {
        "operation_type": "Delete Old AIS",
        "executed_by": "Sarah Jenkins",
        "executed_at_str": "2026-08-01 02:00",
        "records_affected": 1500000,
        "size_freed_mb": 420.5,
        "details": "Purged raw AIS telemetry points older than 30 days.",
    },
    {
        "operation_type": "Delete Old Simulations",
        "executed_by": "System Auto-Maintenance",
        "executed_at_str": "2026-08-05 03:00",
        "records_affected": 320000,
        "size_freed_mb": 280.0,
        "details": "Pruned expired Monte Carlo route simulation cache.",
    },
]

def seed_admin_datasets(db: Session):
    """Seed initial datasets for Vessels, Vessel Logs, Disruptions, Users, Uploads, and System Health if empty."""
    # 1. Seed Vessels (50 pre-seeded vessels)
    if db.query(Vessel).count() == 0:
        print("[DB] Seeding 50 pre-seeded vessels...")
        for item in INITIAL_50_VESSELS_DATA:
            v = Vessel(**item)
            db.add(v)
        db.commit()

    # 2. Seed Vessel Logs
    if db.query(VesselLog).count() == 0:
        print("[DB] Seeding initial vessel logs...")
        for item in INITIAL_VESSEL_LOGS_DATA:
            vl = VesselLog(**item)
            db.add(vl)
        db.commit()

    # 3. Seed Global Disruptions
    if db.query(GlobalDisruption).count() == 0:
        print("[DB] Seeding initial global disruptions...")
        for item in INITIAL_GLOBAL_DISRUPTIONS_DATA:
            gd = GlobalDisruption(**item)
            db.add(gd)
        db.commit()

    # 4. Seed System Health Cards
    if db.query(SystemHealthCard).count() == 0:
        print("[DB] Seeding system health cards...")
        for item in INITIAL_SYSTEM_CARDS_DATA:
            card = SystemHealthCard(**item)
            db.add(card)
        db.commit()

    # 5. Seed System Error Logs
    if db.query(SystemErrorLog).count() == 0:
        print("[DB] Seeding system error logs...")
        for item in INITIAL_ERROR_LOGS_DATA:
            err = SystemErrorLog(**item)
            db.add(err)
        db.commit()

    # 6. Seed Additional Users if user count is low
    if db.query(User).count() <= 1:
        print("[DB] Seeding system users directory...")
        hashed_pwd = get_password_hash("password123")
        for u_data in INITIAL_ADMIN_USERS_DATA:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                u = User(
                    email=u_data["email"],
                    username=u_data["username"],
                    full_name=u_data["name"],
                    hashed_password=hashed_pwd,
                    role=u_data["role"],
                    is_active=u_data["is_active"],
                    status_label=u_data["status_label"],
                    assigned_port=u_data["assigned_port"],
                    department=u_data["department"],
                    phone=u_data["phone"],
                    last_login=u_data["last_login"]
                )
                db.add(u)
        db.commit()

    # 7. Seed Upload History Logs
    if db.query(DataUploadLog).count() == 0:
        print("[DB] Seeding upload audit history logs...")
        for u_log in INITIAL_UPLOAD_LOGS_DATA:
            db.add(DataUploadLog(**u_log))
        db.commit()

    # 8. Seed Cleanup Logs
    if db.query(DataCleanupLog).count() == 0:
        print("[DB] Seeding cleanup maintenance logs...")
        for c_log in INITIAL_CLEANUP_LOGS_DATA:
            db.add(DataCleanupLog(**c_log))
        db.commit()

