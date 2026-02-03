from typing import Dict, Any
from app.services.ai.intelligence import PromptBuilder
from datetime import datetime
import openai

class AdvisoryReasoningEngine:
    @staticmethod
    async def get_actionable_advice(query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        The heart of AgriSaarthi: Converts query + context into 'Action-First' advice.
        """
        from app.services.profile_service import ProfileManager, ContextInjector
        
        # Get context if not provided
        if not context:
            profile = ProfileManager.get_farmer_context("919876543210")
            weather = {"temp": 32, "condition": "Sunny but Cloudy"}
            market = {"avg_price": "₹25/kg"}
            context = ContextInjector.inject(profile, weather, market)

        # STEP 1: Detect Intent
        query_lower = query.lower()
        is_pest = any(word in query_lower for word in ["curling", "pest", "bug", "insect", "yellow", "spot"])
        is_irrigation = any(word in query_lower for word in ["water", "dry", "irrigation", "motor", "pump"])
        
        # STEP 2: Reason based on Context
        if is_pest and "tomato" in query_lower:
            advice = f"Namaste {context['farmer_name']}. Based on the curling leaves in your tomato crop in {context['location']}, it is likely a Thrips infestation. Since it's {context['current_season']} and {context['weather']}, the pest spreads fast. ACTION: Spray Neem Oil (5ml/L) immediately. If it persists, use imidacloprid (0.5ml/L) in the evening."
            confidence = 0.85
            reasoning = "Curling leaves + Summer/Flowering stage = High Thrips probability in Nashik region."
        elif is_irrigation:
            advice = f"Ramesh, your soil moisture is {context.get('moisture', 'unknown')}. Since the weather is {context['weather']} and rain is expected, DO NOT start the motor today. Save your electricity and water."
            confidence = 0.92
            reasoning = "Predictive weather shows 80% rain chance. Current soil moisture is adequate."
        else:
            advice = f"I've analyzed your query about {query}. Based on your location in {context['location']}, please ensure you check for soil health before adding more fertilizer."
            confidence = 0.75
            reasoning = "Generic advice based on region-specific soil types."

        return {
            "id": f"adv_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "advice": advice,
            "confidence": confidence,
            "reasoning": reasoning,
            "urgency": "High" if is_pest else "Medium",
            "timestamp": datetime.now().isoformat()
        }

def generate_advice(query_text: str, context: dict) -> Dict[str, Any]:
    # This now uses the actual engine logic (mocked for now but with context)
    import asyncio
    from app.services.profile_service import ProfileManager, ContextInjector
    
    # In a real flow, we'd get these from actual services
    profile = ProfileManager.get_farmer_context("919876543210")
    weather = {"temp": 32, "condition": "Sunny but Cloudy"}
    market = {"avg_price": "₹25/kg"}
    
    rich_context = ContextInjector.inject(profile, weather, market)
    
    # Add real-time sensor data if available in context
    if "moisture" in context:
        rich_context["moisture"] = context["moisture"]

    # Run the async engine in the sync wrapper for routes.py
    return asyncio.run(AdvisoryReasoningEngine.get_actionable_advice(query_text, rich_context))
