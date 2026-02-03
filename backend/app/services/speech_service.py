def transcribe_audio(audio_file) -> str:
    """
    Mock transcription logic that handles regional intent.
    In production, this would call Whisper or Google STT.
    """
    # For simulation, we'll return the specific query the user mentioned
    # as if Whisper transcribed it from Tamil/Hindi
    return "Tomato leaves are curling and looking yellow."
