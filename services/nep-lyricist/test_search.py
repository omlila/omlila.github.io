import sys
from googlesearch import search

query = "Nepali songs lyrics"
print(f"Searching for: {query}")
try:
    results = list(search(query, num_results=5))
    print(f"Found {len(results)} results:")
    for r in results:
        print(f" - {r}")
except Exception as e:
    print(f"Error: {e}")
