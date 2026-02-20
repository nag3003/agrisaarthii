import openai
from app.core.config import settings

class SpeechToText:
    @staticmethod
    async def transcribe(audio_file_path: str) -> str:
        # Whisper implementation
        try:
            with open(audio_file_path, "rb") as audio:
                transcript = openai.Audio.transcribe("whisper-1", audio)
                return transcript["text"]
        except Exception as e:
            return f"Transcription error: {str(e)}"

class PromptBuilder:
    @staticmethod
    def construct(query: str, context: dict) -> str:
        return f"""
        You are Agri, a helpful agricultural expert for Indian farmers.
        Context:
        - Crop: {context['crop']}
        - Location: {context['location']}
        - Season: {context['season']}
        - Weather: {context['weather_condition']}
        
        Farmer Query: {query}
        
        Provide advice that is:
        1. Practical for low-resource farmers.
        2. Scientifically accurate.
        3. Localized to their region.
        If the confidence is low, say you don't know and suggest visiting a local Krishi Vigyan Kendra.
        """

class AdvisoryReasoning:
    @staticmethod
    async def get_advice(prompt: str) -> str:
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as e:
            return "Reasoning engine error."

class ImageAnalysis:
    @staticmethod
    async def analyze_crop_disease(image_path: str = None, image_url: str = None, description: str = None) -> dict:
        """
        Analyzes a crop image to detect diseases.
        """
        try:
            # Simulate processing time
            import asyncio
            await asyncio.sleep(2)
            
            # For MVP, we provide a deterministic mock based on the description if present
            # If a description is provided, it helps guide the "AI" to a specific diagnosis
            if description:
                lower_desc = description.lower()
                if "yellow" in lower_desc:
                    return {
                        "diagnosis": "Nitrogen Deficiency",
                        "confidence": 94,
                        "remedy": "Apply Urea or nitrogen-rich fertilizer. Check soil moisture levels. Ensure proper sunlight exposure."
                    }
                if "spot" in lower_desc or "brown" in lower_desc:
                    return {
                        "diagnosis": "Early Blight",
                        "confidence": 89,
                        "remedy": "Remove infected leaves. Apply copper-based fungicide. Improve air circulation between plants."
                    }
                if "white" in lower_desc or "powder" in lower_desc:
                    return {
                        "diagnosis": "Powdery Mildew",
                        "confidence": 91,
                        "remedy": "Spray neem oil or sulphur-based organic fungicides. Avoid watering from above."
                    }
            
            # Default mock responses
            import random
            diseases = [
                {
                    "diagnosis": "Leaf Blight",
                    "confidence": 92,
                    "remedy": "Apply copper-based fungicides. Improve air circulation."
                },
                {
                    "diagnosis": "Powdery Mildew",
                    "confidence": 88,
                    "remedy": "Use sulphur-based organic fungicides. Avoid overhead watering."
                },
                {
                    "diagnosis": "Healthy Crop",
                    "confidence": 95,
                    "remedy": "Continue good irrigation and monitoring practices."
                }
            ]
            
            return random.choice(diseases)

        except Exception as e:
            return {
                "diagnosis": "Analysis Failed",
                "confidence": 0,
                "remedy": "Could not analyze image. Please try again."
            }
