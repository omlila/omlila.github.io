import os
import torch
import re
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

def is_devanagari(text):
    return bool(re.search(r'[\u0900-\u097F]', text))

def test_inference(prompt_text, mood="Romantic", artist="Unknown"):
    model_id = "Qwen/Qwen2.5-1.5B-Instruct"
    adapter_dir = "models/qwen-1.5b-nepali-lyrics"
    
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    torch_dtype = torch.bfloat16 if device == "mps" else torch.float32
    
    print(f"Loading base model {model_id}...")
    base_model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        device_map=None
    )
    
    print(f"Applying adapter from {adapter_dir}...")
    model = PeftModel.from_pretrained(base_model, adapter_dir)
    model = model.to(device)
    model.eval()
    
    # Format 1: Current incorrect prompt format
    # "prompt [Mood: mood]"
    print("\n--- Testing Format 1 (Original/Incorrect) ---")
    f1_prompt = f"{prompt_text} [Mood: {mood}]"
    inputs = tokenizer(f1_prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=100, temperature=0.7, do_sample=True, pad_token_id=tokenizer.eos_token_id)
    print(tokenizer.decode(outputs[0], skip_special_tokens=True))
    
    # Format 2: Training format matching Devanagari/Romanized split
    print("\n--- Testing Format 2 (Dataset Format Match) ---")
    artist_str = artist if artist else "Unknown"
    mood_str = mood if mood else "Unknown"
    
    if is_devanagari(prompt_text):
        f2_prompt = (
            f"<|title|>Unknown"
            f"<|artist|>{artist_str}"
            f"<|emotions|>{mood_str}"
            f"<|lyrics_devanagari|>\n{prompt_text}"
        )
    else:
        f2_prompt = (
            f"<|title|>Unknown"
            f"<|artist|>{artist_str}"
            f"<|emotions|>{mood_str}"
            f"<|lyrics_devanagari|>\n"
            f"<|lyrics_romanized|>\n{prompt_text}"
        )
        
    print(f"Constructed Prompt:\n{f2_prompt}")
    inputs = tokenizer(f2_prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=100, temperature=0.7, do_sample=True, pad_token_id=tokenizer.eos_token_id)
        
    completion = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print("\nFull Decode Output:")
    print(completion)
    
    # Extract just the continuation
    print("\nCleaned Continuation:")
    if completion.startswith(f2_prompt):
        continuation = completion[len(f2_prompt):]
    else:
        continuation = completion
        
    # Split at tags
    for tag in ["<|lyrics_romanized|>", "<|end|>", "<|title|>", "<|artist|>", "<|emotions|>", "<|lyrics_devanagari|>"]:
        if tag in continuation:
            continuation = continuation.split(tag)[0]
    print(continuation.strip())

if __name__ == "__main__":
    prompt = "परेलीमा लुकाई राख न\nअँगालोमा बाँधी राख\nपरेलीमा लुकाई राख न\nअँगालोमा बाँधी राख\nजान नदेउ रोक न रोक"
    test_inference(prompt)
