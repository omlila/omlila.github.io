import hashlib
import re
from simhash import Simhash

def normalize_text(text):
    if not text:
        return ""
    # Lowercase, remove special characters, and normalize whitespace
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = " ".join(text.split())
    return text

def generate_strict_hash(artist, title):
    normalized_artist = normalize_text(artist)
    normalized_title = normalize_text(title)
    combined = f"{normalized_artist}|{normalized_title}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()

def generate_fuzzy_hash(lyrics):
    normalized_lyrics = normalize_text(lyrics)
    if not normalized_lyrics:
        return "0"
    
    try:
        # Simhash returns an integer, we convert it to string for storage
        return str(Simhash(normalized_lyrics).value)
    except Exception as e:
        # Fallback if simhash fails (e.g. integer overflow in some environments)
        # Use a simple rolling hash or similar as a weak fuzzy alternative
        print(f"[Hashing] Simhash failed: {e}. Using fallback.")
        return str(hash(normalized_lyrics))
