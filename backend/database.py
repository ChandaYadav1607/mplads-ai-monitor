
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Find the main project directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Local SQLite database path
DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(exist_ok=True)

DATABASE_PATH = DATABASE_DIR / "mplads.db"

# Read database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Use SQLite locally if no DATABASE_URL is configured
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

# Database engine configuration
connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

# Database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for database models
Base = declarative_base()
