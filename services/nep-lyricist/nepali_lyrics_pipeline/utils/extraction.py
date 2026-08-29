import re
from bs4 import BeautifulSoup

def extract_lyrics_by_density(html_content):
    """
    Finds the largest block of text in the HTML, which is often the lyrics.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header"]):
        script.extract()

    # Get text blocks
    text_blocks = []
    for tag in soup.find_all(['div', 'p', 'article', 'section']):
        text = tag.get_text(separator='\n').strip()
        if len(text) > 100:  # Threshold for a potential lyrics block
            text_blocks.append(text)
            
    if not text_blocks:
        return ""
        
    # Return the longest block as the likely lyrics
    return max(text_blocks, key=len)

def clean_extracted_text(text):
    # Remove common artifacts like "Chords", "Strumming", etc.
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        if any(x in line.lower() for x in ['chord', 'strumming', 'capo', 'intro']):
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()
