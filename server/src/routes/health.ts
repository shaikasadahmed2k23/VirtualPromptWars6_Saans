import { Router } from 'express';

import type { HealthResponse } from '@saans/shared';

/**
 * Builds the liveness router used by the Docker healthcheck and the keep-alive cron.
 * @returns A router exposing `GET /health`.
 */
export function createHealthRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.set('Cache-Control', 'no-store').json(body);
  });
  return router;
}
