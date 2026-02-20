from fastapi import APIRouter, UploadFile, File
from app.services.ai_service import AIService

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    print(f"[Voice API] Received file: {file.filename}, Content-Type: {file.content_type}")
    text = await AIService.transcribe_audio(file)
    print(f"[Voice API] Transcription result: {text}")
    return {"text": text}
