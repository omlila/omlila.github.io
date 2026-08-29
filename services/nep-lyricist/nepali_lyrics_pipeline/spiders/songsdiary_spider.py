import scrapy
from nepali_lyrics_pipeline.items import SongLyricItem

class SongsDiarySpider(scrapy.Spider):
    name = "songsdiary"
    allowed_domains = ["songsdiary.com"]
    start_urls = ["https://songsdiary.com/"]

    def parse(self, response):
        # Follow links to song pages (Common WordPress selectors)
        links = response.css('h2.entry-title a::attr(href)').getall() or \
                response.css('h3.entry-title a::attr(href)').getall() or \
                response.css('.post-title a::attr(href)').getall()
        
        for song_link in links:
            yield response.follow(song_link, self.parse_song)
            
        # Pagination
        next_page = response.css('a.next.page-numbers::attr(href)').get() or \
                    response.css('a.next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)

    def parse_song(self, response):
        item = SongLyricItem()
        item['title'] = response.css('h1.entry-title::text').get() or \
                        response.css('h1.page-title::text').get()
        
        # Heuristic for artist
        item['artist'] = response.css('.song-artist::text').get() or \
                         response.css('a[href*="/artist/"]::text').get()
        
        # Clean lyrics extraction
        item['lyrics'] = "\n".join(response.css('.entry-content ::text').getall()).strip()
        item['source_url'] = response.url
        item['script_type'] = "Natural"
        yield item
