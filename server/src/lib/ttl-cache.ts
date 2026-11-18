import type { Clock } from './clock.js';

/** Settings for a {@link TtlCache}. */
export interface TtlCacheOptions {
  /** How long an entry stays fresh, in milliseconds. */
  readonly ttlMs: number;
  /** Maximum entries kept; inserting beyond this evicts the oldest entry. */
  readonly maxEntries: number;
  readonly clock: Clock;
}

interface Entry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

/**
 * In-memory cache with per-entry expiry and a size cap. Eviction removes the entry
 * that was written longest ago (Map iteration order is insertion order).
 */
export class TtlCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();

  /**
   * @param options - TTL, size cap and clock.
   * @throws {RangeError} When `ttlMs` or `maxEntries` is not a positive number.
   */
  constructor(private readonly options: TtlCacheOptions) {
    if (!(options.ttlMs > 0) || !(options.maxEntries >= 1)) {
      throw new RangeError('TtlCache needs a positive ttlMs and maxEntries');
    }
  }

  /**
   * Number of entries currently stored, including any not yet purged after expiry.
   * @returns The entry count.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Reads a fresh entry.
   * @param key - Cache key.
   * @returns The cached value, or undefined when missing or expired (expired entries are removed).
   */
  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt <= this.options.clock.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Stores a value, evicting the oldest entry if the cache is full.
   * @param key - Cache key.
   * @param value - Value to store; it expires `ttlMs` from now.
   */
  set(key: K, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.options.maxEntries) {
      // The map is non-empty here (size >= maxEntries >= 1), so the first key exists.
      this.entries.delete(this.entries.keys().next().value as K);
    }
    this.entries.set(key, { value, expiresAt: this.options.clock.now() + this.options.ttlMs });
  }

  /**
   * Returns the cached value or loads, stores and returns a new one. Failed loads are not cached.
   * @param key - Cache key.
   * @param load - Produces the value on a miss.
   * @returns The cached or freshly loaded value.
   * @throws {Error} Rethrows whatever `load` rejects with.
   */
  async getOrLoad(key: K, load: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const value = await load();
    this.set(key, value);
    return value;
  }
}
