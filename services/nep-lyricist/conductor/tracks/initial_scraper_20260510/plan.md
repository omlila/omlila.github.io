# Implementation Plan: Resilient AI-Data Factory (Lyrics Focus)

## Phase 1: Core Orchestrator & Safety
- [x] Task: Initialize Python project and dependencies [checkpoint: cdca04d]
- [x] Task: Infrastructure Setup (Redis AOF) [checkpoint: e743e15]
- [x] Task: Implement "Orchestrator" (LangGraph-inspired State Machine)
    - [x] Create `factory/orchestrator.py` to manage `SCRAPING` vs `CLEANING` states.
    - [x] Implement Redis-based signaling (Pause/Resume/Stop).
- [x] Task: Implement "Gatekeeper" Scrapy Extension
    - [x] Add storage monitoring (5GB threshold).
    - [x] Add health checks (Ollama/HF Hub connectivity).
    - [x] Implement back-pressure (Pause scraper if Cleaner queue is too large).

## Phase 2: The Producer (Resilient Scraper)
- [x] Task: Create Item definitions [checkpoint: e743e15]
- [x] Task: Implement Redis Deduplication Pipeline [checkpoint: e743e15]
- [x] Task: Implement Parquet Export Pipeline [checkpoint: e743e15]
- [x] Task: Build Initial Spiders (Discovery & Manual) [checkpoint: e743e15]

## Phase 3: The Consumer (Async AI Cleaner)
- [x] Task: Build "Cleaner Worker"
    - [x] Implement file-watching for `data/raw`.
    - [x] Integration with Ollama (Hermes 3) for semantic validation.
    - [x] Implementation of script transliteration (Romanized <-> Devanagari).
    - [x] Move "Verified" records to `data/clean`.
- [x] Task: Lyrics Enrichment (Transliteration Plugin)
    - [x] Implement Romanized <-> Devanagari conversion.

## Phase 4: Approval & Delivery
- [x] Task: Batch Approval Interface
    - [x] Generate summary report of the 5GB batch.
    - [x] Implement HF MCP or CLI command for manual approval to push.
- [x] Task: Hugging Face Delivery
    - [x] Push `data/clean` to HF Hub once approved.
- [x] Task: Main Entry Point (The Factory Launcher)
    - [x] Create `main.py` to launch all components in sync.

- [x] Task: Conductor - User Manual Verification 'Phase 4: Approval & Delivery' (Protocol in workflow.md)

## Phase 5: Discovery Intelligence & Anti-Ban Upgrades (NEW)

**Objective:** Upgrade the discovery engine to use the local Ollama LLM for query formulation, prioritize queries based on historical hit rates, and implement robust 403 error mitigation.

**Key Files & Context:**
- `nepali_lyrics_pipeline/utils/search_generator.py`
- `nepali_lyrics_pipeline/utils/discovery_engine.py`
- `nepali_lyrics_pipeline/middlewares.py`
- `nepali_lyrics_pipeline/settings.py`
- Redis (for tracking state)

**Implementation Steps:**

- [ ] **Task 1: Query Hit Rate Tracking (Redis)**
    - Update `DiscoveryEngine` to increment `stats:query_attempts:{query}` when a query is executed.
    - Update pipeline or spider logic to increment `stats:query_success:{query}` when a new, unseen lyrics domain is discovered via that query.
    - Create a helper to fetch the top successful queries from Redis.

- [ ] **Task 2: LLM-Powered Query Generation**
    - Refactor `SearchQueryGenerator` to call the local Ollama instance (`factory/config.py`).
    - Construct a prompt that injects the top successful queries from Task 1 as "few-shot" examples and asks the LLM to generate 5 novel search queries.
    - Add a fallback mechanism to the existing random pattern generator if Ollama is unreachable.

- [ ] **Task 3: User-Agent Rotation**
    - Create `RotateUserAgentMiddleware` in `nepali_lyrics_pipeline/middlewares.py`.
    - Maintain a list of modern browser User-Agents.
    - Select a random User-Agent for every outbound request to reduce fingerprinting.
    - Update `settings.py` to enable the new middleware.

- [ ] **Task 4: Smart 403 Cooldown Mitigation**
    - Update `DomainCooldownMiddleware` in `nepali_lyrics_pipeline/middlewares.py`.
    - Intercept `403 Forbidden` and `429 Too Many Requests` responses.
    - Immediately apply a cooldown (e.g., 30-60 mins) to the offending domain when these status codes are encountered, bypassing the standard 100-hit limit.

**Verification:**
- Verify `stats:query_attempts` and `stats:query_success` keys populate in Redis.
- Verify Ollama API is successfully called during discovery and returns valid queries.
- Verify different User-Agents are used across requests in logs.
- Verify domains returning 403 are immediately skipped and placed in cooldown.