from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional
import uuid
from app.models.user import Role

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Role = Role.STUDENT
    is_active: bool = True

class UserRead(UserBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None

class TokenData(BaseModel):
    sub: uuid.UUID # Supabase UID
    email: Optional[EmailStr] = None
    role: Optional[str] = None
