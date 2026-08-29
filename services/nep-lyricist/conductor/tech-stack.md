# Tech Stack: Nepali Lyrics Autocomplete

## 1. Programming Language
- **Python:** The core language for the entire project, from data collection to model training and UI deployment. It is the industry standard for Data Science and integrates flawlessly with the Hugging Face ecosystem.

## 2. Machine Learning & Training
- **Hugging Face AutoTrain:** We will use AutoTrain for fine-tuning our Causal Language Model. This managed service allows for efficient and streamlined training leveraging Hugging Face Pro's powerful GPUs without writing complex training loops from scratch.

## 3. Data Collection & Processing
- **Scrapy:** For scraping millions of Nepali lyrics, Scrapy will be used. It is a powerful, high-performance web crawling framework ideal for large-scale data extraction. 
- **Hugging Face Datasets:** The scraped and cleaned JSONL data will be stored securely in a private repository on Hugging Face using the `datasets` library.

## 4. Frontend & Deployment
- **Gradio:** The autocomplete interface will be built using Gradio. It is the quickest and most native way to build machine learning demos on Hugging Face Spaces.
- **Hugging Face ZeroGPU Spaces:** The Gradio app will be hosted here to utilize Priority A100 GPU access for fast inference.