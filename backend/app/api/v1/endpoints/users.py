from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user, RoleChecker
from app.models.user import User, Role
from app.schemas.user import UserRead, UserUpdate
from app.models.course import Clase, Enrollment
from app.services.content import s3_service
from typing import List, Optional

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user profile."""
    return current_user

@router.patch("/me", response_model=UserRead)
async def update_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile information."""
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/", response_model=List[UserRead])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[Role] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN]))
):
    """Admin only: List all users with optional role filtering."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.offset(skip).limit(limit).all()

@router.patch("/{user_id}", response_model=UserRead)
async def admin_update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN]))
):
    """Admin only: Update any user (change role, deactivate, etc)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/promote", response_model=UserRead)
async def promote_to_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([Role.ADMIN]))
):
    """Admin only: Promote a user to Admin role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = Role.ADMIN
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/classes/{class_id}/access")
async def get_class_access(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a secure, temporary pre-signed URL for class video content.
    Ensures the student is enrolled before providing access.
    """
    clase = db.query(Clase).filter(Clase.id == class_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Class not found")
        
    # Security: Verify enrollment if user is a student
    # Note: Optimization would be to join Bloque and Materia to check enrollment
    materia_id = clase.bloque.materia_id
    is_enrolled = db.query(Enrollment).filter(
        Enrollment.materia_id == materia_id,
        Enrollment.user_id == current_user.id
    ).first()
    
    if not is_enrolled and current_user.role == "student":
        raise HTTPException(status_code=403, detail="Not enrolled in this subject")

    if not clase.video_url:
        raise HTTPException(status_code=400, detail="Recording not available yet")

    # Generate the temporary URL (e.g., valid for 2 hours)
    presigned_url = s3_service.generate_presigned_url(clase.video_url, expiration=7200)
    
    if not presigned_url:
        raise HTTPException(status_code=500, detail="Could not generate access link")
        
    return {"url": presigned_url}
