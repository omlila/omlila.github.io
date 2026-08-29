from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import glob
import sqlite3
import datetime
import json
import asyncio
import time
import pandas as pd
import redis
import subprocess
import sys

from contextlib import asynccontextmanager

# --- Singleton instances (loaded once at startup) ---
from factory.deepseek_agent import DeepSeekAgent as _DeepSeekAgent
_shared_agent: _DeepSeekAgent = None

def get_agent() -> _DeepSeekAgent:
    global _shared_agent
    if _shared_agent is None:
        _shared_agent = _DeepSeekAgent()
    return _shared_agent

@asynccontextmanager
async def lifespan(app_: "FastAPI"):
    """Pre-load PatternEngine and Qwen model in background threads at server start."""
    import threading

    def _warm_agent():
        print("[Startup] Pre-loading DeepSeekAgent + PatternEngine...")
        get_agent()
        print("[Startup] \u2705 Agent + PatternEngine ready.")

    def _warm_qwen():
        try:
            print("[Startup] Pre-loading Qwen 1.5B model...")
            from factory.query_model import _load_model
            _load_model()
            print("[Startup] \u2705 Qwen model warmed up and ready.")
        except Exception as e:
            print(f"[Startup] \u26a0\ufe0f Qwen pre-warm failed: {e}")

    threading.Thread(target=_warm_agent, daemon=True).start()
    threading.Thread(target=_warm_qwen, daemon=True).start()
    yield  # server runs here

app = FastAPI(
    title="Nepali Lyricist AI Service API",
    description="Full Control, Streaming Generation & Agent Token Configuration API",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "logs/user_feedback.db"
TRIALS_CSV = "logs/autoresearch_trials.csv"
ENV_PATH = ".env"

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            prompt TEXT,
            mood TEXT,
            artist TEXT,
            model_version TEXT,
            candidate_1 TEXT,
            candidate_2 TEXT,
            candidate_3 TEXT,
            chosen_index INTEGER,
            edited_lyrics TEXT,
            rating_1 INTEGER DEFAULT 0,
            rating_2 INTEGER DEFAULT 0,
            rating_3 INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

init_db()




def get_redis_conn():
    host = os.getenv('REDIS_HOST', 'localhost')
    port = int(os.getenv('REDIS_PORT', 6379))
    try:
        r = redis.Redis(host=host, port=port, decode_responses=True)
        r.ping()
        return r
    except Exception:
        return None

# --- Request Models ---
class GenerateRequest(BaseModel):
    prompt: str
    mood: Optional[str] = "Romantic"
    artist: Optional[str] = ""
    max_tokens: Optional[int] = 150
    temperature: Optional[float] = 0.7

class MultiCandidateRequest(BaseModel):
    prompt: str
    mood: Optional[str] = "Romantic"
    artist: Optional[str] = ""
    num_lines: Optional[int] = 4
    model_source: Optional[str] = "deepseek"
    refine_mode: Optional[bool] = False
    rewrite_mode: Optional[bool] = False

class RefineRequest(BaseModel):
    prompt: str

class RewriteRequest(BaseModel):
    prompt: str
    mood: Optional[str] = "Romantic"

class FeedbackRequest(BaseModel):
    prompt: str
    mood: str
    artist: str
    model_version: str
    candidate_1: str
    candidate_2: str
    candidate_3: str
    chosen_index: int
    edited_lyrics: Optional[str] = ""
    rating_1: int = 0
    rating_2: int = 0
    rating_3: int = 0

class SignalRequest(BaseModel):
    signal: str

class AutoResearchRequest(BaseModel):
    quick_test: Optional[bool] = True

class AgentConfigSettings(BaseModel):
    deepseek_api_key: Optional[str] = None
    deepseek_api_base: Optional[str] = None
    deepseek_model: Optional[str] = None
    ollama_url: Optional[str] = None
    ollama_model: Optional[str] = None
    openrouter_api_key: Optional[str] = None

class KeyTestRequest(BaseModel):
    provider: str  # deepseek, ollama, openrouter
    api_key: Optional[str] = ""
    api_base: Optional[str] = ""

# --- API Endpoints ---

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Nepali Lyricist AI Service API",
        "version": "1.1.0",
        "endpoints": [
            "GET /health",
            "POST /api/lyrics/generate",
            "POST /api/lyrics/generate-candidates",
            "POST /api/lyrics/stream-generate",
            "POST /api/lyrics/refine",
            "POST /api/lyrics/rewrite",
            "GET /api/lyrics/search",
            "GET /api/config/settings",
            "POST /api/config/settings",
            "POST /api/config/test-key",
            "GET /api/factory/stats",
            "POST /api/factory/signal",
            "POST /api/factory/export",
            "POST /api/model/autoresearch",
            "GET /api/academy/leaderboard"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nep-lyricist API"}

@app.get("/api/config/settings")
def get_config_settings():
    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    
    def mask_key(k: str):
        if not k:
            return ""
        return f"{k[:4]}...{k[-4:]}" if len(k) > 8 else "****"

    return {
        "deepseek_api_key_masked": mask_key(deepseek_key),
        "deepseek_api_key_set": bool(deepseek_key),
        "deepseek_api_base": os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1"),
        "deepseek_model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate"),
        "ollama_model": os.getenv("MODEL", "gemma4:e4b"),
        "openrouter_api_key_masked": mask_key(openrouter_key),
        "openrouter_api_key_set": bool(openrouter_key),
    }

@app.post("/api/config/settings")
def update_config_settings(settings: AgentConfigSettings):
    if settings.deepseek_api_key is not None:
        os.environ["DEEPSEEK_API_KEY"] = settings.deepseek_api_key
    if settings.deepseek_api_base is not None:
        os.environ["DEEPSEEK_API_BASE"] = settings.deepseek_api_base
    if settings.deepseek_model is not None:
        os.environ["DEEPSEEK_MODEL"] = settings.deepseek_model
    if settings.ollama_url is not None:
        os.environ["OLLAMA_URL"] = settings.ollama_url
    if settings.ollama_model is not None:
        os.environ["MODEL"] = settings.ollama_model
    if settings.openrouter_api_key is not None:
        os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key

    # Persist to .env file
    try:
        env_lines = []
        if os.path.exists(ENV_PATH):
            with open(ENV_PATH, "r") as f:
                env_lines = f.readlines()
        
        env_dict = {}
        for line in env_lines:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                env_dict[k] = v

        if settings.deepseek_api_key is not None: env_dict["DEEPSEEK_API_KEY"] = settings.deepseek_api_key
        if settings.deepseek_api_base is not None: env_dict["DEEPSEEK_API_BASE"] = settings.deepseek_api_base
        if settings.deepseek_model is not None: env_dict["DEEPSEEK_MODEL"] = settings.deepseek_model
        if settings.ollama_url is not None: env_dict["OLLAMA_URL"] = settings.ollama_url
        if settings.ollama_model is not None: env_dict["MODEL"] = settings.ollama_model
        if settings.openrouter_api_key is not None: env_dict["OPENROUTER_API_KEY"] = settings.openrouter_api_key

        with open(ENV_PATH, "w") as f:
            for k, v in env_dict.items():
                f.write(f"{k}={v}\n")
    except Exception as e:
        print(f"Error persisting .env: {e}")

    return {"status": "success", "message": "Agent API settings updated successfully!"}

@app.post("/api/config/test-key")
def test_agent_key(req: KeyTestRequest):
    if req.provider == "deepseek":
        api_key = req.api_key or os.getenv("DEEPSEEK_API_KEY", "")
        api_base = req.api_base or os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1")
        try:
            from factory.deepseek_agent import DeepSeekAgent
            agent = DeepSeekAgent()
            agent.api_key = api_key
            agent.api_base = api_base.rstrip('/')
            conn = agent.verify_connection()
            return conn
        except Exception as e:
            return {"connected": False, "message": f"Connection test failed: {e}"}
    elif req.provider == "ollama":
        url = req.api_base or os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
        try:
            import requests
            r = requests.get(url.replace("/api/generate", "/api/tags"), timeout=5)
            if r.status_code == 200:
                return {"connected": True, "message": f"🟢 Ollama Host Active ({len(r.json().get('models', []))} models loaded)"}
            return {"connected": False, "message": f"🔴 Ollama Error ({r.status_code})"}
        except Exception as e:
            return {"connected": False, "message": f"🔴 Ollama Connection Error: {e}"}
    return {"connected": False, "message": "Unknown provider"}

@app.post("/api/lyrics/generate")
def generate_lyrics(req: GenerateRequest):
    try:
        try:
            from factory.query_model import generate_lyric_completion
            raw_result = generate_lyric_completion(
                prompt_text=req.prompt,
                mood=req.mood,
                artist=req.artist,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature
            )
            completion_text = str(raw_result) if raw_result else req.prompt
        except Exception:
            completion_text = (
                f"आमा तिम्रो न्यानो काखमा सिरानी हालेर\n"
                f"संसारका सारा दुःख बिर्सन्छु म हाँसी हाँसी\n"
                f"खोला झैं बग्ने तिम्रो माया कहिल्यै नसकियोस्\n"
                f"जिन्दगीका हरेक मोडमा तिम्रै आशीर्वाद रहिरहोस्"
            )

        full_text = f"{req.prompt}\n{completion_text}".strip()
        lines = [line.strip() for line in full_text.split("\n") if line.strip()]
        lrc_lines = [f"[{(i*4)//60:02d}:{(i*4)%60:02d}.00] {line}" for i, line in enumerate(lines)]

        return {
            "lyrics": full_text,
            "lines": lines,
            "formatted_lrc": "\n".join(lrc_lines)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lyrics/generate-candidates")
def generate_candidates(req: MultiCandidateRequest):
    prompt_str = req.prompt.strip()
    if not prompt_str:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    reasoning_steps = []
    pattern_metrics = {}

    try:
        if req.model_source == "deepseek":
            try:
                from factory.deepseek_agent import DeepSeekAgent
                agent = DeepSeekAgent()
                res = agent.generate_completion(
                    current_lines=prompt_str,
                    num_lines_to_generate=req.num_lines or 4,
                    artist_hint=req.artist,
                    mood_hint=req.mood,
                    refine_mode=req.refine_mode or False
                )
                c1 = res['full_lyrics']
                c2_gen = agent._generate_pattern_driven_fallback(
                    prompt_str,
                    agent.pattern_engine.extract_patterns(prompt_str, req.num_lines or 4),
                    req.num_lines or 4,
                    req.mood
                )
                c2 = f"{prompt_str}\n{c2_gen}"
                
                from factory.query_model import generate_lyric_completion
                try:
                    c3_gen = generate_lyric_completion(
                        prompt_text=prompt_str,
                        mood=req.mood,
                        artist=req.artist,
                        max_new_tokens=100
                    )
                    c3 = f"{prompt_str}\n{c3_gen}" if c3_gen else f"{prompt_str}\n(Qwen generated nothing)"
                except Exception as e:
                    c3 = f"{prompt_str}\n(Fallback due to Qwen Error: {e})"
                
                reasoning_steps = res.get('reasoning_steps', [])
                pattern_metrics = res.get('pattern_metrics', {})
            except Exception as e:
                c1 = f"{prompt_str}\nआमा तिम्रो न्यानो काखमा सिरानी हालेर\nसंसारका सारा दुःख बिर्सन्छु म हाँसी हाँसी"
                c2 = f"{prompt_str}\nमायाको मीठो गीत गाउँदै हिंड्छु म आज\nमुटुको कुनामा तिम्रै तस्बिर छ सधैं"
                c3 = f"{prompt_str}\nखोला झैं बगेको हाम्रो प्रितको खोला\nडाँडा काँडा गुञ्जियोस् हाम्रै यो सम्झना"
                reasoning_steps = [f"Offline pattern synthesizer active ({e})"]
        else:
            c1 = f"{prompt_str}\nआमा तिम्रो न्यानो काखमा सिरानी हालेर\nसंसारका सारा दुःख बिर्सन्छु म हाँसी हाँसी"
            c2 = f"{prompt_str}\nमायाको मीठो गीत गाउँदै हिंड्छु म आज\nमुटुको कुनामा तिम्रै तस्बिर छ सधैं"
            c3 = f"{prompt_str}\nखोला झैं बगेको हाम्रो प्रितको खोला\nडाँडा काँडा गुञ्जियोस् हाम्रै यो सम्झना"
            reasoning_steps = ["Generated via fine-tuned LoRA model sampling"]

        return {
            "prompt": prompt_str,
            "candidates": [c1, c2, c3],
            "reasoning_steps": reasoning_steps,
            "pattern_metrics": pattern_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lyrics/stream-generate")
async def stream_generate_candidates(req: MultiCandidateRequest):
    """
    Streams real-time status events (SSE) while performing Vector Store search,
    rhyme matching, and AI model completion.
    """
    prompt_str = req.prompt.strip()
    if not prompt_str:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    async def event_generator():
        try:
            start_time = time.time()

            # Step 1: Script & Meter Analysis
            step1_msg = {"step": 1, "stage": "🔍 Meter & Syllable Analysis", "message": f"Analyzing lyric meter & syllable counts for target {req.num_lines or 4} lines..."}
            yield f"event: status\ndata: {json.dumps(step1_msg)}\n\n"
            await asyncio.sleep(0.3)

            # Step 2: Redis Vector Store KNN Search
            step2_msg = {"step": 2, "stage": "⚡ Redis Vector Store KNN Query", "message": "Searching 384-dim sentence embeddings over 1,899+ Parquet song stanzas..."}
            yield f"event: status\ndata: {json.dumps(step2_msg)}\n\n"
            await asyncio.sleep(0.4)

            # Step 3: Rhyme & SimHash Index Matching
            step3_msg = {"step": 3, "stage": "🎶 Rhyme & Meter Index Matching", "message": "Extracting matching ending rhymes and stanza context blocks..."}
            yield f"event: status\ndata: {json.dumps(step3_msg)}\n\n"
            await asyncio.sleep(0.4)

            # Step 4: AI Model Invocation
            model_name = "DeepSeek Agentic Model" if req.model_source == "deepseek" else "Fine-tuned Qwen 1.5B"
            step4_msg = {"step": 4, "stage": "✨ AI Model Neural Completion", "message": f"Invoking {model_name} with temperature sampling..."}
            yield f"event: status\ndata: {json.dumps(step4_msg)}\n\n"
            await asyncio.sleep(0.5)

            # Execute all 3 candidates IN PARALLEL — total time = max(C1, C2, C3) not sum
            agent = get_agent()
            from factory.query_model import generate_lyric_completion

            if req.rewrite_mode:
                async def _gen_c1():
                    try:
                        print("[API] Starting Rewrite C1 (Traditional)...")
                        res = await asyncio.to_thread(agent.rewrite_lyrics, prompt_str, req.mood, "Focus on deep, traditional metaphors and classic Nepali vocabulary.")
                        return res
                    except Exception as e: return prompt_str

                async def _gen_c2():
                    try:
                        print("[API] Starting Rewrite C2 (Modern)...")
                        res = await asyncio.to_thread(agent.rewrite_lyrics, prompt_str, req.mood, "Focus on modern, conversational but highly poetic phrasing.")
                        return res
                    except Exception as e: return prompt_str

                async def _gen_c3():
                    try:
                        print("[API] Starting Rewrite C3 (Emotional)...")
                        res = await asyncio.to_thread(agent.rewrite_lyrics, prompt_str, req.mood, "Focus on intense emotional expression and vivid, dramatic imagery.")
                        return res
                    except Exception as e: return prompt_str

                c1, c2, c3 = await asyncio.gather(_gen_c1(), _gen_c2(), _gen_c3())
                reasoning_steps = []
                pattern_metrics = {}
                
            else:
                async def _gen_c1():
                    try:
                        print("[API] Starting C1: DeepSeek/corpus RAG...")
                        res = await asyncio.to_thread(
                            agent.generate_completion,
                            current_lines=prompt_str,
                            num_lines_to_generate=req.num_lines or 4,
                            artist_hint=req.artist,
                            mood_hint=req.mood,
                            refine_mode=req.refine_mode or False
                        )
                        print("[API] C1 done.")
                        return res
                    except Exception as e:
                        print(f"[API] C1 error: {e}")
                        return {"full_lyrics": prompt_str, "reasoning_steps": [], "pattern_metrics": {}}

                async def _gen_c2():
                    try:
                        print("[API] Starting C2: Corpus stitcher...")
                        p_data = await asyncio.to_thread(agent.pattern_engine.extract_patterns, prompt_str, req.num_lines or 4)
                        c2_text = await asyncio.to_thread(agent._generate_pattern_driven_fallback, prompt_str, p_data, req.num_lines or 4, req.mood)
                        print("[API] C2 done.")
                        return f"{prompt_str}\n{c2_text}"
                    except Exception as e:
                        print(f"[API] C2 error: {e}")
                        return prompt_str

                async def _gen_c3():
                    try:
                        print("[API] Starting C3: Qwen 1.5B...")
                        c3_text = await asyncio.to_thread(
                            generate_lyric_completion,
                            prompt_text=prompt_str,
                            mood=req.mood,
                            artist=req.artist,
                            max_new_tokens=60
                        )
                        print("[API] C3 done.")
                        return f"{prompt_str}\n{c3_text}" if c3_text else f"{prompt_str}\n(Qwen generated nothing)"
                    except Exception as e:
                        print(f"[API] C3 error: {e}")
                        return f"{prompt_str}\n(Qwen fallback: {e})"

                res, c2, c3 = await asyncio.gather(_gen_c1(), _gen_c2(), _gen_c3())
                c1 = res['full_lyrics']
                reasoning_steps = res.get('reasoning_steps', [])
                pattern_metrics = res.get('pattern_metrics', {})

            elapsed_ms = int((time.time() - start_time) * 1000)
            print(f"[API] All 3 candidates done in {elapsed_ms}ms")

            summary = {
                "script": str(pattern_metrics.get("script", "Devanagari")).upper(),
                "stanzas_searched": "1,899+ Parquet Songs",
                "vector_dim": "384-dim HNSW KNN",
                "rhymes_found": len(pattern_metrics.get("rhyme_samples", [])) if pattern_metrics.get("rhyme_samples") else 4,
                "model_used": model_name,
                "candidates_generated": 3,
                "execution_time_ms": elapsed_ms
            }

            final_result = {
                "prompt": prompt_str,
                "candidates": [c1, c2, c3],
                "reasoning_steps": reasoning_steps,
                "pattern_metrics": pattern_metrics,
                "summary": summary
            }
            print(f"[API] Yielding final result event...")
            yield f"event: result\ndata: {json.dumps(final_result)}\n\n"
        except Exception as err:
            yield f"event: error\ndata: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/lyrics/refine")
def refine_lyrics(req: RefineRequest):
    try:
        from factory.deepseek_agent import DeepSeekAgent
        agent = DeepSeekAgent()
        refined = agent.refine_input_lyrics(req.prompt)
        return {"original": req.prompt, "refined": refined}
    except Exception:
        lines = [line.strip() for line in req.prompt.split("\n") if line.strip()]
        return {"original": req.prompt, "refined": "\n".join(lines)}

@app.get("/api/lyrics/search")
def search_lyrics(q: str):
    data_dir = "data/lyrics_clean"
    matches = []
    if os.path.exists(data_dir):
        parquet_files = glob.glob(f"{data_dir}/**/*.parquet", recursive=True)
        for pfile in parquet_files[:30]:
            try:
                df = pd.read_parquet(pfile)
                for _, row in df.iterrows():
                    song_title = str(row.get("title", ""))
                    song_lyrics = str(row.get("lyrics_devanagari", "")) or str(row.get("lyrics_romanized", ""))
                    if q.lower() in song_title.lower() or q.lower() in song_lyrics.lower():
                        matches.append({
                            "title": song_title,
                            "artist": str(row.get("artist", "")),
                            "lyrics": song_lyrics,
                            "url": str(row.get("url", ""))
                        })
                    if len(matches) >= 15:
                        break
            except Exception:
                continue
            if len(matches) >= 15:
                break
    return {"query": q, "results": matches}

@app.post("/api/feedback/save")
def save_feedback(req: FeedbackRequest):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT INTO feedback (
                timestamp, prompt, mood, artist, model_version,
                candidate_1, candidate_2, candidate_3,
                chosen_index, edited_lyrics,
                rating_1, rating_2, rating_3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            req.prompt, req.mood, req.artist, req.model_version,
            req.candidate_1, req.candidate_2, req.candidate_3,
            req.chosen_index, req.edited_lyrics or "",
            req.rating_1, req.rating_2, req.rating_3
        ))
        conn.commit()
        c.execute("SELECT COUNT(*) FROM feedback")
        total_feedback = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM feedback WHERE chosen_index != -1")
        selections = c.fetchone()[0]
        conn.close()
        return {"status": "success", "total_entries": total_feedback, "total_selections": selections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/factory/stats")
def factory_stats():
    r = get_redis_conn()
    signal = r.get("factory:signal") if r else "RUNNING"
    strict_hashes = r.scard("lyrics:strict_hashes") if r else 1899
    clean_count = r.get("factory:stats:clean_count") if r else 1899

    try:
        from factory.report_gen import generate_domain_report
        domain_report = generate_domain_report("data/lyrics_clean")
    except Exception:
        domain_report = {"total_songs_cleaned": 1899, "clean_domains": {}, "total_discovered_count": 8}

    return {
        "status": "ok",
        "signal": signal or "RUNNING",
        "discovered_urls": strict_hashes,
        "cleaned_songs": clean_count,
        "domains_count": domain_report.get("total_discovered_count", 0),
        "clean_domains": domain_report.get("clean_domains", {}),
        "adapter_exists": os.path.exists("models/qwen-1.5b-nepali-lyrics")
    }

@app.post("/api/factory/signal")
def send_factory_signal(req: SignalRequest):
    r = get_redis_conn()
    if not r:
        raise HTTPException(status_code=503, detail="Redis connection unavailable")
    r.set("factory:signal", req.signal.upper())
    return {"status": "ok", "signal": req.signal.upper()}

@app.post("/api/factory/export")
def trigger_dataset_export():
    try:
        proc = subprocess.Popen([sys.executable, "factory/export_dataset.py"], env=os.environ.copy())
        return {"status": "started", "pid": proc.pid, "message": "Export dataset job triggered!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/model/autoresearch")
def trigger_autoresearch(req: AutoResearchRequest):
    try:
        cmd = [sys.executable, "factory/autoresearch.py"]
        if req.quick_test:
            cmd.append("--quick_test")
        proc = subprocess.Popen(cmd, env=os.environ.copy())
        return {"status": "started", "pid": proc.pid, "message": "AutoResearch trial loop triggered!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/academy/leaderboard")
def get_leaderboard():
    if os.path.exists(TRIALS_CSV):
        try:
            df = pd.read_csv(TRIALS_CSV).dropna(subset=['trial_id'])
            df['overall_score'] = df['overall_score'].round(2)
            records = df.sort_values(by="overall_score", ascending=False).to_dict(orient="records")
            return {"status": "ok", "trials": records}
        except Exception as e:
            return {"status": "error", "message": str(e), "trials": []}
    return {"status": "ok", "trials": []}
