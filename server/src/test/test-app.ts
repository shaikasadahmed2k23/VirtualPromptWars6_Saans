import type { Express } from 'express';
import type { Logger } from 'pino';
import { vi } from 'vitest';

import type { GeoPlace, PlanResponse } from '@saans/shared';

import { createApp } from '../app.js';
import { TtlCache } from '../lib/ttl-cache.js';
import { createLogger } from '../logger.js';
import type { RateLimits } from '../middleware/security.js';
import type { PlanGenerator } from '../plan/plan-generator.js';
import { RuleBasedPlanGenerator } from '../plan/rule-based-plan-generator.js';
import type { AqiProvider } from '../providers/aqi-provider.js';
import type { GeocodingProvider } from '../providers/geocoding-provider.js';
import { AirService } from '../services/air-service.js';
import {
  PLAN_CACHE_MAX_ENTRIES,
  PLAN_CACHE_TTL_MS,
  PlanService,
} from '../services/plan-service.js';

import { FORECAST_SAMPLES, IST_OFFSET_SECONDS, NOW_MS } from './fixtures.js';

// The full app wired with in-memory fakes: no network, fixed clock.

export const DELHI_PLACE: GeoPlace = {
  id: 1_273_294,
  name: 'Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.65,
  longitude: 77.23,
};

export interface TestAppOptions {
  readonly webDistDir?: string;
  readonly rateLimits?: RateLimits;
  readonly aqi?: AqiProvider;
  readonly geocoder?: GeocodingProvider;
  readonly ai?: PlanGenerator | null;
  readonly logger?: Logger;
}

export const fakeAqi = (): AqiProvider => ({
  getForecast: vi.fn<AqiProvider['getForecast']>(() =>
    Promise.resolve({
      timezone: 'Asia/Kolkata',
      utcOffsetSeconds: IST_OFFSET_SECONDS,
      samples: FORECAST_SAMPLES,
    }),
  ),
});

export const fakeGeocoder = (): GeocodingProvider => ({
  search: vi.fn<GeocodingProvider['search']>(() => Promise.resolve([DELHI_PLACE])),
});

export const createTestApp = (options: TestAppOptions = {}): Express => {
  const clock = { now: () => NOW_MS };
  const logger = options.logger ?? createLogger('silent');
  const geocoder = options.geocoder ?? fakeGeocoder();
  const air = new AirService(options.aqi ?? fakeAqi(), clock);
  const plans = new PlanService({
    air,
    geocoder,
    aiGenerator: options.ai ?? null,
    fallbackGenerator: new RuleBasedPlanGenerator(),
    cache: new TtlCache<string, PlanResponse>({
      ttlMs: PLAN_CACHE_TTL_MS,
      maxEntries: PLAN_CACHE_MAX_ENTRIES,
      clock,
    }),
    clock,
    logger,
  });
  return createApp({
    webDistDir: options.webDistDir ?? 'missing-web-dist',
    logger,
    air,
    geocoder,
    plans,
    ...(options.rateLimits === undefined ? {} : { rateLimits: options.rateLimits }),
  });
};
