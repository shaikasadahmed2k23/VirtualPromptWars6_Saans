import type { PlanContent } from '@saans/shared';

import type { GeminiThinkingLevel } from '../config.js';
import { createSystemClock, type Clock } from '../lib/clock.js';
import { UpstreamError } from '../lib/errors.js';
import type { InfoLogger } from '../lib/log.js';

import { AiTimeoutError, AiUnknownImpactError, classifyAiFailure } from './ai-failure.js';
import { GEMINI_RESPONSE_SCHEMA, geminiPlanSchema, toPlanContent } from './gemini-schema.js';
import type { PlanContext, PlanGenerator } from './plan-generator.js';
import { SYSTEM_INSTRUCTION, buildUserPrompt } from './prompt.js';

// Time budget for one Gemini call; two attempts must still fit a responsive request.
const GEMINI_TIMEOUT_MS = 8000;
// Total time all models together may take before the caller falls back to the offline plan.
const GEMINI_TOTAL_BUDGET_MS = 20_000;
// Low temperature: we want consistent, factual phrasing, not creativity.
const TEMPERATURE = 0.2;

/** The request shape this generator sends; matches `ai.models.generateContent` in `@google/genai`. */
export interface GenerateContentRequest {
  readonly model: string;
  readonly contents: string;
  readonly config: {
    readonly systemInstruction: string;
    readonly responseMimeType: 'application/json';
    readonly responseJsonSchema: unknown;
    readonly temperature: number;
    readonly abortSignal: AbortSignal;
    /** Present only when a thinking level is configured. */
    readonly thinkingConfig?: { readonly thinkingLevel: GeminiThinkingLevel };
  };
}

/** The Gemini call, injected so tests never reach the network. */
export type GenerateContentFn = (
  request: GenerateContentRequest,
) => Promise<{ text?: string | undefined }>;

/** Settings for {@link GeminiPlanGenerator}. */
export interface GeminiPlanGeneratorOptions {
  readonly generateContent: GenerateContentFn;
  /**
   * Model ids from configuration, tried in order, once each; never hardcoded. A lone model is
   * tried twice, since there is nothing else to fall back to.
   */
  readonly models: readonly string[];
  /** Time limit for one call. */
  readonly timeoutMs?: number;
  /** Time limit for all calls together. */
  readonly totalBudgetMs?: number;
  readonly clock?: Clock;
  /** Lowers reasoning time on models that think by default; omit to send no setting. */
  readonly thinkingLevel?: GeminiThinkingLevel;
  /**
   * Receives one warning per failed attempt (reason only; never the key, prompt or output) and
   * one note naming the model that served the plan.
   */
  readonly logger?: InfoLogger;
}

function parseOutput(text: string | undefined, context: PlanContext): PlanContent {
  const json: unknown = JSON.parse(text ?? '');
  const plan = geminiPlanSchema.parse(json);
  const known = new Set<string>(context.impacts.map((impact) => impact.id));
  const unknown = plan.impactExplanations.find(({ impactId }) => !known.has(impactId));
  if (unknown !== undefined) {
    throw new AiUnknownImpactError(`AI plan referenced an unknown impact id: ${unknown.impactId}`);
  }
  return toPlanContent(plan);
}

/** {@link PlanGenerator} that asks Gemini for structured JSON and validates it strictly. */
export class GeminiPlanGenerator implements PlanGenerator {
  /** @param options - Injected Gemini call, model id and timeout. */
  constructor(private readonly options: GeminiPlanGeneratorOptions) {}

  /**
   * Generates plan text with Gemini: each configured model in turn, each with its own timeout,
   * all within one overall budget, with strict validation.
   * @param context - Plan context; its numbers are the only ones the model may use.
   * @returns Validated plan content.
   * @throws {UpstreamError} When every attempt times out, fails, or returns invalid output.
   */
  async generate(context: PlanContext): Promise<PlanContent> {
    const clock = this.options.clock ?? createSystemClock();
    const deadline = clock.now() + (this.options.totalBudgetMs ?? GEMINI_TOTAL_BUDGET_MS);
    const { models } = this.options;
    const tries = models.length === 1 ? [...models, ...models] : models;
    const failures: unknown[] = [];
    for (const [index, model] of tries.entries()) {
      const timeoutMs = Math.min(
        this.options.timeoutMs ?? GEMINI_TIMEOUT_MS,
        deadline - clock.now(),
      );
      if (timeoutMs <= 0) {
        break;
      }
      const outcome = await this.tryModel({ model, attempt: index + 1 }, timeoutMs, context);
      if ('content' in outcome) {
        return outcome.content;
      }
      failures.push(outcome.error);
    }
    throw new UpstreamError('AI plan generation failed', { cause: new AggregateError(failures) });
  }

  private async tryModel(
    which: { readonly model: string; readonly attempt: number },
    timeoutMs: number,
    context: PlanContext,
  ): Promise<{ content: PlanContent } | { error: unknown }> {
    try {
      const content = await this.attempt(which.model, timeoutMs, context);
      this.options.logger?.info(which, 'Gemini plan generated');
      return { content };
    } catch (error) {
      this.options.logger?.warn({ ...classifyAiFailure(error), ...which }, 'Gemini attempt failed');
      return { error };
    }
  }

  private async attempt(
    model: string,
    timeoutMs: number,
    context: PlanContext,
  ): Promise<PlanContent> {
    const controller = new AbortController();
    const timedOut = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new AiTimeoutError(`AI plan timed out after ${String(timeoutMs)} ms`));
      });
    });
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    try {
      const request = this.options.generateContent({
        model,
        contents: buildUserPrompt(context),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: TEMPERATURE,
          abortSignal: controller.signal,
          ...(this.options.thinkingLevel === undefined
            ? {}
            : { thinkingConfig: { thinkingLevel: this.options.thinkingLevel } }),
        },
      });
      const response = await Promise.race([request, timedOut]);
      return parseOutput(response.text, context);
    } finally {
      clearTimeout(timer);
    }
  }
}
