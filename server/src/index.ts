import type { GeoPlace, PlanResponse } from '@saans/shared';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createSystemClock } from './lib/clock.js';
import { UPSTREAM_TIMEOUT_MS } from './lib/fetch-json.js';
import { TtlCache } from './lib/ttl-cache.js';
import { createLogger } from './logger.js';
import { createAiGenerator } from './plan/create-ai-generator.js';
import { RuleBasedPlanGenerator } from './plan/rule-based-plan-generator.js';
import {
  AQI_CACHE_MAX_ENTRIES,
  AQI_CACHE_TTL_MS,
  AQI_STALE_GRACE_MS,
  CachedAqiProvider,
  type AirQualityForecast,
} from './providers/aqi-provider.js';
import {
  CachedGeocodingProvider,
  GEOCODE_CACHE_MAX_ENTRIES,
  GEOCODE_CACHE_TTL_MS,
} from './providers/geocoding-provider.js';
import { OpenMeteoAqiProvider } from './providers/open-meteo-aqi-provider.js';
import { OpenMeteoGeocodingProvider } from './providers/open-meteo-geocoding-provider.js';
import { StaticFirstGeocodingProvider } from './providers/static-city-geocoding-provider.js';
import { AirService } from './services/air-service.js';
import { PLAN_CACHE_MAX_ENTRIES, PLAN_CACHE_TTL_MS, PlanService } from './services/plan-service.js';

// Composition root: the only place real dependencies are created and wired together.
const config = loadConfig(process.env);
const logger = createLogger(config.logLevel);
const clock = createSystemClock();
const http = { fetchFn: fetch, timeoutMs: UPSTREAM_TIMEOUT_MS, logger };

const aqi = new CachedAqiProvider(
  new OpenMeteoAqiProvider(http),
  new TtlCache<string, AirQualityForecast>({
    ttlMs: AQI_CACHE_TTL_MS,
    maxEntries: AQI_CACHE_MAX_ENTRIES,
    clock,
    staleGraceMs: AQI_STALE_GRACE_MS,
  }),
  logger,
);
// Bundled major cities answer first; the cached upstream is only asked about everything else.
const geocoder = new StaticFirstGeocodingProvider(
  new CachedGeocodingProvider(
    new OpenMeteoGeocodingProvider(http),
    new TtlCache<string, readonly GeoPlace[]>({
      ttlMs: GEOCODE_CACHE_TTL_MS,
      maxEntries: GEOCODE_CACHE_MAX_ENTRIES,
      clock,
    }),
  ),
);
const air = new AirService(aqi, clock);
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

createApp({ webDistDir: config.webDistDir, logger, air, geocoder, plans }).listen(
  config.port,
  config.host,
  () => {
    logger.info({ host: config.host, port: config.port, env: config.nodeEnv }, 'server listening');
  },
);
