import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { healthResponseSchema } from '@saans/shared';

import { createApp } from './app.js';
import { createServices } from './compose.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { fetchRejecting } from './test/fake-fetch.js';
import { NOW_MS } from './test/fixtures.js';

const compose = () => {
  const fetchFn = fetchRejecting(new Error('network is not allowed in tests'));
  const config = loadConfig({ NODE_ENV: 'test', WEB_DIST_DIR: 'missing-web-dist' });
  const logger = createLogger('silent');
  const deps = createServices(config, { fetchFn, clock: { now: () => NOW_MS }, logger });
  return { app: createApp(deps), deps, fetchFn };
};

describe('createServices', () => {
  it('wires an app whose health check answers ok', async () => {
    const { app } = compose();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('passes config and the injected logger through to the app', () => {
    const { deps } = compose();

    expect(deps.webDistDir).toBe('missing-web-dist');
    expect(deps.logger.level).toBe('silent');
  });

  it('answers bundled cities without calling the upstream geocoder', async () => {
    const { app, fetchFn } = compose();

    const response = await request(app).get('/api/geocode').query({ q: 'Delhi' });

    expect(response.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('routes forecasts through the injected fetch', async () => {
    const { app, fetchFn } = compose();

    const response = await request(app).get('/api/air').query({ lat: 28.61, lon: 77.21 });

    expect(response.status).toBe(502);
    expect(fetchFn).toHaveBeenCalled();
  });

  it('serves offline plans when Gemini is not configured', () => {
    const warn = vi.fn();
    const logger = Object.assign(createLogger('silent'), { warn });
    const config = loadConfig({ NODE_ENV: 'test' });

    createServices(config, {
      fetchFn: fetchRejecting(new Error('unused')),
      clock: { now: () => NOW_MS },
      logger,
    });

    expect(warn).toHaveBeenCalled();
  });
});
