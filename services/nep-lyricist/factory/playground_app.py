import streamlit as st
import sqlite3
import datetime
import os
import requests
import json
import re
from dotenv import load_dotenv
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
from factory.deepseek_agent import DeepSeekAgent

# Load environment variables
load_dotenv()

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL = os.getenv("MODEL", "gemma4:e4b")
DB_PATH = "logs/user_feedback.db"
LOCAL_MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
LOCAL_ADAPTER_DIR = "models/qwen-1.5b-nepali-lyrics"

# Page config
st.set_page_config(
    page_title="Nepali Lyrics Autocomplete Playground",
    page_icon="🎵",
    layout="wide",
)

# Disable auto-spelling correction and auto-capitalization in text inputs
st.markdown("""
<style>
textarea, input, [data-baseweb="textarea"] textarea, [data-baseweb="input"] input, .stTextArea textarea, .stTextInput input {
    spellcheck: false !important;
    -webkit-spellcheck: false !important;
    autocorrect: off !important;
    -webkit-autocorrect: off !important;
    autocapitalize: none !important;
    -webkit-autocapitalize: none !important;
    autocomplete: off !important;
}
</style>
<script>
function applyNoSpellcheck() {
    const doc = window.parent ? window.parent.document : document;
    const elements = doc.querySelectorAll('textarea, input, [data-baseweb="textarea"] textarea, [data-baseweb="input"] input, .stTextArea textarea, .stTextInput input');
    elements.forEach(el => {
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('autocomplete', 'off');
    });
}
setInterval(applyNoSpellcheck, 300);
</script>
""", unsafe_allow_html=True)

# Initialize Database
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

def is_devanagari(text):
    return bool(re.search(r'[\u0900-\u097F]', text))

def query_local_completion(prompt_text, mood, artist, candidate_num):
    try:
        model, tokenizer, device = load_local_model_and_tokenizer()
        
        # Format the prompt to match the custom tokens structure the model was trained on
        artist_str = artist if artist else "Unknown"
        mood_str = mood if mood and mood != "Any" else "Unknown"
        
        if is_devanagari(prompt_text):
            formatted_prompt = (
                f"<|title|>Unknown"
                f"<|artist|>{artist_str}"
                f"<|emotions|>{mood_str}"
                f"<|lyrics_devanagari|>\n{prompt_text}"
            )
        else:
            formatted_prompt = (
                f"<|title|>Unknown"
                f"<|artist|>{artist_str}"
                f"<|emotions|>{mood_str}"
                f"<|lyrics_devanagari|>\n"
                f"<|lyrics_romanized|>\n{prompt_text}"
            )
            
        inputs = tokenizer(formatted_prompt, return_tensors="pt").to(device)
        
        # Temperature variety across candidates
        temp = 0.6 + (candidate_num * 0.1)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=150,
                temperature=temp,
                do_sample=True,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id
            )
            
        completion = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract just the continuation by removing the formatted prompt prefix
        if completion.startswith(formatted_prompt):
            continuation = completion[len(formatted_prompt):]
        else:
            continuation = completion
            
        # Truncate at any special training layout tags to avoid leaking formatting/cross-script translations
        for tag in ["<|lyrics_romanized|>", "<|end|>", "<|title|>", "<|artist|>", "<|emotions|>", "<|lyrics_devanagari|>"]:
            if tag in continuation:
                continuation = continuation.split(tag)[0]
                
        return continuation.strip()
    except Exception as e:
        return f"Error using local fine-tuned Qwen model: {e}"

@st.cache_resource
def load_local_model_and_tokenizer():
    if not HAS_TORCH:
        raise RuntimeError("PyTorch is not installed in this environment. Please select DeepSeek Agentic Pattern Search.")

    tokenizer = AutoTokenizer.from_pretrained(LOCAL_MODEL_ID)
    
    if torch.backends.mps.is_available():
        device = "mps"
        torch_dtype = torch.bfloat16
    elif torch.cuda.is_available():
        device = "cuda"
        torch_dtype = torch.float16
    else:
        device = "cpu"
        torch_dtype = torch.float32
        
    base_model = AutoModelForCausalLM.from_pretrained(
        LOCAL_MODEL_ID,
        torch_dtype=torch_dtype,
        device_map="auto" if device == "cuda" else None
    )
    
    if os.path.exists(LOCAL_ADAPTER_DIR):
        model = PeftModel.from_pretrained(base_model, LOCAL_ADAPTER_DIR)
    else:
        model = base_model
        
    if device != "cuda":
        model = model.to(device)
        
    model.eval()
    return model, tokenizer, device

def query_ollama_completion(prompt_text, mood, artist, candidate_num):
    """
    Simulates the fine-tuned autocomplete generator using the local Ollama model.
    """
    system_prompt = (
        "You are a Nepali song generator. Generate a creative lyric completion based on the inputs.\n"
        "Generate ONLY the lyrics completion (1-2 stanzas). Do not include explanations, titles, or tags.\n"
        f"Ensure variety: this is option #{candidate_num} of the completion."
    )
    
    user_prompt = (
        f"Start of Lyrics: {prompt_text}\n"
        f"Mood/Vibe: {mood}\n"
        f"Artist Style: {artist}\n"
        "Complete the lyrics:"
    )
    
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "stream": False,
            "options": {
                "temperature": 0.7 + (candidate_num * 0.1) # Add randomness across candidates
            }
        }, timeout=45)
        
        if response.status_code == 200:
            return response.json().get('response', '').strip()
    except Exception as e:
        return f"Error connecting to model: {e}"
    return "Generation failed."

# Header
st.title("🎵 Nepali Lyrics Autocomplete & Suggestion Playground")
st.markdown(
    "Test real-time lyrics autocomplete, evaluate candidate completions, "
    "and log feedback to continuously train and optimize our fine-tuned Qwen model."
)

# Sidebar - Settings
st.sidebar.header("⚙️ Configuration")

model_source = st.sidebar.radio(
    "Select Model Source",
    [
        "🤖 DeepSeek Agentic Pattern Search (Recommended)",
        "Local Fine-tuned Qwen-1.5B",
        "Ollama API (Fallback)"
    ]
)

num_lines_target = st.sidebar.slider("Target Next Lines to Complete", min_value=1, max_value=6, value=4)

if model_source == "🤖 DeepSeek Agentic Pattern Search (Recommended)":
    st.sidebar.success("Loaded DeepSeek Agent + Pattern Search Engine over 1,899+ Parquet songs")
    deepseek_key_input = st.sidebar.text_input(
        "🔑 DeepSeek API Key",
        value=os.getenv("DEEPSEEK_API_KEY", ""),
        type="password",
        help="Paste your DeepSeek API key (sk-...) or set DEEPSEEK_API_KEY in .env"
    )
    if deepseek_key_input:
        os.environ["DEEPSEEK_API_KEY"] = deepseek_key_input

    conn_check = DeepSeekAgent().verify_connection()
    if conn_check["connected"]:
        st.sidebar.success(conn_check["message"])
    else:
        st.sidebar.warning(conn_check["message"])
elif model_source == "Local Fine-tuned Qwen-1.5B":
    if os.path.exists(LOCAL_ADAPTER_DIR):
        st.sidebar.success(f"Loaded LoRA Adapter: **{LOCAL_ADAPTER_DIR}**")
    else:
        st.sidebar.warning(f"Adapter not found. Using base model: **{LOCAL_MODEL_ID}**")
else:
    st.sidebar.info(f"Connected to Ollama Model: **{MODEL}**")

moods = ["Romantic", "Sad", "Happy", "Folk", "Patriotic", "Devotional", "Pop", "Hip-hop/Rap", "Rock", "Any"]
selected_mood = st.sidebar.selectbox("Mood/Vibe", moods)
artist_style = st.sidebar.text_input("Artist Style (Optional)", placeholder="e.g., Sushant KC, Narayan Gopal")

# Session state initialization
if 'candidates' not in st.session_state:
    st.session_state.candidates = ["", "", ""]
if 'ratings' not in st.session_state:
    st.session_state.ratings = [0, 0, 0]
if 'chosen' not in st.session_state:
    st.session_state.chosen = -1
if 'prompt_submitted' not in st.session_state:
    st.session_state.prompt_submitted = ""

# Define the tabs
tab_playground, tab_academy = st.tabs(["🎵 Autocomplete Playground", "🎓 Fine-Tuning Academy"])

with tab_playground:
    # Completion Mode Selection
    col_mode1, col_mode2 = st.columns([2, 1])
    with col_mode1:
        completion_mode = st.radio(
            "Select Autocomplete Mode:",
            ["⚡ Pure Autocomplete (Keep typed initial text exact)", "✨ Refine & Autocomplete (Format & polish initial text)"],
            horizontal=True
        )
    refine_mode = "Refine" in completion_mode

    # Main input text
    prompt_input = st.text_area(
        "Enter a prompt or the beginning lines of the song (supports Devanagari or Romanized):",
        placeholder="e.g., kasari timilai ma batau, timi hau mero sansaar. timi bahek sochdina kehi, timi nai mero sanssar.",
        height=110,
        key="prompt_input_key"
    )

    col_gen, col_refine, col_clear = st.columns([2, 2, 6])
    with col_gen:
        if st.button("🚀 Autocomplete", type="primary"):
            if not prompt_input.strip():
                st.error("Please enter a lyric prompt first!")
            else:
                with st.spinner("Analyzing pattern search & generating completions..."):
                    if model_source == "🤖 DeepSeek Agentic Pattern Search (Recommended)":
                        agent = DeepSeekAgent()
                        res = agent.generate_completion(
                            current_lines=prompt_input,
                            num_lines_to_generate=num_lines_target,
                            artist_hint=artist_style,
                            mood_hint=selected_mood,
                            refine_mode=refine_mode
                        )
                        c1 = res['full_lyrics']
                        c2_gen = agent._generate_pattern_driven_fallback(prompt_input, agent.pattern_engine.extract_patterns(prompt_input, num_lines_target), num_lines_target)
                        c2 = f"{prompt_input.strip()}\n{c2_gen}"
                        c3_rhyme = res['pattern_metrics'].get('rhyme_samples', ['-'])[0] if res['pattern_metrics'].get('rhyme_samples') else ''
                        c3 = f"{res['full_lyrics']}\n(Pattern Rhyme Match: '{c3_rhyme}')"
                        
                        st.session_state.agent_reasoning = res['reasoning_steps']
                        st.session_state.pattern_metrics = res['pattern_metrics']
                    else:
                        if model_source == "Local Fine-tuned Qwen-1.5B":
                            query_func = query_local_completion
                        else:
                            query_func = query_ollama_completion
                            
                        gen1 = query_func(prompt_input, selected_mood, artist_style, 1)
                        gen2 = query_func(prompt_input, selected_mood, artist_style, 2)
                        gen3 = query_func(prompt_input, selected_mood, artist_style, 3)
                        c1 = f"{prompt_input.strip()}\n{gen1}"
                        c2 = f"{prompt_input.strip()}\n{gen2}"
                        c3 = f"{prompt_input.strip()}\n{gen3}"
                        st.session_state.agent_reasoning = None
                        st.session_state.pattern_metrics = None

                    st.session_state.candidates = [c1, c2, c3]
                    st.session_state.ratings = [0, 0, 0]
                    st.session_state.chosen = -1
                    st.session_state.prompt_submitted = prompt_input
                    st.rerun()

    with col_refine:
        if st.button("✨ Refine Input Text Only"):
            if not prompt_input.strip():
                st.error("Please enter text to refine!")
            else:
                with st.spinner("Refining prompt text..."):
                    agent = DeepSeekAgent()
                    refined_text = agent.refine_input_lyrics(prompt_input)
                    st.info(f"**Refined Lyric Lines:**\n```\n{refined_text}\n```")

    with col_clear:
        if st.button("Reset"):
            st.session_state.candidates = ["", "", ""]
            st.session_state.ratings = [0, 0, 0]
            st.session_state.chosen = -1
            st.session_state.prompt_submitted = ""
            st.rerun()

    # Display generated candidates side-by-side
    if st.session_state.prompt_submitted:
        st.markdown("---")
        
        if getattr(st.session_state, 'agent_reasoning', None):
            with st.expander("🤖 DeepSeek Agent Reasoning Scratchpad & Pattern Search Metrics", expanded=True):
                st.markdown("#### Agent Reasoning Steps")
                for step in st.session_state.agent_reasoning:
                    st.write(f"- {step}")
                
                if getattr(st.session_state, 'pattern_metrics', None):
                    st.markdown("#### Retrieved Corpus Patterns")
                    pm = st.session_state.pattern_metrics
                    c_m1, c_m2, c_m3 = st.columns(3)
                    c_m1.metric("Script", pm.get("script", "").upper())
                    c_m2.metric("Target Lines", pm.get("target_num_lines", 4))
                    c_m3.metric("Avg Words/Line", pm.get("avg_words_per_line", 0))

        st.subheader("💡 Candidate Autocompletions")
        st.info("Review the options. You can rate each one, edit your favorite, and save it to our feedback loop database.")
        
        cols = st.columns(3)
        
        for idx, col in enumerate(cols):
            candidate_num = idx + 1
            with col:
                st.markdown(f"### Option #{candidate_num}")
                
                # Editable area for the candidate
                edited_text = st.text_area(
                    f"Edit Option #{candidate_num} if needed:",
                    value=st.session_state.candidates[idx],
                    height=250,
                    key=f"text_c{candidate_num}"
                )
                
                # Rating buttons
                r_col1, r_col2 = st.columns(2)
                with r_col1:
                    # Thumbs up button
                    if st.button(f"👍 Good #{candidate_num}", key=f"up_{candidate_num}"):
                        st.session_state.ratings[idx] = 1
                        st.success("Rated Good!")
                with r_col2:
                    # Thumbs down button
                    if st.button(f"👎 Bad #{candidate_num}", key=f"down_{candidate_num}"):
                        st.session_state.ratings[idx] = -1
                        st.warning("Rated Bad!")
                        
                # Choose as best
                if st.button(f"🎯 Select Option #{candidate_num} as Best", key=f"best_{candidate_num}", use_container_width=True):
                    st.session_state.chosen = idx
                    st.session_state.candidates[idx] = edited_text  # Update candidate text with edits
                    st.success(f"Selected Option #{candidate_num} as the best continuation!")
                    
        st.markdown("---")
        
        # Save action
        save_col, stat_col = st.columns([1, 4])
        with save_col:
            if st.button("💾 Save to Feedback Database", type="primary", use_container_width=True):
                # Save to SQLite
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
                        st.session_state.prompt_submitted,
                        selected_mood,
                        artist_style,
                        MODEL,
                        st.session_state.candidates[0],
                        st.session_state.candidates[1],
                        st.session_state.candidates[2],
                        st.session_state.chosen + 1 if st.session_state.chosen >= 0 else -1,
                        st.session_state.candidates[st.session_state.chosen] if st.session_state.chosen >= 0 else "",
                        st.session_state.ratings[0],
                        st.session_state.ratings[1],
                        st.session_state.ratings[2]
                    ))
                    conn.commit()
                    conn.close()
                    st.success("🎉 Successfully saved feedback! Thank you.")
                except Exception as e:
                    st.error(f"Failed to write to database: {e}")
                    
        with stat_col:
            # Show database statistics
            try:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("SELECT COUNT(*) FROM feedback")
                total_feedback = c.fetchone()[0]
                c.execute("SELECT COUNT(*) FROM feedback WHERE chosen_index != -1")
                selections = c.fetchone()[0]
                conn.close()
                st.write(f"📊 Feedback Database Stats: **{total_feedback}** entries logged | **{selections}** user selections saved.")
            except Exception:
                pass

with tab_academy:
    st.header("🎓 LLM Fine-Tuning & LoRA Academy")
    st.markdown(
        "Learn the technical fundamentals of how we are training, adapting, and optimizing "
        "our Nepali Lyricist model right here with live simulators, calculators, and experiment logs."
    )
    
    # ------------------ SECTION 1: LORA CALCULATOR ------------------
    st.markdown("---")
    st.subheader("1. LoRA Parameter & Memory Calculator")
    st.markdown(
        "Full fine-tuning updates every single weight in a model, which requires massive VRAM and compute. "
        "**LoRA (Low-Rank Adaptation)** freezes the original weights and inserts small, trainable adapter matrices ($A$ and $B$) next to them. "
        "Use this interactive calculator to see how much we reduce the trainable parameters."
    )
    
    col_prof, col_mods, col_rank = st.columns(3)
    with col_prof:
        model_profile = st.selectbox(
            "Model Architecture Profile",
            ["Qwen-2.5-1.5B (Active Model)", "Llama-3-8B", "Custom (Generic 2B)"]
        )
    with col_mods:
        target_layers = st.multiselect(
            "LoRA Target Modules",
            ["Attention (Q, K, V, O Projections)", "MLP (Gate, Up, Down Projections)"],
            default=["Attention (Q, K, V, O Projections)", "MLP (Gate, Up, Down Projections)"]
        )
    with col_rank:
        lora_rank = st.slider("LoRA Rank ($r$)", min_value=1, max_value=128, value=8, help="Width of the rank bottleneck. Lower is faster/saves memory; higher learns more complex representations.")

    # Calculate parameters
    if model_profile == "Qwen-2.5-1.5B (Active Model)":
        d = 1536
        ff = 8960
        num_layers = 28
    elif model_profile == "Llama-3-8B":
        d = 4096
        ff = 14336
        num_layers = 32
    else:
        d = 2048
        ff = 8192
        num_layers = 24

    attn_proj_params = d * d * 4 * num_layers
    mlp_proj_params = (d * ff * 2 + ff * d) * num_layers
    total_base_params = attn_proj_params + mlp_proj_params

    trained_attn_params = 0
    trained_mlp_params = 0

    if "Attention (Q, K, V, O Projections)" in target_layers:
        trained_attn_params = (d * lora_rank + lora_rank * d) * 4 * num_layers
    if "MLP (Gate, Up, Down Projections)" in target_layers:
        trained_mlp_params = ((d * lora_rank + lora_rank * ff) + (d * lora_rank + lora_rank * ff) + (ff * lora_rank + lora_rank * d)) * num_layers

    total_lora_params = trained_attn_params + trained_mlp_params
    savings = (1 - total_lora_params / total_base_params) * 100 if total_base_params > 0 else 0

    # Display stats
    stat_col1, stat_col2, stat_col3 = st.columns(3)
    with stat_col1:
        st.metric("Total Model Parameters (Base)", f"{total_base_params:,}")
    with stat_col2:
        st.metric("Trainable Parameters (LoRA)", f"{total_lora_params:,}")
    with stat_col3:
        st.metric("Parameter Reduction", f"{savings:.3f}%", delta=f"-{savings:.3f}%")

    st.info(
        f"💡 **LoRA Formula**: Weight updates are decomposed as $\\Delta W = B \\times A$. "
        f"By using rank **{lora_rank}**, instead of learning a matrix of size ${d} \\times {d}$ ({d*d:,} params), "
        f"we learn two smaller matrices of size ${d} \\times {lora_rank}$ and ${lora_rank} \\times {d}$ ({2*d*lora_rank:,} params). "
        f"This makes it highly practical to train models locally on Apple Silicon (MPS)."
    )

    # ------------------ SECTION 2: PREFIX MASKING SIMULATOR ------------------
    st.markdown("---")
    st.subheader("2. Prefix Masking (Completion-Only Loss) Simulator")
    st.markdown(
        "Standard language models calculate loss (gradient updates) on every single token. "
        "However, for fine-tuning, we only want the model to learn the lyrics completion, not the structured prompt tags! "
        "**Prefix Masking** targets prompt tags with a label of `-100` so PyTorch cross-entropy ignores them."
    )

    sample_prompt = st.text_input(
        "Simulate token sequence:",
        value="<|title|>Chiso Hawa<|artist|>Sushant KC<|emotions|>Romantic<|lyrics_devanagari|> chiso chiso hawa ma..."
    )
    
    st.write("How labels are processed in PyTorch:")
    
    # Tokenize simulator
    tokens = sample_prompt.split()
    masked_labels = []
    in_lyrics = False
    
    for t in tokens:
        if in_lyrics:
            masked_labels.append((t, "Active Loss (Gradients computed!)", "#4CAF50", "#E8F5E9"))
        else:
            masked_labels.append((t, "Masked (-100 label, Ignored)", "#9E9E9E", "#F5F5F5"))
        if "<|lyrics_devanagari|>" in t or "<|lyrics_romanized|>" in t:
            in_lyrics = True
            
    # Draw custom badges for tokens
    badge_html = "<div style='display: flex; flex-wrap: wrap; gap: 8px; font-family: monospace; font-size: 14px;'>"
    for val, label, text_color, bg_color in masked_labels:
        badge_html += f"<div style='border: 1px solid {text_color}; background-color: {bg_color}; color: {text_color}; padding: 6px 12px; border-radius: 4px; text-align: center;' title='{label}'><b>{val}</b><br><span style='font-size: 10px;'>{label.split()[0]}</span></div>"
    badge_html += "</div>"
    st.markdown(badge_html, unsafe_allow_html=True)
    
    st.write("")
    st.markdown(
        "🟢 **Active (Loss Computed)**: Weights adjust to make these words match the style.  \n"
        "⚪ **Masked (Ignored)**: Model is shown these context cues, but is not penalized or rewarded for matching them. "
        "This prevents formatting leakage and makes training much more targeted."
    )

    # ------------------ SECTION 3: HYPERPARAMETER CHEAT SHEET ------------------
    st.markdown("---")
    st.subheader("3. Fine-Tuning Hyperparameters Cheat Sheet")
    
    hp_col1, hp_col2 = st.columns(2)
    with hp_col1:
        st.markdown("""
        ### 📈 Learning Rate (LR)
        - **Too High (e.g. 1e-3)**: Model weights change too fast; training becomes unstable or output degenerates into gibberish.
        - **Too Low (e.g. 1e-5)**: Model learns extremely slowly; adapter weights might remain identical to the base model.
        - **Our Sweet Spot**: `2e-4` (0.0002) is a standard starting rate for LoRA adapters.
        
        ### ⚡ LoRA Rank ($r$) & Alpha ($\\alpha$)
        - **Rank**: Determines size of low-rank matrices. Standard is `8` or `16`. Bigger rank allows more complex learning but takes more VRAM.
        - **Alpha**: Controls scaling strength. Output is multiplied by $\\alpha / r$. Standard rule is $\\alpha = 2 \\times r$.
        """)
    with hp_col2:
        st.markdown("""
        ### 🔄 Epochs & Batch Size
        - **Epochs**: Number of full passes through the training data. For lyrics, `3` to `5` epochs is typical. Too many epochs leads to overfitting (repeating exact song lines).
        - **Batch Size**: Number of sequences loaded into VRAM at once. Lower values (like `1` or `2`) prevent Out-Of-Memory errors on local machines.
        
        ### 🎯 Completion-Only vs. Standard Loss
        - **Standard**: Updates gradients on prompts + completions.
        - **Completion-Only**: Focuses updates 100% on the lyrics. Highly recommended for structured prompts to prevent formatting leakage.
        """)

    # ------------------ SECTION 4: AUTORESEARCH LEADERBOARD ------------------
    st.markdown("---")
    st.subheader("📊 Live AutoResearch Trials Leaderboard")
    
    trials_csv = "logs/autoresearch_trials.csv"
    if os.path.exists(trials_csv):
        try:
            import pandas as pd
            df = pd.read_csv(trials_csv)
            # Clean up empty rows if any
            df = df.dropna(subset=['trial_id'])
            
            if len(df) > 0:
                # Format numeric columns for presentation
                df['overall_score'] = df['overall_score'].round(2)
                
                # Show leaderboard sorting by score descending
                leaderboard_df = df.sort_values(by="overall_score", ascending=False)
                
                st.write("We run an automatic grid search across multiple hyperparameters. The local LLM judge evaluates completion samples out of 10. Here are the active logs:")
                
                st.dataframe(
                    leaderboard_df[[
                        'trial_id', 'learning_rate', 'lora_r', 'lora_alpha', 
                        'completion_only', 'overall_score', 'avg_grammar', 
                        'avg_flow', 'avg_consistency'
                    ]],
                    use_container_width=True
                )
                
                # Simple bar chart comparing trial scores
                st.bar_chart(
                    data=df,
                    x="trial_id",
                    y="overall_score"
                )
                
                # Show best parameters
                best_row = leaderboard_df.iloc[0]
                st.success(
                    f"🏆 **Best Performing Configuration**: Trial {int(best_row['trial_id'])} "
                    f"(Rank={int(best_row['lora_r'])}, Alpha={int(best_row['lora_alpha'])}, "
                    f"Completion-Only={best_row['completion_only']}) with an overall score of **{best_row['overall_score']}/10.0**"
                )
            else:
                st.info("No AutoResearch trials recorded yet in the log file.")
        except Exception as e:
            st.error(f"Could not load trials leaderboard: {e}")
    else:
        st.info("Leaderboard is waiting for `logs/autoresearch_trials.csv` to be populated.")

