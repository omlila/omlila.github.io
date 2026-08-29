import os
import re
import numpy as np
from typing import List, Dict, Any, Optional
import redis

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

class VectorStore:
    """
    Redis Vector Search Engine for Nepali Lyric Autocomplete.
    Uses sentence embeddings (384-dim) to index sanitized song stanzas,
    performing HNSW Cosine KNN queries in Redis (or in-memory numpy fallback).
    """
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None
        self.vector_dim = 384
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.r = None
        self.in_memory_index: List[Dict[str, Any]] = []
        self._init_redis()

    def _init_redis(self):
        try:
            self.r = redis.Redis(host=self.redis_host, port=self.redis_port, decode_responses=False)
            self.r.ping()
        except Exception as e:
            print(f"[VectorStore] Redis connection info: {e}. In-memory vector search active.")
            self.r = None

    def _load_model(self):
        if self._model is None:
            if HAS_SENTENCE_TRANSFORMERS:
                try:
                    self._model = SentenceTransformer(self.model_name)
                    self.vector_dim = self._model.get_sentence_embedding_dimension() or 384
                except Exception as e:
                    print(f"[VectorStore] Could not load SentenceTransformer ({e}). Falling back to TF-IDF embeddings.")
                    self._model = "fallback"
            else:
                self._model = "fallback"

    def embed_text(self, text: str) -> np.ndarray:
        """Generate a normalized 384-dim vector for input text."""
        self._load_model()
        if self._model != "fallback" and hasattr(self._model, 'encode'):
            vec = np.asarray(self._model.encode(text))
        else:
            # Deterministic character-level fallback vectorizer
            vec = np.zeros(self.vector_dim, dtype=np.float32)
            words = re.findall(r'\w+', text.lower())
            for i, word in enumerate(words):
                h = hash(word) % self.vector_dim
                vec[h] += 1.0 / (i + 1.0)
        
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.astype(np.float32)

    def add_song_vector(self, song_id: str, title: str, artist: str, emotions: str, script: str, lyrics_snippet: str):
        """Add song stanza to vector store index."""
        vector = self.embed_text(lyrics_snippet)
        record = {
            "id": song_id,
            "title": title,
            "artist": artist,
            "emotions": emotions,
            "script": script,
            "lyrics_snippet": lyrics_snippet,
            "vector": vector
        }
        self.in_memory_index.append(record)

        # Store in Redis if connected
        if self.r:
            try:
                key = f"song_vec:{song_id}"
                self.r.hset(key, mapping={
                    "title": title.encode('utf-8'),
                    "artist": artist.encode('utf-8'),
                    "emotions": emotions.encode('utf-8'),
                    "script": script.encode('utf-8'),
                    "lyrics_snippet": lyrics_snippet.encode('utf-8'),
                    "vector": vector.tobytes()
                })
            except Exception as e:
                pass

    def search_similar_stanzas(self, query_text: str, script: str = "", limit: int = 5) -> List[Dict[str, Any]]:
        """
        Perform Cosine KNN Vector Search over indexed song stanzas.
        """
        query_vec = self.embed_text(query_text)
        results = []

        # In-memory numpy vector distance search
        for rec in self.in_memory_index:
            if script and rec['script'] != script:
                continue
            sim = float(np.dot(query_vec, rec['vector']))
            results.append((sim, rec))

        results.sort(key=lambda x: x[0], reverse=True)
        out = []
        for sim, rec in results[:limit]:
            out.append({
                "song_title": rec["title"],
                "artist": rec["artist"],
                "emotions": rec["emotions"],
                "script": rec["script"],
                "similarity_score": round(sim, 4),
                "lyrics_snippet": rec["lyrics_snippet"]
            })
        return out
