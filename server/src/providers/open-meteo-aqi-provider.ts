import { z } from 'zod';

import { localDateTimeSchema, type Coordinates, type HourlyAirSample } from '@saans/shared';

import { fetchJson, type HttpClientOptions } from '../lib/fetch-json.js';

import type { AirQualityForecast, AqiProvider } from './aqi-provider.js';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
// Today plus tomorrow: enough for the 48-hour strip and for planning late in the day.
const FORECAST_DAYS = 2;
const SERVICE = 'Air quality service';

const concentrations = z.array(z.number().nonnegative().nullable());

const responseSchema = z.object({
  timezone: z.string().min(1),
  utc_offset_seconds: z.number().int(),
  hourly: z
    .object({ time: z.array(localDateTimeSchema), pm2_5: concentrations, pm10: concentrations })
    .refine(
      ({ time, pm2_5, pm10 }) => pm2_5.length === time.length && pm10.length === time.length,
      'hourly series have different lengths',
    ),
});

type HourlySeries = z.infer<typeof responseSchema>['hourly'];

// Hours where either pollutant is null are dropped, leaving a gap the window logic respects.
const toSamples = ({ time, pm2_5, pm10 }: HourlySeries): HourlyAirSample[] =>
  time.flatMap((hour, index) => {
    const pm25 = pm2_5[index];
    const pm10Value = pm10[index];
    return typeof pm25 === 'number' && typeof pm10Value === 'number'
      ? [{ time: hour, pm25, pm10: pm10Value }]
      : [];
  });

/** {@link AqiProvider} backed by the keyless Open-Meteo Air Quality API. */
export class OpenMeteoAqiProvider implements AqiProvider {
  /** @param http - Injected fetch and timeout. */
  constructor(private readonly http: HttpClientOptions) {}

  /**
   * Fetches hourly PM2.5/PM10 for today and tomorrow in the location's local time.
   * @param coordinates - Location to forecast.
   * @returns The validated forecast with null hours removed.
   * @throws {UpstreamError} On timeout, network failure, bad status or an unexpected body.
   */
  async getForecast(coordinates: Coordinates): Promise<AirQualityForecast> {
    const url = new URL(AIR_QUALITY_URL);
    url.search = new URLSearchParams({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
      hourly: 'pm2_5,pm10',
      forecast_days: String(FORECAST_DAYS),
      timezone: 'auto',
    }).toString();
    const body = await fetchJson(url, responseSchema, { ...this.http, service: SERVICE });
    return {
      timezone: body.timezone,
      utcOffsetSeconds: body.utc_offset_seconds,
      samples: toSamples(body.hourly),
    };
  }
}
