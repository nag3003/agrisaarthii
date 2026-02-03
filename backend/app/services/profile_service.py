from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class FarmerProfile(BaseModel):
    id: str
    name: str
    phone: str
    location: dict # {"lat": 19.0, "lon": 73.0, "district": "Nashik", "state": "MH"}
    primary_crops: List[str]
    land_size: float # in acres
    soil_type: Optional[str] = "Black Soil"
    water_access: Optional[str] = "Borewell"
    risk_tolerance: str = "Medium" # Low, Medium, High
    language: str = "hi"
    crop_history: List[dict] = [] # [{"crop": "Tomato", "season": "Kharif", "year": 2023, "yield": "Good"}]

class ProfileManager:
    @staticmethod
    def get_farmer_context(uid: str) -> Optional[FarmerProfile]:
        try:
            from firebase_admin import firestore
            db = firestore.client()
            doc_ref = db.collection('users').document(uid)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                # Parse crop history if exists
                crop_history = data.get('cropHistory', [])
                
                # Default primary crops if missing
                primary_crops = data.get('primaryCrop')
                if primary_crops and isinstance(primary_crops, str):
                    primary_crops = [primary_crops]
                elif not primary_crops:
                    primary_crops = []

                # Flatten location if it's a string (frontend might send string or object)
                # Ideally we want a dict. If it's a string, we might just store it as is or try to parse
                # For now, let's assume we map the Firestore data to our Pydantic model
                # Note: The frontend UserProfile interface is slightly different from FarmerProfile
                # We need to map them carefully.
                
                return FarmerProfile(
                    id=uid,
                    name=data.get('name', 'Unknown'),
                    phone=data.get('phone', '') or data.get('email', ''), # Fallback
                    location={"district": "Unknown", "state": "Unknown", "raw": data.get('location', '')},
                    primary_crops=primary_crops,
                    land_size=float(data.get('landSize', 0)),
                    soil_type="Standard", # Default as not in frontend profile
                    water_access=data.get('irrigationType', 'Rain-fed'),
                    risk_tolerance=data.get('riskLevel', 'Medium'),
                    language=data.get('language', 'en'),
                    crop_history=crop_history
                )
            return None
        except Exception as e:
            print(f"Error fetching profile: {e}")
            return None

    @staticmethod
    def update_farmer_profile(uid: str, profile_data: dict) -> bool:
        try:
            from firebase_admin import firestore
            db = firestore.client()
            doc_ref = db.collection('users').document(uid)
            doc_ref.set(profile_data, merge=True)
            return True
        except Exception as e:
            print(f"Error updating profile: {e}")
            return False

class ContextInjector:
    @staticmethod
    def inject(profile: FarmerProfile, weather: dict, market: dict) -> dict:
        """
        Combines farmer profile with real-time data for the AI Reasoning Engine.
        """
        current_month = datetime.now().month
        season = "Rabi" if current_month in [10, 11, 12, 1, 2, 3] else "Kharif"
        
        # Safe access to location dict
        loc_str = profile.location.get('raw') or f"{profile.location.get('district', '')}, {profile.location.get('state', '')}"
        
        return {
            "farmer_name": profile.name,
            "crops": profile.primary_crops,
            "land_info": f"{profile.land_size} acres of {profile.soil_type}",
            "water_source": profile.water_access,
            "location": loc_str,
            "current_season": season,
            "weather": f"{weather.get('temp')}°C, {weather.get('condition')}",
            "market_status": f"Current price for {profile.primary_crops[0] if profile.primary_crops else 'Crops'}: {market.get('avg_price', 'N/A')}",
            "risk_profile": profile.risk_tolerance
        }
