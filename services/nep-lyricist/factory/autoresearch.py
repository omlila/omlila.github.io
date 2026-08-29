import os
import sys
import json
import csv
import re
import shutil
import subprocess
import datetime
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# Configuration
LOCAL_MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
LOGS_DIR = "logs"
TRIALS_CSV = os.path.join(LOGS_DIR, "autoresearch_trials.csv")
BEST_MODEL_DIR = "models/qwen-1.5b-nepali-lyrics"

TEST_PROMPTS = [
    {
        "prompt": "परेलीमा लुकाई राख न\nअँगालोमा बाँधी राख\nपरेलीमा लुकाई राख न\nअँगालोमा बाँधी राख\nजान नदेउ रोक न रोक",
        "mood": "Romantic",
        "artist": "Unknown"
    },
    {
        "prompt": "Chiso chiso hawa ma\ntimro yaad aayo ma",
        "mood": "Sad",
        "artist": "Unknown"
    }
]

def is_devanagari(text):
    return bool(re.search(r'[\u0900-\u097F]', text))

def grade_completion_with_gemini(prompt_text, completion_text):
    """
    Calls the local `gemini` CLI in headless plan mode to grade the generation.
    Returns a dictionary of scores.
    """
    grading_prompt = (
        "You are an expert NLP researcher grading machine-generated Nepali lyric completions.\n"
        "Analyze the following completion and grade it out of 10 on three criteria:\n"
        "1. Grammar & Semantics (does it write meaningful Nepali sentences with correct subject-verb agreement?)\n"
        "2. Song Flow & Rhyme (does it feel like a song lyric with poetic cadence?)\n"
        "3. Script Consistency (does it stay in the correct script without mixing English or Devanagari words incorrectly?)\n\n"
        f"Prompt Input: {prompt_text}\n"
        f"Generated Completion: {completion_text}\n\n"
        "Provide your evaluation ONLY as a valid JSON object with the keys: "
        '"grammar", "flow", "consistency", "reasoning". Do not include markdown codeblocks or extra text.'
    )
    
    print(f"Calling gemini CLI to evaluate completion...")
    cmd = ["gemini", "--approval-mode", "plan", "-p", grading_prompt]
    
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        output = res.stdout
        
        # Clean output to extract JSON
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            # Validate format
            if all(k in data for k in ["grammar", "flow", "consistency"]):
                return data
        print(f"⚠️ Failed to parse JSON from gemini CLI output. Raw output was:\n{output}")
    except Exception as e:
        print(f"⚠️ Error querying gemini CLI: {e}")
        
    # Fallback default scores on error
    return {"grammar": 1, "flow": 1, "consistency": 1, "reasoning": "CLI Evaluation Failed"}

def run_trial(trial_id, lr, r, alpha, completion_only, epochs=1, max_steps=-1):
    """
    Runs sft_train.py with specific hyperparameters and returns validation scores.
    """
    trial_output_dir = f"models/trial_{trial_id}"
    print(f"\n=========================================")
    print(f"🚀 RUNNING TRIAL {trial_id} (LR={lr}, R={r}, Alpha={alpha}, Masked={completion_only})")
    print(f"=========================================")
    
    # Setup training command
    cmd = [
        sys.executable, "training/sft_train.py",
        "--output_dir", trial_output_dir,
        "--epochs", str(epochs),
        "--batch_size", "1",
        "--lr", str(lr),
        "--lora_r", str(r),
        "--lora_alpha", str(alpha)
    ]
    if completion_only:
        cmd.append("--completion_only")
    if max_steps > 0:
        cmd.extend(["--max_steps", str(max_steps)])
        
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    
    # Run training subprocess
    try:
        res = subprocess.run(cmd, env=env, check=True)
    except Exception as e:
        print(f"❌ Trial {trial_id} failed during training: {e}")
        return None
        
    # Test generation on validation prompts
    print(f"\nGenerating completions from Trial {trial_id} checkpoints...")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    torch_dtype = torch.bfloat16 if device == "mps" else torch.float32
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(LOCAL_MODEL_ID)
        base_model = AutoModelForCausalLM.from_pretrained(
            LOCAL_MODEL_ID,
            torch_dtype=torch_dtype,
            device_map=None
        )
        model = PeftModel.from_pretrained(base_model, trial_output_dir)
        model = model.to(device)
        model.eval()
    except Exception as e:
        print(f"❌ Failed to load model weights for Trial {trial_id}: {e}")
        return None
        
    total_grammar = 0
    total_flow = 0
    total_consistency = 0
    completions = []
    
    for idx, test_case in enumerate(TEST_PROMPTS):
        p_text = test_case["prompt"]
        mood = test_case["mood"]
        artist = test_case["artist"]
        
        # Build prompt template
        if is_devanagari(p_text):
            formatted_prompt = (
                f"<|title|>Unknown"
                f"<|artist|>{artist}"
                f"<|emotions|>{mood}"
                f"<|lyrics_devanagari|>\n{p_text}"
            )
        else:
            formatted_prompt = (
                f"<|title|>Unknown"
                f"<|artist|>{artist}"
                f"<|emotions|>{mood}"
                f"<|lyrics_devanagari|>\n"
                f"<|lyrics_romanized|>\n{p_text}"
            )
            
        inputs = tokenizer(formatted_prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=100,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            
        completion = tokenizer.decode(outputs[0], skip_special_tokens=True)
        if completion.startswith(formatted_prompt):
            continuation = completion[len(formatted_prompt):]
        else:
            continuation = completion
            
        # Clean continuation tags
        for tag in ["<|lyrics_romanized|>", "<|end|>", "<|title|>", "<|artist|>", "<|emotions|>", "<|lyrics_devanagari|>"]:
            if tag in continuation:
                continuation = continuation.split(tag)[0]
        continuation = continuation.strip()
        completions.append(continuation)
        
        # Call Grader
        scores = grade_completion_with_gemini(p_text, continuation)
        print(f"\nPrompt: {p_text.splitlines()[0]}...")
        print(f"Completion:\n{continuation}")
        print(f"Scores -> Grammar: {scores['grammar']}, Flow: {scores['flow']}, Consistency: {scores['consistency']}")
        print(f"Reasoning: {scores['reasoning']}\n")
        
        total_grammar += scores["grammar"]
        total_flow += scores["flow"]
        total_consistency += scores["consistency"]
        
    num_tests = len(TEST_PROMPTS)
    avg_grammar = total_grammar / num_tests
    avg_flow = total_flow / num_tests
    avg_consistency = total_consistency / num_tests
    overall_score = (avg_grammar + avg_flow + avg_consistency) / 3.0
    
    # Save trial metadata
    trial_data = {
        "trial_id": trial_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "learning_rate": lr,
        "lora_r": r,
        "lora_alpha": alpha,
        "completion_only": completion_only,
        "avg_grammar": avg_grammar,
        "avg_flow": avg_flow,
        "avg_consistency": avg_consistency,
        "overall_score": overall_score,
        "completion_1": completions[0].replace("\n", "  "),
        "completion_2": completions[1].replace("\n", "  ")
    }
    
    return trial_data

def init_csv():
    os.makedirs(LOGS_DIR, exist_ok=True)
    if not os.path.exists(TRIALS_CSV):
        with open(TRIALS_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                "trial_id", "timestamp", "learning_rate", "lora_r", "lora_alpha", 
                "completion_only", "avg_grammar", "avg_flow", "avg_consistency", 
                "overall_score", "completion_1", "completion_2"
            ])

def log_trial(data):
    with open(TRIALS_CSV, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            data["trial_id"], data["timestamp"], data["learning_rate"], data["lora_r"], data["lora_alpha"],
            data["completion_only"], data["avg_grammar"], data["avg_flow"], data["avg_consistency"],
            data["overall_score"], data["completion_1"], data["completion_2"]
        ])

def run_autoresearch(quick_test=False):
    init_csv()
    
    if quick_test:
        # Quick test grid
        grid = [
            {"lr": 2e-4, "r": 8, "alpha": 16, "completion_only": True}
        ]
        epochs = 1
        max_steps = 5
        print("⚡ Running in QUICK TEST mode (1 trial, 5 steps).")
    else:
        # Full AutoResearch grid
        grid = [
            {"lr": 2e-4, "r": 8, "alpha": 16, "completion_only": False}, # Baseline
            {"lr": 2e-4, "r": 16, "alpha": 32, "completion_only": False},
            {"lr": 2e-4, "r": 16, "alpha": 32, "completion_only": True},  # Completion only
            {"lr": 1e-4, "r": 32, "alpha": 64, "completion_only": True}
        ]
        epochs = 1  # 1 epoch keeps each loop fast (~20 min on MPS)
        max_steps = -1
        print(f"🔍 Starting AutoResearch Grid Search across {len(grid)} trials...")

    best_score = -1.0
    best_trial_data = None
    
    for idx, cfg in enumerate(grid):
        trial_id = idx + 1
        trial_data = run_trial(
            trial_id=trial_id,
            lr=cfg["lr"],
            r=cfg["r"],
            alpha=cfg["alpha"],
            completion_only=cfg["completion_only"],
            epochs=epochs,
            max_steps=max_steps
        )
        
        if trial_data:
            log_trial(trial_data)
            score = trial_data["overall_score"]
            print(f"Trial {trial_id} overall score: {score:.2f}/10.0")
            
            if score > best_score:
                best_score = score
                best_trial_data = trial_data
                
                # Copy best model to active weights folder
                trial_model_path = f"models/trial_{trial_id}"
                print(f"🌟 NEW BEST TRIAL FOUND! Copying model weights to active directory: {BEST_MODEL_DIR}")
                if os.path.exists(BEST_MODEL_DIR):
                    shutil.rmtree(BEST_MODEL_DIR)
                shutil.copytree(trial_model_path, BEST_MODEL_DIR)
                
    if best_trial_data:
        print(f"\n=========================================")
        print(f"🏆 AUTORESEARCH COMPLETE!")
        print(f"Best Trial: {best_trial_data['trial_id']} with Score {best_score:.2f}/10.0")
        print(f"Active model updated in {BEST_MODEL_DIR}")
        print(f"Full results log: {TRIALS_CSV}")
        print(f"=========================================")
    else:
        print("❌ AutoResearch finished but no trials succeeded.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Andrej Karpathy-style AutoResearch framework for sft_train.py")
    parser.add_argument("--quick_test", action="store_true", help="Run a fast 1-trial test to verify code health")
    args = parser.parse_args()
    
    run_autoresearch(quick_test=args.quick_test)
