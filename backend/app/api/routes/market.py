from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class MarketRequest(BaseModel):
    crop: str
    location: str

@router.post("/prices")
async def get_market_prices(request: MarketRequest):
    # Mock mandi prices
    return {
        "crop": request.crop,
        "location": request.location,
        "avg_price": "2400",
        "unit": "Quintal",
        "trend": "up",
        "nearby_mandis": [
            {"name": "Nashik Mandi", "price": "2450"},
            {"name": "Pimpalgaon Mandi", "price": "2380"}
        ]
    }
