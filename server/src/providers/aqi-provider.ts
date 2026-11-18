import { MS_PER_HOUR, MS_PER_MINUTE, type HourlyAirSample } from '@saans/shared';

import { describeFailure } from '../lib/failure-detail.js';
import type { WarnLogger } from '../lib/log.js';
import type { TtlCache } from '../lib/ttl-cache.js';

const COORDINATE_DECIMALS = 2;

/** Open-Meteo updates its air-quality model hourly; 15 minutes keeps data fresh and calls rare. */
export const AQI_CACHE_TTL_MS = 15 * MS_PER_MINUTE;
/** Upper bound on cached locations (~1 km² cells at 2 dp). */
export const AQI_CACHE_MAX_ENTRIES = 500;
/** How long past its TTL a forecast may still be shown when Open-Meteo is down (the hourly series spans 48 h). */
export const AQI_STALE_GRACE_MS = 6 * MS_PER_HOUR;

/** A point on the map in WGS84 degrees. */
export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/** Hourly forecast for one location, in the location's local time. */
export interface AirQualityForecast {
  /** IANA time zone of the location, e.g. `Asia/Kolkata`. */
  readonly timezone: string;
  /** Offset of the location's local time from UTC. */
  readonly utcOffsetSeconds: number;
  /** Hours with both PM2.5 and PM10 present; missing hours are simply absent (gaps). */
  readonly samples: readonly HourlyAirSample[];
  /** Set only when this is an old cached copy served because a refresh failed: its age in minutes. */
  readonly staleMinutes?: number;
}

/** Source of hourly PM2.5/PM10 forecasts. */
export interface AqiProvider {
  /**
   * Fetches the forecast for a location.
   * @throws {UpstreamError} When the forecast cannot be obtained.
   */
  getForecast(coordinates: Coordinates): Promise<AirQualityForecast>;
}

/**
 * Rounds coordinates to 2 decimal places (~1 km), the granularity we cache and query at.
 * @param coordinates - Exact coordinates.
 * @returns Rounded coordinates.
 */
export function roundCoordinates(coordinates: Coordinates): Coordinates {
  return {
    latitude: Number(coordinates.latitude.toFixed(COORDINATE_DECIMALS)),
    longitude: Number(coordinates.longitude.toFixed(COORDINATE_DECIMALS)),
  };
}

/**
 * Decorates an {@link AqiProvider} with a TTL cache keyed by rounded coordinates. When a refresh
 * fails it serves the last good forecast (within {@link AQI_STALE_GRACE_MS}) and marks it stale.
 */
export class CachedAqiProvider implements AqiProvider {
  /**
   * @param inner - Provider that does the real fetching.
   * @param cache - Cache shared by all requests; give it a `staleGraceMs` to enable stale serving.
   * @param logger - Records each time old data is served.
   */
  constructor(
    private readonly inner: AqiProvider,
    private readonly cache: TtlCache<string, AirQualityForecast>,
    private readonly logger: WarnLogger,
  ) {}

  /**
   * Serves a cached forecast for the rounded location, fetching it on a miss.
   * @param coordinates - Location; rounded to 2 dp before lookup and fetch.
   * @returns The forecast; `staleMinutes` is set when it is an old copy.
   * @throws {UpstreamError} When the inner provider fails and no usable old copy exists.
   */
  async getForecast(coordinates: Coordinates): Promise<AirQualityForecast> {
    const rounded = roundCoordinates(coordinates);
    const key = `${String(rounded.latitude)},${String(rounded.longitude)}`;
    try {
      return await this.cache.getOrLoad(key, () => this.inner.getForecast(rounded));
    } catch (error) {
      const stale = this.cache.getStale(key);
      if (stale === undefined) {
        throw error;
      }
      const staleMinutes = Math.round(stale.ageMs / MS_PER_MINUTE);
      this.logger.warn(
        { staleMinutes, failure: describeFailure(error) },
        'Air quality refresh failed; serving the last good forecast',
      );
      return { ...stale.value, staleMinutes };
    }
  }
}
