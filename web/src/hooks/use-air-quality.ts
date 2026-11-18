import { useCallback, useEffect } from 'react';

import type { AirResponse, CoordinatesInput } from '@saans/shared';

import { useApi } from '../api/api-context.js';

import { useAsyncTask, type AsyncState } from './use-async-task.js';

/** Air quality for the selected location. */
export interface AirQuality {
  readonly state: AsyncState<AirResponse>;
  readonly retry: () => void;
}

/**
 * Loads `/api/air` whenever the location changes; idle while there is no location.
 * @param coordinates - Selected location, or null.
 * @returns The request state and a retry function.
 */
export function useAirQuality(coordinates: CoordinatesInput | null): AirQuality {
  const api = useApi();
  const { state, run, reset } = useAsyncTask<AirResponse>();
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  const load = useCallback(() => {
    if (latitude === undefined || longitude === undefined) {
      reset();
      return;
    }
    run((signal) => api.getAir({ latitude, longitude }, signal));
  }, [api, latitude, longitude, reset, run]);

  useEffect(load, [load]);

  return { state, retry: load };
}
