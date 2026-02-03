from fastapi import APIRouter
from pydantic import BaseModel

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
