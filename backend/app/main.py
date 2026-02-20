from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.core.config import settings
from app.core.firebase_config import initialize_firebase
import time

# Initialize Firebase Admin SDK
initialize_firebase()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0"
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    print(f"Request: {request.method} {request.url.path} - Completed in {process_time:.2f}ms with status {response.status_code}")
    return response

# CORS - Essential for Frontend -> Backend communication
app.add_middleware(
    CORSMiddleware,
    # Allow ALL origins via regex to prevent any CORS issues during development
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the stable API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Agri API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
