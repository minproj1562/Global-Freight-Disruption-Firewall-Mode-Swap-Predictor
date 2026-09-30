import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
import json

from app.main import app
from app.services.fleet_update_manager import FleetUpdateManager, fleet_update_manager
from app.services.redis_client import publish_fleet_update

@pytest.fixture
def mock_redis_manager():
    manager = FleetUpdateManager()
    manager.active_connections = set()
    return manager

@pytest.mark.asyncio
async def test_fleet_manager_singleton(mock_redis_manager):
    manager1 = FleetUpdateManager()
    manager2 = FleetUpdateManager()
    assert manager1 is manager2

@pytest.mark.asyncio
async def test_fleet_manager_connect_disconnect(mock_redis_manager):
    mock_ws = AsyncMock(spec=WebSocket)
    
    await mock_redis_manager.connect(mock_ws)
    mock_ws.accept.assert_called_once()
    assert mock_ws in mock_redis_manager.active_connections
    
    mock_redis_manager.disconnect(mock_ws)
    assert mock_ws not in mock_redis_manager.active_connections

@pytest.mark.asyncio
async def test_websocket_endpoint():
    client = TestClient(app)
    with client.websocket_connect("/ws/fleet") as websocket:
        assert websocket is not None


@pytest.mark.asyncio
async def test_redis_publish_graceful_failure():
    # Test that publish handles exceptions
    vessel_data = {
        "mmsi": 123456789,
        "vessel_name": "Test Vessel",
        "latitude": 10.0,
        "longitude": 20.0,
        "speed": 15.5,
        "heading": 90.0,
        "course": 90.0,
        "vessel_type": "Cargo",
        "status": "normal",
        "timestamp": "2023-10-27T10:00:00Z",
        "update_type": "position_update"
    }
    
    with patch("app.services.redis_client.async_redis_client", AsyncMock()) as mock_redis:
        mock_redis.publish.side_effect = Exception("Redis Down")
        # Should not raise
        await publish_fleet_update(vessel_data)
        mock_redis.publish.assert_called_once()


def test_fleet_pipeline_end_to_end_broadcast():
    """Verify FleetUpdateManager broadcasts JSON updates to connected WebSocket clients"""
    client = TestClient(app)
    vessel_payload = {
        "mmsi": 987654321,
        "vessel_name": "STAR HORIZON",
        "latitude": 1.28,
        "longitude": 103.85,
        "speed": 16.2,
        "heading": 180.0,
        "course": 182.0,
        "vessel_type": "Cargo",
        "status": "Underway",
        "timestamp": "2026-09-28T12:00:00Z",
        "update_type": "position_update"
    }

    with client.websocket_connect("/ws/fleet") as ws:
        asyncio.run(fleet_update_manager.broadcast(json.dumps(vessel_payload)))
        received = ws.receive_json()
        assert received["mmsi"] == 987654321
        assert received["vessel_name"] == "STAR HORIZON"
        assert received["speed"] == 16.2
        assert received["update_type"] == "position_update"
