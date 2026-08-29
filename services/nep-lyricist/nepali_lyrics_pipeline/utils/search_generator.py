import random
import requests
import json
import os
from factory import config

class SearchQueryGenerator:
    """
    Generates diverse and structured search queries to find Nepali lyrics
    across genres, time periods, and artists using LLM (Ollama) or local templates.
    """
    GENRES = ["Pop", "Rock", "Folk", "Lok Dohori", "Classic", "Modern", "Hip Hop", "Film"]
    KEYWORDS = ["lyrics", "lyrics in Devanagari", "romanized lyrics", "chords and lyrics", "full song lyrics"]
    YEARS = list(range(1980, 2027))
    
    PATTERNS = [
        "Nepali {genre} songs {keyword}",
        "Top Nepali songs of {year} {keyword}",
        "Nepali lyrics collection {genre}",
        "site:blogspot.com Nepali {genre} lyrics",
        "site:facebook.com Nepali lyrics {year}",
        "{genre} Nepali song lyrics 2026",
    ]

    def generate(self, count=5, top_successful_queries=None):
        """
        Generates queries using Ollama if available, otherwise falls back to templates.
        """
        try:
            return self._generate_with_ollama(count, top_successful_queries)
        except Exception as e:
            print(f"[SearchGen] Ollama generation failed, falling back: {e}")
            return self._generate_with_templates(count)

    def _generate_with_ollama(self, count, top_queries=None):
        prompt = f"""
You are an expert web discovery agent. Generate {count} search queries to find Nepali lyrics websites.

GUIDELINES:
1. Broad Queries: Use patterns like "Nepali lyrics site", "New Nepali songs lyrics 2026", "Nepali chords collection".
2. Diverse Platforms: Include site operators for niche platforms (site:blogspot.com, site:wordpress.com, site:facebook.com).
3. Script Variety: Use both English and Devanagari (e.g., नेपाली गीतको बोल).
4. No Over-Specificity: Avoid adding too many keywords in one query. Keep it to 3-5 words.

HISTORICAL SUCCESS (worked well):
"""
        if top_queries:
            prompt += "- " + "\n- ".join(top_queries)
        else:
            prompt += "- Nepali lyrics blogspot\n- site:facebook.com Nepali lyrics chords"
        
        prompt += f"""

Return ONLY a JSON list of strings.
Format: ["query 1", "query 2", ...]
"""
        response = requests.post(
            config.OLLAMA_URL,
            json={
                "model": config.MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=90
        )
        
        if response.status_code == 200:
            data = response.json()
            raw_response = data.get("response", "[]")
            try:
                queries = json.loads(raw_response)
                # Handle if LLM returns a dict like {"queries": [...]}
                if isinstance(queries, dict) and "queries" in queries:
                    queries = queries["queries"]
                
                if isinstance(queries, list) and len(queries) > 0:
                    return queries[:count]
            except Exception as parse_err:
                print(f"[SearchGen] JSON Parse failed: {parse_err}")
        
        print(f"[SearchGen] Ollama Error Detail: {response.text}")
        raise Exception(f"Ollama returned status {response.status_code}")

    def _generate_with_templates(self, count=20):
        queries = []
        for _ in range(count):
            pattern = random.choice(self.PATTERNS)
            query = pattern.format(
                genre=random.choice(self.GENRES),
                keyword=random.choice(self.KEYWORDS),
                year=random.choice(self.YEARS)
            )
            queries.append(query)
        return list(set(queries))

if __name__ == "__main__":
    gen = SearchQueryGenerator()
    for q in gen.generate(10):
        print(f"Generated: {q}")
