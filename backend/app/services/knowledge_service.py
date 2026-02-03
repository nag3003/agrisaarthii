from typing import List, Dict, Any

class KnowledgeService:
    @staticmethod
    def get_crop_calendar(crop: str, region: str) -> List[Dict[str, Any]]:
        """
        Provides pre-downloadable crop calendars for offline use.
        """
        calendars = {
            "Tomato": [
                {"id": "t1", "stage": "Sowing", "month": "June", "actions": "Prepare raised beds, use treated seeds (Thiram 2g/kg).", "warning": "Avoid low-lying areas to prevent damping off."},
                {"id": "t2", "stage": "Transplanting", "month": "July", "actions": "Seedling dip in Imidacloprid (0.5ml/L). Spacing 60x45cm.", "warning": "Check for root-knot nematodes."},
                {"id": "t3", "stage": "Flowering", "month": "August", "actions": "Apply 19:19:19 fertilizer. Boron spray (1g/L) for fruit set.", "warning": "Critical stage for Thrips and Whitefly."},
                {"id": "t4", "stage": "Fruiting", "month": "September", "actions": "Apply Calcium Nitrate for fruit quality. Mulching recommended.", "warning": "Look for Fruit Borer damage."},
                {"id": "t5", "stage": "Harvesting", "month": "October", "actions": "Harvest at 'breaker' stage. Grade by size and color.", "warning": "Pre-cooling improves shelf life."}
            ],
            "Onion": [
                {"id": "o1", "stage": "Nursery", "month": "October", "actions": "Raised beds with FYM. Treat seeds with Trichoderma.", "warning": "Damping off risk in case of late rains."},
                {"id": "o2", "stage": "Transplanting", "month": "December", "actions": "Irrigate immediately after transplanting. Spacing 15x10cm.", "warning": "Watch for Purple Blotch symptoms."},
                {"id": "o3", "stage": "Bulb Development", "month": "February", "actions": "Top dress with Urea. Ensure uniform soil moisture.", "warning": "Thrips outbreak probability increases."},
                {"id": "o4", "stage": "Harvesting", "month": "April", "actions": "Neck fall stage (50%). Cure in shade for 3 days.", "warning": "Sunscald risk if left in open field."}
            ]
        }
        return calendars.get(crop, [{"message": "Calendar not found for this crop/region."}])

    @staticmethod
    def get_seasonal_advice(season: str, crop: str) -> str:
        """
        Cached advice for the current season to be stored on-device.
        """
        return f"General advice for {crop} in {season}: Ensure proper drainage and monitor for fungal infections due to high humidity."
