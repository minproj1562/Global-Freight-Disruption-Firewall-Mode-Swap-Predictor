#backend/app/services/congestion_history_seeder.py
"""
Extended Port Congestion History Seeder
=========================================
Generates realistic daily congestion history so the Prophet forecasting
service (port_forecast_service.py) has enough real, learnable time-series
data to train on, instead of silently falling back to a random mock.

METHODOLOGY NOTE (for report/methodology section):
Prophet (Taylor & Letham, 2018) requires a meaningful amount of historical
data to detect trend and seasonality. With a freshly seeded database there
is no real multi-month congestion history, so — consistent with the same
simulation-based bootstrapping approach used for the LSTM ETA model — a
physics/operations-informed generator is used here instead of inventing
fictitious "real" port events:

  - A mean-reverting random walk (Ornstein-Uhlenbeck-style) anchored to
    each port's current real congestion_percent as the long-run mean,
    so forecasts continue smoothly from today's real value.
  - A weekday/weekend multiplier (ports typically see heavier weekday
    cargo throughput), giving Prophet's weekly_seasonality component
    genuine signal to detect.
  - Randomized multi-day "disruption spike" events (e.g. simulating a
    labor slowdown or storm), giving Prophet's changepoint detection
    something realistic to learn from.

This is seeded ONCE for days -157 to -8 (150 days), deliberately leaving
the original 7-day seed (days -6 to 0) from port_service.py untouched and
non-overlapping, so no duplicate dates are created for the same port.
"""
import random
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.ports import Port, PortCongestionHistory

RANDOM_SEED = 2024  # fixed seed for reproducibility (citable in methodology)
HISTORY_DAYS = 150
GAP_DAYS_FROM_TODAY = 8  # leave days -1..-7 untouched (already seeded elsewhere)
MIN_ROWS_TO_SKIP = 100   # if a port already has this many rows, don't reseed it


def seed_extended_congestion_history(db: Session):
    random.seed(RANDOM_SEED)

    ports = db.query(Port).all()
    seeded_count = 0

    for port in ports:
        existing_count = db.query(PortCongestionHistory).filter(
            PortCongestionHistory.port_id == port.id
        ).count()

        if existing_count >= MIN_ROWS_TO_SKIP:
            continue

        baseline = float(port.congestion_percent or 50)
        berth_capacity = port.berth_capacity or 20

        today = datetime.utcnow()
        start_offset = HISTORY_DAYS + GAP_DAYS_FROM_TODAY
        end_offset = GAP_DAYS_FROM_TODAY

        value = baseline  # start the walk anchored near the port's real current level
        spike_remaining = 0
        spike_intensity = 0.0
        reversion_speed = 0.12

        records = []
        for day_offset in range(start_offset, end_offset, -1):
            date = today - timedelta(days=day_offset)
            weekday = date.weekday()  # 0=Mon ... 6=Sun
            wd_multiplier = 1.05 if weekday < 5 else 0.82

            # Mean-reverting random walk toward (baseline * weekday multiplier)
            target = baseline * wd_multiplier
            noise = random.gauss(0, 3.0)
            value = value + reversion_speed * (target - value) + noise

            # Randomly trigger a multi-day disruption spike (~4% chance/day)
            if spike_remaining <= 0 and random.random() < 0.04:
                spike_remaining = random.randint(2, 4)
                spike_intensity = random.uniform(15.0, 30.0)

            disruption_flag = False
            disruption_reason = None
            if spike_remaining > 0:
                decay_factor = spike_remaining / 4.0
                value += spike_intensity * decay_factor
                disruption_flag = True
                disruption_reason = random.choice([
                    "Labor slowdown", "Severe weather", "Equipment outage", "Customs backlog"
                ])
                spike_remaining -= 1

            value = max(5.0, min(99.0, value))

            waiting_vessels = max(0, round((value / 100.0) * berth_capacity * random.uniform(0.8, 1.2)))
            avg_wait_hours = round((value / 100.0) * 14.0 + random.uniform(-1.0, 1.5), 1)
            avg_wait_hours = max(0.5, avg_wait_hours)

            records.append(PortCongestionHistory(
                port_id=port.id,
                timestamp=date,
                congestion_percent=int(round(value)),
                waiting_vessels=int(waiting_vessels),
                avg_wait_hours=avg_wait_hours,
                disruption_flag=disruption_flag,
                disruption_reason=disruption_reason,
            ))

        db.bulk_save_objects(records)
        seeded_count += 1

    db.commit()
    print(f"[Congestion Seeder] Extended {HISTORY_DAYS}-day history seeded for {seeded_count} port(s) "
          f"(ports with existing sufficient history were skipped).")