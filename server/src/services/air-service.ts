import type { Coordinates } from '@saans/shared';

import { buildAirSnapshot, type AirSnapshot } from '../domain/air-snapshot.js';
import { localTimeAt } from '../domain/local-time.js';
import type { Clock } from '../lib/clock.js';
import { UpstreamError } from '../lib/errors.js';
import type { AqiProvider } from '../providers/aqi-provider.js';

/** An {@link AirSnapshot} plus the local context it was computed in. */
export interface LocatedSnapshot extends AirSnapshot {
  readonly timezone: string;
  /** Local time at the location when the snapshot was built, `YYYY-MM-DDTHH:MM`. */
  readonly localTime: string;
  /** Minutes old the data is when Open-Meteo could not be reached; null when it is live. */
  readonly staleMinutes: number | null;
}

/** Fetches a forecast and summarises it for "now" at the location. */
export class AirService {
  /**
   * @param aqi - Forecast source (usually cached).
   * @param clock - Source of "now".
   */
  constructor(
    private readonly aqi: AqiProvider,
    private readonly clock: Clock,
  ) {}

  /**
   * Current NAQI, the upcoming hourly series and today's best/worst windows for a location.
   * @param coordinates - Where to look.
   * @returns The snapshot with its time zone and local time.
   * @throws {UpstreamError} When the forecast is unavailable or contains no usable hours.
   */
  async getSnapshot(coordinates: Coordinates): Promise<LocatedSnapshot> {
    const forecast = await this.aqi.getForecast(coordinates);
    const localTime = localTimeAt(this.clock.now(), forecast.utcOffsetSeconds);
    const snapshot = buildAirSnapshot(forecast.samples, localTime);
    if (snapshot === null) {
      throw new UpstreamError('No air quality data is available for this location yet');
    }
    return {
      ...snapshot,
      timezone: forecast.timezone,
      localTime,
      staleMinutes: forecast.staleMinutes ?? null,
    };
  }
}
