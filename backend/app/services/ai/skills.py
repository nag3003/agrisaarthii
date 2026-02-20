import datetime
import pyjokes
import wikipedia
import httpx
import asyncio
from app.core.config import settings

# import pywhatkit # Causing tkinter issues on headless server

def get_current_time():
    """
    Returns the current time in 12-hour format with AM/PM.
    """
    return datetime.datetime.now().strftime('%I:%M %p')

def tell_joke():
    """
    Returns a random programming joke.
    """
    return pyjokes.get_joke()

def search_wikipedia(query: str):
    """
    Searches Wikipedia for the query and returns a summary.
    """
    try:
        return wikipedia.summary(query, sentences=2)
    except wikipedia.exceptions.DisambiguationError as e:
        return f"Multiple results found for '{query}'. Please be more specific."
    except wikipedia.exceptions.PageError:
        return f"I couldn't find any information about '{query}'."
    except Exception as e:
        return f"Error searching Wikipedia: {str(e)}"

def play_youtube_video(song: str):
    """
    Returns a YouTube link for the requested song or video.
    """
    # Simple search URL generation since we can't use pywhatkit's browser automation on server
    query = song.replace(' ', '+')
    url = f"https://www.youtube.com/results?search_query={query}"
    return f"Here is a link to play {song}: {url}"

def who_is(person: str):
    """
    Finds out who a person is using Wikipedia.
    """
    return search_wikipedia(person)

async def get_market_prices(crop: str, location: str = "India"):
    """
    Fetches the latest market price (mandi bhav) for a specific crop in a location.
    """
    api_key = settings.DATA_GOV_API_KEY
    if api_key == "placeholder" or not api_key:
        # Mock data if no API key
        return f"The average price of {crop} in {location} is approx ₹2500 per Quintal. Prices are stable."
    
    try:
        url = f"https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key={api_key}&format=json&filters[commodity]={crop}&limit=1"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            if "records" in data and len(data["records"]) > 0:
                price = data["records"][0].get("modal_price")
                market = data["records"][0].get("market")
                return f"The price of {crop} in {market} is ₹{price} per Quintal."
            else:
                return f"I couldn't find current market prices for {crop} in {location}."
    except Exception as e:
        return f"I'm having trouble connecting to the market database. {str(e)}"

async def get_weather(location: str):
    """
    Gets the current weather and forecast for a location.
    """
    # Mock for now as we don't have a weather API key in context
    # Real implementation would use OpenWeatherMap
    return f"In {location}, it is currently 32°C and Sunny. No rain is expected today."

async def get_crop_advice(query: str):
    """
    Provides agricultural advice for crop diseases, pests, or general farming queries.
    """
    # We'll use the existing AdvisoryReasoningEngine logic but simplified
    from app.services.advice_service import AdvisoryReasoningEngine
    
    # Mock context
    context = {"farmer_name": "Farmer", "location": "Unknown", "current_season": "Rabi", "weather": "Sunny"}
    
    try:
        result = await AdvisoryReasoningEngine.get_actionable_advice(query, context)
        return result.get("advice", "I couldn't generate advice at this moment.")
    except Exception as e:
        return f"Error getting advice: {str(e)}"
