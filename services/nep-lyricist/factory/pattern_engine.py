import os
import glob
import re
from typing import List, Dict, Any, Optional
import pandas as pd
from factory.vector_store import VectorStore

class PatternEngine:
    """
    PatternEngine loads sanitized Nepali lyrics (Devanagari & Romanized) from Parquet dataset,
    indexes ending rhymes, line meters, stanzas, and dense vector embeddings via Redis VectorStore,
    providing Hybrid Vector + Rhyme pattern matching queries for AI agent auto-completion.
    """
    def __init__(self, data_dir: str = "data/lyrics_clean"):
        self.data_dir = data_dir
        self.df: Optional[pd.DataFrame] = None
        self.line_index: List[Dict[str, Any]] = []
        self.vector_store = VectorStore()
        self._load_dataset()
        self._build_indexes()

    def _load_dataset(self):
        parquet_files = glob.glob(os.path.join(self.data_dir, "**/*.parquet"), recursive=True)
        if not parquet_files:
            print(f"[PatternEngine] Warning: No parquet files found in {self.data_dir}")
            self.df = pd.DataFrame(columns=['title', 'artist', 'lyrics', 'lyrics_devanagari', 'lyrics_romanized', 'emotions'])
            return
        
        dfs = []
        for file in parquet_files:
            try:
                dfs.append(pd.read_parquet(file))
            except Exception as e:
                print(f"[PatternEngine] Error loading {file}: {e}")
        
        if dfs:
            self.df = pd.concat(dfs, ignore_index=True)
            print(f"[PatternEngine] Successfully loaded {len(self.df)} songs from {len(parquet_files)} parquet files.")
        else:
            self.df = pd.DataFrame()

    def _build_indexes(self):
        """Build line-level rhyme index and Redis vector index."""
        if self.df is None or self.df.empty:
            return

        self.line_index = []
        # Index top songs into VectorStore for ultra-fast vector KNN search
        for idx, row in self.df.iterrows():
            title = row.get('title', 'Unknown')
            artist = row.get('artist', 'Unknown')
            emotions = row.get('emotions', '')

            dev_text = str(row.get('lyrics_devanagari') or '')
            rom_text = str(row.get('lyrics_romanized') or '')

            # Add Devanagari song stanza to vector store
            if dev_text.strip():
                dev_snippet = "\n".join([l.strip() for l in dev_text.split('\n') if l.strip()][:4])
                self.vector_store.add_song_vector(
                    song_id=f"dev_{idx}",
                    title=title,
                    artist=artist,
                    emotions=emotions,
                    script="devanagari",
                    lyrics_snippet=dev_snippet
                )

            # Add Romanized song stanza to vector store
            if rom_text.strip():
                rom_snippet = "\n".join([l.strip() for l in rom_text.split('\n') if l.strip()][:4])
                self.vector_store.add_song_vector(
                    song_id=f"rom_{idx}",
                    title=title,
                    artist=artist,
                    emotions=emotions,
                    script="romanized",
                    lyrics_snippet=rom_snippet
                )

            # Index Devanagari lines for rhyme matching
            dev_lines = [l.strip() for l in dev_text.split('\n') if l.strip()]
            for line_no, line in enumerate(dev_lines):
                tokens = line.split()
                if not tokens:
                    continue
                last_word = tokens[-1]
                suffix_2 = last_word[-2:] if len(last_word) >= 2 else last_word
                suffix_3 = last_word[-3:] if len(last_word) >= 3 else last_word
                
                self.line_index.append({
                    'song_title': title,
                    'artist': artist,
                    'emotions': emotions,
                    'script': 'devanagari',
                    'line': line,
                    'line_no': line_no,
                    'word_count': len(tokens),
                    'char_count': len(line),
                    'last_word': last_word,
                    'suffix_2': suffix_2,
                    'suffix_3': suffix_3,
                    'context_block': "\n".join(dev_lines[max(0, line_no-1):min(len(dev_lines), line_no+4)])
                })

            # Index Romanized lines for rhyme matching
            rom_lines = [l.strip() for l in rom_text.split('\n') if l.strip()]
            for line_no, line in enumerate(rom_lines):
                tokens = line.split()
                if not tokens:
                    continue
                last_word = re.sub(r'[^a-zA-Z]', '', tokens[-1]).lower()
                if not last_word:
                    continue
                suffix_2 = last_word[-2:] if len(last_word) >= 2 else last_word
                suffix_3 = last_word[-3:] if len(last_word) >= 3 else last_word

                self.line_index.append({
                    'song_title': title,
                    'artist': artist,
                    'emotions': emotions,
                    'script': 'romanized',
                    'line': line,
                    'line_no': line_no,
                    'word_count': len(tokens),
                    'char_count': len(line),
                    'last_word': last_word,
                    'suffix_2': suffix_2,
                    'suffix_3': suffix_3,
                    'context_block': "\n".join(rom_lines[max(0, line_no-1):min(len(rom_lines), line_no+4)])
                })

        print(f"[PatternEngine] Indexed {len(self.line_index)} lines and {len(self.vector_store.in_memory_index)} song vectors.")

    def detect_script(self, text: str) -> str:
        """Detect whether input text is primarily Devanagari or Romanized."""
        dev_count = len(re.findall(r'[\u0900-\u097F]', text))
        return 'devanagari' if dev_count > 0 else 'romanized'

    def find_rhyming_lines(self, ending_word: str, script: str = 'devanagari', limit: int = 5) -> List[Dict[str, Any]]:
        """Find lines in the dataset with matching ending rhymes."""
        if not ending_word:
            return []
        
        clean_word = ending_word.strip()
        if script == 'romanized':
            clean_word = re.sub(r'[^a-zA-Z]', '', clean_word).lower()

        suf_3 = clean_word[-3:] if len(clean_word) >= 3 else clean_word
        suf_2 = clean_word[-2:] if len(clean_word) >= 2 else clean_word

        matches = []
        for entry in self.line_index:
            if entry['script'] != script:
                continue
            if entry['last_word'] == clean_word:
                matches.append((3, entry))
            elif entry['suffix_3'] == suf_3:
                matches.append((2, entry))
            elif entry['suffix_2'] == suf_2:
                matches.append((1, entry))

        matches.sort(key=lambda x: x[0], reverse=True)
        return [m[1] for m in matches[:limit]]

    def extract_patterns(self, input_lines_str: str, num_lines_to_generate: int = 4) -> Dict[str, Any]:
        """
        Hybrid Retrieval: Combines Redis Vector KNN Search + Rhyme Matching + Meter Constraints.
        """
        raw = input_lines_str.strip()
        if not raw:
            return {
                'script': 'devanagari',
                'line_count': 0,
                'rhymes': [],
                'similar_songs': [],
                'vector_matches': [],
                'meter': {'avg_words': 0, 'avg_chars': 0},
                'target_lines_count': num_lines_to_generate
            }

        # Normalize lines: split by newlines first; if single line with periods/commas, split into stanzas
        split_lines = [l.strip() for l in raw.split('\n') if l.strip()]
        lines = []
        for line in split_lines:
            # If a single line contains multiple sentences ending in period/exclamation, split them
            sublines = [s.strip() for s in re.split(r'(?<=[.!?])\s+', line) if s.strip()]
            lines.extend(sublines if sublines else [line])

        script = self.detect_script(raw)
        word_counts = [len(l.split()) for l in lines]
        char_counts = [len(l) for l in lines]

        # Extract last word cleanly by stripping trailing punctuation (. , ! ?)
        last_line = lines[-1] if lines else ""
        words_in_last = last_line.split()
        raw_last_word = words_in_last[-1] if words_in_last else ""
        clean_last_word = re.sub(r'[^a-zA-Z\u0900-\u097F]', '', raw_last_word)

        rhyme_matches = self.find_rhyming_lines(clean_last_word, script=script, limit=5)
        vector_matches = self.vector_store.search_similar_stanzas(raw, script=script, limit=3)

        return {
            'script': script,
            'line_count': len(lines),
            'lines_list': lines,
            'last_line': last_line,
            'last_word': clean_last_word or raw_last_word,
            'meter': {
                'avg_words': sum(word_counts) / len(word_counts) if word_counts else 0,
                'avg_chars': sum(char_counts) / len(char_counts) if char_counts else 0,
                'recent_word_counts': word_counts
            },
            'rhyme_matches': rhyme_matches,
            'vector_matches': vector_matches,
            'similar_songs': vector_matches,
            'target_lines_count': num_lines_to_generate
        }
