from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from app.models.course import Clase, ClassStatus
from app.core.database import get_db
from app.core.config import settings
from app.core.celery import update_class_video_task
from typing import Optional
import hmac
import hashlib

router = APIRouter()

# ... (verify_signature logic remains the same)

@router.post("/video-webhook")
async def video_webhook(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Processes 'recording.ready' or Daily.co 'recording.ready-to-download' events.
    Sends them to background processing via Celery.
    """
    # 1. Handle Daily.co Webhook
    if payload.get("action") == "recording.ready-to-download":
        data = payload.get("data", {})
        room_name = data.get("room_name")
        download_link = data.get("download_link")
        
        if room_name and room_name.startswith("class-"):
            try:
                class_id = int(room_name.split("-")[1])
                # Trigger Celery Task instead of direct update
                update_class_video_task.delay(class_id, download_link)
                return {"status": "success", "message": f"Class {class_id} queued for background update"}
            except (IndexError, ValueError):
                pass

    # 2. Handle generic video-sdk recording.ready
    event_type = payload.get("event")
    data = payload.get("data", {})
    
    if event_type == "recording.ready":
        external_id = data.get("video_id")
        video_url = data.get("url")
        
        clase = db.query(Clase).filter(Clase.external_video_id == external_id).first()
        if clase:
            # Trigger Celery Task
            update_class_video_task.delay(clase.id, video_url)
            return {"status": "success", "message": f"Class {clase.id} queued for background update"}
    
    return {"status": "ignored"}
