# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

import redis
import os
import pandas as pd
import hashlib
import json
import random
from urllib.parse import urlparse
from scrapy.exceptions import DropItem
from nepali_lyrics_pipeline.utils.hashing import generate_strict_hash, generate_fuzzy_hash
from nepali_lyrics_pipeline.utils.transliteration import TransliterationEngine

class RedisQueuePipeline:
    """
    Pushes scraped items into a Redis queue for the Cleaner to process.
    """
    def __init__(self, host, port):
        self.redis_conn = redis.Redis(host=host, port=port, decode_responses=True)
        self.queue_key = "factory:queue:raw"

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            host=crawler.settings.get('REDIS_HOST', 'localhost'),
            port=crawler.settings.get('REDIS_PORT', 6379)
        )

    def process_item(self, item, spider):
        # Push serialized item to Redis list
        self.redis_conn.lpush(self.queue_key, json.dumps(dict(item)))
        return item

class RedisDeduplicationPipeline:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.redis_conn = None

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            host=crawler.settings.get('REDIS_HOST', 'localhost'),
            port=crawler.settings.get('REDIS_PORT', 6379)
        )

    def open_spider(self, spider):
        self.redis_conn = redis.Redis(host=self.host, port=self.port, decode_responses=True)

    def close_spider(self, spider):
        if self.redis_conn:
            self.redis_conn.close()

    def process_item(self, item, spider):
        source_url = item.get('source_url', '')
        domain = urlparse(source_url).netloc
        
        # 1. Success-Based Rotation (Quota reached)
        if domain:
            key = f"stats:success:{domain}"
            total_success = self.redis_conn.incr(key)
            if total_success >= 25:
                duration = (30 * 60) + random.randint(0, 600) # 30-40 minutes
                self.redis_conn.setex(f"cooldown:{domain}", duration, "ACTIVE")
                self.redis_conn.set(key, 0)
                self.redis_conn.set(f"stats:hits:{domain}", 0)
                spider.logger.warning(f"🛡️  QUOTA REACHED: {domain} found 25 songs. Paused for {duration//60}m.")

        # 2. Tier 1: Source URL (Unique identifier for discovery)
        strict_hash = hashlib.sha256(source_url.encode('utf-8')).hexdigest()
        
        # Tier 2: Content Fuzzy Hash (Catches duplicates across sites)
        fuzzy_hash = generate_fuzzy_hash(item.get('lyrics', ''))
        
        item['strict_hash'] = strict_hash
        item['fuzzy_hash'] = fuzzy_hash

        # 1. Check if ALREADY PROCESSED (saved to disk)
        if self.redis_conn.sismember('lyrics:strict_hashes', strict_hash):
            raise DropItem(f"URL already in clean dataset: {source_url}")

        if self.redis_conn.sismember('lyrics:fuzzy_hashes', fuzzy_hash):
            raise DropItem(f"Content already in clean dataset: {source_url}")

        # 2. Check if PENDING (in queue or buffer)
        if not self.redis_conn.sadd('lyrics:pending_hashes', strict_hash):
            raise DropItem(f"URL already pending processing: {source_url}")

        return item

class EnrichmentPipeline:
    def __init__(self):
        self.engine = TransliterationEngine()

    def process_item(self, item, spider):
        return self.engine.enrich_item(item)

class ParquetExportPipeline:
    def __init__(self, output_dir='data/lyrics_raw', buffer_limit=100):
        self.output_dir = output_dir
        self.buffer_limit = buffer_limit
        self.buffers = {}  # domain -> list of items

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            output_dir=crawler.settings.get('PARQUET_OUTPUT_DIR', 'data/lyrics_raw'),
            buffer_limit=crawler.settings.get('PARQUET_BUFFER_LIMIT', 100)
        )

    def open_spider(self, spider):
        os.makedirs(self.output_dir, exist_ok=True)

    def close_spider(self, spider):
        # Flush all remaining buffers
        for domain in list(self.buffers.keys()):
            self._flush_buffer(domain)

    def process_item(self, item, spider):
        source_url = item.get('source_url', '')
        domain = urlparse(source_url).netloc or 'unknown'
        
        if domain not in self.buffers:
            self.buffers[domain] = []
        
        self.buffers[domain].append(dict(item))
        
        if len(self.buffers[domain]) >= self.buffer_limit:
            self._flush_buffer(domain)
            
        return item

    def _flush_buffer(self, domain):
        items = self.buffers.pop(domain, [])
        if not items:
            return
            
        df = pd.DataFrame(items)
        partition_dir = os.path.join(self.output_dir, f"source_domain={domain}")
        os.makedirs(partition_dir, exist_ok=True)
        
        import uuid
        filename = f"{uuid.uuid4()}.parquet"
        file_path = os.path.join(partition_dir, filename)
        
        df.to_parquet(file_path, index=False)
