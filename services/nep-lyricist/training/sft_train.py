import os
import torch
from dotenv import load_dotenv
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType

# Load environment variables
load_dotenv()

def train_model(
    model_id="Qwen/Qwen2.5-1.5B-Instruct",
    dataset_id="sanbhu/nepali-lyrics-v1",
    output_dir="models/qwen-1.5b-nepali-lyrics",
    epochs=3,
    batch_size=4,
    learning_rate=2e-4,
    max_seq_length=512,
    push_to_hub=False,
    resume=False,
    lora_r=8,
    lora_alpha=16,
    completion_only=False,
    max_steps=-1
):
    print(f"Loading tokenizer and model: {model_id}...")
    
    # Load dataset
    hf_token = os.getenv("HF_TOKEN")
    try:
        if os.path.exists("data/training_export/dataset.parquet"):
            print("Loading dataset from local cache...")
            # We can load the local parquet file directly
            dataset = load_dataset("parquet", data_files={"train": "data/training_export/dataset.parquet"})
            # Split train and validation
            dataset = dataset["train"].train_test_split(test_size=0.1, seed=42)
            if "test" in dataset:
                dataset["validation"] = dataset.pop("test")
        else:
            print(f"Loading dataset from HF Hub: {dataset_id}...")
            dataset = load_dataset(dataset_id, token=hf_token)
    except Exception as e:
        print(f"❌ Failed to load dataset: {e}")
        print("Please run factory/export_dataset.py first or set up your HF_TOKEN.")
        return

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
    
    # Gemma tokenizer doesn't have pad_token, set it to eos_token or add it
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        
    print("Preprocessing data...")
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=max_seq_length,
            padding=False
        )
        
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset["train"].column_names
    )

    # Determine device: CUDA -> MPS (Apple Silicon) -> CPU
    if torch.cuda.is_available():
        device_map = "auto"
        torch_dtype = torch.float16
        print("Using CUDA device.")
    elif torch.backends.mps.is_available():
        # Note: PEFT and full transformers have some known compatibility issues with device_map="auto" on MPS.
        # We manually map to CPU/MPS.
        device_map = "cpu"  # Keep CPU for initial weights, will move to mps during training
        torch_dtype = torch.bfloat16  # MPS natively supports bfloat16 on Apple Silicon (M1/M2/M3)
        print("Using Apple Silicon MPS device. (BFLOAT16 precision)")
    else:
        device_map = "cpu"
        torch_dtype = torch.float32
        print("Using CPU device.")

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
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    )
    
    print("Wrapping model with LoRA...")
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # Move model to MPS if running on Mac
    if torch.backends.mps.is_available() and device_map == "cpu":
        model = model.to("mps")
        print("Moved model to MPS.")

    # Configure training arguments
    eval_strategy = "no" if max_steps > 0 else "epoch"
    save_strategy = "no" if max_steps > 0 else "epoch"
    
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        max_steps=max_steps,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        eval_strategy=eval_strategy,
        save_strategy=save_strategy,
        logging_steps=10,
        fp16=torch.cuda.is_available(),  # Enable FP16 only if CUDA is available
        push_to_hub=push_to_hub,
        hub_model_id=f"{dataset_id.split('/')[0]}/qwen-1.5b-nepali-lyrics" if '/' in dataset_id else None,
        hub_token=hf_token,
        report_to="none" # Disable logging to Wandb/MLflow unless configured
    )

    # Trainer instantiation
    if completion_only:
        class CompletionOnlyDataCollator:
            def __init__(self, tokenizer, template="<|lyrics_devanagari|>"):
                self.tokenizer = tokenizer
                self.template_ids = tokenizer.encode(template, add_special_tokens=False)

            def __call__(self, features):
                collator = DataCollatorForLanguageModeling(self.tokenizer, mlm=False)
                batch = collator(features)
                labels = batch["labels"]
                input_ids = batch["input_ids"]
                
                for i in range(len(features)):
                    seq = input_ids[i].tolist()
                    temp_len = len(self.template_ids)
                    idx = -1
                    for j in range(len(seq) - temp_len + 1):
                        if seq[j : j + temp_len] == self.template_ids:
                            idx = j
                            break
                    if idx != -1:
                        # Mask all tokens before and including the template
                        mask_until = idx + temp_len
                        labels[i, :mask_until] = -100
                return batch

        data_collator = CompletionOnlyDataCollator(tokenizer)
        print("Using custom Completion-Only prefix-masked Data Collator.")
    else:
        data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)
        print("Using Standard Causal LM Data Collator.")

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"],
        data_collator=data_collator
    )

    print("\n--- Starting Training ---")
    trainer.train(resume_from_checkpoint=resume)
    
    print("\n--- Saving Fine-tuned Adapter ---")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Adapter model saved to {output_dir}")
    
    if push_to_hub:
        print("Pushing model to Hugging Face Hub...")
        trainer.push_to_hub()
        print("🎉 Push complete!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fine-tune Gemma-2B on Nepali Lyrics.")
    parser.add_argument("--model_id", default="Qwen/Qwen2.5-1.5B-Instruct", help="Pretrained model ID")
    parser.add_argument("--dataset_id", default="sanbhu/nepali-lyrics-v1", help="Dataset repo on HF")
    parser.add_argument("--output_dir", default="models/qwen-1.5b-nepali-lyrics", help="Output dir for weights")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=1, help="Batch size (low default for local Mac testing)")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--push", action="store_true", help="Push final weights to HF Hub")
    parser.add_argument("--resume", action="store_true", help="Resume training from the latest checkpoint")
    parser.add_argument("--lora_r", type=int, default=8, help="LoRA rank parameter")
    parser.add_argument("--lora_alpha", type=int, default=16, help="LoRA alpha parameter")
    parser.add_argument("--completion_only", action="store_true", help="Use completion-only prefix-masked loss")
    parser.add_argument("--max_steps", type=int, default=-1, help="Maximum number of training steps")
    
    args = parser.parse_args()
    train_model(
        model_id=args.model_id,
        dataset_id=args.dataset_id,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        push_to_hub=args.push,
        resume=args.resume,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        completion_only=args.completion_only,
        max_steps=args.max_steps
    )
