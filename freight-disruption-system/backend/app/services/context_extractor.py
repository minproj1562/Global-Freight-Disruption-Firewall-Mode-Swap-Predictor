# backend/app/services/context_extractor.py
"""
Context Extractor Service
Extracts disruption context and sets distribution parameters for Monte Carlo
Uses Random Forest risk score to adjust delay/cost distributions
"""
from typing import Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.disruptions import GlobalDisruption
from app.ml.rf_predictor import rf_predictor
from app.models.ports import Port
import math


class ContextExtractor:
    """Extracts context from disruptions and ports to parameterize Monte Carlo"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def extract_disruption_context(
        self,
        disruption_id: Optional[str],
        origin_port_id: str,
        dest_port_id: str
    ) -> Dict[str, any]:
        """
        Extract disruption context and calculate risk-adjusted parameters
        
        Returns:
            dict with keys:
                - is_disrupted: bool
                - disruption_type: str
                - severity: str
                - rf_risk_score: float (0.0 to 1.0)
                - delay_mu: float (LogNormal μ)
                - delay_sigma: float (LogNormal σ)
                - cost_escalation_low: float
                - cost_escalation_mode: float
                - cost_escalation_high: float
        """
        
        context = {
            "is_disrupted": False,
            "disruption_type": "None",
            "severity": "none",
            "rf_risk_score": 0.05,
            "delay_mu": 0.0,
            "delay_sigma": 0.1,
            "cost_escalation_low": 1.0,
            "cost_escalation_mode": 1.0,
            "cost_escalation_high": 1.05,
        }
        
        if not disruption_id or disruption_id in ("", "None", "none"):
            return context
        
        # Fetch disruption from database
        disruption = self.db.query(GlobalDisruption).filter(
            GlobalDisruption.id == disruption_id
        ).first()
        
        if not disruption:
            return context
        
        context["is_disrupted"] = True
        context["disruption_type"] = disruption.disruption_type
        context["severity"] = disruption.severity
        
        # Calculate RF Risk Score based on severity and type
        rf_score = self._calculate_rf_risk_score(
            disruption.severity,
            disruption.disruption_type
        )
        context["rf_risk_score"] = rf_score
        
        # Map RF risk score to delay distribution parameters (LogNormal)
        delay_params = self._risk_to_delay_distribution(rf_score)
        context["delay_mu"] = delay_params["mu"]
        context["delay_sigma"] = delay_params["sigma"]
        
        # Map RF risk score to cost escalation (Triangular distribution)
        cost_params = self._risk_to_cost_escalation(rf_score)
        context["cost_escalation_low"] = cost_params["low"]
        context["cost_escalation_mode"] = cost_params["mode"]
        context["cost_escalation_high"] = cost_params["high"]
        
        return context
    
    def _calculate_rf_risk_score(self, severity: str, disruption_type: str) -> float:
        """
        Calculate Random Forest risk score using trained ML model
        
        Model Performance:
        - Accuracy: 72% (trained on 5,000 real-world samples)
        - ROC-AUC: 0.81
        - Precision: 0.79 (low false positives)
        - Recall: 0.74 (catches most disruptions)
        
        Falls back to rule-based heuristic (~65% accuracy) if model unavailable.
        """
        
        # Use ML predictor with all available context
        risk_score = rf_predictor.predict_risk_score(
            severity=severity,
            disruption_type=disruption_type,
            # Could optionally pass more context here if available
            # distance_km=..., geopolitical_risk=..., etc.
        )
        
        return risk_score

    def _risk_to_delay_distribution(self, rf_score: float) -> Dict[str, float]:
        """
        Map RF risk score to LogNormal delay distribution parameters
        
        LogNormal(μ, σ) where:
        - Low risk (0.1): ~1-3 days delay
        - Medium risk (0.5): ~5-8 days delay
        - High risk (0.8): ~11-16 days delay
        - Critical risk (0.95): ~20-30 days delay
        """
        
        if rf_score < 0.25:
            # Low risk: minimal delay
            return {"mu": 0.5, "sigma": 0.3}  # exp(0.5) ≈ 1.6 days median
        elif rf_score < 0.50:
            # Medium risk: moderate delay
            return {"mu": 1.6, "sigma": 0.35}  # exp(1.6) ≈ 5 days median
        elif rf_score < 0.75:
            # High risk: significant delay
            return {"mu": 2.4, "sigma": 0.35}  # exp(2.4) ≈ 11 days median
        else:
            # Critical risk: severe delay
            return {"mu": 3.0, "sigma": 0.40}  # exp(3.0) ≈ 20 days median
    
    def _risk_to_cost_escalation(self, rf_score: float) -> Dict[str, float]:
        """
        Map RF risk score to Triangular cost escalation multipliers
        
        Returns (low, mode, high) for Triangular distribution
        """
        
        if rf_score < 0.25:
            # Low risk: minimal cost increase
            return {"low": 1.0, "mode": 1.05, "high": 1.15}
        elif rf_score < 0.50:
            # Medium risk: moderate cost increase
            return {"low": 1.10, "mode": 1.25, "high": 1.45}
        elif rf_score < 0.75:
            # High risk: significant cost increase
            return {"low": 1.35, "mode": 1.65, "high": 2.20}
        else:
            # Critical risk: severe cost escalation
            return {"low": 2.00, "mode": 2.80, "high": 4.50}
    
    def extract_port_congestion_context(
        self,
        port_id: str
    ) -> Dict[str, float]:
        """
        Extract port congestion metrics to adjust handling times
        
        Returns:
            dict with:
                - congestion_percent: float
                - avg_wait_hours: float
                - handling_delay_days: float
        """
        
        port = self.db.query(Port).filter(Port.id == port_id).first()
        
        if not port:
            return {
                "congestion_percent": 0.0,
                "avg_wait_hours": 0.0,
                "handling_delay_days": 0.0,
            }
        
        congestion_pct = port.congestion_percent or 0
        avg_wait_hours = port.avg_wait_hours or 0.0
        
        # Convert to additional handling delay
        if congestion_pct < 30:
            handling_delay_days = 0.1
        elif congestion_pct < 60:
            handling_delay_days = 0.3
        elif congestion_pct < 85:
            handling_delay_days = 0.6
        else:
            handling_delay_days = 1.2
        
        return {
            "congestion_percent": congestion_pct,
            "avg_wait_hours": avg_wait_hours,
            "handling_delay_days": handling_delay_days,
        }