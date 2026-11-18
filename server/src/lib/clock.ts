/** Source of the current time, injected so caches and services are deterministic in tests. */
export interface Clock {
  /** Current time as epoch milliseconds. */
  now(): number;
}

/**
 * Creates a clock backed by the system time.
 * @returns A {@link Clock} that reads `Date.now()`.
 */
export function createSystemClock(): Clock {
  return { now: () => Date.now() };
}
