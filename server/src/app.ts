import express, { type Express } from 'express';

import { createHealthRouter } from './routes/health.js';
import { createWebAppRouter } from './web-app.js';

/** Dependencies and settings injected into the HTTP app so tests can swap them. */
export interface AppOptions {
  readonly webDistDir: string;
}

/**
 * Creates the Express application without binding a port.
 * @param options - Injected dependencies and settings.
 * @returns A configured Express app, ready for `listen()` or supertest.
 */
export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', createHealthRouter());
  app.use(createWebAppRouter(options.webDistDir));
  return app;
}
