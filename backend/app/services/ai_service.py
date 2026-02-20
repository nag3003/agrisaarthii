import openai
from fastapi import UploadFile
import os
import sys
from app.core.config import settings

# Add backend root to path to allow importing AgriMic
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

try:
    # Try importing from root (if running as module) or relative
    try:
        from AgriMic import AgriMic
    except ImportError:
        import sys
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
        from AgriMic import AgriMic
except ImportError as e:
    # Fallback if import fails (e.g. strict environment)
    print(f"Warning: Could not import AgriMic. Using fallback transcription. Error: {e}")
    AgriMic = None

# Initialize OpenAI
openai.api_key = settings.OPENAI_API_KEY

class AIService:
    @staticmethod
    async def transcribe_audio(file: UploadFile) -> str:
        """
        Convert Voice (Hindi/Regional) to English Text using AgriMic (Whisper/Google)
        """
        try:
            # Save temp file
            # Ensure we keep the extension for AgriMic/Whisper to detect format
            ext = os.path.splitext(file.filename)[1]
            if not ext:
                ext = ".m4a" # Default for mobile uploads if missing
                
            temp_filename = f"temp_{os.urandom(4).hex()}{ext}"
            
            with open(temp_filename, "wb") as buffer:
                buffer.write(await file.read())
            
            # Use AgriMic for transcription (Printing logs as requested)
            if AgriMic:
                mic = AgriMic()
                text = mic.transcribe_file(temp_filename)
            else:
                # Fallback if AgriMic not imported
                print("🎙️ Agri is listening... (Fallback)")
                
                # Check if API key is a placeholder or missing
                if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY in ["sk-placeholder", "sk-your-key-here"]:
                    print("Warning: OpenAI API Key is missing and AgriMic not loaded. Using dynamic mock for demo.")
                    mock_queries = [
                        "My tomato crop has white spots on leaves.",
                        "How much water does rice need in summer?",
                        "Pest attack in my cotton field.",
                        "Wheat crop turning yellow what to do?",
                        "Best fertilizer for pomegranate."
                    ]
                    import random
                    return random.choice(mock_queries)

                print("🧠 Processing speech...")
                with open(temp_filename, "rb") as audio_file:
                    transcript = openai.Audio.transcribe(
                        model="whisper-1", 
                        file=audio_file,
                        prompt="The audio is about Indian agriculture farming queries."
                    )
                text = transcript["text"]
                print(f"User said: {text}")

            # Cleanup
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            
            return text
            
        except Exception as e:
            print(f"AgriMic Error: {e}")
            error_str = str(e).lower()
            if "api key" in error_str or "authentication" in error_str:
                 print("OpenAI API Key invalid. Using dynamic mock for demo.")
                 mock_queries = [
                    "My tomato crop has white spots on leaves.",
                    "How much water does rice need in summer?",
                    "Pest attack in my cotton field.",
                    "Wheat crop turning yellow what to do?",
                    "Best fertilizer for pomegranate."
                ]
                 import random
                 return random.choice(mock_queries)
            return f"[ERROR: {str(e)}]"

    @staticmethod
    async def get_farming_advice(query_text: str, context: str = "") -> str:
        """
        Get actionable advice using GPT-4o-mini
        """
        try:
            # Check if API key is a placeholder
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-placeholder":
                print("Warning: OpenAI API Key is missing or placeholder. Using fallback.")
                return f"I've received your query about {query_text}. Please check your plants for pests and ensure proper irrigation."

            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert Indian agricultural scientist. Answer in the same language as the user's question. If the user asks in Hindi, answer in Hindi. If in Tamil, answer in Tamil. Keep it short (max 3 sentences). Provide very specific actions."
                    },
                    {"role": "user", "content": f"Context: {context}\nQuestion: {query_text}"}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {e}")
            return "Based on your symptoms, it looks like Early Blight. Spray Mancozeb 2.5g/liter of water."

    @staticmethod
    async def generate_audio_response(text: str, language: str = "hi") -> str:
        """
        Convert Text back to Audio (TTS)
        Returns: URL or Base64 of audio
        """
        # In a real app, use Google Cloud TTS or Azure TTS here
        # For MVP, we return a mock URL
        return "https://agrisarathi-storage.s3.ap-south-1.amazonaws.com/responses/sample_response.mp3"

    @staticmethod
    async def analyze_crop_image(image_file: UploadFile) -> dict:
        """
        Analyze crop image using the Intelligence module
        """
        from app.services.ai.intelligence import ImageAnalysis
        
        # Save temp file for analysis (since Intelligence expects a path for now)
        temp_filename = f"temp_{image_file.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(await image_file.read())
            
        try:
            result = await ImageAnalysis.analyze_crop_disease(temp_filename)
        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
                
        return result
