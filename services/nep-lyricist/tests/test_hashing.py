import pytest
from nepali_lyrics_pipeline.utils.hashing import generate_strict_hash, generate_fuzzy_hash

def test_generate_strict_hash():
    artist = "Narayan Gopal"
    title = "Euta Manche Ko"
    hash1 = generate_strict_hash(artist, title)
    
    # Case insensitivity and whitespace normalization
    hash2 = generate_strict_hash("  narayan gopal  ", "euta manche ko")
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256

def test_generate_fuzzy_hash():
    lyrics1 = "Phoolko aankhama phoolai sansara..."
    lyrics2 = "phoolko aankhama phoolai sansara..."  # minor change
    
    hash1 = generate_fuzzy_hash(lyrics1)
    hash2 = generate_fuzzy_hash(lyrics2)
    
    assert hash1 == hash2
    assert isinstance(hash1, str)
