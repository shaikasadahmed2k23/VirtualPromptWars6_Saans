import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('applies defaults when variables are absent, with AI unconfigured', () => {
    expect(loadConfig({})).toEqual({
      port: 8080,
      host: '0.0.0.0',
      nodeEnv: 'development',
      logLevel: 'info',
      webDistDir: 'web/dist',
      geminiApiKey: null,
      geminiModel: null,
    });
  });

  it('reads and coerces provided variables', () => {
    const config = loadConfig({
      PORT: '10000',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn',
      WEB_DIST_DIR: '/app/web/dist',
      GEMINI_API_KEY: ' test-key ',
      GEMINI_MODEL: 'a-model',
    });
    expect(config).toEqual({
      port: 10000,
      host: '127.0.0.1',
      nodeEnv: 'production',
      logLevel: 'warn',
      webDistDir: '/app/web/dist',
      geminiApiKey: 'test-key',
      geminiModel: 'a-model',
    });
  });

  it('treats blank Gemini settings as not configured', () => {
    const config = loadConfig({ GEMINI_API_KEY: '   ', GEMINI_MODEL: '' });
    expect(config.geminiApiKey).toBeNull();
    expect(config.geminiModel).toBeNull();
  });

  it.each([['abc'], ['0'], ['70000']])('rejects invalid PORT %s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow();
  });

  it('rejects an unknown log level', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow();
  });
});
