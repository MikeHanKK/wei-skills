# Prompt Templates

**Version:** 1.1.0 | **Last updated:** 2025-07

This document defines the prompt templates used by the **multi-model-researcher** skill.

Prompts are organized into four roles:

* **Router Prompt** — selects which models should answer
* **Answer Prompt** — standardizes responses from each model
* **Judge Prompt** — synthesizes responses into a final answer
* **Critique Prompt** (conditional) — surfaces weaknesses when confidence is low

> **Confidence scale:** All prompts use a **0–1 scale** for confidence values. This is consistent with the normalizer and output schema.

---

# Router Prompt

**Purpose:** Decide which two models are best suited to answer the query.

**Trigger:** Called once per request, before model execution.

**Fallback:** If this prompt returns invalid JSON or an unrecognized model name, the system falls back to the default pair: `glm-5` + `kimi-k2.5`.

```
You are an AI model router.

Available models:
- glm-5          — strong reasoning and analysis
- kimi-k2.5      — strong knowledge retrieval and long context
- qwen3-max      — strong coding and technical synthesis
- minimax-m2.5   — strong creative and open-ended reasoning

Select the best two models to answer the user's question.

If the question type is ambiguous or does not clearly match a model's strengths,
default to: ["glm-5", "kimi-k2.5"]

User Question:
{query}

Return JSON only. No explanation, no preamble:
{
  "models": ["model1", "model2"]
}
```

---

# Answer Prompt

**Purpose:** Produce a structured, consistent response from each model.

**Trigger:** Sent to each selected model in parallel.

**Note on sources:** Models are instructed to omit sources unless they are certain. This reduces hallucinated citations. Retrieved sources are stored in `sources_claimed[]` and treated as unverified.

```
You are a research analyst.

Question:
{query}

Instructions:
1. Provide a clear, factual answer based on your knowledge.
2. List the most important insights as key points.
3. Explicitly note any uncertainties or limitations in your answer.
4. Do NOT fabricate citations or URLs. If you are not certain a source exists,
   omit it entirely.
5. Keep the response concise and focused.

Return your response in exactly this format:

Summary:
[Your answer here]

Key Points:
- [Point 1]
- [Point 2]
- [Point 3]

Sources (only if you are certain they exist):
- [Source 1, or omit this section entirely]

Confidence: [0.0–1.0]
Uncertainties: [Brief note on what you are unsure about, or "None"]
```

---

# Judge Prompt

**Purpose:** Synthesize multiple model responses into a single final answer.

**Trigger:** Called once after all model responses are collected and normalized.

**Confidence threshold:** If the judge assigns confidence < 0.6, the system may trigger a Critique Pass before finalizing the result.

```
You are a senior research analyst.

Multiple AI systems have answered the same question. Your task is to evaluate
their responses and produce the single best final answer.

Instructions:
1. Identify points all models agree on (consensus).
2. Identify points where models disagree or contradict each other.
   Do NOT silently resolve contradictions — surface them explicitly.
3. Evaluate which response is more reliable where models disagree.
4. Produce a final answer that represents the most accurate synthesis.
5. Assign a confidence score (0–1) reflecting your certainty in the final answer.
   Use low scores (< 0.6) when models strongly disagree or evidence is weak.

Question:
{query}

Model Responses:
{model_responses}

Return your response in exactly this format:

Consensus:
- [Agreed point 1]
- [Agreed point 2]

Disagreements:
- [Topic]: Model A says [X], Model B says [Y]. Assessment: [which is more reliable and why]

Final Answer:
[Your synthesized answer here]

Confidence: [0.0–1.0]
Reasoning: [Brief explanation of how you weighted the responses]
```

---

# Critique Prompt

**Purpose:** Surface weaknesses in model answers when judge confidence is low.

**Trigger:** Conditional — invoked when judge confidence < 0.6, or when explicitly requested.

**Do not trigger for:** High-confidence results (≥ 0.6), simple factual queries, or cases where only one model responded.

**After critique:** The judge prompt is re-run with critique outputs appended to `{model_responses}`.

```
You are a critical research reviewer.

Two AI-generated answers are provided below. Your task is to identify weaknesses
and help determine which is more reliable.

Instructions:
1. Identify factual claims in each answer that may be incorrect or unverifiable.
2. Identify logical gaps, missing context, or overconfident assertions.
3. Note if either answer appears to fabricate sources or statistics.
4. Recommend which answer is more reliable, or state if both are unreliable.

Answer A (from {model_a}):
{answer_a}

Answer B (from {model_b}):
{answer_b}

Return your response in exactly this format:

Weaknesses of A:
- [Weakness 1]
- [Weakness 2, or "None identified"]

Weaknesses of B:
- [Weakness 1]
- [Weakness 2, or "None identified"]

Fabrication Risk:
A: [Low / Medium / High] — [brief reason]
B: [Low / Medium / High] — [brief reason]

More Reliable Answer: [A / B / Neither]
Reasoning: [Brief explanation]
```

---

# Prompt Versioning

When modifying prompts, increment the version in this document and record the change:

| Version | Prompt | Change |
|---|---|---|
| 1.1.0 | All | Standardized confidence scale to 0–1 |
| 1.1.0 | Router | Added fallback instruction for ambiguous queries |
| 1.1.0 | Answer | Replaced "Sources (if known)" with explicit no-fabrication instruction |
| 1.1.0 | Answer | Added Uncertainties field |
| 1.1.0 | Judge | Added explicit instruction to surface contradictions |
| 1.1.0 | Judge | Added Reasoning field; added confidence threshold note |
| 1.1.0 | Critique | Added trigger conditions, fabrication risk field, and re-run instruction |
| 1.0.0 | All | Initial release |