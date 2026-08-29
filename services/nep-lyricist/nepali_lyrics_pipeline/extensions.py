import os
import redis
from scrapy import signals
from scrapy.exceptions import NotConfigured
from twisted.internet import task
from urllib.parse import urlparse

class Gatekeeper:
    def __init__(self, redis_host, redis_port, storage_limit_gb, crawler):
        self.redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.storage_limit_gb = storage_limit_gb
        self.crawler = crawler
        self.data_dir = crawler.settings.get('PARQUET_OUTPUT_DIR', 'data/lyrics_raw')
        self.check_interval = 30.0  # seconds

    @classmethod
    def from_crawler(cls, crawler):
        if not crawler.settings.getbool('GATEKEEPER_ENABLED', True):
            raise NotConfigured
        
        return cls(
            redis_host=crawler.settings.get('REDIS_HOST', 'localhost'),
            redis_port=crawler.settings.get('REDIS_PORT', 6379),
            storage_limit_gb=crawler.settings.getint('STORAGE_LIMIT_GB', 5),
            crawler=crawler
        )

    def spider_opened(self, spider):
        self.loop = task.LoopingCall(self.check_system_health, spider)
        self.loop.start(self.check_interval)

    def spider_closed(self, spider):
        if hasattr(self, 'loop') and self.loop.running:
            self.loop.stop()

    def check_system_health(self, spider):
        # 1. Check Redis for signals
        signal = self.redis.get("factory:signal")
        
        if signal == "STOP":
            spider.logger.error("Gatekeeper: Received STOP signal. Shutting down spider.")
            self.crawler.engine.close_spider(spider, 'max_songs_reached')
            return

        if signal == "PAUSE" and not self.crawler.engine.paused:
            spider.logger.warning("Gatekeeper: Received PAUSE signal from Orchestrator.")
            self.crawler.engine.pause()
        elif signal == "RESUME" and self.crawler.engine.paused:
            spider.logger.info("Gatekeeper: Received RESUME signal from Orchestrator.")
            self.crawler.engine.resume()

        # 2. Back-pressure Check: Monitor Redis Queue Size
        queue_len = self.redis.llen("factory:queue:raw")
        
        if queue_len > 200 and not self.crawler.engine.paused:
            spider.logger.warning(f"Gatekeeper: Back-pressure detected ({queue_len} items in queue). Pausing Scraper.")
            self.crawler.engine.pause()
        elif queue_len < 50 and self.crawler.engine.paused and signal != "PAUSE":
            spider.logger.info(f"Gatekeeper: Back-pressure cleared ({queue_len} items). Resuming Scraper.")
            self.crawler.engine.resume()

    @classmethod
    def connect_signals(cls, receiver):
        from scrapy import signals
        receiver.signals.connect(receiver.spider_opened, signal=signals.spider_opened)
        receiver.signals.connect(receiver.spider_closed, signal=signals.spider_closed)
