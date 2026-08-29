# Scrapy settings for nepali_lyrics_pipeline project

BOT_NAME = "nepali_lyrics_pipeline"

SPIDER_MODULES = ["nepali_lyrics_pipeline.spiders"]
NEWSPIDER_MODULE = "nepali_lyrics_pipeline.spiders"

# Crawl responsibly
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Obey robots.txt rules
ROBOTSTXT_OBEY = False

# Concurrency and throttling settings
CONCURRENT_REQUESTS = 32
CONCURRENT_REQUESTS_PER_DOMAIN = 1
DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = True

# Scheduler settings for domain interleaving
SCHEDULER_PRIORITY_QUEUE = 'scrapy.pqueues.DownloaderAwarePriorityQueue'

# Enable and configure the AutoThrottle extension (disabled by default)
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
AUTOTHROTTLE_DEBUG = False

import os

# Redis Settings (for Deduplication)
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

# Configure downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    "nepali_lyrics_pipeline.middlewares.RotateUserAgentMiddleware": 400,
    "nepali_lyrics_pipeline.middlewares.DomainCooldownMiddleware": 450,
}

# Configure item pipelines
ITEM_PIPELINES = {
    "nepali_lyrics_pipeline.pipelines.RedisDeduplicationPipeline": 300,
    "nepali_lyrics_pipeline.pipelines.EnrichmentPipeline": 350,
    "nepali_lyrics_pipeline.pipelines.RedisQueuePipeline": 400,
}

# Enable extensions
EXTENSIONS = {
    "nepali_lyrics_pipeline.extensions.Gatekeeper": 500,
}

GATEKEEPER_ENABLED = True
STORAGE_LIMIT_GB = 5

# Set settings whose default value is deprecated to a future-proof value
FEED_EXPORT_ENCODING = "utf-8"

# Parquet Pipeline Settings
PARQUET_OUTPUT_DIR = 'data/lyrics_raw'
PARQUET_BUFFER_LIMIT = 25

# Retry settings
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 522, 524, 408, 429]
