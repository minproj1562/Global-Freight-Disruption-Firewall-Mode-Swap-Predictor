# backend/app/ml/train_rf_model.py
"""
Enhanced Random Forest Training Pipeline for Disruption Risk Prediction

Improvements:
- Advanced feature engineering with proper NaN handling
- Better handling of class imbalance (SMOTE)
- Extended hyperparameter tuning
- Cross-validation with stratification
- Feature selection
- Robust error handling

Target: 75%+ accuracy, 0.80+ ROC-AUC
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    roc_auc_score, 
    roc_curve,
    precision_recall_curve,
    average_precision_score
)
from sklearn.feature_selection import SelectFromModel
from imblearn.over_sampling import SMOTE
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import argparse
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')


class EnhancedRFTrainer:
    """Enhanced Random Forest trainer with advanced ML techniques"""
    
    def __init__(self, random_state=42):
        self.random_state = random_state
        self.model = None
        self.label_encoders = {}
        self.scaler = RobustScaler()
        self.feature_names = []
        self.feature_importances = None
        self.best_features = None
        
    def load_and_prepare_data(self, dataset_path: str) -> tuple:
        """Load and prepare dataset with advanced feature engineering"""
        
        print(f"[Enhanced RF] Loading dataset from {dataset_path}")
        df = pd.read_csv(dataset_path)
        
        print(f"[Enhanced RF] Dataset shape: {df.shape}")
        print(f"[Enhanced RF] Columns: {df.columns.tolist()}")
        
        # Check for missing values
        missing_counts = df.isnull().sum()
        if missing_counts.sum() > 0:
            print(f"\n[Enhanced RF] Missing values detected:")
            print(missing_counts[missing_counts > 0])
        
        # Check for target column
        target_candidates = [
            'Disruption_Occurred', 
            'disruption_occurred',
            'Disruption',
            'disruption',
            'delay_occurred',
            'Delay_Occurred'
        ]
        
        target_col = None
        for candidate in target_candidates:
            if candidate in df.columns:
                target_col = candidate
                break
        
        if target_col is None:
            print("[Enhanced RF] WARNING: No disruption target found. Creating synthetic target...")
            if 'Lead_Time_Days' in df.columns:
                median_lead_time = df['Lead_Time_Days'].median()
                df['Disruption_Occurred'] = (df['Lead_Time_Days'] > median_lead_time * 1.5).astype(int)
                target_col = 'Disruption_Occurred'
            else:
                raise ValueError("Cannot create target - no suitable columns found")
        
        print(f"\n[Enhanced RF] Using target column: {target_col}")
        print(f"[Enhanced RF] Target distribution:\n{df[target_col].value_counts()}")
        
        # Advanced feature engineering
        df = self._advanced_feature_engineering(df)
        
        # Define feature sets
        categorical_features = self._identify_categorical_features(df, exclude=[target_col])
        numerical_features = self._identify_numerical_features(df, exclude=[target_col])
        
        print(f"\n[Enhanced RF] Categorical features ({len(categorical_features)}): {categorical_features}")
        print(f"[Enhanced RF] Numerical features ({len(numerical_features)}): {numerical_features}")
        
        # Encode categorical variables
        for col in categorical_features:
            if col in df.columns:
                le = LabelEncoder()
                # Handle NaN in categorical columns
                df[col] = df[col].fillna('MISSING')
                df[col] = le.fit_transform(df[col].astype(str))
                self.label_encoders[col] = le
        
        # Prepare feature matrix
        all_features = categorical_features + numerical_features
        X = df[all_features].copy()
        y = df[target_col]
        
        # Handle missing values intelligently
        for col in X.columns:
            if X[col].isnull().sum() > 0:
                if col in numerical_features:
                    # Fill numerical with median
                    median_val = X[col].median()
                    X[col] = X[col].fillna(median_val)
                    print(f"  Filled {X[col].isnull().sum()} NaN in {col} with median: {median_val:.2f}")
                else:
                    # Fill categorical with mode
                    mode_val = X[col].mode()[0] if not X[col].mode().empty else 0
                    X[col] = X[col].fillna(mode_val)
                    print(f"  Filled NaN in {col} with mode: {mode_val}")
        
        self.feature_names = X.columns.tolist()
        
        # Remove highly correlated features
        X = self._remove_correlated_features(X, threshold=0.95)
        self.feature_names = X.columns.tolist()
        
        # Scale numerical features
        numerical_cols_in_X = [col for col in numerical_features if col in X.columns]
        if numerical_cols_in_X:
            X[numerical_cols_in_X] = self.scaler.fit_transform(X[numerical_cols_in_X])
        
        # Split with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=0.2, 
            random_state=self.random_state, 
            stratify=y
        )
        
        print(f"\n[Enhanced RF] Final feature count: {X.shape[1]}")
        print(f"[Enhanced RF] Training set: {X_train.shape}")
        print(f"[Enhanced RF] Test set: {X_test.shape}")
        print(f"[Enhanced RF] Train class distribution:\n{y_train.value_counts()}")
        print(f"[Enhanced RF] Test class distribution:\n{y_test.value_counts()}")
        
        return X_train, X_test, y_train, y_test
    
    def _advanced_feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create advanced engineered features with proper NaN handling"""
        
        print("\n[Enhanced RF] Creating advanced features...")
        
        # Extract temporal features
        date_cols = [col for col in df.columns if any(x in col.lower() for x in ['date', 'time', 'dispatch', 'arrival'])]
        if date_cols:
            for date_col in date_cols[:1]:
                try:
                    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                    df['Month'] = df[date_col].dt.month
                    df['DayOfWeek'] = df[date_col].dt.dayofweek
                    df['Quarter'] = df[date_col].dt.quarter
                    df['IsWeekend'] = (df[date_col].dt.dayofweek >= 5).astype(int)
                    print(f"  ✓ Extracted temporal features from {date_col}")
                except Exception as e:
                    print(f"  ✗ Failed to extract temporal features from {date_col}: {e}")
        
        # Create interaction features
        if 'Geopolitical_Risk_Score' in df.columns and 'Distance_km' in df.columns:
            df['Risk_Distance_Interaction'] = df['Geopolitical_Risk_Score'] * np.log1p(df['Distance_km'].fillna(0))
            print("  ✓ Created Risk × Distance interaction")
        
        if 'Weather_Severity_Index' in df.columns and 'Distance_km' in df.columns:
            df['Weather_Distance_Interaction'] = df['Weather_Severity_Index'] * np.log1p(df['Distance_km'].fillna(0))
            print("  ✓ Created Weather × Distance interaction")
        elif 'Weather_Condition' in df.columns and 'Distance_km' in df.columns:
            # Convert weather condition to severity
            weather_severity_map = {
                'Clear': 0, 'Sunny': 0, 'Partly Cloudy': 1, 'Cloudy': 2,
                'Rainy': 5, 'Rain': 5, 'Heavy Rain': 7, 'Storm': 8, 'Stormy': 8,
                'Snowy': 6, 'Snow': 6, 'Foggy': 4, 'Fog': 4
            }
            df['Weather_Severity'] = df['Weather_Condition'].map(weather_severity_map).fillna(3)
            df['Weather_Distance_Interaction'] = df['Weather_Severity'] * np.log1p(df['Distance_km'].fillna(0))
            print("  ✓ Created Weather × Distance interaction (from Weather_Condition)")
        
        if 'Port_Congestion_Level' in df.columns and 'Weather_Severity_Index' in df.columns:
            df['Congestion_Weather_Interaction'] = df['Port_Congestion_Level'].fillna(0) * df['Weather_Severity_Index'].fillna(0)
            print("  ✓ Created Congestion × Weather interaction")
        
        # Create risk severity levels (with proper NaN handling)
        if 'Geopolitical_Risk_Score' in df.columns:
            # Fill NaN before binning
            risk_scores = df['Geopolitical_Risk_Score'].fillna(df['Geopolitical_Risk_Score'].median())
            df['Risk_Level'] = pd.cut(
                risk_scores, 
                bins=[0, 3, 6, 10], 
                labels=[0, 1, 2],
                include_lowest=True
            )
            # Convert to int, filling any remaining NaN with 1 (medium risk)
            df['Risk_Level'] = df['Risk_Level'].cat.codes.replace(-1, 1)
            print("  ✓ Created Risk Level categories")
        
        # Distance-based features
        if 'Distance_km' in df.columns:
            distance_filled = df['Distance_km'].fillna(df['Distance_km'].median())
            df['Distance_Log'] = np.log1p(distance_filled)
            df['Distance_Sqrt'] = np.sqrt(distance_filled)
            df['Is_Long_Distance'] = (distance_filled > distance_filled.quantile(0.75)).astype(int)
            print("  ✓ Created distance-based features")
        
        # Weight-based features
        if 'Weight_MT' in df.columns:
            weight_filled = df['Weight_MT'].fillna(df['Weight_MT'].median())
            df['Weight_Log'] = np.log1p(weight_filled)
            df['Is_Heavy_Cargo'] = (weight_filled > weight_filled.quantile(0.75)).astype(int)
            print("  ✓ Created weight-based features")
        
        # Combined risk score
        risk_features = []
        if 'Geopolitical_Risk_Score' in df.columns:
            risk_features.append('Geopolitical_Risk_Score')
        if 'Weather_Severity_Index' in df.columns:
            risk_features.append('Weather_Severity_Index')
        elif 'Weather_Severity' in df.columns:
            risk_features.append('Weather_Severity')
        if 'Port_Congestion_Level' in df.columns:
            risk_features.append('Port_Congestion_Level')
        
        if risk_features:
            df['Combined_Risk_Score'] = df[risk_features].fillna(0).mean(axis=1)
            print(f"  ✓ Created Combined Risk Score from {len(risk_features)} features")
        
        # Carrier reliability bins
        if 'Carrier_Reliability_Score' in df.columns:
            reliability_filled = df['Carrier_Reliability_Score'].fillna(df['Carrier_Reliability_Score'].median())
            df['Reliability_Category'] = pd.cut(
                reliability_filled,
                bins=[0, 70, 85, 100],
                labels=[0, 1, 2],
                include_lowest=True
            )
            df['Reliability_Category'] = df['Reliability_Category'].cat.codes.replace(-1, 1)
            print("  ✓ Created Carrier Reliability categories")
        
        # Route complexity
        if 'Distance_km' in df.columns and 'Geopolitical_Risk_Score' in df.columns:
            distance_normalized = df['Distance_km'].fillna(0) / (df['Distance_km'].max() + 1)
            risk_normalized = df['Geopolitical_Risk_Score'].fillna(0) / 10.0
            df['Route_Complexity'] = distance_normalized * 0.5 + risk_normalized * 0.5
            print("  ✓ Created Route Complexity score")
        
        # Fuel price impact
        if 'Fuel_Price_Index' in df.columns and 'Distance_km' in df.columns:
            df['Fuel_Cost_Impact'] = df['Fuel_Price_Index'].fillna(1.0) * np.log1p(df['Distance_km'].fillna(0))
            print("  ✓ Created Fuel Cost Impact feature")
        
        return df
    
    def _identify_categorical_features(self, df: pd.DataFrame, exclude: list) -> list:
        """Identify categorical features"""
        categorical = []
        for col in df.columns:
            if col in exclude:
                continue
            # Skip ID columns
            if 'id' in col.lower() or 'ID' in col:
                continue
            if df[col].dtype == 'object' or df[col].nunique() < 20:
                categorical.append(col)
        return categorical
    
    def _identify_numerical_features(self, df: pd.DataFrame, exclude: list) -> list:
        """Identify numerical features"""
        numerical = []
        for col in df.columns:
            if col in exclude:
                continue
            # Skip ID columns
            if 'id' in col.lower() or 'ID' in col:
                continue
            if df[col].dtype in [np.float64, np.int64] and df[col].nunique() >= 10:
                numerical.append(col)
        return numerical
    
    def _remove_correlated_features(self, X: pd.DataFrame, threshold: float = 0.95) -> pd.DataFrame:
        """Remove highly correlated features"""
        
        corr_matrix = X.corr().abs()
        upper_triangle = corr_matrix.where(
            np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
        )
        
        to_drop = [column for column in upper_triangle.columns if any(upper_triangle[column] > threshold)]
        
        if to_drop:
            print(f"[Enhanced RF] Removing {len(to_drop)} highly correlated features: {to_drop}")
            X = X.drop(columns=to_drop)
        
        return X
    
    def train(self, X_train, y_train, X_test, y_test, hyperparameter_tuning=True, use_smote=True):
        """Train with SMOTE, feature selection, and enhanced methods"""
        
        print("\n[Enhanced RF] Starting enhanced training pipeline...")
        
        # Handle class imbalance with SMOTE
        if use_smote:
            print("[Enhanced RF] Applying SMOTE to balance classes...")
            smote = SMOTE(random_state=self.random_state, k_neighbors=5)
            X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
            print(f"  Original class distribution: {dict(pd.Series(y_train).value_counts())}")
            print(f"  Balanced class distribution: {dict(pd.Series(y_train_balanced).value_counts())}")
        else:
            X_train_balanced, y_train_balanced = X_train, y_train
        
        if hyperparameter_tuning:
            print("\n[Enhanced RF] Running hyperparameter tuning...")
            
            # Optimized parameter grid (faster but still effective)
            param_grid = {
                'n_estimators': [300, 500],
                'max_depth': [15, 20, 25],
                'min_samples_split': [2, 5],
                'min_samples_leaf': [1, 2],
                'max_features': ['sqrt', 'log2'],
                'class_weight': ['balanced_subsample'],
                'criterion': ['gini', 'entropy']
            }
            
            rf_base = RandomForestClassifier(
                random_state=self.random_state, 
                n_jobs=-1,
                bootstrap=True
            )
            
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            
            grid_search = GridSearchCV(
                rf_base, 
                param_grid, 
                cv=cv,
                scoring='roc_auc',
                n_jobs=-1,
                verbose=2
            )
            
            grid_search.fit(X_train_balanced, y_train_balanced)
            
            self.model = grid_search.best_estimator_
            print(f"\n[Enhanced RF] Best parameters: {grid_search.best_params_}")
            print(f"[Enhanced RF] Best CV ROC-AUC: {grid_search.best_score_:.4f}")
            
        else:
            # Use optimized default parameters
            self.model = RandomForestClassifier(
                n_estimators=500,
                max_depth=20,
                min_samples_split=2,
                min_samples_leaf=1,
                max_features='sqrt',
                class_weight='balanced_subsample',
                criterion='entropy',
                bootstrap=True,
                random_state=self.random_state,
                n_jobs=-1,
                verbose=1
            )
            
            self.model.fit(X_train_balanced, y_train_balanced)
        
        # Feature importance
        self.feature_importances = pd.DataFrame({
            'feature': X_train.columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n[Enhanced RF] Top 15 Most Important Features:")
        print(self.feature_importances.head(15).to_string(index=False))
        
        # Evaluate
        self._evaluate(X_test, y_test)
        
        return X_train_balanced, X_test, y_train_balanced, y_test
    
    def _evaluate(self, X_test, y_test):
        """Enhanced evaluation with multiple metrics"""
        
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        print("\n" + "="*70)
        print("ENHANCED MODEL EVALUATION RESULTS")
        print("="*70)
        
        # Classification report
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['No Disruption', 'Disruption'], digits=4))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print("\nConfusion Matrix:")
        print(cm)
        
        # Calculate metrics
        tn, fp, fn, tp = cm.ravel()
        accuracy = (tp + tn) / (tp + tn + fp + fn)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"\nKey Metrics:")
        print(f"  Accuracy:    {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"  Precision:   {precision:.4f}")
        print(f"  Recall:      {recall:.4f}")
        print(f"  Specificity: {specificity:.4f}")
        print(f"  F1-Score:    {f1:.4f}")
        
        # ROC-AUC
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        print(f"\nROC-AUC Score: {roc_auc:.4f}")
        
        # Average Precision
        avg_precision = average_precision_score(y_test, y_pred_proba)
        print(f"Average Precision Score: {avg_precision:.4f}")
        
        # Plot metrics
        self._plot_roc_curve(y_test, y_pred_proba, roc_auc)
        self._plot_precision_recall_curve(y_test, y_pred_proba, avg_precision)
        self._plot_confusion_matrix(cm)
        self._plot_feature_importance()
        
        # Performance summary
        print("\n" + "="*70)
        if accuracy >= 0.75 and roc_auc >= 0.80:
            print("✓ EXCELLENT PERFORMANCE - Ready for production!")
        elif accuracy >= 0.70 and roc_auc >= 0.75:
            print("✓ GOOD PERFORMANCE - Acceptable for deployment")
        elif accuracy >= 0.65 and roc_auc >= 0.70:
            print("⚠ MODERATE PERFORMANCE - Consider further tuning")
        else:
            print("✗ LOW PERFORMANCE - Requires improvement")
        print("="*70)
    
    def _plot_roc_curve(self, y_test, y_pred_proba, roc_auc):
        """Plot ROC curve"""
        fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
        
        plt.figure(figsize=(10, 6))
        plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.4f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate', fontsize=12)
        plt.ylabel('True Positive Rate', fontsize=12)
        plt.title('Receiver Operating Characteristic (ROC) Curve', fontsize=14, fontweight='bold')
        plt.legend(loc="lower right", fontsize=11)
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig('rf_roc_curve.png', dpi=300, bbox_inches='tight')
        print("[Enhanced RF] ROC curve saved to rf_roc_curve.png")
        plt.close()
    
    def _plot_precision_recall_curve(self, y_test, y_pred_proba, avg_precision):
        """Plot Precision-Recall curve"""
        precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
        
        plt.figure(figsize=(10, 6))
        plt.plot(recall, precision, color='blue', lw=2, label=f'PR curve (AP = {avg_precision:.4f})')
        plt.xlabel('Recall', fontsize=12)
        plt.ylabel('Precision', fontsize=12)
        plt.title('Precision-Recall Curve', fontsize=14, fontweight='bold')
        plt.legend(loc="lower left", fontsize=11)
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig('rf_precision_recall_curve.png', dpi=300, bbox_inches='tight')
        print("[Enhanced RF] Precision-Recall curve saved to rf_precision_recall_curve.png")
        plt.close()
    
    def _plot_confusion_matrix(self, cm):
        """Plot confusion matrix heatmap"""
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=True,
                    xticklabels=['No Disruption', 'Disruption'],
                    yticklabels=['No Disruption', 'Disruption'])
        plt.title('Confusion Matrix', fontsize=14, fontweight='bold')
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        plt.tight_layout()
        plt.savefig('rf_confusion_matrix.png', dpi=300, bbox_inches='tight')
        print("[Enhanced RF] Confusion matrix saved to rf_confusion_matrix.png")
        plt.close()
    
    def _plot_feature_importance(self):
        """Plot feature importance"""
        plt.figure(figsize=(12, 8))
        top_features = self.feature_importances.head(20)
        sns.barplot(x='importance', y='feature', data=top_features, palette='viridis')
        plt.title('Top 20 Feature Importances', fontsize=14, fontweight='bold')
        plt.xlabel('Importance', fontsize=12)
        plt.ylabel('Feature', fontsize=12)
        plt.tight_layout()
        plt.savefig('rf_feature_importance.png', dpi=300, bbox_inches='tight')
        print("[Enhanced RF] Feature importance plot saved to rf_feature_importance.png")
        plt.close()
    
    def save_model(self, output_path: str):
        """Save trained model and all artifacts"""
        
        model_artifacts = {
            'model': self.model,
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importances': self.feature_importances,
            'trained_at': datetime.now().isoformat(),
            'model_type': 'Enhanced Random Forest with SMOTE and Feature Engineering'
        }
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_artifacts, output_path)
        
        print(f"\n[Enhanced RF] Model saved to {output_path}")
        print(f"[Enhanced RF] Model size: {Path(output_path).stat().st_size / 1024:.2f} KB")


def main():
    parser = argparse.ArgumentParser(description='Train Enhanced Random Forest for disruption prediction')
    parser.add_argument('--dataset', type=str, required=True, help='Path to training dataset CSV')
    parser.add_argument('--output', type=str, default='app/ml/models/rf_risk_model.pkl', help='Output model path')
    parser.add_argument('--no-tuning', action='store_true', help='Skip hyperparameter tuning')
    parser.add_argument('--no-smote', action='store_true', help='Skip SMOTE balancing')
    
    args = parser.parse_args()
    
    # Initialize enhanced trainer
    trainer = EnhancedRFTrainer()
    
    # Load and prepare data
    X_train, X_test, y_train, y_test = trainer.load_and_prepare_data(args.dataset)
    
    # Train model
    trainer.train(
        X_train, y_train, X_test, y_test, 
        hyperparameter_tuning=not args.no_tuning,
        use_smote=not args.no_smote
    )
    
    # Save model
    trainer.save_model(args.output)
    
    print("\n" + "="*70)
    print("ENHANCED TRAINING COMPLETE!")
    print("="*70)
    print(f"Model saved to: {args.output}")
    print("Ready for deployment in context_extractor.py")
    print("\nGenerated files:")
    print("  - rf_roc_curve.png")
    print("  - rf_precision_recall_curve.png")
    print("  - rf_confusion_matrix.png")
    print("  - rf_feature_importance.png")


if __name__ == "__main__":
    main()