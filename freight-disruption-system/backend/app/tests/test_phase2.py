# backend/app/tests/test_phase2.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.services.weather_service import weather_service, WeatherService
from app.services.spatial_service import spatial_service, SpatialService
from app.models.vessel_positions import VesselPosition
from app.models.disruptions import GlobalDisruption
from app.database import SessionLocal, init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure all tables including vessel_positions are created in database"""
    init_db()


@pytest.mark.asyncio
async def test_weather_service_fallback_and_structure():
    """Test weather service produces valid structure and clearly labeled fallback"""
    weather = await weather_service.get_current_weather(31.2304, 121.4737)
    assert "coordinates" in weather
    assert "temperature_celsius" in weather
    assert "wind_speed_knots" in weather
    assert "beaufort_scale" in weather
    assert "estimated_wave_height_meters" in weather
    assert "is_live_data" in weather
    assert "data_source" in weather
    assert isinstance(weather["is_live_data"], bool)

@pytest.mark.asyncio
async def test_ice_extent_zones():
    """Test polar ice extent polygon zones"""
    ice_data = await weather_service.get_ice_extent_zones()
    assert "zones" in ice_data
    assert len(ice_data["zones"]) >= 1
    zone = ice_data["zones"][0]
    assert "polygon_geojson" in zone
    assert zone["polygon_geojson"]["type"] == "Polygon"
    coords = zone["polygon_geojson"]["coordinates"][0]
    assert len(coords) >= 4
    # Closed polygon
    assert coords[0] == coords[-1]

@pytest.mark.asyncio
async def test_security_zones():
    """Test maritime high risk piracy/security zones"""
    sec_data = await weather_service.get_piracy_and_security_zones()
    assert "security_zones" in sec_data
    assert len(sec_data["security_zones"]) >= 2
    threat_levels = [z["threat_level"] for z in sec_data["security_zones"]]
    assert "CRITICAL" in threat_levels

def test_haversine_distance_calculation():
    """Test geodesic distance calculations"""
    # Shanghai (31.23, 121.47) to Singapore (1.35, 103.82) is ~2000-2200 NM
    dist_nm = spatial_service.haversine_distance_nm(31.23, 121.47, 1.35, 103.82)
    assert 2000 <= dist_nm <= 2200

    # Distance to self is 0
    dist_zero = spatial_service.haversine_distance_nm(10.0, 20.0, 10.0, 20.0)
    assert dist_zero == 0.0

def test_point_in_polygon_containment():
    """Test point-in-polygon raycasting algorithm"""
    # Square polygon around (10, 10)
    square_poly = [[5.0, 5.0], [15.0, 5.0], [15.0, 15.0], [5.0, 15.0], [5.0, 5.0]]
    
    # Inside
    assert spatial_service.is_point_in_polygon(10.0, 10.0, square_poly) is True
    # Outside
    assert spatial_service.is_point_in_polygon(20.0, 20.0, square_poly) is False

def test_circle_polygon_generation():
    """Test circle polygon generates closed polygon with requested vertices"""
    poly = spatial_service.generate_circle_polygon(0.0, 0.0, 100.0, num_points=16)
    assert len(poly) == 17  # 16 + 1 to close ring
    assert poly[0] == poly[-1]

def test_spatial_proximity_assessment():
    """Test disruption proximity evaluation"""
    disruption = GlobalDisruption(
        id="test-disruption-1",
        disruption_type="Typhoon",
        location_name="South China Sea",
        latitude=15.0,
        longitude=115.0,
        radius_nm=150.0,
        resolved=False
    )
    
    # Vessel inside radius (direct strike)
    status_inside, reason_inside, dist_inside = spatial_service.assess_vessel_disruption_proximity(
        15.1, 115.1, [disruption]
    )
    assert status_inside == "disrupted"
    assert dist_inside <= 150.0

    # Vessel far away
    status_far, reason_far, dist_far = spatial_service.assess_vessel_disruption_proximity(
        50.0, -10.0, [disruption]
    )
    assert status_far == "normal"

def test_weather_api_endpoints():
    """Test weather router REST endpoints"""
    client = TestClient(app)
    
    # /api/weather/current
    resp = client.get("/api/weather/current?lat=25.0&lon=55.0")
    assert resp.status_code == 200
    data = resp.json()
    assert "temperature_celsius" in data
    assert "data_source" in data

    # /api/weather/ice-extent
    resp_ice = client.get("/api/weather/ice-extent")
    assert resp_ice.status_code == 200
    assert "zones" in resp_ice.json()

    # /api/weather/security-zones
    resp_sec = client.get("/api/weather/security-zones")
    assert resp_sec.status_code == 200
    assert "security_zones" in resp_sec.json()

    # /api/weather/spatial-risk
    resp_risk = client.get("/api/weather/spatial-risk?lat=13.5&lon=42.8")
    assert resp_risk.status_code == 200
    risk_data = resp_risk.json()
    assert "spatial_status" in risk_data
    assert "weather_risk_level" in risk_data

@pytest.mark.asyncio
async def test_vessel_handler_persists_vessel_position():
    """Test that incoming vessel updates persist to vessel_positions table"""
    from app.services.vessel_handler import handle_vessel_update
    
    test_update = {
        "mmsi": 999888777,
        "vessel_name": "Test Vessel Phase2",
        "imo": 1234567,
        "callsign": "TEST2",
        "ship_type": 70,
        "latitude": 24.5,
        "longitude": 54.3,
        "speed": 16.2,
        "heading": 270.0,
        "course": 270.0,
        "timestamp": 1698400000
    }
    
    await handle_vessel_update(test_update)
    
    db = SessionLocal()
    try:
        pos = db.query(VesselPosition).filter(VesselPosition.mmsi == 999888777).order_by(VesselPosition.created_at.desc()).first()
        assert pos is not None
        assert pos.vessel_name == "Test Vessel Phase2"
        assert pos.latitude == 24.5
        assert pos.longitude == 54.3
        assert pos.speed == 16.2
    finally:
        db.close()
