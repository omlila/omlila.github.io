import os
import pandas as pd
import redis
import glob

def sync_redis_to_disk():
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

    print("[Sync] Scanning clean data for hashes...")
    clean_files = glob.glob('data/lyrics_clean/**/*.parquet', recursive=True)
    
    # Get all hashes currently on disk
    disk_strict = set()
    disk_fuzzy = set()
    
    for f in clean_files:
        try:
            df = pd.read_parquet(f)
            if 'strict_hash' in df.columns:
                disk_strict.update(df['strict_hash'].astype(str).tolist())
            if 'fuzzy_hash' in df.columns:
                disk_fuzzy.update(df['fuzzy_hash'].astype(str).tolist())
        except Exception as e:
            print(f"[Sync] Error reading {f}: {e}")

    print(f"[Sync] Found {len(disk_strict)} unique strict hashes on disk.")

    # 1. Flush Redis
    r.delete('lyrics:strict_hashes')
    r.delete('lyrics:fuzzy_hashes')
    r.delete('lyrics:pending_hashes')
    
    # 2. Re-populate with DISK data only
    if disk_strict:
        r.sadd('lyrics:strict_hashes', *disk_strict)
    if disk_fuzzy:
        r.sadd('lyrics:fuzzy_hashes', *disk_fuzzy)
    
    # 3. Update clean count
    r.set('factory:stats:clean_count', len(disk_strict))

    print("[Sync] SUCCESS: Redis is now synchronized with data/lyrics_clean.")
    print(f"[Sync] Redis now contains {r.scard('lyrics:strict_hashes')} entries.")

if __name__ == "__main__":
    sync_redis_to_disk()
