from indic_transliteration import sanscript
from indic_transliteration.sanscript import SchemeMap, SCHEMES, transliterate

def detect_script(text):
    if not text:
        return "unknown"
    # Check for Devanagari characters (U+0900 to U+097F)
    if any('\u0900' <= char <= '\u097f' for char in text):
        return "devanagari"
    return "romanized"

def romanized_to_devanagari(text):
    # Using ITRANS as a common Romanization scheme for conversion
    # Note: Accuracy depends on how well the input follows the scheme
    return transliterate(text, sanscript.ITRANS, sanscript.DEVANAGARI)

def devanagari_to_romanized(text):
    return transliterate(text, sanscript.DEVANAGARI, sanscript.ITRANS)

class TransliterationEngine:
    def enrich_item(self, item):
        lyrics = item.get('lyrics', '')
        script = detect_script(lyrics)
        item['script_type'] = script
        
        if script == "romanized":
            item['lyrics_devanagari'] = romanized_to_devanagari(lyrics)
            item['lyrics_romanized'] = lyrics
        elif script == "devanagari":
            item['lyrics_romanized'] = devanagari_to_romanized(lyrics)
            item['lyrics_devanagari'] = lyrics
            
        return item
