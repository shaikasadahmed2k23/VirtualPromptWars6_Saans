import type { z } from 'zod';

import {
  airResponseSchema,
  apiErrorSchema,
  geocodeResponseSchema,
  planResponseSchema,
  type AirResponse,
  type ApiErrorCode,
  type CoordinatesInput,
  type GeoPlace,
  type PlanResponse,
  type UserProfile,
} from '@saans/shared';

/** Why a request failed: a server error code, or a client-side network/contract problem. */
export type ApiFailure = ApiErrorCode | 'NETWORK_ERROR' | 'BAD_RESPONSE';

/** A failed API call. `code` drives which translated message the UI shows. */
export class ApiError extends Error {
  /**
   * @param code - Machine-readable failure reason.
   * @param message - Developer-facing detail (the UI shows a translated message instead).
   */
  constructor(
    readonly code: ApiFailure,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Typed access to the Saans API. Every response is validated against the shared schemas. */
export interface ApiClient {
  getAir(coordinates: CoordinatesInput, signal?: AbortSignal): Promise<AirResponse>;
  geocode(query: string, signal?: AbortSignal): Promise<readonly GeoPlace[]>;
  createPlan(profile: UserProfile, signal?: AbortSignal): Promise<PlanResponse>;
}

/** The subset of `fetch` the client uses. */
export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new ApiError('BAD_RESPONSE', `Response was not JSON: ${String(error)}`);
  }
}

async function send(fetchFn: FetchFn, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch (error) {
    if (init.signal?.aborted === true) {
      throw error;
    }
    throw new ApiError('NETWORK_ERROR', `Request failed: ${String(error)}`);
  }
}

interface Call<T> {
  readonly url: string;
  readonly schema: z.ZodType<T>;
  readonly init: RequestInit;
}

async function request<T>(fetchFn: FetchFn, { url, schema, init }: Call<T>): Promise<T> {
  const response = await send(fetchFn, url, init);
  const body = await readJson(response);
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(body);
    const code = parsedError.success ? parsedError.data.error.code : 'BAD_RESPONSE';
    throw new ApiError(code, `HTTP ${String(response.status)}`);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('BAD_RESPONSE', parsed.error.message);
  }
  return parsed.data;
}

const withSignal = (init: RequestInit, signal?: AbortSignal): RequestInit =>
  signal === undefined ? init : { ...init, signal };

const query = (params: Record<string, string>): string => new URLSearchParams(params).toString();

const GET: RequestInit = { method: 'GET', headers: { Accept: 'application/json' } };

/**
 * Creates an API client bound to a fetch implementation.
 * @param fetchFn - Usually `window.fetch`; tests pass a fake.
 * @returns The client.
 */
export function createApiClient(fetchFn: FetchFn): ApiClient {
  return {
    getAir: ({ latitude, longitude }, signal) =>
      request(fetchFn, {
        url: `/api/air?${query({ lat: String(latitude), lon: String(longitude) })}`,
        schema: airResponseSchema,
        init: withSignal(GET, signal),
      }),
    geocode: async (q, signal) => {
      const { results } = await request(fetchFn, {
        url: `/api/geocode?${query({ q })}`,
        schema: geocodeResponseSchema,
        init: withSignal(GET, signal),
      });
      return results;
    },
    createPlan: (profile, signal) =>
      request(fetchFn, {
        url: '/api/plan',
        schema: planResponseSchema,
        init: withSignal(
          {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile }),
          },
          signal,
        ),
      }),
  };
}
