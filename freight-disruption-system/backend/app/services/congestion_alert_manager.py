#backend/app/services/congestion_alert_manager.py
import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

from app.core.config import settings
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

CHANNEL_NAME = "congestion_alerts"


class CongestionAlertManager:
    """
    Per-user-scoped WebSocket broadcaster for port congestion propagation
    alerts (Task 2). Unlike FleetUpdateManager (broadcasts AIS positions to
    EVERY connected client), this keeps a map of user_id -> active
    WebSocket connections, so a congestion change on a port only reaches the
    logistics managers whose routes actually touch that port (resolved via
    route_mapping_service.get_affected_routes_for_port).
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CongestionAlertManager, cls).__new__(cls)
            cls._instance.connections_by_user: Dict[str, Set[WebSocket]] = {}
            cls._instance.admin_connections: Set[WebSocket] = set()
            cls._instance.redis = None
            cls._instance.pubsub = None
            cls._instance.subscriber_task = None
            cls._instance.is_running = False
        return cls._instance

    def __init__(self):
        pass

    async def connect(self, websocket: WebSocket, user_id: str, is_admin: bool = False):
        await websocket.accept()
        if is_admin:
            self.admin_connections.add(websocket)
        self.connections_by_user.setdefault(user_id, set()).add(websocket)
        logger.info(f"[CongestionAlerts] User {user_id} connected. Tracked users: {len(self.connections_by_user)}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.connections_by_user:
            self.connections_by_user[user_id].discard(websocket)
            if not self.connections_by_user[user_id]:
                del self.connections_by_user[user_id]
        self.admin_connections.discard(websocket)
        logger.info(f"[CongestionAlerts] User {user_id} disconnected.")

    async def send_to_user(self, user_id: str, message: str):
        stale = set()
        for ws in self.connections_by_user.get(user_id, set()):
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.error(f"[CongestionAlerts] Error sending to user {user_id}: {e}")
                stale.add(ws)
        for ws in stale:
            self.disconnect(ws, user_id)

    async def broadcast_to_admins(self, message: str):
        stale = set()
        for ws in self.admin_connections:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.error(f"[CongestionAlerts] Error sending to admin: {e}")
                stale.add(ws)
        for ws in stale:
            self.admin_connections.discard(ws)

    async def dispatch_alert(self, payload: dict):
        """Routes an alert payload to exactly the logistics managers listed in
        payload['affected_user_ids'], plus a copy to all connected admins."""
        message = json.dumps(payload)
        for user_id in payload.get("affected_user_ids", []):
            await self.send_to_user(user_id, message)
        await self.broadcast_to_admins(message)

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
                await self.pubsub.subscribe(CHANNEL_NAME)
                logger.info(f"[CongestionAlerts] Subscribed to Redis channel '{CHANNEL_NAME}'")
                backoff = 1

                async for message in self.pubsub.listen():
                    if not self.is_running:
                        break
                    if message["type"] == "message":
                        try:
                            payload = json.loads(message["data"])
                        except json.JSONDecodeError:
                            continue
                        await self.dispatch_alert(payload)

            except Exception as e:
                logger.error(f"[CongestionAlerts] Redis subscriber error: {e}")
            finally:
                if self.pubsub:
                    try:
                        await self.pubsub.unsubscribe(CHANNEL_NAME)
                        await self.pubsub.close()
                    except Exception:
                        pass
                if self.redis:
                    try:
                        await self.redis.close()
                    except Exception:
                        pass

            if self.is_running:
                logger.info(f"[CongestionAlerts] Reconnecting in {backoff}s...")
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


congestion_alert_manager = CongestionAlertManager()