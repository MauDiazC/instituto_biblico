from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
import redis
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    health_status = {"status": "healthy", "components": {}}
    
    # Check Database
    try:
        db.execute(text("SELECT 1"))
        health_status["components"]["database"] = "UP"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["components"]["database"] = f"DOWN: {str(e)}"
    
    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        health_status["components"]["redis"] = "UP"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["components"]["redis"] = f"DOWN: {str(e)}"
        
    return health_status
