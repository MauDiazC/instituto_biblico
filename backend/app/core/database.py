from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Optimized Engine for Cloud environments (Supabase/Railway)
engine = create_engine(
    settings.sync_database_url,
    pool_size=20,            # Maximum number of permanent connections
    max_overflow=10,        # Additional temporary connections
    pool_timeout=30,        # Seconds to wait for a connection
    pool_recycle=1800,      # Recycle connections after 30 minutes
    pool_pre_ping=True      # Check connection health before use
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
