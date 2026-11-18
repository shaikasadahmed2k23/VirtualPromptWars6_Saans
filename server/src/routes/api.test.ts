import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  airResponseSchema,
  apiErrorSchema,
  geocodeResponseSchema,
  planResponseSchema,
  type PlanContent,
} from '@saans/shared';

import { UpstreamError } from '../lib/errors.js';
import type { PlanGenerator } from '../plan/plan-generator.js';
import type { AqiProvider } from '../providers/aqi-provider.js';
import { PROFILE } from '../test/fixtures.js';
import { createTestApp } from '../test/test-app.js';

const errorCode = (body: unknown): string => apiErrorSchema.parse(body).error.code;
const errorMessage = (body: unknown): string => apiErrorSchema.parse(body).error.message;

describe('GET /api/geocode', () => {
  it('returns matching places', async () => {
    const res = await request(createTestApp()).get('/api/geocode').query({ q: 'Delhi' });
    expect(res.status).toBe(200);
    expect(geocodeResponseSchema.parse(res.body).results[0]?.name).toBe('Delhi');
  });

  it.each([
    ['missing q', ''],
    ['too short', '?q=D'],
    ['too long', `?q=${'x'.repeat(101)}`],
    ['repeated q', '?q=Delhi&q=Mumbai'],
    ['unknown parameter', '?q=Delhi&debug=1'],
  ])('rejects %s with 400', async (_label, query) => {
    const res = await request(createTestApp()).get(`/api/geocode${query}`);
    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/air', () => {
  it('returns current NAQI, the hourly series and windows', async () => {
    const res = await request(createTestApp()).get('/api/air?lat=28.61&lon=77.21');
    expect(res.status).toBe(200);
    const body = airResponseSchema.parse(res.body);
    expect(body.current).toMatchObject({ time: '2026-11-18T06:00', category: 'veryPoor' });
    expect(body.hourly).toHaveLength(42);
    expect(body.bestWindow?.start).toBe('2026-11-18T14:00');
    expect(res.headers['cache-control']).toBe('private, max-age=900');
  });

  it.each([
    ['missing lat', '?lon=77.2', 'lat: lat is required'],
    ['empty lat', '?lat=&lon=77.2', 'lat: lat is required'],
    ['non-numeric lon', '?lat=28.6&lon=east', 'lon: lon must be a number'],
    ['latitude out of range', '?lat=91&lon=77.2', 'lat: lat must be at most 90'],
    ['longitude out of range', '?lat=28.6&lon=-181', 'lon: lon must be at least -180'],
  ])('rejects %s with 400', async (_label, query, message) => {
    const res = await request(createTestApp()).get(`/api/air${query}`);
    expect(res.status).toBe(400);
    expect(errorMessage(res.body)).toBe(message);
  });

  it('maps an upstream failure to 502', async () => {
    const aqi: AqiProvider = {
      getForecast: () => Promise.reject(new UpstreamError('Air quality service timed out')),
    };
    const res = await request(createTestApp({ aqi })).get('/api/air?lat=28.6&lon=77.2');
    expect(res.status).toBe(502);
    expect(apiErrorSchema.parse(res.body).error).toEqual({
      code: 'UPSTREAM_ERROR',
      message: 'Air quality service timed out',
    });
  });

  it('compresses large responses', async () => {
    const res = await request(createTestApp())
      .get('/api/air?lat=28.61&lon=77.21')
      .set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBe('gzip');
  });
});

describe('POST /api/plan', () => {
  it('returns a validated offline plan when no AI is configured', async () => {
    const res = await request(createTestApp()).post('/api/plan').send({ profile: PROFILE });
    expect(res.status).toBe(200);
    const plan = planResponseSchema.parse(res.body);
    expect(plan.source).toBe('fallback');
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('returns an AI-written plan when Gemini succeeds', async () => {
    const content: PlanContent = {
      summary: 'AI summary.',
      routine: [],
      indoorHacks: [],
      alternatives: [],
      impactExplanations: {},
    };
    const ai = { generate: vi.fn<PlanGenerator['generate']>(() => Promise.resolve(content)) };
    const res = await request(createTestApp({ ai })).post('/api/plan').send({ profile: PROFILE });
    expect(planResponseSchema.parse(res.body)).toMatchObject({
      source: 'ai',
      summary: 'AI summary.',
    });
  });

  it('falls back when Gemini fails', async () => {
    const ai = {
      generate: vi.fn<PlanGenerator['generate']>(() => Promise.reject(new Error('boom'))),
    };
    const res = await request(createTestApp({ ai })).post('/api/plan').send({ profile: PROFILE });
    expect(res.status).toBe(200);
    expect(planResponseSchema.parse(res.body).source).toBe('fallback');
  });

  it.each([
    ['a missing profile', {}, 'profile: Invalid input: expected object, received undefined'],
    [
      'no adults',
      { profile: { ...PROFILE, household: { ...PROFILE.household, adults: 0 } } },
      'profile.household.adults: adults must be at least 1',
    ],
    [
      'an unknown language',
      { profile: { ...PROFILE, language: 'fr' } },
      'profile.language: language must be one of: en, hi',
    ],
    [
      'a diagnosis field',
      { profile: { ...PROFILE, diagnosis: 'asthma' } },
      'profile: Unrecognized key: "diagnosis"',
    ],
    [
      'over-long notes',
      { profile: { ...PROFILE, notes: 'x'.repeat(501) } },
      'profile.notes: notes must be at most 500 characters',
    ],
  ])('rejects %s with 400', async (_label, body, message) => {
    const res = await request(createTestApp()).post('/api/plan').send(body);
    expect(res.status).toBe(400);
    expect(errorMessage(res.body)).toBe(message);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(createTestApp())
      .post('/api/plan')
      .set('Content-Type', 'application/json')
      .send('{"profile":');
    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('VALIDATION_ERROR');
  });

  it('rejects a body over 10 kB with 413', async () => {
    const res = await request(createTestApp())
      .post('/api/plan')
      .send({ profile: PROFILE, padding: 'x'.repeat(11 * 1024) });
    expect(res.status).toBe(413);
    expect(errorCode(res.body)).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 404 when the city cannot be found', async () => {
    const geocoder = { search: vi.fn(() => Promise.resolve([])) };
    const res = await request(createTestApp({ geocoder }))
      .post('/api/plan')
      .send({ profile: { ...PROFILE, location: { kind: 'city', name: 'Atlantis' } } });
    expect(res.status).toBe(404);
    expect(errorCode(res.body)).toBe('NOT_FOUND');
  });
});
