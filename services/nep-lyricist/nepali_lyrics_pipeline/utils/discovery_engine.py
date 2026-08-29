import random
import requests
import time
import redis
import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, parse_qs
from nepali_lyrics_pipeline.utils.search_generator import SearchQueryGenerator

class DiscoveryEngine:
    """
    Dynamically finds new lyrics websites using search engine automation.
    Tracks domain health to deprioritize failing sources instead of blocking.
    """
    BLOCKLIST = [
        'google', 'duckduckgo', 'facebook', 'youtube', 'instagram', 'twitter', 'x.com',
        'linkedin', 'spotify', 'apple.com', 'amazon', 'microsoft', 'pinterest', 
        'tiktok', 'reddit', 'wikipedia', 'medium.com', 'academia.edu'
    ]

    def __init__(self):
        self.query_gen = SearchQueryGenerator()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=True
        )

    def update_domain_status(self, domain, status):
        """Logs the HTTP status for a domain and increments failure counts if needed."""
        if not domain: return
        self.redis.hset(f"domain:health:{domain}", "last_status", status)
        self.redis.hset(f"domain:health:{domain}", "last_seen", time.time())
        if status >= 400:
            self.redis.hincrby(f"domain:health:{domain}", "fail_count", 1)
        else:
            self.redis.hset(f"domain:health:{domain}", "fail_count", 0)

    def is_deprioritized(self, domain):
        """Returns True if the domain has failed too many times recently."""
        fail_count = int(self.redis.hget(f"domain:health:{domain}", "fail_count") or 0)
        return fail_count > 10 # Increased threshold

    def find_new_seeds(self, query_count=5, exclude_domains=None):
        """
        Returns a dictionary mapping discovered URLs to the query that found them.
        """
        if exclude_domains is None:
            exclude_domains = []
            
        top_queries = self.get_top_queries(limit=3)
        queries = self.query_gen.generate(query_count, top_successful_queries=top_queries)
        url_to_query_map = {}
        
        session = requests.Session()
        session.headers.update(self.headers)

        for query in queries:
            print(f"[Discovery] Searching for: {query}")
            try:
                self.redis.incr(f"stats:query_attempts:{query}")
                self.redis.sadd("factory:search_history", query)
            except Exception as e:
                print(f"[Discovery] Redis logging failed: {e}")

            url = f"https://html.duckduckgo.com/html/?q={query}"
            
            try:
                resp = session.get(url, timeout=15)
                
                # Handle DDG "Accepted" 202 challenge
                if resp.status_code == 202:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    form = soup.find('form')
                    if form:
                        data = {i.get('name'): i.get('value') for i in form.find_all('input') if i.get('name')}
                        action = form.get('action')
                        if action and not action.startswith('http'):
                            action = urljoin("https://html.duckduckgo.com", action)
                        resp = session.post(action, data=data, timeout=15)

                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    for a in soup.find_all('a', class_='result__a'):
                        href = a.get('href')
                        if not href: continue
                        
                        # Ensure absolute URL
                        full_url = urljoin("https://html.duckduckgo.com", href)
                        
                        # Handle DDG internal redirection
                        if "/l/?uddg=" in full_url:
                            parsed_qs = parse_qs(urlparse(full_url).query)
                            if 'uddg' in parsed_qs:
                                full_url = parsed_qs['uddg'][0]

                        domain = urlparse(full_url).netloc
                        if domain and not self.is_deprioritized(domain) and domain not in exclude_domains:
                            # Final blocklist check for essential junk
                            if not any(x in domain.lower() for x in ['google', 'duckduckgo', 'bing', 'yandex']):
                                url_to_query_map[full_url] = query
                
                time.sleep(random.uniform(3, 7))
            except Exception as e:
                print(f"[Discovery] Search failed for '{query}': {e}")
        
        return url_to_query_map

    def get_top_queries(self, limit=5):
        """
        Returns the most successful query strings based on historical hit rate.
        """
        try:
            all_success_keys = self.redis.keys("stats:query_success:*")
            if not all_success_keys:
                return []
            
            query_stats = []
            for key in all_success_keys:
                query = key.replace("stats:query_success:", "")
                success = int(self.redis.get(key) or 0)
                attempts = int(self.redis.get(f"stats:query_attempts:{query}") or 1)
                rate = success / attempts
                query_stats.append((query, rate))
            
            query_stats.sort(key=lambda x: x[1], reverse=True)
            return [q[0] for q in query_stats[:limit]]
        except Exception as e:
            print(f"[Discovery] Failed to fetch top queries: {e}")
            return []

    def get_sitemap_urls(self, domain_urls):
        """
        Guesses sitemap locations for discovered domains.
        """
        sitemaps = []
        for url in domain_urls:
            parsed = urlparse(url)
            if not parsed.netloc: continue
            base = f"{parsed.scheme}://{parsed.netloc}"
            sitemaps.append(f"{base}/sitemap_index.xml")
            sitemaps.append(f"{base}/sitemap.xml")
            sitemaps.append(f"{base}/post-sitemap.xml")
        return list(set(sitemaps))

if __name__ == "__main__":
    engine = DiscoveryEngine()
    seeds = engine.find_new_seeds(2)
    print(f"Discovered {len(seeds)} new seeds.")
    for s, q in seeds.items():
        print(f" - {s} (found by: {q})")
