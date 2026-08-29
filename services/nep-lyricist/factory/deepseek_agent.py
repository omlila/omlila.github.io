import os
import json
import re
import requests
from typing import List, Dict, Any, Optional
from factory.pattern_engine import PatternEngine

class DeepSeekAgent:
    """
    DeepSeek AI Agent for Nepali Lyric Auto-Completion.
    Integrates PatternEngine (Redis Vector Search + Rhyme Search) with DeepSeek AI
    to analyze rhyme schemes, line meter, and stanzas to generate cohesive lines of Nepali lyrics.
    """
    def __init__(self, pattern_engine: Optional[PatternEngine] = None):
        self.pattern_engine = pattern_engine or PatternEngine()
        self.api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.api_base = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1").rstrip('/')
        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    def verify_connection(self) -> Dict[str, Any]:
        """Verify API key connectivity with DeepSeek API endpoint."""
        api_key = os.getenv("DEEPSEEK_API_KEY", self.api_key)
        if not api_key:
            return {"connected": False, "message": "⚠️ No API key configured (Using Corpus Pattern Synthesizer)"}
        
        url = f"{self.api_base}/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                return {"connected": True, "message": "🟢 Live DeepSeek API Connected & Active"}
            else:
                return {"connected": False, "message": f"🔴 DeepSeek API Error ({resp.status_code}): {resp.text[:100]}"}
        except Exception as e:
            return {"connected": False, "message": f"🔴 DeepSeek Connection Error: {e}"}

    def _call_deepseek_api(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Calls DeepSeek API or OpenAI-compatible endpoint."""
        if not self.api_key:
            return None

        url = f"{self.api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                return data['choices'][0]['message']['content'].strip()
            else:
                print(f"[DeepSeekAgent] API call failed with status {resp.status_code}: {resp.text}")
                return None
        except Exception as e:
            print(f"[DeepSeekAgent] Error calling DeepSeek API: {e}")
            return None

    def _generate_pattern_driven_fallback(self, current_lines: str, pattern_data: Dict[str, Any], num_lines: int, mood: str = "") -> str:
        """
        Dynamic In-Corpus Recombination Engine:
        Retrieves matching stanzas and rhyming lines directly from the 1,899+ Parquet song dataset.
        Filters by script, meter, and optionally mood to create cohesive fallbacks.
        """
        script = pattern_data['script']
        meter = pattern_data.get('meter', {'avg_words': 4.0})
        target_words = int(round(meter.get('avg_words', 4.0)))
        
        rhyme_matches = pattern_data.get('rhyme_matches', [])
        vector_matches = pattern_data.get('vector_matches', [])

        candidate_pool: List[str] = []
        used_lines = set(line.strip() for line in current_lines.split('\n') if line.strip())

        def is_good_match(line_text: str) -> bool:
            clean_l = line_text.strip()
            if not clean_l or clean_l in used_lines or clean_l in candidate_pool:
                return False
            # Check meter (allow +/- 1 word)
            word_count = len(clean_l.split())
            if abs(word_count - target_words) > 1:
                return False
            return True

        # 1. Pull lines from top vector KNN stanzas (these already match contextually/mood)
        for v in vector_matches[:5]:
            snippet = v.get('lyrics_snippet', '')
            for line in snippet.split('\n'):
                if is_good_match(line):
                    candidate_pool.append(line.strip())

        # 2. Pull lines from rhyme matches
        for r in rhyme_matches[:15]:
            if is_good_match(r.get('line', '')):
                candidate_pool.append(r.get('line', '').strip())

        # 3. Pull lines from PatternEngine line_index matching script and mood
        if len(candidate_pool) < num_lines:
            for entry in self.pattern_engine.line_index:
                if entry.get('script') == script:
                    # If mood is provided, prefer lines that have a matching emotion
                    emotions = entry.get('emotions', '').lower()
                    if mood and mood.lower() not in emotions and emotions:
                        continue
                    
                    if is_good_match(entry.get('line', '')):
                        candidate_pool.append(entry.get('line', '').strip())
                    
                    if len(candidate_pool) >= num_lines * 3:
                        break

        # Fallback if strict meter/mood matching yielded too few lines
        if len(candidate_pool) < num_lines:
            for entry in self.pattern_engine.line_index:
                if entry.get('script') == script:
                    clean_l = entry.get('line', '').strip()
                    if clean_l and clean_l not in used_lines and clean_l not in candidate_pool:
                        candidate_pool.append(clean_l)
                    if len(candidate_pool) >= num_lines:
                        break

        # Select target number of lines
        selected_lines = candidate_pool[:num_lines]
        if not selected_lines:
            if script == 'devanagari':
                selected_lines = [
                    "मुस्कान तिम्रो हृदयमा गाढा बसिसक्यो",
                    "मायाको यो मीठो भाका अझै गुञ्जिरह्यो",
                    "पल पल तिम्रै यादले सिरसिर हावा चल्यो",
                    "जिन्दगीका गोरेटोमा सँगै हिँड्ने रहर जाग्यो"
                ][:num_lines]
            else:
                selected_lines = [
                    "Timro yo muskanle mutu choi gayo",
                    "Maya ko yo geet sangai gunjirahechha",
                    "Pal pal timrai samjhana matra bhai rahyo",
                    "Melody of love will live in our souls"
                ][:num_lines]

        return "\n".join(selected_lines)

    def refine_input_lyrics(self, input_text: str) -> str:
        """
        Refines and polishes input lyrics into structured stanza lines,
        correcting line breaks and minor transliteration formatting while preserving meaning.
        """
        clean = input_text.strip()
        if not clean:
            return ""

        system_prompt = (
            "You are an expert Nepali Lyric Refiner.\n"
            "Format the input song text into clean, beautifully structured line stanzas.\n"
            "Preserve exact lyrics and meaning. Output ONLY the refined lines."
        )
        refined = self._call_deepseek_api(system_prompt, f"Refine these lyric lines:\n{clean}")
        if refined:
            return "\n".join([l.strip() for l in refined.split('\n') if l.strip()])

        parts = [p.strip() for p in re.split(r'[,.\n]+', clean) if p.strip()]
        return "\n".join(parts)

    def rewrite_lyrics(self, input_text: str, mood_hint: str = "", style_variant: str = "") -> str:
        """
        Completely rewrites the input lyrics while keeping the same pattern, meter, and core meaning.
        """
        clean = input_text.strip()
        if not clean:
            return ""

        mood_prompt = f" Maintain a {mood_hint} mood/vibe." if mood_hint else ""
        style_prompt = f" {style_variant}" if style_variant else ""
        system_prompt = (
            "You are an expert Nepali Lyricist and Poet.\n"
            "Your task is to completely rewrite the user's provided lyrics.\n"
            "You MUST keep the underlying meaning, rhythm, meter, and stanza structure identical or very similar.\n"
            f"Improve the poetic phrasing, word choices, and emotional impact.{mood_prompt}{style_prompt}\n"
            "Output ONLY the rewritten lyrics with no extra conversational text."
        )
        rewritten = self._call_deepseek_api(system_prompt, f"Rewrite these lyrics:\n{clean}")
        if rewritten:
            return "\n".join([l.strip() for l in rewritten.split('\n') if l.strip()])
        
        return clean

    def generate_completion(
        self, 
        current_lines: str, 
        num_lines_to_generate: int = 4,
        artist_hint: str = "",
        mood_hint: str = "",
        refine_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Agentic RAG execution pipeline:
        1. Analyzes prompt lines, meter, and script.
        2. Performs Hybrid Vector KNN + Rhyme Search over 1,899+ Parquet dataset in Redis.
        3. Constructs rich In-Context RAG prompt containing full song stanzas from top matches.
        4. Calls DeepSeek AI Agent (or fallback In-Corpus Recombination Engine).
        5. Returns completed lines with reasoning steps and metrics.
        """
        clean_input = current_lines.strip()
        if not clean_input:
            return {
                "success": False,
                "error": "Input lines cannot be empty.",
                "generated_lines": "",
                "full_lyrics": ""
            }

        input_for_generation = clean_input
        if refine_mode:
            input_for_generation = self.refine_input_lyrics(clean_input) or clean_input

        patterns = self.pattern_engine.extract_patterns(clean_input, num_lines_to_generate=num_lines_to_generate)
        script = patterns['script']
        meter = patterns['meter']
        rhymes = patterns['rhyme_matches']
        vector_matches = patterns.get('vector_matches', [])

        top_vector_score = vector_matches[0]['similarity_score'] if vector_matches else 0.0

        reasoning_steps = [
            f"Detected Script: {script.upper()}",
            f"Lines so far: {patterns['line_count']} | Target completion: {num_lines_to_generate} lines",
            f"Target Meter: ~{round(meter['avg_words'], 1)} words per line (~{round(meter['avg_chars'], 1)} characters)",
            f"Ending Rhyme Target: '{patterns['last_word']}'",
            f"Redis Vector Search: Retrieved {len(vector_matches)} full song stanzas (Top similarity: {top_vector_score})",
            f"Corpus Rhyme Search: Retrieved {len(rhymes)} rhyming lines from Parquet dataset."
        ]

        # Full In-Context RAG Stanzas (Un-truncated full song snippets!)
        vector_context_blocks = []
        for i, v in enumerate(vector_matches[:5]):
            block = (
                f"--- Reference Song #{i+1}: '{v.get('song_title')}' (by {v.get('artist')}, Mood: {v.get('emotions')}) ---\n"
                f"{v.get('lyrics_snippet')}"
            )
            vector_context_blocks.append(block)
        vector_context_str = "\n\n".join(vector_context_blocks)

        rhyme_context_str = "\n".join([f"- '{r['line']}' (from song '{r['song_title']}', artist {r['artist']})" for r in rhymes[:6]])

        parsed_lines = patterns.get('lines_list', [clean_input])
        numbered_lines_str = "\n".join([f"{i+1}. {l}" for i, l in enumerate(parsed_lines)])
        last_line_str = patterns.get('last_line', parsed_lines[-1] if parsed_lines else "")

        system_prompt = (
            "You are a master Nepali Lyricist AI Agent.\n"
            "Your objective is to generate the EXACT next 3 to 4 lines of song lyrics continuing the user's song.\n"
            "POETIC & STYLE INSTRUCTIONS:\n"
            "1. Draw inspiration, metaphors, and emotion directly from the provided Reference Songs in the context.\n"
            "2. Match the exact language script of the input (Devanagari if Devanagari, Romanized if Romanized).\n"
            "3. Maintain end-rhymes (Anuprasa) matching the ending target word.\n"
            "4. Output ONLY the requested continuation lines. Do NOT add headers, quotes, or conversational commentary."
        )

        user_prompt = (
            f"USER'S SONG PROMPT ({len(parsed_lines)} lines written so far):\n"
            f"{numbered_lines_str}\n\n"
            f"RETRIEVED PARQUET SONG COLLECTION CONTEXT (Use these for metaphors, style & vocabulary):\n"
            f"{vector_context_str or 'None'}\n\n"
            f"CORPUS RHYMING MATCHES (Matching ending suffix '{patterns['last_word']}'):\n"
            f"{rhyme_context_str or 'None'}\n\n"
            f"METADATA & CONSTRAINTS:\n"
            f"- Preferred Artist Style: {artist_hint or 'Nepali Melodic Folk/Pop'}\n"
            f"- Desired Vibe: {mood_hint or 'Emotional/Romantic'}\n"
            f"- Target Syllable Meter: ~{round(meter['avg_words'])} words per line\n"
            f"- Last Input Line (Line #{len(parsed_lines)}): '{last_line_str}'\n\n"
            f"INSTRUCTION: Write exactly {num_lines_to_generate} lines continuing directly after Line #{len(parsed_lines)} ('{last_line_str}')."
        )

        raw_output = self._call_deepseek_api(system_prompt, user_prompt)
        used_api = True

        if not raw_output:
            used_api = False
            reasoning_steps.append("DeepSeek API offline. Utilizing In-Corpus Dynamic Recombination Engine.")
            raw_output = self._generate_pattern_driven_fallback(clean_input, patterns, num_lines_to_generate, mood_hint)

        gen_lines = [l.strip() for l in raw_output.split('\n') if l.strip()]
        gen_lines = gen_lines[:num_lines_to_generate]
        generated_text = "\n".join(gen_lines)
        full_lyrics = f"{clean_input}\n{generated_text}"

        return {
            "success": True,
            "used_api": used_api,
            "input_lines": clean_input,
            "generated_lines": generated_text,
            "full_lyrics": full_lyrics,
            "num_lines_generated": len(gen_lines),
            "reasoning_steps": reasoning_steps,
            "pattern_metrics": {
                "script": script,
                "target_num_lines": num_lines_to_generate,
                "avg_words_per_line": round(meter['avg_words'], 1),
                "rhyme_matches_count": len(rhymes),
                "vector_matches_count": len(vector_matches),
                "top_vector_similarity": top_vector_score,
                "rhyme_samples": [r['line'] for r in rhymes[:3]]
            }
        }
