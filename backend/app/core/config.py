from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AgriSaarthi"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AgriSaarthi API"
    DEBUG: bool = True
    MAX_AUDIO_MB: int = 5
    
    # AI Keys (to be filled later)
    OPENAI_API_KEY: str = "sk-placeholder"
    WEATHER_API_KEY: str = "placeholder"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
