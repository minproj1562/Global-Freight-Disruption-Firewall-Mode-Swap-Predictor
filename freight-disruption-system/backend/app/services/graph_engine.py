"""
backend/app/services/graph_engine.py

NetworkX-based Maritime Trade Network Analysis Engine.

Builds a real graph from the PortNetwork database table (geographically
grounded corridors — see port_services.ensure_network_connections_for_port)
and computes standard network-science metrics:
  - Degree / Betweenness / Closeness / Eigenvector centrality
  - Articulation points (single points of failure)
  - Shortest alternative paths

This is the "real network science" layer feeding both:
  1. The Port Manager-facing Network Impact Analyzer page (plain-language).
  2. The GNN ripple predictor's node features and training labels
     (graph_engine.py supplies real graph structure + the physics-informed
     BFS "teacher" simulation; gnn_model.py / gnn_ripple_predictor.py /
     train_gnn_model.py consume it).
"""
import math
import networkx as nx
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.ports import Port, PortNetwork


def _haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great circle distance in nautical miles between two coordinates."""
    R_nm = 3440.065
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R_nm * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_port_graph(db: Session, undirected: bool = True) -> "nx.Graph":
    """
    Build the real maritime trade network graph from the PortNetwork table.
    Nodes carry live port attributes (congestion, berth capacity, etc.)
    so the GNN and centrality metrics always reflect current state.
    """
    G = nx.Graph() if undirected else nx.DiGraph()

    ports = db.query(Port).all()
    for p in ports:
        G.add_node(
            p.id,
            name=p.name,
            code=p.code,
            country=p.country,
            congestion_percent=p.congestion_percent or 0,
            berth_capacity=p.berth_capacity or 0,
            latitude=p.latitude,
            longitude=p.longitude,
        )

    edges = db.query(PortNetwork).all()
    for e in edges:
        if e.source_port_id in G.nodes and e.dest_port_id in G.nodes:
            weight = e.avg_transit_days or 5.0
            G.add_edge(
                e.source_port_id,
                e.dest_port_id,
                distance_nm=e.distance_nautical_miles or 0.0,
                transit_days=weight,
                weight=weight,
            )

    return G


def ensure_port_has_edges(db: Session, port_id: str) -> None:
    """Guarantees a port has at least a handful of network connections before analysis."""
    from app.services.port_services import ensure_network_connections_for_port
    ensure_network_connections_for_port(port_id, db)


# ============================================================
# CENTRALITY METRICS (Network Science)
# ============================================================

def compute_all_centralities(G: "nx.Graph") -> Dict[str, Dict[str, float]]:
    """Returns {metric_name: {port_id: score}} for the whole graph."""
    if G.number_of_nodes() == 0:
        return {"degree": {}, "betweenness": {}, "closeness": {}, "eigenvector": {}}

    degree = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, weight="weight", normalized=True)
    closeness = nx.closeness_centrality(G, distance="weight")
    try:
        eigenvector = nx.eigenvector_centrality(G, max_iter=500, weight="weight")
    except (nx.PowerIterationFailedConvergence, nx.NetworkXException):
        eigenvector = {n: 0.0 for n in G.nodes}

    return {
        "degree": degree,
        "betweenness": betweenness,
        "closeness": closeness,
        "eigenvector": eigenvector,
    }


def find_articulation_points(G: "nx.Graph") -> List[str]:
    """
    Ports which, if removed, would split the trade network into
    disconnected pieces — i.e. genuine single points of failure.
    """
    if G.number_of_nodes() < 3:
        return []
    H = G.to_undirected() if isinstance(G, nx.DiGraph) else G
    return list(nx.articulation_points(H))


def compute_port_vulnerability(G: "nx.Graph", port_id: str, centralities: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    """
    Combines betweenness centrality + articulation-point status + degree
    into a single 0-100 "vulnerability" score and a risk tier.
    """
    betweenness = centralities["betweenness"].get(port_id, 0.0)
    degree = centralities["degree"].get(port_id, 0.0)
    articulation_points = find_articulation_points(G)
    is_single_point_of_failure = port_id in articulation_points

    raw_score = (betweenness * 0.6 + (1 - degree) * 0.15 + (1.0 if is_single_point_of_failure else 0.0) * 0.25)
    vulnerability_score = round(min(100.0, raw_score * 100), 1)

    if is_single_point_of_failure:
        risk_tier = "CRITICAL"
    elif vulnerability_score >= 60:
        risk_tier = "HIGH"
    elif vulnerability_score >= 30:
        risk_tier = "MODERATE"
    else:
        risk_tier = "LOW"

    return {
        "vulnerability_score": vulnerability_score,
        "risk_tier": risk_tier,
        "is_single_point_of_failure": is_single_point_of_failure,
        "betweenness_centrality": round(betweenness, 4),
        "degree_centrality": round(degree, 4),
    }


# ============================================================
# SHORTEST / ALTERNATIVE PATHS
# ============================================================

def find_alternative_routes(G: "nx.Graph", port_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Computes realistic backup/diversion corridors if port_id experiences peak congestion or closure.
    For each major trade partner connecting to port_id, determines the closest viable alternative
    gateway port in port_id's regional maritime cluster with genuine diversion delays (+0.8 to +2.5d).
    """
    if port_id not in G.nodes:
        return []

    port_node = G.nodes[port_id]
    port_name = port_node.get("name", port_id)
    port_lat = port_node.get("latitude", 0.0)
    port_lon = port_node.get("longitude", 0.0)

    # 1. Identify regional alternative peer ports (within 650 nm or top 3 closest ports)
    peers = []
    for node_id, data in G.nodes(data=True):
        if node_id != port_id:
            d = _haversine_distance_nm(port_lat, port_lon, data.get("latitude", 0.0), data.get("longitude", 0.0))
            peers.append((node_id, data.get("name", node_id), d))
    peers.sort(key=lambda x: x[2])

    regional_peers = [p for p in peers if p[2] <= 650][:4]
    if not regional_peers:
        regional_peers = peers[:3]

    # 2. Get direct trade partners connected to port_id (excluding regional peers)
    neighbors = list(G.neighbors(port_id))
    peer_ids = {p[0] for p in regional_peers}

    partner_candidates = []
    for n in neighbors:
        if n in peer_ids:
            continue
        weight = G[port_id][n].get("transit_days", 5.0)
        partner_candidates.append((n, weight))

    partner_candidates.sort(key=lambda x: x[1], reverse=True)

    alternatives = []
    for partner_id, direct_days in partner_candidates:
        partner_node = G.nodes[partner_id]
        partner_name = partner_node.get("name", partner_id)
        partner_lat = partner_node.get("latitude", 0.0)
        partner_lon = partner_node.get("longitude", 0.0)

        best_peer_id = None
        best_peer_name = None
        best_delta = 999.0

        d_to_current = _haversine_distance_nm(partner_lat, partner_lon, port_lat, port_lon)

        for peer_id, peer_name, _ in regional_peers:
            peer_lat = G.nodes[peer_id].get("latitude", 0.0)
            peer_lon = G.nodes[peer_id].get("longitude", 0.0)
            d_to_peer = _haversine_distance_nm(partner_lat, partner_lon, peer_lat, peer_lon)
            diff_nm = abs(d_to_peer - d_to_current)
            delta = round(max(0.7, (diff_nm / 450.0) + 0.8), 1)

            if delta < best_delta:
                best_delta = delta
                best_peer_id = peer_id
                best_peer_name = peer_name

        if best_peer_id:
            alternatives.append({
                "from_port_id": partner_id,
                "from_port_name": partner_name,
                "to_port_id": port_id,
                "to_port_name": port_name,
                "diversion_port_name": best_peer_name,
                "alternate_path": [partner_name, best_peer_name],
                "extra_transit_days": best_delta,
                "has_alternative": True,
                "no_alternative_exists": False,
            })
            if len(alternatives) >= top_k:
                break

    return alternatives


def get_shortest_path(G: "nx.Graph", source_id: str, target_id: str) -> Optional[Dict[str, Any]]:
    if source_id not in G.nodes or target_id not in G.nodes:
        return None
    try:
        path = nx.shortest_path(G, source_id, target_id, weight="weight")
        days = nx.shortest_path_length(G, source_id, target_id, weight="weight")
        return {
            "path_port_ids": path,
            "path_port_names": [G.nodes[n].get("name", n) for n in path],
            "total_transit_days": round(days, 1),
            "hops": len(path) - 1,
        }
    except nx.NetworkXNoPath:
        return None


# ============================================================
# PLAIN-LANGUAGE TRANSLATION LAYER (Port Manager facing)
# ============================================================

def translate_to_port_manager_language(
    port_id: str,
    G: "nx.Graph",
    centralities: Dict[str, Dict[str, float]],
    vulnerability: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Converts raw network-science numbers into plain operational language
    a Port Manager (non-technical background) can act on directly.
    """
    degree_raw = centralities["degree"].get(port_id, 0.0)
    betweenness_raw = centralities["betweenness"].get(port_id, 0.0)
    num_partners = G.degree(port_id) if port_id in G.nodes else 0

    chokepoint_score_pct = round(betweenness_raw * 100, 1)
    if chokepoint_score_pct >= 15:
        chokepoint_label = "Major Global Chokepoint"
        chokepoint_explainer = (
            f"A very large share of worldwide shipping traffic logically passes through your port to "
            f"reach other regions. Roughly {chokepoint_score_pct}% of the shortest trade paths in our "
            f"network model route through your terminal."
        )
    elif chokepoint_score_pct >= 5:
        chokepoint_label = "Regional Trade Hub"
        chokepoint_explainer = (
            f"Your port plays a meaningful connecting role for regional trade flow "
            f"({chokepoint_score_pct}% of modeled trade paths pass through it)."
        )
    else:
        chokepoint_label = "Local / Feeder Port"
        chokepoint_explainer = (
            "Your port mainly serves its own direct trade partners rather than acting as a "
            "pass-through hub for other regions."
        )

    if vulnerability["is_single_point_of_failure"]:
        failure_risk_label = "Single Point of Failure"
        failure_risk_explainer = (
            "If your port were to shut down (strike, storm, equipment failure), at least one pair "
            "of your trading partners would have NO alternative sea route between them in our network "
            "model. This is the highest-risk category — a shutdown would fracture part of the regional "
            "trade network, not just slow it down."
        )
    elif vulnerability["vulnerability_score"] >= 60:
        failure_risk_label = "High Dependency Risk"
        failure_risk_explainer = (
            "Many trade routes rely on your port as a convenient link. A shutdown would force "
            "significant rerouting and delays across the network, though alternate paths do exist."
        )
    elif vulnerability["vulnerability_score"] >= 30:
        failure_risk_label = "Moderate Dependency Risk"
        failure_risk_explainer = (
            "Some trade routes use your port as a link, but reasonable alternative routes exist "
            "if it becomes unavailable."
        )
    else:
        failure_risk_label = "Low Dependency Risk"
        failure_risk_explainer = (
            "Your port is not heavily relied upon as a connector for other ports' trade routes. "
            "A shutdown would mostly affect your own direct shipments."
        )

    return {
        "trade_chokepoint_score_pct": chokepoint_score_pct,
        "trade_chokepoint_label": chokepoint_label,
        "trade_chokepoint_explainer": chokepoint_explainer,
        "direct_trade_partners_count": int(num_partners),
        "direct_connectivity_pct": round(degree_raw * 100, 1),
        "single_point_of_failure_risk_label": failure_risk_label,
        "single_point_of_failure_explainer": failure_risk_explainer,
        "vulnerability_score_0_100": vulnerability["vulnerability_score"],
        "risk_tier": vulnerability["risk_tier"],
    }


# ============================================================
# PHYSICS-INFORMED BFS SHOCK PROPAGATION ("TEACHER" SIMULATION)
# ============================================================

def simulate_shock_propagation(
    G: "nx.Graph",
    epicenter_id: str,
    severity: str = "critical",
    shock_magnitude_pct: float = 45.0,
) -> Dict[str, Dict[str, float]]:
    """
    Physics-informed BFS/message-passing propagation simulation — used
    both as a LIVE FALLBACK (when the GCN hasn't been trained yet / is
    unavailable) and as the SYNTHETIC LABEL GENERATOR for
    simulation-distillation training of the GCN (see train_gnn_model.py).

    Returns {port_id: {"d3": pct, "d7": pct, "d14": pct}} congestion
    increase estimates for every reachable port, attenuated by edge
    transit-time/distance and a horizon-dependent decay factor.
    """
    severity_mult = {"low": 0.3, "medium": 0.6, "high": 0.85, "critical": 1.0}.get(severity.lower(), 0.75)
    initial_shock = shock_magnitude_pct * severity_mult
    horizon_decay = {3: 0.85, 7: 0.65, 14: 0.45}

    results: Dict[str, Dict[str, float]] = {n: {"d3": 0.0, "d7": 0.0, "d14": 0.0} for n in G.nodes}

    for horizon_days, decay in horizon_decay.items():
        visited = {epicenter_id: initial_shock}
        queue = [(epicenter_id, initial_shock, 0)]
        while queue:
            curr, shock, hop = queue.pop(0)
            if hop >= 3 or curr not in G:
                continue
            for neighbor in G.neighbors(curr):
                edge_data = G[curr][neighbor]
                transit_time = edge_data.get("transit_days", edge_data.get("weight", 5.0))
                if transit_time > (horizon_days * (hop + 1)):
                    continue
                distance_nm = edge_data.get("distance_nm", 3000.0)
                # Longer corridors attenuate shock more; shorter/denser corridors less
                attenuation = max(0.3, 1.0 - min(0.6, distance_nm / 20000.0)) * decay
                propagated = shock * attenuation
                if neighbor not in visited or visited[neighbor] < propagated:
                    visited[neighbor] = propagated
                    queue.append((neighbor, propagated, hop + 1))
        key = f"d{horizon_days}"
        for pid, val in visited.items():
            if pid == epicenter_id:
                continue
            results.setdefault(pid, {"d3": 0.0, "d7": 0.0, "d14": 0.0})
            results[pid][key] = round(min(100.0, val), 2)

    return results