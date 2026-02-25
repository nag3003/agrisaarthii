from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Agri"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Agri API"
    DEBUG: bool = True
    MAX_AUDIO_MB: int = 5
    
    # AI Keys (to be filled later)
    OPENAI_API_KEY: str = "sk-placeholder"
    GEMINI_API_KEY: str = "placeholder"
    WEATHER_API_KEY: str = "placeholder"
    OPENWEATHER_API_KEY: str = "placeholder"
    DATA_GOV_API_KEY: str = "placeholder"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
