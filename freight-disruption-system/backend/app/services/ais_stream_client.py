# backend/app/services/ais_stream_client.py
import asyncio
import json
import websockets
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

# Correct aisstream.io endpoint (v0, no API key in URL)
AISSTREAM_URI = "wss://stream.aisstream.io/v0/stream"


class AISStreamClient:
    def __init__(self):
        self.api_key = settings.AISSTREAM_API_KEY
        self.uri = AISSTREAM_URI
        self.websocket = None
        self._running = False

    async def connect(self):
        """Establish WebSocket connection to aisstream.io.
        
        The API key is NOT part of the URL — it goes in the subscription message.
        Raises websockets.exceptions.* on failure so the caller can handle it.
        """
        logger.info("[AIS] Connecting to %s ...", self.uri)
        self.websocket = await websockets.connect(self.uri)
        logger.info("[AIS] Connected at %s", datetime.now())

    async def subscribe(self, bbox=None, ship_types=None):
        """Send subscription message with API key and bounding box filter.

        Args:
            bbox: [[min_lon, min_lat, max_lon, max_lat]] — global by default
            ship_types: list of AIS ship type codes (empty = all types)
        """
        if bbox is None:
            # Global bounding box — aisstream expects a list-of-lists
            bbox = [[-180, -90, 180, 90]]

        subscription_message = {
            "APIKey": self.api_key,
            "BoundingBoxes": [bbox],
            "FiltersShipType": ship_types or [],
        }

        await self.websocket.send(json.dumps(subscription_message))
        logger.info("[AIS] Subscription sent — waiting for vessel data...")

    async def receive_data(self, callback_function):
        """Continuously receive vessel position updates and invoke callback.

        Runs until the connection drops, then attempts reconnection.
        """
        self._running = True
        try:
            async for raw_message in self.websocket:
                if not self._running:
                    break
                try:
                    data = json.loads(raw_message)
                except json.JSONDecodeError:
                    continue

                if data.get("MessageType") == "PositionReport":
                    vessel = data.get("MetaData", {})
                    position = data.get("Message", {}).get("PositionReport", {})

                    vessel_data = {
                        "mmsi": vessel.get("MMSI"),
                        "vessel_name": vessel.get("ShipName", "Unknown"),
                        "imo": vessel.get("IMO", ""),
                        "callsign": vessel.get("CallSign", ""),
                        "ship_type": vessel.get("ShipType", 0),
                        "latitude": position.get("Latitude", 0),
                        "longitude": position.get("Longitude", 0),
                        "speed": position.get("Sog", 0),
                        "heading": position.get("Cog", 0),
                        "course": position.get("Cog", 0),
                        "timestamp": position.get("TimeStamp"),
                    }

                    try:
                        await callback_function(vessel_data)
                    except Exception as cb_err:
                        logger.warning("[AIS] Callback error: %s", cb_err)

        except websockets.ConnectionClosed:
            logger.warning("[AIS] Connection closed.")
        except Exception as e:
            logger.error("[AIS] Receive error: %s", e)

    async def reconnect(self, callback_function):
        """Reconnect with exponential back-off (5 s, 10 s, 20 s … max 60 s)."""
        delay = 5
        while self._running:
            logger.info("[AIS] Reconnecting in %ds...", delay)
            await asyncio.sleep(delay)
            try:
                await self.connect()
                await self.subscribe()
                await self.receive_data(callback_function)
                return  # successfully reconnected and running
            except Exception as e:
                logger.error("[AIS] Reconnect failed: %s", e)
                delay = min(delay * 2, 60)

    async def run_forever(self, callback_function):
        """Connect, subscribe, and keep running with auto-reconnect.
        
        This is the main entry point called from main.py. It never raises —
        failures are logged and retried so the rest of the API stays up.
        """
        retry_delay = 30
        while self._running:
            try:
                await self.connect()
                # Connected successfully, reset retry delay
                retry_delay = 30
                await self.subscribe()
                await self.receive_data(callback_function)
            except Exception as e:
                # Log as warning not to alarm user/developer on rate-limiting
                logger.warning("[AIS] Live stream temporarily unavailable (Detail: %s). Reconnecting in %ds...", e, retry_delay)
                if self.websocket:
                    try:
                        await self.websocket.close()
                    except Exception:
                        pass
                    self.websocket = None
                await asyncio.sleep(retry_delay)
                # Exponential backoff up to 5 minutes
                retry_delay = min(retry_delay * 2, 300)

    async def close(self):
        """Gracefully shut down the AIS stream."""
        self._running = False
        if self.websocket:
            await self.websocket.close()
            logger.info("[AIS] Connection closed.")