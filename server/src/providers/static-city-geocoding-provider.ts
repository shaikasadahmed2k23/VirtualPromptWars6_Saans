import type { GeoPlace } from '@saans/shared';

import { normalizeQuery, type GeocodingProvider } from './geocoding-provider.js';
import { INDIAN_CITIES, type IndianCity } from './indian-cities.js';

const COUNTRY = 'India';
const MAX_MATCHES = 5;

// Bundled places get negative ids so they can never collide with Open-Meteo's positive ones.
const toPlace = (city: IndianCity, index: number): GeoPlace => ({
  id: -(index + 1),
  name: city.name,
  region: city.state,
  country: COUNTRY,
  latitude: city.lat,
  longitude: city.lon,
});

// 0 = exact name or alias, 1 = prefix, otherwise no match.
function rank(city: IndianCity, query: string): 0 | 1 | undefined {
  const names = [city.name.toLowerCase(), ...(city.alias === undefined ? [] : [city.alias])];
  if (names.includes(query)) {
    return 0;
  }
  return names.some((name) => name.startsWith(query)) ? 1 : undefined;
}

/**
 * Answers from a bundled list of major Indian cities and only asks the upstream geocoder
 * when the list has no match. Common searches then never depend on the network.
 */
export class StaticFirstGeocodingProvider implements GeocodingProvider {
  /**
   * @param upstream - Consulted only when no bundled city matches.
   * @param cities - Bundled list; defaults to {@link INDIAN_CITIES}.
   */
  constructor(
    private readonly upstream: GeocodingProvider,
    private readonly cities: readonly IndianCity[] = INDIAN_CITIES,
  ) {}

  /**
   * Searches the bundled cities, falling back to the upstream on a miss.
   * @param query - Place name or the start of one.
   * @returns Matching places, exact matches first.
   * @throws {UpstreamError} Only when nothing bundled matches and the upstream fails.
   */
  async search(query: string): Promise<readonly GeoPlace[]> {
    const normalized = normalizeQuery(query);
    const matches = this.cities
      .map((city, index) => ({ place: toPlace(city, index), rank: rank(city, normalized) }))
      .filter((match): match is { place: GeoPlace; rank: 0 | 1 } => match.rank !== undefined)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_MATCHES);
    return matches.length > 0 ? matches.map(({ place }) => place) : this.upstream.search(query);
  }
}
