from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.ai_service import AIService
from app.services.advice_service import AdvisoryReasoningEngine
from typing import Optional

router = APIRouter()

@router.post("/query/advice")
async def text_advice(request: dict):
    """
    Text-based advice endpoint.
    Accepts { text, context } and returns actionable farming advice.
    """
    query = request.get("text", "")
    context = request.get("context", {})

    if not query:
        raise HTTPException(status_code=400, detail="Query text is required")

    result = await AdvisoryReasoningEngine.get_actionable_advice(query, context)
    return {"advice": result}
@router.post("/query/voice")
async def voice_query(
    audio: UploadFile = File(...),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None)
):
    """
    1. Transcribe Audio (Whisper)
    2. Get AI Advice (LLM)
    3. Generate Audio Response (TTS)
    """
    if not audio.filename.endswith(('.m4a', '.mp3', '.wav')):
        raise HTTPException(status_code=400, detail="Invalid audio format")

    # Step 1: Speech to Text
    query_text = await AIService.transcribe_audio(audio)
    
    # Step 2: Get Advice
    # (In real app, we would fetch weather/context based on lat/lon here)
    advice_text = await AIService.get_farming_advice(query_text)
    
    # Step 3: Text to Speech
    audio_url = await AIService.generate_audio_response(advice_text)
    
    return {
        "query_text": query_text,
        "response_text": advice_text,
        "audio_url": audio_url,
        "actions": ["Spray Mancozeb", "Reduce Watering"] # Mocked actionable chips
    }

@router.post("/diagnosis")
async def crop_diagnosis(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    description: Optional[str] = Form(None)
):
    """
    Analyze crop image for disease using AI Service
    """
    if not image and not image_url:
        raise HTTPException(status_code=400, detail="Either image or image_url must be provided")

    # Delegate to AI Service which uses the Intelligence module
    # Pass description to AI service if it's provided
    result = await AIService.analyze_crop_image(image, image_url=image_url, description=description)
    
    # Add audio explanation URL (mocked for now as per service logic)
    result["audio_explanation"] = await AIService.generate_audio_response(result.get("remedy", "No remedy available"))
    
    return result
