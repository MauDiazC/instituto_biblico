from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum, Boolean, UUID
import enum
import uuid
from .base import Base

class Role(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class User(Base):
    __tablename__ = "users"

    # id matches Supabase Auth UID (UUID)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    avatar_url: Mapped[Optional[str]] = mapped_column(String)
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.STUDENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    provider: Mapped[Optional[str]] = mapped_column(String(50)) # e.g., 'email', 'google'
