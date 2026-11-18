import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGeolocation } from './use-geolocation.js';

type PositionCallbacks = [PositionCallback, PositionErrorCallback];

const fakeGeolocation = () => {
  const calls: PositionCallbacks[] = [];
  const getCurrentPosition = vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
    calls.push([success, failure]);
  });
  const geolocation = { getCurrentPosition } as unknown as Geolocation;
  return { geolocation, calls, getCurrentPosition };
};

describe('useGeolocation', () => {
  it('reports coordinates on success', () => {
    const { geolocation, calls } = fakeGeolocation();
    const { result } = renderHook(() => useGeolocation(geolocation));
    act(() => {
      result.current.locate();
    });
    expect(result.current.state.status).toBe('locating');
    act(() => {
      calls[0]?.[0]({ coords: { latitude: 28.6, longitude: 77.2 } } as GeolocationPosition);
    });
    expect(result.current.state).toEqual({
      status: 'success',
      coordinates: { latitude: 28.6, longitude: 77.2 },
    });
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
    [99, 'unavailable'],
  ])('maps error code %d to %s', (code, reason) => {
    const { geolocation, calls } = fakeGeolocation();
    const { result } = renderHook(() => useGeolocation(geolocation));
    act(() => {
      result.current.locate();
    });
    act(() => {
      calls[0]?.[1]({ code } as GeolocationPositionError);
    });
    expect(result.current.state).toEqual({ status: 'error', reason });
  });

  it('reports unsupported browsers', () => {
    const { result } = renderHook(() => useGeolocation(null));
    act(() => {
      result.current.locate();
    });
    expect(result.current.state).toEqual({ status: 'error', reason: 'unsupported' });
  });

  it('uses the browser API by default, and treats its absence as unsupported', () => {
    const { geolocation, getCurrentPosition } = fakeGeolocation();
    Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
    const { result } = renderHook(() => useGeolocation());
    act(() => {
      result.current.locate();
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result: withoutApi } = renderHook(() => useGeolocation());
    act(() => {
      withoutApi.current.locate();
    });
    expect(withoutApi.current.state).toEqual({ status: 'error', reason: 'unsupported' });
  });
});
