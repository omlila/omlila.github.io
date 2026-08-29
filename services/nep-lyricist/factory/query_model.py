import os
import torch
import argparse
import re
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# --- Module-level singleton cache ---
# Model is loaded once on first request and reused for all subsequent requests
_model = None
_tokenizer = None
_device = None


def _load_model(
    model_id="Qwen/Qwen2.5-1.5B-Instruct",
    adapter_dir="models/qwen-1.5b-nepali-lyrics",
):
    """Load model and tokenizer once at startup, cache globally."""
    global _model, _tokenizer, _device

    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer, _device

    print("Loading tokenizer and base model...")
    _tokenizer = AutoTokenizer.from_pretrained(model_id)

    if torch.backends.mps.is_available():
        _device = "mps"
        torch_dtype = torch.bfloat16
        print("Using Apple Silicon MPS device (BFLOAT16 precision).")
    elif torch.cuda.is_available():
        _device = "cuda"
        torch_dtype = torch.float16
        print("Using CUDA device.")
    else:
        _device = "cpu"
        torch_dtype = torch.float32
        print("Using CPU device.")

    base_model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        device_map="auto" if _device == "cuda" else None
    )

    if os.path.exists(adapter_dir):
        print(f"Applying fine-tuned LoRA adapter from: {adapter_dir}")
        _model = PeftModel.from_pretrained(base_model, adapter_dir)
    else:
        print(f"⚠️ Adapter directory '{adapter_dir}' not found. Using base model.")
        _model = base_model

    if _device != "cuda":
        _model = _model.to(_device)

    _model.eval()
    print("✅ Model loaded and cached — will reuse for all future requests.")
    return _model, _tokenizer, _device


def generate_lyric_completion(
    prompt_text,
    mood="Romantic",
    artist="",
    model_id="Qwen/Qwen2.5-1.5B-Instruct",
    adapter_dir="models/qwen-1.5b-nepali-lyrics",
    max_new_tokens=150,
    temperature=0.7
):
    model, tokenizer, device = _load_model(model_id, adapter_dir)

    # Detect Devanagari script
    is_devanagari_prompt = bool(re.search(r'[\u0900-\u097F]', prompt_text))

    artist_str = artist if artist else "Unknown"
    mood_str = mood if mood else "Unknown"

    if is_devanagari_prompt:
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

    print(f"\nConstructed Prompt:\n{formatted_prompt}")
    print("\nGenerating completions...\n")

    inputs = tokenizer(formatted_prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id
        )

    completion = tokenizer.decode(outputs[0], skip_special_tokens=True)

    if completion.startswith(formatted_prompt):
        continuation = completion[len(formatted_prompt):]
    else:
        continuation = completion

    for tag in ["<|lyrics_romanized|>", "<|end|>", "<|title|>", "<|artist|>", "<|emotions|>", "<|lyrics_devanagari|>"]:
        if tag in continuation:
            continuation = continuation.split(tag)[0]

    print("=" * 50)
    print("✨ GENERATED COMPLETION:")
    print("=" * 50)
    print(continuation.strip())
    print("=" * 50)

    return continuation.strip()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Query fine-tuned Qwen model for Nepali lyrics completions.")
    parser.add_argument("--prompt", type=str, required=True, help="Beginning lyric line(s) to complete.")
    parser.add_argument("--mood", type=str, default="Romantic", help="Mood/vibe tag (e.g. Romantic, Sad, Happy).")
    parser.add_argument("--artist", type=str, default="", help="Artist style tag (e.g. Narayan Gopal).")
    parser.add_argument("--adapter", type=str, default="models/qwen-1.5b-nepali-lyrics", help="Path to local adapter weights.")
    parser.add_argument("--max_tokens", type=int, default=150, help="Max new tokens to generate.")
    parser.add_argument("--temp", type=float, default=0.7, help="Sampling temperature.")

    args = parser.parse_args()

    generate_lyric_completion(
        prompt_text=args.prompt,
        mood=args.mood,
        artist=args.artist,
        adapter_dir=args.adapter,
        max_new_tokens=args.max_tokens,
        temperature=args.temp
    )
