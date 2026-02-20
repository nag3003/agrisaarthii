from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
from app.services.profile_service import ProfileManager

router = APIRouter()

class ProfileUpdate(BaseModel):
    uid: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[Union[Dict[str, Any], str]] = None
    primary_crops: Optional[List[str]] = None
    primaryCrop: Optional[str] = None # Frontend mapping
    land_size: Optional[float] = None
    landSize: Optional[float] = None # Frontend mapping
    soil_type: Optional[str] = None
    soilType: Optional[str] = None # Frontend mapping
    irrigationType: Optional[str] = None
    water_access: Optional[str] = None # Mapping backend definition
    risk_tolerance: Optional[str] = None
    riskLevel: Optional[str] = None # Mapping frontend
    language: Optional[str] = None
    crop_history: Optional[List[Dict[str, Any]]] = None
    role: Optional[str] = None
    photoURL: Optional[str] = None

@router.get("/{uid}")
async def get_profile(uid: str):
    profile = ProfileManager.get_farmer_context(uid)
    if profile:
        return profile.dict()
    raise HTTPException(status_code=404, detail="Profile not found")

@router.put("/update")
async def update_profile(profile: ProfileUpdate):
    # Convert Pydantic model to dictionary, excluding None values
    profile_data = profile.dict(exclude_none=True)
    
    # Handle field mapping for backend consistency
    if 'primary_crops' not in profile_data and 'primaryCrop' in profile_data:
        profile_data['primary_crops'] = [profile_data['primaryCrop']]
        
    if 'land_size' not in profile_data and 'landSize' in profile_data:
        profile_data['land_size'] = profile_data['landSize']
        
    if 'soil_type' not in profile_data and 'soilType' in profile_data:
        profile_data['soil_type'] = profile_data['soilType']

    if 'water_access' not in profile_data and 'irrigationType' in profile_data:
        profile_data['water_access'] = profile_data['irrigationType']
        
    if 'risk_tolerance' not in profile_data and 'riskLevel' in profile_data:
         profile_data['risk_tolerance'] = profile_data['riskLevel']

    success = ProfileManager.update_farmer_profile(profile.uid, profile_data)
    if success:
        return {"message": "Profile updated successfully", "updated_fields": profile_data}
    raise HTTPException(status_code=500, detail="Failed to update profile")
