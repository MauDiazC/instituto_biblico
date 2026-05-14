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
    Processes VideoSDK (V1/V2) and Daily.co webhooks.
    """
    print(f"WEBHOOK RECEIVED: {payload}")
    
    # 1. Handle Daily.co Webhook
    if payload.get("action") == "recording.ready-to-download":
        data = payload.get("data", {})
        room_name = data.get("room_name")
        download_link = data.get("download_link")
        
        if room_name and room_name.startswith("class-"):
            try:
                class_id = int(room_name.split("-")[1])
                update_class_video_task.delay(class_id, download_link)
                return {"status": "success", "message": f"Class {class_id} queued for update"}
            except (IndexError, ValueError):
                pass

    # 2. Handle VideoSDK Webhooks (Support V1 'event' and V2 'webhookType')
    event_type = payload.get("event") or payload.get("webhookType")
    data = payload.get("data", {})
    
    # Common VideoSDK recording events
    recording_events = ["recording.ready", "recording-stopped", "RECORDING_STOPPED"]
    
    if event_type in recording_events:
        # Try to extract fields from different possible locations
        external_id = data.get("video_id") or data.get("recordingId") or data.get("id")
        video_url = data.get("url") or data.get("fileUrl") or data.get("downloadUrl")
        meeting_id = data.get("meetingId")
        
        print(f"VIDEOSDK WEBHOOK: event={event_type}, meetingId={meeting_id}, url={video_url}")

        if not video_url:
            print("VIDEOSDK WEBHOOK: No video URL found in payload")
            return {"status": "ignored", "reason": "no_url"}

        clase = None
        # Priority 1: Find by meetingId (room_url)
        if meeting_id:
            clase = db.query(Clase).filter(Clase.room_url == meeting_id).first()
        
        # Priority 2: Find by external_video_id
        if not clase and external_id:
            clase = db.query(Clase).filter(Clase.external_video_id == external_id).first()
            
        if clase:
            # Update external_id if missing
            if not clase.external_video_id:
                clase.external_video_id = external_id
                db.commit()
                
            # Trigger Celery Task
            update_class_video_task.delay(clase.id, video_url)
            return {"status": "success", "message": f"Class {clase.id} queued for update"}
        else:
            print(f"VIDEOSDK WEBHOOK: No class found for meetingId {meeting_id}")
    
    return {"status": "ignored"}
