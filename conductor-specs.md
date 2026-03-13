# Omlila Conductor API & Knowledge Base Specs

## Overview

Omlila operates on an offline-first paradigm. Our devices—ranging from mobile phones to low-power edge nodes like Raspberry Pis—operate autonomously for extended periods without internet connectivity.

To maintain fresh knowledge and functionality, we will expose specific APIs to download and sync disparate "Knowledge Bases" when a device comes online. This document outlines the initial guidelines and specification patterns for these sync workflows.

## 1. Offline Knowledge Base (KB) Downloads

The core mechanism for updating Omlila Apps (e.g., Omlila Sikshya) involves downloading compiled Knowledge Base packages when a client occasionally hits a network (such as returning from a trek or arriving at an internet café).

### Guidelines for KB APIs:

- **Idempotency**: All download endpoints must support resumable, idempotent downloads. Large curriculum packages may fail mid-way on weak connections.
- **Versioning (Differential Syncing)**: Instead of downloading the entire dataset, the API must expose a delta/diff sync. If an edge device has v1.2, the API should only serve the missing files to upgrade to v1.3.
- **Compression**: Payloads must be highly compressed (e.g., zstd, brotli) to minimize bandwidth costs for users in developing regions.
- **Verification Hash**: All downloaded packages must include an MD5/SHA256 checksum to ensure payload integrity before the local system consumes it.

## 2. Occasional Sync Mechanism (The "Conductor")

The Omlila Conductor acts as the background service managing the intermittent connection.

- **Trigger**: Conductor detects a reliable network connection (e.g., a pre-approved Wi-Fi or user-triggered cell sync).
- **Handshake**: Edge node reports its current state and installed KB versions to the main server `POST /api/v1/sync/handshake`.
- **Manifest Delivery**: The server responds with a manifest of available updates.
- **User Delegation (Optional but Recommended)**: On expensive cell networks, the system should ask the user for permission to download a 500MB curriculum file unless it's over a free/unmetered connection.
- **Application**: The Conductor downloads the compressed archives, decompresses them into the local knowledge directory, and swaps symlinks for zero-downtime updates in Omlila Sikshya.

## 3. Hardware Constraints (Raspberry Pi & Locality)

When releasing a Knowledge Base:

- **Storage**: Do not assume vast amounts of storage. Endpoints must provide estimated sizes so the client device can verify available disk space prior to the sync.
- **Model Quantization**: Downloadable AI models must be heavily quantized (e.g., 4-bit or 8-bit GGUF files) to run efficiently on a Raspberry Pi or low-tier Android CPU.
- **Format**: Text corpus should use efficient localized search index formats (like SQLite FTS) straight out of the download archive to save the edge device from indexing it manually.

## 4. Proposed Endpoint Drafts

### Check for Updates
```http
GET /api/v1/kb/manifest?device_type=rpi4&app=sikshya&current_version=1.0.4
```

### Download Diff Package
```http
GET /api/v1/kb/download?app=sikshya&from_ver=1.0.4&to_ver=1.0.5
```

### Health & Telemetry Sync
```http
POST /api/v1/telemetry/sync
# Sends minimal diagnostic and usage logs ONLY when connected, prioritizing privacy (no PII).
```

*This living document will dictate the architecture for all future API endpoints powering the Omlila ecosystem.*
