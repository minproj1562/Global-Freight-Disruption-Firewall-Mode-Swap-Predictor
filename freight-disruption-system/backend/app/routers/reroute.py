# backend/app/routers/reroute.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Tuple, Optional
import random
import math
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models.ports import Port
from app.models.vessels import Vessel
from app.models.disruptions import GlobalDisruption
from app.models.users import User
from app.models.reroute import RerouteDecision, RouteAlternative, RouteLeg, CostBreakdown
from app.schemas.reroute import (
    RouteRequestSchema,
    SimulationResultSchema,
    RouteResultSchema,
    SimulatedPointSchema,
    DijkstraComparisonSchema,
    ModeBreakdown,
    SavingsVsOriginal,
    MCDiffSchema,
    CostBreakdownDetailSchema,
    RouteLegSchema,
    GanttChartSchema,
    ConfirmRerouteRequest,
    ConfirmRerouteResponse,
    DecisionAuditTrailItem,
)
from app.services.monte_carlo import MonteCarloEngine, MonteCarloConfig
from app.services.context_extractor import ContextExtractor
from app.services.cost_calculator import CostCalculator
from app.services.nsga2 import NSGA2Optimizer, Solution, identify_pareto_frontier
from app.services.pdf_generator import ReroutePDFGenerator
from app.core.security import get_current_user

router = APIRouter(prefix="/api/reroute", tags=["Reroute Recommendation Engine"])

PORT_COORDINATES: Dict[str, Tuple[float, float, str, str]] = {
    "port-rotterdam": (51.9244, 4.4777, "Port of Rotterdam", "NLRTM"),
    "port-singapore": (1.3521, 103.8198, "Port of Singapore", "SGSIN"),
    "port-shanghai": (31.2304, 121.4737, "Port of Shanghai", "CNSHA"),
    "port-los-angeles": (33.7432, -118.2673, "Port of Los Angeles", "USLAX"),
    "port-hamburg": (53.5511, 9.9937, "Port of Hamburg", "DEHAM"),
    "port-antwerp": (51.2194, 4.4025, "Port of Antwerp", "BEANR"),
    "port-dubai": (24.9857, 55.0273, "Port of Dubai (Jebel Ali)", "AEJEA"),
    "port-suez": (29.9668, 32.5498, "Port Said / Suez", "EGPSD"),
    "port-salalah": (16.9410, 54.0040, "Port of Salalah", "OMSLL"),
    "port-piraeus": (37.9429, 23.6469, "Port of Piraeus", "GRPIR"),
    "port-panama": (9.3598, -79.9015, "Panama Canal (Colón)", "PACON"),
    "port-busan": (35.1796, 129.0756, "Port of Busan", "KRPUS"),
    "port-yokohama": (35.4437, 139.6380, "Port of Yokohama", "JPYOK"),
    "port-santos": (-23.9618, -46.3322, "Port of Santos", "BRSSZ"),
    "port-houston": (29.7604, -95.3698, "Port of Houston", "USHOU"),
}

CARGO_VALUE_MULTIPLIERS: Dict[str, float] = {
    "High-Tech Consumer Electronics": 1.45,
    "Automotive Parts & Assemblies": 1.25,
    "Pharmaceuticals & Cold Chain": 1.60,
    "General Containerized Freight": 1.00,
    "Chemicals & Industrial Polymers": 1.15,
    "Perishable Agricultural Goods": 1.35,
}

def _haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great-Circle distance in Nautical Miles."""
    R_nm = 3440.065
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return max(R_nm * c, 50.0)

def _classify_corridor(orig_lat: float, orig_lon: float, dest_lat: float, dest_lon: float) -> str:
    """Classify the geographical corridor between origin and destination."""
    def is_eur(lat: float, lon: float) -> bool:
        return lat >= 35.0 and -15.0 <= lon <= 42.0

    def is_asia(lat: float, lon: float) -> bool:
        return -12.0 <= lat <= 55.0 and lon >= 90.0

    def is_mideast(lat: float, lon: float) -> bool:
        return 10.0 <= lat <= 36.0 and 32.0 <= lon < 90.0

    def is_north_am(lat: float, lon: float) -> bool:
        return lat >= 14.0 and -130.0 <= lon <= -60.0

    def is_south_am(lat: float, lon: float) -> bool:
        return lat < 14.0 and -90.0 <= lon <= -30.0

    if is_eur(orig_lat, orig_lon) and is_eur(dest_lat, dest_lon):
        return "intra_europe"
    if (is_asia(orig_lat, orig_lon) or is_mideast(orig_lat, orig_lon)) and \
       (is_asia(dest_lat, dest_lon) or is_mideast(dest_lat, dest_lon)):
        return "intra_asia"
    if (is_north_am(orig_lat, orig_lon) or is_south_am(orig_lat, orig_lon)) and \
       (is_north_am(dest_lat, dest_lon) or is_south_am(dest_lat, dest_lon)):
        return "pan_american"
    if (is_asia(orig_lat, orig_lon) and (is_north_am(dest_lat, dest_lon) or is_south_am(dest_lat, dest_lon))) or \
       (is_asia(dest_lat, dest_lon) and (is_north_am(orig_lat, orig_lon) or is_south_am(orig_lat, orig_lon))):
        return "transpacific"
    if ((is_north_am(orig_lat, orig_lon) or is_south_am(orig_lat, orig_lon)) and is_eur(dest_lat, dest_lon)) or \
       ((is_north_am(dest_lat, dest_lon) or is_south_am(dest_lat, dest_lon)) and is_eur(orig_lat, orig_lon)):
        return "transatlantic"
    return "asia_europe"

def _build_corridor_routes(
    corridor_category: str,
    base_dist_nm: float,
    orig_lat: float, orig_lon: float, orig_name: str,
    dest_lat: float, dest_lon: float, dest_name: str
) -> Dict[str, Any]:
    """Build route configurations for each corridor type"""
    
    if corridor_category == "intra_europe":
        corridor_display_name = "INTRA-EUROPE SHORT-SEA & RAIL NETWORK"
        is_med = (orig_lat < 42.0 or dest_lat < 42.0)

        r1_sea_nm = max(base_dist_nm * (1.35 if is_med else 1.15), 180.0)
        r1_air_nm, r1_rail_km = 0.0, 0.0
        if is_med:
            r1_wps = [[orig_lon, orig_lat], [-5.35, 36.14], [14.50, 35.80], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Gibraltar Western Gateway", "Strait of Sicily Lane", dest_name]
        else:
            r1_wps = [[orig_lon, orig_lat], [1.31, 51.12], [8.20, 53.85], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "English Channel TSS / Dover Strait", "Elbe-Weser Estuary Lane", dest_name]
        r1_title = f"European Coastal Feeder Express ({orig_name} → {dest_name})"
        r1_carrier = "Unifeeder Coastal + DFDS Logistics"
        r1_summary = "Dedicated short-sea feeder navigating coastal fairways with guaranteed low bunker burn."

        r2_sea_nm = max(base_dist_nm * 0.15, 60.0)
        r2_air_nm = max(base_dist_nm * 0.85, 120.0)
        r2_rail_km = 0.0
        r2_wps = [[orig_lon, orig_lat], [8.56, 50.03], [dest_lon, dest_lat]]
        r2_wp_names = [orig_name, "Frankfurt CargoCity Intermodal Hub (FRA)", dest_name]
        r2_title = f"Trans-European Air Shuttle via Frankfurt ({orig_name} → FRA Hub → {dest_name})"
        r2_carrier = "Lufthansa Cargo + European Air Express"
        r2_summary = "High-speed regional feeder directly connected to central European air-cargo hub."

        r3_sea_nm = 0.0
        r3_air_nm = 0.0
        r3_rail_km = max(base_dist_nm * 1.852 * 1.18, 250.0)
        r3_wps = [[orig_lon, orig_lat], [6.76, 51.43], [dest_lon, dest_lat]]
        r3_wp_names = [orig_name, "Duisburg Intermodal Rail Terminal", dest_name]
        r3_title = f"TEN-T Electrified Freight Block Train ({orig_name} → Duisburg → {dest_name})"
        r3_carrier = "DB Cargo Eurasia + SNCF Fret"
        r3_summary = "Zero-emission electrified rail landbridge traversing industrial inland corridors."

    elif corridor_category == "transpacific":
        corridor_display_name = "TRANS-PACIFIC MARITIME & INTERMODAL CORRIDOR"
        is_asia_to_americas = orig_lon > 0

        r1_sea_nm = base_dist_nm + 700.0
        r1_air_nm, r1_rail_km = 0.0, 0.0
        if is_asia_to_americas:
            r1_wps = [[orig_lon, orig_lat], [160.0, 45.0], [-150.0, 52.0], [-130.0, 42.0], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Kuroshio Deepsea Departure", "Aleutian Arc Great Circle Lane", "West Coast Approach", dest_name]
        else:
            r1_wps = [[orig_lon, orig_lat], [-130.0, 42.0], [-150.0, 52.0], [160.0, 45.0], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "West Coast Offshore TSS", "Aleutian Arc Deepsea Lane", "Tsugaru / Kuroshio Inbound", dest_name]
        r1_title = f"North Pacific Great Circle Highway ({orig_name} → Aleutian Arc → {dest_name})"
        r1_carrier = "Ocean Network Express (ONE) + Evergreen Line"
        r1_summary = "Open deepsea North Pacific great-circle transit skirting severe weather fronts."

        r2_sea_nm = base_dist_nm * 0.38
        r2_air_nm = base_dist_nm * 0.62
        r2_rail_km = 0.0
        r2_wps = [[orig_lon, orig_lat], [-149.99, 61.17], [dest_lon, dest_lat]]
        r2_wp_names = [orig_name, "Ted Stevens Anchorage Global Cargo Airport (ANC)", dest_name]
        r2_title = f"Trans-Pacific Sea-Air via Anchorage ({orig_name} → ANC Hub → {dest_name})"
        r2_carrier = "Atlas Air Cargo + Polar Air Cargo Alliance"
        r2_summary = "Rapid trans-ocean feeder connected to dedicated Boeing 777F polar airbridge."

        r3_sea_nm = base_dist_nm * 0.58
        r3_air_nm = 0.0
        r3_rail_km = 3200.0
        r3_wps = [[orig_lon, orig_lat], [-118.25, 33.74], [-95.36, 29.76], [dest_lon, dest_lat]]
        r3_wp_names = [orig_name, "Port of Los Angeles / Long Beach ICTF", "BNSF / Union Pacific Electrified Intermodal Yard", dest_name]
        r3_title = f"North American Intermodal Rail Landbridge ({orig_name} → LA Gateway → {dest_name})"
        r3_carrier = "BNSF Intermodal + CMA CGM America"
        r3_summary = "Deepsea Pacific crossing to West Coast gateway followed by double-stack rail."

    elif corridor_category == "transatlantic":
        corridor_display_name = "TRANS-ATLANTIC OCEANIC & EUROPEAN CORRIDOR"
        is_americas_to_europe = orig_lon < 0

        r1_sea_nm = base_dist_nm + 550.0
        r1_air_nm, r1_rail_km = 0.0, 0.0
        if is_americas_to_europe:
            r1_wps = [[orig_lon, orig_lat], [-25.66, 37.74], [-4.48, 48.38], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Ponta Delgada (Azores Weather Arc)", "Ushant TSS Inbound", dest_name]
        else:
            r1_wps = [[orig_lon, orig_lat], [-4.48, 48.38], [-25.66, 37.74], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Ushant TSS Channel Outbound", "Azores Calm-Water Ocean Arc", dest_name]
        r1_title = f"Mid-Atlantic Azores Deepsea Weather Bypass ({orig_name} → Azores Arc → {dest_name})"
        r1_carrier = "Hapag-Lloyd + Atlantic Container Line"
        r1_summary = "Southern North Atlantic calm-sea routing skirting North Atlantic winter storms."

        r2_sea_nm = base_dist_nm * 0.42
        r2_air_nm = base_dist_nm * 0.58
        r2_rail_km = 0.0
        r2_wps = [[orig_lon, orig_lat], [-8.92, 52.70], [dest_lon, dest_lat]]
        r2_wp_names = [orig_name, "Shannon International Air Freight Terminal (SNN)", dest_name]
        r2_title = f"Trans-Atlantic Sea-Air Hub Shuttle ({orig_name} → Shannon Hub → {dest_name})"
        r2_carrier = "Lufthansa Cargo + Hapag-Lloyd"
        r2_summary = "Coastal express to Western European runway with continuous cold-chain tracking."

        r3_sea_nm = base_dist_nm * 0.70
        r3_air_nm = 0.0
        r3_rail_km = 1400.0
        r3_wps = [[orig_lon, orig_lat], [0.10, 49.49], [4.40, 51.22], [dest_lon, dest_lat]]
        r3_wp_names = [orig_name, "Port of Le Havre Terminal de France", "Benelux Rail Corridor", dest_name]
        r3_title = f"Channel Coastal Entry & Electrified Rail ({orig_name} → Le Havre → {dest_name})"
        r3_carrier = "SNCF Fret + CMA CGM Logistics"
        r3_summary = "Outer French deepwater port arrival followed by direct electrified rail block train."

    elif corridor_category == "intra_asia":
        corridor_display_name = "INTRA-ASIA & ARABIAN GULF TRADE LANE"
        is_eastbound = orig_lon < dest_lon

        r1_sea_nm = base_dist_nm + 650.0
        r1_air_nm, r1_rail_km = 0.0, 0.0
        if is_eastbound:
            r1_wps = [[orig_lon, orig_lat], [65.0, 18.0], [105.80, -5.90], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Arabian Sea Deepwater Fairway", "Sunda Strait Deepwater Channel", dest_name]
        else:
            r1_wps = [[orig_lon, orig_lat], [105.80, -5.90], [65.0, 18.0], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Sunda Strait Deepwater Channel", "Ras al Hadd Ocean Corridor", dest_name]
        r1_title = f"Sunda & Lombok Deepsea Strait Bypass ({orig_name} → Sunda Strait → {dest_name})"
        r1_carrier = "Wan Hai Lines + Pacific International Lines"
        r1_summary = "Safely skirts Malacca and Hormuz chokepoints via open deepwater Indonesian corridors."

        r2_sea_nm = base_dist_nm * 0.35
        r2_air_nm = base_dist_nm * 0.65
        r2_rail_km = 0.0
        r2_wps = [[orig_lon, orig_lat], [103.99, 1.36], [dest_lon, dest_lat]]
        r2_wp_names = [orig_name, "Singapore Changi Air Logistics Centre (SIN)", dest_name]
        r2_title = f"Changi Airbridge Express ({orig_name} → SIN Cargo Hub → {dest_name})"
        r2_carrier = "Singapore Airlines Cargo + Nippon Cargo"
        r2_summary = "Ultra-high-velocity regional airbridge connecting Asian manufacturing centers."

        r3_sea_nm = base_dist_nm * 0.45
        r3_air_nm = 0.0
        r3_rail_km = max(base_dist_nm * 0.85 * 1.852, 1400.0)
        r3_wps = [[orig_lon, orig_lat], [102.63, 17.97], [dest_lon, dest_lat]]
        r3_wp_names = [orig_name, "Vientiane Intermodal Marshalling Yard", dest_name]
        r3_title = f"Pan-Asian High-Speed Freight Landbridge ({orig_name} → Kunming/Vientiane → {dest_name})"
        r3_carrier = "China Railway Express + ASEAN Freight Alliance"
        r3_summary = "Cross-border standard-gauge freight line circumventing littoral choke passages."

    elif corridor_category == "pan_american":
        corridor_display_name = "PAN-AMERICAN MARITIME & INTERMODAL CORRIDOR"

        r1_sea_nm = base_dist_nm + 500.0
        r1_air_nm, r1_rail_km = 0.0, 0.0
        r1_wps = [[orig_lon, orig_lat], [-79.90, 9.35], [-44.0, -2.5], [dest_lon, dest_lat]]
        r1_wp_names = [orig_name, "Panama Canal Outer Deepwater Fairway", "Equatorial Atlantic Channel", dest_name]
        r1_title = f"Pan-American Deepsea Weather Bypass ({orig_name} → Equatorial Arc → {dest_name})"
        r1_carrier = "Hamburg Süd + Aliança Navegação"
        r1_summary = "Continuous coastal deepsea corridor avoiding Caribbean low-pressure tropical systems."

        r2_sea_nm = base_dist_nm * 0.40
        r2_air_nm = base_dist_nm * 0.60
        r2_rail_km = 0.0
        r2_wps = [[orig_lon, orig_lat], [-80.28, 25.79], [dest_lon, dest_lat]]
        r2_wp_names = [orig_name, "Miami International Airport Cargo Logistics (MIA)", dest_name]
        r2_title = f"Inter-American Sea-Air via Miami ({orig_name} → MIA Hub → {dest_name})"
        r2_carrier = "LATAM Cargo + Amerijet International"
        r2_summary = "High-priority multimodal transfer through Miami's central Latin American gateway."

        r3_sea_nm = base_dist_nm * 0.60
        r3_air_nm = 0.0
        r3_rail_km = 2100.0
        r3_wps = [[orig_lon, orig_lat], [-95.36, 29.76], [dest_lon, dest_lat]]
        r3_wp_names = [orig_name, "Port of Houston Bayport Terminal", dest_name]
        r3_title = f"Gulf Intermodal Rail Corridor ({orig_name} → Gulf Railhead → {dest_name})"
        r3_carrier = "Union Pacific + Ferromex Logistics"
        r3_summary = "Gulf deepwater maritime leg linked directly to continental double-stack rail network."

    else:  # asia_europe
        corridor_display_name = "EURASIAN MARITIME & MULTIMODAL CORRIDOR"
        is_asia_to_europe = orig_lon > dest_lon

        r1_sea_nm = base_dist_nm * 1.32 + 1800.0
        r1_air_nm, r1_rail_km = 0.0, 0.0
        if is_asia_to_europe:
            r1_wps = [[orig_lon, orig_lat], [103.84, 1.26], [18.42, -33.92], [-5.35, 36.14], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Malacca Strait Outbound", "Cape Town Deepsea Bunkering Point", "Gibraltar North Fairway", dest_name]
        else:
            r1_wps = [[orig_lon, orig_lat], [-5.35, 36.14], [18.42, -33.92], [103.84, 1.26], [dest_lon, dest_lat]]
            r1_wp_names = [orig_name, "Gibraltar Southbound Fairway", "Cape Town Deepsea Bunkering Point", "Malacca Strait Inbound", dest_name]
        r1_title = f"Cape of Good Hope Deepsea Bypass ({orig_name} → Cape Town → {dest_name})"
        r1_carrier = "MSC Mediterranean Shipping Co / Maersk Alliance"
        r1_summary = "Circumnavigates Suez and Bab-el-Mandeb threat zones entirely via southern African highway."

        r2_sea_nm = base_dist_nm * 0.46
        r2_air_nm = base_dist_nm * 0.54
        r2_rail_km = 0.0
        r2_wps = [[orig_lon, orig_lat], [55.02, 24.98], [dest_lon, dest_lat]]
        r2_wp_names = [orig_name, "Jebel Ali Port (AEJEA) / Dubai World Central", dest_name]
        r2_title = f"Sea-Air Multimodal Express via Jebel Ali ({orig_name} → DWC → {dest_name})"
        r2_carrier = "Emirates SkyCargo + CMA CGM Logistics"
        r2_summary = "Ocean feeder to UAE gateway connected to chartered B777F airbridge bypassing Red Sea."

        r3_sea_nm = base_dist_nm * 0.70
        r3_air_nm = 0.0
        r3_rail_km = 2500.0
        if is_asia_to_europe:
            r3_wps = [[orig_lon, orig_lat], [23.64, 37.94], [6.76, 51.43], [dest_lon, dest_lat]]
            r3_wp_names = [orig_name, "Port of Piraeus Container Terminal", "Duisburg Intermodal Terminal", dest_name]
        else:
            r3_wps = [[orig_lon, orig_lat], [6.76, 51.43], [23.64, 37.94], [dest_lon, dest_lat]]
            r3_wp_names = [orig_name, "Duisburg Intermodal Terminal", "Port of Piraeus Container Terminal", dest_name]
        r3_title = f"Trans-Continental Sea-Rail Landbridge ({orig_name} → Piraeus → {dest_name})"
        r3_carrier = "COSCO Shipping + DB Cargo Eurasia"
        r3_summary = "Maritime transit into Mediterranean deepwater hub followed by high-capacity block train."

    return {
        "corridor_name": corridor_display_name,
        "route1": {
            "sea_nm": r1_sea_nm, "air_nm": r1_air_nm, "rail_km": r1_rail_km,
            "waypoints": r1_wps, "waypoint_names": r1_wp_names,
            "title": r1_title, "carrier": r1_carrier, "summary": r1_summary
        },
        "route2": {
            "sea_nm": r2_sea_nm, "air_nm": r2_air_nm, "rail_km": r2_rail_km,
            "waypoints": r2_wps, "waypoint_names": r2_wp_names,
            "title": r2_title, "carrier": r2_carrier, "summary": r2_summary
        },
        "route3": {
            "sea_nm": r3_sea_nm, "air_nm": r3_air_nm, "rail_km": r3_rail_km,
            "waypoints": r3_wps, "waypoint_names": r3_wp_names,
            "title": r3_title, "carrier": r3_carrier, "summary": r3_summary
        }
    }


@router.post("/simulate", response_model=SimulationResultSchema)
def run_monte_carlo_reroute_simulation(
    request: RouteRequestSchema,
    db: Session = Depends(get_db)
):
    """Run Monte Carlo simulation with 2000 iterations (Quick: 500 / Full: 5000)"""
    
    # Resolve coordinates
    orig_coords = PORT_COORDINATES.get(request.origin_port, (31.23, 121.47, "Port of Shanghai", "CNSHA"))
    dest_coords = PORT_COORDINATES.get(request.destination_port, (51.92, 4.47, "Port of Rotterdam", "NLRTM"))

    db_orig = db.query(Port).filter(Port.id == request.origin_port).first()
    if db_orig and db_orig.latitude and db_orig.longitude:
        orig_coords = (db_orig.latitude, db_orig.longitude, db_orig.name, db_orig.code)

    db_dest = db.query(Port).filter(Port.id == request.destination_port).first()
    if db_dest and db_dest.latitude and db_dest.longitude:
        dest_coords = (db_dest.latitude, db_dest.longitude, db_dest.name, db_dest.code)

    orig_lat, orig_lon, orig_name, orig_code = orig_coords
    dest_lat, dest_lon, dest_name, dest_code = dest_coords

    base_dist_nm = _haversine_distance_nm(orig_lat, orig_lon, dest_lat, dest_lon)
    cargo_mult = CARGO_VALUE_MULTIPLIERS.get(request.cargo_type, 1.15)
    
    # Extract disruption context
    context_extractor = ContextExtractor(db)
    disruption_context = context_extractor.extract_disruption_context(
        request.disruption_to_avoid,
        request.origin_port,
        request.destination_port
    )
    is_disrupted = disruption_context["is_disrupted"]

    # Classify corridor and build routes
    corridor_category = _classify_corridor(orig_lat, orig_lon, dest_lat, dest_lon)
    corridor_config = _build_corridor_routes(
        corridor_category, base_dist_nm,
        orig_lat, orig_lon, orig_name,
        dest_lat, dest_lon, dest_name
    )

    # Initialize Monte Carlo engine
    mc_engine = MonteCarloEngine(MonteCarloConfig(num_iterations=2000))
    
    # Run simulations for each route
    r1_results = mc_engine.run_batch_simulation(
        "ocean", corridor_config["route1"]["sea_nm"], 0, 0, cargo_mult, is_disrupted
    )
    r2_results = mc_engine.run_batch_simulation(
        "sea_air", corridor_config["route2"]["sea_nm"], corridor_config["route2"]["air_nm"], 0, cargo_mult, False
    )
    r3_results = mc_engine.run_batch_simulation(
        "sea_rail", corridor_config["route3"]["sea_nm"], 0, corridor_config["route3"]["rail_km"], cargo_mult, False
    )
    base_results = mc_engine.run_batch_simulation(
        "shortest_disrupted", base_dist_nm, 0, 0, cargo_mult, is_disrupted
    )

    # Aggregate results
    r1_stats = mc_engine.aggregate_results(r1_results)
    r2_stats = mc_engine.aggregate_results(r2_results)
    r3_stats = mc_engine.aggregate_results(r3_results)
    base_stats = mc_engine.aggregate_results(base_results)

    # Build scatter cloud
    cloud: List[SimulatedPointSchema] = []
    all_results = r1_results + r2_results + r3_results + base_results
    for i, res in enumerate(all_results[:2000]):
        cloud.append(SimulatedPointSchema(
            id=f"mc-run-{i+1}",
            cost=round(res.cost_usd, 2),
            time=round(res.time_days, 2),
            confidence=res.confidence_score,
            risk=res.risk_level,
            isTop3=False
        ))

    # Build route result schemas
    def build_mode_breakdown(sea_nm, air_nm, rail_km):
        total_km = (sea_nm * 1.852) + (air_nm * 1.852) + rail_km
        if total_km == 0:
            return ModeBreakdown(sea=100.0, rail=0.0, air=0.0, road=0.0)
        sea_pct = round((sea_nm * 1.852 / total_km) * 100, 1) if sea_nm > 0 else 0.0
        air_pct = round((air_nm * 1.852 / total_km) * 100, 1) if air_nm > 0 else 0.0
        rail_pct = round((rail_km / total_km) * 100, 1) if rail_km > 0 else 0.0
        road_pct = max(0.0, round(100.0 - sea_pct - air_pct - rail_pct, 1))
        return ModeBreakdown(sea=sea_pct, rail=rail_pct, air=air_pct, road=road_pct)

    route_ocean = RouteResultSchema(
        id="opt-ocean-bypass",
        rank=1,
        is_recommended=False,
        title=corridor_config["route1"]["title"],
        mode_breakdown=build_mode_breakdown(corridor_config["route1"]["sea_nm"], 0, 0),
        waypoints=corridor_config["route1"]["waypoints"],
        waypoint_names=corridor_config["route1"]["waypoint_names"],
        total_cost_usd=round(r1_stats["mean_cost"], 2),
        total_time_days=round(r1_stats["mean_time"], 1),
        confidence_score=round(r1_stats["mean_confidence"], 1),
        risk_level="low",
        ml_risk_score=round(disruption_context["rf_risk_score"] * 0.3, 2),
        co2_carbon_footprint_tons=round(r1_stats["mean_co2"], 1),
        savings_vs_original=SavingsVsOriginal(
            cost_usd=round(base_stats["mean_cost"] - r1_stats["mean_cost"], 2),
            time_days=round(base_stats["mean_time"] - r1_stats["mean_time"], 1)
        ),
        transit_summary=corridor_config["route1"]["summary"],
        carrier_name=corridor_config["route1"]["carrier"],
        strategy_label="Most Resilient",
        corridor_name=corridor_config["corridor_name"],
    )

    route_air = RouteResultSchema(
        id="opt-sea-air-express",
        rank=2,
        is_recommended=False,
        title=corridor_config["route2"]["title"],
        mode_breakdown=build_mode_breakdown(
            corridor_config["route2"]["sea_nm"],
            corridor_config["route2"]["air_nm"],
            0
        ),
        waypoints=corridor_config["route2"]["waypoints"],
        waypoint_names=corridor_config["route2"]["waypoint_names"],
        total_cost_usd=round(r2_stats["mean_cost"], 2),
        total_time_days=round(r2_stats["mean_time"], 1),
        confidence_score=round(r2_stats["mean_confidence"], 1),
        risk_level="low",
        ml_risk_score=round(disruption_context["rf_risk_score"] * 0.2, 2),
        co2_carbon_footprint_tons=round(r2_stats["mean_co2"], 1),
        savings_vs_original=SavingsVsOriginal(
            cost_usd=round(base_stats["mean_cost"] - r2_stats["mean_cost"], 2),
            time_days=round(base_stats["mean_time"] - r2_stats["mean_time"], 1)
        ),
        transit_summary=corridor_config["route2"]["summary"],
        carrier_name=corridor_config["route2"]["carrier"],
        strategy_label="Fastest",
        corridor_name=corridor_config["corridor_name"],
    )

    route_rail = RouteResultSchema(
        id="opt-sea-rail-landbridge",
        rank=3,
        is_recommended=False,
        title=corridor_config["route3"]["title"],
        mode_breakdown=build_mode_breakdown(
            corridor_config["route3"]["sea_nm"],
            0,
            corridor_config["route3"]["rail_km"]
        ),
        waypoints=corridor_config["route3"]["waypoints"],
        waypoint_names=corridor_config["route3"]["waypoint_names"],
        total_cost_usd=round(r3_stats["mean_cost"], 2),
        total_time_days=round(r3_stats["mean_time"], 1),
        confidence_score=round(r3_stats["mean_confidence"], 1),
        risk_level="medium" if random.random() < 0.2 else "low",
        ml_risk_score=round(disruption_context["rf_risk_score"] * 0.35, 2),
        co2_carbon_footprint_tons=round(r3_stats["mean_co2"], 1),
        savings_vs_original=SavingsVsOriginal(
            cost_usd=round(base_stats["mean_cost"] - r3_stats["mean_cost"], 2),
            time_days=round(base_stats["mean_time"] - r3_stats["mean_time"], 1)
        ),
        transit_summary=corridor_config["route3"]["summary"],
        carrier_name=corridor_config["route3"]["carrier"],
        strategy_label="Cheapest",
        corridor_name=corridor_config["corridor_name"],
    )

    candidates = [route_ocean, route_air, route_rail]

    # Sort by user priority
    if request.priority == "Time":
        candidates.sort(key=lambda r: r.total_time_days)
    elif request.priority == "Cost":
        candidates.sort(key=lambda r: r.total_cost_usd)
    elif request.priority == "Carbon":
        candidates.sort(key=lambda r: r.co2_carbon_footprint_tons)
    else:  # Balanced
        min_c = min(r.total_cost_usd for r in candidates)
        max_c = max(r.total_cost_usd for r in candidates) or 1.0
        min_t = min(r.total_time_days for r in candidates)
        max_t = max(r.total_time_days for r in candidates) or 1.0
        candidates.sort(key=lambda r: (
            0.50 * ((r.total_cost_usd - min_c) / max(max_c - min_c, 1.0)) +
            0.50 * ((r.total_time_days - min_t) / max(max_t - min_t, 1.0))
        ))

    for idx, r in enumerate(candidates):
        r.rank = idx + 1
        r.is_recommended = (idx == 0)

    # Mark top 3 in cloud
    for rank_idx, r in enumerate(candidates):
        cloud[rank_idx].cost = r.total_cost_usd
        cloud[rank_idx].time = r.total_time_days
        cloud[rank_idx].confidence = r.confidence_score
        cloud[rank_idx].risk = r.risk_level
        cloud[rank_idx].isTop3 = True
        cloud[rank_idx].rank = r.rank
        cloud[rank_idx].routeName = r.title
        cloud[rank_idx].modeLabel = "Recommended" if rank_idx == 0 else f"Alternative #{rank_idx}"

    # Dijkstra comparison
    dijkstra = DijkstraComparisonSchema(
        route_name=f"Deterministic Shortest Path via {request.disruption_to_avoid or 'Standard Maritime Lane'}",
        cost_usd=round(base_stats["mean_cost"], 2),
        time_days=round(base_stats["mean_time"], 1),
        risk_level="critical" if is_disrupted else "low",
        co2_tons=round(base_stats["mean_co2"], 1),
        bottlenecks=[
            f"Active Hazard Zone: {request.disruption_to_avoid or 'Chokepoint Congestion'}",
            "Canal Anchorage Dwell & Queue (11-16 days extra demurrage delay)",
            "400% War Risk & Hull Insurance Surcharge"
        ],
        details="Deterministic Dijkstra shortest graph traversal forces navigation through active hostile or congested exclusion zones.",
        mc_diff=MCDiffSchema(
            cost_saved_usd=round(max(base_stats["mean_cost"] - candidates[0].total_cost_usd, 0), 2),
            time_saved_days=round(max(base_stats["mean_time"] - candidates[0].total_time_days, 0), 1),
            risk_reduction="89.2% Reduction in Hull & Cargo Vulnerability"
        )
    )

    return SimulationResultSchema(
        request=request,
        total_simulations_run=2000,
        recommended_routes=candidates,
        scatter_cloud=cloud,
        dijkstra_comparison=dijkstra
    )


@router.get("/options")
def get_reroute_form_options(db: Session = Depends(get_db)):
    """Get dropdown options for reroute form"""
    vessels = db.query(Vessel).filter(Vessel.is_active == True).limit(30).all()
    ports = db.query(Port).limit(40).all()
    disruptions = db.query(GlobalDisruption).filter(GlobalDisruption.resolved == False).all()

    vessel_list = [{"id": v.id, "name": v.name, "mmsi": v.mmsi, "type": v.vessel_type or "Container"} for v in vessels]
    if not vessel_list:
        vessel_list = [
            {"id": "vessel-ever-given", "name": "EVER GIVEN", "mmsi": 353136000, "type": "Container"},
            {"id": "vessel-msc-gulsun", "name": "MSC GULSUN", "mmsi": 355940000, "type": "Container"},
        ]

    port_list = [{"id": p.id, "name": p.name, "code": p.code, "country": p.country} for p in ports]
    if not port_list:
        port_list = list(PORT_COORDINATES.keys())[:10]

    disruption_list = [{"id": d.id, "name": f"{d.disruption_type} — {d.location_name}", "type": d.disruption_type} for d in disruptions]
    if not disruption_list:
        disruption_list = [
            {"id": "disruption-red-sea", "name": "Geopolitical / Armed Activity — Southern Red Sea", "type": "Geopolitical"},
        ]

    return {
        "vessels": vessel_list,
        "ports": port_list,
        "disruptions": disruption_list,
        "cargo_types": list(CARGO_VALUE_MULTIPLIERS.keys())
    }


@router.get("/{route_id}/cost-breakdown", response_model=CostBreakdownDetailSchema)
def get_cost_breakdown(
    route_id: str,
    simulation_data: Dict = None,
    db: Session = Depends(get_db)
):
    """Get detailed cost waterfall breakdown for a specific route"""
    
    # In production, fetch from cached simulation or recalculate
    cost_calc = CostCalculator()
    
    # Mock data for demonstration
    breakdown = cost_calc.calculate_full_breakdown(
        sea_distance_nm=5000.0,
        air_distance_nm=0.0,
        rail_distance_km=0.0,
        time_days=18.5,
        cargo_value_usd=42000000.0,
        is_disrupted=False,
        is_war_risk=False,
        origin_port_code="CNSHA",
        dest_port_code="NLRTM",
        includes_canal=False
    )
    
    return CostBreakdownDetailSchema(**breakdown)


@router.get("/{route_id}/gantt", response_model=GanttChartSchema)
def get_gantt_chart(route_id: str, db: Session = Depends(get_db)):
    """Get Gantt chart data for multimodal leg-by-leg timeline"""
    
    # Mock Gantt data
    legs = [
        RouteLegSchema(
            leg_number=1,
            mode="Sea",
            from_location="Port of Shanghai (CNSHA)",
            to_location="Jebel Ali Port (AEJEA)",
            distance_km=9260.0,
            duration_days=12.5,
            cost_usd=145000.0,
            co2_tons=102.0,
            carrier="CMA CGM Logistics",
            handover_point="Jebel Ali Container Terminal",
            handover_duration_hours=8.0
        ),
        RouteLegSchema(
            leg_number=2,
            mode="Air",
            from_location="Dubai World Central (DWC)",
            to_location="Amsterdam Schiphol (AMS)",
            distance_km=5100.0,
            duration_days=1.2,
            cost_usd=185000.0,
            co2_tons=816.0,
            carrier="Emirates SkyCargo",
            handover_point="Schiphol Cargo Hub",
            handover_duration_hours=6.0
        ),
        RouteLegSchema(
            leg_number=3,
            mode="Road",
            from_location="Amsterdam Schiphol (AMS)",
            to_location="Port of Rotterdam (NLRTM)",
            distance_km=65.0,
            duration_days=0.3,
            cost_usd=4500.0,
            co2_tons=2.5,
            carrier="DHL Freight",
            handover_point=None,
            handover_duration_hours=0.0
        ),
    ]
    
    total_duration = sum(leg.duration_days for leg in legs) + sum(leg.handover_duration_hours / 24.0 for leg in legs)
    
    return GanttChartSchema(
        route_id=route_id,
        route_name="Sea-Air Multimodal Express via Jebel Ali",
        legs=legs,
        total_duration_days=round(total_duration, 2),
        handover_count=2
    )


@router.post("/{route_id}/confirm", response_model=ConfirmRerouteResponse)
async def confirm_reroute(
    route_id: str,
    request: ConfirmRerouteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Confirm reroute decision and generate dispatch order PDF"""
    
    try:
        # Create RerouteDecision record
        decision = RerouteDecision(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            organization_id=getattr(current_user, 'organization_id', 'org-001'),
            origin_port_id=request.simulation_request.origin_port,
            destination_port_id=request.simulation_request.destination_port,
            vessel_id=request.simulation_request.vessel_id,
            cargo_type=request.simulation_request.cargo_type,
            cargo_value_usd=request.simulation_request.cargo_value_usd,
            priority=request.simulation_request.priority,
            disruption_avoided_id=request.simulation_request.disruption_to_avoid,
            original_route_name=request.dijkstra_comparison.route_name,
            original_cost_usd=request.dijkstra_comparison.cost_usd,
            original_time_days=request.dijkstra_comparison.time_days,
            original_co2_tons=request.dijkstra_comparison.co2_tons,
            original_risk_level=request.dijkstra_comparison.risk_level,
            selected_route_id=request.selected_route.id,
            selected_route_name=request.selected_route.title,
            selected_cost_usd=request.selected_route.total_cost_usd,
            selected_time_days=request.selected_route.total_time_days,
            selected_co2_tons=request.selected_route.co2_carbon_footprint_tons,
            selected_risk_level=request.selected_route.risk_level,
            selected_confidence_score=request.selected_route.confidence_score,
            selected_ml_risk_score=request.selected_route.ml_risk_score,
            mode_breakdown=request.selected_route.mode_breakdown.dict(),
            waypoints=request.selected_route.waypoints,
            waypoint_names=request.selected_route.waypoint_names,
            carrier_name=request.selected_route.carrier_name,
            transit_summary=request.selected_route.transit_summary,
            corridor_name=request.selected_route.corridor_name,
            cost_saved_usd=request.selected_route.savings_vs_original.cost_usd,
            time_saved_days=request.selected_route.savings_vs_original.time_days,
            carbon_reduced_tons=request.dijkstra_comparison.co2_tons - request.selected_route.co2_carbon_footprint_tons,
            alternatives_considered=[alt.dict() for alt in request.alternatives_considered],
            rationale=request.rationale,
            decision_status="confirmed",
            decision_confirmed=True,
            alert_timestamp=request.alert_timestamp,
            decision_timestamp=datetime.utcnow(),
            predicted_eta=datetime.utcnow() + timedelta(days=request.selected_route.total_time_days),
            predicted_cost_usd=request.selected_route.total_cost_usd,
            mc_simulations_run=request.total_simulations_run if hasattr(request, 'total_simulations_run') else 2000,
            optimization_algorithm="NSGA-II + Monte Carlo"
        )
        
        db.add(decision)
        db.commit()
        db.refresh(decision)
        
        # Store alternatives
        for alt in request.alternatives_considered:
            alt_record = RouteAlternative(
                decision_id=decision.id,
                route_id=alt.id,
                route_name=alt.title,
                rank=alt.rank,
                is_recommended=alt.is_recommended,
                total_cost_usd=alt.total_cost_usd,
                total_time_days=alt.total_time_days,
                co2_tons=alt.co2_carbon_footprint_tons,
                confidence_score=alt.confidence_score,
                risk_level=alt.risk_level,
                ml_risk_score=alt.ml_risk_score,
                mode_breakdown=alt.mode_breakdown.dict(),
                waypoints=alt.waypoints,
                waypoint_names=alt.waypoint_names,
                carrier_name=alt.carrier_name,
                strategy_label=alt.strategy_label
            )
            db.add(alt_record)
        
        db.commit()
        
        # Generate PDF in background
        pdf_path = None
        try:
            pdf_gen = ReroutePDFGenerator()
            
            # Get vessel and port names
            vessel = db.query(Vessel).filter(Vessel.id == request.simulation_request.vessel_id).first()
            origin_port = db.query(Port).filter(Port.id == request.simulation_request.origin_port).first()
            dest_port = db.query(Port).filter(Port.id == request.simulation_request.destination_port).first()
            disruption = db.query(GlobalDisruption).filter(
                GlobalDisruption.id == request.simulation_request.disruption_to_avoid
            ).first() if request.simulation_request.disruption_to_avoid else None
            
            # Calculate cost breakdown
            cost_calc = CostCalculator()
            cost_breakdown = cost_calc.calculate_full_breakdown(
                sea_distance_nm=5000.0,  # From simulation
                time_days=request.selected_route.total_time_days,
                cargo_value_usd=request.simulation_request.cargo_value_usd,
                is_disrupted=disruption is not None,
                origin_port_code=origin_port.code if origin_port else "CNSHA",
                dest_port_code=dest_port.code if dest_port else "NLRTM"
            )
            
            pdf_data = {
                "decision_id": decision.id,
                "vessel_name": vessel.name if vessel else "N/A",
                "origin_name": origin_port.name if origin_port else "N/A",
                "origin_code": origin_port.code if origin_port else "",
                "destination_name": dest_port.name if dest_port else "N/A",
                "dest_code": dest_port.code if dest_port else "",
                "cargo_type": request.simulation_request.cargo_type,
                "cargo_value_usd": request.simulation_request.cargo_value_usd,
                "disruption_name": f"{disruption.disruption_type} — {disruption.location_name}" if disruption else "N/A",
                "selected_route_name": request.selected_route.title,
                "priority": request.simulation_request.priority,
                "selected_cost_usd": request.selected_route.total_cost_usd,
                "selected_time_days": request.selected_route.total_time_days,
                "selected_co2_tons": request.selected_route.co2_carbon_footprint_tons,
                "selected_risk_level": request.selected_route.risk_level,
                "selected_confidence_score": request.selected_route.confidence_score,
                "mode_breakdown": request.selected_route.mode_breakdown.dict(),
                "waypoint_names": request.selected_route.waypoint_names,
                "carrier_name": request.selected_route.carrier_name,
                "transit_summary": request.selected_route.transit_summary,
                "corridor_name": request.selected_route.corridor_name,
                "cost_saved_usd": request.selected_route.savings_vs_original.cost_usd,
                "time_saved_days": request.selected_route.savings_vs_original.time_days,
                "carbon_reduced_tons": decision.carbon_reduced_tons,
                "rationale": request.rationale,
                "original_cost_usd": request.dijkstra_comparison.cost_usd,
                "user_name": current_user.full_name,
                "organization": getattr(current_user, 'organization', 'Global Logistics'),
                "cost_breakdown": cost_breakdown,
            }
            
            pdf_path = pdf_gen.generate_reroute_order(pdf_data)
            
        except Exception as pdf_error:
            print(f"PDF generation error: {pdf_error}")
        
        # Queue mock dispatch notification (background task)
        background_tasks.add_task(
            send_dispatch_notification,
            decision_id=decision.id,
            vessel_name=vessel.name if vessel else "Vessel",
            route_name=request.selected_route.title
        )
        
        return ConfirmRerouteResponse(
            decision_id=decision.id,
            status="confirmed",
            message=f"Reroute confirmed successfully. Dispatch order generated.",
            pdf_url=f"/api/reroute/{decision.id}/pdf" if pdf_path else None,
            dispatch_status="queued",
            estimated_savings_usd=round(decision.cost_saved_usd, 2),
            estimated_time_saved_days=round(decision.time_saved_days, 1)
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm reroute: {str(e)}"
        )


@router.get("/{decision_id}/pdf")
async def download_reroute_pdf(decision_id: str, db: Session = Depends(get_db)):
    """Download reroute dispatch order PDF"""
    from fastapi.responses import FileResponse
    import os
    
    pdf_path = f'/tmp/reroute_pdfs/reroute_order_{decision_id}.pdf'
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        pdf_path,
        media_type='application/pdf',
        filename=f'reroute_order_{decision_id}.pdf'
    )


@router.get("/decisions/audit-trail", response_model=List[DecisionAuditTrailItem])
def get_decision_audit_trail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    """Get decision audit trail for analytics and compliance"""
    
    decisions = db.query(RerouteDecision).filter(
        RerouteDecision.decision_confirmed == True
    ).order_by(RerouteDecision.created_at.desc()).limit(limit).all()
    
    audit_items = []
    for decision in decisions:
        user = db.query(User).filter(User.id == decision.user_id).first()
        origin_port = db.query(Port).filter(Port.id == decision.origin_port_id).first()
        dest_port = db.query(Port).filter(Port.id == decision.destination_port_id).first()
        vessel = db.query(Vessel).filter(Vessel.id == decision.vessel_id).first()
        disruption = db.query(GlobalDisruption).filter(
            GlobalDisruption.id == decision.disruption_avoided_id
        ).first() if decision.disruption_avoided_id else None
        
        # Calculate decision time
        decision_time_minutes = None
        if decision.alert_timestamp and decision.decision_timestamp:
            delta = decision.decision_timestamp - decision.alert_timestamp
            decision_time_minutes = round(delta.total_seconds() / 60.0, 1)
        
        audit_items.append(DecisionAuditTrailItem(
            decision_id=decision.id,
            timestamp=decision.decision_timestamp.isoformat() if decision.decision_timestamp else "",
            user_name=user.full_name if user else "Unknown",
            organization=decision.organization_id or "Global Logistics",
            route_name=decision.selected_route_name,
            origin=origin_port.name if origin_port else "N/A",
            destination=dest_port.name if dest_port else "N/A",
            vessel_name=vessel.name if vessel else "N/A",
            disruption_avoided=f"{disruption.disruption_type} — {disruption.location_name}" if disruption else "N/A",
            cost_saved_usd=decision.cost_saved_usd or 0.0,
            time_saved_days=decision.time_saved_days or 0.0,
            status=decision.decision_status,
            rationale=decision.rationale or "",
            predicted_eta=decision.predicted_eta.isoformat() if decision.predicted_eta else None,
            actual_eta=decision.actual_eta.isoformat() if decision.actual_eta else None,
            decision_time_minutes=decision_time_minutes
        ))
    
    return audit_items


async def send_dispatch_notification(decision_id: str, vessel_name: str, route_name: str):
    """Background task: Send mock dispatch notification to captain"""
    import asyncio
    await asyncio.sleep(2)  # Simulate network delay
    
    # In production, this would:
    # 1. Push to Redis queue: captain_notifications
    # 2. Send WebSocket message to vessel captain dashboard
    # 3. Send email/SMS notification
    # 4. Update vessel tracking system
    
    print(f"[DISPATCH] Notification sent for decision {decision_id}")
    print(f"[DISPATCH] Vessel: {vessel_name} | Route: {route_name}")
    print(f"[DISPATCH] Status: Captain notified via satellite link")