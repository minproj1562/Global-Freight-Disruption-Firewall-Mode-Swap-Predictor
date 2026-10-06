#backend/app/ml/lstm_model_architecture.py
"""
LSTM Sequence Architecture for Vessel ETA Prediction.

This module defines the neural network architecture shared between:
  - train_lstm_eta_model.py   (training / offline fitting)
  - lstm_eta_predictor.py     (runtime inference)

Architecture: 2-layer stacked LSTM -> Dropout -> Fully Connected head.
Input:  a sliding window of SEQ_LEN sequential vessel telemetry snapshots,
        each with 6 engineered features (see FEATURE_NAMES below).
Output: a single scalar — the standardized, log-transformed number of
        hours remaining until port arrival.

Uncertainty Quantification:
  Monte Carlo Dropout (Gal & Ghahramani, 2016, "Dropout as a Bayesian
  Approximation") is used at inference time (see lstm_eta_predictor.py)
  to approximate a Bayesian predictive distribution by keeping dropout
  active and sampling multiple forward passes. This yields a defensible
  90% confidence interval without implementing a full Bayesian Neural
  Network.
"""
import torch
import torch.nn as nn

SEQ_LEN = 8  # number of historical AIS/position snapshots used per prediction

FEATURE_NAMES = [
    "speed_knots",
    "log1p_distance_remaining_nm",
    "heading_delta_deg",
    "weather_severity_0_10",
    "destination_congestion_pct",
    "window_progress_fraction",
]
INPUT_SIZE = len(FEATURE_NAMES)


class LSTMETAModel(nn.Module):
    def __init__(self, input_size: int = INPUT_SIZE, hidden_size: int = 64,
                 num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_size, 32)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(32, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: [batch, seq_len, input_size]
        lstm_out, _ = self.lstm(x)
        last_step = lstm_out[:, -1, :]          # final timestep's hidden state
        z = self.dropout(last_step)
        z = self.relu(self.fc1(z))
        z = self.dropout(z)
        return self.fc2(z)                       # [batch, 1]