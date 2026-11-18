import { describe, expect, it, vi } from 'vitest';

import { AIR_RESPONSE, DELHI, PLAN_RESPONSE } from '../test/fixtures.js';

import { ApiError, createApiClient, type FetchFn } from './api-client.js';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clientReturning = (response: Response | Error | DOMException) => {
  const fetchFn = vi.fn<FetchFn>(() =>
    response instanceof Response ? Promise.resolve(response) : Promise.reject(response),
  );
  return { fetchFn, client: createApiClient(fetchFn) };
};

const failureOf = async (promise: Promise<unknown>): Promise<string> => {
  const error: unknown = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return (error as ApiError).code;
};

describe('createApiClient', () => {
  it('GETs air quality for coordinates and validates the response', async () => {
    const { fetchFn, client } = clientReturning(json(AIR_RESPONSE));
    await expect(client.getAir({ latitude: 28.6, longitude: 77.2 })).resolves.toEqual(AIR_RESPONSE);
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/air?lat=28.6&lon=77.2',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('searches places and returns the result list', async () => {
    const { fetchFn, client } = clientReturning(json({ results: [DELHI] }));
    const controller = new AbortController();
    await expect(client.geocode('New Delhi', controller.signal)).resolves.toEqual([DELHI]);
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/geocode?q=New+Delhi',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('POSTs the profile as JSON for a plan', async () => {
    const { fetchFn, client } = clientReturning(json(PLAN_RESPONSE));
    const profile = { language: 'en' } as never;
    await expect(client.createPlan(profile)).resolves.toEqual(PLAN_RESPONSE);
    const init = fetchFn.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ profile }));
  });

  it('maps the server error code', async () => {
    const { client } = clientReturning(
      json({ error: { code: 'RATE_LIMITED', message: 'Slow down' } }, 429),
    );
    expect(await failureOf(client.geocode('Delhi'))).toBe('RATE_LIMITED');
  });

  it.each([
    ['a network failure', new TypeError('Failed to fetch'), 'NETWORK_ERROR'],
    ['a non-JSON body', new Response('<html>', { status: 502 }), 'BAD_RESPONSE'],
    ['an error without the error shape', json({ oops: true }, 500), 'BAD_RESPONSE'],
    ['a body that breaks the contract', json({ results: 'nope' }), 'BAD_RESPONSE'],
  ])('reports %s', async (_label, response, code) => {
    expect(await failureOf(clientReturning(response).client.geocode('Delhi'))).toBe(code);
  });

  it('rethrows aborts untouched so callers can ignore them', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('Aborted', 'AbortError');
    const { client } = clientReturning(abort);
    await expect(client.geocode('Delhi', controller.signal)).rejects.toBe(abort);
  });
});
