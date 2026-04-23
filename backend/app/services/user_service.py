from sqlalchemy.orm import Session
from app.models.user import User, Role
from app.schemas.user import TokenData
import uuid

class UserService:
    @staticmethod
    def get_or_create_user(db: Session, token_data: TokenData, raw_payload: dict) -> User:
        user = db.query(User).filter(User.id == token_data.sub).first()
        
        if not user:
            # Extract metadata from Supabase token payload
            user_metadata = raw_payload.get("user_metadata", {})
            full_name = user_metadata.get("full_name") or user_metadata.get("name")
            avatar_url = user_metadata.get("avatar_url") or user_metadata.get("picture")
            
            # Get role from metadata, fallback to STUDENT
            raw_role = user_metadata.get("role", "student")
            try:
                assigned_role = Role(raw_role)
            except ValueError:
                assigned_role = Role.STUDENT
            
            # Determine provider
            app_metadata = raw_payload.get("app_metadata", {})
            provider = app_metadata.get("provider", "email")
            
            user = User(
                id=token_data.sub,
                email=token_data.email,
                full_name=full_name,
                avatar_url=avatar_url,
                role=assigned_role,
                provider=provider,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user

user_service = UserService()
