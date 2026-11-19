import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { UpstreamError, ValidationError } from '../lib/errors.js';

import { AiTimeoutError, classifyAiFailure } from './ai-failure.js';

class FakeSdkError extends Error {
  constructor(readonly status: number) {
    super('quota exceeded');
  }
}

// What GeminiPlanGenerator throws once every attempt has failed.
const generatorFailure = (...attempts: unknown[]): UpstreamError =>
  new UpstreamError('AI plan generation failed', { cause: new AggregateError(attempts) });

describe('classifyAiFailure', () => {
  it('classifies a whole-generator failure by its last attempt', () => {
    const failure = generatorFailure(new AiTimeoutError('slow'), new FakeSdkError(429));
    expect(classifyAiFailure(failure)).toEqual({
      reason: 'http_error',
      errorClass: 'FakeSdkError',
      status: 429,
    });
  });

  it('logs schema failures by issue code, never by message', () => {
    const parsed = z.strictObject({ summary: z.string() }).safeParse({ summary: 1, leak: 'x' });
    const failure = classifyAiFailure(parsed.error);
    expect(failure).toMatchObject({ reason: 'schema', errorClass: 'ZodError' });
    expect(failure.issues).toEqual(['summary: invalid_type', ': unrecognized_keys']);
  });

  it('ignores the status our own errors carry, since it is not Gemini’s', () => {
    expect(classifyAiFailure(new ValidationError('bad'))).toEqual({
      reason: 'other',
      errorClass: 'ValidationError',
    });
  });

  it('describes a thrown non-Error by its type', () => {
    expect(classifyAiFailure('boom')).toEqual({ reason: 'other', errorClass: 'string' });
  });
});
