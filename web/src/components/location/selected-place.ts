import type { GeoPlace } from '@saans/shared';

/** The location the user picked, with a human-readable label. */
export interface SelectedPlace {
  readonly latitude: number;
  readonly longitude: number;
  readonly label: string;
}

/**
 * Turns a geocoding match into a selected place labelled "Name, Region, Country".
 * @param place - Geocoding match.
 * @returns The selected place.
 */
export function toSelectedPlace(place: GeoPlace): SelectedPlace {
  const parts = [place.name, place.region, place.country].filter(
    (part): part is string => part !== null && part !== '',
  );
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    label: [...new Set(parts)].join(', '),
  };
}
