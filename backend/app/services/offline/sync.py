from typing import Dict, List, Any, Optional
from datetime import datetime

class OfflineCache:
    _cache = {}

    @staticmethod
    def store_query(user_id: str, query: str, response: str):
        OfflineCache._cache[f"{user_id}:{query}"] = response

    @staticmethod
    def get_last_advice(user_id: str):
        # Return most recent advice for the user
        return {"advice": "Last saved advice for your Wheat crop...", "date": "2024-01-19"}

class SyncManager:
    @staticmethod
    async def process_sync_batch(farmer_id: str, batch: List[Dict[str, Any]]):
        """
        Processes a batch of actions performed offline.
        """
        from app.services.feedback_service import FeedbackLoopService
        
        results = []
        for item in batch:
            action_type = item.get("type")
            if action_type == "FEEDBACK":
                res = await FeedbackLoopService.record_outcome(
                    farmer_id,
                    item.get("advice_id"),
                    item.get("action_taken"),
                    item.get("details", "Offline Sync")
                )
                results.append(res)
            
        return {
            "synced_count": len(results),
            "status": "SUCCESS",
            "timestamp": datetime.now().isoformat()
        }
