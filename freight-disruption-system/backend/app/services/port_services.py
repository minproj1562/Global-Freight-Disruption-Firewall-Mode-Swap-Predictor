# backend/app/services/port_service.py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.ports import Port, PortCongestionHistory
from typing import List
import random

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
    
    db.commit()
    print(f"✅ Seeded {len(sample_ports)} sample ports with berths, arrivals, and history")