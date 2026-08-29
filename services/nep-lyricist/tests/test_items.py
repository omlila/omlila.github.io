import pytest
from nepali_lyrics_pipeline.items import SongLyricItem

def test_song_lyric_item_fields():
    item = SongLyricItem()
    item['title'] = "Phoolko Aankhama"
    item['artist'] = "Ani Choying Drolma"
    item['lyrics'] = "Phoolko aankhama phoolai sansara..."
    item['source_url'] = "https://example.com/song1"
    item['script_type'] = "Romanized"
    item['genre'] = "Devotional"
    item['tags'] = ["peace", "spiritual"]
    
    assert item['title'] == "Phoolko Aankhama"
    assert item['artist'] == "Ani Choying Drolma"
    assert item['lyrics'] == "Phoolko aankhama phoolai sansara..."
    assert item['source_url'] == "https://example.com/song1"
    assert item['script_type'] == "Romanized"
    assert item['genre'] == "Devotional"
    assert item['tags'] == ["peace", "spiritual"]

def test_song_lyric_item_missing_fields():
    item = SongLyricItem()
    with pytest.raises(KeyError):
        item['non_existent_field'] = "Value"
