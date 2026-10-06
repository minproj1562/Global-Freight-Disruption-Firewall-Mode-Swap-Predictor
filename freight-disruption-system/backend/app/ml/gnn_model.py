"""
backend/app/ml/gnn_model.py

Small-scale Graph Convolutional Network (GCN) for maritime disruption
ripple-effect prediction — implemented directly from the Kipf & Welling
(2017) propagation rule in PyTorch (no torch_geometric dependency),
appropriate for the small port-network graphs (tens of nodes) used here:

    H^(l+1) = sigma( D~^-1/2 * A~ * D~^-1/2 * H^(l) * W^(l) )

where A~ = A + I (self-loops) and D~ is its degree matrix.

TRAINING METHODOLOGY NOTE (for academic transparency):
No public, labeled, port-to-port disruption-cascade dataset exists
anywhere — a well-documented gap in maritime resilience literature
(IMF PortWatch and Kaluza et al. 2010 provide real but UNLABELED
network/congestion data). This model is therefore trained via
SIMULATION DISTILLATION: a physics-informed, distance/transit-time
weighted BFS propagation simulation (see graph_engine.simulate_shock_
propagation, used identically in train_gnn_model.py) generates
synthetic but structurally realistic (epicenter, severity, graph-state)
-> (ripple outcome) pairs, grounded in REAL port network topology
(PortNetwork table) and REAL port congestion features. The GCN is
trained to approximate this simulation's outcome function, enabling
sub-millisecond inference and generalization to disruption scenarios
the simulation itself never explicitly enumerated.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional


def normalize_adjacency(adj: np.ndarray) -> torch.Tensor:
    """Symmetric normalization: D~^-1/2 (A + I) D~^-1/2"""
    n = adj.shape[0]
    a_tilde = adj + np.eye(n)
    degrees = a_tilde.sum(axis=1)
    d_inv_sqrt = np.zeros_like(degrees)
    nonzero = degrees > 0
    d_inv_sqrt[nonzero] = np.power(degrees[nonzero], -0.5)
    d_mat_inv_sqrt = np.diag(d_inv_sqrt)
    norm_adj = d_mat_inv_sqrt @ a_tilde @ d_mat_inv_sqrt
    return torch.tensor(norm_adj, dtype=torch.float32)


class GCNLayer(nn.Module):
    """One Kipf & Welling graph convolution layer."""

    def __init__(self, in_features: int, out_features: int):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features, bias=True)

    def forward(self, x: torch.Tensor, norm_adj: torch.Tensor) -> torch.Tensor:
        support = norm_adj @ x  # propagate features across graph neighborhood
        return self.linear(support)  # then transform


class PortRippleGCN(nn.Module):
    """
    2-layer GCN predicting, for every port node, the expected congestion
    increase (%, scaled 0-1 internally) at three forecast horizons
    (3 / 7 / 14 days) given an initial disruption shock injected at one
    epicenter node.
    """

    def __init__(self, input_dim: int = 4, hidden_dim: int = 16, output_dim: int = 3, dropout: float = 0.2):
        super().__init__()
        self.gcn1 = GCNLayer(input_dim, hidden_dim)
        self.gcn2 = GCNLayer(hidden_dim, hidden_dim)
        self.output_head = nn.Linear(hidden_dim, output_dim)
        self.dropout = nn.Dropout(dropout)
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim

    def forward(self, x: torch.Tensor, norm_adj: torch.Tensor) -> torch.Tensor:
        h = F.relu(self.gcn1(x, norm_adj))
        h = self.dropout(h)
        h = F.relu(self.gcn2(h, norm_adj))
        out = self.output_head(h)
        return F.relu(out)  # congestion increase can't be negative


class PortGNNPredictor:
    """
    Production inference wrapper for PortRippleGCN, mirroring the style
    of RFRiskPredictor: graceful fallback if the model hasn't been
    trained yet, consistent get_model_info() contract.
    """

    FEATURE_NAMES = ["congestion_pct_norm", "degree_centrality", "is_epicenter", "shock_magnitude_norm"]

    def __init__(self, model_path: str = "app/ml/models/gnn_ripple_model.pt"):
        self.model_path = Path(model_path)
        self.model: Optional[PortRippleGCN] = None
        self.metadata: Dict[str, Any] = {}
        self.is_trained = False
        self._load_model()

    def _load_model(self):
        if not self.model_path.exists():
            print(f"[GNN Predictor] [WARN] No trained model found at {self.model_path}")
            print("[GNN Predictor] -> Falling back to physics-informed BFS simulation until trained")
            self.is_trained = False
            return

        try:
            checkpoint = torch.load(self.model_path, map_location="cpu")
            self.model = PortRippleGCN(
                input_dim=checkpoint["input_dim"],
                hidden_dim=checkpoint["hidden_dim"],
                output_dim=checkpoint["output_dim"],
            )
            self.model.load_state_dict(checkpoint["model_state_dict"])
            self.model.eval()
            self.metadata = checkpoint.get("metadata", {})
            self.is_trained = True
            print(f"[GNN Predictor] [OK] Trained GCN loaded (trained_at={self.metadata.get('trained_at', 'unknown')})")
        except Exception as e:
            print(f"[GNN Predictor] [ERR] Failed to load GCN checkpoint: {e}")
            self.is_trained = False

    def build_features(
        self,
        node_id_order: List[str],
        congestion_by_id: Dict[str, float],
        degree_centrality_by_id: Dict[str, float],
        epicenter_id: str,
        shock_magnitude_pct: float,
    ) -> np.ndarray:
        """Builds the [N, input_dim] feature matrix for a given disruption scenario."""
        n = len(node_id_order)
        features = np.zeros((n, len(self.FEATURE_NAMES)), dtype=np.float32)
        for i, pid in enumerate(node_id_order):
            features[i, 0] = (congestion_by_id.get(pid, 0.0) or 0.0) / 100.0
            features[i, 1] = degree_centrality_by_id.get(pid, 0.0) or 0.0
            is_epi = 1.0 if pid == epicenter_id else 0.0
            features[i, 2] = is_epi
            features[i, 3] = (shock_magnitude_pct / 100.0) if is_epi else 0.0
        return features

    def predict(self, node_id_order: List[str], adjacency: np.ndarray, node_features: np.ndarray) -> np.ndarray:
        """
        Returns an [N, 3] numpy array: predicted congestion increase (%)
        for every node at horizons [3-day, 7-day, 14-day].
        Caller must ensure self.is_trained is True before calling.
        """
        norm_adj = normalize_adjacency(adjacency)
        x = torch.tensor(node_features, dtype=torch.float32)
        with torch.no_grad():
            out = self.model(x, norm_adj)
        return (out.numpy() * 100.0).clip(0.0, 100.0)

    def get_model_info(self) -> Dict[str, Any]:
        if not self.is_trained:
            return {
                "status": "untrained_fallback",
                "model_loaded": False,
                "model_type": "2-Layer Graph Convolutional Network (Kipf & Welling, untrained)",
                "message": (
                    "GCN weights not found — system is using the physics-informed BFS simulation "
                    "instead. Run 'python -m app.ml.train_gnn_model' to train."
                ),
            }
        return {
            "status": "gnn_model_active",
            "model_loaded": True,
            "model_type": "2-Layer Graph Convolutional Network (PyTorch, hand-implemented GCN propagation rule)",
            "architecture": f"GCN({self.model.input_dim} -> {self.model.hidden_dim} -> {self.model.hidden_dim} -> {self.model.output_dim})",
            "training_methodology": "Simulation-distillation from physics-informed BFS corridor propagation model (no public labeled cascade dataset exists)",
            "feature_names": self.FEATURE_NAMES,
            "metrics": self.metadata.get("metrics", {}),
            "trained_at": self.metadata.get("trained_at", "Unknown"),
            "training_samples": self.metadata.get("training_samples", "Unknown"),
        }


# Global singleton instance
gnn_predictor = PortGNNPredictor()