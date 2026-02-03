from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel

class RequestValidator:
    @staticmethod
    def validate_audio_format(filename: str):
        allowed = ["wav", "mp3", "m4a", "ogg"]
        if not filename.split(".")[-1].lower() in allowed:
            raise HTTPException(status_code=400, detail="Invalid audio format")

class LanguageDetector:
    @staticmethod
    async def detect(text: str) -> str:
        # Mock: In production, use a fast model like LangID or a specific Indic model
        return "hi" # Defaulting to Hindi for MVP

class ContextBuilder:
    @staticmethod
    def build(user_profile: Dict, location: Dict, weather: Dict) -> Dict:
        return {
            "crop": user_profile.get("primary_crops", ["General"]),
            "location": f"{location.get('district', 'Unknown')}, {location.get('state', 'India')}",
            "season": "Rabi", # Mock logic for season mapping
            "weather_condition": weather.get("condition", "clear")
        }

class ResponseFormatter:
    @staticmethod
    def format(text: str, audio_url: Optional[str] = None) -> Dict:
        return {
            "response_text": text,
            "response_audio": audio_url,
            "timestamp": "2024-01-20T10:00:00Z"
        }

class ErrorHandler:
    @staticmethod
    def handle(error: Exception):
        # Log error and return user-friendly message
        print(f"System Error: {str(error)}")
        return {"error": "Our system is resting. Please try speaking again in a minute."}
