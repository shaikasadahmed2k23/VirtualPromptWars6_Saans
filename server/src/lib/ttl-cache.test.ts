import { describe, expect, it, vi } from 'vitest';

import { createSystemClock } from './clock.js';
import type { Clock } from './clock.js';
import { TtlCache } from './ttl-cache.js';

const TTL_MS = 1000;

const fakeClock = (start = 0): Clock & { advance: (ms: number) => void } => {
  let now = start;
  return {
    now: () => now,
    advance: (ms) => {
      now += ms;
    },
  };
};

const cacheWith = (clock: Clock, maxEntries = 3): TtlCache<string, number> =>
  new TtlCache<string, number>({ ttlMs: TTL_MS, maxEntries, clock });

describe('TtlCache', () => {
  it('returns stored values until they expire, then forgets them', () => {
    const clock = fakeClock();
    const cache = cacheWith(clock);
    cache.set('a', 1);
    clock.advance(TTL_MS - 1);
    expect(cache.get('a')).toBe(1);
    clock.advance(1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('returns undefined for keys never stored', () => {
    expect(cacheWith(fakeClock()).get('missing')).toBeUndefined();
  });

  it('evicts the oldest entry when full', () => {
    const cache = cacheWith(fakeClock(), 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('treats overwriting a key as the newest write and restarts its TTL', () => {
    const clock = fakeClock();
    const cache = cacheWith(clock, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    clock.advance(TTL_MS / 2);
    cache.set('a', 10);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    clock.advance(TTL_MS / 2);
    expect(cache.get('a')).toBe(10);
  });

  it('loads once on a miss and serves the cached value afterwards', async () => {
    const cache = cacheWith(fakeClock());
    const load = vi.fn(() => Promise.resolve(42));
    await expect(cache.getOrLoad('k', load)).resolves.toBe(42);
    await expect(cache.getOrLoad('k', load)).resolves.toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed load', async () => {
    const cache = cacheWith(fakeClock());
    await expect(cache.getOrLoad('k', () => Promise.reject(new Error('down')))).rejects.toThrow(
      'down',
    );
    expect(cache.size).toBe(0);
  });

  it.each([
    { ttlMs: 0, maxEntries: 1 },
    { ttlMs: 1, maxEntries: 0 },
    { ttlMs: Number.NaN, maxEntries: 1 },
  ])('rejects invalid options %o', (options) => {
    expect(() => new TtlCache({ ...options, clock: fakeClock() })).toThrow(RangeError);
  });
});

describe('createSystemClock', () => {
  it('reads the system time', () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    expect(createSystemClock().now()).toBe(1_700_000_000_000);
    vi.useRealTimers();
  });
});
