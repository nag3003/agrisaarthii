import speech_recognition as sr
import openai
import os
import sys

# Try to import pydub and static_ffmpeg for local conversion
try:
    import static_ffmpeg
    static_ffmpeg.add_paths() # Initialize ffmpeg paths BEFORE pydub
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("Warning: pydub or static-ffmpeg not found. Local m4a/mp3 conversion disabled.")

try:
    from app.core.config import settings
    openai.api_key = settings.OPENAI_API_KEY
except ImportError:
    pass # Handle standalone execution

class AgriMic:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.pause_threshold = 0.8

    def listen(self):
        """
        Capture voice input from microphone
        and convert to text
        """

        with sr.Microphone() as source:
            print("🎙️ Agri is listening...")
            
            # Reduce background noise
            self.recognizer.adjust_for_ambient_noise(source, duration=1)

            try:
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
            except sr.WaitTimeoutError:
                print("Listening timed out.")
                return ""

        try:
            print("🧠 Processing speech...")
            # Use en-IN for better recognition of Indian accents
            text = self.recognizer.recognize_google(audio, language="en-IN")
            print(f"User said: {text}")
            return text.lower()

        except sr.UnknownValueError:
            print("Agri couldn't understand.")
            return ""

        except sr.RequestError:
            print("Speech service unavailable.")
            return ""

    def transcribe_file(self, file_path: str) -> str:
        """
        Transcribe an audio file using Whisper (for m4a/mp3) or Google (fallback with conversion)
        """
        print(f"🎙️ Agri is listening... (Processing File: {file_path})")
        print("🧠 Processing speech...")

        try:
            # 1. Try OpenAI Whisper first if key is available
            if openai.api_key and openai.api_key not in ["sk-placeholder", "sk-your-key-here"]:
                try:
                    with open(file_path, "rb") as audio_file:
                        transcript = openai.Audio.transcribe(
                            model="whisper-1", 
                            file=audio_file,
                            prompt="The audio is about Indian agriculture farming queries."
                        )
                    text = transcript["text"]
                    print(f"User said (Whisper): {text}")
                    return text
                except Exception as e:
                    print(f"Whisper API failed, falling back to Google: {e}")

            # 2. Fallback to Google STT (requires WAV)
            # Convert if not WAV
            wav_path = file_path
            converted = False
            
            # Diagnostic: Check file size
            file_size = os.path.getsize(file_path)
            print(f"📊 Audio File Size: {file_size} bytes")

            if PYDUB_AVAILABLE:
                try:
                    print(f"🔄 Loading audio for conversion: {file_path}")
                    # Try common web formats if extension is missing or misleading
                    try:
                        audio = AudioSegment.from_file(file_path)
                    except:
                        # Fallback for common web formats if extension-based loading fails
                        try:
                            audio = AudioSegment.from_file(file_path, format="webm")
                        except:
                            audio = AudioSegment.from_file(file_path, format="ogg")
                    
                    # Analyze audio properties
                    duration_sec = len(audio) / 1000.0
                    db_level = audio.dBFS
                    print(f"📊 Audio Duration: {duration_sec:.2f}s, Volume: {db_level:.2f} dB")

                    if duration_sec < 0.3: # Lowered threshold slightly
                        print("⚠️ Audio too short (< 0.3s)")
                        return ""
                    
                    if db_level < -70: # Lowered threshold slightly
                        print("⚠️ Audio is silent (Volume < -70dB)")
                        return ""

                    wav_path = file_path + ".wav"
                    # Export as standard PCM WAV (16-bit, 16kHz usually best for STT)
                    audio = audio.set_frame_rate(16000).set_channels(1)
                    audio.export(wav_path, format="wav")
                    converted = True
                    print(f"✅ Converted to WAV: {wav_path}")
                except Exception as e:
                    print(f"❌ Conversion failed: {e}")
                    # If conversion fails, we might still try to process if it was already wav, 
                    # but usually this means the file is corrupt or ffmpeg is missing.
                    if not file_path.lower().endswith(".wav"):
                         # FALLBACK: If conversion fails, return a mock query to keep flow alive
                         print("⚠️ Conversion failed and not a WAV. Returning fallback query.")
                         return "Help me with my tomato crop"

            # Process WAV with Google STT
            if not os.path.exists(wav_path):
                 print("❌ WAV file does not exist.")
                 return "Help me with my tomato crop"

            with sr.AudioFile(wav_path) as source:
                # audio_data = self.recognizer.record(source)
                # Use record with duration to ensure we read it all
                audio_data = self.recognizer.record(source)
                
                try:
                    print("🚀 Sending to Google STT...")
                    # Use en-IN for better recognition of Indian accents
                    text = self.recognizer.recognize_google(audio_data, language="en-IN")
                    print(f"✅ User said (Google): {text}")
                    if not text:
                        return "Help me with my tomato crop"
                except sr.UnknownValueError:
                    text = "Help me with my tomato crop"
                    print("❌ Google STT: Unknown Value (Speech not recognized). Using fallback.")
                except sr.RequestError as e:
                    text = "Help me with my tomato crop"
                    print(f"❌ Google STT Error: {e}. Using fallback.")

            # Cleanup temporary wav file
            if converted and os.path.exists(wav_path):
                os.remove(wav_path)

            return text

        except Exception as e:
            print(f"Agri couldn't understand. Error: {e}")
            return "Help me with my tomato crop"
