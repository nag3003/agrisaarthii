from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_weather(lat: float, lon: float):
    # Mock Data for MVP - In prod, hit OpenWeatherMap/IMD API
    return {
        "location": "Nashik, MH",
        "temp": 28,
        "condition": "Partly Cloudy",
        "humidity": 65,
        "wind_speed": 12,
        "forecast": [
            {"day": "Tomorrow", "temp": 29, "condition": "Sunny"},
            {"day": "Wed", "temp": 27, "condition": "Rain"}
        ]
    }
