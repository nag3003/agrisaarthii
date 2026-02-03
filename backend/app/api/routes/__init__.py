from fastapi import APIRouter, UploadFile, File, Query
from app.services import speech_service, advice_service, weather_service, iot_service, feedback_service, knowledge_service, predictive_service, fallback_service
from app.services.offline import sync

from app.api.routes import (
    auth,
    market,
    profile,
    weather,
    voice,
    video,
    advisory,
    logs,
    query
)

router = APIRouter()

# Include modular routers
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(market.router, prefix="/market", tags=["Market"])
router.include_router(profile.router, prefix="/profile", tags=["Profile"])
router.include_router(weather.router, prefix="/weather", tags=["Weather"])
router.include_router(voice.router, prefix="/voice", tags=["Voice"])
router.include_router(video.router, prefix="/video", tags=["Video"])
router.include_router(advisory.router, prefix="/advisory", tags=["Advisory"])
router.include_router(logs.router, prefix="/logs", tags=["Logs"])
router.include_router(query.router, prefix="/query", tags=["Query"])



@router.post("/query/advice")
async def advice(request: dict):
    # In production, this would extract text and rich context
    text = request.get("text", "")
    context = request.get("context", {})
    advice_data = await advice_service.AdvisoryReasoningEngine.get_actionable_advice(text, context)
    return {"advice": advice_data}

@router.get("/alerts/predictive")
async def get_alerts(farmer_id: str = "f-123"):
    return await predictive_service.PredictiveIntelligence.generate_emergent_alerts(farmer_id)

# --- IoT & Automation ---
@router.get("/iot/sensors")
async def get_sensors(farmer_id: str = "f-123"):
    # Mock sensor data
    return await iot_service.IoTService.process_sensor_data(farmer_id, "soil_moisture", 25.5)

@router.post("/iot/motor")
async def control_motor(request: dict):
    farmer_id = request.get("farmer_id", "f-123")
    action = request.get("action", "OFF")
    return await iot_service.IoTService.control_motor(farmer_id, action)

# --- Feedback & Learning ---
@router.post("/feedback/outcome")
async def record_outcome(request: dict):
    return await feedback_service.FeedbackLoopService.record_outcome(
        request.get("farmer_id", "f-123"),
        request.get("advice_id"),
        request.get("action_taken"),
        request.get("details", "")
    )

# --- Fallback & Offline ---
@router.post("/fallback/sms")
async def handle_sms(request: dict):
    return fallback_service.FallbackService.process_sms_query(
        request.get("phone"),
        request.get("message")
    )

@router.post("/sync/batch")
async def sync_batch(request: dict):
    return await sync.SyncManager.process_sync_batch(
        request.get("farmer_id", "f-123"),
        request.get("batch", [])
    )

# --- Offline Knowledge ---
@router.get("/knowledge/calendar")
def get_calendar(crop: str, region: str = "Nashik"):
    return knowledge_service.KnowledgeService.get_crop_calendar(crop, region)

@router.get("/health")
async def health():
    return {"status": "ok"}
