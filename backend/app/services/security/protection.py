from jose import jwt
from datetime import datetime, timedelta
from app.core.config import settings

class AuthManager:
    SECRET_KEY = "agri-secret-key"
    ALGORITHM = "HS256"

    @staticmethod
    def create_token(data: dict):
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=30)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, AuthManager.SECRET_KEY, algorithm=AuthManager.ALGORITHM)

class InputSanitizer:
    @staticmethod
    def sanitize(text: str) -> str:
        # Prevent injection/abuse
        return text.strip()[:500]
