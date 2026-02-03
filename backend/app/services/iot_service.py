from typing import Dict, Any, Optional
from datetime import datetime

class IoTService:
    @staticmethod
    async def process_sensor_data(farmer_id: str, sensor_type: str, value: float) -> Dict[str, Any]:
        """
        Processes data from field sensors (e.g., ESP32 with Soil Moisture sensor).
        Integrates with Weather and AI for smart decisions.
        """
        from app.services.weather_service import WeatherService
        from app.services.profile_service import ProfileManager
        
        profile = ProfileManager.get_farmer_context("919876543210")
        weather = await WeatherService.get_weather(profile.location['lat'], profile.location['lon'])
        
        motor_action = "STAY_OFF"
        voice_alert = "Moisture levels are optimal. No action needed."
        
        if sensor_type == "soil_moisture":
            if value < 30: # 30% threshold
                # Smart Decision: If soil is dry but rain is expected (>60%), wait.
                if weather.get('rain_prob', 0) > 60:
                    motor_action = "STAY_OFF"
                    voice_alert = "Soil is dry, but heavy rain is expected in 4 hours. Motor NOT started to save water and cost."
                else:
                    motor_action = "TURN_ON"
                    voice_alert = f"Soil moisture is low at {value}%. Starting motor for 30 minutes."
            elif value > 80:
                motor_action = "TURN_OFF"
                voice_alert = "Soil is saturated. Motor stopped to prevent waterlogging."
            else:
                voice_alert = f"Soil moisture is at {value}%. This is perfect for your {profile.primary_crops[0]} crop."

        return {
            "sensor": sensor_type,
            "current_value": value,
            "current_temp": weather.get('temp', 30),
            "weather_condition": weather.get('condition', 'Sunny'),
            "weather_context": f"Rain Prob: {weather.get('rain_prob', 0)}%",
            "timestamp": datetime.now().isoformat(),
            "motor_status": motor_action,
            "voice_alert": voice_alert,
            "savings_estimate": "Saved ₹25 in electricity by using rain forecast." if motor_action == "STAY_OFF" and value < 30 else "N/A"
        }

    @staticmethod
    async def control_motor(farmer_id: str, action: str) -> Dict[str, Any]:
        """
        Directly controls the motor via the IoT Gateway.
        """
        # Mocking signal to ESP32
        print(f"DEBUG: Sending {action} signal to Motor for Farmer {farmer_id}")
        return {
            "status": "success",
            "action": action,
            "timestamp": datetime.now().isoformat()
        }
