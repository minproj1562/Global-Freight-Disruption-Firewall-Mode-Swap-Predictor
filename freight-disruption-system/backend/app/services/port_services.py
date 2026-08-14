# backend/app/services/port_service.py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.ports import Port, PortCongestionHistory, PortNetwork
from typing import List
import random
import math

def calculate_haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in nautical miles between two lat/lon coordinates."""
    R_nm = 3440.065  # Earth radius in nautical miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R_nm * c, 1)

def ensure_network_connections_for_port(port_id: str, db: Session) -> List[PortNetwork]:
    """
    Dynamically generates and saves 4 to 6 realistic trading partner network connections 
    for ANY port in the database using geographic proximity and global trade hubs.
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        return []
        
    existing = db.query(PortNetwork).filter(PortNetwork.source_port_id == port_id).all()
    if len(existing) >= 3:
        return existing
        
    all_ports = db.query(Port).filter(Port.id != port_id).all()
    if not all_ports:
        return []
        
    # Calculate distance to all other ports
    port_distances = []
    for other in all_ports:
        dist_nm = calculate_haversine_distance_nm(port.latitude, port.longitude, other.latitude, other.longitude)
        port_distances.append((other, dist_nm))
        
    # Sort by distance
    port_distances.sort(key=lambda x: x[1])
    
    # Major global hub IDs
    global_hubs = {"port-rotterdam", "port-singapore", "port-shanghai", "port-la", "port-jebel-ali", "port-hamburg", "port-busan", "port-ningbo", "port-santos", "port-tokyo"}
    
    selected_dest_ids = set()
    
    # 1. Select 3 closest regional ports
    for p_other, _ in port_distances:
        if len(selected_dest_ids) >= 3:
            break
        selected_dest_ids.add(p_other.id)
        
    # 2. Select 2-3 major global hubs that are not the port itself
    for hub_id in global_hubs:
        if len(selected_dest_ids) >= 5:
            break
        if hub_id != port_id and any(p.id == hub_id for p, _ in port_distances):
            selected_dest_ids.add(hub_id)
            
    # Save network connections to DB
    new_networks = []
    for dest_id in selected_dest_ids:
        already_exists = db.query(PortNetwork).filter(
            PortNetwork.source_port_id == port_id,
            PortNetwork.dest_port_id == dest_id
        ).first()
        if not already_exists:
            dest_p = next((p for p, _ in port_distances if p.id == dest_id), None)
            dist_nm = calculate_haversine_distance_nm(port.latitude, port.longitude, dest_p.latitude, dest_p.longitude) if dest_p else 1500.0
            avg_transit = max(1.5, round(dist_nm / 450.0, 1))
            
            nw = PortNetwork(
                source_port_id=port_id,
                dest_port_id=dest_id,
                distance_nautical_miles=dist_nm,
                avg_transit_days=avg_transit
            )
            db.add(nw)
            new_networks.append(nw)
            
    db.commit()
    return db.query(PortNetwork).filter(PortNetwork.source_port_id == port_id).all()


def calculate_port_congestion(port: Port, db: Session) -> dict:
    """
    Calculate real-time port congestion metrics.
    Updates port.congestion_percent, congestion_level, avg_wait_hours.
    """
    # Calculate berth utilization
    if port.berth_capacity > 0:
        berth_utilization = (port.active_berths_used / port.berth_capacity) * 100
    else:
        berth_utilization = 0
    
    # Estimate wait time based on waiting vessels and berth capacity
    if port.berth_capacity > 0:
        avg_wait_hours = (port.waiting_vessels / port.berth_capacity) * 12  # Rough estimate
    else:
        avg_wait_hours = 0
    
    # Determine congestion level
    if berth_utilization < 25:
        congestion_level = "low"
    elif berth_utilization < 50:
        congestion_level = "medium"
    elif berth_utilization < 85:
        congestion_level = "high"
    else:
        congestion_level = "critical"
    
    # Update port
    port.congestion_percent = int(berth_utilization)
    port.congestion_level = congestion_level
    port.avg_wait_hours = round(avg_wait_hours, 1)
    
    # Update status label
    if congestion_level == "critical":
        port.status_label = "Critical Congestion"
    elif congestion_level == "high":
        port.status_label = "High Congestion"
    elif congestion_level == "medium":
        port.status_label = "Moderate Traffic"
    else:
        port.status_label = "Operational"
    
    db.commit()
    
    return {
        "congestion_percent": port.congestion_percent,
        "congestion_level": port.congestion_level,
        "avg_wait_hours": port.avg_wait_hours
    }

def record_congestion_history(port_id: str, db: Session):
    """
    Record current congestion snapshot to history table.
    Called periodically (e.g., every hour).
    """
    port = db.query(Port).filter(Port.id == port_id).first()
    
    if not port:
        return
    
    history_record = PortCongestionHistory(
        port_id=port_id,
        congestion_percent=port.congestion_percent,
        waiting_vessels=port.waiting_vessels,
        avg_wait_hours=port.avg_wait_hours,
        disruption_flag=False  # Will be set by disruption flagging
    )
    
    db.add(history_record)
    db.commit()

def seed_sample_ports(db: Session):
    """
    Seed database with sample ports from EXTENDED_PORTS_DATA.
    Run this once during initial setup.
    """
    from app.models.ports import BerthSlot, VesselArrival
    
    sample_ports = [
        {
            "id": "port-rotterdam",
            "name": "Port of Rotterdam",
            "code": "NLRTM",
            "country": "Netherlands",
            "latitude": 51.9225,
            "longitude": 4.47917,
            "berth_capacity": 45,
            "active_berths_used": 38,
            "congestion_percent": 84,
            "congestion_level": "high",
            "waiting_vessels": 12,
            "avg_wait_hours": 8.5,
            "status_label": "High Congestion",
            "primary_exports": ["Containers", "Chemicals", "Oil Products", "Coal"]
        },
        {
            "id": "port-singapore",
            "name": "Port of Singapore",
            "code": "SGSIN",
            "country": "Singapore",
            "latitude": 1.2644,
            "longitude": 103.8219,
            "berth_capacity": 60,
            "active_berths_used": 47,
            "congestion_percent": 78,
            "congestion_level": "high",
            "waiting_vessels": 15,
            "avg_wait_hours": 10.2,
            "status_label": "High Congestion",
            "primary_exports": ["Containers", "Electronics", "Refined Petroleum"]
        },
        {
            "id": "port-shanghai",
            "name": "Port of Shanghai",
            "code": "CNSHA",
            "country": "China",
            "latitude": 31.2304,
            "longitude": 121.4737,
            "berth_capacity": 80,
            "active_berths_used": 72,
            "congestion_percent": 90,
            "congestion_level": "critical",
            "waiting_vessels": 22,
            "avg_wait_hours": 14.8,
            "status_label": "Critical Congestion",
            "primary_exports": ["Containers", "Machinery", "Textiles", "Steel"]
        },
        {
            "id": "port-la",
            "name": "Port of Los Angeles",
            "code": "USLAX",
            "country": "United States",
            "latitude": 33.7405,
            "longitude": -118.2720,
            "berth_capacity": 50,
            "active_berths_used": 32,
            "congestion_percent": 64,
            "congestion_level": "medium",
            "waiting_vessels": 8,
            "avg_wait_hours": 6.2,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Containers", "Automobiles", "Electronics"]
        },
        {
            "id": "port-hamburg",
            "name": "Port of Hamburg",
            "code": "DEHAM",
            "country": "Germany",
            "latitude": 53.5511,
            "longitude": 9.9937,
            "berth_capacity": 40,
            "active_berths_used": 28,
            "congestion_percent": 70,
            "congestion_level": "high",
            "waiting_vessels": 9,
            "avg_wait_hours": 7.5,
            "status_label": "High Congestion",
            "primary_exports": ["Containers", "Machinery", "Automobiles"]
        },
        {
            "id": "port-dubai",
            "name": "Port of Jebel Ali",
            "code": "AEJEA",
            "country": "UAE",
            "latitude": 25.0096,
            "longitude": 55.1125,
            "berth_capacity": 35,
            "active_berths_used": 18,
            "congestion_percent": 51,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 4.8,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Containers", "Re-exports", "Oil Products"]
        },
        {
            "id": "port-antwerp",
            "name": "Port of Antwerp-Bruges",
            "code": "BEANR",
            "country": "Belgium",
            "latitude": 51.2194,
            "longitude": 4.4025,
            "berth_capacity": 50,
            "active_berths_used": 34,
            "congestion_percent": 68,
            "congestion_level": "high",
            "waiting_vessels": 9,
            "avg_wait_hours": 6.8,
            "status_label": "High Congestion",
            "primary_exports": ["Chemicals", "Vehicles", "Steel", "Containers"]
        },
        {
            "id": "port-ningbo",
            "name": "Port of Ningbo-Zhoushan",
            "code": "CNNGB",
            "country": "China",
            "latitude": 29.8683,
            "longitude": 121.5440,
            "berth_capacity": 75,
            "active_berths_used": 62,
            "congestion_percent": 82,
            "congestion_level": "high",
            "waiting_vessels": 18,
            "avg_wait_hours": 11.4,
            "status_label": "High Congestion",
            "primary_exports": ["Iron Ore", "Crude Oil", "Containers", "Coal"]
        },
        {
            "id": "port-busan",
            "name": "Port of Busan",
            "code": "KRPUS",
            "country": "South Korea",
            "latitude": 35.1796,
            "longitude": 129.0756,
            "berth_capacity": 55,
            "active_berths_used": 38,
            "congestion_percent": 69,
            "congestion_level": "high",
            "waiting_vessels": 11,
            "avg_wait_hours": 7.2,
            "status_label": "High Congestion",
            "primary_exports": ["Electronics", "Automobiles", "Shipbuilding Component", "Containers"]
        },
        {
            "id": "port-yokohama",
            "name": "Port of Yokohama",
            "code": "JPYOK",
            "country": "Japan",
            "latitude": 35.4437,
            "longitude": 139.6380,
            "berth_capacity": 38,
            "active_berths_used": 19,
            "congestion_percent": 50,
            "congestion_level": "medium",
            "waiting_vessels": 4,
            "avg_wait_hours": 4.1,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Automobiles", "Industrial Machinery", "Precision Tools"]
        },
        {
            "id": "port-felixstowe",
            "name": "Port of Felixstowe",
            "code": "GBFXT",
            "country": "United Kingdom",
            "latitude": 51.9567,
            "longitude": 1.3090,
            "berth_capacity": 30,
            "active_berths_used": 14,
            "congestion_percent": 46,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 3.8,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Containers", "Consumer Goods", "Food Products"]
        },
        {
            "id": "port-tan-pelepas",
            "name": "Port of Tanjung Pelepas",
            "code": "MYTPP",
            "country": "Malaysia",
            "latitude": 1.3653,
            "longitude": 103.5482,
            "berth_capacity": 42,
            "active_berths_used": 26,
            "congestion_percent": 62,
            "congestion_level": "medium",
            "waiting_vessels": 7,
            "avg_wait_hours": 5.9,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Transshipment Containers", "Palm Oil", "Electronics"]
        },
        {
            "id": "port-shenzhen",
            "name": "Port of Shenzhen",
            "code": "CNSZX",
            "country": "China",
            "latitude": 22.5431,
            "longitude": 114.0579,
            "berth_capacity": 65,
            "active_berths_used": 54,
            "congestion_percent": 83,
            "congestion_level": "high",
            "waiting_vessels": 14,
            "avg_wait_hours": 9.5,
            "status_label": "High Congestion",
            "primary_exports": ["Electronics", "Computers", "Toys", "Textiles"]
        },
        {
            "id": "port-guangzhou",
            "name": "Port of Guangzhou",
            "code": "CNGZG",
            "country": "China",
            "latitude": 23.1291,
            "longitude": 113.2644,
            "berth_capacity": 55,
            "active_berths_used": 42,
            "congestion_percent": 76,
            "congestion_level": "high",
            "waiting_vessels": 10,
            "avg_wait_hours": 7.8,
            "status_label": "High Congestion",
            "primary_exports": ["Automobiles", "Electronics", "Chemicals"]
        },
        {
            "id": "port-qingdao",
            "name": "Port of Qingdao",
            "code": "CNQIN",
            "country": "China",
            "latitude": 36.0671,
            "longitude": 120.3826,
            "berth_capacity": 60,
            "active_berths_used": 41,
            "congestion_percent": 68,
            "congestion_level": "high",
            "waiting_vessels": 8,
            "avg_wait_hours": 6.5,
            "status_label": "High Congestion",
            "primary_exports": ["Grains", "Steel", "Coal", "Machinery"]
        },
        {
            "id": "port-tianjin",
            "name": "Port of Tianjin",
            "code": "CNTSN",
            "country": "China",
            "latitude": 39.0042,
            "longitude": 117.7134,
            "berth_capacity": 52,
            "active_berths_used": 34,
            "congestion_percent": 65,
            "congestion_level": "high",
            "waiting_vessels": 7,
            "avg_wait_hours": 5.8,
            "status_label": "High Congestion",
            "primary_exports": ["Metal Products", "Coke", "Chemicals"]
        },
        {
            "id": "port-hongkong",
            "name": "Port of Hong Kong",
            "code": "HKHKG",
            "country": "Hong Kong",
            "latitude": 22.2855,
            "longitude": 114.1577,
            "berth_capacity": 50,
            "active_berths_used": 31,
            "congestion_percent": 62,
            "congestion_level": "medium",
            "waiting_vessels": 6,
            "avg_wait_hours": 4.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Textiles", "Electronics", "Apparel"]
        },
        {
            "id": "port-kaohsiung",
            "name": "Port of Kaohsiung",
            "code": "TWKHH",
            "country": "Taiwan",
            "latitude": 22.6127,
            "longitude": 120.2851,
            "berth_capacity": 48,
            "active_berths_used": 28,
            "congestion_percent": 58,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 4.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Semiconductors", "Petrochemicals", "Machinery"]
        },
        {
            "id": "port-tokyo",
            "name": "Port of Tokyo",
            "code": "JPTYO",
            "country": "Japan",
            "latitude": 35.6762,
            "longitude": 139.7698,
            "berth_capacity": 44,
            "active_berths_used": 25,
            "congestion_percent": 56,
            "congestion_level": "medium",
            "waiting_vessels": 4,
            "avg_wait_hours": 3.8,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Auto Parts", "Electronics", "Chemical Products"]
        },
        {
            "id": "port-colombo",
            "name": "Port of Colombo",
            "code": "LKCMB",
            "country": "Sri Lanka",
            "latitude": 6.9497,
            "longitude": 79.8428,
            "berth_capacity": 40,
            "active_berths_used": 19,
            "congestion_percent": 47,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 3.2,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Tea", "Garments", "Rubber Products"]
        },
        {
            "id": "port-mumbai",
            "name": "Port of Mumbai",
            "code": "INBOM",
            "country": "India",
            "latitude": 18.9220,
            "longitude": 72.8347,
            "berth_capacity": 38,
            "active_berths_used": 16,
            "congestion_percent": 42,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 2.8,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Textiles", "Engineering Goods", "Chemicals"]
        },
        {
            "id": "port-mundra",
            "name": "Port of Mundra",
            "code": "INMUN",
            "country": "India",
            "latitude": 22.8393,
            "longitude": 69.7254,
            "berth_capacity": 45,
            "active_berths_used": 32,
            "congestion_percent": 71,
            "congestion_level": "high",
            "waiting_vessels": 9,
            "avg_wait_hours": 7.1,
            "status_label": "High Congestion",
            "primary_exports": ["Coal", "Agricultural Products", "Textiles"]
        },
        {
            "id": "port-piraeus",
            "name": "Port of Piraeus",
            "code": "GRPIR",
            "country": "Greece",
            "latitude": 37.9477,
            "longitude": 23.6387,
            "berth_capacity": 35,
            "active_berths_used": 18,
            "congestion_percent": 51,
            "congestion_level": "medium",
            "waiting_vessels": 4,
            "avg_wait_hours": 4.1,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Food & Beverages", "Petroleum", "Chemicals"]
        },
        {
            "id": "port-algeciras",
            "name": "Port of Algeciras",
            "code": "ESALG",
            "country": "Spain",
            "latitude": 36.1268,
            "longitude": -5.4508,
            "berth_capacity": 42,
            "active_berths_used": 28,
            "congestion_percent": 66,
            "congestion_level": "high",
            "waiting_vessels": 8,
            "avg_wait_hours": 6.2,
            "status_label": "High Congestion",
            "primary_exports": ["Refined Petroleum", "Fruit", "Vehicles"]
        },
        {
            "id": "port-valencia",
            "name": "Port of Valencia",
            "code": "ESVLC",
            "country": "Spain",
            "latitude": 39.4500,
            "longitude": -0.3225,
            "berth_capacity": 40,
            "active_berths_used": 24,
            "congestion_percent": 60,
            "congestion_level": "medium",
            "waiting_vessels": 6,
            "avg_wait_hours": 5.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Automobiles", "Ceramic Tiles", "Wine"]
        },
        {
            "id": "port-marseille",
            "name": "Port of Marseille",
            "code": "FRMRS",
            "country": "France",
            "latitude": 43.3462,
            "longitude": 5.3222,
            "berth_capacity": 32,
            "active_berths_used": 12,
            "congestion_percent": 37,
            "congestion_level": "medium",
            "waiting_vessels": 2,
            "avg_wait_hours": 2.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Chemicals", "Steel", "Foodstuffs"]
        },
        {
            "id": "port-gioia-tauro",
            "name": "Port of Gioia Tauro",
            "code": "ITGIT",
            "country": "Italy",
            "latitude": 38.4267,
            "longitude": 15.8998,
            "berth_capacity": 36,
            "active_berths_used": 15,
            "congestion_percent": 41,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 3.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Transshipment Cargo", "Citrus", "Olive Oil"]
        },
        {
            "id": "port-bremerhaven",
            "name": "Port of Bremerhaven",
            "code": "DEBRV",
            "country": "Germany",
            "latitude": 53.5396,
            "longitude": 8.5809,
            "berth_capacity": 35,
            "active_berths_used": 20,
            "congestion_percent": 57,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 4.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Automobiles", "Wind Turbines", "Frozen Foods"]
        },
        {
            "id": "port-gothenburg",
            "name": "Port of Gothenburg",
            "code": "SEGOT",
            "country": "Sweden",
            "latitude": 57.7089,
            "longitude": 11.9746,
            "berth_capacity": 28,
            "active_berths_used": 10,
            "congestion_percent": 35,
            "congestion_level": "low",
            "waiting_vessels": 1,
            "avg_wait_hours": 1.2,
            "status_label": "Operational",
            "primary_exports": ["Paper", "Vehicles", "Timber", "Steel"]
        },
        {
            "id": "port-gdansk",
            "name": "Port of Gdansk",
            "code": "PLGDN",
            "country": "Poland",
            "latitude": 54.3520,
            "longitude": 18.6466,
            "berth_capacity": 30,
            "active_berths_used": 14,
            "congestion_percent": 46,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 3.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Coal", "Machinery", "Chemicals", "Wood"]
        },
        {
            "id": "port-longbeach",
            "name": "Port of Long Beach",
            "code": "USLGB",
            "country": "United States",
            "latitude": 33.7546,
            "longitude": -118.2164,
            "berth_capacity": 48,
            "active_berths_used": 33,
            "congestion_percent": 68,
            "congestion_level": "high",
            "waiting_vessels": 9,
            "avg_wait_hours": 6.8,
            "status_label": "High Congestion",
            "primary_exports": ["Containers", "Chemicals", "Petroleum"]
        },
        {
            "id": "port-savannah",
            "name": "Port of Savannah",
            "code": "USSAV",
            "country": "United States",
            "latitude": 32.0809,
            "longitude": -81.0912,
            "berth_capacity": 42,
            "active_berths_used": 28,
            "congestion_percent": 66,
            "congestion_level": "high",
            "waiting_vessels": 8,
            "avg_wait_hours": 6.6,
            "status_label": "High Congestion",
            "primary_exports": ["Agricultural Products", "Paper", "Clay", "Textiles"]
        },
        {
            "id": "port-newyork",
            "name": "Port of New York/New Jersey",
            "code": "USNYC",
            "country": "United States",
            "latitude": 40.6892,
            "longitude": -74.0445,
            "berth_capacity": 46,
            "active_berths_used": 30,
            "congestion_percent": 65,
            "congestion_level": "high",
            "waiting_vessels": 7,
            "avg_wait_hours": 6.5,
            "status_label": "High Congestion",
            "primary_exports": ["Scrap Metal", "Automobiles", "Paper", "Chemicals"]
        },
        {
            "id": "port-houston",
            "name": "Port of Houston",
            "code": "USHOU",
            "country": "United States",
            "latitude": 29.7604,
            "longitude": -95.3698,
            "berth_capacity": 40,
            "active_berths_used": 22,
            "congestion_percent": 55,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 5.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Petroleum Products", "Chemicals", "Plastics"]
        },
        {
            "id": "port-vancouver",
            "name": "Port of Vancouver",
            "code": "CAVAN",
            "country": "Canada",
            "latitude": 49.2827,
            "longitude": -123.1207,
            "berth_capacity": 38,
            "active_berths_used": 19,
            "congestion_percent": 50,
            "congestion_level": "medium",
            "waiting_vessels": 4,
            "avg_wait_hours": 5.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Coal", "Grains", "Forest Products", "Potash"]
        },
        {
            "id": "port-santos",
            "name": "Port of Santos",
            "code": "BRSSZ",
            "country": "Brazil",
            "latitude": -23.9869,
            "longitude": -46.3042,
            "berth_capacity": 44,
            "active_berths_used": 26,
            "congestion_percent": 59,
            "congestion_level": "medium",
            "waiting_vessels": 6,
            "avg_wait_hours": 5.9,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Soybeans", "Sugar", "Coffee", "Orange Juice"]
        },
        {
            "id": "port-cartagena",
            "name": "Port of Cartagena",
            "code": "COCTG",
            "country": "Colombia",
            "latitude": 10.3997,
            "longitude": -75.5144,
            "berth_capacity": 30,
            "active_berths_used": 14,
            "congestion_percent": 46,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 3.6,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Petroleum Products", "Coffee", "Bananas"]
        },
        {
            "id": "port-manzanillo",
            "name": "Port of Manzanillo",
            "code": "MXZLO",
            "country": "Mexico",
            "latitude": 19.0544,
            "longitude": -104.3196,
            "berth_capacity": 32,
            "active_berths_used": 18,
            "congestion_percent": 56,
            "congestion_level": "medium",
            "waiting_vessels": 4,
            "avg_wait_hours": 4.6,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Autoparts", "Minerals", "Tequila"]
        },
        {
            "id": "port-colon",
            "name": "Port of Colon",
            "code": "PAONX",
            "country": "Panama",
            "latitude": 9.3547,
            "longitude": -79.9009,
            "berth_capacity": 35,
            "active_berths_used": 21,
            "congestion_percent": 60,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 5.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Transshipment Cargo", "Clothing", "Electronics"]
        },
        {
            "id": "port-durban",
            "name": "Port of Durban",
            "code": "ZADUR",
            "country": "South Africa",
            "latitude": -29.8587,
            "longitude": 31.0218,
            "berth_capacity": 36,
            "active_berths_used": 20,
            "congestion_percent": 55,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 5.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Automobiles", "Coal", "Citrus Fruit"]
        },
        {
            "id": "port-tangier",
            "name": "Port of Tangier Med",
            "code": "MAPTM",
            "country": "Morocco",
            "latitude": 35.8901,
            "longitude": -5.5072,
            "berth_capacity": 44,
            "active_berths_used": 28,
            "congestion_percent": 63,
            "congestion_level": "medium",
            "waiting_vessels": 6,
            "avg_wait_hours": 6.3,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Automobiles", "Textiles", "Agricultural Goods"]
        },
        {
            "id": "port-lagos",
            "name": "Port of Lagos/Apapa",
            "code": "NGAPP",
            "country": "Nigeria",
            "latitude": 6.4474,
            "longitude": 3.3903,
            "berth_capacity": 28,
            "active_berths_used": 19,
            "congestion_percent": 67,
            "congestion_level": "high",
            "waiting_vessels": 8,
            "avg_wait_hours": 8.7,
            "status_label": "High Congestion",
            "primary_exports": ["Crude Oil", "Cocoa Beans", "Rubber"]
        },
        {
            "id": "port-djibouti",
            "name": "Port of Djibouti",
            "code": "DJJIB",
            "country": "Djibouti",
            "latitude": 11.5880,
            "longitude": 43.1456,
            "berth_capacity": 30,
            "active_berths_used": 12,
            "congestion_percent": 40,
            "congestion_level": "medium",
            "waiting_vessels": 2,
            "avg_wait_hours": 2.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Livestock", "Hides", "Transshipment Cargo"]
        },
        {
            "id": "port-melbourne",
            "name": "Port of Melbourne",
            "code": "AUMEL",
            "country": "Australia",
            "latitude": -37.8136,
            "longitude": 144.9631,
            "berth_capacity": 35,
            "active_berths_used": 16,
            "congestion_percent": 45,
            "congestion_level": "medium",
            "waiting_vessels": 3,
            "avg_wait_hours": 3.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Wool", "Dairy Products", "Automobiles"]
        },
        {
            "id": "port-sydney",
            "name": "Port of Sydney",
            "code": "AUSYD",
            "country": "Australia",
            "latitude": -33.8688,
            "longitude": 151.2093,
            "berth_capacity": 32,
            "active_berths_used": 14,
            "congestion_percent": 43,
            "congestion_level": "medium",
            "waiting_vessels": 2,
            "avg_wait_hours": 2.2,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Coal", "Wheat", "Wool", "Iron Ore"]
        },
        {
            "id": "port-tauranga",
            "name": "Port of Tauranga",
            "code": "NZTRG",
            "country": "New Zealand",
            "latitude": -37.6878,
            "longitude": 176.1651,
            "berth_capacity": 26,
            "active_berths_used": 10,
            "congestion_percent": 38,
            "congestion_level": "medium",
            "waiting_vessels": 1,
            "avg_wait_hours": 1.5,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Dairy", "Kiwifruit", "Timber"]
        },
        {
            "id": "port-khalifa",
            "name": "Port of Khalifa",
            "code": "AEKLF",
            "country": "UAE",
            "latitude": 24.8072,
            "longitude": 54.6476,
            "berth_capacity": 38,
            "active_berths_used": 16,
            "congestion_percent": 42,
            "congestion_level": "medium",
            "waiting_vessels": 2,
            "avg_wait_hours": 2.2,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Aluminum", "Chemicals", "Containers"]
        },
        {
            "id": "port-jeddah",
            "name": "Port of Jeddah",
            "code": "SAJED",
            "country": "Saudi Arabia",
            "latitude": 21.4858,
            "longitude": 39.1925,
            "berth_capacity": 45,
            "active_berths_used": 28,
            "congestion_percent": 62,
            "congestion_level": "medium",
            "waiting_vessels": 5,
            "avg_wait_hours": 5.2,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Industrial Exports", "Re-exports"]
        },
        {
            "id": "port-salalah",
            "name": "Port of Salalah",
            "code": "OMSLL",
            "country": "Oman",
            "latitude": 16.9400,
            "longitude": 54.0000,
            "berth_capacity": 32,
            "active_berths_used": 14,
            "congestion_percent": 43,
            "congestion_level": "medium",
            "waiting_vessels": 2,
            "avg_wait_hours": 2.2,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Gypsum", "Cement", "Containers"]
        },
        {
            "id": "port-haifa",
            "name": "Port of Haifa",
            "code": "ILHFA",
            "country": "Israel",
            "latitude": 32.8191,
            "longitude": 34.9983,
            "berth_capacity": 30,
            "active_berths_used": 12,
            "congestion_percent": 40,
            "congestion_level": "medium",
            "waiting_vessels": 2,
            "avg_wait_hours": 2.0,
            "status_label": "Moderate Traffic",
            "primary_exports": ["Chemicals", "Machinery", "Agricultural Produce"]
        }
    ]
    
    for port_data in sample_ports:
        # Check if port already exists
        existing = db.query(Port).filter(Port.id == port_data["id"]).first()
        if existing:
            continue
        
        # Create port
        port = Port(**port_data)
        db.add(port)
        db.flush()
        
        # Create sample berth slots
        for i in range(1, min(10, port_data["berth_capacity"]) + 1):
            is_occupied = i <= port_data["active_berths_used"]
            berth = BerthSlot(
                port_id=port.id,
                berth_number=f"B{i:02d}",
                berth_name=f"Berth {i}",
                berth_type=random.choice(["Container", "Bulk", "Tanker", "RoRo"]),
                max_vessel_length_meters=random.randint(200, 400),
                max_draught_meters=random.uniform(12.0, 18.0),
                is_occupied=is_occupied,
                current_vessel_mmsi=random.randint(200000000, 799999999) if is_occupied else None,
                current_vessel_name=f"MV Cargo Vessel {i}" if is_occupied else None,
                occupied_since=datetime.utcnow() - timedelta(hours=random.randint(2, 48)) if is_occupied else None,
                estimated_departure=datetime.utcnow() + timedelta(hours=random.randint(4, 72)) if is_occupied else None,
                cargo_operation=random.choice(["Loading", "Unloading", "Bunkering"]) if is_occupied else None,
                crane_count=random.randint(2, 6),
                loading_progress_percent=random.randint(20, 95) if is_occupied else 0
            )
            db.add(berth)
        
        # Create sample vessel arrivals (next 72 hours)
        for j in range(random.randint(5, 15)):
            arrival = VesselArrival(
                port_id=port.id,
                vessel_mmsi=random.randint(200000000, 799999999),
                vessel_name=f"MV Incoming {j+1}",
                vessel_type=random.choice(["Container Ship", "Bulk Carrier", "Tanker"]),
                vessel_flag=random.choice(["Liberia", "Panama", "Marshall Islands", "Singapore"]),
                eta=datetime.utcnow() + timedelta(hours=random.randint(1, 72)),
                status=random.choice(["Scheduled", "Anchored"]),
                berth_assignment_status=random.choice(["Pending", "Assigned"]),
                cargo_type=random.choice(["Containers", "Grain", "Oil", "Coal"]),
                cargo_tonnage=random.uniform(10000, 80000),
                teu_count=random.randint(500, 5000) if random.random() > 0.5 else None
            )
            db.add(arrival)
        
        # Create 7-day congestion history
        for day in range(7):
            timestamp = datetime.utcnow() - timedelta(days=6-day)
            history = PortCongestionHistory(
                port_id=port.id,
                timestamp=timestamp,
                congestion_percent=random.randint(40, 95),
                waiting_vessels=random.randint(3, 20),
                avg_wait_hours=random.uniform(3.0, 15.0),
                disruption_flag=random.random() > 0.85,
                disruption_reason="Weather delay" if random.random() > 0.5 else None
            )
            db.add(history)
    
    # Create sample network connections
    from app.models.ports import PortNetwork
    if db.query(PortNetwork).count() == 0:
        print("[DB] Seeding default port network corridors...")
        networks = [
            # Rotterdam connections
            {"source_port_id": "port-rotterdam", "dest_port_id": "port-singapore", "distance_nautical_miles": 8300.0, "avg_transit_days": 18.5},
            {"source_port_id": "port-rotterdam", "dest_port_id": "port-shanghai", "distance_nautical_miles": 10550.0, "avg_transit_days": 23.0},
            {"source_port_id": "port-rotterdam", "dest_port_id": "port-la", "distance_nautical_miles": 7800.0, "avg_transit_days": 17.0},
            {"source_port_id": "port-rotterdam", "dest_port_id": "port-dubai", "distance_nautical_miles": 6400.0, "avg_transit_days": 14.2},
            {"source_port_id": "port-rotterdam", "dest_port_id": "port-ningbo", "distance_nautical_miles": 10400.0, "avg_transit_days": 22.8},
            # Singapore connections
            {"source_port_id": "port-singapore", "dest_port_id": "port-shanghai", "distance_nautical_miles": 2200.0, "avg_transit_days": 5.0},
            {"source_port_id": "port-singapore", "dest_port_id": "port-dubai", "distance_nautical_miles": 3400.0, "avg_transit_days": 7.5},
            {"source_port_id": "port-singapore", "dest_port_id": "port-busan", "distance_nautical_miles": 2500.0, "avg_transit_days": 5.8},
        ]
        for nw_data in networks:
            nw = PortNetwork(**nw_data)
            db.add(nw)
            
    db.commit()
    print(f"✅ Seeded {len(sample_ports)} sample ports with berths, arrivals, history, and network links")