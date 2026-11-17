import { pino, type Logger } from 'pino';

import type { AppConfig } from './config.js';

/**
 * Creates the structured JSON logger used across the server.
 * @param level - Minimum level to emit.
 * @returns A pino logger instance.
 */
export function createLogger(level: AppConfig['logLevel']): Logger {
  return pino({ level, base: { service: 'saans-server' } });
}
