import scrapy
from nepali_lyrics_pipeline.items import SongLyricItem

class LyricsNepalSpider(scrapy.Spider):
    name = "lyricsnepal"
    allowed_domains = ["lyricsnepal.com"]
    start_urls = ["https://www.lyricsnepal.com/"]

    def parse(self, response):
        # Follow links to song pages
        # This is a generic example, needs specific selectors for the site
        for song_link in response.css('a[href*="/lyrics/"]::attr(href)').getall():
            yield response.follow(song_link, self.parse_song)
            
        # Pagination
        next_page = response.css('a.next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)

    def parse_song(self, response):
        item = SongLyricItem()
        item['title'] = response.css('h1.entry-title::text').get()
        item['artist'] = response.css('.artist-name::text').get()
        item['lyrics'] = "\n".join(response.css('.lyric-content ::text').getall()).strip()
        item['source_url'] = response.url
        item['script_type'] = "Romanized" # Default for this site, can be improved
        item['genre'] = response.css('.genre::text').get()
        item['tags'] = response.css('.tags a::text').getall()
        yield item
