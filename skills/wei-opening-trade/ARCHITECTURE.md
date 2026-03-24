# Multi-Model Researcher Architecture

**Version:** 1.1.0 | **Last updated:** 2025-07

This document describes the internal architecture of the **multi-model-researcher** skill.

---

# System Overview

The skill performs **multi-model research synthesis** by querying multiple AI systems in parallel and combining their answers through a judge model.

High-level flow:

```
User Query
↓
Input Sanitization
↓
Router  (with fallback)
↓
Parallel Model Execution
↓
Response Normalization
↓
Judge Model
↓  (optional, if confidence < 0.6)
Critique Pass
↓
Final Answer
```

---

# Architecture Diagram

```
Query
│
▼
[Input Sanitization]
│
▼
[Router] ──(failure)──▶ Default pair: glm-5 + kimi-k2.5
│
▼
Selected Models
│
├── glm-5
├── kimi-k2.5
├── qwen3-max
└── minimax-m2.5
│
▼
[Parallel Execution]  ──(partial failure)──▶ Continue with available
│
▼
[Response Normalizer]
│
▼
[Cache Layer]  ──(cache hit)──▶ Return cached result
│
▼
[Judge Model]  ──(confidence < 0.6)──▶ [Critique Pass]
│
▼
Final Synthesized Answer
```

---

# Components

## Input Sanitization

Runs before routing. Protects against prompt injection and malformed inputs.

Responsibilities:
* Strip or escape control characters and injection patterns from `query`
* Enforce maximum query length (recommended: 4000 characters)
* Reject or flag queries containing potential prompt injection sequences

> Callers are ultimately responsible for upstream sanitization. This layer is a defense-in-depth measure.

---

## Router

Determines which models should answer the query.

Input: `query`
Output: `selected_models[]`

**Fallback behavior:** If the router fails (API error, invalid JSON response, or unrecognized query type), the system falls back to the default model pair: `glm-5` + `kimi-k2.5`.

Example routing rules:

```
coding question       → qwen3-max + glm-5
research question     → kimi-k2.5 + glm-5
creative/open-ended   → minimax-m2.5 + glm-5
ambiguous/unknown     → glm-5 + kimi-k2.5  (default fallback)
```

---

## Executor

Executes model calls concurrently.

Implementation:

```javascript
// Node.js
Promise.all([modelA(query), modelB(query)])

# Python
asyncio.gather(modelA(query), modelB(query))
```

Timeout per model: `20–25 seconds`
Retry strategy: `1 retry per model on timeout or 5xx error`

**Partial failure handling:** If one model fails after retries, execution continues with the remaining responses. The failed model is recorded in `models_failed[]` in the output.

---

## Model Adapters

Each model has its own API wrapper.

```
models/
  glm.ts
  kimi.ts
  qwen.ts
  minimax.ts
```

Responsibilities:
* Send prompt to model API
* Parse raw response
* Normalize output to standard structure (see Response Normalizer)
* Handle model-specific error codes and retry logic

---

## Response Normalizer

All model outputs are converted to a standard structure before reaching the judge.

**Normalized schema:**

```json
{
  "model": "glm-5",
  "summary": "...",
  "key_points": ["...", "..."],
  "confidence": 0.8,
  "sources_claimed": ["..."]
}
```

> **Confidence scale:** The `confidence` field uses a **0–1 scale** across all components (normalizer, judge output, and final result). Do not use 0–10 at any layer.

> **Sources note:** The `sources_claimed` field captures any sources the model self-reported. These are **not verified** and should be treated as potentially hallucinated. Do not surface them to users without verification.

This structure allows the judge to compare answers systematically regardless of each model's native output format.

---

## Cache Layer

Sits between the normalizer and judge. Reduces redundant API calls for repeated or near-identical queries.

Key design:
* Cache key: normalized query string (lowercased, whitespace-collapsed)
* Cache TTL: configurable; recommended 1 hour for research queries
* Cache scope: per-deployment (not per-user)
* On cache hit: skip model execution and judge, return cached result directly

> Future improvement: semantic similarity cache using embeddings to catch near-duplicate queries.

---

## Judge Model

Evaluates all normalized responses and produces the final synthesized answer.

**Default judge model:** `glm-5`

**When to change the judge model:**
* If glm-5 is also one of the answering models and you want a fully independent judge, substitute `kimi-k2.5` or `qwen3-max`
* If the query is primarily a coding task, `qwen3-max` may produce a more reliable synthesis

Responsibilities:
* Compare answers across models
* Identify consensus points
* Detect and surface contradictions (do not silently resolve them)
* Synthesize a final answer
* Assign overall confidence (0–1 scale)

**Critique escalation:** If judge confidence < 0.6, optionally trigger the Critique Pass (see below).

---

## Critique Pass (Optional)

Triggered when judge confidence falls below threshold (default: 0.6).

Purpose:
* Have models evaluate each other's answers to surface weaknesses
* Reduce hallucination on low-confidence responses
* Help the judge produce a more reliable final answer on contested topics

The judge reruns synthesis after receiving critique outputs.

---

# Data Flow Summary

| Stage | Input | Output |
|---|---|---|
| Sanitization | Raw query string | Cleaned query string |
| Router | Cleaned query | `selected_models[]` |
| Executor | Query + models | Raw model responses |
| Normalizer | Raw responses | Normalized response objects |
| Cache | Normalized query | Cached result or miss |
| Judge | Normalized responses | Final answer + confidence |
| Critique (optional) | Two model answers | Weakness analysis |

---

# Performance

| Stage | Typical Latency |
|---|---|
| Input sanitization | <100ms |
| Router | ~1s |
| Model inference (parallel) | 5–10s |
| Judge synthesis | 2–3s |
| **Total** | **8–15s** |

---

# Failure Handling

| Scenario | Behavior |
|---|---|
| Router fails | Fall back to default model pair |
| One model times out | Continue with remaining responses |
| All models fail | Return structured error; do not invoke judge |
| Judge fails | Return raw model responses with a warning |
| Cache unavailable | Continue without cache; log warning |

Retry strategy: 1 retry per model on timeout or 5xx. No retry on 4xx (client errors).

---

# Design Principles

* **Parallel execution** — model calls run concurrently to minimize latency
* **Model diversity** — different models reduce correlated errors
* **Structured outputs** — normalized schemas enable reliable synthesis
* **Graceful degradation** — partial failures produce degraded but usable results
* **Consistent confidence scale** — 0–1 everywhere, no exceptions
* **Transparent uncertainty** — contradictions are surfaced, not hidden

---

# Future Extensions

| Extension | Description |
|---|---|
| Tree-of-Models | Iterative sub-query decomposition for deep research |
| Web search integration | Ground answers in live sources to reduce hallucination |
| Model performance tracking | Per-model accuracy logging to inform router decisions |
| Adaptive router learning | Use historical performance data to improve model selection |
| Semantic cache | Embedding-based cache to catch near-duplicate queries |
| Cost tracking | Per-request token usage logging for cost attribution |

---

# Changelog

| Version | Changes |
|---|---|
| 1.1.0 | Added input sanitization, router fallback, cache layer, confidence scale standardization (0–1 everywhere), sources_claimed caveat, critique escalation trigger, failure table, judge selection guidance |
| 1.0.0 | Initial release |