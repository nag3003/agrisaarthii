from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services import advice_service
from app.core.registry import SkillRegistry
from app.services.ai.jarvis import JarvisEngine
from app.services.ai.skills import (
    get_current_time, 
    tell_joke, 
    search_wikipedia, 
    play_youtube_video, 
    who_is,
    get_market_prices,
    get_weather,
    get_crop_advice
)

# Initialize Jarvis with Skills
registry = SkillRegistry()
registry.register_skill(get_current_time)
registry.register_skill(tell_joke)
registry.register_skill(search_wikipedia)
registry.register_skill(play_youtube_video)
registry.register_skill(who_is)
registry.register_skill(get_market_prices)
registry.register_skill(get_weather)
registry.register_skill(get_crop_advice)

jarvis = JarvisEngine(registry)

router = APIRouter()

class QueryRequest(BaseModel):
    text: str

@router.post("/jarvis")
async def ask_jarvis(request: QueryRequest):
    """
    Endpoint for Jarvis AI Assistant with Tools/Skills.
    """
    try:
        response = await jarvis.run_conversation(request.text)
        return {"response": response}
    except Exception as e:
        return {"response": f"I encountered an error: {str(e)}"}

@router.post("/analyze")
async def analyze_query(request: QueryRequest):
    # Logic to identify intent (weather, mandi, crop)
    # Mocking intent analysis
    return {
        "intent": "crop_advisory",
        "entities": ["wheat", "rust disease"],
        "language": "hi"
    }

class AdviceRequest(BaseModel):
    text: str
    context: Optional[dict] = None

@router.post("/advice")
async def get_advice(request: AdviceRequest):
    # In production, this would extract text and rich context
    try:
        text = request.text
        context = request.context or {}
        advice_data = await advice_service.AdvisoryReasoningEngine.get_actionable_advice(text, context)
        return {"advice": advice_data}
    except Exception as e:
        import traceback
        print(f"Advice Endpoint Error: {e}")
        traceback.print_exc()
        return {
            "advice": {
                "id": "err_001",
                "advice": "I encountered an error processing your request. Please try again later.",
                "confidence": 0.0,
                "reasoning": str(e),
                "urgency": "Low",
                "timestamp": ""
            }
        }
