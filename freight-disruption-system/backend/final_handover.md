# Backend Final Handover

**Project:** Global Freight Disruption / Firewall Mode Swap Predictor
**Backend root:** `freight-disruption-system/backend`
**Date:** 2026-09-28
**Status:** Remediation complete — see Remaining Blockers for items that could not be genuinely implemented.

---

## 1. Architecture Overview

```
AISStream WebSocket
        │
        ▼
AISStreamClient (app/services/ais_stream_client.py)
        │  handle_vessel_update()
        ▼
PostgreSQL (vessels + vessel_positions tables, PostGIS geometry)
        │  asyncio.create_task → publish_fleet_update()
        ▼
Redis  fleet_updates  Pub/Sub channel
        │
        ▼
FleetUpdateManager (singleton)
        │  broadcast() to all connected clients
        ▼
WebSocket /ws/fleet  (N clients)
```

FastAPI application served via Uvicorn. All routers registered in `app/main.py` (138 routes total).

---

## 2. Database

### Engine
- **PostgreSQL 18** (Windows)
- **PostGIS 3.6.2** — spatial extension enabled (`CREATE EXTENSION IF NOT EXISTS postgis`)
- **pgcrypto** — enabled for `pgp_sym_encrypt` / AES-256 column-level SQL helpers

### Migration Strategy
No Alembic is in active use. All schema migrations are applied inline at startup in `app/database.py → init_db()` using `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. SQLAlchemy `Base.metadata.create_all()` creates tables on first run.

### Key Tables

| Table | Notable Columns |
|---|---|
| `users` | `id`, `email`, `hashed_password`, `role`, `is_verified`, `totp_secret`, `totp_enabled`, `failed_login_attempts`, `locked_until` |
| `vessels` | `mmsi`, `vessel_name`, `latitude`, `longitude`, `speed`, `heading`, `course`, `vessel_type`, `status`, `geom` (PostGIS GEOMETRY) |
| `vessel_positions` | `id`, `vessel_id`, `latitude`, `longitude`, `speed`, `heading`, `geom` (PostGIS GEOMETRY), `recorded_at` |
| `disruptions` | `id`, `type`, `severity`, `location`, `description`, `affected_routes`, `created_at` |
| `reroute_decisions` | `id`, `vessel_id`, `cargo_value_usd`, `selected_cost_usd`, `cost_saved_usd`, `encrypted_cargo_value`, `encrypted_selected_cost`, `encrypted_cost_saved`, `created_at` |
| `risk_register` | `id`, `risk_type`, `severity`, `location`, `description`, `status`, `created_at` |
| `audit_logs` | `id`, `user_id`, `action`, `resource`, `metadata` (JSONB), `created_at` |
| `port_managers` | `id`, `user_id`, `port_code`, `created_at` |
| `logistics_managers` | `id`, `user_id`, `region`, `created_at` |

### PostGIS Spatial Columns
- `vessels.geom` — `GEOMETRY(POINT, 4326)`, GiST index `idx_vessels_geom`
- `vessel_positions.geom` — `GEOMETRY(POINT, 4326)`, GiST index `idx_vessel_positions_geom`
- Both populated from real AIS data (897 vessels with geometry)

### TimescaleDB — BLOCKED
TimescaleDB is not available for PostgreSQL 18 on Windows. No binary package exists. A B-Tree index on `vessel_positions.recorded_at` is used instead. This requirement cannot be fulfilled in this environment without downgrading PostgreSQL.

---

## 3. Real-Time Pipeline (AIS → Redis → WebSocket)

### AIS Ingestion
- **File:** `app/services/ais_stream_client.py`
- Connects to `wss://stream.aisstream.io/v0/stream` using a live API key
- Subscribes to bounding box `[[-90, -180], [90, 180]]` for global coverage
- Parses `PositionReport` and `ShipStaticData` message types
- On each message calls `handle_vessel_update()` from `vessel_handler.py`

### Vessel Handler
- **File:** `app/services/vessel_handler.py`
- Upserts vessel record in `vessels` table (ON CONFLICT on `mmsi`)
- Inserts position record in `vessel_positions`
- Updates PostGIS `geom` column with `ST_GeomFromText(POINT(lon lat), 4326)`
- After successful `db.commit()`, publishes JSON payload to Redis `fleet_updates` channel via `publish_fleet_update()`
- Redis failure is caught and logged — it does NOT stop PostgreSQL persistence

### Redis Pub/Sub
- **File:** `app/services/redis_client.py`
- Synchronous `redis.Redis` client for rate limiting and caching (existing, preserved)
- Async `redis.asyncio` client for Pub/Sub publishing
- `publish_fleet_update(msg: dict)` serialises to JSON and publishes to `fleet_updates`
- Redis unavailability is caught with a `try/except`; the pipeline degrades gracefully

### FleetUpdateManager
- **File:** `app/services/fleet_update_manager.py`
- Singleton (`__new__` pattern) — one instance per process
- Subscribes to Redis `fleet_updates` Pub/Sub channel in a background asyncio task
- Broadcasts each message to all connected WebSocket clients concurrently
- Handles client connect/disconnect thread-safely
- Reconnects to Redis with exponential backoff: 1 s → 2 s → 4 s … → 60 s cap
- Stale/disconnected WebSocket clients are removed on send failure

### WebSocket Endpoint
- **File:** `app/routers/websocket.py`
- Route: `GET /ws/fleet` (WebSocket upgrade)
- On connect: registers client with `fleet_update_manager`
- On disconnect / error: unregisters client
- Lifecycle managed by `app/main.py` startup/shutdown hooks

---

## 4. ML Models

> **IMPORTANT:** Only models marked REAL/TRAINED below are genuine scikit-learn artifacts trained on actual data. Do NOT claim LSTM or GNN are trained implementations.

### 4.1 Random Forest Risk Classifier — REAL / TRAINED

| Property | Value |
|---|---|
| Artifact | `app/ml/models/rf_risk_model.pkl` (55 MB) |
| Library | scikit-learn `RandomForestClassifier` |
| Training data | `supply_chain_disruption_prepared.csv` (5 000 records) |
| Target | Disruption risk level (multi-class) |
| Metrics | Genuine cross-validated accuracy from training pipeline |
| Training script | `scripts/prepare_rf_dataset.py` |
| Inference | `app/services/ai_telemetry_engine.py` |

### 4.2 Gradient Boosting Delay Predictor — REAL / TRAINED

| Property | Value |
|---|---|
| Artifact | `app/ml/models/gb_delay_model.pkl` (364 KB) |
| Library | scikit-learn `GradientBoostingRegressor` |
| Training data | `supply_chain_disruption_prepared.csv` (same CSV) |
| Features | 5 selected features, no target leakage |
| Target | Delay duration (regression) |
| Training script | Same dataset, leak-free pipeline |
| Inference | `app/services/ai_telemetry_engine.py` |

### 4.3 Isolation Forest Anomaly Detector — REAL / TRAINED (unsupervised)

| Property | Value |
|---|---|
| Artifact | `app/ml/models/isolation_forest_model.pkl` (1.1 MB) |
| Library | scikit-learn `IsolationForest` |
| Training data | 897 real AIS vessel records from PostgreSQL (`vessels` table) |
| Features | `latitude`, `longitude`, `speed`, `heading`, `course` |
| Use | Flags anomalous vessel behaviour at inference |
| Inference | `app/services/ai_telemetry_engine.py` |

### 4.4 LSTM ETA Predictor — HEURISTIC (NOT TRAINED)

| Property | Value |
|---|---|
| Artifact | None |
| Implementation type | `HEURISTIC_KINEMATIC_ETA` |
| `is_trained` | `False` |
| Reason | Insufficient sequential voyage data for LSTM training (no voyage-level time series in current dataset) |
| Current behaviour | Kinematic formula: `ETA = distance / speed` with static weather factor |

**Do NOT claim this as a trained LSTM. It is a kinematic heuristic.**

### 4.5 GNN Ripple Effect Predictor — BFS SIMULATION (NOT TRAINED)

| Property | Value |
|---|---|
| Artifact | None |
| Implementation type | `BFS_CORRIDOR_SIMULATION` |
| `is_trained` | `False` |
| Reason | No historical congestion propagation graph data available for GNN training |
| Current behaviour | BFS traversal of a static port-corridor adjacency graph |

**Do NOT claim this as a trained GNN or GCN. It is a BFS graph simulation.**

---

## 5. Optimisation Algorithms

### 5.1 NSGA-III Multi-Objective Route Optimiser — REAL

- **File:** `app/services/nsga2.py`
- Algorithm: NSGA-III (non-dominated sorting, reference-point based)
- Objectives: cost, time, carbon emissions, risk score
- Decision variables: route alternatives with associated leg costs
- Uses real route alternatives generated by the reroute pipeline
- Verified pre-existing, genuine implementation

### 5.2 Q-Learning Reroute Agent — SIMULATED ENVIRONMENT / REAL BELLMAN UPDATE

- **File:** `app/services/rl_agent.py`
- Policy artifact: `app/services/q_learning_policy.json`
- Q-table is updated with a genuine Bellman equation
- Reward function: multi-objective utility
  - Cost: 30 %
  - Time: 25 %
  - Carbon: 15 %
  - Risk: 30 %
- **Environment is synthetic** (no real voyage history replay)
- The agent explores a simulated state space, not a historically validated one

---

## 6. Security Implementation

### Authentication
- **JWT:** RS256 / HS256 signed access tokens, configurable expiry (`ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Password hashing:** Direct `bcrypt` library (`bcrypt.hashpw` / `bcrypt.checkpw`, 12 rounds). passlib is NOT used — it is incompatible with bcrypt 4.x on Python 3.12.
- **TOTP (2FA):** RFC 6238 compliant via `pyotp`. Endpoints: `/auth/totp/setup`, `/auth/totp/verify`, `/auth/totp/disable`
- **Email verification:** Token-based, dispatched via `app/services/email_service.py` (see §8)
- **Account lockout:** `failed_login_attempts` counter; `locked_until` timestamp field; locked accounts return HTTP 423

### RBAC
- Roles: `admin`, `port_manager`, `logistics_manager`
- `get_current_user()` in `app/core/security.py` enforces authentication via `ENABLE_DEMO_AUTH` gate
- When `ENABLE_DEMO_AUTH=false` (production), all protected routes return HTTP 401 without a valid JWT

### Rate Limiting
- Redis-backed fixed window rate limiting in `app/services/redis_client.py`
- Applied to authentication endpoints via middleware/dependency

### Financial Encryption (AES-256-GCM)
- **File:** `app/core/encryption.py` — `FinancialEncryptionService`
- Key: 256-bit, derived from `ENCRYPTION_KEY` env var via PBKDF2-HMAC-SHA256 (100 000 iterations, random salt per instance)
- Nonce: 12-byte cryptographic random per record (`os.urandom(12)`)
- Format: `"aes256gcm$<base64(nonce + ciphertext)>"`
- Authenticated encryption (AESGCM — ciphertext integrity guaranteed by GCM tag)
- Legacy Fernet tokens handled by fallback `else` branch for backward compatibility
- pgcrypto SQL helpers: `get_pgcrypto_encrypt_sql()` / `get_pgcrypto_decrypt_sql()` for PostgreSQL-side AES-256
- Encrypted columns in `reroute_decisions`: `encrypted_cargo_value`, `encrypted_selected_cost`, `encrypted_cost_saved`

### Audit Logging
- **Table:** `audit_logs`
- Every auth action, reroute decision, and admin operation writes a row with `user_id`, `action`, `resource`, `metadata` (JSONB), `created_at`
- Verified pre-existing, genuine implementation

---

## 7. Redis Architecture

| Component | Channel / Key | Purpose |
|---|---|---|
| `redis_client` (sync) | `rate_limit:*` | Fixed-window rate limiting |
| `redis_client` (sync) | `risk_cache:*` | Risk register result caching |
| `async_redis_client` | `fleet_updates` (publish) | Vessel position broadcast |
| `FleetUpdateManager` | `fleet_updates` (subscribe) | WebSocket fan-out |
| `reroute_channel` | `reroute_channel` | Reroute event notifications |

**Redis version note:** Local Redis does not support RESP3 (`HELLO 3` command). redis-py 5.x falls back to RESP2 automatically. This is a pre-existing environment constraint — not a regression.

---

## 8. Email Verification Service

- **File:** `app/services/email_service.py`
- Class: `EmailVerificationService`
- Transport: `smtplib` with STARTTLS, 8 s timeout
- When `SMTP_HOST` is empty (dev/test): returns `{"status": "SMTP_UNCONFIGURED", "token": "<token>"}` — the token is returned in the API response for manual verification in development
- Delivery status is written to `audit_logs.metadata` as `"email_delivery": "SMTP_UNCONFIGURED"` or `"SENT"`
- Never fabricates delivery success

---

## 9. Required Environment Variables

See `backend/.env.example` for a fully documented template. Critical variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | AES-256 encryption master key |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port (default 6379) |
| `REDIS_PASSWORD` | Redis password (optional) |
| `AISSTREAM_API_KEY` | AISStream.io live feed key |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `MAPBOX_TOKEN` | Mapbox routing/map token |
| `PORT_API_KEY` | Port data provider API key |
| `EXCHANGE_RATE_API_KEY` | Currency conversion API key |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | From address for verification emails |
| `SMTP_TLS` | Enable STARTTLS (`true`/`false`) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) |
| `ENABLE_DEMO_AUTH` | `true` bypasses JWT for local dev; `false` in production |

---

## 10. Key Dependencies

```
fastapi
uvicorn[standard]
sqlalchemy
asyncpg
psycopg2-binary
alembic           # present but not actively running migrations
redis             # sync + asyncio clients
websockets
pydantic
pydantic-settings
python-jose[cryptography]
bcrypt            # direct (passlib NOT used)
pyotp
cryptography      # AESGCM for AES-256-GCM
scikit-learn
numpy
pandas
shapely
geoalchemy2
httpx
pytest
pytest-asyncio
```

Full pinned list: `backend/requirements.txt`

---

## 11. Tests

**Test suite:** `app/tests/`

| File | Tests | Coverage |
|---|---|---|
| `test_phase1.py` | 5 | AIS→Redis→WebSocket pipeline, FleetUpdateManager singleton, WebSocket endpoint, Redis graceful failure, end-to-end broadcast |
| `test_phase2.py` | 9 | PostGIS geometry, vessel upsert, ML model loading, anomaly detection, risk classification |
| `test_phase3.py` | 6 | Reroute endpoint, NSGA-III, Q-learning policy, cost calculator, financial encryption |
| `test_phase4.py` | 5 | Auth endpoints, JWT, TOTP setup, RBAC enforcement, rate limiting |
| `test_phase5.py` | 5 | Audit logging, admin seeding, email service, disruption endpoints, risk register |

**Final result (last run):**
```
============================= 30 passed, 34 warnings in 41.30s ==============================
```

Run tests:
```powershell
cd freight-disruption-system/backend
.\venv\Scripts\python -m pytest -v
```

---

## 12. Remaining Blockers (Cannot Be Genuinely Completed)

The following original requirements could not be fulfilled due to hard environment or data constraints. They are documented here honestly.

| Requirement | Reason | Current State |
|---|---|---|
| **TimescaleDB** | No binary available for PostgreSQL 18 on Windows | B-Tree index on `vessel_positions.recorded_at` used instead |
| **LSTM ETA Predictor** | No sequential voyage time-series data exists in the dataset | `HEURISTIC_KINEMATIC_ETA`, `is_trained=False` |
| **GNN Ripple Predictor** | No historical congestion propagation graph data available | `BFS_CORRIDOR_SIMULATION`, `is_trained=False` |
| **SMTP Email Dispatch** | No SMTP server configured in environment | Returns `SMTP_UNCONFIGURED` + token in API response; wire `SMTP_*` env vars to enable |
| **NGA ASAM Piracy API** | Remote API returns HTTP 503 from this environment | Static piracy risk baseline used; live feed cannot be verified |

---

## 13. What the Audit Confirmed as Pre-Existing and Genuine (Not Modified)

- PostGIS extension and spatial columns (prior session)
- NSGA-III multi-objective optimiser
- Audit logging table and write path
- TOTP (RFC 6238, pyotp)
- Redis-backed rate limiting
- JWT authentication framework
- Monte Carlo simulation engine

---

## 14. Files Created / Significantly Modified This Remediation

| File | Action | Summary |
|---|---|---|
| `app/services/fleet_update_manager.py` | Created | Redis Pub/Sub → WebSocket singleton broadcaster |
| `app/routers/websocket.py` | Created | `/ws/fleet` WebSocket endpoint |
| `app/services/email_service.py` | Created | SMTP email verification with honest unconfigured status |
| `app/core/encryption.py` | Rewritten | AES-256-GCM (AESGCM), PBKDF2 key derivation, per-record nonces, Fernet fallback |
| `app/core/security.py` | Modified | Replaced passlib with direct `bcrypt` library |
| `app/core/config.py` | Modified | Added SMTP settings |
| `app/routers/auth.py` | Modified | Wired email service into registration and resend-verification |
| `app/models/reroute.py` | Modified | Added 3 encrypted financial columns |
| `app/routers/reroute.py` | Modified | Populates encrypted columns on decision creation |
| `app/database.py` | Modified | DDL migrations for encrypted columns |
| `app/services/redis_client.py` | Modified | Added async Pub/Sub client and `publish_fleet_update()` |
| `app/services/vessel_handler.py` | Modified | Publishes to Redis after PostgreSQL commit |
| `app/services/currency_service.py` | Modified | Replaced Unicode symbols with ASCII (Windows cp1252 fix) |
| `app/tests/test_phase1.py` | Modified | Added end-to-end WebSocket broadcast test |
| `.env` | Fixed | Separated concatenated `ALLOWED_ORIGINS` and `ENABLE_DEMO_AUTH` lines |
| `.env.example` | Created | Full documented environment variable template |
