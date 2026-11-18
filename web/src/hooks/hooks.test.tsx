import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/api-client.js';
import { AIR_RESPONSE, DELHI, PLAN_RESPONSE, fakeApi } from '../test/fixtures.js';
import { renderHookWithProviders } from '../test/render.js';

import { useAirQuality } from './use-air-quality.js';
import { useAsyncTask } from './use-async-task.js';
import { SEARCH_DEBOUNCE_MS, useCitySearch } from './use-city-search.js';
import { usePlan } from './use-plan.js';

const PROFILE = { language: 'en' } as never;

afterEach(() => {
  vi.useRealTimers();
});

describe('useAsyncTask', () => {
  it('ignores the result of a request superseded by a newer one', async () => {
    const { result } = renderHookWithProviders(() => useAsyncTask<string>());
    let resolveFirst: (value: string) => void = () => undefined;
    act(() => {
      result.current.run(() => new Promise((resolve) => (resolveFirst = resolve)));
    });
    act(() => {
      result.current.run(() => Promise.resolve('second'));
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'success', data: 'second' });
    });
    resolveFirst('first');
    await Promise.resolve();
    expect(result.current.state).toEqual({ status: 'success', data: 'second' });
  });

  it('ignores a failure that arrives after reset', async () => {
    const { result } = renderHookWithProviders(() => useAsyncTask<string>());
    let rejectTask: (error: Error) => void = () => undefined;
    act(() => {
      result.current.run(() => new Promise((_resolve, reject) => (rejectTask = reject)));
    });
    act(() => {
      result.current.reset();
    });
    rejectTask(new Error('late'));
    await Promise.resolve();
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('reports API failures by code and anything else as a bad response', async () => {
    const { result } = renderHookWithProviders(() => useAsyncTask<string>());
    act(() => {
      result.current.run(() => Promise.reject(new ApiError('UPSTREAM_ERROR', 'x')));
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'UPSTREAM_ERROR' });
    });
    act(() => {
      result.current.run(() => Promise.reject(new Error('weird')));
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'BAD_RESPONSE' });
    });
  });
});

describe('useAirQuality', () => {
  it('stays idle without a location, then loads and can retry', async () => {
    const api = fakeApi();
    let coordinates: { latitude: number; longitude: number } | null = null;
    const { result, rerender } = renderHookWithProviders(() => useAirQuality(coordinates), { api });
    expect(result.current.state.status).toBe('idle');
    coordinates = { latitude: 28.6, longitude: 77.2 };
    rerender();
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'success', data: AIR_RESPONSE });
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(api.getAir).toHaveBeenCalledTimes(2);
    });
  });
});

describe('usePlan', () => {
  it('submits a profile and retries the last one', async () => {
    const api = fakeApi({
      createPlan: vi
        .fn()
        .mockRejectedValueOnce(new ApiError('UPSTREAM_ERROR', 'x'))
        .mockResolvedValue(PLAN_RESPONSE),
    });
    const { result } = renderHookWithProviders(() => usePlan(), { api });
    act(() => {
      result.current.retry();
    });
    expect(api.createPlan).not.toHaveBeenCalled();
    act(() => {
      result.current.submit(PROFILE);
    });
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'success', data: PLAN_RESPONSE });
    });
    expect(api.createPlan).toHaveBeenLastCalledWith(PROFILE, expect.any(AbortSignal));
  });
});

describe('useCitySearch', () => {
  it('waits for typing to pause and for two characters before searching', async () => {
    vi.useFakeTimers();
    const api = fakeApi();
    let query = 'D';
    const { result, rerender } = renderHookWithProviders(() => useCitySearch(query), { api });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });
    expect(api.geocode).not.toHaveBeenCalled();
    query = 'De';
    rerender();
    query = 'Delhi';
    rerender();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });
    expect(api.geocode).toHaveBeenCalledOnce();
    expect(api.geocode).toHaveBeenCalledWith('Delhi', expect.any(AbortSignal));
    expect(result.current).toEqual({ status: 'success', data: [DELHI] });
  });
});
