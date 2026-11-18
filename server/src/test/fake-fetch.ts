import { vi, type Mock } from 'vitest';

import type { FetchFn, HttpClientOptions } from '../lib/fetch-json.js';

// Test doubles for `fetch`: tests never touch the network.

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const fetchResolving = (makeResponse: () => Response): Mock<FetchFn> =>
  vi.fn<FetchFn>(() => Promise.resolve(makeResponse()));

export const fetchRejecting = (error: Error): Mock<FetchFn> =>
  vi.fn<FetchFn>(() => Promise.reject(error));

// Never answers; rejects only when the caller aborts, like real fetch does.
export const fetchHanging = vi.fn<FetchFn>(
  (_url, { signal }) =>
    new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    }),
);

// Retries wait zero time so tests stay fast and deterministic.
export const httpOptions = (fetchFn: FetchFn, timeoutMs = 50): HttpClientOptions => ({
  fetchFn,
  timeoutMs,
  sleep: () => Promise.resolve(),
  random: () => 0,
});
