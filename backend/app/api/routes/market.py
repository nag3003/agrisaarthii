from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
import httpx

router = APIRouter()

class MarketRequest(BaseModel):
    crop: str
    location: str

@router.post("/prices")
async def get_market_prices(request: MarketRequest):
    # Try real API if configured
    api_key = settings.DATA_GOV_API_KEY
    if api_key != "placeholder":
        try:
            # We'll use the crop as commodity filter and location as state/district filter
            # For simplicity, we assume location might be state or district
            url = f"https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key={api_key}&format=json&filters[commodity]={request.crop}&limit=5"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                data = response.json()
                
                if "records" in data and len(data["records"]) > 0:
                    records = data["records"]
                    return {
                        "crop": request.crop,
                        "location": request.location or "India",
                        "avg_price": records[0].get("modal_price"),
                        "unit": "Quintal",
                        "trend": "stable",
                        "nearby_mandis": [
                            {
                                "name": r.get("market"),
                                "price": r.get("modal_price"),
                                "district": r.get("district"),
                                "state": r.get("state")
                            } for r in records
                        ]
                    }
        except Exception as e:
            print(f"Error fetching real market prices: {e}")

    # Fallback to mock logic
    location_name = request.location or ""
    import hashlib
    seed = int(hashlib.md5(request.crop.encode()).hexdigest(), 16) % 500
    base_price = 2000 + seed
    
    if not location_name:
        return {
            "crop": request.crop,
            "location": "National",
            "avg_price": str(base_price),
            "unit": "Quintal",
            "trend": "up" if seed % 2 == 0 else "down",
            "nearby_mandis": [
                {"name": f"Chennai Market", "price": str(base_price + 200), "district": "Chennai", "state": "Tamil Nadu"},
                {"name": f"Coimbatore Mandi", "price": str(base_price + 150), "district": "Coimbatore", "state": "Tamil Nadu"},
                {"name": f"Azadpur Mandi", "price": str(base_price + 300), "district": "North Delhi", "state": "Delhi"},
                {"name": f"Vashi Market", "price": str(base_price + 100), "district": "Navi Mumbai", "state": "Maharashtra"},
                {"name": f"Koyambedu Market", "price": str(base_price + 180), "district": "Chennai", "state": "Tamil Nadu"}
            ]
        }
    
    return {
        "crop": request.crop,
        "location": location_name,
        "avg_price": str(base_price),
        "unit": "Quintal",
        "trend": "up" if seed % 2 == 0 else "down",
        "nearby_mandis": [
            {"name": f"{location_name} Main Mandi", "price": str(base_price + 50), "district": location_name, "state": "Local"},
            {"name": f"{location_name} Suburban Market", "price": str(base_price - 30), "district": location_name, "state": "Local"}
        ]
    }
