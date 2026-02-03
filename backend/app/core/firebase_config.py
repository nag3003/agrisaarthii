import firebase_admin
from firebase_admin import credentials
from app.core.config import settings
import os
import json

def initialize_firebase():
    """
    Initializes Firebase Admin SDK using service account credentials.
    Priority:
    1. FIREBASE_SERVICE_ACCOUNT_JSON (Environment variable with JSON string)
    2. FIREBASE_SERVICE_ACCOUNT_PATH (Environment variable with path to JSON file)
    3. Application Default Credentials (ADC) - useful for GCP environments
    4. Default path: serviceAccountKey.json
    """
    if not firebase_admin._apps:
        try:
            cred = None
            
            # 1. Check for JSON string in env
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if sa_json:
                cred = credentials.Certificate(json.loads(sa_json))
            
            # 2. Check for path in env
            if not cred:
                sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
                if sa_path and os.path.exists(sa_path):
                    cred = credentials.Certificate(sa_path)
            
            # 3. Try Application Default Credentials
            if not cred:
                try:
                    cred = credentials.ApplicationDefault()
                except Exception:
                    pass
            
            # 4. Fallback to default local file
            if not cred:
                default_path = "serviceAccountKey.json"
                if os.path.exists(default_path):
                    cred = credentials.Certificate(default_path)
            
            if cred:
                app = firebase_admin.initialize_app(cred)
                print("✅ Firebase Admin SDK initialized successfully.")
                return app
            else:
                print("⚠️ No Firebase credentials found (checked ENV, ADC, and local file). Skipping initialization.")
                return None
        except Exception as e:
            print(f"❌ Failed to initialize Firebase Admin SDK: {e}")
            return None
    return firebase_admin.get_app()
