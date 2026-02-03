from fastapi import APIRouter

router = APIRouter()

@router.get("/recommend")
async def get_video_recommendations(topic: str = "general"):
    # Mock video links from YouTube for farming
    return [
        {"title": "Wheat Farming Tips", "url": "https://youtube.com/watch?v=123", "thumbnail": "thumb1.jpg"},
        {"title": "Organic Pest Control", "url": "https://youtube.com/watch?v=456", "thumbnail": "thumb2.jpg"}
    ]
