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
        You are AgriSaarthi, a helpful agricultural expert for Indian farmers.
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

        return not any(word in response.lower() for word in harmful_keywords)

class ImageAnalysis:
    @staticmethod
    async def analyze_crop_disease(image_path: str) -> dict:
        """
        Analyzes a crop image to detect diseases.
        In a real scenario, this would encode the image to base64 or upload it
        and send the URL/Base64 to GPT-4o Vision.
        """
        try:
            # Mock implementation for MVP / offline demo capabilities
            # Real implementation would look like:
            # 1. Encode image to base64
            # 2. Call OpenAI ChatCompletion with model="gpt-4o" and image_url payload
            
            # For now, we simulate a successful response to enable the UI flow
            # This can be replaced with actual API call when keys are active
            
            import random
            import time
            
            # Simulate processing time
            time.sleep(2)
            
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
