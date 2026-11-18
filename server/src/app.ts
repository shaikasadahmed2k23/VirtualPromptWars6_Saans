import { randomUUID } from 'node:crypto';

import express, { type Express } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { createApiNotFoundHandler, createErrorHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './routes/health.js';
import { createWebAppRouter } from './web-app.js';

/** Dependencies and settings injected into the HTTP app so tests can swap them. */
export interface AppOptions {
  readonly webDistDir: string;
  readonly logger: Logger;
}

/**
 * Creates the Express application without binding a port.
 * @param options - Injected dependencies and settings.
 * @returns A configured Express app, ready for `listen()` or supertest.
 */
export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger: options.logger, genReqId: () => randomUUID() }));

  const api = express.Router();
  api.use(createHealthRouter());
  api.use(createApiNotFoundHandler());
  app.use('/api', api);

  app.use(createWebAppRouter(options.webDistDir));
  app.use(createErrorHandler(options.logger));
  return app;
}
