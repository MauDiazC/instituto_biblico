import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, Role
from app.schemas.user import TokenData
from app.services.user_service import user_service
import uuid

security = HTTPBearer()

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, Role
from app.schemas.user import TokenData
from app.services.user_service import user_service
import uuid
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

security = HTTPBearer()

# Supabase Public JWK for ES256 (from your input)
SUPABASE_JWK = {
  "x": "rz77_mxP0BJ_Fxi3PXJUlNy9VKmWkWt1Ti8rvXw5V6g",
  "y": "YoJRQQQk8Ea4RQ_qwTETTOXN1DQhkTtraogLeHFBA3Q",
  "crv": "P-256"
}

def get_supabase_public_key():
    """Converts the JWK components into a PEM public key for ES256."""
    try:
        def b64_decode(s):
            padding = '=' * (4 - len(s) % 4)
            return base64.urlsafe_b64decode(s + padding)

        x = int.from_bytes(b64_decode(SUPABASE_JWK["x"]), "big")
        y = int.from_bytes(b64_decode(SUPABASE_JWK["y"]), "big")
        
        # Create public key using cryptography
        numbers = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1())
        public_key = numbers.public_key()
        
        return public_key
    except Exception as e:
        print(f"DEBUG: Error building public key: {e}")
        return settings.SUPABASE_JWT_SECRET

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        header = jwt.get_unverified_header(token.credentials)
        alg = header.get("alg")
        
        # Use Public Key for ES256, Secret for HS256
        key = get_supabase_public_key() if alg == "ES256" else settings.SUPABASE_JWT_SECRET
        
        payload = jwt.decode(
            token.credentials,
            key,
            algorithms=["ES256", "HS256"],
            audience="authenticated"
        )
        
        uid: str = payload.get("sub")
        email: str = payload.get("email")
        
        if uid is None:
            raise credentials_exception
            
        token_data = TokenData(sub=uuid.UUID(uid), email=email)
    except jwt.PyJWTError as e:
        print(f"DEBUG: JWT Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"DEBUG: Unexpected Auth Error: {e}")
        raise credentials_exception
        
    # Sync user in local DB
    user = user_service.get_or_create_user(db, token_data, payload)
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: list[Role]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges"
            )
        return user
