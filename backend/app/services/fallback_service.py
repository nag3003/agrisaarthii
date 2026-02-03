from typing import Dict, Any
from datetime import datetime

class FallbackService:
    @staticmethod
    def process_sms_query(phone: str, message: str) -> Dict[str, Any]:
        """
        Handles queries arriving via SMS (e.g., via a Twilio or localized SMS gateway).
        """
        # Logic to extract intent from plain text SMS
        query_lower = message.lower()
        if "tomato" in query_lower and "curl" in query_lower:
            response = "AgriSaarthi: Tomato leaf curling is likely Thrips. Spray Neem Oil (5ml/L). For more details, call 1800-AGRI."
        else:
            response = "AgriSaarthi: Query received. Our expert will call you back within 30 minutes."
        
        return {
            "status": "SMS_SENT",
            "to": phone,
            "message": response,
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def initiate_ivr_call(phone: str, reason: str) -> Dict[str, Any]:
        """
        Triggers an automated IVR call to the farmer (e.g., for urgent alerts).
        """
        # Mocking integration with a voice provider like Exotel or Twilio
        ivr_script = f"Namaste. This is an urgent alert from AgriSaarthi regarding your {reason}. Press 1 to hear advice, Press 2 to talk to an expert."
        
        return {
            "status": "IVR_QUEUED",
            "phone": phone,
            "script": ivr_script,
            "provider_ref": "v-mock-789"
        }
