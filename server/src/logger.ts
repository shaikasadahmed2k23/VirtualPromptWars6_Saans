import { pino, type DestinationStream, type Logger } from 'pino';

import type { AppConfig } from './config.js';

// Belt and braces: even if a full request ever reaches a log call, credentials are masked.
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
];

/**
 * Creates the structured JSON logger used across the server.
 * @param level - Minimum level to emit.
 * @param destination - Where lines go; defaults to stdout (tests pass a capturing stream).
 * @returns A pino logger instance.
 */
export function createLogger(
  level: AppConfig['logLevel'],
  destination?: DestinationStream,
): Logger {
  return pino(
    {
      level,
      base: { service: 'saans-server' },
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    },
    destination,
  );
}
