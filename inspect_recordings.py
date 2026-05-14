import os
import asyncio
import httpx
import jwt
import time
from dotenv import load_dotenv

load_dotenv("backend/.env")

VIDEOSDK_API_KEY = os.getenv("VIDEOSDK_API_KEY")
VIDEOSDK_SECRET = os.getenv("VIDEOSDK_SECRET")

async def list_recordings():
    iat = int(time.time())
    exp = iat + 3600
    payload = {
        "apikey": VIDEOSDK_API_KEY,
        "permissions": ["allow_join"],
        "iat": iat,
        "exp": exp,
        "version": 2
    }
    # VideoSDK sometimes needs the key to be the secret or something else? 
    # Usually it's jwt.encode(payload, secret, algorithm="HS256")
    token = jwt.encode(payload, VIDEOSDK_SECRET, algorithm="HS256")
    
    # Try both v1 and v2 or meeting-recordings
    urls = [
        "https://api.videosdk.live/v1/meeting-recordings",
        "https://api.videosdk.live/v2/recordings"
    ]
    
    async with httpx.AsyncClient() as client:
        for url in urls:
            print(f"Checking URL: {url}")
            response = await client.get(url, headers={"Authorization": token})
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Data count: {len(data.get('data', []))}")
                if data.get('data'):
                    return data
            else:
                print(f"Error: {response.text}")
    return None

async def main():
    recordings = await list_recordings()
    if recordings:
        for rec in recordings.get("data", []):
            print("---")
            print(rec)
    else:
        print("No recordings found.")

if __name__ == "__main__":
    asyncio.run(main())
