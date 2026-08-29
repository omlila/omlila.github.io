import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType

def train_model(
    model_id="Qwen/Qwen2.5-1.5B-Instruct",
    dataset_id="sanbhu/nepali-lyrics-v1",
    output_dir="qwen-1.5b-nepali-lyrics-adapter",
    epochs=3,
    batch_size=4,
    learning_rate=2e-4,
    max_seq_length=1024,
    push_to_hub=True
):
    print(f"🚀 Starting AutoTrain SpaceRunner job...")
    print(f"Base Model: {model_id}")
    print(f"Dataset ID: {dataset_id}")
    
    # HF_TOKEN is injected automatically by spacerunner
    hf_token = os.getenv("HF_TOKEN")
    
    print(f"Loading dataset from HF Hub: {dataset_id}...")
    try:
        dataset = load_dataset(dataset_id, token=hf_token)
    except Exception as e:
        print(f"❌ Failed to load dataset: {e}")
        return

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
    
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        
    print("Preprocessing data...")
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=max_seq_length,
            padding="max_length"
        )
        
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset["train"].column_names
    )

    # Determine device (always CUDA on cloud GPU space)
    device_map = "auto"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    print(f"Using device_map: {device_map}, dtype: {torch_dtype}")

    # Load base model
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        device_map=device_map,
        token=hf_token
    )

    # Setup PEFT/LoRA configuration
    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    )
    
    print("Wrapping model with LoRA...")
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # Configure training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_steps=10,
        fp16=torch.cuda.is_available(),
        push_to_hub=push_to_hub,
        hub_model_id=f"sanbhu/qwen-1.5b-nepali-lyrics",
        hub_token=hf_token,
        report_to="none"
    )

    # Trainer instantiation
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"],
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False)
    )

    print("\n--- Starting Training ---")
    trainer.train()
    
    print("\n--- Saving Fine-tuned Adapter ---")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Adapter model saved locally.")
    
    if push_to_hub:
        print("Pushing model to Hugging Face Hub (sanbhu/qwen-1.5b-nepali-lyrics)...")
        trainer.push_to_hub()
        print("🎉 Push complete! Model is now available on HF Hub.")

if __name__ == "__main__":
    # Runs automatically with default parameters when spacerunner triggers python script.py
    train_model()
