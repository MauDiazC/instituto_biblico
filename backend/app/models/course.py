from typing import Optional, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum, ForeignKey, UUID, DateTime
import enum
import uuid
from datetime import datetime
from .base import Base, TimestampMixin

class ClassStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    PROCESSING = "PROCESSING"
    RECORDED = "RECORDED"

class ConsultaStatus(str, enum.Enum):
    PENDING = "PENDING"
    ANSWERED = "ANSWERED"

class Enrollment(Base, TimestampMixin):
    __tablename__ = "enrollments"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    materia_id: Mapped[int] = mapped_column(ForeignKey("materias.id", ondelete="CASCADE"))
    is_active: Mapped[bool] = mapped_column(default=True)

    user: Mapped["User"] = relationship("User")
    materia: Mapped["Materia"] = relationship("Materia", back_populates="enrollments")

class Materia(Base, TimestampMixin):
    __tablename__ = "materias"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[Optional[str]] = mapped_column(String)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String)
    
    bloques: Mapped[List["Bloque"]] = relationship("Bloque", back_populates="materia", cascade="all, delete-orphan")
    enrollments: Mapped[List["Enrollment"]] = relationship("Enrollment", back_populates="materia", cascade="all, delete-orphan")

class Bloque(Base, TimestampMixin):
    __tablename__ = "bloques"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    materia_id: Mapped[int] = mapped_column(ForeignKey("materias.id", ondelete="CASCADE"))
    
    materia: Mapped["Materia"] = relationship("Materia", back_populates="bloques")
    clases: Mapped[List["Clase"]] = relationship("Clase", back_populates="bloque", cascade="all, delete-orphan")

class Tarea(Base, TimestampMixin):
    __tablename__ = "tareas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(String)
    file_url: Mapped[Optional[str]] = mapped_column(String)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    clase_id: Mapped[int] = mapped_column(ForeignKey("clases.id", ondelete="CASCADE"))

    clase: Mapped["Clase"] = relationship("Clase", back_populates="tareas")
    entregas: Mapped[List["Entrega"]] = relationship("Entrega", back_populates="tarea", cascade="all, delete-orphan")

class Entrega(Base, TimestampMixin):
    __tablename__ = "entregas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    content: Mapped[str] = mapped_column(String) # URL or text
    grade: Mapped[Optional[int]] = mapped_column()
    feedback: Mapped[Optional[str]] = mapped_column(String)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas.id", ondelete="CASCADE"))

    user: Mapped["User"] = relationship("User")
    tarea: Mapped["Tarea"] = relationship("Tarea", back_populates="entregas")

class Libro(Base, TimestampMixin):
    __tablename__ = "libros"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    author: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100))
    cover_url: Mapped[Optional[str]] = mapped_column(String)
    file_url: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String)

class Clase(Base, TimestampMixin):
    __tablename__ = "clases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[ClassStatus] = mapped_column(Enum(ClassStatus), default=ClassStatus.SCHEDULED)
    video_url: Mapped[Optional[str]] = mapped_column(String)
    room_url: Mapped[Optional[str]] = mapped_column(String)
    external_video_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    bloque_id: Mapped[int] = mapped_column(ForeignKey("bloques.id", ondelete="CASCADE"))
    
    bloque: Mapped["Bloque"] = relationship("Bloque", back_populates="clases")
    tareas: Mapped[List["Tarea"]] = relationship("Tarea", back_populates="clase", cascade="all, delete-orphan")
    consultas: Mapped[List["Consulta"]] = relationship("Consulta", back_populates="clase", cascade="all, delete-orphan")
    completions: Mapped[List["ClaseCompletada"]] = relationship("ClaseCompletada", back_populates="clase", cascade="all, delete-orphan")

class ClaseCompletada(Base, TimestampMixin):
    __tablename__ = "clases_completadas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    clase_id: Mapped[int] = mapped_column(ForeignKey("clases.id", ondelete="CASCADE"))

    user: Mapped["User"] = relationship("User")
    clase: Mapped["Clase"] = relationship("Clase", back_populates="completions")

class Consulta(Base, TimestampMixin):
    __tablename__ = "consultas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question: Mapped[str] = mapped_column(String)
    answer: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[ConsultaStatus] = mapped_column(Enum(ConsultaStatus), default=ConsultaStatus.PENDING)
    
    clase_id: Mapped[int] = mapped_column(ForeignKey("clases.id", ondelete="CASCADE"))
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    clase: Mapped["Clase"] = relationship("Clase", back_populates="consultas")
    student: Mapped["User"] = relationship("User")
