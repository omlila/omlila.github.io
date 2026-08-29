# Specification: Resilient AI-Data Factory

## Objective
A generic, multi-stage pipeline for large-scale web data collection and AI-driven sanitization. While initially focused on Nepali lyrics, the architecture is designed as a reusable framework for building high-quality AI datasets.

## Core Concepts

### 1. Producer-Consumer Orchestration (LangGraph-style)
- **State Machine:** Manages transitions between `SCRAPING`, `CLEANING`, `PAUSED_FOR_APPROVAL`, and `DELIVERING`.
- **Back-Pressure:** If the "Cleaning" queue exceeds a threshold or local storage hits 5GB, the orchestrator issues a `PAUSE` signal to the Scrapy engine.
- **Health Monitoring:** Continuous checks for Ollama (Local LLM), HF Hub, and local disk health.

### 2. Generic Scraper (The Producer)
- **Scrapy-Redis State:** Stores URL frontier and deduplication hashes in Redis for persistent, resumable operations.
- **Protocol:** Standardized JSONL/Parquet hand-off to the Cleaner.

### 3. AI-Cleaner (The Consumer)
- **Ollama/Hermes Integration:** Uses local LLMs for semantic validation (e.g., "Is this a valid lyric?").
- **Generic Processing:** Plugin-based architecture for task-specific enrichment (e.g., Transliteration for lyrics, summarization for articles).

### 4. Storage & Deduplication
- **Two-Tier Redis Deduplication:** Strict hashing and fuzzy (SimHash) content matching.
- **Partitioned Parquet:** Scalable, streamable storage format.

## Implementation Requirements
- **Resilience:** Pause/Resume at any point with zero state loss.
- **Control:** 5GB batch approval gates via HF MCP or local reports.
- **Observability:** Error rate tracking and performance metrics for both scraper and cleaner.
