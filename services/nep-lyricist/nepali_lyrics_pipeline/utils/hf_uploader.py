import os
from datasets import load_dataset, Dataset
from huggingface_hub import HfApi

def upload_to_hf(parquet_dir, repo_id, token=None):
    """
    Uploads all parquet files in the directory to the specified HF repository.
    """
    api = HfApi(token=token)
    
    # Create repo if it doesn't exist
    api.create_repo(repo_id=repo_id, repo_type="dataset", exist_ok=True)
    
    # Upload folder
    api.upload_folder(
        folder_path=parquet_dir,
        repo_id=repo_id,
        repo_type="dataset",
        path_in_repo="data"
    )

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Upload Parquet data to Hugging Face Hub")
    parser.add_argument("--dir", default="data/lyrics_raw", help="Directory containing parquet files")
    parser.add_argument("--repo", required=True, help="HF repository ID (e.g., username/repo)")
    parser.add_argument("--token", help="HF API Token")
    
    args = parser.parse_args()
    upload_to_hf(args.dir, args.repo, args.token)
