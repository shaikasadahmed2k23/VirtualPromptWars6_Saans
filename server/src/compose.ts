import type { Logger } from 'pino';

import type { GeoPlace, PlanResponse } from '@saans/shared';

import type { AppDeps } from './app.js';
import type { AppConfig } from './config.js';
import type { Clock } from './lib/clock.js';
import { UPSTREAM_TIMEOUT_MS, type FetchFn, type HttpClientOptions } from './lib/fetch-json.js';
import { TtlCache } from './lib/ttl-cache.js';
import { createAiGenerator } from './plan/create-ai-generator.js';
import { RuleBasedPlanGenerator } from './plan/rule-based-plan-generator.js';
import {
  AQI_CACHE_MAX_ENTRIES,
  AQI_CACHE_TTL_MS,
  AQI_STALE_GRACE_MS,
  CachedAqiProvider,
  type AirQualityForecast,
  type AqiProvider,
} from './providers/aqi-provider.js';
import {
  CachedGeocodingProvider,
  GEOCODE_CACHE_MAX_ENTRIES,
  GEOCODE_CACHE_TTL_MS,
  type GeocodingProvider,
} from './providers/geocoding-provider.js';
import { OpenMeteoAqiProvider } from './providers/open-meteo-aqi-provider.js';
import { OpenMeteoGeocodingProvider } from './providers/open-meteo-geocoding-provider.js';
import { StaticFirstGeocodingProvider } from './providers/static-city-geocoding-provider.js';
import { AirService } from './services/air-service.js';
import { PLAN_CACHE_MAX_ENTRIES, PLAN_CACHE_TTL_MS, PlanService } from './services/plan-service.js';

/** The process-level dependencies the composition root needs; tests pass fakes. */
export interface RuntimeDeps {
  /** HTTP client for the upstream APIs (the global `fetch` in production). */
  readonly fetchFn: FetchFn;
  /** Time source for every cache and service. */
  readonly clock: Clock;
  /** Structured logger shared by the app and its services. */
  readonly logger: Logger;
}

function createAqiProvider(http: HttpClientOptions, clock: Clock, logger: Logger): AqiProvider {
  const cache = new TtlCache<string, AirQualityForecast>({
    ttlMs: AQI_CACHE_TTL_MS,
    maxEntries: AQI_CACHE_MAX_ENTRIES,
    clock,
    staleGraceMs: AQI_STALE_GRACE_MS,
  });
  return new CachedAqiProvider(new OpenMeteoAqiProvider(http), cache, logger);
}

// Bundled major cities answer first; the cached upstream is only asked about everything else.
function createGeocoder(http: HttpClientOptions, clock: Clock): GeocodingProvider {
  const cache = new TtlCache<string, readonly GeoPlace[]>({
    ttlMs: GEOCODE_CACHE_TTL_MS,
    maxEntries: GEOCODE_CACHE_MAX_ENTRIES,
    clock,
  });
  return new StaticFirstGeocodingProvider(
    new CachedGeocodingProvider(new OpenMeteoGeocodingProvider(http), cache),
  );
}

/**
 * Composition root: builds the real providers, caches, generators and services from config.
 * Nothing here performs I/O until a request arrives, so tests can wire it with fakes.
 * @param config - Validated runtime configuration.
 * @param runtime - `fetch`, clock and logger to inject everywhere.
 * @returns Everything {@link createApp} needs.
 */
export function createServices(config: AppConfig, runtime: RuntimeDeps): AppDeps {
  const { fetchFn, clock, logger } = runtime;
  const http: HttpClientOptions = { fetchFn, timeoutMs: UPSTREAM_TIMEOUT_MS, logger };
  const geocoder = createGeocoder(http, clock);
  const air = new AirService(createAqiProvider(http, clock, logger), clock);
  const plans = new PlanService({
    air,
    geocoder,
    aiGenerator: createAiGenerator(config, logger),
    fallbackGenerator: new RuleBasedPlanGenerator(),
    cache: new TtlCache<string, PlanResponse>({
      ttlMs: PLAN_CACHE_TTL_MS,
      maxEntries: PLAN_CACHE_MAX_ENTRIES,
      clock,
    }),
    clock,
    logger,
  });
  return { webDistDir: config.webDistDir, logger, air, geocoder, plans };
}
