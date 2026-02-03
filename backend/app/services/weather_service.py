from typing import Dict, Any

class WeatherService:
    @staticmethod
    async def get_weather(lat: float, lon: float) -> Dict[str, Any]:
        """
        Mock implementation of weather service.
        In production, this would call an external API like OpenWeatherMap.
        """
        # STEP 4: Mock implementation
        return {
            "temp": 32, 
            "condition": "Sunny but Cloudy", 
            "location": "Nashik",
            "rain_prob": 15, # 15% chance of rain
            "humidity": 85, # High humidity to trigger alerts
            "wind_speed": 12,
            "pressure": 1012
        }

def fetch_weather(lat: float, lon: float) -> dict:
    # Legacy wrapper for sync calls if needed
    import asyncio
    return asyncio.run(WeatherService.get_weather(lat, lon))
