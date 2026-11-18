import { Router } from 'express';
import { z } from 'zod';

import { INPUT_LIMITS, boundedNumber, type AirResponse } from '@saans/shared';

import type { AirService } from '../services/air-service.js';

import { parseRequest } from './validate.js';

// Matches the server-side forecast cache: the numbers cannot change faster than this.
const CACHE_CONTROL = 'private, max-age=900';

// Query values arrive as strings; empty strings must not coerce to 0.
const coordinate = (label: string, limit: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .transform(Number)
    .pipe(boundedNumber(label, -limit, limit));

const querySchema = z.strictObject({
  lat: coordinate('lat', INPUT_LIMITS.latitude),
  lon: coordinate('lon', INPUT_LIMITS.longitude),
});

/**
 * `GET /air?lat=&lon=` — current NAQI, the hourly NAQI series and today's windows.
 * @param air - Air-quality service.
 * @returns The router.
 */
export function createAirRouter(air: AirService): Router {
  const router = Router();
  router.get('/air', async (req, res) => {
    const { lat, lon } = parseRequest(querySchema, req.query);
    const snapshot = await air.getSnapshot({ latitude: lat, longitude: lon });
    const body: AirResponse = {
      timezone: snapshot.timezone,
      current: snapshot.current,
      hourly: [...snapshot.hourly],
      bestWindow: snapshot.bestWindow,
      worstWindow: snapshot.worstWindow,
    };
    res.set('Cache-Control', CACHE_CONTROL).json(body);
  });
  return router;
}
