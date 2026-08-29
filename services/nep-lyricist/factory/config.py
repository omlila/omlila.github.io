import os

# 🛡️ Operational Limits
STORAGE_LIMIT_GB = 5
MAX_SONGS = 1000  # Increased limit

# 🧠 AI Configuration
MODEL = "gemma4:e4b"
OLLAMA_URL = "http://host.docker.internal:11434/api/generate" # Connected to Mac host

# 🔍 Manual Control
REVIEW_MODE = False  # Set to False for Docker usage

# 📂 Paths
RAW_DATA_DIR = "data/lyrics_raw"
CLEAN_DATA_DIR = "data/lyrics_clean"
LOG_DIR = "logs"

# Ensure directories exist
os.makedirs(LOG_DIR, exist_ok=True)
