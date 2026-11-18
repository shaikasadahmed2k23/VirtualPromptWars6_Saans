import { describe, expect, it, vi } from 'vitest';

import { UpstreamError } from '../lib/errors.js';
import { TtlCache } from '../lib/ttl-cache.js';
import { fetchHanging, fetchResolving, httpOptions, jsonResponse } from '../test/fake-fetch.js';

import {
  AQI_CACHE_MAX_ENTRIES,
  AQI_CACHE_TTL_MS,
  CachedAqiProvider,
  roundCoordinates,
  type AirQualityForecast,
  type AqiProvider,
} from './aqi-provider.js';
import { OpenMeteoAqiProvider } from './open-meteo-aqi-provider.js';

const DELHI = { latitude: 28.6139, longitude: 77.209 };

const openMeteoBody = {
  latitude: 28.625,
  longitude: 77.25,
  timezone: 'Asia/Kolkata',
  utc_offset_seconds: 19_800,
  hourly: {
    time: ['2026-11-18T00:00', '2026-11-18T01:00', '2026-11-18T02:00', '2026-11-18T03:00'],
    pm2_5: [210.4, null, 198, 180],
    pm10: [320, 300, null, 260],
  },
};

describe('OpenMeteoAqiProvider', () => {
  it('requests PM2.5 and PM10 for two days in local time', async () => {
    const fetchFn = fetchResolving(() => jsonResponse(openMeteoBody));
    await new OpenMeteoAqiProvider(httpOptions(fetchFn)).getForecast(DELHI);
    const url = fetchFn.mock.calls[0]?.[0];
    expect(url?.href.split('?')[0]).toBe('https://air-quality-api.open-meteo.com/v1/air-quality');
    expect(Object.fromEntries(url?.searchParams ?? [])).toEqual({
      latitude: '28.6139',
      longitude: '77.209',
      hourly: 'pm2_5,pm10',
      forecast_days: '2',
      timezone: 'auto',
    });
  });

  it('maps the hourly series to samples and drops hours with nulls as gaps', async () => {
    const provider = new OpenMeteoAqiProvider(
      httpOptions(fetchResolving(() => jsonResponse(openMeteoBody))),
    );
    await expect(provider.getForecast(DELHI)).resolves.toEqual({
      timezone: 'Asia/Kolkata',
      utcOffsetSeconds: 19_800,
      samples: [
        { time: '2026-11-18T00:00', pm25: 210.4, pm10: 320 },
        { time: '2026-11-18T03:00', pm25: 180, pm10: 260 },
      ],
    });
  });

  it.each([
    ['times out', fetchHanging],
    ['sends malformed JSON', fetchResolving(() => new Response('{"hourly":'))],
    [
      'sends mismatched series',
      fetchResolving(() =>
        jsonResponse({ ...openMeteoBody, hourly: { ...openMeteoBody.hourly, pm10: [1] } }),
      ),
    ],
    [
      'sends negative concentrations',
      fetchResolving(() =>
        jsonResponse({
          ...openMeteoBody,
          hourly: { ...openMeteoBody.hourly, pm10: [-1, 1, 1, 1] },
        }),
      ),
    ],
  ])('throws UpstreamError when the API %s', async (_label, fetchFn) => {
    const provider = new OpenMeteoAqiProvider(httpOptions(fetchFn, 10));
    await expect(provider.getForecast(DELHI)).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('CachedAqiProvider', () => {
  const forecast: AirQualityForecast = {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: 19_800,
    samples: [],
  };

  const setup = () => {
    let now = 0;
    const inner = {
      getForecast: vi.fn<AqiProvider['getForecast']>(() => Promise.resolve(forecast)),
    };
    const cache = new TtlCache<string, AirQualityForecast>({
      ttlMs: AQI_CACHE_TTL_MS,
      maxEntries: AQI_CACHE_MAX_ENTRIES,
      clock: { now: () => now },
    });
    const advance = (ms: number): void => {
      now += ms;
    };
    return { inner, provider: new CachedAqiProvider(inner, cache), advance };
  };

  it('serves nearby points from one cached fetch made at the rounded location', async () => {
    const { inner, provider } = setup();
    await provider.getForecast(DELHI);
    await provider.getForecast({ latitude: 28.6141, longitude: 77.2091 });
    expect(inner.getForecast).toHaveBeenCalledTimes(1);
    expect(inner.getForecast).toHaveBeenCalledWith({ latitude: 28.61, longitude: 77.21 });
  });

  it('refetches after 15 minutes', async () => {
    const { inner, provider, advance } = setup();
    await provider.getForecast(DELHI);
    advance(AQI_CACHE_TTL_MS);
    await provider.getForecast(DELHI);
    expect(inner.getForecast).toHaveBeenCalledTimes(2);
  });

  it('keeps distinct locations apart', async () => {
    const { inner, provider } = setup();
    await provider.getForecast(DELHI);
    await provider.getForecast({ latitude: 19.076, longitude: 72.8777 });
    expect(inner.getForecast).toHaveBeenCalledTimes(2);
  });
});

describe('roundCoordinates', () => {
  it('rounds to two decimals, including negatives', () => {
    expect(roundCoordinates({ latitude: -33.8688, longitude: 151.2093 })).toEqual({
      latitude: -33.87,
      longitude: 151.21,
    });
  });
});
