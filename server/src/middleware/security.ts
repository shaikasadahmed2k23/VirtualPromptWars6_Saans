import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { MS_PER_MINUTE } from '@saans/shared';

import { RateLimitError } from '../lib/errors.js';

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
 * Browser features the app may use. Only geolocation is allowed, and only for our own origin,
 * because "Use my location" needs it; everything else is switched off.
 */
export const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=(self)',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
].join(', ');

/**
 * Sends {@link PERMISSIONS_POLICY} on every response (helmet does not set this header).
 * @returns The middleware.
 */
export function createPermissionsPolicy(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  };
}

/**
 * Helmet with a strict Content-Security-Policy: same-origin only, no inline scripts or script
 * attributes, no framing (also sent as X-Frame-Options: DENY for older browsers).
 * @returns The helmet middleware.
 */
export function createSecurityHeaders(): RequestHandler {
  return helmet({
    frameguard: { action: 'deny' },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
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
