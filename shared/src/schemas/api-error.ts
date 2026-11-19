import { z } from 'zod';

import { INPUT_LIMITS } from '../constants/index.js';

import { boundedText } from './primitives.js';

/** Machine-readable error codes returned by the API. */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'GEOCODING_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

/** The single error shape every API failure uses: `{ error: { code, message } }`. */
export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: boundedText('message', INPUT_LIMITS.textMax),
  }),
});

/** API error code. */
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
/** API error body. */
export type ApiError = z.infer<typeof apiErrorSchema>;
