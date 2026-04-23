from app.core.database import SessionLocal
from app.models.user import User, Role
from app.models.course import Materia
import uuid

def seed():
    db = SessionLocal()
    try:
        # 1. Create Initial Admin (Dummy UUID for seed)
        admin_id = uuid.uuid4()
        admin = db.query(User).filter(User.role == Role.ADMIN).first()
        if not admin:
            admin = User(
                id=admin_id,
                email="admin@institute.edu",
                full_name="System Admin",
                role=Role.ADMIN,
                is_active=True,
                provider="email"
            )
            db.add(admin)
            print(f"Admin created: {admin.email}")
        
        # 2. Create Sample Materia
        materia = db.query(Materia).first()
        if not materia:
            materia = Materia(
                name="Introducción a la Teología",
                description="Fundamentos bíblicos para la fe.",
                cover_image_url="https://images.unsplash.com/photo-1504052434569-70ad5836ab65"
            )
            db.add(materia)
            print(f"Sample Materia created: {materia.name}")
        
        db.commit()
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
