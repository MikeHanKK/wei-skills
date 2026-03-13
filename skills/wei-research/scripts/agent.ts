/**
 * Multi-Model Researcher Agent
 *
 * Core implementation of the multi-model-researcher skill.
 * Queries multiple LLMs in parallel and synthesizes their responses into a single high-quality answer.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { BailianClient, OpenRouterClient, OpenAICompliantClient } from './clients/index.js';
import type { ChatMessage, ChatCompletionResponse } from './clients/bailian.js';

/** Configuration file structure */
interface ConfigFile {
  judge_model: string;
  max_models: number;
  depth: string;
  models: Record<string, {
    provider: string;
    model_id: string;
    api_base: string;
    api_key_env: string;
    timeout: number;
  }>;
}

/** Load configuration from config.json */
function loadConfig(): ConfigFile {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const configPath = join(__dirname, '..', 'config.json');
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

/** Load a prompt template from the prompts directory */
function loadPrompt(name: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const promptPath = join(__dirname, '..', 'prompts', `${name}.txt`);
  return readFileSync(promptPath, 'utf-8');
}

/** Build model registry from config */
function buildModelRegistry(config: ConfigFile): Record<string, ModelConfig> {
  const registry: Record<string, ModelConfig> = {};
  for (const [name, model] of Object.entries(config.models)) {
    registry[name] = {
      name,
      provider: model.provider as ModelConfig['provider'],
      modelId: model.model_id,
      apiBase: model.api_base,
      apiKeyEnv: model.api_key_env,
      timeout: model.timeout,
    };
  }
  return registry;
}

/** Supported model names */
export type ModelName = string;

/** Research request parameters */
export interface ResearchRequest {
  query: string;
  models?: ModelName[];
  maxModels?: number;
  depth?: 'simple' | 'tree';
}

/** Normalized model response */
export interface NormalizedResponse {
  model: ModelName;
  summary: string;
  keyPoints: string[];
  confidence: number;
  sourcesClaimed: string[];
  rawResponse?: string;
}

/** Failed model record */
export interface FailedModel {
  model: ModelName;
  reason: string;
}

/** Research response */
export interface ResearchResponse {
  query: string;
  modelsUsed: ModelName[];
  modelsFailed?: FailedModel[];
  answers: NormalizedResponse[];
  modelSummaries?: string[];
  finalAnswer: string;
  confidence: number;
  consensus?: string[];
  disagreements?: string[];
  reasoning?: string;
  warning?: string;
  error?: string;
}

/** Router output */
interface RouterOutput {
  models: ModelName[];
}

/** Judge output */
interface JudgeOutput {
  modelSummaries: string[];
  consensus: string[];
  disagreements: string[];
  finalAnswer: string;
  confidence: number;
  reasoning: string;
}

/** Model configuration */
interface ModelConfig {
  name: string;
  provider: 'openrouter' | 'bailian' | 'openai_compliant';
  modelId: string;
  apiBase: string;
  apiKeyEnv: string;
  timeout: number;
}

/** Load application config and build registry */
const appConfig = loadConfig();
const MODEL_REGISTRY = buildModelRegistry(appConfig);
const DEFAULT_MODELS: string[] = Object.keys(appConfig.models).slice(0, appConfig.max_models);

/** Maximum query length */
const MAX_QUERY_LENGTH = 4000;

/** Confidence threshold for critique pass */
const CRITIQUE_THRESHOLD = 0.6;

/** Judge prompt template */
const JUDGE_PROMPT_TEMPLATE = loadPrompt('judge');

/**
 * Multi-Model Researcher Agent
 */
export class ResearchAgent {
  private bailianClient?: BailianClient;
  private openrouterClient?: OpenRouterClient;
  private openaiCompliantClient?: OpenAICompliantClient;
  private judgeModel: ModelName = 'glm-5';

  constructor(options?: {
    bailianClient?: BailianClient;
    openrouterClient?: OpenRouterClient;
    openaiCompliantClient?: OpenAICompliantClient;
    judgeModel?: ModelName;
  }) {
    this.bailianClient = options?.bailianClient;
    this.openrouterClient = options?.openrouterClient;
    this.openaiCompliantClient = options?.openaiCompliantClient;
    if (options?.judgeModel) {
      this.judgeModel = options.judgeModel;
    }
  }

  /**
   * Execute research query
   */
  async research(request: ResearchRequest): Promise<ResearchResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Input sanitization
      const sanitizedQuery = this.sanitizeInput(request.query);
      console.log(`[ResearchAgent] Query sanitized in ${Date.now() - startTime}ms`);

      // Step 2: Router - select models (or use provided models)
      const selectedModels = request.models ?? await this.router(sanitizedQuery, request.maxModels);
      console.log(`[ResearchAgent] Models selected: ${selectedModels.join(', ')}`);

      // Step 3: Parallel execution - query all models
      const modelResponses = await this.executeParallel(selectedModels, sanitizedQuery);
      console.log(`[ResearchAgent] Parallel execution completed in ${Date.now() - startTime}ms`);

      // Check if all models failed
      const successfulResponses = modelResponses.filter(r => r !== null) as NormalizedResponse[];
      const failedModels: FailedModel[] = [];

      modelResponses.forEach((response, index) => {
        if (response === null) {
          failedModels.push({
            model: selectedModels[index],
            reason: 'timeout_or_error',
          });
        }
      });

      if (successfulResponses.length === 0) {
        return {
          query: sanitizedQuery,
          modelsUsed: [],
          modelsFailed: failedModels,
          answers: [],
          finalAnswer: '',
          confidence: 0,
          error: 'All models failed. Please retry.',
        };
      }

      // Step 4: Judge - synthesize responses
      const judgeResult = await this.judge(sanitizedQuery, successfulResponses);
      console.log(`[ResearchAgent] Judge synthesis completed in ${Date.now() - startTime}ms`);

      // Step 5: Critique pass if confidence is low
      let finalResult = judgeResult;
      if (judgeResult.confidence < CRITIQUE_THRESHOLD && successfulResponses.length >= 2) {
        console.log(`[ResearchAgent] Confidence low (${judgeResult.confidence}), triggering critique pass`);
        const critiqueResult = await this.critiquePass(sanitizedQuery, successfulResponses);
        // Re-run judge with critique
        finalResult = await this.judge(sanitizedQuery, successfulResponses, critiqueResult);
      }

      // Build response
      const response: ResearchResponse = {
        query: sanitizedQuery,
        modelsUsed: successfulResponses.map(r => r.model),
        modelsFailed: failedModels.length > 0 ? failedModels : undefined,
        answers: successfulResponses,
        modelSummaries: finalResult.modelSummaries.length > 0 ? finalResult.modelSummaries : undefined,
        finalAnswer: finalResult.finalAnswer,
        confidence: finalResult.confidence,
        consensus: finalResult.consensus,
        disagreements: finalResult.disagreements,
        reasoning: finalResult.reasoning,
      };

      if (failedModels.length > 0) {
        response.warning = 'Synthesis based on partial responses. Confidence may be reduced.';
      }

      console.log(`[ResearchAgent] Total execution time: ${Date.now() - startTime}ms`);
      return response;

    } catch (error) {
      console.error('[ResearchAgent] Research error:', error);
      return {
        query: request.query,
        modelsUsed: [],
        answers: [],
        finalAnswer: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Input sanitization - protect against prompt injection
   */
  private sanitizeInput(query: string): string {
    // Trim whitespace
    let sanitized = query.trim();

    // Enforce maximum length
    if (sanitized.length > MAX_QUERY_LENGTH) {
      sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
    }

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Remove potential prompt injection patterns
    const injectionPatterns = [
      /ignore previous instructions/gi,
      /system prompt/gi,
      /you are now/gi,
      /disregard/gi,
      /forget/gi,
      /<\|/g,
      /\|>/g,
    ];

    injectionPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Router - select best models for the query
   */
  private async router(query: string, maxModels: number = 2): Promise<ModelName[]> {
    const routerPrompt = `You are an AI model router.

Available models:
- glm-5          — strong reasoning and analysis
- kimi-k2.5      — strong knowledge retrieval and long context
- minimax-m2.5   — strong creative and open-ended reasoning
- gpt-5.4        — strong coding and technical synthesis

Select the best two models to answer the user's question.

If the question type is ambiguous or does not clearly match a model's strengths,
default to: ["glm-5", "kimi-k2.5"]

User Question:
${query}

Return JSON only. No explanation, no preamble:
{
  "models": ["model1", "model2"]
}`;

    try {
      const messages: ChatMessage[] = [
        { role: 'user', content: routerPrompt },
      ];

      // Use judge model (glm-5) for routing
      const response = await this.callModel(this.judgeModel, messages);
      const content = response.choices[0]?.message?.content ?? '';

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: RouterOutput = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.models) && parsed.models.length > 0) {
          // Validate and limit models
          const validModels = parsed.models
            .filter((m): m is ModelName => m in MODEL_REGISTRY)
            .slice(0, maxModels);

          if (validModels.length > 0) {
            return validModels;
          }
        }
      }

      // Fallback to default models
      console.log('[ResearchAgent] Router failed, using default models');
      return DEFAULT_MODELS.slice(0, maxModels);

    } catch (error) {
      console.error('[ResearchAgent] Router error:', error);
      return DEFAULT_MODELS.slice(0, maxModels);
    }
  }

  /**
   * Execute model calls in parallel
   */
  private async executeParallel(
    models: ModelName[],
    query: string
  ): Promise<(NormalizedResponse | null)[]> {
    const answerPrompt = `You are a research analyst.

Question:
${query}

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
Uncertainties: [Brief note on what you are unsure about, or "None"]`;

    const promises = models.map(model => {
      const config = MODEL_REGISTRY[model];
      const timeoutMs = (config?.timeout ?? 25) * 1000;
      return this.executeWithTimeout(model, answerPrompt, timeoutMs);
    });

    return Promise.all(promises);
  }

  /**
   * Execute a single model with timeout and retry
   */
  private async executeWithTimeout(
    model: ModelName,
    prompt: string,
    timeoutMs: number
  ): Promise<NormalizedResponse | null> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ];

    // Try once, then retry once on failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await Promise.race([
          this.callModel(model, messages),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          ),
        ]);

        return this.normalizeResponse(model, response);

      } catch (error) {
        const isLastAttempt = attempt === 1;
        if (isLastAttempt) {
          console.error(`[ResearchAgent] Model ${model} failed after retry:`, error);
          return null;
        }
        console.warn(`[ResearchAgent] Model ${model} attempt ${attempt + 1} failed, retrying...`);
      }
    }

    return null;
  }

  /**
   * Get or create Bailian client (lazy initialization)
   */
  private getBailianClient(): BailianClient {
    if (!this.bailianClient) {
      this.bailianClient = new BailianClient();
    }
    return this.bailianClient;
  }

  /**
   * Get or create OpenRouter client (lazy initialization)
   */
  private getOpenRouterClient(): OpenRouterClient {
    if (!this.openrouterClient) {
      this.openrouterClient = new OpenRouterClient();
    }
    return this.openrouterClient;
  }

  /**
   * Call a model through its configured provider
   */
  private async callModel(
    model: ModelName,
    messages: ChatMessage[],
    options?: { maxTokens?: number }
  ): Promise<ChatCompletionResponse> {
    const config = MODEL_REGISTRY[model];
    const maxTokens = options?.maxTokens ?? 2000;

    switch (config.provider) {
      case 'bailian':
        return this.getBailianClient().chatCompletion(config.modelId, messages, {
          temperature: 0.7,
          maxTokens,
        });
      case 'openrouter':
        return this.getOpenRouterClient().chatCompletion(config.modelId, messages, {
          temperature: 0.1,
          maxTokens,
        });
      case 'openai_compliant':
      default:
        if (!this.openaiCompliantClient) {
          throw new Error(`Model ${model} requires openaiCompliantClient, but it is not configured`);
        }
        return this.openaiCompliantClient.chatCompletion(config.modelId, messages, {
          temperature: 0.7,
          maxTokens,
        });
    }
  }

  /**
   * Normalize model response to standard structure
   */
  private normalizeResponse(
    model: ModelName,
    response: ChatCompletionResponse
  ): NormalizedResponse {
    const content = response.choices[0]?.message?.content ?? '';

    // Parse the structured response
    const summaryMatch = content.match(/Summary:\s*\n?([^\n]+(?:\n(?!(?:Key Points:|Sources:|Confidence:|Uncertainties:))[^\n]+)*)/i);
    const keyPointsMatch = content.match(/Key Points:\s*\n?((?:- [^\n]*\n?)+)/i);
    const confidenceMatch = content.match(/Confidence:\s*([0-9.]+)/i);
    const sourcesMatch = content.match(/Sources[^:]*:\s*\n?((?:- [^\n]*\n?)+)/i);
    const uncertaintiesMatch = content.match(/Uncertainties:\s*\n?([^\n]+)/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : content;

    const keyPoints = keyPointsMatch
      ? keyPointsMatch[1]
          .split('\n')
          .map(line => line.replace(/^- /, '').trim())
          .filter(line => line.length > 0)
      : [];

    const confidence = confidenceMatch
      ? Math.min(1, Math.max(0, parseFloat(confidenceMatch[1])))
      : 0.5;

    const sourcesClaimed = sourcesMatch
      ? sourcesMatch[1]
          .split('\n')
          .map(line => line.replace(/^- /, '').trim())
          .filter(line => line.length > 0 && !line.toLowerCase().includes('omit'))
      : [];

    return {
      model,
      summary,
      keyPoints,
      confidence,
      sourcesClaimed,
      rawResponse: content,
    };
  }

  /**
   * Judge - synthesize multiple responses into final answer
   */
  private async judge(
    query: string,
    responses: NormalizedResponse[],
    critique?: string
  ): Promise<JudgeOutput> {
    const modelResponsesText = responses.map(r => `
Model: ${r.model}
Summary: ${r.summary}
Key Points: ${r.keyPoints.join(', ')}
Confidence: ${r.confidence}
`).join('\n---\n');

    const critiqueSection = critique ? `\n\nCritique Analysis:\n${critique}` : '';

    const judgePrompt = JUDGE_PROMPT_TEMPLATE
      .replace('{{query}}', query)
      .replace('{{modelResponsesText}}', modelResponsesText)
      .replace('{{critiqueSection}}', critiqueSection);

    const messages: ChatMessage[] = [
      { role: 'user', content: judgePrompt },
    ];

    const response = await this.callModel(this.judgeModel, messages, { maxTokens: 4000 });
    if (!response.choices || response.choices.length === 0) {
      console.error('[ResearchAgent] Judge response missing choices:', JSON.stringify(response).substring(0, 500));
      throw new Error('Judge model returned invalid response (no choices)');
    }
    // Some models return content in 'reasoning' field when content is null
    const message = response.choices[0]?.message;
    const content = message?.content ?? (message as any)?.reasoning ?? '';

    // Parse judge response
    const modelSummariesMatch = content.match(/Model Summaries:\s*\n?((?:- [^\n]*\n?)+)/i);
    const consensusMatch = content.match(/Consensus:\s*\n?((?:- [^\n]*\n?)+)/i);
    const disagreementsMatch = content.match(/Disagreements:\s*\n?((?:- [^\n]*\n?)+)/i);
    const finalAnswerMatch = content.match(/Final Answer:\s*\n?([^\n]+(?:\n(?!(?:Confidence:|Reasoning:|Model Summaries:))[^\n]+)*)/i);
    const confidenceMatch = content.match(/Confidence:\s*([0-9.]+)/i);
    const reasoningMatch = content.match(/Reasoning:\s*\n?([^\n]+(?:\n[^\n]+)*)/i);

    const modelSummaries = modelSummariesMatch
      ? modelSummariesMatch[1]
          .split('\n')
          .map(line => line.replace(/^- /, '').trim())
          .filter(line => line.length > 0)
      : [];

    const consensus = consensusMatch
      ? consensusMatch[1]
          .split('\n')
          .map(line => line.replace(/^- /, '').trim())
          .filter(line => line.length > 0)
      : [];

    const disagreements = disagreementsMatch
      ? disagreementsMatch[1]
          .split('\n')
          .map(line => line.replace(/^- /, '').trim())
          .filter(line => line.length > 0)
      : [];

    const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : content;

    const confidence = confidenceMatch
      ? Math.min(1, Math.max(0, parseFloat(confidenceMatch[1])))
      : 0.5;

    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

    return {
      modelSummaries,
      consensus,
      disagreements,
      finalAnswer,
      confidence,
      reasoning,
    };
  }

  /**
   * Critique pass - surface weaknesses when confidence is low
   */
  private async critiquePass(
    query: string,
    responses: NormalizedResponse[]
  ): Promise<string> {
    if (responses.length < 2) {
      return '';
    }

    const [modelA, modelB] = responses;

    const critiquePrompt = `You are a critical research reviewer.

Two AI-generated answers are provided below. Your task is to identify weaknesses
and help determine which is more reliable.

Instructions:
1. Identify factual claims in each answer that may be incorrect or unverifiable.
2. Identify logical gaps, missing context, or overconfident assertions.
3. Note if either answer appears to fabricate sources or statistics.
4. Recommend which answer is more reliable, or state if both are unreliable.

Answer A (from ${modelA.model}):
${modelA.summary}

Answer B (from ${modelB.model}):
${modelB.summary}

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
Reasoning: [Brief explanation]`;

    const messages: ChatMessage[] = [
      { role: 'user', content: critiquePrompt },
    ];

    try {
      const response = await this.callModel(this.judgeModel, messages, { maxTokens: 4000 });
      const message = response.choices?.[0]?.message;
      return message?.content ?? (message as any)?.reasoning ?? '';
    } catch (error) {
      console.error('[ResearchAgent] Critique pass error:', error);
      return '';
    }
  }
}

/**
 * Factory function to create a research agent
 */
export function createResearchAgent(options?: {
  bailianClient?: BailianClient;
  openrouterClient?: OpenRouterClient;
  judgeModel?: ModelName;
}): ResearchAgent {
  return new ResearchAgent(options);
}

// Export default
export default ResearchAgent;
