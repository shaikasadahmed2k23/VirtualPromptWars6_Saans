import type { PlanContent } from '@saans/shared';

import { UpstreamError } from '../lib/errors.js';
import type { WarnLogger } from '../lib/log.js';

import { AiTimeoutError, AiUnknownImpactError, classifyAiFailure } from './ai-failure.js';
import { GEMINI_RESPONSE_SCHEMA, geminiPlanSchema, toPlanContent } from './gemini-schema.js';
import type { PlanContext, PlanGenerator } from './plan-generator.js';
import { SYSTEM_INSTRUCTION, buildUserPrompt } from './prompt.js';

/** Time budget for one Gemini call; two attempts must still fit a responsive request. */
export const GEMINI_TIMEOUT_MS = 8000;
/** One retry after the first failure, then the caller falls back. */
export const GEMINI_MAX_ATTEMPTS = 2;
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
    readonly thinkingConfig?: { readonly thinkingLevel: ThinkingLevel };
  };
}

/** Reasoning effort requested from thinking-capable models. */
export type ThinkingLevel = 'low' | 'medium' | 'high';

/** The Gemini call, injected so tests never reach the network. */
export type GenerateContentFn = (
  request: GenerateContentRequest,
) => Promise<{ text?: string | undefined }>;

/** Settings for {@link GeminiPlanGenerator}. */
export interface GeminiPlanGeneratorOptions {
  readonly generateContent: GenerateContentFn;
  /** Model id from configuration (`GEMINI_MODEL`); never hardcoded. */
  readonly model: string;
  readonly timeoutMs?: number;
  /** Lowers reasoning time on models that think by default; omit to send no setting. */
  readonly thinkingLevel?: ThinkingLevel;
  /** Receives one warning per failed attempt (reason only; never the key, prompt or output). */
  readonly logger?: WarnLogger;
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
   * Generates plan text with Gemini: timeout per attempt, one retry, strict validation.
   * @param context - Plan context; its numbers are the only ones the model may use.
   * @returns Validated plan content.
   * @throws {UpstreamError} When every attempt times out, fails, or returns invalid output.
   */
  async generate(context: PlanContext): Promise<PlanContent> {
    const failures: unknown[] = [];
    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.attempt(context);
      } catch (error) {
        failures.push(error);
        this.options.logger?.warn(
          { ...classifyAiFailure(error), attempt: attempt + 1, model: this.options.model },
          'Gemini attempt failed',
        );
      }
    }
    throw new UpstreamError('AI plan generation failed', { cause: new AggregateError(failures) });
  }

  private async attempt(context: PlanContext): Promise<PlanContent> {
    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? GEMINI_TIMEOUT_MS;
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
        model: this.options.model,
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
