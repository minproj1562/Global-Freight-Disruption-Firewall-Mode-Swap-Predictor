# backend/app/ml/gradient_boosting_delay.py
"""
Gradient Boosting Delay Probability Model.
Predicts shipment and route delay probability using HistGradientBoostingClassifier
trained on the real supply_chain_disruption_prepared.csv dataset (5,000 real records).

Training policy:
  - Train/test split (80/20) performed FIRST on raw data to prevent leakage.
  - Imputation and scaling are fitted strictly on X_train only.
  - Genuine evaluation metrics (Accuracy, ROC-AUC, F1, Precision, Recall) saved in artifact.
  - np.random fallback is REMOVED. If CSV is absent, model is NOT instantiated.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, roc_auc_score,
    precision_score, recall_score, f1_score
)
import joblib
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

FEATURE_COLS = [
    'Distance_km',
    'Weight_MT',
    'Fuel_Price_Index',
    'Geopolitical_Risk_Score',
    'Carrier_Reliability_Score',
    'Lead_Time_Days'
]
TARGET_COL = 'Disruption_Occurred'


class GradientBoostingDelayPredictor:
    """
    Gradient Boosting Delay Probability Classifier.
    Trained on 5,000 real supply chain shipment records.
    No synthetic data, no np.random fallback.
    """
    def __init__(self, model_path: str = "app/ml/models/gb_delay_model.pkl"):
        self.model_path = Path(model_path)
        self.pipeline: Optional[Pipeline] = None
        self.is_trained: bool = False
        self.training_data_source: str = "NOT_TRAINED"
        self.evaluation_metrics: Dict[str, Any] = {}
        self._initialize_or_train()

    def _initialize_or_train(self):
        """Load existing artifact, or train from real CSV data."""
        if self.model_path.exists():
            try:
                artifacts = joblib.load(self.model_path)
                self.pipeline = artifacts["pipeline"]
                self.evaluation_metrics = artifacts.get("evaluation_metrics", {})
                self.training_data_source = artifacts.get("training_data_source", "unknown")
                self.is_trained = True
                logger.info(
                    "[GB Delay] Loaded artifact from %s | Accuracy=%.4f ROC-AUC=%.4f",
                    self.model_path,
                    self.evaluation_metrics.get("accuracy", 0.0),
                    self.evaluation_metrics.get("roc_auc", 0.0)
                )
                return
            except Exception as exc:
                logger.warning("[GB Delay] Failed to load artifact: %s — retraining.", exc)

        self._train_model()

    def _train_model(self):
        """Train leak-free HistGradientBoosting pipeline on real CSV."""
        dataset_path = Path("data/processed/supply_chain_disruption_prepared.csv")
        if not dataset_path.exists():
            dataset_path = Path("data/raw/global_supply_chain_risk_2026.csv")

        if not dataset_path.exists():
            logger.error(
                "[GB Delay] REAL DATA INSUFFICIENT — no supply chain CSV found at "
                "data/processed/supply_chain_disruption_prepared.csv or "
                "data/raw/global_supply_chain_risk_2026.csv. "
                "Model will NOT be instantiated. Predictions will be unavailable."
            )
            self.is_trained = False
            self.training_data_source = "REAL_DATA_INSUFFICIENT"
            return

        try:
            df = pd.read_csv(dataset_path)

            # Verify required columns exist
            available = set(df.columns)
            missing_feats = [c for c in FEATURE_COLS if c not in available]
            if missing_feats:
                # Gracefully drop missing optional columns
                used_feats = [c for c in FEATURE_COLS if c in available]
                if not used_feats or TARGET_COL not in available:
                    raise ValueError(f"Required columns missing: {missing_feats}")
            else:
                used_feats = FEATURE_COLS

            X = df[used_feats].copy()
            y = df[TARGET_COL].fillna(0).astype(int)

            n_records = len(X)
            n_positive = int(y.sum())
            n_negative = n_records - n_positive

            # --- TRAIN/TEST SPLIT FIRST (stratified) ---
            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size=0.20,
                random_state=42,
                stratify=y
            )

            # --- PIPELINE: impute → scale → model (all fitted on X_train only) ---
            pipeline = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", RobustScaler()),
                ("classifier", HistGradientBoostingClassifier(
                    max_iter=200,
                    learning_rate=0.08,
                    max_depth=6,
                    min_samples_leaf=20,
                    random_state=42
                ))
            ])
            pipeline.fit(X_train, y_train)

            # --- GENUINE EVALUATION on held-out test set ---
            y_pred = pipeline.predict(X_test)
            y_proba = pipeline.predict_proba(X_test)[:, 1]

            metrics = {
                "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
                "roc_auc": round(float(roc_auc_score(y_test, y_proba)), 4),
                "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
                "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            }
            train_stats = {
                "n_total_records": n_records,
                "n_train": len(X_train),
                "n_test": len(X_test),
                "n_positive_class": n_positive,
                "n_negative_class": n_negative,
                "class_balance_ratio": round(n_positive / n_records, 3),
                "features_used": used_feats
            }

            logger.info(
                "[GB Delay] Trained on %d records | Accuracy=%.4f ROC-AUC=%.4f F1=%.4f",
                n_records,
                metrics["accuracy"],
                metrics["roc_auc"],
                metrics["f1_score"]
            )

            self.pipeline = pipeline
            self.is_trained = True
            self.evaluation_metrics = metrics
            self.training_data_source = str(dataset_path)

            # Save artifact
            self.model_path.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump({
                "pipeline": pipeline,
                "evaluation_metrics": metrics,
                "train_stats": train_stats,
                "training_data_source": str(dataset_path),
                "trained_at": datetime.now().isoformat(),
                "model_type": "HistGradientBoostingClassifier",
                "feature_cols": used_feats,
                "target_col": TARGET_COL,
                "leakage_prevention": "train_test_split_first_stratified_80_20"
            }, self.model_path)

        except Exception as exc:
            logger.error("[GB Delay] Training failed: %s", exc)
            self.is_trained = False
            self.training_data_source = f"TRAINING_FAILED: {exc}"

    def predict_delay_probability(
        self,
        distance_km: float,
        weight_mt: float = 20000.0,
        fuel_price_index: float = 1.0,
        geopolitical_risk: float = 5.0,
        carrier_reliability: float = 85.0,
        lead_time_days: float = 30.0
    ) -> Dict[str, Any]:
        """
        Predict probability of route or voyage encountering a delay.
        Returns honest status if model is not trained.
        """
        if not self.is_trained or self.pipeline is None:
            return {
                "delay_probability": None,
                "delay_probability_pct": None,
                "expected_delay_days": None,
                "risk_tier": None,
                "model_type": "HistGradientBoostingClassifier",
                "is_trained": False,
                "status": "MODEL_UNAVAILABLE",
                "reason": self.training_data_source
            }

        features = pd.DataFrame([{
            "Distance_km": distance_km or 5000.0,
            "Weight_MT": weight_mt or 20000.0,
            "Fuel_Price_Index": fuel_price_index or 1.0,
            "Geopolitical_Risk_Score": geopolitical_risk or 5.0,
            "Carrier_Reliability_Score": carrier_reliability or 85.0,
            "Lead_Time_Days": lead_time_days or 30.0
        }])

        # Only keep columns that the pipeline was trained on
        trained_feats = self.pipeline.named_steps["imputer"].feature_names_in_ \
            if hasattr(self.pipeline.named_steps["imputer"], "feature_names_in_") \
            else FEATURE_COLS
        features = features.reindex(columns=trained_feats, fill_value=0.0)

        prob = float(self.pipeline.predict_proba(features)[0, 1])
        expected_delay_days = round(prob * (distance_km / 1000.0) * 0.8, 1)

        return {
            "delay_probability": round(prob, 4),
            "delay_probability_pct": f"{round(prob * 100, 1)}%",
            "expected_delay_days": expected_delay_days,
            "risk_tier": "High" if prob >= 0.65 else ("Medium" if prob >= 0.35 else "Low"),
            "model_type": "HistGradientBoostingClassifier",
            "is_trained": True,
            "training_data_source": self.training_data_source,
            "evaluation_metrics": self.evaluation_metrics,
            "status": "OK"
        }

    def get_model_info(self) -> Dict[str, Any]:
        """Return genuine model metadata and evaluation metrics."""
        return {
            "model_type": "HistGradientBoostingClassifier (Gradient Boosting Delay Predictor)",
            "is_trained": self.is_trained,
            "training_data_source": self.training_data_source,
            "evaluation_metrics": self.evaluation_metrics,
            "features": FEATURE_COLS,
            "leakage_prevention": "80/20 stratified split; imputer+scaler fitted on X_train only"
        }


gb_delay_predictor = GradientBoostingDelayPredictor()
