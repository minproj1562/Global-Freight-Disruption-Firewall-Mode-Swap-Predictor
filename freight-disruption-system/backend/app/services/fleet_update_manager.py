import asyncio
import json
import logging
from typing import List, Set
from fastapi import WebSocket

from app.core.config import settings
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

class FleetUpdateManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FleetUpdateManager, cls).__new__(cls)
            cls._instance.active_connections = set()
            cls._instance.redis = None
            cls._instance.pubsub = None
            cls._instance.subscriber_task = None
            cls._instance.is_running = False
        return cls._instance

    def __init__(self):
        # Prevent re-initialization since we are a singleton
        pass

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        stale_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                stale_connections.add(connection)
        
        for stale in stale_connections:
            self.disconnect(stale)

    async def _redis_subscriber_loop(self):
        backoff = 1
        while self.is_running:
            try:
                self.redis = aioredis.Redis(
                    host=getattr(settings, 'REDIS_HOST', 'localhost'),
                    port=getattr(settings, 'REDIS_PORT', 6379),
                    db=0,
                    decode_responses=True
                )
                self.pubsub = self.redis.pubsub()
                await self.pubsub.subscribe("fleet_updates")
                logger.info("[FleetUpdateManager] Connected to Redis and subscribed to 'fleet_updates'")
                backoff = 1  # Reset backoff on successful connection

                async for message in self.pubsub.listen():
                    if not self.is_running:
                        break
                    if message["type"] == "message":
                        await self.broadcast(message["data"])

            except Exception as e:
                logger.error(f"[FleetUpdateManager] Redis subscriber error: {e}")
            finally:
                if self.pubsub:
                    try:
                        await self.pubsub.unsubscribe("fleet_updates")
                        await self.pubsub.close()
                    except Exception:
                        pass
                if self.redis:
                    try:
                        await self.redis.close()
                    except Exception:
                        pass
                
            if self.is_running:
                logger.info(f"[FleetUpdateManager] Reconnecting in {backoff} seconds...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.subscriber_task = asyncio.create_task(self._redis_subscriber_loop())

    async def stop(self):
        self.is_running = False
        if self.subscriber_task:
            self.subscriber_task.cancel()
            try:
                await self.subscriber_task
            except asyncio.CancelledError:
                pass
            self.subscriber_task = None

fleet_update_manager = FleetUpdateManager()
