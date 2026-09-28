# backend/app/services/redis_client.py
"""
Redis client for real-time notifications and background task queuing
"""
import redis
import json
from typing import Dict, Any, Optional
from app.core.config import settings

# Initialize Redis client
try:
    redis_client = redis.Redis(
        host=getattr(settings, 'REDIS_HOST', 'localhost'),
        port=getattr(settings, 'REDIS_PORT', 6379),
        db=0,
        decode_responses=True
    )
    redis_client.ping()
    print("[Redis] Connected successfully")
except Exception as e:
    print(f"[Redis] Connection failed: {e}")
    redis_client = None


def push_captain_notification(
    decision_id: str,
    vessel_name: str,
    route_name: str,
    message: str
):
    """Push notification to captain notification queue"""
    if not redis_client:
        print("[Redis] Client not available, skipping notification")
        return
    
    notification = {
        "decision_id": decision_id,
        "vessel_name": vessel_name,
        "route_name": route_name,
        "message": message,
        "timestamp": str(datetime.utcnow()),
        "status": "pending"
    }
    
    try:
        redis_client.lpush("captain_notifications", json.dumps(notification))
        redis_client.publish("reroute_channel", json.dumps(notification))
        print(f"[Redis] Notification pushed for {vessel_name}")
    except Exception as e:
        print(f"[Redis] Failed to push notification: {e}")


def get_pending_notifications(limit: int = 10) -> list:
    """Get pending captain notifications"""
    if not redis_client:
        return []
    
    try:
        notifications = redis_client.lrange("captain_notifications", 0, limit - 1)
        return [json.loads(n) for n in notifications]
    except Exception as e:
        print(f"[Redis] Failed to get notifications: {e}")
        return []