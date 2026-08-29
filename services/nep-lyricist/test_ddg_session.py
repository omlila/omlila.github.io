import requests
from bs4 import BeautifulSoup
import time

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
}

query = "Nepali lyrics"
url = f"https://html.duckduckgo.com/html/?q={query}"

session = requests.Session()
resp = session.get(url, headers=headers, timeout=10)
print(f"Initial Status: {resp.status_code}")

if resp.status_code == 202:
    print("Received 202. Waiting and retrying...")
    time.sleep(2)
    # Check if there is a form to submit or a redirect URL
    soup = BeautifulSoup(resp.text, 'html.parser')
    form = soup.find('form')
    if form:
        print("Found form in 202 response. Submitting...")
        data = {input.get('name'): input.get('value') for input in form.find_all('input') if input.get('name')}
        action = form.get('action')
        if not action.startswith('http'):
            action = "https://html.duckduckgo.com" + action
        resp = session.post(action, data=data, headers=headers)
        print(f"Post-form Status: {resp.status_code}")

print(f"Final Status: {resp.status_code}")
if resp.status_code == 200:
    print(f"Success! Found {resp.text.count('result__a')} results.")
else:
    print(resp.text[:1000])
