# backend/app/services/vessel_handler.py
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.vessels import Vessel
from typing import Dict

# Map AIS ship type codes to readable names
SHIP_TYPE_MAP = {
    70: "Cargo",
    71: "Cargo - Hazardous",
    72: "Cargo - Reserved",
    73: "Cargo - Reserved",
    74: "Cargo - Reserved",
    75: "Cargo - Reserved",
    76: "Cargo - Reserved",
    77: "Cargo - Reserved",
    78: "Cargo - Reserved",
    79: "Cargo - Reserved",
    80: "Tanker",
    81: "Tanker - Hazardous",
    82: "Tanker - Reserved",
    83: "Tanker - Reserved",
    84: "Tanker - Reserved",
    85: "Tanker - Reserved",
    86: "Tanker - Reserved",
    87: "Tanker - Reserved",
    88: "Tanker - Reserved",
    89: "Tanker - Reserved",
}

def get_vessel_type_name(ship_type_code: int) -> str:
    """Convert AIS ship type code to readable name"""
    if 70 <= ship_type_code <= 79:
        return "Cargo"
    elif 80 <= ship_type_code <= 89:
        return "Tanker"
    elif ship_type_code in [60, 61, 62, 63, 64, 65, 66, 67, 68, 69]:
        return "Passenger"
    else:
        return SHIP_TYPE_MAP.get(ship_type_code, "Unknown")

async def handle_vessel_update(vessel_data: Dict):
    """
    Process vessel updates from AIS stream.
    Creates or updates vessel records in database.
    """
    db: Session = SessionLocal()
    
    try:
        # Find existing vessel by MMSI
        vessel = db.query(Vessel).filter(Vessel.mmsi == vessel_data["mmsi"]).first()
        
        if vessel:
            # Update existing vessel
            vessel.latitude = vessel_data["latitude"]
            vessel.longitude = vessel_data["longitude"]
            vessel.speed = vessel_data["speed"]
            vessel.heading = vessel_data["heading"]
            vessel.course = vessel_data["course"]
            vessel.last_updated = datetime.utcnow()
            
            # Update speed history (keep last 20 entries)
            if vessel.speed_history is None:
                vessel.speed_history = []
            
            vessel.speed_history.append(vessel_data["speed"])
            if len(vessel.speed_history) > 20:
                vessel.speed_history = vessel.speed_history[-20:]
            
            print(f"[AIS] Updated {vessel.name} ({vessel.mmsi}) - Speed: {vessel.speed:.1f} kts")
        else:
            # Create new vessel
            vessel_type_name = get_vessel_type_name(vessel_data.get("ship_type", 0))
            
            new_vessel = Vessel(
                mmsi=vessel_data["mmsi"],
                imo=vessel_data.get("imo"),
                name=vessel_data.get("vessel_name", "Unknown"),
                callsign=vessel_data.get("callsign"),
                vessel_type=vessel_type_name,
                ship_type_code=vessel_data.get("ship_type", 0),
                latitude=vessel_data["latitude"],
                longitude=vessel_data["longitude"],
                speed=vessel_data["speed"],
                heading=vessel_data["heading"],
                course=vessel_data["course"],
                speed_history=[vessel_data["speed"]],
                status="normal"
            )
            
            db.add(new_vessel)
            print(f"[AIS] New vessel tracked: {new_vessel.name} ({new_vessel.mmsi})")
        
        db.commit()
        
    except Exception as e:
        print(f"[AIS] Error processing vessel {vessel_data.get('mmsi')}: {e}")
        db.rollback()
    finally:
        db.close()