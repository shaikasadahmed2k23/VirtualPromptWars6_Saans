import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { healthResponseSchema } from '@saans/shared';

import { createApp } from './app.js';

const INDEX_HTML = '<!doctype html><title>Saans</title>';

describe('createApp', () => {
  let webDistDir: string;

  beforeAll(async () => {
    // Dot-prefixed on purpose: the app must still serve files when installed under a dot-directory.
    webDistDir = await mkdtemp(path.join(tmpdir(), '.saans-web-'));
    await mkdir(path.join(webDistDir, 'assets'));
    await writeFile(path.join(webDistDir, 'index.html'), INDEX_HTML);
    await writeFile(path.join(webDistDir, 'assets', 'app-abc123.js'), 'export {};');
  });

  afterAll(async () => {
    await rm(webDistDir, { recursive: true, force: true });
  });

  describe('GET /api/health', () => {
    it('returns ok matching the shared contract and is not cached', async () => {
      const res = await request(createApp({ webDistDir })).get('/api/health');
      expect(res.status).toBe(200);
      expect(healthResponseSchema.parse(res.body)).toEqual({ status: 'ok' });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('does not advertise the framework', async () => {
      const res = await request(createApp({ webDistDir })).get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('web app', () => {
    it('serves hashed assets with an immutable cache policy', async () => {
      const res = await request(createApp({ webDistDir })).get('/assets/app-abc123.js');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('immutable');
    });

    it('returns 404 for a missing asset instead of the SPA shell', async () => {
      const res = await request(createApp({ webDistDir })).get('/assets/missing.js');
      expect(res.status).toBe(404);
    });

    it('falls back to index.html for client-side routes', async () => {
      const res = await request(createApp({ webDistDir })).get('/plan/today');
      expect(res.status).toBe(200);
      expect(res.text).toBe(INDEX_HTML);
      expect(res.headers['cache-control']).toBe('no-cache');
    });

    it('never serves the SPA shell for unknown API routes', async () => {
      const res = await request(createApp({ webDistDir })).get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.text).not.toBe(INDEX_HTML);
    });
  });
});
