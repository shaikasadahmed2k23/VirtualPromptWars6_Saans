import { randomUUID } from 'node:crypto';

import compression from 'compression';
import express, { type Express, type Router } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { createApiNotFoundHandler, createErrorHandler } from './middleware/error-handler.js';
import {
  DEFAULT_RATE_LIMITS,
  createRateLimiter,
  createSecurityHeaders,
  type RateLimits,
} from './middleware/security.js';
import type { GeocodingProvider } from './providers/geocoding-provider.js';
import { createAirRouter } from './routes/air.js';
import { createGeocodeRouter } from './routes/geocode.js';
import { createHealthRouter } from './routes/health.js';
import { createPlanRouter } from './routes/plan.js';
import type { AirService } from './services/air-service.js';
import type { PlanService } from './services/plan-service.js';
import { createWebAppRouter } from './web-app.js';

// Profiles are a few hundred bytes; anything near this is not a real request.
const JSON_BODY_LIMIT = '10kb';
// Render (and most PaaS) put exactly one proxy in front of the app.
const TRUSTED_PROXY_HOPS = 1;

/** Everything the HTTP app depends on, injected by the composition root (or tests). */
export interface AppDeps {
  readonly webDistDir: string;
  readonly logger: Logger;
  readonly air: AirService;
  readonly geocoder: GeocodingProvider;
  readonly plans: PlanService;
  readonly rateLimits?: RateLimits;
}

function createApiRouter(deps: AppDeps): Router {
  const limits = deps.rateLimits ?? DEFAULT_RATE_LIMITS;
  const api = express.Router();
  // Health stays outside the limiter so uptime pings never get throttled.
  api.use(createHealthRouter());
  api.use(createRateLimiter(limits.general));
  api.use('/plan', createRateLimiter(limits.plan));
  api.use(express.json({ limit: JSON_BODY_LIMIT }));
  api.use(createGeocodeRouter(deps.geocoder));
  api.use(createAirRouter(deps.air));
  api.use(createPlanRouter(deps.plans));
  api.use(createApiNotFoundHandler());
  return api;
}

/**
 * Creates the Express application without binding a port. No CORS middleware is installed:
 * the web app is served from the same origin, so browsers block every cross-origin read.
 * @param deps - Injected services and settings.
 * @returns A configured Express app, ready for `listen()` or supertest.
 */
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
  app.use(pinoHttp({ logger: deps.logger, genReqId: () => randomUUID() }));
  app.use(createSecurityHeaders());
  app.use(compression());
  app.use('/api', createApiRouter(deps));
  app.use(createWebAppRouter(deps.webDistDir));
  app.use(createErrorHandler(deps.logger));
  return app;
}
