import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { apiErrorSchema } from '@saans/shared';

import type { AqiProvider } from '../providers/aqi-provider.js';
import { PROFILE } from '../test/fixtures.js';
import { createTestApp } from '../test/test-app.js';

describe('rate limiting', () => {
  it('answers 429 once a client exceeds the plan limit', async () => {
    const app = createTestApp({ rateLimits: { plan: 2, general: 100 } });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await request(app).post('/api/plan').send({ profile: PROFILE })).status).toBe(200);
    }
    const res = await request(app).post('/api/plan').send({ profile: PROFILE });
    expect(res.status).toBe(429);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('RATE_LIMITED');
    // IETF draft-8 policy: quota 2 requests per 60-second window.
    expect(res.headers['ratelimit-policy']).toMatch(/q=2; w=60/);
  });

  it('limits every API route and counts clients separately behind the proxy', async () => {
    const app = createTestApp({ rateLimits: { plan: 10, general: 1 } });
    const from = (ip: string) =>
      request(app).get('/api/geocode?q=Delhi').set('X-Forwarded-For', ip);
    expect((await from('203.0.113.1')).status).toBe(200);
    expect((await from('203.0.113.1')).status).toBe(429);
    expect((await from('203.0.113.2')).status).toBe(200);
  });

  it('never throttles the health check', async () => {
    const app = createTestApp({ rateLimits: { plan: 1, general: 1 } });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await request(app).get('/api/health')).status).toBe(200);
    }
  });
});

describe('security headers', () => {
  it('sends a strict same-origin CSP and hardening headers', async () => {
    const res = await request(createTestApp()).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  it('grants no cross-origin access', async () => {
    const res = await request(createTestApp())
      .get('/api/geocode?q=Delhi')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never leaks a stack trace', async () => {
    const aqi: AqiProvider = { getForecast: () => Promise.reject(new TypeError('x is undefined')) };
    const res = await request(createTestApp({ aqi })).get('/api/air?lat=1&lon=1');
    expect(res.status).toBe(500);
    expect(res.text).not.toMatch(/TypeError|at .*\.ts/);
  });
});
