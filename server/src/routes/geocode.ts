import { Router } from 'express';
import { z } from 'zod';

import { INPUT_LIMITS, boundedText, type GeocodeResponse } from '@saans/shared';

import type { GeocodingProvider } from '../providers/geocoding-provider.js';

import { parseRequest } from './validate.js';

// Place lookups rarely change; let the browser reuse them for an hour.
const CACHE_CONTROL = 'private, max-age=3600';

const querySchema = z.strictObject({
  q: boundedText('q', INPUT_LIMITS.cityNameMax).min(
    INPUT_LIMITS.cityNameMin,
    `q must be at least ${String(INPUT_LIMITS.cityNameMin)} characters`,
  ),
});

/**
 * `GET /geocode?q=` — city search for the location combobox.
 * @param geocoder - Place search (usually cached).
 * @returns The router.
 */
export function createGeocodeRouter(geocoder: GeocodingProvider): Router {
  const router = Router();
  router.get('/geocode', async (req, res) => {
    const { q } = parseRequest(querySchema, req.query);
    const body: GeocodeResponse = { results: [...(await geocoder.search(q))] };
    res.set('Cache-Control', CACHE_CONTROL).json(body);
  });
  return router;
}
