import os
import glob
import pandas as pd
import json
import unicodedata
# No sklearn dependency required
from dotenv import load_dotenv
from datasets import Dataset, DatasetDict
from tokenizers import ByteLevelBPETokenizer

# Load environment variables
load_dotenv()

def normalize_text(text):
    if not isinstance(text, str):
        return ""
    # Normalize Devanagari and Romanized characters into a consistent Unicode representation (NFKC)
    return unicodedata.normalize('NFKC', text)

def build_training_format(row):
    """
    Formats a row into the target sequence layout for Causal LM training.
    """
    title = str(row.get('title', 'Unknown')).strip()
    artist = str(row.get('artist', 'Unknown')).strip()
    emotions = str(row.get('emotions', 'Unknown')).strip()
    lyrics_devanagari = str(row.get('lyrics_devanagari', '')).strip()
    lyrics_romanized = str(row.get('lyrics_romanized', '')).strip()
    
    # Format sequence:
    # <|title|>Song Title<|artist|>Artist Name<|emotions|>Vibe<|lyrics_devanagari|>...<|lyrics_romanized|>...<|end|>
    formatted_text = (
        f"<|title|>{title}"
        f"<|artist|>{artist}"
        f"<|emotions|>{emotions}"
        f"<|lyrics_devanagari|>\n{lyrics_devanagari}\n"
        f"<|lyrics_romanized|>\n{lyrics_romanized}\n"
        f"<|end|>"
    )
    return formatted_text

import sqlite3

def load_user_feedback_records(db_path="logs/user_feedback.db") -> pd.DataFrame:
    """
    Extracts high-rated, selected, or user-edited lyric completions from SQLite feedback database
    regardless of which model (DeepSeek, Qwen, Ollama) generated them, converting them into training samples.
    """
    if not os.path.exists(db_path):
        return pd.DataFrame()
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("""
            SELECT prompt, mood, artist, model_version,
                   candidate_1, candidate_2, candidate_3,
                   chosen_index, edited_lyrics,
                   rating_1, rating_2, rating_3
            FROM feedback
        """)
        rows = c.fetchall()
        conn.close()

        records = []
        for r in rows:
            prompt, mood, artist, model_version, c1, c2, c3, chosen, edited, r1, r2, r3 = r
            selected_text = ""
            if edited and edited.strip():
                selected_text = edited.strip()
            elif chosen in (1, 2, 3):
                cands = [c1, c2, c3]
                selected_text = cands[chosen - 1].strip() if len(cands) >= chosen else ""
            elif r1 > 0:
                selected_text = (c1 or "").strip()
            elif r2 > 0:
                selected_text = (c2 or "").strip()
            elif r3 > 0:
                selected_text = (c3 or "").strip()

            if selected_text:
                records.append({
                    "title": f"User Preferred ({model_version or 'ai'})",
                    "artist": artist or "Nepali Artist",
                    "emotions": mood or "Emotional",
                    "lyrics_devanagari": selected_text,
                    "lyrics_romanized": "",
                    "source": f"feedback_{model_version or 'user'}"
                })
        print(f"Loaded {len(records)} high-rated user feedback samples from SQLite ({db_path}).")
        return pd.DataFrame(records)
    except Exception as e:
        print(f"Warning: Could not read feedback DB ({e})")
        return pd.DataFrame()

def export_and_upload(clean_dir, repo_id, vocab_size=32000):
    print(f"Reading cleaned songs from: {clean_dir}")
    parquet_files = glob.glob(os.path.join(clean_dir, "**/*.parquet"), recursive=True)
    print(f"Found {len(parquet_files)} parquet files.")
    
    dfs = []
    if parquet_files:
        for f in parquet_files:
            try:
                dfs.append(pd.read_parquet(f))
            except Exception as e:
                print(f"Warning: Failed to read {f}: {e}")

    # Load and merge user feedback from SQLite database
    feedback_df = load_user_feedback_records()
    if not feedback_df.empty:
        dfs.append(feedback_df)
            
    if not dfs:
        print("❌ No dataframes loaded successfully.")
        return
        
    df = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(df)} total records (Parquet songs + User Feedback).")
    
    # Drop duplicates by fuzzy hash to ensure unique songs
    if 'fuzzy_hash' in df.columns:
        initial_len = len(df)
        df = df.drop_duplicates(subset=['fuzzy_hash'])
        print(f"Fuzzy hash deduplication: {initial_len} -> {len(df)} songs.")
        
    # Normalize Devanagari and Romanized text columns
    for col in ['lyrics_devanagari', 'lyrics_romanized', 'title', 'artist']:
        if col in df.columns:
            df[col] = df[col].apply(normalize_text)
            
    # Format for training
    df['text'] = df.apply(build_training_format, axis=1)
    
    # Save the aggregated dataset locally
    os.makedirs("data/training_export", exist_ok=True)
    local_parquet = "data/training_export/dataset.parquet"
    df.to_parquet(local_parquet, index=False)
    print(f"Saved aggregated training data to {local_parquet}")
    
    # 1. Train Tokenizer
    print("\n--- Training Custom Tokenizer ---")
    tokenizer_train_file = "data/training_export/tokenizer_corpus.txt"
    with open(tokenizer_train_file, 'w', encoding='utf-8') as tf:
        for text in df['text']:
            tf.write(text + "\n")
            
    print(f"Corpus written to {tokenizer_train_file}. Starting BPE training...")
    tokenizer = ByteLevelBPETokenizer()
    tokenizer.train(
        files=[tokenizer_train_file],
        vocab_size=vocab_size,
        min_frequency=2,
        special_tokens=[
            "<|title|>",
            "<|artist|>",
            "<|emotions|>",
            "<|lyrics_devanagari|>",
            "<|lyrics_romanized|>",
            "<|end|>"
        ]
    )
    
    tokenizer_dir = "data/training_export/tokenizer"
    os.makedirs(tokenizer_dir, exist_ok=True)
    tokenizer.save_model(tokenizer_dir)
    print(f"Saved trained tokenizer in {tokenizer_dir}/")
    
    # 2. Split Dataset and Create DatasetDict (Manual split to avoid sklearn dependency)
    df_shuffled = df[['text', 'title', 'artist', 'emotions', 'lyrics_devanagari', 'lyrics_romanized']].sample(frac=1, random_state=42).reset_index(drop=True)
    split_idx = int(len(df_shuffled) * 0.9)
    train_df = df_shuffled.iloc[:split_idx]
    val_df = df_shuffled.iloc[split_idx:]
    print(f"Dataset split: {len(train_df)} train samples, {len(val_df)} validation samples.")
    
    # Convert to HF datasets
    train_dataset = Dataset.from_pandas(train_df.reset_index(drop=True))
    val_dataset = Dataset.from_pandas(val_df.reset_index(drop=True))
    
    dataset_dict = DatasetDict({
        "train": train_dataset,
        "validation": val_dataset
    })
    
    # 3. Upload to Hugging Face Hub
    hf_token = os.getenv("HF_TOKEN")
    if hf_token and hf_token != "your_hugging_face_write_token_here":
        print(f"\n--- Uploading Dataset to HF Hub: {repo_id} ---")
        try:
            dataset_dict.push_to_hub(repo_id, token=hf_token, private=True)
            print("🎉 Dataset successfully pushed to Hugging Face Hub!")
            
            # Also upload tokenizer files
            from huggingface_hub import HfApi
            api = HfApi()
            print("Uploading trained tokenizer files...")
            for f in glob.glob(os.path.join(tokenizer_dir, "*")):
                api.upload_file(
                    path_or_fileobj=f,
                    path_in_repo=f"tokenizer/{os.path.basename(f)}",
                    repo_id=repo_id,
                    repo_type="dataset",
                    token=hf_token
                )
            print("🎉 Tokenizer files uploaded!")
        except Exception as e:
            print(f"❌ Failed to upload to HF Hub: {e}")
            print("Please make sure your HF_TOKEN has Write access and repo_id is correct.")
    else:
        print("\n⚠️ No valid HF_TOKEN found in env variables. Skipping Hugging Face upload.")
        print("To upload, set HF_TOKEN in your .env file.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Export cleaned Nepali lyrics and prepare for training.")
    parser.add_argument("--clean_dir", default="data/lyrics_clean", help="Directory with clean Parquet partitions")
    parser.add_argument("--repo_id", default="sanjeevbhusal/nepali-lyrics-v1", help="Hugging Face Dataset repo ID (private)")
    parser.add_argument("--vocab_size", type=int, default=32000, help="Custom BPE tokenizer vocabulary size")
    
    args = parser.parse_args()
    export_and_upload(args.clean_dir, args.repo_id, args.vocab_size)
