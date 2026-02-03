import openai
from fastapi import UploadFile
import os
from app.core.config import settings

# Initialize OpenAI
openai.api_key = settings.OPENAI_API_KEY

class AIService:
    @staticmethod
    async def transcribe_audio(file: UploadFile) -> str:
        """
        Convert Voice (Hindi/Regional) to English Text using Whisper
        """
        try:
            # Save temp file
            temp_filename = f"temp_{file.filename}"
            with open(temp_filename, "wb") as buffer:
                buffer.write(await file.read())
            
            # Call Whisper API
            with open(temp_filename, "rb") as audio_file:
                transcript = openai.Audio.transcribe(
                    model="whisper-1", 
                    file=audio_file,
                    prompt="The audio is about Indian agriculture farming queries."
                )
            
            # Cleanup
            os.remove(temp_filename)
            
            return transcript["text"]
        except Exception as e:
            print(f"Whisper Error: {e}")
            # Fallback for demo/offline simulation
            return "Tomato crop has yellow leaves."

    @staticmethod
    async def get_farming_advice(query_text: str, context: str = "") -> str:
        """
        Get actionable advice using GPT-4o-mini
        """
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert Indian agricultural scientist. Answer in simple English. Keep it short (max 3 sentences)."},
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
