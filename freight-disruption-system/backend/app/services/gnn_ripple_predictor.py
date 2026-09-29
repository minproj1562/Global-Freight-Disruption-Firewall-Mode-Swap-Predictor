# backend/app/services/gnn_ripple_predictor.py
"""
BFS_CORRIDOR_SIMULATION — Maritime Ripple Effect Propagator.

REAL DATA INSUFFICIENT status:
  - Temporal graph disruption cascade training requires historical time-series
    congestion records across port nodes with labeled disruption propagation outcomes.
  - No such temporal graph training data exists in the database.
  - Under the NO FABRICATION rule, this model is NOT a trained GNN/GCN.

What this actually is:
  - A Breadth-First Search (BFS) shock propagation simulation over a static
    hand-coded maritime corridor graph (DEFAULT_MARITIME_GRAPH_EDGES).
  - Shock magnitude attenuates by edge throughput_weight and a time-horizon decay.
  - Computes which ports are reachable within the specified horizon and estimates
    congestion increase proportional to propagated shock.

Previously claimed as 'Spatial-Temporal Graph Convolutional Network (GCN)' — that
claim has been removed. This is an explicit BFS simulation, not a trained neural network.
"""
import numpy as np
import networkx as nx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.ports import Port, PortNetwork
from app.models.disruptions import GlobalDisruption

# Global major shipping corridors & trade flow weights (Daily TEU / Vessel throughput)
DEFAULT_MARITIME_GRAPH_EDGES = [
    ("CNSHA", "SGSIN", {"distance_nm": 2240, "throughput_weight": 0.95, "transit_days": 5.5}),
    ("SGSIN", "AEJEA", {"distance_nm": 3100, "throughput_weight": 0.85, "transit_days": 8.0}),
    ("AEJEA", "EGPSD", {"distance_nm": 1300, "throughput_weight": 0.90, "transit_days": 3.5}),
    ("EGPSD", "NLRTM", {"distance_nm": 3280, "throughput_weight": 0.92, "transit_days": 8.5}),
    ("NLRTM", "DEHAM", {"distance_nm": 280,  "throughput_weight": 0.70, "transit_days": 1.2}),
    ("NLRTM", "BEANR", {"distance_nm": 80,   "throughput_weight": 0.75, "transit_days": 0.5}),
    ("CNSHA", "USLAX", {"distance_nm": 5700, "throughput_weight": 0.95, "transit_days": 14.0}),
    ("CNSHA", "KRPUS", {"distance_nm": 540,  "throughput_weight": 0.80, "transit_days": 1.5}),
    ("SGSIN", "INNSA", {"distance_nm": 1650, "throughput_weight": 0.78, "transit_days": 4.5}),
    ("INNSA", "AEJEA", {"distance_nm": 1050, "throughput_weight": 0.82, "transit_days": 3.0}),
    ("USLAX", "NLRTM", {"distance_nm": 7800, "throughput_weight": 0.60, "transit_days": 20.0}), # Panama route
]

class GNNRipplePredictor:
    """
    BFS_CORRIDOR_SIMULATION — maritime disruption ripple effect simulator.
    Uses NetworkX BFS over a static corridor graph to propagate congestion shocks.
    NOT a trained Graph Neural Network. Training data is INSUFFICIENT.
    """
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        """Construct maritime trade flow graph"""
        for src, dst, data in DEFAULT_MARITIME_GRAPH_EDGES:
            self.graph.add_edge(src, dst, **data)
            # Bi-directional trade flows with slightly lower reverse weight
            self.graph.add_edge(dst, src, distance_nm=data["distance_nm"], throughput_weight=data["throughput_weight"] * 0.75, transit_days=data["transit_days"])

    def predict_ripple_effects(
        self,
        epicenter_port_code: str,
        disruption_severity: str = "critical",
        shock_magnitude_pct: float = 45.0,
        horizon_days: int = 7,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Simulate graph convolution / shock propagation across maritime network.
        Horizons: 3 days (1st hop), 7 days (2nd hop), 14 days (global systemic equilibrium).
        """
        code = (epicenter_port_code or "EGPSD").upper()
        
        # Severity dampening factor
        severity_mult = {
            "low": 0.3,
            "medium": 0.6,
            "high": 0.85,
            "critical": 1.0
        }.get(disruption_severity.lower(), 0.75)

        initial_shock = shock_magnitude_pct * severity_mult
        
        # Propagation decay factor based on time horizon (longer horizon = wider propagation, lower peak intensity)
        horizon_decay = {3: 0.85, 7: 0.65, 14: 0.45}.get(horizon_days, 0.60)
        
        downstream_impacts = []
        visited = {code: 0}
        
        # Breadth-first message passing
        queue = [(code, initial_shock, 0)] # (node, current_shock, hop)

        while queue:
            curr_node, curr_shock, hop = queue.pop(0)
            if hop >= 3:
                continue

            for neighbor in self.graph.neighbors(curr_node):
                edge_data = self.graph[curr_node][neighbor]
                transit_time = edge_data.get("transit_days", 5.0)
                
                # Check if shock can reach neighbor within horizon
                if transit_time > (horizon_days * (hop + 1)):
                    continue

                attenuation = edge_data.get("throughput_weight", 0.8) * horizon_decay
                propagated_shock = curr_shock * attenuation

                if neighbor not in visited or visited[neighbor] < propagated_shock:
                    visited[neighbor] = propagated_shock
                    if propagated_shock >= 5.0: # Significant threshold
                        downstream_impacts.append({
                            "port_code": neighbor,
                            "hop_distance": hop + 1,
                            "estimated_congestion_increase_pct": round(propagated_shock, 1),
                            "additional_waiting_vessels": max(1, round(propagated_shock * 0.35)),
                            "additional_dwell_days": round(propagated_shock * 0.08, 1),
                            "risk_level": "HIGH" if propagated_shock >= 25.0 else ("MEDIUM" if propagated_shock >= 12.0 else "LOW"),
                            "corridor_segment": f"{curr_node} -> {neighbor}"
                        })
                        queue.append((neighbor, propagated_shock, hop + 1))

        # Sort downstream impacts by estimated congestion surge
        downstream_impacts.sort(key=lambda x: x["estimated_congestion_increase_pct"], reverse=True)

        return {
            "model_architecture": "BFS_CORRIDOR_SIMULATION",
            "model_note": (
                "NOT a trained GNN/GCN. This is a BFS shock propagation simulation "
                "over a static maritime corridor graph. Training data INSUFFICIENT."
            ),
            "is_trained": False,
            "epicenter": {
                "port_code": code,
                "disruption_severity": disruption_severity,
                "initial_shock_pct": round(initial_shock, 1)
            },
            "simulation_horizon_days": horizon_days,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "affected_ports_count": len(downstream_impacts),
            "propagation_cascade": downstream_impacts,
            "systemic_bottleneck_score": round(min(10.0, sum(p["estimated_congestion_increase_pct"] for p in downstream_impacts) / 20.0), 2)
        }

gnn_ripple_predictor = GNNRipplePredictor()
