# Wei Skills

> **Don’t trust one model. Force consensus.**  
> A multi-model AI system that **argues, verifies, and converges on truth**.

English | [中文](README_cn.md)

---

## What is Wei Skills?

Wei Skills is not just a toolkit.

It is a **reasoning layer for AI systems** that transforms unreliable single-model outputs into **high-confidence, decision-grade intelligence**.

Instead of asking one model for an answer, Wei Skills:

- makes multiple models think independently  
- forces them to disagree, challenge, and verify each other  
- synthesizes a final answer only after conflicts are resolved  

> **AI should not generate answers — it should earn them.**

---

## The Problem

Most LLM applications rely on a single model.

> ❌ One model → one answer → hidden uncertainty  

This leads to:
- hallucinations  
- overconfidence  
- fragile reasoning  

---

## The Wei Approach

Wei Skills introduces a new paradigm:

> ✅ Multiple models → competing reasoning → explicit validation → grounded synthesis  

This transforms AI from:

- **answer generation** → **truth-seeking process**  
- **black box output** → **transparent reasoning system**

---

## Why It Matters

Wei Skills is built for scenarios where being *wrong is costly*:

- investment decisions  
- technical architecture  
- product & strategy validation  
- research synthesis  

> When accuracy matters, **consensus beats confidence**.

---

## Core Capabilities

### 🔍 Cross-Model Verification
Multiple LLMs independently answer the same query, exposing conflicts and reducing hallucination risk.

### ⚖️ Adversarial Reasoning
Ideas are stress-tested through structured counterarguments before being accepted.

### 🧠 Confidence Through Convergence
Agreement increases confidence. Disagreement reveals uncertainty.

### ⚙️ Built for Real Systems
Designed for:
- AI agents  
- research copilots  
- enterprise knowledge systems  
- LLM orchestration pipelines  

---

## Two Modes of Thinking

Wei Skills operates in two complementary modes:

### 1. **Find Truth** → `wei-cross-research`
Build confidence through **consensus**

### 2. **Test Truth** → `wei-devils-advocate`
Build confidence through **attack**

---

> First, make models agree.  
> Then, try to prove them wrong.  

This is how Wei turns AI into a **decision-grade reasoning system**.

---

## Skills

| Skill | Description | Status | Install |
|-------|-------------|--------|---------|
| [wei-cross-research](#wei-cross-research) | Multi-model research with cross-validated, evidence-grounded answers | ✅ Ready | [OpenClaw](https://clawhub.ai/mikehankk/wei-cross-research) |
| [wei-devils-advocate](#wei-devils-advocate) | Adversarial reasoning to stress-test ideas and expose risks | ✅ Ready | [OpenClaw](https://clawhub.ai/mikehankk/wei-devils-advocate) |

---

# 🧠 wei-cross-research

> **Find what is most likely true — by forcing models to agree.**  
> Multi-model research through **cross-validation and consensus building**.

🚀 Try it: https://www.bigbigai.com/agent/cross-research
📦 OpenClaw: https://clawhub.ai/mikehankk/wei-cross-research

---

## What It Really Does

`wei-cross-research` is not just multi-model querying.

It is a **consensus engine**.

Instead of taking the first answer, it:

1. Forces multiple models to think independently  
2. Compares reasoning and factual claims  
3. Identifies conflicts and inconsistencies  
4. Resolves disagreements through a judge model  
5. Produces a **converged, evidence-grounded answer**

> This is not faster AI.  
> This is **more trustworthy AI**.

---

## When to Use

### 🔍 Uncertain questions
- “What is actually happening?”  
- “What’s the real impact?”  

### ⚖️ Ambiguous situations
- Conflicting sources  
- Multiple interpretations  

### 🧠 High-value decisions
- Investment analysis  
- Technical architecture  
- Research synthesis  

---

## Mental Model

Traditional AI:
> Ask → Answer  

Wei Cross Research:
> Ask → Compete → Compare → Resolve → Converge  

---

## Output Philosophy

- If models **agree** → confidence increases  
- If models **disagree** → uncertainty is exposed  

> Wei does not hide disagreement.  
> It uses it.

---

## What You Get

- A synthesized answer  
- Key points of agreement  
- Explicit disagreements  
- Better decision confidence  

---

## Cost & Performance Tradeoff

> ⚠️ Multi-model system (not a single API call)

Typical:
- ~4-6x tokens  
- higher latency  

Use when:
- accuracy > speed  
- reliability matters  

Avoid when:
- simple queries  
- low-stakes use cases  

---

## Requirements

- Bun >= 1.0  
- API keys for LLM providers (OpenRouter, Bailian, etc.)

---

## Usage

### Claude Code / OpenClaw

```bash
use wei-cross-research

query="What are the economic impacts of AI agents?"

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

> **Break what seems true — before reality does.**
> Stress-test ideas through multi-model adversarial reasoning.

🚀 Try it: https://www.bigbigai.com/agent/devils-advocate
📦 OpenClaw: https://clawhub.ai/mikehankk/wei-devils-advocate

## What It Really Does

`wei-devils-advocate` is not just counterargument generation.

It is a **failure engine**.

Instead of asking “is this a good idea?”, it asks:

How does this fail?

It works by:

1. Taking your thesis or idea
2. Generating strongest counterarguments from multiple models
3. Exposing hidden assumptions
4. Simulating realistic failure scenarios
5. Evaluating whether the idea survives attack

> Weak ideas collapse.
> Strong ideas earn confidence.

---

## When to Use

Use `wei-devils-advocate` when you need:

### ⚠️ High-stakes decisions
- Investment / trading
- Product strategy
- Architecture choices

### 🧠 Bias detection
- When you already “like” the idea
- When something feels obviously correct

### 🔍 Truth over validation
- Before committing resources
- Before irreversible decisions

---

## Mental Model

Traditional thinking:

>  Idea → Validate → Confirm

Wei Devil’s Advocate:

>  Idea → Attack → Break → Survive → Decide

## Output Philosophy
- Assumptions are made explicit
- Risks are forced to surface
- Confidence must be earned

> If it survives, you can trust it more.
>  If it breaks, you saved real cost.

## What You Get
- Hidden assumptions
- Strong counterarguments
- Failure scenarios
- Survivability verdict:
    - fatal
    - risky
    - robust


---

## Cost & Performance Tradeoff

> ⚠️ Important: Uses multiple models (4-6x cost vs single query).

Typical usage cost:
- ~4-6x tokens for counterargument generation
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
