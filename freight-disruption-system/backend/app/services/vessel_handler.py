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
        
        lat = vessel_data.get("latitude")
        lon = vessel_data.get("longitude")
        geom_wkt = f"SRID=4326;POINT({lon} {lat})" if lat is not None and lon is not None else None

        if vessel:
            # Update existing vessel
            vessel.latitude = lat
            vessel.longitude = lon
            if geom_wkt:
                vessel.geom = geom_wkt
            vessel.speed = vessel_data.get("speed", 0.0)
            vessel.heading = vessel_data.get("heading", 0.0)
            vessel.course = vessel_data.get("course", 0.0)
            vessel.last_updated = datetime.utcnow()
            
            # Update speed history (keep last 20 entries)
            if vessel.speed_history is None:
                vessel.speed_history = []
            
            vessel.speed_history.append(vessel_data.get("speed", 0.0))
            if len(vessel.speed_history) > 20:
                vessel.speed_history = vessel.speed_history[-20:]
            
            print(f"[AIS] Updated {vessel.name} ({vessel.mmsi}) - Speed: {vessel.speed:.1f} kts")
        else:
            # Parse IMO integer safely (convert empty string or non-numeric to None)
            raw_imo = vessel_data.get("imo")
            imo_val = None
            if raw_imo and str(raw_imo).strip():
                try:
                    imo_val = int(raw_imo)
                except (ValueError, TypeError):
                    imo_val = None

            raw_name = vessel_data.get("vessel_name", "").strip() or "Unknown Vessel"
            callsign_val = vessel_data.get("callsign", "").strip() or None

            # Create new vessel
            vessel_type_name = get_vessel_type_name(vessel_data.get("ship_type", 0))
            
            new_vessel = Vessel(
                mmsi=vessel_data["mmsi"],
                imo=imo_val,
                name=raw_name,
                callsign=callsign_val,
                vessel_type=vessel_type_name,
                ship_type_code=vessel_data.get("ship_type", 0),
                latitude=lat,
                longitude=lon,
                geom=geom_wkt,
                speed=vessel_data.get("speed", 0.0),
                heading=vessel_data.get("heading", 0.0),
                course=vessel_data.get("course", 0.0),
                speed_history=[vessel_data.get("speed", 0.0)],
                status="normal"
            )
            
            db.add(new_vessel)
            print(f"[AIS] New vessel tracked: {new_vessel.name} ({new_vessel.mmsi})")
        
        # Persist time-series position update to vessel_positions table
        try:
            from app.models.vessel_positions import VesselPosition
            pos_record = VesselPosition(
                mmsi=vessel_data["mmsi"],
                vessel_name=vessel_data.get("vessel_name", "").strip() or "Unknown Vessel",
                latitude=lat if lat is not None else 0.0,
                longitude=lon if lon is not None else 0.0,
                geom=geom_wkt,
                speed=vessel_data.get("speed", 0.0),
                heading=vessel_data.get("heading", 0.0),
                course=vessel_data.get("course", 0.0),
                vessel_type=get_vessel_type_name(vessel_data.get("ship_type", 0)),
                status="Underway" if (vessel_data.get("speed") or 0.0) > 0.5 else "Moored"
            )
            db.add(pos_record)
        except Exception as pos_err:
            print(f"[AIS] Error recording vessel_position history: {pos_err}")

        db.commit()

        
        # Publish to Redis for real-time fleet updates
        try:
            from app.services.redis_client import publish_fleet_update
            # Assuming vessel_data is updated correctly, we'll construct the msg
            msg = {
                "mmsi": vessel_data["mmsi"],
                "vessel_name": vessel_data.get("vessel_name", "").strip() or "Unknown Vessel",
                "latitude": vessel_data["latitude"],
                "longitude": vessel_data["longitude"],
                "speed": vessel_data["speed"],
                "heading": vessel_data["heading"],
                "course": vessel_data["course"],
                "vessel_type": get_vessel_type_name(vessel_data.get("ship_type", 0)),
                "status": "normal",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "update_type": "position_update"
            }
            # We import asyncio here to run the async publish function since handle_vessel_update is async
            import asyncio
            asyncio.create_task(publish_fleet_update(msg))
        except Exception as redis_e:
            print(f"[AIS] Error publishing to Redis: {redis_e}")
        
    except Exception as e:
        print(f"[AIS] Error processing vessel {vessel_data.get('mmsi')}: {e}")
        db.rollback()
    finally:
        db.close()