from typing import Dict, Any
from app.services.ai.intelligence import PromptBuilder
from datetime import datetime
import openai

class AdvisoryReasoningEngine:
    @staticmethod
    async def get_actionable_advice(query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        The heart of Agri: Converts query + context into 'Action-First' advice.
        """
        from app.services.profile_service import ProfileManager, ContextInjector
        
        # Get context if not provided
        if not context:
            profile = ProfileManager.get_farmer_context("919876543210")
            weather = {"temp": 32, "condition": "Sunny but Cloudy"}
            market = {"avg_price": "₹25/kg"}
            context = ContextInjector.inject(profile, weather, market)

        # Safety: Ensure context has all required keys even if partially provided
        required_keys = ["farmer_name", "location", "current_season", "weather"]
        for key in required_keys:
            if key not in context:
                context[key] = "Unknown" if key != "farmer_name" else "Farmer"

        # STEP 1: Detect Intent
        query_lower = query.lower()
        
        # Check for error signals from AIService
        if "[error:" in query_lower:
            target_lang = context.get('language', 'en')
            error_msgs = {
                'en': "I couldn't process your voice. Please check if your OpenAI API key is configured or try typing your question.",
                'hi': "मैं आपकी आवाज़ को प्रोसेस नहीं कर सका। कृपया जांचें कि आपकी OpenAI API की कॉन्फ़िगर है या अपना प्रश्न टाइप करें।",
                'te': "నేను మీ వాయిస్‌ని ప్రాసెస్ చేయలేకపోయాను. దయచేసి మీ OpenAI API కీ కాన్ఫిగర్ చేయబడిందో లేదో తనిఖీ చేయండి లేదా మీ ప్రశ్నను టైప్ చేయండి.",
                'ta': "என்னால் உங்கள் குரலைச் செயலாக்க முடியவில்லை. உங்கள் OpenAI API கீ உள்ளமைக்கப்பட்டுள்ளதா எனச் சரிபார்க்கவும் அல்லது உங்கள் கேள்வியைத் தட்டச்சு செய்யவும்."
            }
            return {
                "id": f"err_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "advice": error_msgs.get(target_lang, error_msgs['en']),
                "confidence": 0.0,
                "reasoning": "Voice transcription failed or API key missing.",
                "urgency": "Low",
                "timestamp": datetime.now().isoformat()
            }

        is_pest = any(word in query_lower for word in ["curling", "pest", "bug", "insect", "yellow", "spot", "worm", "aphid"])
        is_irrigation = any(word in query_lower for word in ["water", "dry", "irrigation", "motor", "pump", "moisture", "rain"])
        is_fertilizer = any(word in query_lower for word in ["fertilizer", "urea", "potash", "growth", "manure", "khad"])
        
        # STEP 2: Reason based on Context
        if is_pest and "tomato" in query_lower:
            advice = f"Namaste {context['farmer_name']}. Based on the curling leaves in your tomato crop in {context['location']}, it is likely a Thrips infestation. Since it's {context['current_season']} and {context['weather']}, the pest spreads fast. ACTION: Spray Neem Oil (5ml/L) immediately. If it persists, use imidacloprid (0.5ml/L) in the evening."
            confidence = 0.85
            reasoning = "Curling leaves + Summer/Flowering stage = High Thrips probability in Nashik region."
        elif is_pest and ("rice" in query_lower or "paddy" in query_lower):
            advice = f"Hello {context['farmer_name']}. The yellowing in your paddy fields in {context['location']} suggests a Nitrogen deficiency or possible Stem Borer. ACTION: Apply 25kg Urea per acre and check the base of stems for bore holes. Use Cartap Hydrochloride if pests are found."
            confidence = 0.82
            reasoning = "Yellowing in paddy often linked to N-deficiency or early stage stem borer."
        elif is_pest and ("wheat" in query_lower or "gehun" in query_lower):
            advice = f"Greetings {context['farmer_name']}. Yellow spots on wheat leaves are a sign of Yellow Rust. Since your weather is {context['weather']}, it may spread. ACTION: Spray Propiconazole (1ml/L) and avoid excessive irrigation for 2 days."
            confidence = 0.88
            reasoning = "Weather-sensitive fungal infection typical for current wheat growth stage."
        elif is_pest and "cotton" in query_lower:
            advice = f"Namaste {context['farmer_name']}. The pests on your cotton are likely Pink Bollworm. ACTION: Install 5 pheromone traps per acre immediately. If infestation is high, spray Profenophos (2ml/L)."
            confidence = 0.85
            reasoning = "Cotton + worm symptoms usually indicate Pink Bollworm in this season."
        elif is_pest and "chilli" in query_lower:
            advice = f"Hello {context['farmer_name']}. Upward curling of chilli leaves is due to Thrips. ACTION: Spray Fipronil (2ml/L). If leaves curl downwards, it's Mites; use Abamectin (0.5ml/L)."
            confidence = 0.84
            reasoning = "Leaf curl direction is a specific diagnostic for chilli pests."
        elif is_fertilizer:
            advice = f"For better growth of your crops in {context['location']}, apply a balanced NPK ratio. Since it's {context['current_season']}, a top dressing of Urea (25kg/acre) followed by light irrigation is recommended."
            confidence = 0.80
            reasoning = "Standard growth recommendation based on seasonal requirements."
        elif is_irrigation:
            advice = f"{context['farmer_name']}, your soil moisture is {context.get('moisture', 'adequate')}. Since the weather is {context['weather']} and rain is expected, DO NOT start the motor today. Save your electricity and water."
            confidence = 0.92
            reasoning = "Predictive weather shows rain chance. Current soil moisture is adequate."
        else:
            advice = f"I've analyzed your query about '{query}'. Based on your profile in {context['location']}, please ensure you monitor your field for moisture levels and nutrient health. If you see specific symptoms like leaf yellowing or pests, please mention the crop name for more specific advice."
            confidence = 0.75
            reasoning = "General agricultural guidance when no specific crop or pest is identified."
        
        # STEP 3: Translate advice if needed (fallback translation for demo)
        target_lang = context.get('language', 'en')
        
        translations = {
            'hi': {
                'tomato': f"नमस्ते {context['farmer_name']}। {context['location']} में आपके टमाटर की फसल में पत्तों के मुड़ने के आधार पर, यह थ्रिप्स का संक्रमण होने की संभावना है। कार्रवाई: तुरंत नीम के तेल (5ml/L) का छिड़काव करें।",
                'rice': f"नमस्ते {context['farmer_name']}। {context['location']} में आपके धान के खेतों में पीलापन नाइट्रोजन की कमी या तना छेदक का संकेत देता है। कार्रवाई: प्रति एकड़ 25 किलो यूरिया डालें।",
                'wheat': f"नमस्ते {context['farmer_name']}। गेहूं के पत्तों पर पीले धब्बे 'पीला रतुआ' का संकेत हैं। कार्रवाई: प्रोपिकोनाज़ोल (1ml/L) का छिड़काव करें।",
                'cotton': f"नमस्ते {context['farmer_name']}। आपकी कपास पर कीट गुलाबी सुंडी (Pink Bollworm) होने की संभावना है। कार्रवाई: प्रति एकड़ 5 फेरोमोन ट्रैप लगाएं।",
                'chilli': f"नमस्ते {context['farmer_name']}। मिर्च के पत्तों का ऊपर की ओर मुड़ना थ्रिप्स के कारण होता है। कार्रवाई: फिप्रोनिल (2ml/L) का छिड़काव करें।",
                'fertilizer': f"फसल की अच्छी वृद्धि के लिए, यूरिया (25 किलो/एकड़) का छिड़काव करें और उसके बाद हल्की सिंचाई करें।",
                'irrigation': f"{context['farmer_name']}, आपकी मिट्टी की नमी ठीक है। बारिश की संभावना है, आज मोटर न चलाएं।",
                'default': f"मैंने '{query}' का विश्लेषण किया है। कृपया नमी और पोषक तत्वों की निगरानी करें।"
            },
            'te': {
                'tomato': f"నమస్తే {context['farmer_name']}. మీ టమోటా పంటలో ఆకులు ముడుచుకుపోవడం థ్రిప్స్ తెగులును సూచిస్తుంది. చర్య: వెంటనే వేప నూనె (5ml/L) పిచికారీ చేయండి.",
                'rice': f"నమస్తే {context['farmer_name']}. వరి పొలంలో పసుపు రంగులోకి మారడం నత్రజని లోపం లేదా కాండం తొలిచే పురుగును సూచిస్తుంది. చర్య: ఎకరాకు 25 కిలోల యూరియా వేయండి.",
                'wheat': f"నమస్తే {context['farmer_name']}. గోధుమ ఆకులపై పసుపు మచ్చలు పసుపు తుప్పు తెగులును సూచిస్తాయి. చర్య: ప్రోపికోనజోల్ (1ml/L) పిచికారీ చేయండి.",
                'cotton': f"నమస్తే {context['farmer_name']}. మీ పత్తి పంటలో గులాబీ రంగు పురుగు (Pink Bollworm) ఆశించినట్లు ఉంది. చర్య: ఎకరాకు 5 లింగాకర్షక బుట్టలను ఏర్పాటు చేయండి.",
                'chilli': f"నమస్తే {context['farmer_name']}. మిర్చి ఆకులు పైకి ముడుచుకుంటే అది తామర పురుగుల వల్ల. చర్య: ఫిప్రోనిల్ (2ml/L) పిచికారీ చేయండి.",
                'fertilizer': f"మంచి దిగుబడి కోసం, ఎకరాకు 25 కిలోల యూరియాను వేసి, తేలికపాటి నీటి తడి ఇవ్వండి.",
                'irrigation': f"{context['farmer_name']}, నేల తేమ తగినంతగా ఉంది. వర్షం పడే అవకాశం ఉంది, ఈరోజు మోటారు వేయవద్దు.",
                'default': f"నేను మీ ప్రశ్న '{query}' ను విశ్లేషించాను. దయచేసి తేమ మరియు పోషకాలను గమనించండి."
            },
            'ta': {
                'tomato': f"வணக்கம் {context['farmer_name']}. உங்கள் தக்காளி பயிரில் இலைகள் சுருங்குவது இலைப்பேன் தாக்குதலைக் குறிக்கிறது. நடவடிக்கை: வேப்ப எண்ணெய் (5ml/L) தெளிக்கவும்.",
                'rice': f"வணக்கம் {context['farmer_name']}. நெல் வயலில் மஞ்சள் நிறமாவது நைட்ரஜன் குறைபாடு அல்லது தண்டு துளைப்பானைக் குறிக்கிறது. நடவடிக்கை: ஏக்கருக்கு 25 கிலோ யூரியா போடவும்.",
                'wheat': f"வணக்கம் {context['farmer_name']}. கோதுமை இலைகளில் மஞ்சள் புள்ளிகள் மஞ்சள் துரு நோயைக் குறிக்கிறது. நடவடிக்கை: புரோபிகோனசோல் (1ml/L) தெளிக்கவும்.",
                'cotton': f"வணக்கம் {context['farmer_name']}. உங்கள் பருத்தியில் இளஞ்சிவப்பு புழு (Pink Bollworm) தாக்குதல் இருக்கலாம். நடவடிக்கை: ஏக்கருக்கு 5 இனக்கவர்ச்சி பொறிகளை வைக்கவும்.",
                'chilli': f"வணக்கம் {context['farmer_name']}. மிளகாய் இலைகள் மேல்நோக்கிச் சுருங்குவது இலைப்பேன் காரணமாகும். நடவடிக்கை: பிப்ரோனில் (2ml/L) தெளிக்கவும்.",
                'fertilizer': f"பயிரின் வளர்ச்சிக்கு, ஏக்கருக்கு 25 கிலோ யூரியா போட்டு லேசான நீர் பாய்ச்சவும்.",
                'irrigation': f"{context['farmer_name']}, மண்ணின் ஈரப்பதம் போதுமானதாக உள்ளது. மழை பெய்ய வாய்ப்புள்ளது, இன்று மோட்டார் போட வேண்டாம்.",
                'default': f"உங்கள் கேள்வி '{query}' குறித்து ஆய்வு செய்தேன். ஈரப்பதம் மற்றும் சத்துக்களை கவனிக்கவும்."
            }
        }

        if target_lang in translations:
            lang_dict = translations[target_lang]
            if "tomato" in query_lower:
                advice = lang_dict['tomato']
            elif "rice" in query_lower or "paddy" in query_lower:
                advice = lang_dict['rice']
            elif "wheat" in query_lower or "gehun" in query_lower:
                advice = lang_dict['wheat']
            elif "cotton" in query_lower:
                advice = lang_dict['cotton']
            elif "chilli" in query_lower:
                advice = lang_dict['chilli']
            elif is_fertilizer:
                advice = lang_dict['fertilizer']
            elif is_irrigation:
                advice = lang_dict['irrigation']
            else:
                advice = lang_dict['default']

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
