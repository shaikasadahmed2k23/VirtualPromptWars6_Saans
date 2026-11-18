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
      geminiModels: [],
      geminiThinkingLevel: null,
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
      GEMINI_THINKING_LEVEL: ' low ',
    });
    expect(config).toEqual({
      port: 10000,
      host: '127.0.0.1',
      nodeEnv: 'production',
      logLevel: 'warn',
      webDistDir: '/app/web/dist',
      geminiApiKey: 'test-key',
      geminiModels: ['a-model'],
      geminiThinkingLevel: 'low',
    });
  });

  it('treats blank Gemini settings as not configured', () => {
    const config = loadConfig({ GEMINI_API_KEY: '   ', GEMINI_MODEL: '' });
    expect(config.geminiApiKey).toBeNull();
    expect(config.geminiModels).toEqual([]);
    expect(config.geminiThinkingLevel).toBeNull();
  });

  it('reads an ordered model list, trimming, dropping blanks and duplicates', () => {
    const config = loadConfig({ GEMINI_MODELS: ' a-model, b-model ,,a-model' });
    expect(config.geminiModels).toEqual(['a-model', 'b-model']);
  });

  it('prefers GEMINI_MODELS over the single GEMINI_MODEL, which still works alone', () => {
    expect(loadConfig({ GEMINI_MODEL: 'old', GEMINI_MODELS: 'new' }).geminiModels).toEqual(['new']);
    expect(loadConfig({ GEMINI_MODEL: 'old' }).geminiModels).toEqual(['old']);
  });

  it('rejects an unknown thinking level', () => {
    expect(() => loadConfig({ GEMINI_THINKING_LEVEL: 'extreme' })).toThrow();
  });

  it.each([['abc'], ['0'], ['70000']])('rejects invalid PORT %s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow();
  });

  it('rejects an unknown log level', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow();
  });
});
