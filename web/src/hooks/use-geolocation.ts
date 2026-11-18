import { useCallback, useState } from 'react';

import type { Coordinates } from '@saans/shared';

/** Why the browser could not provide a position. */
export type GeolocationFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

/** Lifecycle of a "use my location" request. */
export type GeolocationState =
  | { readonly status: 'idle' }
  | { readonly status: 'locating' }
  | { readonly status: 'success'; readonly coordinates: Coordinates }
  | { readonly status: 'error'; readonly reason: GeolocationFailure };

// Coarse is enough for city-level air quality and is faster and kinder to privacy.
const OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 600_000,
};

const FAILURE_BY_CODE: Readonly<Record<number, GeolocationFailure>> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
};

// Older or locked-down browsers have no `navigator.geolocation` at all.
const browserGeolocation = (): Geolocation | null =>
  'geolocation' in navigator ? navigator.geolocation : null;

/**
 * Wraps `navigator.geolocation` in a small state machine.
 * @param geolocation - Injectable for tests; defaults to the browser's (null if unsupported).
 * @returns The state and a `locate` function that asks for the position.
 */
export function useGeolocation(geolocation: Geolocation | null = browserGeolocation()): {
  readonly state: GeolocationState;
  readonly locate: () => void;
} {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' });

  const locate = useCallback(() => {
    if (geolocation === null) {
      setState({ status: 'error', reason: 'unsupported' });
      return;
    }
    setState({ status: 'locating' });
    geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({
          status: 'success',
          coordinates: { latitude: coords.latitude, longitude: coords.longitude },
        });
      },
      (error) => {
        setState({ status: 'error', reason: FAILURE_BY_CODE[error.code] ?? 'unavailable' });
      },
      OPTIONS,
    );
  }, [geolocation]);

  return { state, locate };
}
