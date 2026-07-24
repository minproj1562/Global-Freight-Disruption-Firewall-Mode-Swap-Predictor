# backend/app/services/vessel_handler.py
import json
from datetime import datetime
from app.database import SessionLocal
from app.models import Vessel  # You'll create this later

async def handle_vessel_update(vessel_data: dict):
    """
    Callback function that processes each vessel update.
    This is called every time aisstream.io sends a vessel position.
    """
    # Convert to database model and save
    print(f"[AIS] {vessel_data['vessel_name']} at {vessel_data['latitude']}, {vessel_data['longitude']}")

    # Save to database (pseudo-code)
    # db = SessionLocal()
    # vessel = db.query(Vessel).filter(Vessel.mmsi == vessel_data['mmsi']).first()
    # if vessel:
    #     vessel.latitude = vessel_data['latitude']
    #     vessel.longitude = vessel_data['longitude']
    #     vessel.speed = vessel_data['speed']
    #     vessel.heading = vessel_data['heading']
    #     vessel.last_updated = datetime.now()
    # else:
    #     new_vessel = Vessel(**vessel_data)
    #     db.add(new_vessel)
    # db.commit()
    # db.close()