# Wei Skills

> A production-ready collection of AI research & reasoning skills for building **high-confidence, multi-model LLM systems**.

Wei Skills extends Claude Code with advanced capabilities for:
- Multi-model AI research synthesis
- Hallucination reduction via cross-validation
- Evidence-based answer generation
- Automated research workflows

Designed for developers building **AI agents, research assistants, and LLM-powered applications**.

---

## Why Wei Skills?

Most LLM applications suffer from a critical limitation:

> ❌ Single-model responses are often inconsistent, biased, or hallucinated

Wei Skills solves this by introducing a **multi-model verification layer for AI reasoning**.

Instead of trusting one model, we:
- Query multiple LLMs in parallel
- Compare and cross-validate outputs
- Use a judge model to synthesize a grounded final answer
- Surface disagreements instead of hiding uncertainty

---

## Core Benefits

### 🔍 1. Reduced Hallucinations via Cross-Validation
Multiple independent models answer the same query. Conflicts are detected and resolved explicitly, significantly reducing hallucination risk compared to single-model systems.

### 🌐 2. Multi-Source Intelligence
Different models leverage different training distributions, retrieval systems, and reasoning patterns — improving coverage and reducing blind spots.

### 🧠 3. Higher Confidence AI Responses
When multiple models converge on an answer, confidence increases. When they diverge, uncertainty is surfaced instead of hidden.

### ⚙️ 4. Production-Ready for AI Applications
Designed for integration into:
- AI agents
- Research copilots
- Enterprise knowledge systems
- LLM orchestration pipelines

---

## Skills

| Skill | Description | Status |
|-------|-------------|--------|
| [wei-cross-research](#wei-cross-research) | Multi-LLM research synthesis with cross-validated, evidence-grounded answers | ✅ Ready |

---

# 🧠 wei-cross-research

> Multi-model AI research system for generating **high-confidence, evidence-based answers**.

## What It Does

`wei-cross-research` is an AI orchestration skill that:

1. Sends the same query to multiple LLMs in parallel  
2. Collects independent responses  
3. Compares reasoning paths and factual claims  
4. Uses a judge model to synthesize a final grounded answer  
5. Explicitly surfaces disagreements and uncertainty  

This creates a **cross-validated AI research pipeline**, not just a single-model answer.

---

## When to Use

Use `wei-cross-research` when you need:

### ✅ High-confidence answers
- Investment / business analysis
- Technical decision making
- Research synthesis

### ✅ Multi-perspective reasoning
- Complex or ambiguous questions
- Topics with conflicting viewpoints
- Areas with incomplete information

### ✅ Reduced hallucination risk
- When correctness matters more than speed
- When single-model answers may be unreliable

---

## Why It Works

Traditional LLMs:
> Single model → single answer → hidden uncertainty

Wei Cross-Research:
> Multiple models → competing answers → explicit validation → grounded synthesis

This design improves:
- factual reliability
- reasoning robustness
- transparency of uncertainty

---

## Cost & Performance Tradeoff

> ⚠️ Important: This is a **multi-model system**, not a single API call.

Typical usage cost:
- ~2–3x tokens vs single-model query
- Higher latency due to parallel execution

Use when:
- accuracy > cost
- reliability matters

Avoid when:
- simple Q&A
- low-stakes queries

---

## Requirements

- [Bun](https://bun.sh) >= 1.0
- API keys for supported LLM providers (e.g. OpenRouter, Bailian, etc.)

---

## Usage

### Claude Code / OpenClaw

```bash
use wei-cross-research

query="What are the economic impacts of AI agents?"
#### In Claude Code / OpenClaw
```

Advanced usage:

```
use wei-cross-research

query="美联储2026年会降息吗？"
maxModels=2
```


### Documentation

- [SKILL.md](skills/wei-cross-research/SKILL.md) — Complete skill documentation

---


## License

MIT License
