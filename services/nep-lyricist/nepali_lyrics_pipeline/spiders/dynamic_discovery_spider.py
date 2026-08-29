import scrapy
import trafilatura
import redis
import os
from urllib.parse import urlparse
from trafilatura.sitemaps import sitemap_search
from nepali_lyrics_pipeline.utils.discovery_engine import DiscoveryEngine
from nepali_lyrics_pipeline.items import SongLyricItem

class DynamicDiscoverySpider(scrapy.Spider):
    name = "dynamic_discovery"
    
    def __init__(self, *args, **kwargs):
        super(DynamicDiscoverySpider, self).__init__(*args, **kwargs)
        self.engine = DiscoveryEngine()
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

    def start_requests(self):
        self.logger.info("🧬 STARTING DYNAMIC DISCOVERY LOOP")
        
        # 1. Identify Already Fetched Domains (to exclude them from discovery)
        fetched_domains = list(self.redis.smembers("factory:known_domains"))
        self.logger.info(f"Excluding {len(fetched_domains)} already known domains from fresh discovery.")

        # 2. Search for new seeds via Search Engine
        url_to_query = {}
        try:
            url_to_query = self.engine.find_new_seeds(query_count=3, exclude_domains=fetched_domains)
            discovered_seeds = list(url_to_query.keys())
            self.logger.info(f"Discovered {len(discovered_seeds)} fresh dynamic seeds.")
        except Exception as e:
            self.logger.error(f"Discovery Engine failed: {e}")
            discovered_seeds = []

        # 3. Add Historical Seeds from Redis (Autonomous Memory)
        if fetched_domains:
            self.logger.info(f"Injecting {len(fetched_domains)} known domains from historical memory.")
            for domain in fetched_domains:
                # Add base URL and common subpaths
                discovered_seeds.append(f"https://{domain}/")
                discovered_seeds.append(f"https://{domain}/lyrics")
        
        discovered_seeds = list(set(discovered_seeds))

        # Final safety check: if we are completely empty, we need at least one entry point
        if not discovered_seeds:
            self.logger.warning("System search blocked or failed. Using bootstrap universe.")
            discovered_seeds = [
                "https://nepalilyricscollection.blogspot.com/",
                "https://genius.com/artists/Narayan-gopal",
                "https://nepali-songslyrics.com/",
                "https://hamrochords.com/",
                "https://chordsnepal.com/",
                "https://www.lyricsnepal.com/",
                "https://songsdiary.com/",
                "https://merochords.com/",
                "http://nepalichords.com/"
            ]
        
        # 4. Add potential sitemaps
        sitemaps = self.engine.get_sitemap_urls(discovered_seeds)
        
        # 5. Process Seeds
        for url in discovered_seeds:
            query = url_to_query.get(url)
            yield scrapy.Request(
                url, 
                callback=self.parse_generic_page, 
                priority=5,
                meta={'discovery_query': query}
            )

        # 6. Process Sitemaps
        for url in sitemaps:
            # Try to propagate the query if we know which seed this sitemap belongs to
            query = None
            for seed_url, q in url_to_query.items():
                if urlparse(seed_url).netloc == urlparse(url).netloc:
                    query = q
                    break
            yield scrapy.Request(
                url, 
                callback=self.parse_sitemap_xml, 
                priority=10,
                meta={'discovery_query': query}
            )

    def parse_sitemap_xml(self, response):
        domain = urlparse(response.url).netloc
        self.engine.update_domain_status(domain, response.status)

        response.selector.remove_namespaces()
        links = response.xpath('//url/loc/text()').getall() or \
                response.xpath('//sitemap/loc/text()').getall()
        
        self.logger.info(f"Found {len(links)} links in {response.url}")
        query = response.meta.get('discovery_query')
        
        for url in links:
            if url.endswith('.xml'):
                yield scrapy.Request(url, callback=self.parse_sitemap_xml, meta={'discovery_query': query})
            else:
                # Prioritize lyrics and songs
                priority = 0
                if any(k in url.lower() for k in ['lyrics', 'song', 'poetry']):
                    priority = 10
                
                # Ignore noisy pages
                if any(k in url.lower() for k in ['/author/', '/category/', '/tag/', '/product/', '/news/', '/events/']):
                    continue

                yield scrapy.Request(
                    url, 
                    callback=self.parse_generic_page, 
                    priority=priority,
                    meta={'discovery_query': query}
                )

    def parse_generic_page(self, response):
        domain = urlparse(response.url).netloc
        self.engine.update_domain_status(domain, response.status)
        self.logger.info(f"Scraping: {response.url} (Status: {response.status})")
        
        # 1. Recursive Discovery: Extract all outbound links
        all_links = response.xpath('//a/@href').getall()
        current_domain = urlparse(response.url).netloc
        
        for link in all_links:
            if not link.startswith('http'):
                continue
            
            link_domain = urlparse(link).netloc
            if link_domain and link_domain != current_domain:
                # If we find a domain that looks like a potential lyrics site
                if any(k in link.lower() for k in ['lyrics', 'chord', 'song', 'geet']):
                    # Check if deprioritized and NOT already in our database
                    if not self.engine.is_deprioritized(link_domain) and \
                       not self.redis.sismember("factory:known_domains", link_domain):
                        self.logger.info(f"🔍 Found potential new domain via outbound link: {link_domain}")
                        # Yield a low-priority discovery request
                        yield scrapy.Request(
                            f"https://{link_domain}/", 
                            callback=self.parse_generic_page,
                            priority=1,
                            meta={'discovery_query': f"outbound_from:{current_domain}"}
                        )

        # 2. Extract Lyrics Content
        downloaded = trafilatura.fetch_url(response.url)
        if downloaded:
            result = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
            
            # Lyrics are usually long
            if result and len(result) > 300:
                domain = urlparse(response.url).netloc
                query = response.meta.get('discovery_query')

                if domain:
                    # If this is a NEW domain, increment query success
                    is_new = self.redis.sadd("factory:known_domains", domain)
                    if is_new and query:
                        self.logger.info(f"✨ NEW DOMAIN discovered via query: {query}")
                        self.redis.incr(f"stats:query_success:{query}")
                
                item = SongLyricItem()
                raw_title = response.xpath('//h1/text()').get() or \
                            response.xpath('//meta[@property="og:title"]/@content').get() or \
                            response.css('title::text').get() or ""
                
                # Clean and sanitize the title
                title = raw_title.strip()
                
                # Weak Title Fallback: Prevent Redis collisions for empty titles
                if not title or len(title) < 5:
                    # Use first meaningful line as temporary title
                    lines = [l.strip() for l in result.split('\n') if l.strip()]
                    title = lines[0][:50] if lines else "Untitled Discovery"

                item['title'] = title
                item['artist'] = domain
                item['lyrics'] = result
                item['source_url'] = response.url
                item['script_type'] = "Natural"
                item['discovery_query'] = query
                yield item
