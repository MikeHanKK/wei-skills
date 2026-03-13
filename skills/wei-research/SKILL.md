---
name: multi-model-researcher
version: 1.1.0
description: Queries multiple LLMs in parallel and synthesizes their responses into a single high-quality answer
---

# Multi-Model Researcher Skill

**Version:** 1.1.0 | **Last updated:** 2026-03-10

## Overview

The **multi-model-researcher** skill queries multiple large language models in parallel and synthesizes their responses into a single high-quality answer.

This skill is designed for:

* Complex research questions requiring high confidence
* Analysis that benefits from multiple viewpoints
* Reducing hallucination via cross-model comparison
* Topics where a single model may have blind spots or biases

Instead of relying on a single model, this skill collects answers from multiple models and uses a **judge model** to produce a final synthesis.

> **Cost note:** This skill queries 2–3 models per request. Expect approximately 2–3x the token usage of a single-model query. Use it when answer quality justifies the cost; avoid it for simple or low-stakes questions.

---

## Requirements

- [Bun](https://bun.sh) >= 1.0

## Usage

```bash
bun run scripts/index.ts --query "your question"
```

---

# Supported Models

| Model | Strengths |
|---|---|
| **glm-5** | Reasoning, analysis, default judge |
| **kimi-k2.5** | Knowledge retrieval, long context |
| **qwen3-max** | Coding, synthesis |
| **minimax-m2.5** | Creative reasoning |

A router automatically selects the most appropriate models based on the query type.

---

# When To Use This Skill

**Use this skill when:**

* The user asks a complex research question
* The question requires high confidence or cross-validation
* The topic has multiple competing viewpoints
* A factual error would have significant consequences

**Do NOT use this skill for:**

* Simple factual lookups
* Quick definitions or summaries
* Trivial tasks a single model can answer reliably
* Time-sensitive queries where 8–15s latency is unacceptable

---

# Skill Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | Yes | The research question to analyze |
| `models` | array[string] | No | Force specific models (bypasses router) |
| `max_models` | number | No | Cap on number of models queried (default: 2) |
| `depth` | string | No | `"simple"` or `"tree"` (see Depth Modes below) |

**Example:**

```json
{
  "query": "What are the economic impacts of AI agents?",
  "max_models": 3
}
```

## Depth Modes

| Mode | Behavior | Use When |
|---|---|---|
| `simple` (default) | Single-pass: each model answers the query once, judge synthesizes | Most research questions |
| `tree` | Multi-pass: follow-up sub-queries are generated and answered before synthesis | Complex topics requiring decomposition (adds ~10–20s latency) |

---

# Execution Flow

```
User Query
   │
   ▼
Input Sanitization
   │
   ▼
Router  ──(failure)──▶  Default model pair
   │
   ▼
Selected Models
(e.g. glm-5, kimi-k2.5)
   │
   ▼
Parallel Inference  ──(partial failure)──▶  Continue with available responses
   │
   ▼
Collected Answers
   │
   ▼
Judge Model (glm-5)
   │
   ▼  (confidence < 0.6?)
   ├──▶  Critique pass (optional)
   │
   ▼
Final Synthesized Answer
```

---

# Output Format

**Success (all models respond):**

```json
{
  "query": "user question",
  "models_used": ["glm-5", "kimi-k2.5"],
  "answers": [
    { "model": "glm-5", "answer": "..." },
    { "model": "kimi-k2.5", "answer": "..." }
  ],
  "final_answer": "...",
  "confidence": 0.85
}
```

**Partial failure (one model timed out or errored):**

```json
{
  "query": "user question",
  "models_used": ["glm-5"],
  "models_failed": [
    { "model": "kimi-k2.5", "reason": "timeout" }
  ],
  "answers": [
    { "model": "glm-5", "answer": "..." }
  ],
  "final_answer": "...",
  "confidence": 0.61,
  "warning": "Synthesis based on partial responses. Confidence may be reduced."
}
```

**Full failure:**

```json
{
  "query": "user question",
  "models_used": [],
  "models_failed": [
    { "model": "glm-5", "reason": "timeout" },
    { "model": "kimi-k2.5", "reason": "api_error" }
  ],
  "final_answer": null,
  "error": "All models failed. Please retry."
}
```

> **Confidence scale:** All confidence values use a **0–1 scale** (e.g., `0.85` = 85% confidence). This applies consistently across normalizer outputs and judge outputs.

---

# Performance Characteristics

| Stage | Typical Latency |
|---|---|
| Router | ~1s |
| Model inference (parallel) | 5–10s |
| Judge synthesis | 2–3s |
| **Total** | **8–15s** |

Timeout per model: `20–25 seconds`
Retries per model: `1`

---

# Failure Handling

The skill tolerates partial failures:

* If a model times out or errors, the skill continues with remaining responses
* The judge synthesizes available answers and notes missing models in output
* If all models fail, a structured error is returned (see Output Format above)
* The router has a default fallback pair (`glm-5` + `kimi-k2.5`) if routing fails

---

# Security Notes

* User-supplied `query` values are included in prompts sent to external model APIs. Avoid passing unsanitized inputs from untrusted sources.
* The skill does not validate or filter query content — callers are responsible for input sanitization upstream.
* Do not include secrets, PII, or confidential data in queries unless the target model APIs are approved for that data classification.

---

# Quality Evaluation

A synthesized answer is considered high quality when:

* Consensus points across models are clearly identified
* Disagreements are surfaced (not silently resolved)
* Confidence ≥ 0.75
* The judge does not fabricate citations or sources

For ongoing quality tracking, log `confidence`, `models_used`, and `models_failed` per request.

---

# Best Practices

Recommended model combination:

```
2 answering models + 1 judge model
```

Example:

```
kimi-k2.5  ──┐
              ├──▶ judge: glm-5
qwen3-max  ──┘
```

Benefits:
* Higher reliability through model diversity
* Reduced hallucination via cross-validation
* Improved reasoning quality on ambiguous topics

---

# Example Usage

```
use multi-model-researcher

query="What are the major AI breakthroughs in the past 12 months?"
```

Example result:

```
Final Answer:
AI breakthroughs in the last year include...

Consensus:
- Agent frameworks matured significantly
- Multimodal models expanded in capability
- Inference costs decreased substantially

Confidence: 0.87
```

---

# Changelog

| Version | Changes |
|---|---|
| 1.1.0 | Added depth mode documentation, error output schemas, confidence scale clarification, security notes, quality evaluation criteria, cost note |
| 1.0.0 | Initial release |