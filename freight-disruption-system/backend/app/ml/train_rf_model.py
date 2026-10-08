# backend/app/ml/train_rf_model.py
"""
Random Forest Risk Model Training Pipeline — Monte Carlo Risk Feeder

Trains on the REAL dataset: data/raw/global_supply_chain_risk_2026.csv
(5,000 real shipment records, genuine Disruption_Occurred outcomes).

DESIGN NOTE — why this script looks different from a generic ML pipeline:
This model's feature set is deliberately built to be IDENTICAL, feature-for-
feature, to what app/ml/rf_predictor.py builds at inference time
(_build_feature_dict). If training features and inference features drift
even slightly, the model silently degrades (tree thresholds trained on one
feature's distribution get applied to a differently-scaled value at
inference). So every engineered column here has a 1:1 counterpart in
rf_predictor.py — keep them in sync if you ever change one.

SCALING NOTE: Random Forest splits on raw feature thresholds, so a
monotonic per-feature scaler (as the old pipeline used) adds no value and,
worse, the previous inference code never actually applied it — meaning
predictions were already running on an unscaled model. This version
intentionally skips scaling altogether and documents why, instead of
silently mismatching train/inference like before.

UNIT NOTE: Carrier_Reliability_Score in the raw CSV is a 0-1 fraction
(e.g. 0.865). The rest of the app (rf_predictor.py defaults, Monte Carlo
explanations) works in 0-100 percentage terms. We convert once, here, at
load time, so the trained model and the production caller agree on units.
"""

import argparse
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split

warnings.filterwarnings("ignore")

# Maps the only weather signal present in the real dataset (a text category)
# onto the same 0-10 severity scale rf_predictor.py expects as weather_severity.
# Hurricane is rated above Storm per NOAA/IMO severity convention.
WEATHER_SEVERITY_MAP = {
    "Clear": 0.0,
    "Fog": 4.0,
    "Rain": 5.0,
    "Storm": 8.0,
    "Hurricane": 10.0,
}

# This exact order is also what rf_predictor.py._build_feature_dict() must
# produce. Changing this list requires changing that function too.
FEATURE_ORDER = [
    "Distance_km",
    "Geopolitical_Risk_Score",
    "Weather_Severity_Index",
    "Carrier_Reliability_Score",
    "Weight_MT",
    "Fuel_Price_Index",
    "Distance_Log",
    "Distance_Sqrt",
    "Risk_Distance_Interaction",
    "Weather_Distance_Interaction",
    "Risk_Squared",
    "Weight_Log",
    "Fuel_Distance_Product",
    "Combined_Risk_Score",
    "Route_Complexity",
    "Is_High_Risk",
    "Is_Long_Distance",
]

TARGET_COL = "Disruption_Occurred"


def load_and_engineer(dataset_path: str) -> pd.DataFrame:
    print(f"[RF Train] Loading real dataset: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"[RF Train] Raw shape: {df.shape}")

    required = [
        "Distance_km", "Weight_MT", "Fuel_Price_Index",
        "Geopolitical_Risk_Score", "Weather_Condition",
        "Carrier_Reliability_Score", TARGET_COL,
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    # --- Unit fix: CSV stores reliability as a 0-1 fraction, app convention is 0-100 ---
    if df["Carrier_Reliability_Score"].max() <= 1.0:
        df["Carrier_Reliability_Score"] = df["Carrier_Reliability_Score"] * 100.0
        print("[RF Train] Converted Carrier_Reliability_Score from 0-1 fraction to 0-100 scale")

    # --- Weather text -> numeric severity (only real weather signal available) ---
    df["Weather_Severity_Index"] = df["Weather_Condition"].map(WEATHER_SEVERITY_MAP)
    unmapped = df["Weather_Severity_Index"].isnull().sum()
    if unmapped:
        print(f"[RF Train] WARNING: {unmapped} rows had an unmapped Weather_Condition, filling with 5.0 (medium)")
        df["Weather_Severity_Index"] = df["Weather_Severity_Index"].fillna(5.0)

    # --- Engineered features (must mirror rf_predictor.py exactly) ---
    df["Distance_Log"] = np.log1p(df["Distance_km"])
    df["Distance_Sqrt"] = np.sqrt(df["Distance_km"])
    df["Risk_Distance_Interaction"] = df["Geopolitical_Risk_Score"] * np.log1p(df["Distance_km"])
    df["Weather_Distance_Interaction"] = df["Weather_Severity_Index"] * np.log1p(df["Distance_km"])
    df["Risk_Squared"] = df["Geopolitical_Risk_Score"] ** 2
    df["Weight_Log"] = np.log1p(df["Weight_MT"])
    df["Fuel_Distance_Product"] = df["Fuel_Price_Index"] * df["Distance_km"]
    df["Combined_Risk_Score"] = (
        df["Geopolitical_Risk_Score"]
        + df["Weather_Severity_Index"]
        + (100 - df["Carrier_Reliability_Score"]) / 10
    ) / 3
    df["Route_Complexity"] = (df["Distance_km"] / 10000) * 0.5 + (df["Geopolitical_Risk_Score"] / 10) * 0.5
    df["Is_High_Risk"] = (df["Geopolitical_Risk_Score"] >= 7).astype(int)
    df["Is_Long_Distance"] = (df["Distance_km"] > 7000).astype(int)

    print(f"[RF Train] Final engineered shape: {df.shape}")
    print(f"[RF Train] Target distribution:\n{df[TARGET_COL].value_counts(normalize=True).round(3)}")
    return df


def train(dataset_path: str, output_path: str, tune_hyperparameters: bool = True):
    df = load_and_engineer(dataset_path)

    X = df[FEATURE_ORDER].copy()
    y = df[TARGET_COL].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"[RF Train] Train: {X_train.shape}, Test: {X_test.shape}")

    if tune_hyperparameters:
        print("[RF Train] Running hyperparameter search (small grid, ~5k rows)...")
        param_grid = {
            "n_estimators": [300, 500],
            "max_depth": [10, 15, None],
            "min_samples_leaf": [1, 3],
            "max_features": ["sqrt"],
        }
        base = RandomForestClassifier(
            class_weight="balanced_subsample", random_state=42, n_jobs=-1
        )
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        search = GridSearchCV(base, param_grid, cv=cv, scoring="roc_auc", n_jobs=-1, verbose=1)
        search.fit(X_train, y_train)
        model = search.best_estimator_
        print(f"[RF Train] Best params: {search.best_params_}")
        print(f"[RF Train] Best CV ROC-AUC: {search.best_score_:.4f}")
    else:
        model = RandomForestClassifier(
            n_estimators=400,
            max_depth=15,
            min_samples_leaf=2,
            max_features="sqrt",
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)

    feature_importances = pd.DataFrame({
        "feature": FEATURE_ORDER,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    print("\n[RF Train] Feature importances:")
    print(feature_importances.to_string(index=False))

    metrics = evaluate(model, X_test, y_test)

    artifact = {
        "model": model,
        "feature_names": FEATURE_ORDER,
        "feature_importances": feature_importances,
        "metrics": metrics,
        "accuracy": metrics["accuracy_pct"],
        "roc_auc": str(metrics["roc_auc"]),
        "precision": str(metrics["precision"]),
        "recall": str(metrics["recall"]),
        "f1_score": str(metrics["f1_score"]),
        "trained_at": datetime.now().isoformat(),
        "model_type": "RandomForestClassifier (trained on real shipment data, no scaling — see module docstring)",
        "training_data_source": dataset_path,
        "weather_severity_map": WEATHER_SEVERITY_MAP,
    }

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, out)
    print(f"\n[RF Train] Model saved to {out}")


def evaluate(model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    accuracy = (tp + tn) / (tp + tn + fp + fn)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    roc_auc = roc_auc_score(y_test, y_proba)
    avg_precision = average_precision_score(y_test, y_proba)

    print("\n" + "=" * 70)
    print("RF RISK MODEL — TEST SET EVALUATION (real held-out shipments)")
    print("=" * 70)
    print(classification_report(y_test, y_pred, target_names=["No Disruption", "Disruption"], digits=4))
    print(f"Accuracy:    {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"Precision:   {precision:.4f}")
    print(f"Recall:      {recall:.4f}")
    print(f"Specificity: {specificity:.4f}")
    print(f"F1-Score:    {f1:.4f}")
    print(f"ROC-AUC:     {roc_auc:.4f}")
    print(f"Avg. Precision: {avg_precision:.4f}")
    print("=" * 70)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "accuracy_pct": f"{round(accuracy * 100, 2)}%",
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "specificity": round(float(specificity), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "average_precision": round(float(avg_precision), 4),
        "confusion_matrix": cm.tolist(),
    }

    # Plots — same filenames your docs/report already reference
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, label=f"ROC (AUC={roc_auc:.4f})", color="darkorange")
    plt.plot([0, 1], [0, 1], "--", color="navy")
    plt.xlabel("False Positive Rate"); plt.ylabel("True Positive Rate")
    plt.title("RF Risk Model — ROC Curve"); plt.legend(); plt.grid(alpha=0.3)
    plt.tight_layout(); plt.savefig("rf_roc_curve.png", dpi=300); plt.close()

    prec, rec, _ = precision_recall_curve(y_test, y_proba)
    plt.figure(figsize=(8, 6))
    plt.plot(rec, prec, label=f"PR (AP={avg_precision:.4f})", color="blue")
    plt.xlabel("Recall"); plt.ylabel("Precision")
    plt.title("RF Risk Model — Precision-Recall Curve"); plt.legend(); plt.grid(alpha=0.3)
    plt.tight_layout(); plt.savefig("rf_precision_recall_curve.png", dpi=300); plt.close()

    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["No Disruption", "Disruption"],
                yticklabels=["No Disruption", "Disruption"])
    plt.title("RF Risk Model — Confusion Matrix")
    plt.ylabel("True"); plt.xlabel("Predicted")
    plt.tight_layout(); plt.savefig("rf_confusion_matrix.png", dpi=300); plt.close()

    fi = pd.DataFrame({"feature": FEATURE_ORDER, "importance": model.feature_importances_})
    fi = fi.sort_values("importance", ascending=False)
    plt.figure(figsize=(10, 7))
    sns.barplot(x="importance", y="feature", data=fi, palette="viridis")
    plt.title("RF Risk Model — Feature Importance")
    plt.tight_layout(); plt.savefig("rf_feature_importance.png", dpi=300); plt.close()

    print("[RF Train] Saved rf_roc_curve.png, rf_precision_recall_curve.png, "
          "rf_confusion_matrix.png, rf_feature_importance.png")

    return metrics


def main():
    parser = argparse.ArgumentParser(description="Train RF risk model on real shipment data")
    parser.add_argument("--dataset", type=str, default="data/raw/global_supply_chain_risk_2026.csv")
    parser.add_argument("--output", type=str, default="app/ml/models/rf_risk_model.pkl")
    parser.add_argument("--no-tuning", action="store_true", help="Skip GridSearchCV, use fixed params")
    args = parser.parse_args()

    train(args.dataset, args.output, tune_hyperparameters=not args.no_tuning)

    print("\n" + "=" * 70)
    print("RF TRAINING COMPLETE")
    print("=" * 70)
    print(f"Model: {args.output}")
    print("Ready for rf_predictor.py -> used by Monte Carlo simulation downstream")


if __name__ == "__main__":
    main()