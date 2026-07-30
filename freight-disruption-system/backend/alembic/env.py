# backend/alembic/env.py
from logging.config import fileConfig
from sqlalchemy import create_engine
from sqlalchemy import pool
from alembic import context
import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import Base and all models so autogenerate can detect them
from app.database import Base
from app.models import (
    User, PortManager, Vessel, Port,
    BerthSlot, PortCongestionHistory, VesselArrival, PortDisruption
)

# Set target metadata for autogenerate support
target_metadata = Base.metadata

# Load database URL from .env — store it directly (do NOT pass through
# configparser/set_main_option because configparser treats '%' as interpolation
# syntax and will raise ValueError on URL-encoded characters like %40).
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Ss%4020052607@localhost:5432/freight_db"
)

# PostGIS system tables that Alembic should never touch
POSTGIS_TABLES = {
    "spatial_ref_sys",
    "geometry_columns",
    "geography_columns",
    "raster_columns",
    "raster_overviews",
}

def include_object(object, name, type_, reflected, compare_to):
    """Exclude PostGIS system tables from autogenerate."""
    if type_ == "table" and name in POSTGIS_TABLES:
        return False
    return True



def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DB connection needed)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (live DB connection)."""
    # Create engine directly from the env URL to avoid configparser % interpolation issues
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()