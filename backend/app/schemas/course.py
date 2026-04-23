from pydantic import BaseModel
from typing import Optional, List
import uuid
from app.models.course import ClassStatus, ConsultaStatus
from datetime import datetime
from app.schemas.user import UserRead

class EntregaBase(BaseModel):
    content: str
    tarea_id: int

class EntregaCreate(EntregaBase):
    pass

class EntregaRead(EntregaBase):
    id: int
    user_id: uuid.UUID
    grade: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True

class TareaBase(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    due_date: Optional[datetime] = None
    clase_id: int

class TareaRead(TareaBase):
    id: int
    created_at: datetime
    my_submission: Optional[EntregaRead] = None

    class Config:
        from_attributes = True

class LibroBase(BaseModel):
    title: str
    author: str
    category: str
    cover_url: Optional[str] = None
    file_url: str
    description: Optional[str] = None

class LibroCreate(LibroBase):
    pass

class LibroRead(LibroBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ConsultaBase(BaseModel):
    question: str
    clase_id: int

class ConsultaCreate(ConsultaBase):
    pass

class ConsultaAnswer(BaseModel):
    answer: str

class ConsultaRead(ConsultaBase):
    id: int
    answer: Optional[str] = None
    status: ConsultaStatus
    created_at: datetime
    student: Optional[UserRead] = None

    class Config:
        from_attributes = True

class ClaseBase(BaseModel):
    title: str
    status: ClassStatus = ClassStatus.SCHEDULED
    external_video_id: Optional[str] = None

class ClaseCreate(ClaseBase):
    bloque_id: int
    scheduled_at: Optional[datetime] = None

class ClaseRead(ClaseBase):
    id: int
    video_url: Optional[str] = None
    room_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    is_completed: Optional[bool] = None
    tareas: List[TareaRead] = []
    consultas: List[ConsultaRead] = []

    class Config:
        from_attributes = True

class BloqueBase(BaseModel):
    name: str
    materia_id: int

class BloqueRead(BloqueBase):
    id: int
    clases: List[ClaseRead] = []

    class Config:
        from_attributes = True

class MateriaBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None

class MateriaRead(MateriaBase):
    id: int
    created_at: datetime
    is_enrolled: Optional[bool] = None
    progress: Optional[int] = 0

    class Config:
        from_attributes = True

class MateriaDetail(MateriaRead):
    bloques: List[BloqueRead] = []

class EnrollmentCreate(BaseModel):
    materia_id: int

class EnrollmentRead(BaseModel):
    id: int
    user_id: uuid.UUID
    materia_id: int
    is_active: bool
    created_at: datetime
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True
