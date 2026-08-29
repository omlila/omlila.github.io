import pytest
import os
import shutil
import pandas as pd
from nepali_lyrics_pipeline.pipelines import ParquetExportPipeline
from nepali_lyrics_pipeline.items import SongLyricItem

@pytest.fixture
def temp_output_dir():
    dir_path = "tests/temp_parquet"
    os.makedirs(dir_path, exist_ok=True)
    yield dir_path
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)

def test_parquet_export_pipeline(temp_output_dir):
    pipeline = ParquetExportPipeline()
    pipeline.output_dir = temp_output_dir
    pipeline.buffer_limit = 2  # Small limit for testing
    
    item1 = SongLyricItem(
        title="Song 1", 
        artist="Artist 1", 
        lyrics="Lyrics 1", 
        source_url="https://site1.com/s1",
        script_type="Romanized"
    )
    item2 = SongLyricItem(
        title="Song 2", 
        artist="Artist 2", 
        lyrics="Lyrics 2", 
        source_url="https://site1.com/s2",
        script_type="Romanized"
    )
    
    pipeline.process_item(item1, None)
    pipeline.process_item(item2, None)
    
    # After 2 items, it should have written to site1.com partition
    partition_path = os.path.join(temp_output_dir, "source_domain=site1.com")
    assert os.path.exists(partition_path)
    
    # Verify content
    files = [f for f in os.listdir(partition_path) if f.endswith('.parquet')]
    assert len(files) > 0
    df = pd.read_parquet(os.path.join(partition_path, files[0]))
    assert len(df) == 2
    assert df.iloc[0]['title'] == "Song 1"
