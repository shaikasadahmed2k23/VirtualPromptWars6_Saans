import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('applies defaults when variables are absent', () => {
    expect(loadConfig({})).toEqual({
      port: 8080,
      host: '0.0.0.0',
      nodeEnv: 'development',
      logLevel: 'info',
      webDistDir: 'web/dist',
    });
  });

  it('reads and coerces provided variables', () => {
    const config = loadConfig({
      PORT: '10000',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn',
      WEB_DIST_DIR: '/app/web/dist',
    });
    expect(config).toEqual({
      port: 10000,
      host: '127.0.0.1',
      nodeEnv: 'production',
      logLevel: 'warn',
      webDistDir: '/app/web/dist',
    });
  });

  it.each([['abc'], ['0'], ['70000']])('rejects invalid PORT %s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow();
  });

  it('rejects an unknown log level', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow();
  });
});
