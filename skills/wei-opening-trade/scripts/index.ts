#!/usr/bin/env bun
// Entry point for multi-model-researcher skill.
// Requires Bun (https://bun.sh) for native TypeScript execution.

import { readFileSync } from 'fs';

/**
 * Multi-Model Researcher - Main Entry Point
 *
 * Provides a clean API interface for the multi-model researcher skill.
 * Handles input/output validation and provides both programmatic and CLI interfaces.
 */

import { createResearchAgent } from './agent.js';
import { BailianClient, OpenRouterClient } from './clients/index.js';
import {
  getCurrentSession,
  buildAnalysisPrompt,
  formatAnalysisResult,
} from './trade.js';
import type {
  ResearchRequest,
  ResearchResponse,
  ModelName,
} from './agent.js';

// Re-export types
export type {
  ResearchRequest,
  ResearchResponse,
  ModelName,
  NormalizedResponse,
  FailedModel,
} from './agent.js';

export { ResearchAgent, createResearchAgent } from './agent.js';
export { BailianClient, OpenRouterClient, BAILIAN_MODELS, OPENROUTER_MODELS } from './clients/index.js';

/** Client configuration options */
export interface ClientConfig {
  bailianApiKey?: string;
  bailianBaseUrl?: string;
  openrouterApiKey?: string;
  openrouterBaseUrl?: string;
}

/** Research options */
export interface ResearchOptions {
  /** Force specific models (bypasses router) */
  models?: ModelName[];
  /** Maximum number of models to query (default: 2) */
  maxModels?: number;
  /** Depth mode: 'simple' or 'tree' (default: 'simple') */
  depth?: 'simple' | 'tree';
  /** Judge model to use for synthesis (default: 'glm-5') */
  judgeModel?: ModelName;
  /** Question domain — when 'financial', uses a finance-specific judge prompt */
  domain?: string;
}

/**
 * Main research function - query multiple models and synthesize responses
 *
 * @param query - The research question to analyze
 * @param options - Optional configuration
 * @returns Research response with synthesized answer
 *
 * @example
 * ```typescript
 * const result = await research('What are the economic impacts of AI agents?');
 * console.log(result.finalAnswer);
 * console.log(`Confidence: ${result.confidence}`);
 * ```
 */
export async function research(
  query: string,
  options?: ResearchOptions
): Promise<ResearchResponse> {
  // Validate input
  if (!query || typeof query !== 'string') {
    throw new ResearchError('Query is required and must be a string', 'INVALID_INPUT');
  }

  if (query.trim().length === 0) {
    throw new ResearchError('Query cannot be empty', 'INVALID_INPUT');
  }

  // Build request
  const request: ResearchRequest = {
    query: query.trim(),
    models: options?.models,
    maxModels: options?.maxModels,
    depth: options?.depth ?? 'simple',
    domain: options?.domain,
  };

  // Create agent with optional client configuration
  const agent = createResearchAgent({
    judgeModel: options?.judgeModel,
  });

  // Execute research
  return await agent.research(request);
}

/**
 * Research with custom clients - use when you need to configure API keys or endpoints
 *
 * @param query - The research question
 * @param clientConfig - Client configuration for Bailian and OpenRouter
 * @param options - Optional research options
 * @returns Research response
 *
 * @example
 * ```typescript
 * const result = await researchWithClients(
 *   'What are the latest AI breakthroughs?',
 *   {
 *     bailianApiKey: 'your-bailian-key',
 *     openrouterApiKey: 'your-openrouter-key',
 *   }
 * );
 * ```
 */
export async function researchWithClients(
  query: string,
  clientConfig: ClientConfig,
  options?: ResearchOptions
): Promise<ResearchResponse> {
  // Validate input
  if (!query || typeof query !== 'string') {
    throw new ResearchError('Query is required and must be a string', 'INVALID_INPUT');
  }

  // Create custom clients
  const bailianClient = clientConfig.bailianApiKey
    ? new BailianClient({
        apiKey: clientConfig.bailianApiKey,
        baseUrl: clientConfig.bailianBaseUrl,
      })
    : new BailianClient();

  const openrouterClient = clientConfig.openrouterApiKey
    ? new OpenRouterClient({
        apiKey: clientConfig.openrouterApiKey,
        baseUrl: clientConfig.openrouterBaseUrl,
      })
    : new OpenRouterClient();

  // Build request
  const request: ResearchRequest = {
    query: query.trim(),
    models: options?.models,
    maxModels: options?.maxModels,
    depth: options?.depth ?? 'simple',
    domain: options?.domain,
  };

  // Create agent with custom clients
  const agent = createResearchAgent({
    bailianClient,
    openrouterClient,
    judgeModel: options?.judgeModel,
  });

  // Execute research
  return await agent.research(request);
}

/**
 * Quick research - simplified interface for simple queries
 *
 * @param query - The research question
 * @returns The synthesized answer string
 *
 * @example
 * ```typescript
 * const answer = await quickResearch('What is quantum computing?');
 * console.log(answer);
 * ```
 */
export async function quickResearch(query: string): Promise<string> {
  const result = await research(query);
  return result.judgeRaw || 'No result available';
}

/**
 * Research with specific models - bypass router and use specified models
 *
 * @param query - The research question
 * @param models - Array of model names to use
 * @returns Research response
 *
 * @example
 * ```typescript
 * const result = await researchWithModels(
 *   'Explain neural networks',
 *   ['glm-5', 'kimi-k2.5']
 * );
 * ```
 */
export async function researchWithModels(
  query: string,
  models: ModelName[]
): Promise<ResearchResponse> {
  if (!models || models.length === 0) {
    throw new ResearchError('At least one model must be specified', 'INVALID_INPUT');
  }

  return await research(query, { models });
}

/**
 * Custom error class for research operations
 */
export class ResearchError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ResearchError';
    this.code = code;
  }
}

/**
 * Format research response for display
 *
 * @param response - Research response object
 * @returns Formatted string
 */
export function formatResearchResponse(response: ResearchResponse): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('MULTI-MODEL RESEARCH RESULT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Query: ${response.query}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('MODEL ANSWERS');
  lines.push('-'.repeat(60));
  response.answers.forEach(answer => {
    lines.push(`\n[${answer.model}]`);
    lines.push(`Summary: ${answer.summary}`);
    lines.push(`Key Points: ${answer.keyPoints.join(', ')}`);
    lines.push(`Confidence: ${(answer.confidence * 100).toFixed(1)}%`);
  });
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('FINAL ANSWER');
  lines.push('-'.repeat(60));
  lines.push(response.judgeRaw || 'No synthesis available');
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push(`Models Used: ${response.modelsUsed.join(', ')}`);

  if (response.modelsFailed && response.modelsFailed.length > 0) {
    lines.push(`Models Failed: ${response.modelsFailed.map(m => `${m.model} (${m.reason})`).join(', ')}`);
  }

  if (response.warning) {
    lines.push('');
    lines.push(`⚠️  Warning: ${response.warning}`);
  }

  if (response.error) {
    lines.push('');
    lines.push(`❌ Error: ${response.error}`);
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Export individual model answers
 *
 * @param response - Research response object
 * @returns Array of individual model responses
 */
export function getIndividualAnswers(response: ResearchResponse): Array<{
  model: ModelName;
  summary: string;
  keyPoints: string[];
  confidence: number;
}> {
  return response.answers.map(answer => ({
    model: answer.model,
    summary: answer.summary,
    keyPoints: answer.keyPoints,
    confidence: answer.confidence,
  }));
}

/**
 * Opening Trade Analysis - Analyze stock opening strategy
 *
 * @param query - User query containing stock name/code, real-time quote data, and context
 * @returns Formatted analysis report
 *
 * @example
 * ```typescript
 * // Query should include stock info and quote data from mx_finance_data skill
 * const result = await analyzeOpeningTrade("分析茅台(600519)今日开盘，当前价1670元，涨幅1.2%，成交量2.5万手");
 * console.log(result);
 * ```
 */
export async function analyzeOpeningTrade(query: string): Promise<string> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       Wei Opening Trade - 开盘交易决策分析启动');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Validate input
  if (!query || query.trim().length === 0) {
    throw new ResearchError('Query is required', 'INVALID_INPUT');
  }

  console.log('[Step 1/3] 分析查询内容...');
  console.log(`  查询: ${query.substring(0, 80)}${query.length > 80 ? '...' : ''}`);
  console.log('  提示: 推荐先使用 mx_finance_data skill 获取实时行情，再将数据传入\n');

  // Step 2: Determine trading session (based on current time)
  console.log('[Step 2/3] 判断交易时段...');
  // Default to A-share for session determination
  const { session, config: sessionConfig } = getCurrentSession('a-share');
  console.log(`  当前时段: ${sessionConfig.name} (${sessionConfig.start}-${sessionConfig.end})`);
  console.log(`  分析重点: ${sessionConfig.analysisFocus.join(', ')}\n`);

  // Step 3: Build analysis prompt and perform multi-model analysis
  console.log('[Step 3/3] 启动多模型交叉分析...');

  // Build the analysis prompt with user query as background
  const analysisPrompt = buildAnalysisPrompt(query, session, sessionConfig);

  // Use research function with opening-trade domain for stock analysis
  const researchResult = await research(analysisPrompt, {
    models: ['kimi-k2.5', 'qwen3.5'],
    domain: 'opening-trade',
  });

  // Format and return result
  const finalAnswer = researchResult.judgeRaw || '分析结果不可用';
  const formattedResult = formatAnalysisResult(
    finalAnswer,
    sessionConfig
  );

  return formattedResult;
}

// CLI entry point - only run if executed directly
const isMainModule = process.argv[1]?.includes('index.ts') ||
                     process.argv[1]?.includes('index.js') ||
                     process.argv[1]?.includes('dist/index');

if (isMainModule) {
  (async () => {
    const args = process.argv.slice(2);

    // Show help
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Multi-Model Researcher CLI & Opening Trade Analysis

Usage:
  bun run scripts/index.ts [options] "Your research question"
  bun run scripts/index.ts --trade "分析股票开盘策略"

Options:
  -h, --help              Show this help message
  -m, --models <models>   Comma-separated list of models (e.g., glm-5,kimi-k2.5)
  -d, --domain <domain>   Question domain (e.g., financial). When 'financial', uses finance-specific judge.
  -j, --json              Output as JSON
  -v, --verbose           Show detailed output including individual model responses
  --trade                 Enable opening trade analysis mode

Examples:
  bun run scripts/index.ts "What are the economic impacts of AI?"
  bun run scripts/index.ts -m glm-5,gpt-5.4 "Explain quantum computing"
  bun run scripts/index.ts --domain financial "Will the Fed cut rates in 2026?"
  bun run scripts/index.ts --trade "分析茅台今日开盘"
  bun run scripts/index.ts --trade "腾讯控股，关注游戏政策"
`);
      process.exit(0);
    }

    // Parse arguments
    let query = '';
    let models: ModelName[] | undefined;
    let domain: string | undefined;
    let outputJson = false;
    let verbose = false;
    let tradeMode = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '-m' || arg === '--models') {
        const modelStr = args[++i];
        if (modelStr) {
          models = modelStr.split(',') as ModelName[];
        }
      } else if (arg === '-d' || arg === '--domain') {
        domain = args[++i];
      } else if (arg === '-j' || arg === '--json') {
        outputJson = true;
      } else if (arg === '-v' || arg === '--verbose') {
        verbose = true;
      } else if (arg === '--trade') {
        tradeMode = true;
      } else if (!arg.startsWith('-') && !query) {
        query = arg;
      }
    }

    // Collect remaining args as query if not set
    if (!query && args.length > 0) {
      const lastArg = args[args.length - 1];
      if (!lastArg.startsWith('-')) {
        query = lastArg;
      }
    }

    if (!query) {
      console.error('Error: No query provided. Use --help for usage information.');
      process.exit(1);
    }

    try {
      // Check if trade mode is enabled
      if (tradeMode) {
        console.log(`开盘交易分析: "${query}"`);
        console.log('');

        const result = await analyzeOpeningTrade(query);
        console.log(result);
        process.exit(0);
      }

      console.log(`Researching: "${query}"`);
      if (models) {
        console.log(`Using models: ${models.join(', ')}`);
      }
      console.log('');

      const result = await research(query, { models, domain });

      if (outputJson) {
        console.log(JSON.stringify(result, null, 2));
      } else if (verbose) {
        console.log(formatResearchResponse(result));
      } else if (result.reportPath) {
        // Output report content directly (format defined in judge.txt)
        console.log(readFileSync(result.reportPath, 'utf-8'));
      } else if (result.judgeRaw) {
        console.log(result.judgeRaw);
      } else {
        console.log('No result available');
      }

      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  })();
}

// Default export
export default {
  research,
  researchWithClients,
  quickResearch,
  researchWithModels,
  formatResearchResponse,
  getIndividualAnswers,
  ResearchError,
  analyzeOpeningTrade,
};
