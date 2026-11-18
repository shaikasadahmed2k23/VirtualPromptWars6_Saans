import { ZodError } from 'zod';

import { AppError, UpstreamError } from '../lib/errors.js';
import { statusOf, summarizeIssues } from '../lib/failure-detail.js';

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

// The generator wraps its per-attempt failures in an AggregateError; the last one is the verdict.
const lastAttemptFailure = (thrown: unknown): unknown => {
  const cause = thrown instanceof Error ? thrown.cause : undefined;
  if (!(cause instanceof AggregateError)) {
    return thrown;
  }
  const attempts: readonly unknown[] = cause.errors;
  return attempts.at(-1);
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
    // Issue codes only: a zod message can quote the model's output.
    return { reason: 'schema', errorClass, issues: summarizeIssues(error, (issue) => issue.code) };
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
  const status = error instanceof AppError ? undefined : statusOf(error);
  return status === undefined
    ? { reason: 'other', errorClass }
    : { reason: 'http_error', errorClass, status };
}
