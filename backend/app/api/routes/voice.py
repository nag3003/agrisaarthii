from fastapi import APIRouter, UploadFile, File
from app.services.ai_service import AIService

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # In a real app, we'd save the file and pass the path
    # For MVP, we'll assume AIService handles the UploadFile or we mock it
    text = await AIService.transcribe_audio(file)
    return {"text": text}
