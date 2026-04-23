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
    Background task to update a class status to RECORDED and set the video URL.
    """
    db = SessionLocal()
    try:
        clase = db.query(Clase).filter(Clase.id == clase_id).first()
        if clase:
            clase.status = ClassStatus.RECORDED
            clase.video_url = video_url
            clase.room_url = None  # Limpiamos el link de la sala en vivo
            db.commit()
            return f"Success: Class {clase_id} updated with video {video_url}"
        return f"Error: Class {clase_id} not found"
    except Exception as e:
        db.rollback()
        return f"Error updating class {clase_id}: {str(e)}"
    finally:
        db.close()
