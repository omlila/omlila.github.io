import os
import pandas as pd
import redis
import time
import json
from datetime import datetime
from factory import config

def generate_domain_report(clean_dir):
    """
    Scans the clean data directory and Redis memory, 
    tracking cleaned songs, health, and total domains discovered.
    """
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_conn = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

    report = {
        "total_songs_cleaned": 0,
        "clean_domains": {},
        "discovered_domains_all": {},
        "total_discovered_count": 0,
        "last_updated": datetime.now().isoformat()
    }
    
    # 1. Pull all unique domains found in historical memory
    known_domains = redis_conn.smembers("factory:known_domains")
    report["total_discovered_count"] = len(known_domains)
    
    for domain in known_domains:
        health = redis_conn.hgetall(f"domain:health:{domain}")
        report["discovered_domains_all"][domain] = {
            "last_status": int(health.get("last_status", 0)),
            "fail_count": int(health.get("fail_count", 0)),
            "is_deprioritized": int(health.get("fail_count", 0)) > 5
        }

    # 2. Count Cleaned Lyrics
    if os.path.exists(clean_dir):
        for domain_folder in os.listdir(clean_dir):
            if domain_folder.startswith("source_domain="):
                domain = domain_folder.split("=")[1]
                folder_path = os.path.join(clean_dir, domain_folder)
                
                song_count = 0
                for file in os.listdir(folder_path):
                    if file.endswith(".parquet"):
                        try:
                            import pyarrow.parquet as pq
                            meta = pq.read_metadata(os.path.join(folder_path, file))
                            song_count += meta.num_rows
                        except:
                            pass
                
                report["clean_domains"][domain] = song_count
                report["total_songs_cleaned"] += song_count

    report["clean_domains"] = dict(sorted(report["clean_domains"].items(), key=lambda item: item[1], reverse=True))

    report_path = os.path.join(config.LOG_DIR, "domain_report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=4)
    
    return report

def get_stats():
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_conn = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
    
    # Discovery Stats
    discovered = int(redis_conn.scard("lyrics:strict_hashes") or 0)
    
    # Cleaning Stats
    cleaned = int(redis_conn.get("factory:stats:clean_count") or 0)
    
    # Calculate Rates (rough estimate from file counts if timestamp not available)
    raw_dir = "data/lyrics_raw"
    clean_dir = "data/lyrics_clean"
    
    raw_count = sum([len(files) for r, d, files in os.walk(raw_dir) if any(f.endswith('.parquet') for f in files)])
    clean_count = sum([len(files) for r, d, files in os.walk(clean_dir) if any(f.endswith('.parquet') for f in files)])

    # Generate the domain report JSON
    domain_stats = generate_domain_report(clean_dir)

    return {
        "discovered": discovered,
        "raw_files": raw_count,
        "cleaned_songs": cleaned,
        "clean_files": clean_count,
        "unique_domains": domain_stats["total_discovered_count"],
        "state": redis_conn.get("factory:state") or "UNKNOWN",
        "last_update": datetime.now().strftime("%H:%M:%S")
    }

def print_dashboard():
    print("\033[H\033[J") # Clear screen
    print("="*50)
    print(f" 🎵  NEPALI LYRICS FACTORY DASHBOARD  [{datetime.now().strftime('%Y-%m-%d')}]")
    print("="*50)
    
    stats = get_stats()
    
    print(f" STATUS:          [{stats['state']}]")
    print(f" LAST UPDATE:     {stats['last_update']}")
    print("-" * 50)
    print(f" 🔍 DISCOVERED:   {stats['discovered']} unique URLs found")
    print(f" 🌐 DOMAINS:      {stats['unique_domains']} unique sources tracked")
    print(f" 📦 RAW DATA:     {stats['raw_files']} files pending cleaning")
    print(f" ✨ CLEANED:      {stats['cleaned_songs']} songs verified by AI")
    print(f" 📂 STORAGE:      {stats['clean_files']} clean partitions created")
    print("-" * 50)
    
    # Add a small progress bar
    if stats['discovered'] > 0:
        progress = (stats['cleaned_songs'] / stats['discovered']) * 100
        bar_len = 30
        filled_len = int(bar_len * progress / 100)
        bar = '█' * filled_len + '-' * (bar_len - filled_len)
        print(f" PROGRESS:        |{bar}| {progress:.1f}%")
    
    print("\n[Monitoring logs: docker-compose logs -f factory]")
    print("[Press Ctrl+C to exit dashboard]")

if __name__ == "__main__":
    try:
        while True:
            print_dashboard()
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nExiting dashboard...")
