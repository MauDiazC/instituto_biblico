from celery import Celery
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.course import Clase, ClassStatus

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def update_class_video_task(clase_id: int, video_url: str):
    """
    Background task to update a class video URL.
    Only sets status to RECORDED and clears room_url if class is not currently LIVE.
    """
    db = SessionLocal()
    try:
        clase = db.query(Clase).filter(Clase.id == clase_id).first()
        if clase:
            clase.video_url = video_url
            if clase.status != ClassStatus.LIVE:
                clase.status = ClassStatus.RECORDED
                clase.room_url = None  # Limpiamos el link de la sala solo si ya finalizó
            db.commit()
            return f"Success: Class {clase_id} updated with video {video_url}"
        return f"Error: Class {clase_id} not found"
    except Exception as e:
        db.rollback()
        return f"Error updating class {clase_id}: {str(e)}"
    finally:
        db.close()
