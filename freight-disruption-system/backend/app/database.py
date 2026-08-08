# backend/app/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
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