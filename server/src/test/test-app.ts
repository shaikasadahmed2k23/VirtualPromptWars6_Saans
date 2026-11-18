import type { Express } from 'express';
import type { Logger } from 'pino';
import { vi, type Mock } from 'vitest';

import type { PlanResponse } from '@saans/shared';

import { createApp } from '../app.js';
import type { Clock } from '../lib/clock.js';
import type { WarnLogger } from '../lib/log.js';
import { TtlCache } from '../lib/ttl-cache.js';
import { createLogger } from '../logger.js';
import type { RateLimits } from '../middleware/security.js';
import type { PlanGenerator } from '../plan/plan-generator.js';
import { RuleBasedPlanGenerator } from '../plan/rule-based-plan-generator.js';
import type { AirQualityForecast, AqiProvider } from '../providers/aqi-provider.js';
import type { GeocodingProvider } from '../providers/geocoding-provider.js';
import { AirService } from '../services/air-service.js';
import {
  PLAN_CACHE_MAX_ENTRIES,
  PLAN_CACHE_TTL_MS,
  PlanService,
} from '../services/plan-service.js';

import { DELHI_PLACE, NOW_MS, forecastFixture } from './fixtures.js';

// The real services wired with in-memory fakes: no network, fixed clock.

export interface FakeAqi extends AqiProvider {
  readonly getForecast: Mock<AqiProvider['getForecast']>;
}

export interface FakeGeocoder extends GeocodingProvider {
  readonly search: Mock<GeocodingProvider['search']>;
}

export const fakeAqi = (forecast: AirQualityForecast = forecastFixture()): FakeAqi => ({
  getForecast: vi.fn<AqiProvider['getForecast']>(() => Promise.resolve(forecast)),
});

export const fakeGeocoder = (): FakeGeocoder => ({
  search: vi.fn<GeocodingProvider['search']>(() => Promise.resolve([DELHI_PLACE])),
});

export interface TestServicesOptions {
  readonly aqi?: AqiProvider;
  readonly geocoder?: GeocodingProvider;
  readonly ai?: PlanGenerator | null;
  readonly clock?: Clock;
  readonly logger?: WarnLogger;
}

export interface TestServices {
  readonly air: AirService;
  readonly plans: PlanService;
  readonly geocoder: GeocodingProvider;
}

export const createTestServices = (options: TestServicesOptions = {}): TestServices => {
  const clock = options.clock ?? { now: () => NOW_MS };
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
    logger: options.logger ?? { warn: vi.fn() },
  });
  return { air, plans, geocoder };
};

export interface TestAppOptions extends Omit<TestServicesOptions, 'logger'> {
  readonly webDistDir?: string;
  readonly rateLimits?: RateLimits;
  readonly logger?: Logger;
}

export const createTestApp = (options: TestAppOptions = {}): Express => {
  const logger = options.logger ?? createLogger('silent');
  const { webDistDir, rateLimits, ...services } = options;
  return createApp({
    webDistDir: webDistDir ?? 'missing-web-dist',
    logger,
    ...createTestServices({ ...services, logger }),
    ...(rateLimits === undefined ? {} : { rateLimits }),
  });
};
