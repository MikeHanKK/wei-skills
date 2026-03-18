---
name: wei-cross-research
version: 1.2.1
description: Part of Wei Skills (wei-cross-research) - Get cross-validated answers by querying multiple LLMs in parallel. More reliable than any single model.
execution:
  timeout: 600 # Maximum allowed is 600 seconds (10 minutes)
  longRunning: true # Marks it as a long-running task to prevent interface blocking
---

# Wei Cross Research Skill

**Version:** 1.2.1 | **Last updated:** 2026-03-16

## Overview

Use **wei-cross-research** when you need a reliable answer — not just one model's opinion.

This skill queries multiple LLMs in parallel and uses a judge model to synthesize 
their responses into a single cross-validated answer. When models agree, confidence 
is high. When they disagree, the disagreement is surfaced — not silently resolved.

Best for:

* High-stakes questions where a wrong answer has real consequences
* Topics where a single model may have blind spots or biases
* Analysis that benefits from multiple independent viewpoints
* Reducing hallucination via cross-model comparison

> **Cost note:** This skill queries 2–3 models per request. Expect approximately 
> 2–3x the token usage of a single-model query. Use it when answer quality 
> justifies the cost; avoid it for simple or low-stakes questions.

---

## Requirements

- [Bun](https://bun.sh) >= 1.0

## Usage

```bash
bun run scripts/index.ts "your question"
bun run scripts/index.ts --domain financial "美联储2026年会降息吗？"
```

### Domain-Specific Judges

When `--domain financial` is specified, the judge step uses a finance-specialized prompt that produces:

- **Base Case Analysis** — probabilistic scenario with data-driven reasoning
- **Bull Case** — arguments for upside scenario
- **Bear Case** — arguments for downside scenario
- **Key Variables / Risks** — macro events, earnings, policy changes, market sentiment

This avoids deterministic predictions and enforces probability ranges (e.g., 60–70% likelihood). Use it for investment, macroeconomic, and market analysis questions.

---
# Supported Models

All models are accessed via OpenRouter. Answering models may use live retrieval
depending on the provider configuration.

The system selects **2–3 answering models** in parallel and uses a **judge model**
to synthesize the final response.

---

## Answering Models

| Model | Provider ID | Retrieval | Best For |
|---|---|---|---|
| **kimi-k2.5** | `moonshotai/kimi-k2.5:online` | ✅ Web | Current events, long-context research, factual queries, document analysis |
| **qwen3.5** | `qwen/qwen3.5-35b-a3b:online` | ✅ Web | Coding, structured output, technical explanations, math and science |
| **minimax-m2.5** | `minimax/minimax-m2.5:online` | ✅ Web | Reasoning-heavy tasks, synthesis, creative writing, long-form analysis |
| **gpt-5.4** | `openai/gpt-5.4:online` | ✅ Web | Broad capability, balanced reasoning, ambiguous queries, general fallback |
| **grok-4.1** | `x-ai/grok-4.1-fast:online` | ✅ X (Twitter) | Social sentiment, trending topics, real-time public opinion |

---

## Judge Models

Judge models **synthesize answers already in context** and normally do not require retrieval.

| Model | Provider ID | Retrieval | Role |
|---|---|---|---|
| **glm-5-judge** | `z-ai/glm-5` | ❌ | Default synthesis judge |
| **qwen3.5-judge** | `qwen/qwen3.5-35b-a3b` | ❌ | Fallback judge if glm-5-judge unavailable |

Judge models are **independent of answering models** and may synthesize outputs
from any answering pool.

---

## Model Selection

**Single source of truth:** [`prompts/router.txt`](prompts/router.txt) — contains the complete routing rules
(query type → models → domain → signal words → principles).

The built-in router uses these rules automatically. As the main conversation model, you can also
**read `prompts/router.txt`** to classify the query and pass `models` + `domain` directly,
bypassing the built-in router and saving ~10s latency.

### Quick Reference

| Query Type | Domain | Models | Examples |
|---|---|---|---|
| Financial / markets | `financial` | kimi-k2.5, gpt-5.4, qwen3.5 | "美联储降息", "stock price", "inflation" |
| Current events | — | kimi-k2.5, grok-4.1, gpt-5.4 | "latest news", "what happened today" |
| Technical / coding | — | qwen3.5, gpt-5.4, minimax-m2.5 | "implement algorithm", "debug code" |
| Deep analysis | — | kimi-k2.5, minimax-m2.5, gpt-5.4 | "compare X and Y", "why does..." |
| Social / sentiment | — | grok-4.1, kimi-k2.5, minimax-m2.5 | "trending", "people think" |
| Other / default | — | kimi-k2.5, minimax-m2.5, gpt-5.4 | *(fallback)* |

> For full signal words, routing principles, and detailed rules, see `prompts/router.txt`.


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
| `maxModels` | number | No | Cap on number of models queried (default: 2) |
| `depth` | string | No | `"simple"` or `"tree"` (see Depth Modes below) |
| `judgeModel` | string | No | Override the default judge model (default: `"glm-5"`) |
| `domain` | string | No | Question domain. `"financial"` uses a finance-specific judge prompt with scenario analysis (Bull/Bear/Base Case) |

**Example:**

```json
{
  "query": "What are the economic impacts of AI agents?",
  "maxModels": 3
}
```

## Depth Modes

| Mode | Behavior | Use When |
|---|---|---|
| `simple` (default) | Single-pass: each model answers the query once, judge synthesizes | Most research questions |
| `tree` | Multi-pass: follow-up sub-queries are generated and answered before synthesis | Complex topics requiring decomposition (adds ~10–20s latency) |

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

# Result Files

Each run produces files identified by a shared `timestamp` in `YYYY-MM-DDTHH-MM-SS` format (ISO 8601, colons replaced with hyphens).

The timestamp is logged at the start of execution:
```
[ResearchAgent] Timestamp: 2026-03-19T14-30-05
```

### File Locations

| File | Path | Content |
|---|---|---|
| **Report** | `reports/report-{timestamp}.txt` | Final synthesized answer from judge |
| **Model responses** | `intermediate/{model}-{timestamp}.txt` | Raw response from each answering model |
| **Judge raw** | `intermediate/{judge}-{timestamp}.txt` | Raw judge synthesis output |

### Example

For a run at `2026-03-19T14:30:05` with models `kimi-k2.5` and `gpt-5.4`, judge `glm-5`:

```
reports/report-2026-03-19T14-30-05.txt        ← final answer
intermediate/kimi-k2.5-2026-03-19T14-30-05.txt
intermediate/gpt-5.4-2026-03-19T14-30-05.txt
intermediate/glm-5-judge-raw-2026-03-19T14-30-05.txt
```

> Use the timestamp from console output to locate all files from a specific run.

---

# Performance Characteristics

| Stage | Typical Latency |
|---|---|
| Router | ~1s (skipped when `models` passed directly) |
| Model inference (parallel) | 20–100s |
| Judge synthesis | 20-60s |
| **Total** | **40–120s** |

Timeout per model: `60-120 seconds`
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
use cross-research

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
| 1.2.0 | Added `domain` parameter with `financial` support — finance-specific judge prompt with Bull/Bear/Base Case scenario analysis |
| 1.1.0 | Added depth mode documentation, error output schemas, confidence scale clarification, security notes, quality evaluation criteria, cost note |
| 1.0.0 | Initial release |