from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import firebase_admin
from firebase_admin import firestore

router = APIRouter()

class UsageLog(BaseModel):
    action: str
    details: str
    level: str = "INFO"
    module: str = "General"

@router.post("/usage")
async def log_usage(log: UsageLog):
    timestamp = datetime.now()
    log_data = {
        "action": log.action,
        "details": log.details,
        "level": log.level,
        "module": log.module,
        "timestamp": timestamp
    }
    
    # Log to console
    print(f"[{timestamp}] [{log.level}] [{log.module}] Action: {log.action}, Details: {log.details}")
    
    # Log to Firestore if available
    try:
        if firebase_admin._apps:
            db = firestore.client()
            db.collection("system_logs").add(log_data)
    except Exception as e:
        print(f"⚠️ Failed to write log to Firestore: {e}")

    return {"status": "logged"}
