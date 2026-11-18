import type { z } from 'zod';

import { UpstreamError } from './errors.js';

/** Default time budget for one upstream HTTP call. */
export const UPSTREAM_TIMEOUT_MS = 5000;

/** The slice of `fetch` the providers use; injected so tests never touch the network. */
export type FetchFn = (url: URL, init: { signal: AbortSignal }) => Promise<Response>;

/** How to reach an upstream service. */
export interface HttpClientOptions {
  readonly fetchFn: FetchFn;
  readonly timeoutMs: number;
}

/** {@link HttpClientOptions} plus the human-readable service name used in error messages. */
export interface FetchJsonOptions extends HttpClientOptions {
  readonly service: string;
}

async function fetchBody(url: URL, options: FetchJsonOptions): Promise<unknown> {
  const { fetchFn, timeoutMs, service } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) {
      throw new UpstreamError(`${service} responded with status ${String(response.status)}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw error;
    }
    const reason = controller.signal.aborted ? 'timed out' : 'is unavailable';
    throw new UpstreamError(`${service} ${reason}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GETs a JSON document with a timeout and validates it against a zod schema.
 * @param url - Fully built request URL.
 * @param schema - Shape the response body must have.
 * @param options - Injected fetch, timeout and service name.
 * @returns The validated (and possibly transformed) body.
 * @throws {UpstreamError} On network failure, timeout, non-2xx status, invalid JSON or schema mismatch.
 */
export async function fetchJson<T>(
  url: URL,
  schema: z.ZodType<T>,
  options: FetchJsonOptions,
): Promise<T> {
  const body = await fetchBody(url, options);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new UpstreamError(`${options.service} returned an unexpected response`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}
