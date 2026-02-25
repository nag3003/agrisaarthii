from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services import advice_service

router = APIRouter()

class QueryRequest(BaseModel):
    text: str

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
