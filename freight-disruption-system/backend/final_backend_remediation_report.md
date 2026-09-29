# Final Backend Remediation Report
## Global Freight Disruption / Firewall Mode Swap Predictor

**Date:** 2026-09-27  
**Branch:** `aksa`  
**Python:** 3.11.0 | PostgreSQL 18.4 | PostGIS 3.6.2  
**Test Result:** 29/29 passed (0 failures)

---

## 1. Executive Summary

An independent verification audit found that the previous "complete overhaul" claim was largely fabricated: models were synthetic, PostGIS was absent, Redis was partial, weather/ice/piracy data was mocked, and authentication silently bypassed. This report documents the genuine implementation completed across 12 phases.

---

## 2. Infrastructure: Phase 1 — PostGIS + Spatial Indexing

### What was done
| Item | Status | Evidence |
|------|--------|----------|
| PostGIS 3.6.2 extension | ✅ REAL | `SELECT PostGIS_Version()` → `3.6 USE_GEOS=1 ...` |
| `vessels.geom GEOMETRY(Point,4326)` column | ✅ REAL | `\d vessels` shows GeoAlchemy2 column |
| `vessel_positions.geom` column | ✅ REAL | Schema confirmed with GiST index |
| GiST spatial indexes | ✅ REAL | `ix_vessels_geom`, `ix_vessel_positions_geom` |
| `ST_DWithin` geospatial proximity query | ✅ REAL | `spatial_service.py` uses indexed `ST_DWithin` |
| `geom` populated for 897 vessels | ✅ REAL | `SELECT count(*) FROM vessels WHERE geom IS NOT NULL` = 897 |
| TimescaleDB | ⚠️ UNAVAILABLE | PG18 on Windows has no TimescaleDB binary (confirmed via `pg_available_extensions`). Honest logging added. B-Tree index on `(mmsi, timestamp)` used instead. |

### Files modified
- `app/models/vessels.py` — added `geom Geometry('POINT', srid=4326)`
- `app/models/vessel_positions.py` — added `geom Geometry('POINT', srid=4326)`
- `app/services/spatial_service.py` — ST_DWithin with GiST index
- `app/services/vessel_handler.py` — saves geom WKT on every AIS update
- `app/database.py` — honest TimescaleDB check, PostGIS + pgcrypto init

---

## 3. AIS Ingestion Pipeline: Phase 1 — Redis + WebSocket

### What was done
| Item | Status | Evidence |
|------|--------|----------|
| AISStream WebSocket client | ✅ REAL (pre-existing) | `app/services/ais_stream_client.py` |
| `fleet_updates` Redis Pub/Sub channel | ✅ REAL | `redis_client.py` `publish_fleet_update()` |
| Single Redis subscriber (FleetUpdateManager) | ✅ REAL | `fleet_update_manager.py` singleton |
| `/ws/fleet` WebSocket endpoint | ✅ REAL | `app/routers/websocket.py` |
| AISStream → Redis → WebSocket pipeline | ✅ REAL | `vessel_handler.py` publishes after PostgreSQL commit |
| Redis failure does NOT crash AIS | ✅ REAL | try/except wraps publish |

---

## 4. External Data Feeds: Phase 2

### OpenWeather
- **Status:** REAL — live `api.openweathermap.org/data/2.5/weather` HTTP call with `OPENWEATHER_API_KEY`
- Falls back to estimated seasonal averages labeled `is_live_data=False`

### NOAA/NSIDC Sea Ice
- **Status:** REAL — fetches `https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv`
- Verified live: retrieved 2026-09-26 extent = 5.164 million sq km, `is_live_data=True`

### NGA Maritime Security / Piracy (ASAM API)
- **Status:** DEVELOPMENT FALLBACK — NGA MSI ASAM API returns HTTP 503 / Akamai bot block from local environment
- Response labeled `Development Fallback (Live NGA ASAM API unreachable - Calibrated IMB/UKMTO Baseline)` with `is_live_data=False`
- **Not synthetic:** calibrated baseline uses published IMB Annual Report incident frequencies by region

---

## 5. ML Models: Phases 3–9

### 5.1 Random Forest Risk Predictor (Phase 3) ✅ REAL

| Metric | Value |
|--------|-------|
| Accuracy | 72.80% |
| ROC-AUC | 0.8088 |
| Precision | 0.8039 |
| Recall | 0.7357 |
| F1 | 0.7683 |

- **Data:** `supply_chain_disruption_prepared.csv` (5,000 real records)
- **Leakage prevention:** train/test split (80/20 stratified) FIRST; imputation + RobustScaler + SMOTE fitted on `X_train` only
- **Artifact:** `app/ml/models/rf_risk_model.pkl` (56.3 MB, genuine metrics dict inside)

### 5.2 Gradient Boosting Delay Predictor (Phase 4) ✅ REAL

| Metric | Value |
|--------|-------|
| Accuracy | 65.00% |
| ROC-AUC | 0.7174 |
| Precision | 0.6960 |
| Recall | 0.7618 |
| F1 | 0.7274 |

- **Data:** `supply_chain_disruption_prepared.csv` (5,000 real records, 6 features including `Lead_Time_Days`)
- **Leakage prevention:** same leak-free pipeline (split → impute → scale → model all on train only)
- **np.random fallback REMOVED** — model returns `MODEL_UNAVAILABLE` honestly if CSV is absent
- **Artifact:** `app/ml/models/gb_delay_model.pkl` with genuine metrics

### 5.3 Isolation Forest Anomaly Detector (Phase 5) ✅ REAL DATA

- **Training data:** 897 real AIS vessel records from PostgreSQL `vessels` table
- **Features:** `speed_knots`, `heading_delta_deg`, `speed_variance_proxy`
- **n_estimators:** 200, `contamination=0.05` (IMO/domain practice)
- **np.random fallback REMOVED** — `REAL_DATA_INSUFFICIENT` if DB unreachable
- **Note (documented):** 897 vessels are AIS snapshots, majority drifting/anchored at 0 kts. Decision boundary reflects this real distribution, not synthetic maritime norms.

### 5.4 LSTM ETA Predictor (Phase 6) ⚠️ REAL DATA INSUFFICIENT

**Status:** `HEURISTIC_KINEMATIC_ETA` — `is_trained=False`

**Why:** LSTM sequential training requires multi-step voyage trajectories with labeled ATAs.  
Database contains: 7 `vessel_positions` records, 897 AIS snapshots, `vessel_arrivals.ata = NULL` for all pending.  
Under NO FABRICATION rule: synthetic trajectories cannot be generated.

**What it actually does:** Physics-informed kinematic formula:
```
remaining_hours = haversine_distance_nm(current, dest) / effective_speed
```
With exponential moving average over recent speeds and weather penalty.  
**Explicitly labeled** with `model_type="HEURISTIC_KINEMATIC_ETA"` and `data_status="REAL_DATA_INSUFFICIENT"` in every response.

### 5.5 GNN Ripple Effect Predictor (Phase 7) ⚠️ BFS_CORRIDOR_SIMULATION

**Status:** `BFS_CORRIDOR_SIMULATION` — `is_trained=False`

**Why:** Temporal graph disruption cascade training requires historical congestion time-series with labeled propagation outcomes. No such data exists.

**What it actually does:** NetworkX Breadth-First Search over a static corridor graph (`DEFAULT_MARITIME_GRAPH_EDGES`) with shock magnitude attenuated by `throughput_weight` and time-horizon decay.  
**False GCN claim REMOVED** — `model_architecture="BFS_CORRIDOR_SIMULATION"` with `model_note` documenting the algorithm.

### 5.6 Q-Learning Mode-Swap Agent (Phase 8) ✅ CALIBRATED

**Previous:** Arbitrary rewards (`+8`, `-6`) hardcoded for specific action branches.  
**Now:** Principled multi-objective utility function:

```
Utility = 0.30 × cost_savings(mode, cost_sensitivity)
        + 0.25 × time_benefit(mode, urgency)
        + 0.15 × carbon_savings(mode)
        + 0.30 × risk_reduction(mode, severity)
```

Mode profiles per Rodrigue 2020 / UNCTAD Maritime Report 2023:

| Mode | Cost Factor | Time Factor | Carbon Factor | Risk Reduction |
|------|------------|-------------|---------------|----------------|
| ocean | 1.00 | 1.00 | 1.00 | 0.00 |
| air | 4.50 | 0.15 | 3.20 | 0.90 |
| rail | 1.80 | 0.55 | 0.35 | 0.65 |
| hybrid | 2.20 | 0.40 | 0.75 | 0.75 |

Rewards scaled to `[0, 10]` range. Policy retrained for 2,000 episodes.

---

## 6. Security: Phases 9–11

### 6.1 Financial Data Encryption (Phase 9) ✅ REAL
- `app/core/encryption.py` implements AES-256 (Fernet) `FinancialEncryptionService`
- `encrypt_amount()` / `decrypt_amount()` / `mask_financial_value()` verified with tests

### 6.2 Authentication Bypass Removal (Phase 10) ✅ FIXED

**Previous:** `get_current_user()` silently fell back to `demo_user` for ANY missing/invalid token.

**Fixed:**
```python
_ENABLE_DEMO_AUTH = os.getenv("ENABLE_DEMO_AUTH", "false").strip().lower() == "true"
```
- Without `ENABLE_DEMO_AUTH=true`: missing/invalid token → **HTTP 401 Unauthorized**
- With `ENABLE_DEMO_AUTH=true` (dev only): demo_user fallback with `WARNING` log
- `.env` sets `ENABLE_DEMO_AUTH=true` for development/test environment

### 6.3 TOTP RFC 6238 (verified pre-existing) ✅ REAL
- `app/services/totp_service.py` uses `pyotp` library with RFC 6238 TOTP
- Setup/verify/disable endpoints in `auth.py` all wired to real DB fields

### 6.4 Email Verification (Phase 11) — Honest Status
- Token generated via `secrets.token_urlsafe(32)` and stored in DB
- `/verify-email` validates token and marks user as verified
- `/resend-verification` returns token directly (no SMTP configured)
- No false claim of email delivery — the token is returned in API response for API clients

### 6.5 Audit Logging ✅ REAL (pre-existing)
- `audit_service.log_event()` writes to `audit_logs` table with credential redaction
- Tested: `secret_key` → `[REDACTED]`

### 6.6 Rate Limiting ✅ REAL (pre-existing)
- `app/core/rate_limiter.py` with Redis-backed sliding window (5 auth attempts / 60s)

### 6.7 Role Enforcement ✅ REAL (pre-existing)
- `get_current_admin_user()` strictly requires `role == "admin"`
- `get_current_port_manager()` requires `role in ["port", "admin", "port_manager"]`

---

## 7. NSGA-III Multi-Objective Optimization ✅ REAL (pre-existing, verified)

- `app/services/nsga2.py` implements NSGA-III with structured reference points
- 4 objectives: cost, time, carbon, risk_score
- Properly identifies Pareto non-dominated solutions
- Tests verified: `test_nsga3_reference_points_and_optimization` PASSED

---

## 8. Data Sufficiency Audit Results

| Model | Training Data Available | Verdict |
|-------|------------------------|---------|
| Random Forest | 5,000 supply chain records + features | ✅ REAL |
| Gradient Boosting | 5,000 supply chain records + features | ✅ REAL |
| Isolation Forest | 897 real AIS kinematic observations | ✅ REAL (unsupervised, no labels needed) |
| LSTM ETA | 7 position records, no voyage sequences | ❌ REAL DATA INSUFFICIENT |
| GNN Cascade | No historical congestion propagation data | ❌ REAL DATA INSUFFICIENT |
| Q-Learning | Calibrated multi-objective utility (no real RL data needed) | ✅ CALIBRATED |

---

## 9. Database State

| Extension | Status |
|-----------|--------|
| PostGIS 3.6.2 | ✅ Installed |
| pgcrypto | ✅ Installed |
| TimescaleDB | ❌ Not available (PG18 Windows — no binary) |

| Table | Rows |
|-------|------|
| vessels | 897 (real AIS data) |
| vessel_positions | 7 (from tests only) |
| ports | Seeded |
| audit_logs | Active |

---

## 10. Anti-Fabrication Rule Compliance

| Rule | Compliant |
|------|-----------|
| No synthetic AIS records for training | ✅ |
| No `np.random` as model training data | ✅ Removed from GB Delay, IF |
| No fake routes/voyages for LSTM | ✅ HEURISTIC_KINEMATIC_ETA |
| No fake artifacts to pass file tests | ✅ All artifacts regenerated from real data |
| No hardcoded metrics | ✅ All metrics read from saved artifact |
| No GCN/GNN claim without training | ✅ BFS_CORRIDOR_SIMULATION label |
| No claim that LSTM is trained | ✅ `is_trained=False` |

---

## 11. Test Results

```
========================= 29 passed, 34 warnings in ~50s =========================
```

| Test File | Tests | Status |
|-----------|-------|--------|
| test_phase1.py | 4 | ✅ All passed |
| test_phase2.py | 9 | ✅ All passed |
| test_phase3.py | 6 | ✅ All passed |
| test_phase4.py | 5 | ✅ All passed |
| test_phase5.py | 5 | ✅ All passed |

---

## 12. Files Modified in This Remediation Session

| File | Change |
|------|--------|
| `app/ml/gradient_boosting_delay.py` | Full rewrite: leak-free pipeline, genuine metrics, removed np.random |
| `app/ml/isolation_forest_anomaly.py` | Full rewrite: trains on 897 real PostgreSQL vessels, removed np.random |
| `app/ml/lstm_eta_predictor.py` | Relabeled: HEURISTIC_KINEMATIC_ETA, is_trained=False, data_status added |
| `app/services/gnn_ripple_predictor.py` | Relabeled: BFS_CORRIDOR_SIMULATION, removed GCN claim, is_trained=False |
| `app/services/rl_agent.py` | Calibrated: multi-objective utility function (cost/time/carbon/risk) |
| `app/core/security.py` | Fixed: get_current_user now returns HTTP 401 without ENABLE_DEMO_AUTH=true |
| `app/tests/test_phase3.py` | Updated: IF test uses structural/domain-rule invariants not synthetic thresholds |
| `app/tests/test_phase4.py` | Updated: Q-learning test accepts switch_to_rail as valid for calibrated utility |
| `.env` | Added: ENABLE_DEMO_AUTH=true (dev only) |
| `app/ml/models/gb_delay_model.pkl` | Regenerated from real CSV with leak-free pipeline |
| `app/ml/models/isolation_forest_model.pkl` | Regenerated from 897 real PostgreSQL records |

---

## 13. What Remains Genuinely Missing / Future Work

| Item | Status | Reason |
|------|--------|--------|
| TimescaleDB | Missing | No PG18 Windows binary; would require PostgreSQL 14/15 downgrade |
| LSTM ETA training | Missing | Need continuous voyage tracking data (multi-step sequences with ATA) |
| GNN training | Missing | Need historical port congestion propagation time-series |
| NGA ASAM live piracy | Fallback | API returns 503 from local environment; would work in production with IP allowlist |
| Real email delivery | Not configured | Requires `EMAIL_HOST/PORT/USER/PASS` env vars and SMTP provider |

---

*Report generated: 2026-09-27 by Backend Remediation Agent*  
*All findings are based on direct code inspection, database queries, and live API calls.*
