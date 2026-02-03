from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.core.config import settings
from app.core.firebase_config import initialize_firebase

# Initialize Firebase Admin SDK
initialize_firebase()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0"
)

# CORS - Essential for Frontend -> Backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the stable API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "AgriSaarthi API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
