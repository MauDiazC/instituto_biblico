import httpx
import jwt
import time
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from app.core.config import settings
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user, RoleChecker
from app.models.user import User, Role
from app.models.course import Materia, Bloque, Clase, Enrollment, ClassStatus, Libro, Tarea, Entrega, Consulta, ConsultaStatus, ClaseCompletada
from app.schemas.course import (
    MateriaRead, MateriaBase, MateriaDetail, EnrollmentCreate, EnrollmentRead,
    BloqueBase, BloqueRead, ClaseCreate, ClaseRead,
    LibroRead, LibroCreate, TareaRead, TareaBase, EntregaRead, EntregaCreate,
    ConsultaRead, ConsultaCreate, ConsultaAnswer, StudentAssignmentRead
)
from app.schemas.common import PaginatedResponse

router = APIRouter()

@router.get("/books", response_model=List[LibroRead])
async def list_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Libro).all()

@router.post("/books", response_model=LibroRead, status_code=status.HTTP_201_CREATED)
async def create_book(
    libro_in: LibroCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    libro = Libro(**libro_in.model_dump())
    db.add(libro)
    db.commit()
    db.refresh(libro)
    return libro

@router.post("/classes/{class_id}/room", response_model=ClaseRead)
async def get_or_create_daily_room(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    clase = db.query(Clase).filter(Clase.id == class_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Si ya tiene una room_url válida de Daily.co, la retornamos
    if clase.room_url and "daily.co" in clase.room_url:
        clase.status = ClassStatus.LIVE
        db.commit()
        return clase

    if not settings.DAILY_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="DAILY_API_KEY configuration missing. Please add DAILY_API_KEY to your .env file."
        )

    async with httpx.AsyncClient() as client:
        # Create a room in Daily.co
        print(f"DAILY.CO: Creating room for class {clase.id}")
        response = await client.post(
            "https://api.daily.co/v1/rooms",
            headers={
                "Authorization": f"Bearer {settings.DAILY_API_KEY}", 
                "Content-Type": "application/json"
            },
            json={
                "name": f"class-{clase.id}-{int(time.time())}",
                "properties": {
                    "enable_chat": True,
                    "enable_screenshare": True,
                    "enable_recording": "cloud",
                    "exp": int(time.time()) + 86400  # 24 horas de validez
                }
            }
        )
        
        if response.status_code != 200 and response.status_code != 201:
            error_detail = response.text
            print(f"DAILY ERROR: {response.status_code} - {error_detail}")
            raise HTTPException(status_code=500, detail=f"Error creating Daily.co room: {error_detail}")

        room_data = response.json()
        room_url = room_data.get("url")
        
        if not room_url:
             print(f"DAILY ERROR: No url in response: {room_data}")
             raise HTTPException(status_code=500, detail="Invalid response from Daily.co")

        clase.room_url = room_url
        clase.status = ClassStatus.LIVE
        db.commit()
        db.refresh(clase)
        print(f"DAILY.CO: Room created successfully: {room_url}")
        
    return clase

@router.post("/classes/{class_id}/end")
async def end_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    clase = db.query(Clase).filter(Clase.id == class_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Class not found")
    
    clase.status = ClassStatus.RECORDED
    db.commit()
    return {"status": "success"}

@router.get("/classes/{class_id}/token")
async def get_daily_meeting_token(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    clase = db.query(Clase).filter(Clase.id == class_id).first()
    if not clase or not clase.room_url:
        raise HTTPException(status_code=404, detail="Active room not found")
        
    if "daily.co" not in clase.room_url:
        return {"token": None}
        
    room_name = clase.room_url.split("/")[-1]
    
    if not settings.DAILY_API_KEY:
        raise HTTPException(status_code=500, detail="Daily API key missing")
        
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.daily.co/v1/meeting-tokens",
            headers={
                "Authorization": f"Bearer {settings.DAILY_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "properties": {
                    "room_name": room_name,
                    "is_owner": True,
                    "user_name": current_user.full_name or "Docente"
                }
            }
        )
        if response.status_code == 200:
            token_data = response.json()
            return {"token": token_data.get("token")}
            
    return {"token": None}

@router.get("/classes/{class_id}/recording-link")
async def get_recording_link(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clase = db.query(Clase).filter(Clase.id == class_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Priority 1: Direct video URL stored in DB
    if clase.video_url:
        return {"download_link": clase.video_url}

    # Priority 2: Daily.co External ID
    if not clase.external_video_id:
        raise HTTPException(status_code=400, detail="No recording found for this class")

    if not settings.DAILY_API_KEY:
        raise HTTPException(status_code=500, detail="Daily.co API Key not configured")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.daily.co/v1/recordings/{clase.external_video_id}/access-link",
            headers={"Authorization": f"Bearer {settings.DAILY_API_KEY}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Error from Daily API: {response.text}")
            
        return response.json()

@router.post("/", response_model=MateriaRead, status_code=status.HTTP_201_CREATED)
async def create_materia(
    materia_in: MateriaBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN]))
):
    materia = Materia(**materia_in.model_dump())
    db.add(materia)
    db.commit()
    db.refresh(materia)
    return materia

@router.delete("/{materia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_materia(
    materia_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    materia = db.query(Materia).filter(Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia not found")
    
    db.delete(materia)
    db.commit()
    return None

@router.post("/blocks", response_model=BloqueRead, status_code=status.HTTP_201_CREATED)
async def create_block(
    block_in: BloqueBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN]))
):
    block = Bloque(**block_in.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block

@router.post("/classes", response_model=ClaseRead, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_in: ClaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    clase = Clase(**class_in.model_dump())
    db.add(clase)
    db.commit()
    db.refresh(clase)
    return clase

@router.post("/classes/{class_id}/assignments", response_model=TareaRead)
async def create_assignment(
    class_id: int,
    tarea_in: TareaBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    tarea = Tarea(**tarea_in.model_dump())
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return tarea

@router.post("/assignments/{tarea_id}/submit", response_model=EntregaRead)
async def submit_assignment(
    tarea_id: int,
    entrega_in: EntregaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if already submitted
    existing = db.query(Entrega).filter(
        Entrega.tarea_id == tarea_id,
        Entrega.user_id == current_user.id
    ).first()
    
    if existing:
        existing.content = entrega_in.content
        db.commit()
        db.refresh(existing)
        return existing

    entrega = Entrega(
        **entrega_in.model_dump(),
        user_id=current_user.id
    )
    db.add(entrega)
    db.commit()
    db.refresh(entrega)
    
    # Reload with user info
    return db.query(Entrega).options(joinedload(Entrega.user)).filter(Entrega.id == entrega.id).first()

@router.get("/teacher/submissions")
async def list_submissions_for_teacher(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    submissions = db.query(Entrega).options(
        joinedload(Entrega.user),
        joinedload(Entrega.tarea).joinedload(Tarea.clase).joinedload(Clase.bloque).joinedload(Bloque.materia)
    ).all()
    
    result = []
    for s in submissions:
        result.append({
            "id": s.id,
            "content": s.content,
            "grade": s.grade,
            "feedback": s.feedback,
            "created_at": s.created_at,
            "user": {
                "full_name": s.user.full_name,
                "email": s.user.email
            },
            "tarea": {
                "id": s.tarea.id,
                "title": s.tarea.title,
                "materia_name": s.tarea.clase.bloque.materia.name
            }
        })
    return result

@router.patch("/submissions/{entrega_id}/grade", response_model=EntregaRead)
async def grade_submission(
    entrega_id: int,
    grade: int = Query(..., ge=0, le=100),
    feedback: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    submission = db.query(Entrega).filter(Entrega.id == entrega_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.grade = grade
    submission.feedback = feedback
    db.commit()
    db.refresh(submission)
    return submission

@router.post("/classes/{class_id}/questions", response_model=ConsultaRead)
async def ask_question(
    class_id: int,
    consulta_in: ConsultaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    consulta = Consulta(
        **consulta_in.model_dump(),
        student_id=current_user.id
    )
    db.add(consulta)
    db.commit()
    db.refresh(consulta)
    
    # Reload with student info to avoid serialization error
    return db.query(Consulta).options(joinedload(Consulta.student)).filter(Consulta.id == consulta.id).first()

@router.get("/classes/{class_id}/questions", response_model=List[ConsultaRead])
async def list_questions_for_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Students can now see all questions for the class (including those from others)
    return db.query(Consulta).options(joinedload(Consulta.student)).filter(Consulta.clase_id == class_id).all()

@router.get("/teacher/questions")
async def list_all_questions_for_teacher(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    consultas = db.query(Consulta).options(
        joinedload(Consulta.student),
        joinedload(Consulta.clase).joinedload(Clase.bloque).joinedload(Bloque.materia)
    ).all()
    
    result = []
    for c in consultas:
        result.append({
            "id": c.id,
            "question": c.question,
            "answer": c.answer,
            "status": c.status,
            "clase_id": c.clase_id,
            "created_at": c.created_at,
            "student": {
                "full_name": c.student.full_name,
                "email": c.student.email
            },
            "clase": {
                "title": c.clase.title,
                "materia_name": c.clase.bloque.materia.name
            }
        })
    return result

@router.get("/teacher/recordings/sync")
async def sync_recordings(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    """
    Unified sync endpoint that checks both Daily.co and VideoSDK.
    """
    daily_count = 0
    videosdk_count = 0
    
    # 1. Sync Daily.co
    if settings.DAILY_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.daily.co/v1/recordings",
                    headers={"Authorization": f"Bearer {settings.DAILY_API_KEY}"},
                    timeout=10.0
                )
                if response.status_code == 200:
                    recordings = response.json().get("data", [])
                    for rec in recordings:
                        room_name = rec.get("room_name", "")
                        if room_name.startswith("class-"):
                            try:
                                class_id = int(room_name.split("-")[1])
                                clase = db.query(Clase).filter(Clase.id == class_id).first()
                                if clase and clase.status != ClassStatus.LIVE and (clase.status != ClassStatus.RECORDED or not clase.video_url):
                                    clase.status = ClassStatus.RECORDED
                                    clase.external_video_id = rec.get("id")
                                    db.commit()
                                    daily_count += 1
                            except (IndexError, ValueError): continue
        except Exception as e:
            print(f"Daily Sync Error: {str(e)}")

    # 2. Sync VideoSDK
    if settings.VIDEOSDK_API_KEY and settings.VIDEOSDK_SECRET:
        try:
            # Generate Token
            iat = int(time.time())
            exp = iat + 3600
            payload = {"apikey": settings.VIDEOSDK_API_KEY, "permissions": ["allow_join"], "iat": iat, "exp": exp, "version": 2}
            token = jwt.encode(payload, settings.VIDEOSDK_SECRET, algorithm="HS256")
            
            async with httpx.AsyncClient() as client:
                # VideoSDK: Try both V1 and V2 URLs to be safe
                urls = [
                    "https://api.videosdk.live/v2/recordings",
                    "https://api.videosdk.live/v1/meeting-recordings"
                ]
                
                for url in urls:
                    print(f"VIDEOSDK SYNC: Checking {url}")
                    response = await client.get(
                        url,
                        headers={"Authorization": token},
                        timeout=15.0
                    )
                    
                    if response.status_code == 200:
                        recordings = response.json().get("data", [])
                        print(f"VIDEOSDK SYNC: Found {len(recordings)} recordings in {url}")
                        
                        for rec in recordings:
                            recording_id = rec.get("id") or rec.get("recordingId")
                            meeting_id = rec.get("meetingId")
                            room_id = rec.get("roomId")
                            custom_room_id = rec.get("customRoomId")
                            
                            # CORRECT EXTRACTION: VideoSDK V1 puts url inside 'file' object
                            file_url = rec.get("fileUrl") or rec.get("url")
                            if not file_url and rec.get("file"):
                                file_url = rec.get("file", {}).get("fileUrl") or rec.get("file", {}).get("url")
                            
                            print(f"VIDEOSDK SYNC: Processing rec={recording_id}, meetingId={meeting_id}, roomId={room_id}, customId={custom_room_id}, has_url={bool(file_url)}")

                            if not file_url:
                                print(f"VIDEOSDK SYNC: Skipping {recording_id} - No file URL")
                                continue

                            clase = None
                            # Priority 1: Match by customRoomId (class-ID) - Most reliable
                            if custom_room_id and custom_room_id.startswith("class-"):
                                try:
                                    class_id = int(custom_room_id.split("-")[1])
                                    clase = db.query(Clase).filter(Clase.id == class_id).first()
                                    if clase: print(f"VIDEOSDK SYNC: Matched by customRoomId: {custom_room_id} -> class {clase.id}")
                                except (IndexError, ValueError): pass
                            
                            # Priority 2: Match by roomId (stored in room_url)
                            if not clase and room_id:
                                clase = db.query(Clase).filter(Clase.room_url == room_id).first()
                                if clase: print(f"VIDEOSDK SYNC: Matched by roomId: {room_id} -> class {clase.id}")

                            # Priority 3: Match by meetingId (just in case room_url stores meetingId)
                            if not clase and meeting_id:
                                clase = db.query(Clase).filter(Clase.room_url == meeting_id).first()
                                if clase: print(f"VIDEOSDK SYNC: Matched by meetingId: {meeting_id} -> class {clase.id}")

                            if clase:
                                if clase.status != ClassStatus.LIVE:
                                    if clase.status != ClassStatus.RECORDED or not clase.video_url:
                                        print(f"VIDEOSDK SYNC: Updating class {clase.id} with video {file_url}")
                                        clase.status = ClassStatus.RECORDED
                                        clase.video_url = file_url
                                        clase.external_video_id = recording_id
                                        db.commit()
                                        videosdk_count += 1
                                    else:
                                        print(f"VIDEOSDK SYNC: Class {clase.id} already has video, skipping update.")
                                else:
                                    # Class is currently LIVE, save video_url for when it ends, but DO NOT interrupt the live session
                                    print(f"VIDEOSDK SYNC: Class {clase.id} is currently LIVE. Saving video_url without ending session.")
                                    clase.video_url = file_url
                                    clase.external_video_id = recording_id
                                    db.commit()
                            else:
                                print(f"VIDEOSDK SYNC: No class found for recording {recording_id}")
                        
                        # If we found data in one URL, we can stop (usually)
                        if len(recordings) > 0:
                            break
                    else:
                        print(f"VIDEOSDK SYNC ERROR ({url}): {response.status_code} - {response.text}")
        except Exception as e:
            print(f"VideoSDK Sync Exception: {str(e)}")

    return {
        "status": "success", 
        "daily_synced": daily_count, 
        "videosdk_synced": videosdk_count,
        "total_synced": daily_count + videosdk_count
    }

@router.patch("/questions/{question_id}/answer", response_model=ConsultaRead)
async def answer_question(
    question_id: int,
    answer_in: ConsultaAnswer,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    consulta = db.query(Consulta).filter(Consulta.id == question_id).first()
    if not consulta:
        raise HTTPException(status_code=404, detail="Question not found")
    
    consulta.answer = answer_in.answer
    consulta.status = ConsultaStatus.ANSWERED
    db.commit()
    db.refresh(consulta)
    return consulta

@router.get("/student/assignments", response_model=List[StudentAssignmentRead])
async def list_student_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all assignments for courses the student is enrolled in.
    """
    # 1. Get enrolled materia IDs
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.id).all()
    materia_ids = [e.materia_id for e in enrollments]
    
    if not materia_ids:
        return []

    # 2. Get all Tareas for these materias
    # We join: Tarea -> Clase -> Bloque -> Materia
    # And left join Entrega for the current user
    results = db.query(
        Tarea, 
        Materia.name.label("materia_name"), 
        Clase.title.label("clase_title"),
        Entrega
    ).join(Clase, Tarea.clase_id == Clase.id)\
     .join(Bloque, Clase.bloque_id == Bloque.id)\
     .join(Materia, Bloque.materia_id == Materia.id)\
     .outerjoin(Entrega, (Entrega.tarea_id == Tarea.id) & (Entrega.user_id == current_user.id))\
     .filter(Materia.id.in_(materia_ids))\
     .all()
    
    assignments = []
    for tarea, mat_name, cls_title, entrega in results:
        assignments.append({
            "id": tarea.id,
            "title": tarea.title,
            "description": tarea.description,
            "due_date": tarea.due_date,
            "materia_name": mat_name,
            "clase_title": cls_title,
            "submission": entrega
        })
        
    return assignments

@router.post("/classes/{class_id}/complete")
async def toggle_class_completion(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(ClaseCompletada).filter(
        ClaseCompletada.clase_id == class_id,
        ClaseCompletada.user_id == current_user.id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "uncompleted"}
        
    completion = ClaseCompletada(clase_id=class_id, user_id=current_user.id)
    db.add(completion)
    db.commit()
    return {"status": "completed"}

@router.get("/", response_model=PaginatedResponse[MateriaRead])
async def list_materias(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    offset = (page - 1) * size
    total = db.query(func.count(Materia.id)).scalar()
    materias = db.query(Materia).offset(offset).limit(size).all()
    
    # Check enrollments and progress for the current user
    user_enrollments = db.query(Enrollment.materia_id).filter(Enrollment.user_id == current_user.id).all()
    enrolled_ids = {e[0] for e in user_enrollments}
    
    # Get completed classes IDs
    completed_ids = {c.clase_id for c in db.query(ClaseCompletada).filter(ClaseCompletada.user_id == current_user.id).all()}
    
    # Add is_enrolled and progress flag
    result = []
    for m in materias:
        # Calculate progress
        total_classes = 0
        completed_classes = 0
        for bloque in m.bloques:
            total_classes += len(bloque.clases)
            for clase in bloque.clases:
                if clase.id in completed_ids:
                    completed_classes += 1
        
        progress = int((completed_classes / total_classes) * 100) if total_classes > 0 else 0
        
        m_dict = {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "cover_image_url": m.cover_image_url,
            "created_at": m.created_at,
            "is_enrolled": m.id in enrolled_ids,
            "progress": progress
        }
        result.append(m_dict)
    
    return PaginatedResponse(
        items=result,
        total=total,
        page=page,
        size=size
    )

@router.get("/{materia_id}/students", response_model=List[EnrollmentRead])
async def list_materia_students(
    materia_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN, Role.TEACHER]))
):
    """
    Returns all enrollments for a materia with student user info.
    """
    return db.query(Enrollment).options(joinedload(Enrollment.user)).filter(Enrollment.materia_id == materia_id).all()

@router.get("/{materia_id}", response_model=MateriaDetail)
async def get_materia(
    materia_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    materia = db.query(Materia).filter(Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia not found")
    
    if current_user.role == Role.STUDENT:
        is_enrolled = db.query(Enrollment).filter(
            Enrollment.materia_id == materia_id,
            Enrollment.user_id == current_user.id
        ).first()
        if not is_enrolled:
            raise HTTPException(status_code=403, detail="Not enrolled in this subject")
            
    # Get completed classes IDs for this user
    completed_ids = {c.clase_id for c in db.query(ClaseCompletada).filter(ClaseCompletada.user_id == current_user.id).all()}
    
    # Calculate progress and set is_completed
    total_classes = 0
    completed_count = 0
    for bloque in materia.bloques:
        total_classes += len(bloque.clases)
        for clase in bloque.clases:
            clase.is_completed = clase.id in completed_ids
            if clase.is_completed:
                completed_count += 1
                
    materia.progress = int((completed_count / total_classes) * 100) if total_classes > 0 else 0
            
    return materia

@router.post("/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_in_materia(
    enroll_in: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Enrollment).filter(
        Enrollment.materia_id == enroll_in.materia_id,
        Enrollment.user_id == current_user.id
    ).first()
    
    if existing:
        return {"message": "Already enrolled"}
        
    enrollment = Enrollment(user_id=current_user.id, materia_id=enroll_in.materia_id)
    db.add(enrollment)
    db.commit()
    return {"status": "success", "message": "Enrolled successfully"}
