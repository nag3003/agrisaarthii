from typing import Dict, Any
import httpx
from app.core.config import settings

class WeatherService:
    @staticmethod
    async def get_weather(lat: float, lon: float) -> Dict[str, Any]:
        """
        Fetches weather data from OpenWeatherMap API.
        """
        api_key = settings.OPENWEATHER_API_KEY
        if api_key == "placeholder":
            # Fallback to mock if no key
            return {
                "temperature": 32, 
                "description": "Clear Sky (Mock)", 
                "humidity": 85,
                "wind_speed": 12
            }
        
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                weather_res = response.json()
                
                if response.status_code != 200:
                    raise Exception(f"Weather API error: {weather_res.get('message', 'Unknown error')}")

                return {
                    "temperature": weather_res["main"]["temp"],
                    "humidity": weather_res["main"]["humidity"],
                    "description": weather_res["weather"][0]["description"],
                    "wind_speed": weather_res["wind"]["speed"]
                }
            except Exception as e:
                print(f"Error fetching weather: {e}")
                return {
                    "temperature": 0,
                    "humidity": 0,
                    "description": "Error fetching weather",
                    "wind_speed": 0
                }

    @staticmethod
    async def reverse_geocode(lat: float, lon: float) -> Dict[str, str]:
        """
        Reverse geocode coordinates using Nominatim.
        """
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        headers = {"User-Agent": "agrisaarthi-app"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                geo_res = response.json()
                
                address = geo_res.get("address", {})
                district = address.get("county") or address.get("district") or address.get("city")
                state = address.get("state")
                
                return {
                    "district": district or "Unknown",
                    "state": state or "Unknown"
                }
            except Exception as e:
                print(f"Error reverse geocoding: {e}")
                return {"district": "Unknown", "state": "Unknown"}
