import type { z } from 'zod';

import { UpstreamError } from './errors.js';
import { describeFailure } from './failure-detail.js';
import type { WarnLogger } from './log.js';

/** Default time budget for one upstream HTTP call. */
export const UPSTREAM_TIMEOUT_MS = 5000;

/** Tells the upstream who is calling, so it can contact us or tell us apart from abusive traffic. */
export const USER_AGENT =
  'Saans/1.0 (air-quality planner; +https://virtualpromptwars6-saans.onrender.com)';

const RETRY_BASE_MS = 300;
const RETRY_JITTER_MS = 400;
const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR_MIN = 500;

/** The slice of `fetch` the providers use; injected so tests never touch the network. */
export type FetchFn = (
  url: URL,
  init: { signal: AbortSignal; headers: Record<string, string> },
) => Promise<Response>;

/** How to reach an upstream service. */
export interface HttpClientOptions {
  readonly fetchFn: FetchFn;
  readonly timeoutMs: number;
  /** Records each retry; omit to retry silently. */
  readonly logger?: WarnLogger;
  /** Waits before a retry; injected so tests do not sleep. Defaults to `setTimeout`. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Source of backoff jitter in [0, 1). Defaults to `Math.random`. */
  readonly random?: () => number;
}

/** {@link HttpClientOptions} plus the human-readable service name used in error messages. */
export interface FetchJsonOptions extends HttpClientOptions {
  readonly service: string;
}

/** A failure that is worth one more try: a dropped connection, 429 or a 5xx. */
class RetryableUpstreamError extends UpstreamError {}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableStatus = (status: number): boolean =>
  status === TOO_MANY_REQUESTS || status >= SERVER_ERROR_MIN;

function statusError(service: string, status: number): UpstreamError {
  const Failure = isRetryableStatus(status) ? RetryableUpstreamError : UpstreamError;
  return new Failure(`${service} responded with status ${String(status)}`);
}

async function fetchBody(url: URL, options: FetchJsonOptions): Promise<unknown> {
  const { fetchFn, timeoutMs, service } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw statusError(service, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw error;
    }
    const timedOut = controller.signal.aborted;
    // A bad body will not improve on a retry, and a timeout already used the whole budget.
    const Failure =
      timedOut || error instanceof SyntaxError ? UpstreamError : RetryableUpstreamError;
    throw new Failure(`${service} ${timedOut ? 'timed out' : 'is unavailable'}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBodyWithRetry(url: URL, options: FetchJsonOptions): Promise<unknown> {
  try {
    return await fetchBody(url, options);
  } catch (error) {
    if (!(error instanceof RetryableUpstreamError)) {
      throw error;
    }
    const { logger, sleep = defaultSleep, random = Math.random, service } = options;
    const delayMs = Math.round(RETRY_BASE_MS + random() * RETRY_JITTER_MS);
    logger?.warn({ service, delayMs, failure: describeFailure(error) }, 'Retrying upstream call');
    await sleep(delayMs);
    return fetchBody(url, options);
  }
}

/**
 * GETs a JSON document with a timeout and validates it against a zod schema. A dropped
 * connection, 429 or 5xx is retried once after a short randomised delay.
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
  const body = await fetchBodyWithRetry(url, options);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new UpstreamError(`${options.service} returned an unexpected response`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}
