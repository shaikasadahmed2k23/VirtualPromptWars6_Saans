import type { GeoPlace } from './schemas/air.js';

/**
 * Human-readable place name, "Name, Region, Country", skipping blanks and repeats
 * (e.g. "Delhi, India" rather than "Delhi, Delhi, India").
 * @param place - A geocoding match.
 * @returns The label shown to users and used for the plan.
 */
export function formatPlaceLabel(place: Pick<GeoPlace, 'name' | 'region' | 'country'>): string {
  const parts = [place.name, place.region, place.country].filter(
    (part): part is string => part !== null && part !== '',
  );
  return [...new Set(parts)].join(', ');
}
