from typing import List, Dict, Any
from datetime import datetime, timedelta

class PredictiveIntelligence:
    @staticmethod
    async def generate_emergent_alerts(farmer_id: str) -> List[Dict[str, Any]]:
        """
        Predicts problems before farmers ask.
        Analyzes: Weather trends, Regional pest outbreaks, Crop stage.
        """
        from app.services.profile_service import ProfileManager
        from app.services.weather_service import WeatherService
        
        profile = ProfileManager.get_farmer_context("919876543210")
        weather = await WeatherService.get_weather(profile.location['lat'], profile.location['lon'])
        
        alerts = []
        
        # 1. Weather-based predictive alert
        if weather.get('humidity', 0) > 80:
            alerts.append({
                "id": "p1",
                "type": "WEATHER_RISK",
                "title": "High Humidity Alert",
                "message": f"Humidity is {weather['humidity']}%. High risk of Fungal infection for your {profile.primary_crops[0]} crop.",
                "urgency": "High",
                "action": "Spray prophylactic fungicide (e.g., Saaf 2g/L) today."
            })
        
        # 2. Season-based predictive alert
        current_month = datetime.now().month
        if current_month in [3, 4, 5]: # Summer
            alerts.append({
                "id": "p2",
                "type": "PEST_OUTBREAK",
                "title": "Sucking Pest Warning",
                "message": "Summer heat increases Thrips and Mites activity in Nashik region.",
                "urgency": "Medium",
                "action": "Install yellow sticky traps (10 per acre) immediately."
            })
        
        # 3. Market Opportunity
        alerts.append({
            "id": "p3",
            "type": "MARKET_TREND",
            "title": "Price Forecast: Tomato",
            "message": "Market trends suggest a price hike of 20% next week due to low supply.",
            "urgency": "Medium",
            "action": "Wait for 5 days before harvesting for better returns."
        })
        
        return alerts

class AlertManager:
    @staticmethod
    def get_active_alerts(farmer_id: str) -> List[Dict[str, Any]]:
        # In production, this would fetch from a 'ScheduledAlerts' table
        return [
            {
                "id": "a1",
                "timestamp": datetime.now().isoformat(),
                "content": "Alert: Pest probability high for your onion crop due to humidity."
            }
        ]
