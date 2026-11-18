import { ZodError } from 'zod';

import { AppError, UpstreamError } from '../lib/errors.js';

/** Why an AI attempt failed, in a form that is safe to log (no key, prompt or model output). */
export interface AiFailure {
  readonly reason: 'timeout' | 'http_error' | 'bad_json' | 'schema' | 'unknown_impact' | 'other';
  /** Class name of the underlying error, e.g. `ApiError`. */
  readonly errorClass: string;
  /** HTTP status when the API rejected the call. */
  readonly status?: number;
  /** For schema failures: where the output was wrong, as `path: code` pairs. */
  readonly issues?: readonly string[];
}

/** The Gemini call exceeded its time budget. */
export class AiTimeoutError extends UpstreamError {}

/** Gemini explained an impact id that the plan did not offer. */
export class AiUnknownImpactError extends UpstreamError {}

const MAX_ISSUES = 5;

const httpStatus = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
};

// The generator wraps its per-attempt failures in an AggregateError; the last one is the verdict.
const lastAttemptFailure = (thrown: unknown): unknown => {
  const cause = thrown instanceof Error ? thrown.cause : undefined;
  return cause instanceof AggregateError ? (cause.errors.at(-1) as unknown) : thrown;
};

/**
 * Classifies a failed Gemini attempt for the warn log.
 * @param thrown - Whatever the attempt (or the whole generator) threw.
 * @returns A loggable description; it never contains the prompt, the key or the model's text.
 */
export function classifyAiFailure(thrown: unknown): AiFailure {
  const error = lastAttemptFailure(thrown);
  const errorClass = error instanceof Error ? error.constructor.name : typeof error;
  if (error instanceof ZodError) {
    const issues = error.issues
      .slice(0, MAX_ISSUES)
      .map((issue) => `${issue.path.join('.')}: ${issue.code}`);
    return { reason: 'schema', errorClass, issues };
  }
  if (error instanceof SyntaxError) {
    return { reason: 'bad_json', errorClass };
  }
  if (error instanceof AiTimeoutError) {
    return { reason: 'timeout', errorClass };
  }
  if (error instanceof AiUnknownImpactError) {
    return { reason: 'unknown_impact', errorClass };
  }
  // Our own errors carry a `status` too (the one we would answer with); it is not Gemini's.
  const status = error instanceof AppError ? undefined : httpStatus(error);
  return status === undefined
    ? { reason: 'other', errorClass }
    : { reason: 'http_error', errorClass, status };
}
