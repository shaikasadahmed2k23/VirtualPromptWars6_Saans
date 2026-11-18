import { describe, expect, it, vi } from 'vitest';

import { geoPlaceSchema, type GeoPlace } from '@saans/shared';

import { GeocodingUnavailableError } from '../lib/errors.js';

import type { GeocodingProvider } from './geocoding-provider.js';
import { INDIAN_CITIES } from './indian-cities.js';
import { StaticFirstGeocodingProvider } from './static-city-geocoding-provider.js';

const upstreamPlace: GeoPlace = {
  id: 7,
  name: 'Smallville',
  region: null,
  country: 'India',
  latitude: 20,
  longitude: 80,
};

const setup = (upstreamSearch?: GeocodingProvider['search']) => {
  const search = vi.fn<GeocodingProvider['search']>(
    upstreamSearch ?? (() => Promise.resolve([upstreamPlace])),
  );
  return { search, provider: new StaticFirstGeocodingProvider({ search }) };
};

describe('INDIAN_CITIES', () => {
  it('lists at least 100 distinct cities inside India’s bounding box', () => {
    const names = INDIAN_CITIES.map((city) => city.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(100);
    for (const { lat, lon } of INDIAN_CITIES) {
      expect(lat).toBeGreaterThan(6);
      expect(lat).toBeLessThan(37);
      expect(lon).toBeGreaterThan(68);
      expect(lon).toBeLessThan(98);
    }
  });
});

describe('StaticFirstGeocodingProvider', () => {
  it('answers a bundled city without calling the upstream', async () => {
    const { provider, search } = setup();
    const [first, ...rest] = await provider.search('  DELHI ');
    expect(first).toMatchObject({ name: 'Delhi', region: 'Delhi', country: 'India' });
    expect(first?.latitude).toBeCloseTo(28.61, 2);
    expect(rest).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('returns schema-valid places with ids that cannot clash with the upstream', async () => {
    const { provider } = setup();
    const places = await provider.search('Mumbai');
    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(geoPlaceSchema.parse(place).id).toBeLessThan(0);
    }
  });

  it.each([
    ['new delhi', 'Delhi'],
    ['Bangalore', 'Bengaluru'],
    ['allahabad', 'Prayagraj'],
  ])('finds %s through its alias', async (query, expected) => {
    const { provider } = setup();
    expect((await provider.search(query))[0]?.name).toBe(expected);
  });

  it('matches prefixes, exact matches first, at most five', async () => {
    const { provider } = setup();
    const places = await provider.search('ba');
    expect(places.length).toBeLessThanOrEqual(5);
    expect(places.map((place) => place.name)).toContain('Bareilly');
    expect((await provider.search('luck')).map((place) => place.name)).toEqual(['Lucknow']);
  });

  it('puts an exact name ahead of longer prefix matches', async () => {
    const { provider } = setup();
    const names = (await provider.search('mumbai')).map((place) => place.name);
    expect(names).toEqual(['Mumbai']);
  });

  it('asks the upstream only when nothing bundled matches', async () => {
    const { provider, search } = setup();
    await expect(provider.search('Smallville')).resolves.toEqual([upstreamPlace]);
    expect(search).toHaveBeenCalledExactlyOnceWith('Smallville');
  });

  it('surfaces the upstream failure on a miss', async () => {
    const failure = new GeocodingUnavailableError('City search failed');
    const { provider } = setup(() => Promise.reject(failure));
    await expect(provider.search('Smallville')).rejects.toBe(failure);
  });
});
