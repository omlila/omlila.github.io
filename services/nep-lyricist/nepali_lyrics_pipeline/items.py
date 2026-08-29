# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy

class SongLyricItem(scrapy.Item):
    title = scrapy.Field()
    artist = scrapy.Field()
    lyrics = scrapy.Field()
    lyrics_romanized = scrapy.Field()
    lyrics_devanagari = scrapy.Field()
    source_url = scrapy.Field()
    script_type = scrapy.Field()
    genre = scrapy.Field()
    tags = scrapy.Field()
    emotions = scrapy.Field()
    strict_hash = scrapy.Field()  # For Redis tier 1
    fuzzy_hash = scrapy.Field()   # For Redis tier 2
    discovery_query = scrapy.Field() # The query that found this song
