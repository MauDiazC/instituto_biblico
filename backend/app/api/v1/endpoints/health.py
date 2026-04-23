from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
import time

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Comprehensive health check to verify API and Database connectivity.
    """
    start_time = time.time()
    try:
        # Verify database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "online",
        "database": db_status,
        "timestamp": time.time(),
        "latency_seconds": time.time() - start_time
    }

@router.get("/")
async def liveness_probe():
    """
    Minimal root endpoint for Railway Liveness Probe.
    Returns 200 immediately to show the process is running.
    """
    return {"status": "alive", "message": "Sacred Archive API is running"}
