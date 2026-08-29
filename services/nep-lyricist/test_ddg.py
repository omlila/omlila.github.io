import requests
from bs4 import BeautifulSoup

def test_ddg(query):
    print(f"Searching DuckDuckGo for: {query}")
    url = f"https://html.duckduckgo.com/html/?q={query}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        soup = BeautifulSoup(resp.text, 'html.parser')
        links = []
        for a in soup.find_all('a', class_='result__a'):
            links.append(a['href'])
        print(f"Found {len(links)} results:")
        for l in links:
            print(f" - {l}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ddg("Nepali songs lyrics")
