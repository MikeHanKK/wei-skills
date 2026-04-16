# Wei Skills

> A production-ready collection of AI research & reasoning skills for building **high-confidence, multi-model LLM systems**.

English | [中文](README_cn.md) 

Wei Skills extends Openclaw and Claude Code with advanced capabilities for:
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
| [wei-devils-advocate](#wei-devils-advocate) | Stress-test ideas by generating counterarguments and adversarial scrutiny | ✅ Ready |

---

# 🧠 wei-cross-research

> Multi-model AI research system for generating **high-confidence, evidence-based answers**.

🚀 **Try it now**: Experience the strongest closed-source multi-model cross-validation at [https://www.bigbigai.com/agent/cross-research](https://www.bigbigai.com/agent/cross-research)

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
```

Advanced usage:

```
use wei-cross-research

query="美联储2026年会降息吗？"
queryType="financial"
maxModels=2
```

### Documentation

- [SKILL.md](skills/wei-cross-research/SKILL.md) — Complete skill documentation
- [README.md](skills/wei-cross-research/README.md) — Configuration guide

---

# 🎯 wei-devils-advocate

> Stress-test ideas by generating strong counterarguments and evaluating whether they survive adversarial scrutiny.

🚀 **Try it now**: Experience the strongest closed-source multi-model stress testing at [https://www.bigbigai.com/agent/devils-advocate](https://www.bigbigai.com/agent/devils-advocate)

## What It Does

`wei-devils-advocate` is an adversarial reasoning skill that:

1. Takes your thesis or idea as input
2. Queries multiple critic models to generate strongest counterarguments
3. Explores realistic failure scenarios
4. Uses a judge model to evaluate survivability
5. Provides a structured verdict with recommendation

This enforces **"default to skepticism, earn confidence"** — strong ideas survive attack, weak ones don't.

---

## When to Use

Use `wei-devils-advocate` when you need:

### ✅ Validation through challenge
- Product & startup validation
- Investment / trading risk analysis
- Strategy stress testing

### ✅ Identify hidden risks
- Uncover unchallenged assumptions
- Expose underestimated risks
- Surface confirmation bias

### ✅ High-stakes decisions
- When "yes" is too easy
- When you need truth under pressure
- Before committing significant resources

---

## Why It Works

Traditional validation:
> Seek confirmation → find supporting evidence → false confidence

Wei Devil's Advocate:
> Seek disconfirmation → generate counterarguments → adversarial evaluation → earned confidence

This design exposes:
- hidden assumptions
- blind spots and biases
- failure modes before they happen

---

## Cost & Performance Tradeoff

> ⚠️ Important: Uses multiple models (2–4x cost vs single query).

Typical usage cost:
- ~2–3x tokens for counterargument generation
- Additional tokens for judge evaluation

Use when:
- stakes are high
- bad decisions have real consequences
- you want to "kill" bad ideas early

Avoid when:
- you just want validation
- low-stakes brainstorming
- speed > thoroughness

---

## Requirements

- [Bun](https://bun.sh) >= 1.0
- API keys for supported LLM providers (OpenRouter, Bailian/DashScope)

---

## Usage

### Claude Code / OpenClaw

```bash
use wei-devils-advocate

query="Should we invest in AI startups in 2026?"
```

With explicit configuration:

```
use wei-devils-advocate

query="Is microservices architecture right for our startup?"
queryType="technical"
mode="attack"
```

### Output Structure

1. **Thesis** — Restated input claim
2. **Hidden Assumptions** — Implicit beliefs that must hold
3. **Counterarguments** — Strongest challenges from each model
4. **Failure Scenarios** — Realistic ways this could fail
5. **Survivability** — Assessment of idea robustness
6. **Verdict** — `fatal` / `risky` / `robust`
7. **Recommendation** — `kill` / `pivot` / `proceed`

### Documentation

- [SKILL.md](skills/wei-devils-advocate/SKILL.md) — Complete skill documentation

---

## License

MIT License
