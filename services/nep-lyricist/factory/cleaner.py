import os
import time
import pandas as pd
import requests
import json
import redis
import sys
import uuid
import signal
from urllib.parse import urlparse
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from nepali_lyrics_pipeline.utils.transliteration import TransliterationEngine
from factory.guardrails import guard
from factory import config

class CleanerWorker:
    def __init__(self, clean_dir):
        self.clean_dir = clean_dir
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.queue_key = "factory:queue:raw"
        self.transliteration_engine = TransliterationEngine()
        os.makedirs(clean_dir, exist_ok=True)
        
        # Buffering: domain -> list of cleaned items
        self.buffers = {}
        self.buffer_limit = 25
        self.last_flush_time = time.time()
        self.flush_interval = 300  # Flush every 5 minutes regardless of count

        # Signal handling for graceful shutdown (Docker support)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)

    def handle_shutdown(self, signum, frame):
        print(f"[Cleaner] Shutdown signal ({signum}) received. Flushing buffers...", flush=True)
        for domain in list(self.buffers.keys()):
            self.flush_buffer(domain)
        sys.exit(0)

    def process_queue_item(self):
        # 1. Periodic flush check
        if time.time() - self.last_flush_time > self.flush_interval:
            self.periodic_flush()

        # 2. Pull one item from the queue (Non-blocking)
        raw_data = self.redis.rpop(self.queue_key)
        if not raw_data:
            return False
            
        try:
            item = json.loads(raw_data)
            print(f"[Cleaner] Sanitizing song from: {item.get('source_url')}...", flush=True)
            
            # AI Sanitization
            result = self.ai_sanitize_lyrics(item.get('lyrics', ''))
            
            if result and result.get('is_valid'):
                new_title = result.get('title', '').strip()
                if not new_title:
                    lyrics_body = result.get('lyrics_devanagari') or result.get('lyrics_romanized') or ""
                    first_line = lyrics_body.split('\n')[0].strip()
                    new_title = (first_line[:50] + '...') if len(first_line) > 50 else first_line
                
                item['title'] = new_title
                item['artist'] = result.get('artist', 'Unknown Artist')
                item['lyrics_devanagari'] = result.get('lyrics_devanagari', '').strip()
                item['lyrics_romanized'] = result.get('lyrics_romanized', '').strip()
                item['emotions'] = result.get('emotions', 'Unknown')
                
                from nepali_lyrics_pipeline.utils.transliteration import detect_script
                item['script_type'] = detect_script(item.get('lyrics', ''))
                
                # Maintain 'lyrics' key for backward compatibility
                item['lyrics'] = item['lyrics_devanagari'] if item['script_type'] == "devanagari" else item['lyrics_romanized']
                
                # Add to buffer
                domain = urlparse(item.get('source_url')).netloc or 'unknown'
                if domain not in self.buffers:
                    self.buffers[domain] = []
                
                self.buffers[domain].append(item)
                self.redis.incrby("factory:stats:clean_count", 1)
                
                print(f"[Cleaner] Buffered {new_title} ({len(self.buffers[domain])}/{self.buffer_limit})", flush=True)

                # Flush if limit reached
                if len(self.buffers[domain]) >= self.buffer_limit:
                    self.flush_buffer(domain)
            
            elif result is None:
                # AI Call failed - Put back in queue for retry!
                print(f"[Cleaner] AI Call FAILED. Re-queuing item.", flush=True)
                self.redis.lpush(self.queue_key, raw_data)
                time.sleep(5) # Backoff if AI is struggling
            else:
                print(f"[Cleaner] AI rejected content as non-lyrical. Discarding.", flush=True)

        except Exception as e:
            print(f"[Cleaner] ERROR processing queue item: {e}", flush=True)
        
        return True

    def periodic_flush(self):
        print("[Cleaner] Periodic flush triggered (5m timeout).", flush=True)
        for domain in list(self.buffers.keys()):
            self.flush_buffer(domain)
        self.last_flush_time = time.time()

    def flush_buffer(self, domain):
        items = self.buffers.pop(domain, [])
        if not items:
            return
            
        partition_dir = os.path.join(self.clean_dir, f"source_domain={domain}")
        os.makedirs(partition_dir, exist_ok=True)
        
        filename = f"{uuid.uuid4()}.parquet"
        file_path = os.path.join(partition_dir, filename)
        
        try:
            pd.DataFrame(items).to_parquet(file_path, index=False)
            print(f"[Cleaner] BATCH SUCCESS: Saved {len(items)} songs to {file_path}", flush=True)
            
            # NOW mark as officially PROCESSED in Redis
            strict_hashes = [i['strict_hash'] for i in items]
            fuzzy_hashes = [i['fuzzy_hash'] for i in items]
            
            self.redis.sadd('lyrics:strict_hashes', *strict_hashes)
            self.redis.sadd('lyrics:fuzzy_hashes', *fuzzy_hashes)
            
            # Remove from PENDING
            self.redis.srem('lyrics:pending_hashes', *strict_hashes)
            
        except Exception as e:
            print(f"[Cleaner] FATAL ERROR saving batch to {file_path}: {e}", flush=True)
            # Put items back in buffer or re-queue? For now, re-queue is safer
            print("[Cleaner] Re-queuing batch to avoid data loss.", flush=True)
            for item in items:
                self.redis.lpush(self.queue_key, json.dumps(item))

    def ai_sanitize_lyrics(self, raw_content):
        system_prompt = (
            "You are a Nepali Music Librarian. Extract and standardize song lyrics from the scraped text.\n"
            "1. STRICT VALIDATION: If the content is a menu, a list of songs, a login page, spam, chords only, or search results, "
            "set 'is_valid' to false, and set all lyric fields to 'N/A'.\n"
            "2. Identify actual song lyrics. They must have a poetic structure (verses/stanzas).\n"
            "3. Remove HTML tags, scripts, site watermarks, and chord notations (e.g., [Am], C, D, G floating on lines).\n"
            "4. If the title is missing, generic, or contains website names, set the title to the first meaningful line of the lyrics (max 50 chars).\n"
            "5. Provide the 'title' and 'artist' in standard English/Romanized script.\n"
            "6. Provide 'lyrics_devanagari': The lyrics written in flawless, correctly spelled Devanagari script. If the source is Romanized, accurately transliterate it to natural Devanagari.\n"
            "7. Provide 'lyrics_romanized': The lyrics transliterated into standard, natural colloquial Romanized Nepali (how ordinary people type Nepali on QWERTY keyboards, e.g., 'malai' instead of 'malAI', 'timro' instead of 'timrooo', 'garchu' instead of 'garChu', and using 'call'/'phone' instead of literal phonetic representations like 'kala'/'phona').\n"
            "8. Identify 'emotions' (e.g., 'Romantic', 'Sad', 'Happy', 'Folk', 'Patriotic', 'Devotional') as a comma-separated string.\n"
            "9. Return ONLY a valid JSON object."
        )
        user_prompt = f"Scraped Content:\n{raw_content[:1500]}\n\nRespond with JSON: {{'is_valid': bool, 'title': string, 'artist': string, 'lyrics_devanagari': string, 'lyrics_romanized': string, 'emotions': string}}"
        
        try:
            print(f"[Cleaner] Calling AI for lyrics snippet: {raw_content[:50]}...", flush=True)
            response = requests.post(config.OLLAMA_URL, json={
                "model": config.MODEL,
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "format": "json",
                "stream": False
            }, timeout=180) # Increased timeout to 180s
            
            if response.status_code == 200:
                ai_response = response.json().get('response', '{}')
                print(f"[Cleaner] AI Response: {ai_response}", flush=True)
                return json.loads(ai_response)
        except Exception as e:
            print(f"[Cleaner] AI Sanitization failed: {e}", flush=True)
        return None

    def start(self):
        print(f"[Cleaner] Active with model={config.MODEL}, consuming from Redis queue.", flush=True)
        while True:
            processed = self.process_queue_item()
            if not processed:
                # If queue is empty, also check if we should flush stale buffers
                if time.time() - self.last_flush_time > 60: # Idle flush after 1 minute
                     self.periodic_flush()
                time.sleep(2)

if __name__ == "__main__":
    worker = CleanerWorker(clean_dir=config.CLEAN_DATA_DIR)
    worker.start()
