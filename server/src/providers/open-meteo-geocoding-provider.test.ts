import { describe, expect, it, vi } from 'vitest';

import type { GeoPlace } from '@saans/shared';

import { GeocodingUnavailableError } from '../lib/errors.js';
import { TtlCache } from '../lib/ttl-cache.js';
import { fetchHanging, fetchResolving, httpOptions, jsonResponse } from '../test/fake-fetch.js';

import {
  CachedGeocodingProvider,
  GEOCODE_CACHE_MAX_ENTRIES,
  GEOCODE_CACHE_TTL_MS,
  normalizeQuery,
  type GeocodingProvider,
} from './geocoding-provider.js';
import { OpenMeteoGeocodingProvider } from './open-meteo-geocoding-provider.js';

const delhiResult = {
  id: 1_273_294,
  name: 'Delhi',
  latitude: 28.65195,
  longitude: 77.23149,
  country: 'India',
  admin1: 'Delhi',
  population: 11_034_555,
};

describe('OpenMeteoGeocodingProvider', () => {
  it('searches by name for up to five matches', async () => {
    const fetchFn = fetchResolving(() => jsonResponse({ results: [delhiResult] }));
    await new OpenMeteoGeocodingProvider(httpOptions(fetchFn)).search('Delhi');
    const url = fetchFn.mock.calls[0]?.[0];
    expect(url?.href).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=Delhi&count=5&language=en&format=json',
    );
  });

  it('maps results and fills missing region/country with null', async () => {
    const village = { id: 2, name: 'Nowhere', latitude: 1, longitude: 2 };
    const fetchFn = fetchResolving(() => jsonResponse({ results: [delhiResult, village] }));
    await expect(new OpenMeteoGeocodingProvider(httpOptions(fetchFn)).search('x')).resolves.toEqual(
      [
        {
          id: 1_273_294,
          name: 'Delhi',
          region: 'Delhi',
          country: 'India',
          latitude: 28.65195,
          longitude: 77.23149,
        },
        { id: 2, name: 'Nowhere', region: null, country: null, latitude: 1, longitude: 2 },
      ],
    );
  });

  it('returns no matches when the API omits results', async () => {
    const fetchFn = fetchResolving(() => jsonResponse({ generationtime_ms: 0.4 }));
    await expect(
      new OpenMeteoGeocodingProvider(httpOptions(fetchFn)).search('zzzz'),
    ).resolves.toEqual([]);
  });

  it.each([
    ['times out', fetchHanging],
    ['sends malformed JSON', fetchResolving(() => new Response('nope'))],
    ['sends an unexpected shape', fetchResolving(() => jsonResponse({ results: [{ id: 'x' }] }))],
  ])('throws GeocodingUnavailableError when the API %s', async (_label, fetchFn) => {
    const error: unknown = await new OpenMeteoGeocodingProvider(httpOptions(fetchFn, 10))
      .search('Delhi')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GeocodingUnavailableError);
    expect(error).toMatchObject({ code: 'GEOCODING_UNAVAILABLE', message: 'City search failed' });
    expect((error as GeocodingUnavailableError).cause).toBeInstanceOf(Error);
  });
});

describe('CachedGeocodingProvider', () => {
  const place: GeoPlace = {
    id: 1,
    name: 'Delhi',
    region: null,
    country: 'India',
    latitude: 28.6,
    longitude: 77.2,
  };

  it('serves equivalent queries from one cached lookup', async () => {
    const inner = { search: vi.fn<GeocodingProvider['search']>(() => Promise.resolve([place])) };
    const cache = new TtlCache<string, readonly GeoPlace[]>({
      ttlMs: GEOCODE_CACHE_TTL_MS,
      maxEntries: GEOCODE_CACHE_MAX_ENTRIES,
      clock: { now: () => 0 },
    });
    const provider = new CachedGeocodingProvider(inner, cache);
    await expect(provider.search('  New   Delhi ')).resolves.toEqual([place]);
    await expect(provider.search('new delhi')).resolves.toEqual([place]);
    expect(inner.search).toHaveBeenCalledTimes(1);
    expect(inner.search).toHaveBeenCalledWith('new delhi');
  });
});

describe('normalizeQuery', () => {
  it('trims, collapses whitespace and lower-cases', () => {
    expect(normalizeQuery('  Navi\tMUMBAI  ')).toBe('navi mumbai');
  });
});
