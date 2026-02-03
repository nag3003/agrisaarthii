import firebase_admin
from firebase_admin import credentials
import google.auth
from google.auth.transport.requests import Request
import httpx
import os
from typing import List, Dict, Optional

class FirebaseMgmtService:
    @staticmethod
    async def get_access_token() -> str:
        """
        Gets an OAuth2 access token for the Firebase Management API.
        """
        scopes = ['https://www.googleapis.com/auth/cloud-platform']
        creds, project = google.auth.default(scopes=scopes)
        auth_request = Request()
        creds.refresh(auth_request)
        return creds.token

    @staticmethod
    async def list_available_projects() -> List[Dict]:
        """
        Lists available Google Cloud projects for the current account.
        """
        try:
            token = await FirebaseMgmtService.get_access_token()
            url = "https://firebase.googleapis.com/v1beta1/availableProjects"
            headers = {"Authorization": f"Bearer {token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                data = response.json()
                
                if response.status_code != 200:
                    print(f"❌ Error from Firebase API: {data.get('error', {}).get('message')}")
                    return []
                
                return data.get('projectInfo', [])
        except Exception as e:
            print(f"❌ Failed to list projects: {e}")
            return []

    @staticmethod
    async def add_firebase_to_project(project_id: str) -> Dict:
        """
        Adds Firebase to an existing Google Cloud project.
        """
        try:
            token = await FirebaseMgmtService.get_access_token()
            # The project_id might already have 'projects/' prefix
            clean_id = project_id.replace("projects/", "")
            url = f"https://firebase.googleapis.com/v1beta1/projects/{clean_id}:addFirebase"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers)
                return response.json()
        except Exception as e:
            return {"error": {"message": str(e)}}
