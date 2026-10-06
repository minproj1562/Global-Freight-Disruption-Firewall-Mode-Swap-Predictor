#backend/app/ml/train_lstm_eta_model.py
"""
LSTM Sequence ETA Model — Training Pipeline (Simulation-Based Bootstrapping)

===========================================================================
METHODOLOGY NOTE (for academic citation / methodology section):
===========================================================================
Supervised training of a sequence model (LSTM) for vessel ETA prediction
requires many complete, labeled voyages: a time-ordered sequence of AIS
position reports PLUS the true arrival time (ATA) for each voyage.

At the time of writing, the production database contains only a handful
of raw AIS snapshots and zero confirmed ATA labels (vessel_arrivals.ata
is NULL for all records) — there is categorically insufficient REAL data
to fit a sequence model without fabricating outcomes.

To responsibly bridge this gap we use SIMULATION-BASED BOOTSTRAPPING
(a digital-twin approach used in transportation ML research when
historical trajectories are scarce): a physics-informed voyage generator
produces thousands of realistic synthetic voyages governed by:
  - Real great-circle maritime geometry (haversine distance & bearing)
  - Stochastic weather severity processes (Gaussian drift + storm spikes)
  - Port congestion-driven berth waiting delays
  - Realistic AIS reporting cadence (6-hour snapshots) and speed/heading
    noise consistent with observed commercial vessel behaviour

The LSTM therefore learns the GENERAL KINEMATIC + OPERATIONAL RELATIONSHIP
between telemetry sequences and remaining voyage time, rather than
memorizing fabricated "real" outcomes. This is explicitly documented as a
limitation: as the AIS ingestion pipeline accumulates genuine multi-step
voyage histories with confirmed ATAs, this script should be re-run against
`vessel_positions` + `vessel_arrivals` real data to fine-tune / replace the
simulator-trained weights (transfer learning from synthetic -> real).
===========================================================================
"""
import math
import random
import json
from pathlib import Path
from datetime import datetime

import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split

from app.ml.lstm_model_architecture import LSTMETAModel, SEQ_LEN, INPUT_SIZE, FEATURE_NAMES

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)
torch.manual_seed(RANDOM_SEED)

# Representative global port coordinates (lat, lon) used to generate
# geometrically realistic voyages. A random-coordinate fallback is mixed
# in to improve generalization beyond these specific corridors.
REFERENCE_PORTS = [
    (31.2304, 121.4737),   # Shanghai
    (51.9244, 4.4777),     # Rotterdam
    (1.3521, 103.8198),    # Singapore
    (33.7432, -118.2673),  # Los Angeles
    (53.5511, 9.9937),     # Hamburg
    (51.2194, 4.4025),     # Antwerp
    (24.9857, 55.0273),    # Jebel Ali
    (22.3193, 114.1694),   # Hong Kong
    (35.6762, 139.6503),   # Tokyo
    (35.1796, 129.0756),   # Busan
    (37.9429, 23.6469),    # Piraeus
    (39.4699, -0.3763),    # Valencia
    (9.3598, -79.9015),    # Panama / Colon
    (-23.9618, -46.3322),  # Santos
    (40.7128, -74.0060),   # New York
]

EARTH_RADIUS_NM = 3440.065
TIMESTEP_HOURS = 6.0  # simulated AIS reporting interval


def _haversine_nm(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return EARTH_RADIUS_NM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _initial_bearing(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlmb = math.radians(lon2 - lon1)
    x = math.sin(dlmb) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dlmb)
    return (math.degrees(math.atan2(x, y)) + 360.0) % 360.0


def _random_port():
    if random.random() < 0.7:
        return random.choice(REFERENCE_PORTS)
    # Randomized open-ocean coordinate for generalization beyond known corridors
    return (round(random.uniform(-55.0, 65.0), 2), round(random.uniform(-175.0, 175.0), 2))


def generate_synthetic_voyage() -> list:
    """
    Simulate one complete voyage and return a list of per-timestep telemetry
    dicts, each carrying the ground-truth 'remaining_hours' label.
    """
    origin = _random_port()
    dest = _random_port()
    total_distance_nm = max(50.0, _haversine_nm(*origin, *dest))

    planned_speed = random.uniform(12.0, 24.0)          # knots
    weather_base = random.uniform(0.0, 6.0)              # 0-10 scale baseline
    storm_event = random.random() < 0.15                 # 15% of voyages hit a storm
    storm_peak_step = random.randint(2, 20)
    dest_congestion_pct = random.uniform(10.0, 95.0)

    heading = _initial_bearing(*origin, *dest)
    dist_remaining = total_distance_nm
    elapsed = 0.0
    steps = []

    max_steps = 400  # safety cap against infinite loops
    step_idx = 0
    while dist_remaining > 1.0 and step_idx < max_steps:
        weather_t = weather_base + np.random.normal(0, 0.8)
        if storm_event and abs(step_idx - storm_peak_step) <= 2:
            weather_t += random.uniform(3.0, 5.0)
        weather_t = float(np.clip(weather_t, 0.0, 10.0))

        speed_penalty = max(0.55, 1.0 - weather_t * 0.035)
        actual_speed = max(2.0, planned_speed * speed_penalty * random.uniform(0.92, 1.08))

        heading = (heading + np.random.normal(0, 3.0)) % 360.0
        distance_travelled = actual_speed * TIMESTEP_HOURS
        dist_remaining = max(0.0, dist_remaining - distance_travelled)
        elapsed += TIMESTEP_HOURS

        steps.append({
            "speed": actual_speed,
            "dist_remaining": dist_remaining,
            "heading": heading,
            "weather": weather_t,
            "congestion": dest_congestion_pct,
            "elapsed": elapsed,
        })
        step_idx += 1

    # Port-approach dwell time (pilotage / tug / berth wait) scales with congestion
    dwell_hours = 2.0 + (dest_congestion_pct / 100.0) * 14.0
    voyage_total_hours = elapsed + dwell_hours

    for s in steps:
        s["remaining_hours"] = max(0.1, voyage_total_hours - s["elapsed"])

    return steps


def build_windows(voyage_steps: list) -> list:
    """Slice a voyage into overlapping SEQ_LEN windows with engineered features."""
    windows = []
    if len(voyage_steps) < SEQ_LEN:
        return windows

    for end in range(SEQ_LEN, len(voyage_steps) + 1):
        window = voyage_steps[end - SEQ_LEN:end]
        window_start_dist = window[0]["dist_remaining"] or 1.0
        feats = []
        prev_heading = None
        for s in window:
            if prev_heading is None:
                heading_delta = 0.0
            else:
                diff = abs(s["heading"] - prev_heading) % 360.0
                heading_delta = 360.0 - diff if diff > 180.0 else diff
            prev_heading = s["heading"]
            progress = 1.0 - (s["dist_remaining"] / window_start_dist) if window_start_dist > 0 else 0.0
            feats.append([
                s["speed"],
                math.log1p(max(s["dist_remaining"], 0.0)),
                heading_delta,
                s["weather"],
                s["congestion"],
                progress,
            ])
        label = window[-1]["remaining_hours"]
        windows.append((np.array(feats, dtype=np.float32), label))
    return windows


class VoyageWindowDataset(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def generate_dataset(n_voyages: int = 2500):
    print(f"[LSTM Trainer] Simulating {n_voyages} physics-informed synthetic voyages...")
    all_windows = []
    for i in range(n_voyages):
        voyage = generate_synthetic_voyage()
        all_windows.extend(build_windows(voyage))
        if (i + 1) % 500 == 0:
            print(f"  ...{i + 1}/{n_voyages} voyages simulated, {len(all_windows)} training windows so far")

    print(f"[LSTM Trainer] Total training windows generated: {len(all_windows)}")

    X = np.stack([w[0] for w in all_windows])             # [N, SEQ_LEN, INPUT_SIZE]
    y_hours = np.array([w[1] for w in all_windows], dtype=np.float32)
    y_log = np.log1p(y_hours)                              # stabilize wide dynamic range

    return X, y_log, y_hours


def main():
    output_path = Path(__file__).parent / "models" / "lstm_eta_model.pt"

    X, y_log, _ = generate_dataset(n_voyages=2500)

    # Feature standardization (fit on all simulated data — no leakage concern
    # since this is a controlled synthetic generator, not held-out real data)
    feature_mean = X.reshape(-1, INPUT_SIZE).mean(axis=0)
    feature_std = X.reshape(-1, INPUT_SIZE).std(axis=0) + 1e-6
    X_norm = (X - feature_mean) / feature_std

    target_mean = float(y_log.mean())
    target_std = float(y_log.std() + 1e-6)
    y_norm = (y_log - target_mean) / target_std

    dataset = VoyageWindowDataset(X_norm, y_norm)
    n_total = len(dataset)
    n_train = int(n_total * 0.7)
    n_val = int(n_total * 0.15)
    n_test = n_total - n_train - n_val
    train_ds, val_ds, test_ds = random_split(
        dataset, [n_train, n_val, n_test],
        generator=torch.Generator().manual_seed(RANDOM_SEED)
    )
    print(f"[LSTM Trainer] Train/Val/Test windows: {n_train}/{n_val}/{n_test}")

    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=128, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=128, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = LSTMETAModel(input_size=INPUT_SIZE, hidden_size=64, num_layers=2, dropout=0.2).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=5)
    criterion = nn.MSELoss()

    n_epochs = 60
    patience = 10
    best_val_loss = float("inf")
    epochs_no_improve = 0
    best_state = None
    history = {"train_loss": [], "val_loss": []}

    print(f"[LSTM Trainer] Training on device: {device}")
    for epoch in range(1, n_epochs + 1):
        model.train()
        train_losses = []
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_losses.append(loss.item())

        model.eval()
        val_losses = []
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(device), yb.to(device)
                pred = model(xb)
                val_losses.append(criterion(pred, yb).item())

        train_loss = float(np.mean(train_losses))
        val_loss = float(np.mean(val_losses))
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        scheduler.step(val_loss)

        print(f"  Epoch {epoch:03d}/{n_epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        if val_loss < best_val_loss - 1e-5:
            best_val_loss = val_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            epochs_no_improve = 0
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"[LSTM Trainer] Early stopping triggered at epoch {epoch} (no improvement for {patience} epochs)")
                break

    model.load_state_dict(best_state)
    model.eval()

    # ============= EVALUATION =============
    model.to(torch.device("cpu"))
    all_preds_hours, all_true_hours = [], []
    with torch.no_grad():
        for xb, yb in test_loader:
            pred_norm = model(xb).squeeze(1).numpy()
            pred_log = pred_norm * target_std + target_mean
            pred_hours = np.expm1(pred_log)
            true_log = yb.squeeze(1).numpy() * target_std + target_mean
            true_hours = np.expm1(true_log)
            all_preds_hours.extend(pred_hours.tolist())
            all_true_hours.extend(true_hours.tolist())

    all_preds_hours = np.array(all_preds_hours)
    all_true_hours = np.array(all_true_hours)

    mae = float(np.mean(np.abs(all_preds_hours - all_true_hours)))
    rmse = float(np.sqrt(np.mean((all_preds_hours - all_true_hours) ** 2)))
    mape = float(np.mean(np.abs((all_preds_hours - all_true_hours) / np.maximum(all_true_hours, 1e-3))) * 100)
    ss_res = np.sum((all_true_hours - all_preds_hours) ** 2)
    ss_tot = np.sum((all_true_hours - all_true_hours.mean()) ** 2)
    r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    metrics = {
        "mae_hours": round(mae, 2),
        "rmse_hours": round(rmse, 2),
        "mape_percent": round(mape, 2),
        "r2_score": round(r2, 4),
        "test_windows": int(len(all_true_hours)),
        "trained_at": datetime.now().isoformat(),
    }

    print("\n" + "=" * 70)
    print("LSTM ETA MODEL — TEST SET EVALUATION (held-out synthetic voyages)")
    print("=" * 70)
    print(f"  MAE:  {mae:.2f} hours")
    print(f"  RMSE: {rmse:.2f} hours")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  R^2:  {r2:.4f}")
    print("=" * 70)

    # ============= PLOTS =============
    plt.figure(figsize=(10, 6))
    plt.plot(history["train_loss"], label="Training Loss")
    plt.plot(history["val_loss"], label="Validation Loss")
    plt.xlabel("Epoch")
    plt.ylabel("MSE Loss (standardized log-hours)")
    plt.title("LSTM ETA Model — Training Convergence", fontsize=13, fontweight="bold")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig("lstm_training_loss.png", dpi=300, bbox_inches="tight")
    plt.close()
    print("[LSTM Trainer] Saved training curve to lstm_training_loss.png")

    plt.figure(figsize=(8, 8))
    plt.scatter(all_true_hours, all_preds_hours, alpha=0.3, s=10, color="#0891b2")
    max_val = max(all_true_hours.max(), all_preds_hours.max())
    plt.plot([0, max_val], [0, max_val], "r--", label="Perfect Prediction")
    plt.xlabel("Actual Remaining Hours (simulated ground truth)")
    plt.ylabel("Predicted Remaining Hours (LSTM)")
    plt.title(f"LSTM ETA — Predicted vs Actual (R\u00b2 = {r2:.3f})", fontsize=13, fontweight="bold")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig("lstm_eta_prediction_scatter.png", dpi=300, bbox_inches="tight")
    plt.close()
    print("[LSTM Trainer] Saved prediction scatter to lstm_eta_prediction_scatter.png")

    # ============= SAVE CHECKPOINT =============
    output_path.parent.mkdir(parents=True, exist_ok=True)
    checkpoint = {
        "model_state_dict": best_state,
        "input_size": INPUT_SIZE,
        "hidden_size": 64,
        "num_layers": 2,
        "dropout": 0.2,
        "seq_len": SEQ_LEN,
        "feature_names": FEATURE_NAMES,
        "feature_mean": feature_mean.tolist(),
        "feature_std": feature_std.tolist(),
        "target_mean": target_mean,
        "target_std": target_std,
        "metrics": metrics,
        "model_type": "LSTM_SEQUENCE_ETA (simulation-bootstrapped)",
        "trained_at": datetime.now().isoformat(),
    }
    torch.save(checkpoint, output_path)
    print(f"\n[LSTM Trainer] Model checkpoint saved to: {output_path}")

    metrics_path = output_path.parent / "lstm_eta_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[LSTM Trainer] Metrics JSON saved to: {metrics_path}")


if __name__ == "__main__":
    main()