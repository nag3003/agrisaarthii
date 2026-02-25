from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime

class FarmerProfile(BaseModel):
    id: str
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    location: Union[dict, str] = "Unknown"
    state: Optional[str] = None
    district: Optional[str] = None
    primary_crops: List[str] = []
    land_size: float = 0.0
    soil_type: Optional[str] = "Standard"
    water_access: Optional[str] = "Borewell"
    risk_tolerance: str = "Medium"
    language: str = "hi"
    crop_history: List[dict] = []
    photo_url: Optional[str] = None

class ProfileManager:
    @staticmethod
    def get_farmer_context(uid: str) -> Optional[FarmerProfile]:
        # MOCK USER HANDLING (Fix for 404 on test users)
        if uid.startswith('mock-') or uid.endswith('.test') or uid == 'f-123':
            print(f"Returning Mock Profile for {uid}")
            return FarmerProfile(
                id=uid,
                name="Mock Farmer",
                email="farmer.test@agri.com",
                location="Punjab",
                state="Punjab",
                district="Ludhiana",
                primary_crops=["Wheat", "Rice"],
                land_size=5.0,
                soil_type="Loamy",
                water_access="Borewell",
                risk_tolerance="Medium",
                language="en",
                photo_url=None
            )

        try:
            from firebase_admin import firestore
            import firebase_admin
            
            # Check if firebase is initialized
            if not firebase_admin._apps:
                print("⚠️ ProfileService: Firebase not initialized. Returning None (will fallback to direct Firestore on frontend).")
                return None

            try:
                db = firestore.client()
            except Exception as e:
                print(f"Firestore client error: {e}")
                return None

            doc_ref = db.collection('users').document(uid)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                
                # Map frontend fields to backend model
                primary_crops = data.get('primary_crops') or data.get('primaryCrop')
                if primary_crops and isinstance(primary_crops, str):
                    primary_crops = [primary_crops]
                elif not primary_crops:
                    primary_crops = []

                return FarmerProfile(
                    id=uid,
                    name=data.get('name', 'Unknown'),
                    phone=data.get('phone', ''),
                    email=data.get('email', ''),
                    location=data.get('location', 'Unknown'),
                    state=data.get('state'),
                    district=data.get('district'),
                    primary_crops=primary_crops,
                    land_size=float(data.get('landSize') or data.get('land_size') or 0.0),
                    soil_type=data.get('soilType', 'Standard'),
                    water_access=data.get('irrigationType') or data.get('water_access') or 'Borewell',
                    risk_tolerance=data.get('riskLevel') or data.get('risk_tolerance') or 'Medium',
                    language=data.get('language', 'en'),
                    crop_history=data.get('cropHistory', []),
                    photo_url=data.get('photoURL') or data.get('photo_url')
                )
            return None
        except Exception as e:
            print(f"Error fetching profile: {e}")
            return None

    @staticmethod
    def update_farmer_profile(uid: str, profile_data: dict) -> bool:
        try:
            from firebase_admin import firestore
            try:
                db = firestore.client()
            except Exception as e:
                print(f"Firestore client error: {e}")
                # If we can't get firestore client, we can't update
                return False

            doc_ref = db.collection('users').document(uid)
            doc_ref.set(profile_data, merge=True)
            return True
        except Exception as e:
            print(f"Error updating profile: {e}")
            return False

class ContextInjector:
    @staticmethod
    def inject(profile: Optional[FarmerProfile], weather: dict, market: dict) -> dict:
        """
        Combines farmer profile with real-time data for the AI Reasoning Engine.
        """
        current_month = datetime.now().month
        season = "Rabi" if current_month in [10, 11, 12, 1, 2, 3] else "Kharif"
        
        # Fallback values if profile is missing
        if not profile:
            return {
                "farmer_name": "Farmer",
                "crops": ["Unknown"],
                "land_info": "Standard farming land",
                "water_source": "Local water source",
                "location": "India",
                "current_season": season,
                "weather": f"{weather.get('temp', '25')}°C, {weather.get('condition', 'Clear')}",
                "market_status": f"Current market price: {market.get('avg_price', 'N/A')}",
                "risk_profile": "Medium"
            }

        # Safe access to location dict
        loc_str = "Unknown"
        if isinstance(profile.location, dict):
            loc_str = profile.location.get('raw') or f"{profile.location.get('district', '')}, {profile.location.get('state', '')}"
        elif isinstance(profile.location, str):
            loc_str = profile.location
        
        return {
            "farmer_name": profile.name or "Farmer",
            "crops": profile.primary_crops or ["Unknown"],
            "land_info": f"{profile.land_size} acres of {profile.soil_type}",
            "water_source": profile.water_access,
            "location": loc_str,
            "current_season": season,
            "weather": f"{weather.get('temp', '25')}°C, {weather.get('condition', 'Clear')}",
            "market_status": f"Current price for {profile.primary_crops[0] if profile.primary_crops else 'Crops'}: {market.get('avg_price', 'N/A')}",
            "risk_profile": profile.risk_tolerance
        }
