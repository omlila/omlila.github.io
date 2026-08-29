import os
import redis
import requests
import pandas as pd
from urllib.parse import urlparse
from bs4 import BeautifulSoup

def run_diagnostics():
    print("="*40)
    print("      FACTORY DIAGNOSTICS")
    print("="*40)

    # 1. Redis Check
    print("[1] Checking Redis...")
    try:
        host = os.getenv('REDIS_HOST', 'localhost')
        port = int(os.getenv('REDIS_PORT', 6379))
        r = redis.Redis(host=host, port=port, decode_responses=True)
        r.ping()
        print("    ✅ Redis is reachable.")
    except Exception as e:
        print(f"    ❌ Redis Error: {e}")

    # 2. Ollama Check
    print("[2] Checking Ollama (AI Cleaner)...")
    try:
        # Note: If in Docker, this needs host.docker.internal
        url = "http://localhost:11434/api/tags"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            models = [m['name'] for f in resp.json().get('models', [])]
            print(f"    ✅ Ollama is reachable. Models: {models}")
        else:
            print(f"    ❌ Ollama returned status {resp.status_code}")
    except Exception as e:
        print(f"    ❌ Ollama Error: {e}")

    # 3. Website Connectivity
    sites = ["https://www.lyricsnepal.com/", "https://songsdiary.com/"]
    print("[3] Checking Website Connectivity...")
    for site in sites:
        try:
            resp = requests.get(site, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
            print(f"    ✅ {site}: Status {resp.status_code}")
            soup = BeautifulSoup(resp.text, 'html.parser')
            links = soup.find_all('a')
            print(f"       Found {len(links)} links.")
        except Exception as e:
            print(f"    ❌ {site} Error: {e}")

    # 4. Storage Permissions
    print("[4] Checking File System...")
    try:
        os.makedirs("data/test_write", exist_ok=True)
        with open("data/test_write/test.txt", "w") as f:
            f.write("test")
        os.remove("data/test_write/test.txt")
        os.rmdir("data/test_write")
        print("    ✅ Data directory is writable.")
    except Exception as e:
        print(f"    ❌ File System Error: {e}")

    print("="*40)

if __name__ == "__main__":
    run_diagnostics()
