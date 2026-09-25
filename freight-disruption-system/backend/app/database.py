# backend/app/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session 
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,        # Connection pool size
    max_overflow=20      # Max connections beyond pool_size
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables and run lightweight migrations for new columns"""
    import app.models  # Ensure all models are registered with Base.metadata
    Base.metadata.create_all(bind=engine)

    # Safely ensure new columns exist in pre-existing PostgreSQL tables
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ports ADD COLUMN IF NOT EXISTS congestion_updated_by VARCHAR;"))
        conn.execute(text("ALTER TABLE ports ADD COLUMN IF NOT EXISTS congestion_updated_at TIMESTAMP WITH TIME ZONE;"))
        conn.execute(text("ALTER TABLE ports ADD COLUMN IF NOT EXISTS congestion_source VARCHAR DEFAULT 'api';"))
        conn.execute(text("ALTER TABLE vessel_arrivals ADD COLUMN IF NOT EXISTS atd TIMESTAMP WITH TIME ZONE;"))
        
        # Migrations for vessels table
        conn.execute(text("ALTER TABLE vessels ADD COLUMN IF NOT EXISTS dwt DOUBLE PRECISION DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE vessels ADD COLUMN IF NOT EXISTS current_port VARCHAR;"))
        conn.execute(text("ALTER TABLE vessels ADD COLUMN IF NOT EXISTS last_ais_update_str VARCHAR DEFAULT 'Just now';"))
        conn.execute(text("ALTER TABLE vessels ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))

        # Migrations for users table
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR DEFAULT '';"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR DEFAULT 'Operations';"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_port VARCHAR DEFAULT 'Global Control HQ';"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login VARCHAR DEFAULT 'Just now';"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status_label VARCHAR DEFAULT 'Active';"))

    # Seed Default Admin User if not present
    db = SessionLocal()
    try:
        from app.models import User
        admin_user = db.query(User).filter(User.role == "admin").first()
        if not admin_user:
            from app.core.security import get_password_hash
            default_admin = User(
                username="admin",
                email="admin@freightfirewall.com",
                hashed_password=get_password_hash("adminpassword123"),
                full_name="System Administrator",
                role="admin",
                is_active=True
            )
            db.add(default_admin)
            db.commit()
            print("[DB] Default Admin user created: admin / adminpassword123")
            
        # Seed Admin Datasets (Vessels, Logs, Disruptions, System Cards, Error Logs)
        from app.services.admin_seeding import seed_admin_datasets
        seed_admin_datasets(db)
        
    except Exception as e:
        db.rollback()
        print(f"[DB] Error seeding default admin and datasets: {e}")
    finally:
        db.close()

    print("[DB] Database tables initialized and schemas migrated successfully")

def seed_sample_reroute_decisions(db: Session):
    """Seed sample reroute decisions for dashboard demo"""
    from app.models.reroute import RerouteDecision
    from app.models.users import User
    from app.models.ports import Port
    from app.models.vessels import Vessel
    from datetime import datetime, timedelta
    import random
    
    # Check if decisions already exist
    existing = db.query(RerouteDecision).first()
    if existing:
        print("[DB] Sample reroute decisions already seeded")
        return
    
    admin_user = db.query(User).filter(User.role == "admin").first()
    if not admin_user:
        print("[DB] Admin user not found, skipping reroute decision seeding")
        return
    
    ports = db.query(Port).limit(10).all()
    vessels = db.query(Vessel).limit(10).all()
    
    if not ports or not vessels:
        print("[DB] Insufficient ports or vessels for seeding")
        return
    
    sample_decisions = [
        {
            "selected_route_name": "Cape of Good Hope Deepsea Bypass (Shanghai → Rotterdam)",
            "original_cost_usd": 2450000.0,
            "selected_cost_usd": 1875000.0,
            "original_time_days": 42.5,
            "selected_time_days": 35.2,
            "cost_saved_usd": 575000.0,
            "time_saved_days": 7.3,
            "cargo_type": "High-Tech Consumer Electronics",
            "cargo_value_usd": 48000000.0,
            "corridor_name": "EURASIAN MARITIME & MULTIMODAL CORRIDOR",
        },
        {
            "selected_route_name": "Trans-Pacific Sea-Air via Anchorage (Shanghai → LA)",
            "original_cost_usd": 1850000.0,
            "selected_cost_usd": 2250000.0,
            "original_time_days": 28.0,
            "selected_time_days": 12.5,
            "cost_saved_usd": -400000.0,  # Paid premium for speed
            "time_saved_days": 15.5,
            "cargo_type": "Pharmaceuticals & Cold Chain",
            "cargo_value_usd": 62000000.0,
            "corridor_name": "TRANS-PACIFIC MARITIME & INTERMODAL CORRIDOR",
        },
        {
            "selected_route_name": "TEN-T Electrified Freight Block Train (Hamburg → Rotterdam)",
            "original_cost_usd": 185000.0,
            "selected_cost_usd": 142000.0,
            "original_time_days": 3.5,
            "selected_time_days": 2.8,
            "cost_saved_usd": 43000.0,
            "time_saved_days": 0.7,
            "cargo_type": "Automotive Parts & Assemblies",
            "cargo_value_usd": 12000000.0,
            "corridor_name": "INTRA-EUROPE SHORT-SEA & RAIL NETWORK",
        },
    ]
    
    for i, sample in enumerate(sample_decisions):
        decision = RerouteDecision(
            user_id=admin_user.id,
            organization_id="demo-org-001",
            origin_port_id=random.choice(ports).id,
            destination_port_id=random.choice(ports).id,
            vessel_id=random.choice(vessels).id,
            cargo_type=sample["cargo_type"],
            cargo_value_usd=sample["cargo_value_usd"],
            priority="Balanced",
            original_route_name="Deterministic Shortest Path",
            original_cost_usd=sample["original_cost_usd"],
            original_time_days=sample["original_time_days"],
            selected_route_id=f"demo-route-{i+1}",
            selected_route_name=sample["selected_route_name"],
            selected_cost_usd=sample["selected_cost_usd"],
            selected_time_days=sample["selected_time_days"],
            selected_risk_level="low",
            selected_confidence_score=92.5,
            cost_saved_usd=sample["cost_saved_usd"],
            time_saved_days=sample["time_saved_days"],
            carbon_reduced_tons=random.uniform(50, 200),
            corridor_name=sample["corridor_name"],
            rationale="AI-recommended optimal reroute based on multi-objective optimization",
            decision_status="confirmed",
            decision_confirmed=True,
            alert_timestamp=datetime.utcnow() - timedelta(days=random.randint(5, 30)),
            decision_timestamp=datetime.utcnow() - timedelta(days=random.randint(1, 25)),
            mc_simulations_run=2000,
            optimization_algorithm="NSGA-II + Monte Carlo"
        )
        db.add(decision)
    
    db.commit()
    print(f"[DB] Seeded {len(sample_decisions)} sample reroute decisions")
