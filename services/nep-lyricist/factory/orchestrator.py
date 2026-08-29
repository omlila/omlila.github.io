import redis
import time
import os
from enum import Enum
from factory import config

class PipelineState(Enum):
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"
    ERROR = "ERROR"

class Orchestrator:
    def __init__(self, redis_host=None, redis_port=None):
        redis_host = redis_host or os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(redis_port or os.getenv('REDIS_PORT', 6379))
        self.redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.state_key = "factory:state"
        self.signal_key = "factory:signal"
        
        if not self.redis.get(self.state_key):
            self.redis.set(self.state_key, PipelineState.STOPPED.value)

    def set_state(self, state: PipelineState):
        print(f"[Orchestrator] Transitioning to {state.value}")
        self.redis.set(self.state_key, state.value)

    def get_state(self) -> PipelineState:
        val = self.redis.get(self.state_key)
        return PipelineState(val) if val else PipelineState.STOPPED

    def signal_pause(self, reason: str):
        print(f"[Orchestrator] Signaling PAUSE. Reason: {reason}")
        self.redis.set(self.signal_key, "PAUSE")
        self.redis.set("factory:pause_reason", reason)
        self.set_state(PipelineState.PAUSED)

    def signal_resume(self):
        print("[Orchestrator] Signaling RESUME")
        self.redis.set(self.signal_key, "RESUME")
        self.redis.delete("factory:pause_reason")
        self.set_state(PipelineState.RUNNING)

    def check_health(self):
        # 1. Disk check
        stat = os.statvfs('/')
        free_gb = (stat.f_bavail * stat.f_frsize) / (1024**3)
        if free_gb < 2.0:
            self.signal_pause("Critical disk space low (<2GB)")
            return False
        
        # 2. Ollama check
        try:
            from requests import get
            resp = get(config.OLLAMA_URL.replace("/generate", "/tags"), timeout=5)
            if resp.status_code != 200:
                self.signal_pause("Ollama unavailable")
                return False
        except:
            self.signal_pause("Ollama connection failed")
            return False
            
        return True

    def monitor_loop(self):
        print("[Orchestrator] Monitor loop active.")
        while True:
            signal = self.redis.get(self.signal_key)
            if signal == "STOP":
                print("[Orchestrator] STOP signal detected. Shutting down spiders...")
                self.set_state(PipelineState.STOPPED)
                # In a real setup, this would trigger process termination

            if self.get_state() == PipelineState.RUNNING:
                self.check_health()
                
                # Check for MAX_SONGS limit
                current_count = int(self.redis.get("factory:stats:clean_count") or 0)
                if config.MAX_SONGS and current_count >= config.MAX_SONGS:
                    self.signal_pause(f"Reached MAX_SONGS limit: {config.MAX_SONGS}")

            time.sleep(10)

if __name__ == "__main__":
    orch = Orchestrator()
    orch.monitor_loop()
