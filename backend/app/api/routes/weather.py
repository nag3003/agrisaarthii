from fastapi import APIRouter, HTTPException
from app.services.weather_service import WeatherService
from app.core.config import settings
import httpx

router = APIRouter()

@router.get("/")
async def get_weather(lat: float, lon: float):
    """
    Get weather data for specific coordinates.
    """
    return await WeatherService.get_weather(lat, lon)

@router.post("/location-data")
async def get_location_data(request: dict):
    """
    Unified endpoint for location, weather and market data.
    """
    lat = request.get("latitude")
    lon = request.get("longitude")

    if not lat or not lon:
        raise HTTPException(status_code=400, detail="Latitude and Longitude required")

    try:
        # 1. Weather Data
        weather_data = await WeatherService.get_weather(lat, lon)

        # 2. Location Info (Reverse Geocode)
        location_info = await WeatherService.reverse_geocode(lat, lon)
        state = location_info["state"]
        district = location_info["district"]

        # 3. Market Price Data (data.gov.in)
        api_key = settings.DATA_GOV_API_KEY
        market_data = {"message": "No market data found for this district"}
        
        if api_key != "placeholder":
            market_url = f"https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key={api_key}&format=json&filters[state]={state}&filters[district]={district}&limit=1"
            
            async with httpx.AsyncClient() as client:
                market_res = await client.get(market_url)
                market_json = market_res.json()

                if "records" in market_json and len(market_json["records"]) > 0:
                    record = market_json["records"][0]
                    market_data = {
                        "commodity": record.get("commodity"),
                        "market": record.get("market"),
                        "min_price": record.get("min_price"),
                        "max_price": record.get("max_price"),
                        "modal_price": record.get("modal_price")
                    }

        return {
            "location": {
                "district": district,
                "state": state
            },
            "weather": weather_data,
            "market": market_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
