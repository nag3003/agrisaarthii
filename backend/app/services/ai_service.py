"""
AI Service — Audio transcription and advice using Google Gemini.
Falls back to Google STT / mock when Gemini key is missing.
"""
import os
import base64
import httpx
from fastapi import UploadFile
from app.core.config import settings


GEMINI_API_KEY = settings.GEMINI_API_KEY if settings.GEMINI_API_KEY not in ("placeholder", "") else os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Mapping of extensions to MIME types for Gemini
AUDIO_MIME_MAP = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".mp3": "audio/mp3",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".flac": "audio/flac",
}


class AIService:
    @staticmethod
    async def transcribe_audio(file: UploadFile) -> str:
        """Transcribe audio using Gemini multimodal, falling back to SpeechRecognition."""
        temp_filename = None
        try:
            # Save temp file
            ext = os.path.splitext(file.filename or "")[1] or ".webm"
            temp_filename = f"temp_{os.urandom(4).hex()}{ext}"

            content = await file.read()
            with open(temp_filename, "wb") as f:
                f.write(content)

            file_size = len(content)
            print(f"[AIService] Received file: {file.filename}, size: {file_size} bytes, ext: {ext}")

            if file_size == 0:
                print("[AIService] Empty audio file received")
                return ""

            # ---- Attempt 1: Gemini multimodal transcription ----
            if GEMINI_API_KEY:
                try:
                    audio_b64 = base64.b64encode(content).decode("utf-8")
                    mime = AUDIO_MIME_MAP.get(ext.lower(), "audio/webm")

                    async with httpx.AsyncClient(timeout=20) as client:
                        resp = await client.post(
                            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                            json={
                                "contents": [{
                                    "parts": [
                                        {
                                            "inline_data": {
                                                "mime_type": mime,
                                                "data": audio_b64,
                                            }
                                        },
                                        {
                                            "text": "Transcribe this audio accurately. Return ONLY the transcribed text, nothing else. The audio may be in Hindi, English, Telugu, Tamil, or other Indian languages."
                                        },
                                    ]
                                }],
                                "generationConfig": {
                                    "temperature": 0.1,
                                    "maxOutputTokens": 200,
                                },
                            },
                        )

                    if resp.status_code == 200:
                        data = resp.json()
                        text = (
                            data.get("candidates", [{}])[0]
                            .get("content", {})
                            .get("parts", [{}])[0]
                            .get("text", "")
                            .strip()
                        )
                        if text:
                            print(f"[AIService] Gemini transcription: {text}")
                            return text
                        else:
                            print("[AIService] Gemini returned empty text, trying fallback")
                    else:
                        print(f"[AIService] Gemini transcription error: {resp.status_code}")
                except Exception as e:
                    print(f"[AIService] Gemini transcription exception: {e}")

            # ---- Attempt 2: SpeechRecognition (Google STT free tier) ----
            try:
                import speech_recognition as sr
                # Try pydub conversion for non-wav formats
                wav_path = temp_filename
                converted = False
                try:
                    import static_ffmpeg
                    static_ffmpeg.add_paths()
                    from pydub import AudioSegment
                    audio_seg = AudioSegment.from_file(temp_filename)
                    if len(audio_seg) < 300:  # < 0.3s
                        print("[AIService] Audio too short")
                        return ""
                    wav_path = temp_filename + ".wav"
                    audio_seg = audio_seg.set_frame_rate(16000).set_channels(1)
                    audio_seg.export(wav_path, format="wav")
                    converted = True
                except Exception as conv_err:
                    print(f"[AIService] Audio conversion failed: {conv_err}")
                    if not temp_filename.lower().endswith(".wav"):
                        return ""

                recognizer = sr.Recognizer()
                recognizer.energy_threshold = 300
                with sr.AudioFile(wav_path) as source:
                    audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data, language="hi-IN")
                    print(f"[AIService] Google STT: {text}")

                if converted and os.path.exists(wav_path):
                    os.remove(wav_path)

                return text or ""
            except Exception as stt_err:
                print(f"[AIService] SpeechRecognition fallback failed: {stt_err}")

            # ---- Attempt 3: Return empty (let frontend handle) ----
            return ""

        except Exception as e:
            print(f"[AIService] Error: {e}")
            return ""
        finally:
            if temp_filename and os.path.exists(temp_filename):
                os.remove(temp_filename)

    @staticmethod
    async def get_farming_advice(query_text: str, context: str = "") -> str:
        """Get farming advice using Gemini."""
        if GEMINI_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(
                        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                        json={
                            "system_instruction": {"parts": [{"text": "You are an expert Indian agricultural scientist. Answer in the same language as the user. Keep it short (max 3 sentences). Provide specific actions."}]},
                            "contents": [{"parts": [{"text": f"Context: {context}\nQuestion: {query_text}"}]}],
                            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 150},
                        },
                    )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            except Exception as e:
                print(f"[AIService] Gemini advice error: {e}")

        return f"I've received your query about {query_text}. Please check your plants for pests and ensure proper irrigation."
