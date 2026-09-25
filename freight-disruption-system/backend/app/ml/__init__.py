# backend/app/ml/__init__.py
"""
Machine Learning Module for Risk Prediction
"""
from app.ml.rf_predictor import RFRiskPredictor

__all__ = ["RFRiskPredictor"]