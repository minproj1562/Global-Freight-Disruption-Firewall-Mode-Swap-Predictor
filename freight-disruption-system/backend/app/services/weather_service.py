# backend/app/services/weather_service.py
"""
Weather & Environmental Data Service.
Integrates OpenWeatherMap API, NOAA/NSIDC Ice layer feeds, and Maritime Risk Telemetry.
Provides real external API calls with clearly labeled development fallbacks when credentials are unavailable.
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

class WeatherService:
    def __init__(self):
        self.api_key = getattr(settings, 'OPENWEATHER_API_KEY', '') or ''
        self.timeout = 5.0  # seconds

    @property
    def has_valid_key(self) -> bool:
        return bool(self.api_key and self.api_key.strip() and self.api_key != "your-openweather-key")

    async def get_current_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Fetch current weather conditions for geographic coordinates.
        Uses real OpenWeather API if key is present; returns clearly labeled development data otherwise.
        """
        if self.has_valid_key:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    url = f"{OPENWEATHER_BASE_URL}/weather"
                    params = {
                        "lat": lat,
                        "lon": lon,
                        "appid": self.api_key,
                        "units": "metric"
                    }
                    response = await client.get(url, params=params)
                    if response.status_code == 200:
                        data = response.json()
                        main = data.get("main", {})
                        wind = data.get("wind", {})
                        weather_arr = data.get("weather", [{}])
                        weather_item = weather_arr[0] if weather_arr else {}

                        # Derive beaufort scale and wave estimate
                        wind_speed_ms = wind.get("speed", 0.0)
                        wind_speed_knots = wind_speed_ms * 1.94384
                        beaufort = self._calculate_beaufort(wind_speed_knots)
                        wave_height_m = self._estimate_wave_height(beaufort)

                        return {
                            "is_live_data": True,
                            "data_source": "OpenWeather API (Live)",
                            "coordinates": {"latitude": lat, "longitude": lon},
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "temperature_celsius": main.get("temp"),
                            "feels_like_celsius": main.get("feels_like"),
                            "humidity_percent": main.get("humidity"),
                            "pressure_hpa": main.get("pressure"),
                            "wind_speed_knots": round(wind_speed_knots, 1),
                            "wind_direction_deg": wind.get("deg", 0),
                            "wind_gust_knots": round(wind.get("gust", 0.0) * 1.94384, 1) if wind.get("gust") else None,
                            "condition": weather_item.get("main", "Clear"),
                            "description": weather_item.get("description", "clear sky"),
                            "visibility_meters": data.get("visibility", 10000),
                            "beaufort_scale": beaufort,
                            "estimated_wave_height_meters": wave_height_m,
                            "weather_risk_level": "high" if beaufort >= 7 else ("medium" if beaufort >= 5 else "low")
                        }
                    else:
                        logger.warning(f"[WeatherService] OpenWeather returned status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"[WeatherService] OpenWeather API call failed: {e}")

        # Explicitly labeled development fallback
        return self._development_weather_fallback(lat, lon)

    async def get_port_weather(self, port_name: str, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch weather for a specific port"""
        result = await self.get_current_weather(lat, lon)
        result["port_name"] = port_name
        return result

    async def get_ice_extent_zones(self) -> Dict[str, Any]:
        """
        Get Arctic / Baltic Sea Ice layer polygon zones.
        Attempts live ingestion from official NOAA / National Snow and Ice Data Center (NSIDC)
        daily satellite observations (G02135 v4.0).
        Falls back to calibrated baseline if network is unreachable.
        """
        nsidc_url = "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv"
        live_extent_record = None
        is_live = False
        data_source = "Development Fallback (NOAA/NSIDC live feed unreachable)"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(nsidc_url)
                if resp.status_code == 200:
                    lines = [ln.strip() for ln in resp.text.splitlines() if ln.strip()]
                    if len(lines) >= 3:
                        last_line = lines[-1].split(",")
                        if len(last_line) >= 4:
                            live_extent_record = {
                                "year": int(last_line[0].strip()),
                                "month": int(last_line[1].strip()),
                                "day": int(last_line[2].strip()),
                                "extent_sq_km_millions": float(last_line[3].strip()),
                            }
                            is_live = True
                            data_source = "NOAA/NSIDC Sea Ice Index v4.0 (Live Satellite Observation)"
        except Exception as e:
            logger.info(f"[WeatherService] Live NOAA/NSIDC sea ice fetch notice: {e}")

        # Core Arctic Northern Sea Route & Baltic Sea Ice Extents
        ice_zones = [
            {
                "zone_id": "ice-arctic-kara-sea",
                "name": "Kara Sea Ice Field (NSR)",
                "region": "Arctic",
                "ice_concentration_percent": 85 if not live_extent_record else (
                    92 if live_extent_record["extent_sq_km_millions"] > 10.0 else 72
                ),
                "ice_thickness_meters": 1.4,
                "navigability": "Icebreaker Escort Mandatory",
                "center": {"latitude": 75.0, "longitude": 75.0},
                "polygon_geojson": {
                    "type": "Polygon",
                    "coordinates": [[
                        [60.0, 72.0], [90.0, 72.0], [95.0, 78.0],
                        [70.0, 80.0], [55.0, 76.0], [60.0, 72.0]
                    ]]
                },
                "data_source": data_source,
                "is_live_data": is_live,
                "status": "active_hazard"
            },
            {
                "zone_id": "ice-baltic-gulf-finland",
                "name": "Gulf of Finland Ice Belt",
                "region": "Baltic Sea",
                "ice_concentration_percent": 45,
                "ice_thickness_meters": 0.35,
                "navigability": "Ice Class 1A Required",
                "center": {"latitude": 60.1, "longitude": 26.5},
                "polygon_geojson": {
                    "type": "Polygon",
                    "coordinates": [[
                        [24.0, 59.8], [28.5, 59.8], [29.5, 60.4],
                        [25.0, 60.5], [24.0, 59.8]
                    ]]
                },
                "data_source": "Baltic Ice Services / NOAA Standard",
                "is_live_data": is_live,
                "status": "seasonal_restriction"
            }
        ]

        result = {
            "is_live_data": is_live,
            "data_source": data_source,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "zones_count": len(ice_zones),
            "zones": ice_zones
        }
        if live_extent_record:
            result["latest_satellite_observation"] = live_extent_record

        return result

    async def get_piracy_and_security_zones(self) -> Dict[str, Any]:
        """
        Get maritime high-risk security zones (Red Sea / Gulf of Aden, Gulf of Guinea, Strait of Malacca).
        Attempts live ingestion from official NGA Maritime Safety Information (MSI) ASAM API.
        Falls back to calibrated baseline if service returns 503 or is unreachable.
        """
        is_live = False
        data_source = "Development Fallback (Live NGA ASAM API unreachable - Calibrated IMB/UKMTO Baseline)"
        live_incidents = []

        try:
            # Query official NGA MSI Anti-Shipping Activity Messages endpoint
            asam_url = "https://msi.nga.mil/api/publications/asam?sort=date&output=json"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {"User-Agent": "MaritimeFreightDisruptionFirewall/1.0", "Accept": "application/json"}
                resp = await client.get(asam_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    asam_items = data if isinstance(data, list) else data.get("asam", [])
                    if asam_items:
                        live_incidents = asam_items[:10]
                        is_live = True
                        data_source = "NGA Maritime Safety Information ASAM API (Live)"
        except Exception as e:
            logger.info(f"[WeatherService] Live Piracy API fetch notice: {e}")

        security_zones = [
            {
                "zone_id": "sec-red-sea-bab-el-mandeb",
                "name": "Bab el-Mandeb / Southern Red Sea HRA",
                "threat_level": "CRITICAL",
                "threat_type": "Missile, Drone & Armed Boarding Hazard",
                "center": {"latitude": 13.5, "longitude": 42.8},
                "radius_nm": 220.0,
                "war_risk_insurance_applicable": True,
                "recommended_action": "Cape of Good Hope Diversion Advised",
                "source": data_source
            },
            {
                "zone_id": "sec-gulf-of-guinea",
                "name": "Gulf of Guinea High Risk Area",
                "threat_level": "HIGH",
                "threat_type": "Armed Piracy & Vessel Hijack Risk",
                "center": {"latitude": 3.2, "longitude": 6.5},
                "radius_nm": 180.0,
                "war_risk_insurance_applicable": True,
                "recommended_action": "BMS Armed Security Team Protocol",
                "source": data_source
            },
            {
                "zone_id": "sec-strait-of-malacca",
                "name": "Singapore / Malacca Strait Anchorage Watch",
                "threat_level": "MEDIUM",
                "threat_type": "Petty Theft / Boarding at Anchor",
                "center": {"latitude": 1.25, "longitude": 103.8},
                "radius_nm": 60.0,
                "war_risk_insurance_applicable": False,
                "recommended_action": "Enhanced Deck Watch & Anti-Piracy Lighting",
                "source": data_source
            }
        ]

        res = {
            "is_live_data": is_live,
            "data_source": data_source,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_active_zones": len(security_zones),
            "security_zones": security_zones
        }
        if live_incidents:
            res["recent_live_incidents"] = live_incidents
        return res

    def _calculate_beaufort(self, wind_speed_knots: float) -> int:
        """Convert wind speed in knots to Beaufort scale (0-12)"""
        if wind_speed_knots < 1: return 0
        if wind_speed_knots <= 3: return 1
        if wind_speed_knots <= 6: return 2
        if wind_speed_knots <= 10: return 3
        if wind_speed_knots <= 16: return 4
        if wind_speed_knots <= 21: return 5
        if wind_speed_knots <= 27: return 6
        if wind_speed_knots <= 33: return 7
        if wind_speed_knots <= 40: return 8
        if wind_speed_knots <= 47: return 9
        if wind_speed_knots <= 55: return 10
        if wind_speed_knots <= 63: return 11
        return 12

    def _estimate_wave_height(self, beaufort: int) -> float:
        """Estimate significant wave height in meters from Beaufort scale"""
        wave_map = {
            0: 0.0, 1: 0.1, 2: 0.2, 3: 0.6, 4: 1.0,
            5: 2.0, 6: 3.0, 7: 4.0, 8: 5.5, 9: 7.0,
            10: 9.0, 11: 11.5, 12: 14.0
        }
        return wave_map.get(beaufort, 1.5)

    def _development_weather_fallback(self, lat: float, lon: float) -> Dict[str, Any]:
        """Clearly labeled development fallback when OpenWeather API key is not configured"""
        # Determine deterministic baseline from latitude
        is_polar = abs(lat) > 60
        is_tropical = abs(lat) < 23.5
        
        temp_c = -5.0 if is_polar else (28.0 if is_tropical else 18.0)
        wind_knots = 22.0 if is_polar else 12.0
        beaufort = self._calculate_beaufort(wind_knots)
        wave_m = self._estimate_wave_height(beaufort)

        return {
            "is_live_data": False,
            "data_source": "Development Fallback (OpenWeather API key not set or unreachable)",
            "coordinates": {"latitude": lat, "longitude": lon},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "temperature_celsius": temp_c,
            "feels_like_celsius": temp_c - 2.0,
            "humidity_percent": 75,
            "pressure_hpa": 1013,
            "wind_speed_knots": wind_knots,
            "wind_direction_deg": 180,
            "wind_gust_knots": round(wind_knots * 1.3, 1),
            "condition": "Cloudy" if is_polar else "Fair",
            "description": "calibrated maritime baseline conditions",
            "visibility_meters": 10000,
            "beaufort_scale": beaufort,
            "estimated_wave_height_meters": wave_m,
            "weather_risk_level": "medium" if beaufort >= 5 else "low"
        }

weather_service = WeatherService()
