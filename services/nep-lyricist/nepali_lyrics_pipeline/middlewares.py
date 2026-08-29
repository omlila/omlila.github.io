# Define here the models for your spider middleware
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/spider-middleware.html

from scrapy import signals

# useful for handling different item types with a single interface
from itemadapter import ItemAdapter


import redis
import os
import random
from scrapy.exceptions import IgnoreRequest
from urllib.parse import urlparse

class DomainCooldownMiddleware:
    def __init__(self, host, port):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)
        self.hit_limit = 100
        self.cooldown_base = 30 * 60 # 30 minutes

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            host=crawler.settings.get('REDIS_HOST', 'localhost'),
            port=crawler.settings.get('REDIS_PORT', 6379)
        )

    def process_request(self, request, spider):
        domain = urlparse(request.url).netloc
        if not domain:
            return None
        
        # 1. Check if already in cooldown
        if self.redis.get(f"cooldown:{domain}"):
            raise IgnoreRequest(f"🛡️  Domain {domain} is in cooldown.")

        # 2. Count this hit (Every page, sitemap, or redirect)
        hit_key = f"stats:hits:{domain}"
        total_hits = self.redis.incr(hit_key)

        # 3. Trigger rotation if hitting too much (even duplicates)
        if total_hits >= self.hit_limit:
            duration = self.cooldown_base + random.randint(0, 600) # 30-40 mins
            self.redis.setex(f"cooldown:{domain}", duration, "ACTIVE")
            self.redis.set(hit_key, 0)
            self.redis.set(f"stats:success:{domain}", 0)
            spider.logger.warning(f"🛡️  ROTATION TRIGGERED: {domain} reached {self.hit_limit} hits. Paused for {duration//60}m.")
            raise IgnoreRequest(f"🛡️  Moving to next domain...")
        
        return None

    def process_response(self, request, response, spider):
        # 1. Intercept 403/429 for immediate cooldown
        if response.status in [403, 429]:
            domain = urlparse(request.url).netloc
            if domain:
                duration = self.cooldown_base * 2 # 60 minutes for bans
                self.redis.setex(f"cooldown:{domain}", duration, "BANNED")
                spider.logger.error(f"🚫 BAN DETECTED: {domain} returned {response.status}. Cooldown for {duration//60}m.")
        
        return response

class RotateUserAgentMiddleware:
    """
    Randomly rotates User-Agent for every request to reduce fingerprinting.
    """
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    ]

    def process_request(self, request, spider):
        ua = random.choice(self.USER_AGENTS)
        request.headers.setdefault('User-Agent', ua)
        # spider.logger.debug(f"Using User-Agent: {ua}")

class NepaliLyricsPipelineSpiderMiddleware:
    # Not all methods need to be defined. If a method is not defined,
    # scrapy acts as if the spider middleware does not modify the
    # passed objects.

    @classmethod
    def from_crawler(cls, crawler):
        # This method is used by Scrapy to create your spiders.
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_spider_input(self, response, spider):
        # Called for each response that goes through the spider
        # middleware and into the spider.

        # Should return None or raise an exception.
        return None

    def process_spider_output(self, response, result, spider):
        # Called with the results returned from the Spider, after
        # it has processed the response.

        # Must return an iterable of Request, or item objects.
        for i in result:
            yield i

    def process_spider_exception(self, response, exception, spider):
        # Called when a spider or process_spider_input() method
        # (from other spider middleware) raises an exception.

        # Should return either None or an iterable of Request or item objects.
        pass

    async def process_start(self, start):
        # Called with an async iterator over the spider start() method or the
        # matching method of an earlier spider middleware.
        async for item_or_request in start:
            yield item_or_request

    def spider_opened(self, spider):
        spider.logger.info("Spider opened: %s" % spider.name)


class NepaliLyricsPipelineDownloaderMiddleware:
    # Not all methods need to be defined. If a method is not defined,
    # scrapy acts as if the downloader middleware does not modify the
    # passed objects.

    @classmethod
    def from_crawler(cls, crawler):
        # This method is used by Scrapy to create your spiders.
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_request(self, request, spider):
        # Called for each request that goes through the downloader
        # middleware.

        # Must either:
        # - return None: continue processing this request
        # - or return a Response object
        # - or return a Request object
        # - or raise IgnoreRequest: process_exception() methods of
        #   installed downloader middleware will be called
        return None

    def process_response(self, request, response, spider):
        # Called with the response returned from the downloader.

        # Must either;
        # - return a Response object
        # - return a Request object
        # - or raise IgnoreRequest
        return response

    def process_exception(self, request, exception, spider):
        # Called when a download handler or a process_request()
        # (from other downloader middleware) raises an exception.

        # Must either:
        # - return None: continue processing this exception
        # - return a Response object: stops process_exception() chain
        # - return a Request object: stops process_exception() chain
        pass

    def spider_opened(self, spider):
        spider.logger.info("Spider opened: %s" % spider.name)
