"""
backend/app/services/gnn_ripple_predictor.py

Maritime Disruption Ripple Effect Predictor.

Primary engine: a trained 2-layer Graph Convolutional Network (GCN)
(app.ml.gnn_model.PortGNNPredictor), trained via simulation-distillation
(see app.ml.train_gnn_model) on the REAL maritime trade network built
from the PortNetwork database table.

Fallback engine: if the GCN has not been trained yet (no checkpoint
file present), falls back live to the same physics-informed BFS
corridor-propagation simulation used as the GCN's training "teacher"
(app.services.graph_engine.simulate_shock_propagation). This guarantees
the API always returns a result, labeled honestly depending on which
engine produced it — no fabricated "trained model" claims.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import networkx as nx

from app.services import graph_engine
from app.models.ports import Port
from app.ml.gnn_model import gnn_predictor as _gnn_predictor_singleton

# Static fallback corridor graph — used only when no database session is
# available at all (e.g. a unit test calling this module in isolation).
DEFAULT_MARITIME_GRAPH_EDGES = [
    ("CNSHA", "SGSIN", {"distance_nm": 2240, "transit_days": 5.5}),
    ("SGSIN", "AEJEA", {"distance_nm": 3100, "transit_days": 8.0}),
    ("AEJEA", "EGPSD", {"distance_nm": 1300, "transit_days": 3.5}),
    ("EGPSD", "NLRTM", {"distance_nm": 3280, "transit_days": 8.5}),
    ("NLRTM", "DEHAM", {"distance_nm": 280, "transit_days": 1.2}),
    ("NLRTM", "BEANR", {"distance_nm": 80, "transit_days": 0.5}),
    ("CNSHA", "USLAX", {"distance_nm": 5700, "transit_days": 14.0}),
    ("CNSHA", "KRPUS", {"distance_nm": 540, "transit_days": 1.5}),
    ("SGSIN", "INNSA", {"distance_nm": 1650, "transit_days": 4.5}),
    ("INNSA", "AEJEA", {"distance_nm": 1050, "transit_days": 3.0}),
    ("USLAX", "NLRTM", {"distance_nm": 7800, "transit_days": 20.0}),
]


def _build_static_fallback_graph() -> nx.Graph:
    G = nx.Graph()
    for src, dst, data in DEFAULT_MARITIME_GRAPH_EDGES:
        G.add_node(src, name=src, code=src, congestion_percent=40.0)
        G.add_node(dst, name=dst, code=dst, congestion_percent=40.0)
        G.add_edge(src, dst, weight=data["transit_days"], **data)
    return G


class GNNRipplePredictor:
    """
    Unified ripple-effect prediction service. Prefers the trained GCN;
    transparently falls back to the BFS simulation teacher model when
    the GCN is untrained — always discloses which engine answered.
    """

    def __init__(self):
        self.gnn = _gnn_predictor_singleton

    def predict_multi_horizon_ripple(
        self,
        epicenter_port_id_or_code: str,
        disruption_severity: str = "critical",
        shock_magnitude_pct: float = 45.0,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Returns ripple predictions for d3/d7/d14 simultaneously — the
        shape consumed directly by the Disruption Alert Center and the
        Network Impact Analyzer page.
        """
        severity = (disruption_severity or "critical").lower()

        if db is not None:
            port = db.query(Port).filter(
                (Port.id == epicenter_port_id_or_code) | (Port.code == epicenter_port_id_or_code)
            ).first()
            if port:
                graph_engine.ensure_port_has_edges(db, port.id)
            G = graph_engine.build_port_graph(db)
            epicenter_id = port.id if port else epicenter_port_id_or_code
            engine_mode = "db"
        else:
            G = _build_static_fallback_graph()
            epicenter_id = epicenter_port_id_or_code.upper()
            engine_mode = "static_fallback"

        if epicenter_id not in G.nodes or G.number_of_nodes() < 2:
            return self._empty_result(epicenter_id, severity, "NO_NETWORK_DATA")

        used_gnn = False
        per_port: Dict[str, Dict[str, float]] = {}

        if self.gnn.is_trained and engine_mode == "db":
            try:
                node_id_order = list(G.nodes)
                adjacency = nx.to_numpy_array(G, nodelist=node_id_order)
                centralities = graph_engine.compute_all_centralities(G)
                congestion_by_id = {n: G.nodes[n].get("congestion_percent", 0.0) for n in G.nodes}

                features = self.gnn.build_features(
                    node_id_order=node_id_order,
                    congestion_by_id=congestion_by_id,
                    degree_centrality_by_id=centralities["degree"],
                    epicenter_id=epicenter_id,
                    shock_magnitude_pct=shock_magnitude_pct,
                )
                predictions = self.gnn.predict(node_id_order, adjacency, features)  # [N, 3] in %

                for idx, pid in enumerate(node_id_order):
                    if pid == epicenter_id:
                        continue
                    d3, d7, d14 = predictions[idx]
                    if max(d3, d7, d14) >= 3.0:
                        per_port[pid] = {"d3": round(float(d3), 1), "d7": round(float(d7), 1), "d14": round(float(d14), 1)}
                used_gnn = True
            except Exception as e:
                print(f"[GNN Ripple Predictor] GCN inference failed, falling back to BFS simulation: {e}")
                used_gnn = False

        if not used_gnn:
            sim_result = graph_engine.simulate_shock_propagation(G, epicenter_id, severity, shock_magnitude_pct)
            per_port = {
                pid: vals for pid, vals in sim_result.items()
                if pid != epicenter_id and max(vals.values()) >= 3.0
            }

        downstream_impacts = []
        for pid, horizons in per_port.items():
            node_data = G.nodes[pid]
            peak = max(horizons.values())
            downstream_impacts.append({
                "port_id": pid,
                "port_code": node_data.get("code", pid),
                "port_name": node_data.get("name", pid),
                "congestion_increase_pct": horizons["d14"],
                "delay_days": horizons,
                "additional_waiting_vessels": max(1, round(peak * 0.35)),
                "additional_dwell_days": round(peak * 0.08, 1),
                "risk_level": "HIGH" if peak >= 25.0 else ("MEDIUM" if peak >= 12.0 else "LOW"),
            })

        downstream_impacts.sort(key=lambda x: x["congestion_increase_pct"], reverse=True)

        return {
            "model_architecture": "GCN_TRAINED" if used_gnn else "BFS_CORRIDOR_SIMULATION",
            "model_note": (
                "Prediction generated by the trained Graph Convolutional Network."
                if used_gnn else
                "Trained GCN unavailable — prediction generated live by the physics-informed "
                "BFS corridor propagation simulation (the same model used to train the GCN)."
            ),
            "is_trained_gnn_used": used_gnn,
            "epicenter": {"port_id": epicenter_id, "disruption_severity": severity},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "affected_ports_count": len(downstream_impacts),
            "propagation_cascade": downstream_impacts,
            "systemic_bottleneck_score": round(min(10.0, sum(p["congestion_increase_pct"] for p in downstream_impacts) / 20.0), 2),
        }

    def predict_ripple_effects(
        self,
        epicenter_port_code: str,
        disruption_severity: str = "critical",
        shock_magnitude_pct: float = 45.0,
        horizon_days: int = 7,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Legacy single-horizon API (kept for ml_analytics.py REST compatibility)."""
        multi = self.predict_multi_horizon_ripple(epicenter_port_code, disruption_severity, shock_magnitude_pct, db)
        horizon_key = f"d{horizon_days}" if horizon_days in (3, 7, 14) else "d7"
        for item in multi["propagation_cascade"]:
            item["estimated_congestion_increase_pct"] = item["delay_days"].get(horizon_key, item["congestion_increase_pct"])
        multi["simulation_horizon_days"] = horizon_days
        return multi

    def _empty_result(self, epicenter_id, severity, reason) -> Dict[str, Any]:
        return {
            "model_architecture": reason,
            "model_note": "Epicenter port not found in the trade network graph, or network has insufficient connections.",
            "is_trained_gnn_used": False,
            "epicenter": {"port_id": epicenter_id, "disruption_severity": severity},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "affected_ports_count": 0,
            "propagation_cascade": [],
            "systemic_bottleneck_score": 0.0,
        }


gnn_ripple_predictor = GNNRipplePredictor()