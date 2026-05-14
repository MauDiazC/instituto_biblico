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
        room_id = data.get("roomId")
        custom_room_id = data.get("customRoomId")
        
        print(f"VIDEOSDK WEBHOOK: event={event_type}, recId={external_id}, meetingId={meeting_id}, roomId={room_id}, customId={custom_room_id}")

        if not video_url:
            print("VIDEOSDK WEBHOOK: No video URL found in payload")
            # If we don't have URL yet, we might still want to match and mark as processing
            # But for now, we follow the current logic of ignoring
            return {"status": "ignored", "reason": "no_url"}

        clase = None
        # Priority 1: Find by customRoomId (class-ID)
        if custom_room_id and custom_room_id.startswith("class-"):
            try:
                class_id = int(custom_room_id.split("-")[1])
                clase = db.query(Clase).filter(Clase.id == class_id).first()
                if clase: print(f"VIDEOSDK WEBHOOK: Matched by customRoomId: {custom_room_id}")
            except (IndexError, ValueError):
                pass

        # Priority 2: Find by roomId (stored in room_url)
        if not clase and room_id:
            clase = db.query(Clase).filter(Clase.room_url == room_id).first()
            if clase: print(f"VIDEOSDK WEBHOOK: Matched by roomId: {room_id}")
            
        # Priority 3: Find by meetingId (just in case)
        if not clase and meeting_id:
            clase = db.query(Clase).filter(Clase.room_url == meeting_id).first()
            if clase: print(f"VIDEOSDK WEBHOOK: Matched by meetingId: {meeting_id}")
        
        # Priority 4: Find by external_video_id
        if not clase and external_id:
            clase = db.query(Clase).filter(Clase.external_video_id == external_id).first()
            if clase: print(f"VIDEOSDK WEBHOOK: Matched by external_video_id: {external_id}")
            
        if clase:
            # Update external_id if missing
            if not clase.external_video_id:
                clase.external_video_id = external_id
                db.commit()
                
            # Trigger Celery Task
            update_class_video_task.delay(clase.id, video_url)
            print(f"VIDEOSDK WEBHOOK: Class {clase.id} found and update task queued")
            return {"status": "success", "message": f"Class {clase.id} queued for update"}
        else:
            print(f"VIDEOSDK WEBHOOK: No class found for meetingId {meeting_id} or roomId {room_id}")
    
    return {"status": "ignored"}
