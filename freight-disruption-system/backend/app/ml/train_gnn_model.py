"""
backend/app/ml/train_gnn_model.py

Training pipeline for PortRippleGCN via SIMULATION DISTILLATION.

Why simulation distillation: there is no public, labeled, port-to-port
disruption-cascade dataset anywhere (a documented gap in maritime
resilience literature — see IMF PortWatch, Kaluza et al. 2010 for real
but unlabeled network/congestion data). We therefore:

  1. Build the REAL maritime trade graph from the PortNetwork table
     (geographically grounded edges) and REAL port congestion,
     connectivity, structural-importance, and berth-capacity features.
  2. Use a physics-informed BFS propagation simulation (graph_engine.
     simulate_shock_propagation) as a "teacher" to generate thousands
     of synthetic (epicenter, severity, graph-state) -> (ripple outcome)
     training pairs.
  3. Train a 2-layer GCN (gnn_model.PortRippleGCN) to approximate this
     teacher's output function, enabling millisecond inference and
     generalization beyond the exact scenarios the simulation enumerated.

This is a standard technique in resilience / epidemiology-on-graphs ML
research when ground-truth incident data is unobservable or
commercially unavailable, and is documented here transparently.

FEATURE SET (v2 — 6 features, see gnn_model.py docstring for full detail):
  congestion_pct_norm, degree_centrality, is_epicenter, shock_magnitude_norm,
  betweenness_centrality, berth_capacity_norm

Usage (from the backend/ directory):
    python -m app.ml.train_gnn_model --samples 2500 --epochs 300
"""
import argparse
import random
import numpy as np
import networkx as nx
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

from app.database import SessionLocal
from app.models.ports import Port
from app.services.graph_engine import (
    build_port_graph,
    ensure_port_has_edges,
    compute_all_centralities,
    compute_berth_capacity_norm,
    simulate_shock_propagation,
)
from app.ml.gnn_model import PortRippleGCN, normalize_adjacency

SEVERITIES = ["low", "medium", "high", "critical"]
SEVERITY_MULT = {"low": 0.3, "medium": 0.6, "high": 0.85, "critical": 1.0}
NUM_FEATURES = 6  # must always match len(gnn_model.PortGNNPredictor.FEATURE_NAMES)


def generate_training_data(db, num_samples: int):
    """Builds the real port graph, then generates synthetic training samples."""
    print("[GNN Train] Building real maritime trade graph from PortNetwork table...")
    all_ports = db.query(Port).all()
    for p in all_ports:
        ensure_port_has_edges(db, p.id)

    G = build_port_graph(db)
    node_id_order = list(G.nodes)
    n = len(node_id_order)
    print(f"[GNN Train] Graph built: {n} ports, {G.number_of_edges()} trade corridors")

    if n < 4:
        raise RuntimeError("Not enough ports with network connections to train a GNN. Seed more ports/corridors first.")

    centralities = compute_all_centralities(G)
    degree_centrality = centralities["degree"]
    betweenness_centrality = centralities["betweenness"]
    berth_capacity_norm = compute_berth_capacity_norm(G)
    adjacency = nx.to_numpy_array(G, nodelist=node_id_order)
    congestion_by_id = {p.id: (p.congestion_percent or 0.0) for p in all_ports}

    samples = []
    print(f"[GNN Train] Generating {num_samples} synthetic simulation-distillation samples...")
    for i in range(num_samples):
        epicenter_id = random.choice(node_id_order)
        severity = random.choice(SEVERITIES)
        shock_magnitude = random.uniform(20.0, 70.0)

        sim_result = simulate_shock_propagation(G, epicenter_id, severity, shock_magnitude)

        features = np.zeros((n, NUM_FEATURES), dtype=np.float32)
        targets = np.zeros((n, 3), dtype=np.float32)
        for idx, pid in enumerate(node_id_order):
            features[idx, 0] = congestion_by_id.get(pid, 0.0) / 100.0
            features[idx, 1] = degree_centrality.get(pid, 0.0)
            is_epi = 1.0 if pid == epicenter_id else 0.0
            features[idx, 2] = is_epi
            features[idx, 3] = (shock_magnitude * SEVERITY_MULT[severity] / 100.0) if is_epi else 0.0
            features[idx, 4] = betweenness_centrality.get(pid, 0.0)
            features[idx, 5] = berth_capacity_norm.get(pid, 0.0)

            port_result = sim_result.get(pid, {"d3": 0.0, "d7": 0.0, "d14": 0.0})
            targets[idx, 0] = port_result["d3"] / 100.0
            targets[idx, 1] = port_result["d7"] / 100.0
            targets[idx, 2] = port_result["d14"] / 100.0

        samples.append((features, targets))
        if (i + 1) % 500 == 0:
            print(f"  ...generated {i + 1}/{num_samples} samples")

    return samples, adjacency, node_id_order


def train(num_samples: int = 2500, epochs: int = 300, hidden_dim: int = 16, lr: float = 0.01, val_split: float = 0.15):
    db = SessionLocal()
    try:
        samples, adjacency, node_id_order = generate_training_data(db, num_samples)
    finally:
        db.close()

    random.shuffle(samples)
    val_count = max(1, int(len(samples) * val_split))
    val_samples = samples[:val_count]
    train_samples = samples[val_count:]

    norm_adj = normalize_adjacency(adjacency)

    model = PortRippleGCN(input_dim=NUM_FEATURES, hidden_dim=hidden_dim, output_dim=3)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    loss_fn = nn.MSELoss()

    train_losses, val_losses = [], []

    print(f"\n[GNN Train] Training on {len(train_samples)} samples, validating on {len(val_samples)} samples")
    print(f"[GNN Train] Architecture: GCN({NUM_FEATURES} -> {hidden_dim} -> {hidden_dim} -> 3), Adam(lr={lr})\n")

    for epoch in range(1, epochs + 1):
        model.train()
        epoch_loss = 0.0
        random.shuffle(train_samples)
        for features, targets in train_samples:
            optimizer.zero_grad()
            x = torch.tensor(features, dtype=torch.float32)
            y = torch.tensor(targets, dtype=torch.float32)
            pred = model(x, norm_adj)
            loss = loss_fn(pred, y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        avg_train_loss = epoch_loss / max(1, len(train_samples))
        train_losses.append(avg_train_loss)

        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for features, targets in val_samples:
                x = torch.tensor(features, dtype=torch.float32)
                y = torch.tensor(targets, dtype=torch.float32)
                pred = model(x, norm_adj)
                val_loss += loss_fn(pred, y).item()
        avg_val_loss = val_loss / max(1, len(val_samples))
        val_losses.append(avg_val_loss)

        if epoch % 20 == 0 or epoch == 1 or epoch == epochs:
            print(f"  Epoch {epoch:4d}/{epochs} | Train MSE: {avg_train_loss:.6f} | Val MSE: {avg_val_loss:.6f}")

    model.eval()
    abs_errors = []
    with torch.no_grad():
        for features, targets in val_samples:
            x = torch.tensor(features, dtype=torch.float32)
            y = torch.tensor(targets, dtype=torch.float32)
            pred = model(x, norm_adj)
            abs_errors.append(torch.abs(pred - y).mean().item() * 100)
    mae_pct_points = float(np.mean(abs_errors)) if abs_errors else 0.0
    print(f"\n[GNN Train] Final Validation MAE: {mae_pct_points:.2f} percentage points of congestion increase")

    plt.figure(figsize=(9, 5))
    plt.plot(train_losses, label="Train MSE")
    plt.plot(val_losses, label="Validation MSE")
    plt.xlabel("Epoch")
    plt.ylabel("Mean Squared Error (0-1 scale)")
    plt.title("Port Ripple GCN — Simulation-Distillation Training Curve (6-Feature Model)")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig("gnn_training_loss_curve.png", dpi=300, bbox_inches="tight")
    print("[GNN Train] Loss curve saved to gnn_training_loss_curve.png")
    plt.close()

    output_path = Path("app/ml/models/gnn_ripple_model.pt")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    checkpoint = {
        "model_state_dict": model.state_dict(),
        "input_dim": NUM_FEATURES,
        "hidden_dim": hidden_dim,
        "output_dim": 3,
        "metadata": {
            "trained_at": datetime.now().isoformat(),
            "training_samples": len(train_samples),
            "validation_samples": len(val_samples),
            "num_graph_nodes_at_training": len(node_id_order),
            "feature_set_version": "v2_6_features_betweenness_berth_capacity",
            "methodology": "Simulation-distillation from physics-informed BFS corridor propagation (no public labeled cascade dataset exists)",
            "metrics": {
                "final_train_mse": round(train_losses[-1], 6),
                "final_val_mse": round(val_losses[-1], 6),
                "val_mae_percentage_points": round(mae_pct_points, 2),
            },
        },
    }
    torch.save(checkpoint, output_path)
    print(f"[GNN Train] Model saved to {output_path}")
    return checkpoint


def main():
    parser = argparse.ArgumentParser(description="Train the Port Ripple GCN via simulation distillation")
    parser.add_argument("--samples", type=int, default=2500, help="Number of synthetic training scenarios")
    parser.add_argument("--epochs", type=int, default=300, help="Training epochs")
    parser.add_argument("--hidden-dim", type=int, default=16, help="GCN hidden layer dimension")
    parser.add_argument("--lr", type=float, default=0.01, help="Learning rate")
    args = parser.parse_args()

    train(num_samples=args.samples, epochs=args.epochs, hidden_dim=args.hidden_dim, lr=args.lr)

    print("\n" + "=" * 70)
    print("GNN TRAINING COMPLETE (6-feature model: +betweenness, +berth capacity)")
    print("=" * 70)
    print("Model saved to: app/ml/models/gnn_ripple_model.pt")
    print("Loss curve saved to: gnn_training_loss_curve.png")
    print("Ready for inference via app.services.gnn_ripple_predictor")


if __name__ == "__main__":
    main()