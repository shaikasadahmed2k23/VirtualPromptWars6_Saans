import { z } from 'zod';

import type { GeoPlace } from '@saans/shared';

import { GeocodingUnavailableError, UpstreamError } from '../lib/errors.js';
import { fetchJson, type HttpClientOptions } from '../lib/fetch-json.js';

import type { GeocodingProvider } from './geocoding-provider.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const RESULT_COUNT = 5;
const SERVICE = 'Location search';

const responseSchema = z.object({
  // Open-Meteo omits `results` entirely when nothing matches.
  results: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string().min(1),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .default([]),
});

/** {@link GeocodingProvider} backed by the keyless Open-Meteo Geocoding API. */
export class OpenMeteoGeocodingProvider implements GeocodingProvider {
  /** @param http - Injected fetch and timeout. */
  constructor(private readonly http: HttpClientOptions) {}

  /**
   * Looks up to five places matching `query`.
   * @param query - Place name.
   * @returns Matches, best first; empty when nothing matches.
   * @throws {GeocodingUnavailableError} On timeout, network failure, bad status or an unexpected
   *   body; the underlying failure is kept as its `cause` for the logs.
   */
  async search(query: string): Promise<readonly GeoPlace[]> {
    const url = new URL(GEOCODING_URL);
    url.search = new URLSearchParams({
      name: query,
      count: String(RESULT_COUNT),
      language: 'en',
      format: 'json',
    }).toString();
    const { results } = await fetchJson(url, responseSchema, {
      ...this.http,
      service: SERVICE,
    }).catch((error: unknown) => {
      throw error instanceof UpstreamError
        ? new GeocodingUnavailableError('City search failed', { cause: error })
        : error;
    });
    return results.map((place) => ({
      id: place.id,
      name: place.name,
      region: place.admin1 ?? null,
      country: place.country ?? null,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  }
}
