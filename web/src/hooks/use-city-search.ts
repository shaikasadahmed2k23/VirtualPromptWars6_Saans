import { useEffect, useState } from 'react';

import { INPUT_LIMITS, type GeoPlace } from '@saans/shared';

import { useApi } from '../api/api-context.js';

import { useAsyncTask, type AsyncState } from './use-async-task.js';

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Returns `value` once it has stopped changing for `delayMs`.
 * @param value - Rapidly changing value.
 * @param delayMs - Quiet period.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);
  return debounced;
}

/**
 * Debounced city search; stays idle until the query has at least two characters.
 * @param query - What the user has typed.
 * @returns The search state.
 */
export function useCitySearch(query: string): AsyncState<readonly GeoPlace[]> {
  const api = useApi();
  const { state, run, reset } = useAsyncTask<readonly GeoPlace[]>();
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debounced.length < INPUT_LIMITS.cityNameMin) {
      reset();
      return;
    }
    run((signal) => api.geocode(debounced, signal));
  }, [api, debounced, reset, run]);

  return state;
}
