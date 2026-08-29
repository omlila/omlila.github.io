import scrapy
from urllib.parse import urlparse

class DiscoverySpider(scrapy.Spider):
    name = "discovery"
    
    # Starting with a few seed search queries on a directory or search engine
    # For now, let's use some directory sites or common lists
    start_urls = [
        "https://www.google.com/search?q=site:blogspot.com+nepali+lyrics",
        "https://www.google.com/search?q=nepali+songs+lyrics+collection"
    ]

    custom_settings = {
        'ROBOTSTXT_OBEY': False,  # Google often blocks bots
        'DOWNLOAD_DELAY': 5,      # Be very gentle with search engines
    }

    def parse(self, response):
        # Extract links that look like they belong to lyrics sites
        for link in response.css('a::attr(href)').getall():
            if 'http' in link and not any(x in link for x in ['google.com', 'webcache', 'search']):
                domain = urlparse(link).netloc
                if domain:
                    yield {
                        'discovered_domain': domain,
                        'source_url': link
                    }
        
        # Follow pagination if possible (simplified for now)
