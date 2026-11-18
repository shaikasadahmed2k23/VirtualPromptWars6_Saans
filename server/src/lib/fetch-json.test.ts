import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  fetchHanging,
  fetchRejecting,
  fetchResolving,
  httpOptions,
  jsonResponse,
} from '../test/fake-fetch.js';

import { UpstreamError } from './errors.js';
import { fetchJson, type FetchFn } from './fetch-json.js';

const URL_UNDER_TEST = new URL('https://example.test/data');
const schema = z.object({ value: z.number() });

const call = (fetchFn: FetchFn, timeoutMs?: number): Promise<{ value: number }> =>
  fetchJson(URL_UNDER_TEST, schema, { ...httpOptions(fetchFn, timeoutMs), service: 'Test API' });

describe('fetchJson', () => {
  it('returns the validated body and passes an abort signal', async () => {
    const fetchFn = fetchResolving(() => jsonResponse({ value: 7 }));
    await expect(call(fetchFn)).resolves.toEqual({ value: 7 });
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(URL_UNDER_TEST);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['times out', () => call(fetchHanging, 10), 'Test API timed out'],
    [
      'network error',
      () => call(fetchRejecting(new TypeError('fetch failed'))),
      'Test API is unavailable',
    ],
    [
      'non-2xx status',
      () => call(fetchResolving(() => jsonResponse({}, 503))),
      'Test API responded with status 503',
    ],
    [
      'malformed JSON',
      () => call(fetchResolving(() => new Response('<html>'))),
      'Test API is unavailable',
    ],
    [
      'unexpected shape',
      () => call(fetchResolving(() => jsonResponse({ value: 'x' }))),
      'Test API returned an unexpected response',
    ],
  ])('throws UpstreamError when the upstream %s', async (_label, run, message) => {
    const error: unknown = await run().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).message).toBe(message);
  });
});
