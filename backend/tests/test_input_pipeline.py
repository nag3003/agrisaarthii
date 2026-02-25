import requests
import json
import os

BASE_URL = "http://localhost:8000/api"

def test_health_check():
    print("Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_advisory_input():
    print("\nTesting Advisory Input (Text)...")
    payload = {
        "text": "How to grow tomatoes?",
        "context": {
            "farmer_name": "Test Farmer",
            "location": "Nashik",
            "current_season": "Summer",
            "weather": "Sunny",
            "language": "en"
        }
    }
    try:
        response = requests.post(f"{BASE_URL}/query/advice", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Advice: {data.get('advice', {}).get('advice')}")
        return response.status_code == 200 and "advice" in data
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_voice_transcribe_input():
    print("\nTesting Voice Transcribe Input (Mock File)...")
    # Create a dummy file if needed or just test the endpoint existence
    # For now, let's just check if the endpoint is reachable
    try:
        # We expect a 422 if we don't send a file, which means the endpoint exists
        response = requests.post(f"{BASE_URL}/voice/transcribe")
        print(f"Status (Expected 422/400): {response.status_code}")
        return response.status_code in [422, 400]
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    h = test_health_check()
    a = test_advisory_input()
    v = test_voice_transcribe_input()
    
    print("\n--- Test Summary ---")
    print(f"Health Check: {'PASS' if h else 'FAIL'}")
    print(f"Advisory Input: {'PASS' if a else 'FAIL'}")
    print(f"Voice Transcribe: {'PASS' if v else 'FAIL'}")
    
    if all([h, a, v]):
        print("\nAll input pipeline tests passed!")
    else:
        print("\nSome tests failed. Check backend logs.")
