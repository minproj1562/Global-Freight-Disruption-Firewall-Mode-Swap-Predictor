# backend/app/services/ais_stream_client.py
import asyncio
import json
import websockets
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY")

class AISStreamClient:
    def __init__(self):
        self.api_key = AISSTREAM_API_KEY
        self.uri = f"wss://stream.aisstream.io/v1/stream?apiKey={self.api_key}"
        self.websocket = None

    async def connect(self):
        """Establish WebSocket connection to aisstream.io"""
        self.websocket = await websockets.connect(self.uri)
        print(f"[AIS] Connected to aisstream.io at {datetime.now()}")

    async def subscribe(self, bbox=None, ship_types=None):
        """
        Subscribe to vessel data.
        
        Args:
            bbox: [min_lon, min_lat, max_lon, max_lat] - e.g., [-180, -90, 180, 90] for global
            ship_types: List of ship type numbers (e.g., [70, 71, 80] for cargo)
        """
        if bbox is None:
            bbox = [-180, -90, 180, 90]  # Global coverage

        # Build the subscription message
        subscription_message = {
            "APIKey": self.api_key,
            "BoundingBoxes": [[bbox]],
            "FiltersShipType": ship_types or [],  # Empty = all types
        }

        await self.websocket.send(json.dumps(subscription_message))
        print("[AIS] Subscription sent. Waiting for data...")

    async def receive_data(self, callback_function):
        """
        Continuously receive vessel data and call your callback.
        
        Args:
            callback_function: A function that processes each vessel update
        """
        try:
            while True:
                # Receive message from WebSocket
                message = await self.websocket.recv()
                data = json.loads(message)

                # Check if it's a vessel update
                if data.get("MessageType") == "PositionReport":
                    vessel = data.get("MetaData", {})
                    position = data.get("Message", {}).get("PositionReport", {})

                    # Extract relevant data
                    vessel_data = {
                        "mmsi": vessel.get("MMSI"),
                        "vessel_name": vessel.get("ShipName", "Unknown"),
                        "imo": vessel.get("IMO", ""),
                        "callsign": vessel.get("CallSign", ""),
                        "ship_type": vessel.get("ShipType", 0),
                        "latitude": position.get("Latitude", 0),
                        "longitude": position.get("Longitude", 0),
                        "speed": position.get("Sog", 0),  # Speed over ground (knots)
                        "heading": position.get("Cog", 0),  # Course over ground
                        "course": position.get("Cog", 0),
                        "timestamp": position.get("TimeStamp", None),
                    }

                    # Pass the data to your callback
                    await callback_function(vessel_data)

        except websockets.ConnectionClosed:
            print("[AIS] Connection closed. Reconnecting...")
            await self.reconnect(callback_function)
        except Exception as e:
            print(f"[AIS] Error: {e}")

    async def reconnect(self, callback_function):
        """Handle reconnection if the WebSocket closes"""
        await asyncio.sleep(5)  # Wait before reconnecting
        await self.connect()
        await self.subscribe()
        await self.receive_data(callback_function)

    async def close(self):
        """Close the WebSocket connection"""
        if self.websocket:
            await self.websocket.close()
            print("[AIS] Connection closed.")