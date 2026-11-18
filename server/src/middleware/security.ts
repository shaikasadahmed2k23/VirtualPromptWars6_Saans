import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { RateLimitError } from '../lib/errors.js';

const MS_PER_MINUTE = 60_000;

/** Requests allowed per client IP per minute. */
export interface RateLimits {
  /** `POST /api/plan`: each call may reach Gemini, so it is the tightest. */
  readonly plan: number;
  /** Every other `/api` route. */
  readonly general: number;
}

/** Production limits. */
export const DEFAULT_RATE_LIMITS: RateLimits = { plan: 10, general: 60 };

/**
 * Helmet with a strict Content-Security-Policy: same-origin only, no inline scripts, no framing.
 * @returns The helmet middleware.
 */
export function createSecurityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  });
}

/**
 * Per-IP rate limiter that reports overruns through the central error handler (429).
 * @param limit - Requests allowed per minute.
 * @returns The limiter middleware.
 */
export function createRateLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: MS_PER_MINUTE,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new RateLimitError('Too many requests. Please wait a minute and try again.'));
    },
  });
}
