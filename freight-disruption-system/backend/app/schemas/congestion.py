# backend/app/schemas/congestion.py
from pydantic import BaseModel
from typing import Optional, List

class AlternativePortOption(BaseModel):
    id: str
    name: str
    code: str
    distance_nm: float
    current_congestion_percent: int
    cost_diff_usd: float
    time_diff_hours: float
    feasibility_score: int

class HistoryForecastDataPoint(BaseModel):
    date: str
    actual_congestion: Optional[float] = None
    forecast_congestion: Optional[float] = None
    confidence_upper_95: Optional[float] = None
    confidence_lower_95: Optional[float] = None

class CongestionPortItem(BaseModel):
    id: str
    name: str
    code: str
    country: str
    latitude: float
    longitude: float
    current_congestion_percent: int
    forecast_7d_percent: int
    forecast_14d_percent: int
    forecast_30d_percent: int
    trend: str  # rising, falling, stable
    peak_date: str
    risk_level: str  # low, medium, high, critical
    waiting_vessels: int
    avg_dwell_days: float
    historical_and_forecast_series: List[HistoryForecastDataPoint]
    alternative_ports: List[AlternativePortOption]

class LSTMMetrics(BaseModel):
    model_name: str = "Bidirectional LSTM Sequence Predictor"
    mae_7d: float = 4.2
    mae_14d: float = 6.8
    mae_30d: float = 12.3
    last_trained: str = "2026-08-10 UTC"

class PortCongestionOverviewResponse(BaseModel):
    top_congested_ports: List[CongestionPortItem]
    model_metrics: LSTMMetrics
    selected_horizon: str = "NOW"
