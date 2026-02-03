import sys
import os

# Create a mock environment
os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"] = "{}"
sys.path.append("/Users/nag/Desktop/agrisarathi trae/backend")

try:
    from app.services.profile_service import ProfileManager, ContextInjector
    from app.api.routes.profile import router, ProfileUpdate
    print("Imports successful")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
