# backend/scripts/prepare_rf_dataset.py
"""
Dataset Preparation Script for RF Training

Downloads and prepares the Kaggle Global Supply Chain dataset
for Random Forest training.

Setup:
1. Install Kaggle CLI: pip install kaggle
2. Create Kaggle API token: https://www.kaggle.com/settings/account
3. Place kaggle.json in ~/.kaggle/

Usage:
    python scripts/prepare_rf_dataset.py
"""

import pandas as pd
from pathlib import Path
import subprocess
import sys


def download_dataset():
    """Download dataset from Kaggle"""
    
    dataset_id = "nudratabbas/global-supply-chain-risk-and-logistics-2024-2026"
    download_path = "data/raw/"
    
    print(f"[Dataset Prep] Downloading {dataset_id}...")
    
    try:
        subprocess.run([
            "kaggle", "datasets", "download",
            "-d", dataset_id,
            "-p", download_path,
            "--unzip"
        ], check=True)
        
        print(f"[Dataset Prep] Dataset downloaded to {download_path}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"[Dataset Prep] Failed to download: {e}")
        print("[Dataset Prep] Make sure Kaggle API is configured:")
        print("   1. pip install kaggle")
        print("   2. Get API token from https://www.kaggle.com/settings/account")
        print("   3. Place kaggle.json in ~/.kaggle/")
        return False
    except FileNotFoundError:
        print("[Dataset Prep] Kaggle CLI not found. Install with: pip install kaggle")
        return False


def prepare_dataset(input_path: str, output_path: str):
    """Prepare and clean dataset for training"""
    
    print(f"[Dataset Prep] Loading dataset from {input_path}")
    
    df = pd.read_csv(input_path)
    
    print(f"[Dataset Prep] Original shape: {df.shape}")
    print(f"[Dataset Prep] Columns: {df.columns.tolist()}")
    
    # Clean and prepare
    # (Adapt based on actual dataset structure)
    
    # Remove duplicates
    df = df.drop_duplicates()
    
    # Handle missing values
    df = df.dropna(subset=['Disruption_Occurred'])  # Don't drop target
    
    # Save prepared dataset
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"[Dataset Prep] Prepared dataset saved to {output_path}")
    print(f"[Dataset Prep] Final shape: {df.shape}")
    
    return df


def main():
    # Create directories
    Path("data/raw").mkdir(parents=True, exist_ok=True)
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    
    # Download dataset
    success = download_dataset()
    
    if not success:
        print("\n[Dataset Prep] Manual download instructions:")
        print("1. Go to: https://www.kaggle.com/datasets/nudratabbas/global-supply-chain-risk-and-logistics-2024-2026")
        print("2. Download the dataset")
        print("3. Extract to: data/raw/")
        sys.exit(1)
    
    # Find downloaded CSV (adapt filename)
    raw_files = list(Path("data/raw").glob("*.csv"))
    
    if not raw_files:
        print("[Dataset Prep] No CSV files found in data/raw/")
        sys.exit(1)
    
    input_csv = raw_files[0]
    output_csv = "data/processed/supply_chain_disruption_prepared.csv"
    
    # Prepare dataset
    prepare_dataset(str(input_csv), output_csv)
    
    print("\n" + "="*60)
    print("DATASET PREPARATION COMPLETE")
    print("="*60)
    print(f"Ready for training with: python -m app.ml.train_rf_model --dataset {output_csv}")


if __name__ == "__main__":
    main()