import pytest
from unittest.mock import MagicMock, patch
from nepali_lyrics_pipeline.pipelines import RedisDeduplicationPipeline
from nepali_lyrics_pipeline.items import SongLyricItem
from scrapy.exceptions import DropItem

@pytest.fixture
def mock_redis():
    with patch('redis.Redis') as mock:
        yield mock

def test_redis_deduplication_pipeline_new_item(mock_redis):
    # Setup mock
    instance = mock_redis.return_value
    instance.sismember.return_value = False
    instance.sadd.return_value = 1  # 1 means added (not a duplicate)
    
    pipeline = RedisDeduplicationPipeline(host='localhost', port=6379)
    pipeline.open_spider(None)
    
    item = SongLyricItem(artist="Artist", title="Title", lyrics="Some lyrics")
    result = pipeline.process_item(item, None)
    
    assert result == item
    assert 'strict_hash' in item
    assert 'fuzzy_hash' in item
    instance.sadd.assert_called()

def test_redis_deduplication_pipeline_duplicate_item(mock_redis):
    # Setup mock
    instance = mock_redis.return_value
    instance.sadd.return_value = 0  # 0 means already exists
    
    pipeline = RedisDeduplicationPipeline(host='localhost', port=6379)
    pipeline.open_spider(None)
    
    item = SongLyricItem(artist="Artist", title="Title", lyrics="Some lyrics")
    with pytest.raises(DropItem):
        pipeline.process_item(item, None)
