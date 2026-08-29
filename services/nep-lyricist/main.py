import subprocess
import time
import sys
import os
import redis

def launch_factory():
    print("="*40)
    print("   LAUNCHING RESILIENT AI-DATA FACTORY")
    print("="*40)

    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    
    r = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=int(os.getenv('REDIS_PORT', 6379)), decode_responses=True)

    # 1. Reset pending state on startup to recover lost items
    print("[1/4] Recovering pending items...")
    pending = r.smembers('lyrics:pending_hashes')
    if pending:
        print(f"[*] Found {len(pending)} pending items. Clearing to allow re-discovery.")
        r.delete('lyrics:pending_hashes')

    # 2. Start Orchestrator
    print("[2/4] Starting Orchestrator...")
    orch_proc = subprocess.Popen([sys.executable, "factory/orchestrator.py"], env=env)

    # 3. Start Cleaner Worker
    print("[3/4] Starting Cleaner Worker...")
    cleaner_proc = subprocess.Popen([sys.executable, "factory/cleaner.py"], env=env)

    # 4. Launch Scrapy
    print("[4/4] Launching Scraper...")
    try:
        scrapy_cmd = ["python3", "-m", "scrapy", "crawl", "dynamic_discovery", "-L", "INFO"]
        scrapy_proc = subprocess.Popen(scrapy_cmd, env=env)
        
        print("[*] All components active. Monitoring...")
        
        while True:
            # Check for Global STOP
            if r.get("factory:signal") == "STOP":
                print("[!] GLOBAL STOP SIGNAL DETECTED.")
                break

            # Monitor processes
            if orch_proc.poll() is not None:
                print("[!] Orchestrator stopped. Restarting...")
                orch_proc = subprocess.Popen([sys.executable, "factory/orchestrator.py"], env=env)
            
            if cleaner_proc.poll() is not None:
                print("[!] Cleaner stopped. Restarting...")
                cleaner_proc = subprocess.Popen([sys.executable, "factory/cleaner.py"], env=env)
            
            if scrapy_proc.poll() is not None:
                print("[*] Scraper cycle finished. Waiting 2 minutes before next discovery...")
                time.sleep(120)
                if r.get("factory:signal") != "STOP":
                    scrapy_proc = subprocess.Popen(scrapy_cmd, env=env)

            time.sleep(5)

    except KeyboardInterrupt:
        print("\n[!] User interrupted. Shutting down...")
    finally:
        print("[*] Terminating processes...")
        orch_proc.terminate()
        cleaner_proc.terminate()
        scrapy_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    launch_factory()
