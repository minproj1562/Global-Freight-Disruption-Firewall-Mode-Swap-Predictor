# backend/app/services/spatial_service.py
"""
Reusable Spatial Query & Geodesic Service.
Provides PostGIS ST_DWithin / ST_Within integration along with high-precision
great-circle / spherical geodesic distance and point-in-polygon containment calculations.
"""
import math
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.vessels import Vessel
from app.models.ports import Port
from app.models.disruptions import GlobalDisruption

# Earth radius in nautical miles (1 NM = 1.852 km)
EARTH_RADIUS_NM = 3440.065
EARTH_RADIUS_KM = 6371.0

class SpatialService:
    @staticmethod
    def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two points in nautical miles"""
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (math.sin(delta_phi / 2.0) ** 2 +
             math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(EARTH_RADIUS_NM * c, 2)

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two points in kilometers"""
        return round(SpatialService.haversine_distance_nm(lat1, lon1, lat2, lon2) * 1.852, 2)

    @staticmethod
    def is_point_in_polygon(lat: float, lon: float, polygon_coords: List[List[float]]) -> bool:
        """
        Ray-casting algorithm to test if a point (lat, lon) is inside a GeoJSON polygon.
        polygon_coords: List of [longitude, latitude] pairs.
        """
        inside = False
        n = len(polygon_coords)
        if n < 3:
            return False

        j = n - 1
        for i in range(n):
            xi, yi = polygon_coords[i][0], polygon_coords[i][1]  # lon, lat
            xj, yj = polygon_coords[j][0], polygon_coords[j][1]  # lon, lat

            intersect = ((yi > lat) != (yj > lat)) and (
                lon < (xj - xi) * (lat - yi) / max(yj - yi, 1e-9) + xi
            )
            if intersect:
                inside = not inside
            j = i
        return inside

    @staticmethod
    def generate_circle_polygon(lat: float, lon: float, radius_nm: float, num_points: int = 32) -> List[List[float]]:
        """
        Generate geodesic circular polygon coordinates [lon, lat] around a center point.
        """
        radius_rad = radius_nm / EARTH_RADIUS_NM
        center_lat_rad = math.radians(lat)
        center_lon_rad = math.radians(lon)

        points = []
        for i in range(num_points):
            bearing = 2.0 * math.pi * i / num_points
            pt_lat = math.asin(
                math.sin(center_lat_rad) * math.cos(radius_rad) +
                math.cos(center_lat_rad) * math.sin(radius_rad) * math.cos(bearing)
            )
            pt_lon = center_lon_rad + math.atan2(
                math.sin(bearing) * math.sin(radius_rad) * math.cos(center_lat_rad),
                math.cos(radius_rad) - math.sin(center_lat_rad) * math.sin(pt_lat)
            )
            points.append([round(math.degrees(pt_lon), 6), round(math.degrees(pt_lat), 6)])

        if points:
            points.append(points[0])  # Close ring
        return points

    @staticmethod
    def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate initial bearing (forward azimuth) from point 1 to point 2.
        Returns bearing in degrees (0-360) measured clockwise from true north."""
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_lambda = math.radians(lon2 - lon1)

        x = math.sin(delta_lambda) * math.cos(phi2)
        y = (math.cos(phi1) * math.sin(phi2) -
             math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
        bearing = math.degrees(math.atan2(x, y))
        return (bearing + 360.0) % 360.0

    @staticmethod
    def is_vessel_heading_towards(
        vessel_lat: float, vessel_lon: float,
        vessel_heading: float, vessel_speed_kts: float,
        target_lat: float, target_lon: float,
        angular_tolerance_deg: float = 35.0,
        max_eta_hours: float = 96.0
    ) -> Tuple[bool, float, float]:
        """Determine if a vessel's current heading will bring it towards a target point.
        Uses forward geodesic bearing comparison within an angular divergence envelope.
        Returns: (is_heading_towards, angular_difference_deg, estimated_hours_to_arrival)
        """
        if vessel_lat is None or vessel_lon is None or vessel_heading is None:
            return False, 999.0, 999.0

        # Vessel must be making way (underway threshold: 0.5 knots)
        if vessel_speed_kts is None or vessel_speed_kts < 0.5:
            return False, 999.0, 999.0

        # Bearing from vessel to target
        required_bearing = SpatialService.calculate_bearing(
            vessel_lat, vessel_lon, target_lat, target_lon
        )

        # Angular difference (smallest angle between two bearings)
        diff = abs(vessel_heading - required_bearing)
        angular_diff = min(diff, 360.0 - diff)

        # Distance to target
        distance_nm = SpatialService.haversine_distance_nm(
            vessel_lat, vessel_lon, target_lat, target_lon
        )

        # ETA estimate: distance / speed
        estimated_hours = distance_nm / vessel_speed_kts if vessel_speed_kts > 0 else 999.0

        # Vessel is heading towards if angular diff is within tolerance AND ETA is within horizon
        is_heading = angular_diff <= angular_tolerance_deg and estimated_hours <= max_eta_hours

        return is_heading, round(angular_diff, 1), round(estimated_hours, 1)

    @staticmethod
    def find_vessels_near_point(db: Session, lat: float, lon: float, radius_nm: float) -> List[Dict[str, Any]]:
        """
        Find all active vessels within radius_nm of (lat, lon).
        Attempts PostGIS ST_DWithin with geography type; falls back to exact Haversine filter.
        """
        try:
            # High-performance PostGIS query using native geom column and GiST spatial index
            radius_meters = radius_nm * 1852.0
            sql = text("""
                SELECT id, mmsi, name, vessel_type, latitude, longitude, speed, heading, destination_port,
                       ST_Distance(
                           COALESCE(geom::geography, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography),
                           ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                       ) / 1852.0 AS distance_nm
                FROM vessels
                WHERE (geom IS NOT NULL OR (latitude IS NOT NULL AND longitude IS NOT NULL))
                  AND ST_DWithin(
                      COALESCE(geom::geography, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography),
                      ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                      :radius_meters
                  )
                ORDER BY distance_nm ASC
            """)
            result = db.execute(sql, {"lat": lat, "lon": lon, "radius_meters": radius_meters}).fetchall()
            return [
                {
                    "id": r[0],
                    "mmsi": r[1],
                    "name": r[2],
                    "vessel_type": r[3],
                    "latitude": r[4],
                    "longitude": r[5],
                    "speed": r[6],
                    "heading": r[7],
                    "destination_port": r[8],
                    "distance_nm": round(float(r[9]), 2)
                }
                for r in result
            ]
        except Exception:
            # Fallback to Python Haversine calculation
            db.rollback()
            vessels = db.query(Vessel).filter(Vessel.latitude.isnot(None), Vessel.longitude.isnot(None)).all()
            matched = []
            for v in vessels:
                d = SpatialService.haversine_distance_nm(lat, lon, v.latitude, v.longitude)
                if d <= radius_nm:
                    matched.append({
                        "id": v.id,
                        "mmsi": v.mmsi,
                        "name": v.name,
                        "vessel_type": v.vessel_type,
                        "latitude": v.latitude,
                        "longitude": v.longitude,
                        "speed": v.speed,
                        "heading": v.heading,
                        "destination_port": v.destination_port,
                        "distance_nm": d
                    })
            matched.sort(key=lambda x: x["distance_nm"])
            return matched

    @staticmethod
    def assess_vessel_disruption_proximity(vessel_lat: float, vessel_lon: float, disruptions: List[GlobalDisruption]) -> Tuple[str, Optional[str], Optional[float]]:
        """
        Evaluate accurate spatial relationship between a vessel and active disruption zones.
        Returns: (status: 'disrupted' | 'at-risk' | 'normal', reason_str, min_distance_nm)
        """
        if vessel_lat is None or vessel_lon is None:
            return "normal", None, None

        min_dist = float("inf")
        closest_reason = None
        closest_status = "normal"

        for d in disruptions:
            if d.resolved or d.latitude is None or d.longitude is None:
                continue
            
            dist = SpatialService.haversine_distance_nm(vessel_lat, vessel_lon, d.latitude, d.longitude)
            radius = d.radius_nm if d.radius_nm is not None else 100.0

            if dist < min_dist:
                min_dist = dist

            if dist <= radius:
                return "disrupted", f"{d.disruption_type}: {d.location_name} ({round(dist, 1)} NM away)", dist
            elif dist <= radius * 2.0:
                if closest_status != "disrupted":
                    closest_status = "at-risk"
                    closest_reason = f"Approaching {d.disruption_type}: {d.location_name} ({round(dist, 1)} NM away)"

        return closest_status, closest_reason, min_dist if min_dist != float("inf") else None

spatial_service = SpatialService()
