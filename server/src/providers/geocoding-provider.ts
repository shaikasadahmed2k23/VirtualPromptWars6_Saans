import { HOURS_PER_DAY, MS_PER_HOUR, type GeoPlace } from '@saans/shared';

import type { TtlCache } from '../lib/ttl-cache.js';

/** City coordinates practically never change; a day keeps repeat searches free. */
export const GEOCODE_CACHE_TTL_MS = HOURS_PER_DAY * MS_PER_HOUR;
/** Upper bound on cached search strings. */
export const GEOCODE_CACHE_MAX_ENTRIES = 1000;

/** Resolves a place name to candidate coordinates. */
export interface GeocodingProvider {
  /**
   * Searches for places matching a name.
   * @throws {UpstreamError} When the search cannot be performed.
   */
  search(query: string): Promise<readonly GeoPlace[]>;
}

/**
 * Canonical form of a search string, so "Delhi " and "delhi" share a cache entry.
 * @param query - Raw user input.
 * @returns Trimmed, whitespace-collapsed, lower-cased query.
 */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Decorates a {@link GeocodingProvider} with a TTL cache keyed by the normalized query. */
export class CachedGeocodingProvider implements GeocodingProvider {
  /**
   * @param inner - Provider that does the real lookup.
   * @param cache - Cache shared by all requests.
   */
  constructor(
    private readonly inner: GeocodingProvider,
    private readonly cache: TtlCache<string, readonly GeoPlace[]>,
  ) {}

  /**
   * Serves cached matches, searching on a miss.
   * @param query - Place name.
   * @returns Matching places, best first.
   * @throws {UpstreamError} When the inner provider fails (failures are not cached).
   */
  search(query: string): Promise<readonly GeoPlace[]> {
    const normalized = normalizeQuery(query);
    return this.cache.getOrLoad(normalized, () => this.inner.search(normalized));
  }
}
