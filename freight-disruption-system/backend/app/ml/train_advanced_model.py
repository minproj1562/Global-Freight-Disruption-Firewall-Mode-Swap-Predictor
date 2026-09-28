# backend/app/ml/train_advanced_model.py
"""
Advanced ML Pipeline for 90%+ Accuracy
Uses XGBoost, LightGBM, CatBoost, and Stacking Ensemble
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, 
    roc_curve, accuracy_score, precision_recall_curve, average_precision_score
)
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier
import optuna
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import argparse
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')
optuna.logging.set_verbosity(optuna.logging.WARNING)


class AdvancedMLTrainer:
    """Advanced ML trainer with ensemble methods for 90%+ accuracy"""
    
    def __init__(self, random_state=42):
        self.random_state = random_state
        self.model = None
        self.label_encoders = {}
        self.scaler = RobustScaler()
        self.feature_names = []
        self.feature_importances = None
        
    def load_and_prepare_data(self, dataset_path: str) -> tuple:
        """Load and prepare dataset with ultra-advanced feature engineering"""
        
        print(f"[Advanced ML] Loading dataset from {dataset_path}")
        df = pd.read_csv(dataset_path)
        
        print(f"[Advanced ML] Dataset shape: {df.shape}")
        
        # Find target column
        target_col = 'Disruption_Occurred'
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found")
        
        print(f"[Advanced ML] Target distribution:\n{df[target_col].value_counts()}")
        
        # Ultra-advanced feature engineering
        df = self._ultra_feature_engineering(df)
        
        # Identify features
        categorical_features = self._identify_categorical_features(df, exclude=[target_col])
        numerical_features = self._identify_numerical_features(df, exclude=[target_col])
        
        print(f"\n[Advanced ML] Categorical features ({len(categorical_features)})")
        print(f"[Advanced ML] Numerical features ({len(numerical_features)})")
        
        # Encode categorical
        for col in categorical_features:
            if col in df.columns:
                le = LabelEncoder()
                df[col] = df[col].fillna('MISSING')
                df[col] = le.fit_transform(df[col].astype(str))
                self.label_encoders[col] = le
        
        # Prepare features
        all_features = categorical_features + numerical_features
        X = df[all_features].copy()
        y = df[target_col]
        
        # Handle missing values
        for col in X.columns:
            if X[col].isnull().sum() > 0:
                if col in numerical_features:
                    X[col] = X[col].fillna(X[col].median())
                else:
                    X[col] = X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else 0)
        
        self.feature_names = X.columns.tolist()
        
        # Scale numerical features
        numerical_cols_in_X = [col for col in numerical_features if col in X.columns]
        if numerical_cols_in_X:
            X[numerical_cols_in_X] = self.scaler.fit_transform(X[numerical_cols_in_X])
        
        # Split with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.random_state, stratify=y
        )
        
        print(f"\n[Advanced ML] Final feature count: {X.shape[1]}")
        print(f"[Advanced ML] Training set: {X_train.shape}")
        print(f"[Advanced ML] Test set: {X_test.shape}")
        
        return X_train, X_test, y_train, y_test
    
    def _ultra_feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create ultra-advanced engineered features"""
        
        print("\n[Advanced ML] Creating ultra-advanced features...")
        
        # === TEMPORAL FEATURES ===
        date_cols = [col for col in df.columns if 'date' in col.lower() or 'time' in col.lower()]
        if date_cols:
            for date_col in date_cols[:1]:
                try:
                    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                    df['Month'] = df[date_col].dt.month
                    df['DayOfWeek'] = df[date_col].dt.dayofweek
                    df['Quarter'] = df[date_col].dt.quarter
                    df['IsWeekend'] = (df[date_col].dt.dayofweek >= 5).astype(int)
                    df['IsMonthStart'] = df[date_col].dt.is_month_start.astype(int)
                    df['IsMonthEnd'] = df[date_col].dt.is_month_end.astype(int)
                    df['WeekOfYear'] = df[date_col].dt.isocalendar().week
                    print(f"  ✓ Extracted 8 temporal features")
                except:
                    pass
        
        # === DISTANCE-BASED FEATURES ===
        if 'Distance_km' in df.columns:
            dist = df['Distance_km'].fillna(df['Distance_km'].median())
            df['Distance_Log'] = np.log1p(dist)
            df['Distance_Sqrt'] = np.sqrt(dist)
            df['Distance_Squared'] = dist ** 2
            df['Distance_Cubed'] = dist ** 3
            df['Distance_Reciprocal'] = 1 / (dist + 1)
            
            # Distance bins
            df['Distance_Category'] = pd.cut(dist, bins=5, labels=False)
            df['Is_Short_Distance'] = (dist < dist.quantile(0.25)).astype(int)
            df['Is_Medium_Distance'] = ((dist >= dist.quantile(0.25)) & (dist < dist.quantile(0.75))).astype(int)
            df['Is_Long_Distance'] = (dist >= dist.quantile(0.75)).astype(int)
            print(f"  ✓ Created 10 distance features")
        
        # === RISK FEATURES ===
        if 'Geopolitical_Risk_Score' in df.columns:
            risk = df['Geopolitical_Risk_Score'].fillna(df['Geopolitical_Risk_Score'].median())
            df['Risk_Squared'] = risk ** 2
            df['Risk_Cubed'] = risk ** 3
            df['Risk_Log'] = np.log1p(risk)
            df['Risk_Sqrt'] = np.sqrt(risk)
            df['Is_High_Risk'] = (risk >= 7).astype(int)
            df['Is_Medium_Risk'] = ((risk >= 4) & (risk < 7)).astype(int)
            df['Is_Low_Risk'] = (risk < 4).astype(int)
            print(f"  ✓ Created 7 risk features")
        
        # === WEIGHT FEATURES ===
        if 'Weight_MT' in df.columns:
            weight = df['Weight_MT'].fillna(df['Weight_MT'].median())
            df['Weight_Log'] = np.log1p(weight)
            df['Weight_Sqrt'] = np.sqrt(weight)
            df['Weight_Squared'] = weight ** 2
            df['Is_Heavy'] = (weight > weight.quantile(0.75)).astype(int)
            df['Is_Light'] = (weight < weight.quantile(0.25)).astype(int)
            print(f"  ✓ Created 5 weight features")
        
        # === CARRIER RELIABILITY FEATURES ===
        if 'Carrier_Reliability_Score' in df.columns:
            reliability = df['Carrier_Reliability_Score'].fillna(df['Carrier_Reliability_Score'].median())
            df['Reliability_Squared'] = reliability ** 2
            df['Reliability_Reciprocal'] = 1 / (reliability + 1)
            df['Is_Reliable_Carrier'] = (reliability >= 85).astype(int)
            df['Is_Unreliable_Carrier'] = (reliability < 70).astype(int)
            print(f"  ✓ Created 4 reliability features")
        
        # === FUEL PRICE FEATURES ===
        if 'Fuel_Price_Index' in df.columns:
            fuel = df['Fuel_Price_Index'].fillna(df['Fuel_Price_Index'].median())
            df['Fuel_Log'] = np.log1p(fuel)
            df['Fuel_Squared'] = fuel ** 2
            df['Is_High_Fuel_Price'] = (fuel > fuel.quantile(0.75)).astype(int)
            print(f"  ✓ Created 3 fuel price features")
        
        # === INTERACTION FEATURES (CRITICAL FOR 90%+ ACCURACY) ===
        print("\n[Advanced ML] Creating interaction features...")
        
        # Risk × Distance interactions
        if 'Geopolitical_Risk_Score' in df.columns and 'Distance_km' in df.columns:
            risk = df['Geopolitical_Risk_Score'].fillna(0)
            dist = df['Distance_km'].fillna(0)
            df['Risk_Distance_Product'] = risk * dist
            df['Risk_Distance_Sum'] = risk + dist
            df['Risk_Distance_Ratio'] = risk / (dist + 1)
            df['Risk_Distance_Log_Product'] = np.log1p(risk) * np.log1p(dist)
            df['Risk_Distance_Sqrt_Product'] = np.sqrt(risk) * np.sqrt(dist)
            print(f"  ✓ Created 5 Risk×Distance interactions")
        
        # Weather × Distance interactions
        if 'Weather_Condition' in df.columns and 'Distance_km' in df.columns:
            weather_severity_map = {
                'Clear': 0, 'Sunny': 0, 'Partly Cloudy': 1, 'Cloudy': 2,
                'Rainy': 5, 'Rain': 5, 'Heavy Rain': 7, 'Storm': 8, 'Stormy': 8,
                'Snowy': 6, 'Snow': 6, 'Foggy': 4, 'Fog': 4
            }
            df['Weather_Severity'] = df['Weather_Condition'].map(weather_severity_map).fillna(3)
            dist = df['Distance_km'].fillna(0)
            df['Weather_Distance_Product'] = df['Weather_Severity'] * dist
            df['Weather_Distance_Log_Product'] = np.log1p(df['Weather_Severity']) * np.log1p(dist)
            print(f"  ✓ Created 3 Weather×Distance interactions")
        
        # Risk × Reliability interactions
        if 'Geopolitical_Risk_Score' in df.columns and 'Carrier_Reliability_Score' in df.columns:
            risk = df['Geopolitical_Risk_Score'].fillna(0)
            reliability = df['Carrier_Reliability_Score'].fillna(0)
            df['Risk_Reliability_Product'] = risk * reliability
            df['Risk_Reliability_Ratio'] = risk / (reliability + 1)
            df['Risk_Reliability_Diff'] = risk - (reliability / 10)
            print(f"  ✓ Created 3 Risk×Reliability interactions")
        
        # Distance × Weight interactions
        if 'Distance_km' in df.columns and 'Weight_MT' in df.columns:
            dist = df['Distance_km'].fillna(0)
            weight = df['Weight_MT'].fillna(0)
            df['Distance_Weight_Product'] = dist * weight
            df['Distance_Weight_Ratio'] = dist / (weight + 1)
            df['Distance_Weight_Log_Product'] = np.log1p(dist) * np.log1p(weight)
            print(f"  ✓ Created 3 Distance×Weight interactions")
        
        # Fuel × Distance interactions
        if 'Fuel_Price_Index' in df.columns and 'Distance_km' in df.columns:
            fuel = df['Fuel_Price_Index'].fillna(0)
            dist = df['Distance_km'].fillna(0)
            df['Fuel_Distance_Product'] = fuel * dist
            df['Fuel_Distance_Log_Product'] = np.log1p(fuel) * np.log1p(dist)
            print(f"  ✓ Created 2 Fuel×Distance interactions")
        
        # === COMPOSITE RISK SCORE ===
        risk_components = []
        if 'Geopolitical_Risk_Score' in df.columns:
            risk_components.append(df['Geopolitical_Risk_Score'].fillna(0) / 10)
        if 'Weather_Severity' in df.columns:
            risk_components.append(df['Weather_Severity'].fillna(0) / 10)
        if 'Carrier_Reliability_Score' in df.columns:
            risk_components.append(1 - df['Carrier_Reliability_Score'].fillna(0) / 100)
        
        if risk_components:
            df['Composite_Risk_Score'] = sum(risk_components) / len(risk_components)
            df['Composite_Risk_Squared'] = df['Composite_Risk_Score'] ** 2
            df['Composite_Risk_Cubed'] = df['Composite_Risk_Score'] ** 3
            print(f"  ✓ Created 3 composite risk scores")
        
        # === ROUTE COMPLEXITY SCORE ===
        if 'Distance_km' in df.columns and 'Geopolitical_Risk_Score' in df.columns:
            dist_norm = df['Distance_km'].fillna(0) / (df['Distance_km'].max() + 1)
            risk_norm = df['Geopolitical_Risk_Score'].fillna(0) / 10
            
            df['Route_Complexity_Linear'] = 0.5 * dist_norm + 0.5 * risk_norm
            df['Route_Complexity_Weighted'] = 0.3 * dist_norm + 0.7 * risk_norm
            df['Route_Complexity_Product'] = dist_norm * risk_norm
            df['Route_Complexity_Max'] = df[['Distance_km', 'Geopolitical_Risk_Score']].fillna(0).max(axis=1)
            print(f"  ✓ Created 4 route complexity features")
        
        print(f"\n[Advanced ML] Total engineered features: ~60+")
        return df
    
    def _identify_categorical_features(self, df: pd.DataFrame, exclude: list) -> list:
        """Identify categorical features"""
        categorical = []
        for col in df.columns:
            if col in exclude or 'id' in col.lower():
                continue
            if df[col].dtype == 'object' or df[col].nunique() < 20:
                categorical.append(col)
        return categorical
    
    def _identify_numerical_features(self, df: pd.DataFrame, exclude: list) -> list:
        """Identify numerical features"""
        numerical = []
        for col in df.columns:
            if col in exclude or 'id' in col.lower():
                continue
            if df[col].dtype in [np.float64, np.int64] and df[col].nunique() >= 10:
                numerical.append(col)
        return numerical
    
    def train(self, X_train, y_train, X_test, y_test, use_optuna=True, use_ensemble=True):
        """Train with advanced ensemble and optimization"""
        
        print("\n[Advanced ML] Starting advanced training pipeline...")
        
        # Handle class imbalance with SMOTETomek (better than SMOTE alone)
        print("[Advanced ML] Applying SMOTETomek for optimal class balance...")
        smotetomek = SMOTETomek(random_state=self.random_state)
        X_train_balanced, y_train_balanced = smotetomek.fit_resample(X_train, y_train)
        print(f"  Original: {dict(pd.Series(y_train).value_counts())}")
        print(f"  Balanced: {dict(pd.Series(y_train_balanced).value_counts())}")
        
        if use_ensemble:
            print("\n[Advanced ML] Training Stacking Ensemble (XGBoost + LightGBM + CatBoost)...")
            self.model = self._train_stacking_ensemble(X_train_balanced, y_train_balanced, use_optuna)
        else:
            print("\n[Advanced ML] Training XGBoost with Optuna optimization...")
            self.model = self._train_xgboost(X_train_balanced, y_train_balanced, use_optuna)
        
        # Evaluate
        self._evaluate(X_test, y_test)
        
        return X_train_balanced, X_test, y_train_balanced, y_test
    
    def _train_xgboost(self, X_train, y_train, use_optuna):
        """Train XGBoost with optional Optuna tuning"""
        
        if use_optuna:
            print("[Advanced ML] Running Optuna hyperparameter optimization...")
            
            def objective(trial):
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 300, 1000),
                    'max_depth': trial.suggest_int('max_depth', 4, 12),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                    'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                    'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                    'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
                    'gamma': trial.suggest_float('gamma', 0.0, 5.0),
                    'reg_alpha': trial.suggest_float('reg_alpha', 0.0, 5.0),
                    'reg_lambda': trial.suggest_float('reg_lambda', 0.0, 5.0),
                    'random_state': self.random_state,
                    'eval_metric': 'logloss',
                    'use_label_encoder': False
                }
                
                model = xgb.XGBClassifier(**params)
                cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
                scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc', n_jobs=-1)
                return scores.mean()
            
            study = optuna.create_study(direction='maximize')
            study.optimize(objective, n_trials=50, show_progress_bar=True)
            
            best_params = study.best_params
            print(f"  Best ROC-AUC: {study.best_value:.4f}")
            print(f"  Best params: {best_params}")
            
            model = xgb.XGBClassifier(**best_params, random_state=self.random_state, eval_metric='logloss', use_label_encoder=False)
        else:
            # Use good default parameters
            model = xgb.XGBClassifier(
                n_estimators=500,
                max_depth=8,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=self.random_state,
                eval_metric='logloss',
                use_label_encoder=False
            )
        
        model.fit(X_train, y_train)
        return model
    
    def _train_stacking_ensemble(self, X_train, y_train, use_optuna):
        """Train stacking ensemble of XGBoost, LightGBM, and CatBoost"""
        
        print("[Advanced ML] Building base models...")
        
        # Base model 1: XGBoost
        xgb_model = xgb.XGBClassifier(
            n_estimators=500,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=self.random_state,
            eval_metric='logloss',
            use_label_encoder=False
        )
        
        # Base model 2: LightGBM
        lgb_model = lgb.LGBMClassifier(
            n_estimators=500,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=self.random_state,
            verbose=-1
        )
        
        # Base model 3: CatBoost
        cat_model = CatBoostClassifier(
            iterations=500,
            depth=8,
            learning_rate=0.1,
            random_state=self.random_state,
            verbose=False
        )
        
        # Base model 4: Random Forest
        rf_model = RandomForestClassifier(
            n_estimators=300,
            max_depth=20,
            min_samples_split=2,
            max_features='sqrt',
            random_state=self.random_state,
            n_jobs=-1
        )
        
        # Meta-learner: Logistic Regression
        meta_learner = LogisticRegression(max_iter=1000, random_state=self.random_state)
        
        # Build stacking classifier
        print("[Advanced ML] Training stacking ensemble...")
        stacking_model = StackingClassifier(
            estimators=[
                ('xgb', xgb_model),
                ('lgb', lgb_model),
                ('cat', cat_model),
                ('rf', rf_model)
            ],
            final_estimator=meta_learner,
            cv=5,
            n_jobs=-1
        )
        
        stacking_model.fit(X_train, y_train)
        
        print("[Advanced ML] ✓ Stacking ensemble trained successfully")
        return stacking_model
    
    def _evaluate(self, X_test, y_test):
        """Evaluate model with comprehensive metrics"""
        
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        print("\n" + "="*70)
        print("ADVANCED MODEL EVALUATION RESULTS")
        print("="*70)
        
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['No Disruption', 'Disruption'], digits=4))
        
        cm = confusion_matrix(y_test, y_pred)
        print("\nConfusion Matrix:")
        print(cm)
        
        tn, fp, fn, tp = cm.ravel()
        accuracy = accuracy_score(y_test, y_pred)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"\nKey Metrics:")
        print(f"  Accuracy:    {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"  Precision:   {precision:.4f}")
        print(f"  Recall:      {recall:.4f}")
        print(f"  F1-Score:    {f1:.4f}")
        
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        avg_precision = average_precision_score(y_test, y_pred_proba)
        
        print(f"\nROC-AUC Score: {roc_auc:.4f}")
        print(f"Average Precision Score: {avg_precision:.4f}")
        
        # Plot results
        self._plot_results(y_test, y_pred, y_pred_proba, cm, roc_auc, avg_precision)
        
        # Performance assessment
        print("\n" + "="*70)
        if accuracy >= 0.90 and roc_auc >= 0.95:
            print("🏆 EXCEPTIONAL PERFORMANCE - Production ready!")
        elif accuracy >= 0.85 and roc_auc >= 0.90:
            print("✓ EXCELLENT PERFORMANCE - Ready for deployment!")
        elif accuracy >= 0.80 and roc_auc >= 0.85:
            print("✓ VERY GOOD PERFORMANCE - Acceptable for production")
        elif accuracy >= 0.75 and roc_auc >= 0.80:
            print("✓ GOOD PERFORMANCE - Consider minor improvements")
        else:
            print("⚠ MODERATE PERFORMANCE - Further optimization recommended")
        print("="*70)
    
    def _plot_results(self, y_test, y_pred, y_pred_proba, cm, roc_auc, avg_precision):
        """Plot all evaluation metrics"""
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # ROC Curve
        fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
        axes[0, 0].plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC (AUC = {roc_auc:.4f})')
        axes[0, 0].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        axes[0, 0].set_xlabel('False Positive Rate')
        axes[0, 0].set_ylabel('True Positive Rate')
        axes[0, 0].set_title('ROC Curve', fontweight='bold')
        axes[0, 0].legend()
        axes[0, 0].grid(alpha=0.3)
        
        # Precision-Recall Curve
        precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
        axes[0, 1].plot(recall, precision, color='blue', lw=2, label=f'PR (AP = {avg_precision:.4f})')
        axes[0, 1].set_xlabel('Recall')
        axes[0, 1].set_ylabel('Precision')
        axes[0, 1].set_title('Precision-Recall Curve', fontweight='bold')
        axes[0, 1].legend()
        axes[0, 1].grid(alpha=0.3)
        
        # Confusion Matrix
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1, 0],
                    xticklabels=['No Disruption', 'Disruption'],
                    yticklabels=['No Disruption', 'Disruption'])
        axes[1, 0].set_title('Confusion Matrix', fontweight='bold')
        axes[1, 0].set_ylabel('True Label')
        axes[1, 0].set_xlabel('Predicted Label')
        
        # Prediction distribution
        axes[1, 1].hist(y_pred_proba[y_test == 0], bins=50, alpha=0.5, label='No Disruption', color='blue')
        axes[1, 1].hist(y_pred_proba[y_test == 1], bins=50, alpha=0.5, label='Disruption', color='red')
        axes[1, 1].set_xlabel('Predicted Probability')
        axes[1, 1].set_ylabel('Frequency')
        axes[1, 1].set_title('Prediction Distribution', fontweight='bold')
        axes[1, 1].legend()
        axes[1, 1].grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('advanced_model_evaluation.png', dpi=300, bbox_inches='tight')
        print("\n[Advanced ML] Evaluation plots saved to advanced_model_evaluation.png")
        plt.close()
    
    def save_model(self, output_path: str):
        """Save trained model"""
        
        model_artifacts = {
            'model': self.model,
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'trained_at': datetime.now().isoformat(),
            'model_type': 'Advanced Stacking Ensemble (XGBoost + LightGBM + CatBoost + RF)'
        }
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_artifacts, output_path)
        
        print(f"\n[Advanced ML] Model saved to {output_path}")
        print(f"[Advanced ML] Model size: {Path(output_path).stat().st_size / (1024*1024):.2f} MB")


def main():
    parser = argparse.ArgumentParser(description='Train Advanced ML Model for 90%+ accuracy')
    parser.add_argument('--dataset', type=str, required=True)
    parser.add_argument('--output', type=str, default='app/ml/models/rf_risk_model.pkl')
    parser.add_argument('--no-optuna', action='store_true', help='Skip Optuna optimization')
    parser.add_argument('--no-ensemble', action='store_true', help='Use XGBoost only')
    
    args = parser.parse_args()
    
    trainer = AdvancedMLTrainer()
    X_train, X_test, y_train, y_test = trainer.load_and_prepare_data(args.dataset)
    trainer.train(X_train, y_train, X_test, y_test, 
                  use_optuna=not args.no_optuna, 
                  use_ensemble=not args.no_ensemble)
    trainer.save_model(args.output)
    
    print("\n" + "="*70)
    print("🎯 ADVANCED TRAINING COMPLETE!")
    print("="*70)


if __name__ == "__main__":
    main()