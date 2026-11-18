import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { describeFailure } from './failure-detail.js';

describe('describeFailure', () => {
  it('keeps what JSON.stringify(new Error()) throws away', () => {
    expect(JSON.stringify(new Error('boom'))).toBe('{}');
    expect(describeFailure(new RangeError('boom'))).toEqual({
      name: 'RangeError',
      message: 'boom',
    });
  });

  it('follows the cause chain to the system error fetch hides', () => {
    const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const detail = describeFailure(new TypeError('fetch failed', { cause: reset }));
    expect(detail).toEqual({
      name: 'TypeError',
      message: 'fetch failed',
      cause: { name: 'Error', message: 'read ECONNRESET', code: 'ECONNRESET' },
    });
  });

  it('keeps a numeric HTTP status', () => {
    const error = Object.assign(new Error('rejected'), { status: 429 });
    expect(describeFailure(error)).toMatchObject({ status: 429 });
  });

  it('reports zod issues by path and message, never the offending value', () => {
    const parsed = z.object({ id: z.number() }).safeParse({ id: 'secret-value' });
    const detail = describeFailure(parsed.error);
    expect(detail.issues).toEqual(['id: Invalid input: expected number, received string']);
    expect(JSON.stringify(detail)).not.toContain('secret-value');
  });

  it('caps depth and message length', () => {
    let error = new Error('x'.repeat(500));
    for (let level = 0; level < 6; level += 1) {
      error = new Error(`level ${String(level)}`, { cause: error });
    }
    const detail = describeFailure(error);
    expect(detail.cause?.cause?.cause?.cause).toBeUndefined();
    expect(describeFailure(new Error('y'.repeat(500))).message).toHaveLength(200);
  });

  it('describes non-Error throws without dumping them', () => {
    expect(describeFailure({ token: 'abc' })).toEqual({ name: 'object', message: '' });
    expect(describeFailure('oops')).toEqual({ name: 'string', message: '' });
  });
});
