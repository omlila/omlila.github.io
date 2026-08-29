import requests
from bs4 import BeautifulSoup
import time

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

query = "Nepali song lyrics"
url = f"https://html.duckduckgo.com/html/?q={query}"

print(f"Testing DDG Search for: {query}")
resp = requests.get(url, headers=headers, timeout=10)
print(f"Status Code: {resp.status_code}")

if resp.status_code == 200:
    soup = BeautifulSoup(resp.text, 'html.parser')
    results = soup.find_all('a', class_='result__a')
    print(f"Found {len(results)} results with class 'result__a'")
    for a in results[:5]:
        print(f" - {a.text.strip()}: {a['href']}")
    
    if len(results) == 0:
        print("Raw HTML snippet (first 500 chars):")
        print(resp.text[:500])
else:
    print(f"Error Response: {resp.text[:500]}")
