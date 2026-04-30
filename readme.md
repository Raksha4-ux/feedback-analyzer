# Supervisor Feedback Analyzer

## Setup

1. Install Ollama
2. Run: ollama pull llama3.2
3. Start backend:
   node server.js

## Architecture

Frontend → Backend (Express) → Ollama (local LLM)

## Model Used

llama3.2 (fast + lightweight)

## Challenges Solved

- Structured output from LLM
- JSON parsing issues
- Scoring logic (6 vs 7 boundary)

## Improvements

- Add frontend UI
- Improve KPI detection
- Better error handling
