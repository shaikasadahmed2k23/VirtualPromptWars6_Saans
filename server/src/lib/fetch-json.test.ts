import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  fetchHanging,
  fetchRejecting,
  fetchResolving,
  httpOptions,
  jsonResponse,
} from '../test/fake-fetch.js';

import { UpstreamError } from './errors.js';
import { USER_AGENT, fetchJson, type FetchFn } from './fetch-json.js';

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

describe('fetchJson resilience', () => {
  const sequence = (...steps: (() => Promise<Response>)[]): ReturnType<typeof vi.fn<FetchFn>> => {
    const fetchFn = vi.fn<FetchFn>();
    for (const step of steps) {
      fetchFn.mockImplementationOnce(step);
    }
    return fetchFn;
  };
  const ok = (): Promise<Response> => Promise.resolve(jsonResponse({ value: 1 }));
  const status = (code: number) => (): Promise<Response> => Promise.resolve(jsonResponse({}, code));
  const dropped = (): Promise<Response> =>
    Promise.reject(
      new TypeError('fetch failed', {
        cause: Object.assign(new Error('read'), { code: 'ECONNRESET' }),
      }),
    );

  it('identifies itself with a descriptive User-Agent', async () => {
    const fetchFn = fetchResolving(() => jsonResponse({ value: 1 }));
    await call(fetchFn);
    expect(fetchFn.mock.calls[0]?.[1].headers['User-Agent']).toBe(USER_AGENT);
    expect(USER_AGENT).toMatch(/^Saans\/\d/);
  });

  it.each([
    ['429', status(429)],
    ['503', status(503)],
    ['a dropped connection', dropped],
  ])('retries once after %s and returns the second answer', async (_label, firstStep) => {
    const fetchFn = sequence(firstStep, ok);
    await expect(call(fetchFn)).resolves.toEqual({ value: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['404', status(404)],
    ['a malformed body', () => Promise.resolve(new Response('<html>'))],
  ])('does not retry %s', async (_label, step) => {
    const fetchFn = sequence(step, ok);
    await expect(call(fetchFn)).rejects.toBeInstanceOf(UpstreamError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a timeout', async () => {
    fetchHanging.mockClear();
    await expect(call(fetchHanging, 10)).rejects.toThrow('Test API timed out');
    expect(fetchHanging).toHaveBeenCalledTimes(1);
  });

  it('gives up after a single retry', async () => {
    const fetchFn = sequence(status(503), status(502), ok);
    await expect(call(fetchFn)).rejects.toThrow('Test API responded with status 502');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('waits a jittered delay and logs why, without the URL', async () => {
    const warn = vi.fn();
    const sleep = vi.fn(() => Promise.resolve());
    const options = {
      ...httpOptions(sequence(dropped, ok)),
      logger: { warn },
      sleep,
      random: () => 0.5,
    };
    await fetchJson(URL_UNDER_TEST, schema, { ...options, service: 'Test API' });
    expect(sleep).toHaveBeenCalledWith(500);
    expect(warn).toHaveBeenCalledTimes(1);
    const [details, message] = warn.mock.calls[0] as [Record<string, unknown>, string];
    expect(message).toBe('Retrying upstream call');
    expect(details).toMatchObject({
      service: 'Test API',
      delayMs: 500,
      failure: { cause: { name: 'TypeError', cause: { code: 'ECONNRESET' } } },
    });
    expect(JSON.stringify(details)).not.toContain('example.test');
  });
});
