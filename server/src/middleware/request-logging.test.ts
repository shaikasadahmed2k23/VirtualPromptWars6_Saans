import { Writable } from 'node:stream';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createLogger } from '../logger.js';
import { createTestApp } from '../test/test-app.js';

const capture = (): {
  lines: () => Record<string, unknown>[];
  text: () => string;
  logger: ReturnType<typeof createLogger>;
} => {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return {
    logger: createLogger('info', stream),
    text: () => chunks.join(''),
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
};

describe('request logging', () => {
  it('logs id, method, path and status only: no headers, IPs, cookies or query strings', async () => {
    const { logger, lines, text } = capture();
    await request(createTestApp({ logger }))
      .get('/api/air?lat=28.61&lon=77.2')
      .set('Authorization', 'Bearer secret-token')
      .set('Cookie', 'session=abc123')
      .set('X-Forwarded-For', '203.0.113.7')
      .set('User-Agent', 'curl-test-agent');
    const [entry] = lines();
    expect(entry?.['req']).toEqual({
      id: expect.any(String) as string,
      method: 'GET',
      url: '/api/air',
    });
    expect(entry?.['res']).toEqual({ statusCode: 200 });
    const output = text();
    for (const leaked of [
      'secret-token',
      'abc123',
      '203.0.113.7',
      '127.0.0.1',
      'curl-test-agent',
      '28.61',
    ]) {
      expect(output).not.toContain(leaked);
    }
    expect(output).not.toContain('headers');
    expect(output).not.toContain('remoteAddress');
  });

  it('does not log health checks', async () => {
    const { logger, lines } = capture();
    await request(createTestApp({ logger })).get('/api/health').expect(200);
    expect(lines()).toEqual([]);
  });
});

describe('createLogger redaction', () => {
  it('masks credentials if a request ever reaches a log call', () => {
    const { logger, text } = capture();
    logger.info({ req: { headers: { authorization: 'Bearer abc', cookie: 'sid=1' } } }, 'x');
    expect(text()).not.toMatch(/Bearer abc|sid=1/);
    expect(text()).toContain('[redacted]');
  });
});
