import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  NotFoundError,
  PayloadTooLargeError,
  RateLimitError,
  UpstreamError,
  ValidationError,
} from './errors.js';

describe('AppError subclasses', () => {
  it.each([
    { error: new ValidationError('bad'), status: 400, code: 'VALIDATION_ERROR' },
    { error: new NotFoundError('gone'), status: 404, code: 'NOT_FOUND' },
    { error: new PayloadTooLargeError('big'), status: 413, code: 'PAYLOAD_TOO_LARGE' },
    { error: new RateLimitError('slow'), status: 429, code: 'RATE_LIMITED' },
    { error: new UpstreamError('down'), status: 502, code: 'UPSTREAM_ERROR' },
  ])('$error.name → $status $code', ({ error, status, code }) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.name).toBe(error.constructor.name);
    expect(error).toBeInstanceOf(Error);
  });

  it('keeps the cause for logs', () => {
    const cause = new Error('socket hang up');
    expect(new UpstreamError('Air quality service unavailable', { cause }).cause).toBe(cause);
  });
});

describe('ValidationError.fromZod', () => {
  it('prefixes the first issue with its field path', () => {
    const result = z.object({ a: z.object({ b: z.number().min(1, 'b too small') }) }).safeParse({
      a: { b: 0 },
    });
    expect(ValidationError.fromZod(result.error ?? new z.ZodError([])).message).toBe(
      'a.b: b too small',
    );
  });

  it('uses the bare message for root-level issues', () => {
    const result = z.string({ error: 'expected text' }).safeParse(1);
    expect(ValidationError.fromZod(result.error ?? new z.ZodError([])).message).toBe(
      'expected text',
    );
  });

  it('falls back to a generic message when there are no issues', () => {
    expect(ValidationError.fromZod(new z.ZodError([])).message).toBe('Invalid request');
  });
});
