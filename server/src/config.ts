import { z } from 'zod';

const MAX_PORT = 65_535;
const DEFAULT_PORT = 8080;
// Bind every interface so the container's published port (and Render's router) can reach us.
const DEFAULT_HOST = '0.0.0.0';
const NODE_ENVS = ['development', 'production', 'test'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  HOST: z.string().min(1).default(DEFAULT_HOST),
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  WEB_DIST_DIR: z.string().min(1).default('web/dist'),
});

/** Validated runtime configuration derived from environment variables. */
export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly nodeEnv: (typeof NODE_ENVS)[number];
  readonly logLevel: (typeof LOG_LEVELS)[number];
  readonly webDistDir: string;
}

/**
 * Parses and validates configuration from an environment map.
 * @param env - Environment variables, usually `process.env`.
 * @returns The validated configuration with defaults applied.
 * @throws {z.ZodError} When a variable is present but invalid (for example a non-numeric PORT).
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    webDistDir: parsed.WEB_DIST_DIR,
  };
}
