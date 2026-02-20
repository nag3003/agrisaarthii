import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set dummy API key for testing initialization if not present
if not os.environ.get("GROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = "gsk_dummy_key_for_testing"

from app.core.registry import SkillRegistry
from app.services.ai.jarvis import JarvisEngine

def test_weather(location: str):
    """
    Get weather for a location.
    """
    return f"Weather in {location} is Sunny, 25C"

def main():
    print("Initializing SkillRegistry...")
    registry = SkillRegistry()
    registry.register_skill(test_weather)
    
    print("Registered skills:", list(registry._skills.keys()))
    # print("Tools schema:", registry.get_tools_schema())
    
    print("\nInitializing JarvisEngine...")
    try:
        engine = JarvisEngine(registry)
        print("JarvisEngine initialized successfully.")
        
        # Verify schema generation
        schema = registry.get_tools_schema()[0]
        assert schema['function']['name'] == 'test_weather'
        assert 'location' in schema['function']['parameters']['properties']
        print("Schema generation verified.")
        
    except Exception as e:
        print(f"Error initializing JarvisEngine: {e}")

if __name__ == "__main__":
    main()
