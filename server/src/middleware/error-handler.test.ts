import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { apiErrorSchema } from '@saans/shared';

import { RateLimitError, UpstreamError } from '../lib/errors.js';

import { createApiNotFoundHandler, createErrorHandler, type ErrorLogger } from './error-handler.js';

const fakeLogger = () => ({
  error: vi.fn<ErrorLogger['error']>(),
  warn: vi.fn<ErrorLogger['warn']>(),
});

const appThatThrows = (handler: RequestHandler, logger: ErrorLogger = fakeLogger()): Express => {
  const app = express();
  app.use((req, _res, next) => {
    req.id = 'req-123';
    next();
  });
  app.use(express.json({ limit: '10b' }));
  app.post('/boom', handler);
  app.get('/boom', handler);
  app.use('/api', createApiNotFoundHandler());
  app.use(createErrorHandler(logger));
  return app;
};

describe('createErrorHandler', () => {
  it('maps an AppError to its status and code', async () => {
    const res = await request(
      appThatThrows(() => {
        throw new RateLimitError('Too many requests');
      }),
    ).get('/boom');
    expect(res.status).toBe(429);
    expect(apiErrorSchema.parse(res.body)).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    });
  });

  it('never leaks the cause of an AppError', async () => {
    const cause = new Error('ECONNRESET at 10.0.0.1');
    const res = await request(
      appThatThrows(() => {
        throw new UpstreamError('Air quality service unavailable', { cause });
      }),
    ).get('/boom');
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('ECONNRESET');
  });

  it('turns unknown errors into a generic 500 and logs them with the request id', async () => {
    const logger = fakeLogger();
    const secret = new Error('db password is hunter2');
    const res = await request(
      appThatThrows(() => {
        throw secret;
      }, logger),
    ).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
    expect(res.text).not.toContain('hunter2');
    expect(res.text).not.toContain('at ');
    expect(logger.error).toHaveBeenCalledWith({ err: secret, reqId: 'req-123' }, 'unhandled error');
  });

  it('maps an oversized JSON body to 413', async () => {
    const res = await request(appThatThrows(vi.fn()))
      .post('/boom')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: 'far more than ten bytes' }));
    expect(res.status).toBe(413);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('maps malformed JSON to 400', async () => {
    const res = await request(appThatThrows(vi.fn()))
      .post('/boom')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('delegates to Express (which aborts the socket) when the response has already started', async () => {
    const logger = fakeLogger();
    const partial = appThatThrows((_req, res, next) => {
      res.status(200).write('partial');
      next(new Error('late failure'));
    }, logger);
    await expect(request(partial).get('/boom')).rejects.toThrow('aborted');
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('createApiNotFoundHandler', () => {
  it('answers unmatched API routes with a JSON 404', async () => {
    const res = await request(appThatThrows(vi.fn())).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'API route not found' } });
  });
});
