import httpx
from app.core.config import settings

class WeatherConnector:
    @staticmethod
    async def get_current(lat: float, lon: float):
        # In production, use OpenWeatherMap or similar
        return {"temp": 28, "condition": "Sunny", "humidity": "40%"}

class MarketConnector:
    @staticmethod
    async def get_prices(crop: str, district: str):
        # Mocking Agmarknet API response
        return {"avg_price": "2100", "unit": "Quintal", "mandi": f"{district} Mandi"}

class KnowledgeBase:
    @staticmethod
    def query_crop_info(crop: str):
        # Mocking RAG or DB query for specific crop guidelines
        return f"Standard guidelines for {crop} in this season involve..."

class LocationResolver:
    @staticmethod
    def resolve(lat: float, lon: float):
        # Mock reverse geocoding
        return {"district": "Nashik", "state": "Maharashtra"}
