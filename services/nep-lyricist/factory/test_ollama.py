import requests
import json
import os

def test_ollama():
    url = os.getenv('OLLAMA_URL', 'http://host.docker.internal:11434/api/generate')
    model = "gemma4:e4b"
    
    print(f"Testing connection to Ollama at: {url}")
    print(f"Using model: {model}")
    
    prompt = "Is 'Phoolko aankhama' a Nepali song? Respond with JSON: {'is_valid': true}"
    
    try:
        resp = requests.post(url, json={
            "model": model,
            "prompt": prompt,
            "format": "json",
            "stream": False
        }, timeout=10)
        
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
        
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        print("\nPossible fixes:")
        print("1. Ensure 'ollama serve' is running with OLLAMA_HOST=0.0.0.0")
        print("2. Check if your Mac firewall is blocking port 11434")

if __name__ == "__main__":
    test_ollama()
