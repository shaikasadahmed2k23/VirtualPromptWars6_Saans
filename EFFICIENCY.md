# Efficiency

Measured on 2026-11-19. Bundle sizes come from `npm run build`, Lighthouse from version 12.8.2 against the live site, and timings from `curl` against the live site.

## Caching

All three caches are [TtlCache](server/src/lib/ttl-cache.ts) instances built in [compose.ts](server/src/compose.ts). Each has a TTL and a size cap; when full it evicts the oldest entry. Failed loads are never cached.

| Layer                | TTL    | Max entries | Key                                                                                | Defined in                                                          |
| -------------------- | ------ | ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Air-quality forecast | 15 min | 500         | Coordinates rounded to 2 dp (about a 1 km cell)                                    | [aqi-provider.ts](server/src/providers/aqi-provider.ts)             |
| Geocoding            | 24 h   | 1,000       | Query trimmed, whitespace-collapsed and lower-cased                                | [geocoding-provider.ts](server/src/providers/geocoding-provider.ts) |
| Plan                 | 1 h    | 500         | SHA-256 of the normalized profile, the location rounded to 2 dp and the local hour | [plan-service.ts](server/src/services/plan-service.ts)              |
| Bundled city list    | —      | 109 cities  | Searched before the geocoder, so common searches never leave the process           | [indian-cities.ts](server/src/providers/indian-cities.ts)           |

**Stale-while-error.** If Open-Meteo fails after a forecast's TTL has passed, `CachedAqiProvider` serves the last good copy for up to **6 h** (`AQI_STALE_GRACE_MS`). It sets `staleMinutes`, and the UI tells the reader how old the data is. Tested in `serves the last good forecast marked with its age, and logs why` and `does not serve data older than the grace period` ([open-meteo-aqi-provider.test.ts](server/src/providers/open-meteo-aqi-provider.test.ts)).

## Bounded upstream calls

| Call            | Budget                                                                                                                                                                                                       | Defined in                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Open-Meteo      | **5 s** timeout per call (`AbortController`). A dropped connection, 429 or 5xx is retried **once** after 300 ms + up to 400 ms of random jitter. Timeouts and malformed bodies are not retried.              | [fetch-json.ts](server/src/lib/fetch-json.ts)                        |
| Gemini          | **8 s** per call, all calls inside a **20 s** overall budget. `GEMINI_MODELS` is tried in order, once per model; a lone `GEMINI_MODEL` gets one retry. Output is schema-constrained JSON at temperature 0.2. | [gemini-plan-generator.ts](server/src/plan/gemini-plan-generator.ts) |
| Gemini fallback | When the budget is spent, or the output is invalid, `RuleBasedPlanGenerator` writes the plan at once from the same facts, with no further network call.                                                      | [plan-service.ts](server/src/services/plan-service.ts)               |

Tests: `does not retry a timeout`, `gives up after a single retry`, `waits a jittered delay and logs why, without the URL` ([fetch-json.test.ts](server/src/lib/fetch-json.test.ts)); `stops trying models once the overall budget is spent`, `retries a lone model once, since there is nothing else to fall back to` ([gemini-model-fallback.test.ts](server/src/plan/gemini-model-fallback.test.ts)).

## Delivery

- **Compression.** The `compression` middleware is mounted for every response ([app.ts](server/src/app.ts); test: `compresses large responses`). The live HTML is served with `Content-Encoding: br`.
- **Caching headers.** Content-hashed files under `/assets` are sent as `immutable` with a one-year max-age. `index.html` is `no-cache`, so a deploy shows up at once ([web-app.ts](server/src/web-app.ts); test: `serves hashed assets with an immutable cache policy`).
- **Body cap.** JSON bodies over **10 kB** are rejected with 413 before any work is done ([app.ts](server/src/app.ts); test: `rejects a body over 10 kB with 413`).
- **No health-check noise.** `/api/health` skips the rate limiter and request logging.

## Front-end bundle

From `npm run build` (Vite):

| File                                  | Size      | gzip     | When it loads                                                                                           |
| ------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `index.html`                          | 1.15 kB   | 0.66 kB  | First request                                                                                           |
| `index-*.css`                         | 17.43 kB  | 4.33 kB  | First request                                                                                           |
| `index-*.js` (React + app shell)      | 197.09 kB | 64.14 kB | First request                                                                                           |
| `schemas-*.js` (zod + shared schemas) | 85.53 kB  | 24.64 kB | On the first API call. It is a dynamic `import()` in [api-client.ts](web/src/api/api-client.ts)         |
| `plan-results-*.js`                   | 3.36 kB   | 1.05 kB  | When a plan arrives. It is `React.lazy` in [plan-section.tsx](web/src/components/plan/plan-section.tsx) |

The 48-hour chart is plain CSS, with no chart library. The server bundle (tsdown) is 124.83 kB (39.34 kB gzip).

## Container

The [Dockerfile](Dockerfile) has three stages: `build` compiles web and server, `deps` installs production dependencies of the server only (`npm ci --omit=dev --ignore-scripts`), and `runtime` copies just the compiled output and those dependencies. It runs as the non-root `node` user and declares a `HEALTHCHECK` on `/api/health`. CI builds the image and probes it on every push.

## Live performance

| Lighthouse 12.8.2 | Performance | FCP   | LCP   | Total blocking time | CLS | Speed index |
| ----------------- | ----------- | ----- | ----- | ------------------- | --- | ----------- |
| Mobile            | 99          | 1.4 s | 1.4 s | 70 ms               | 0   | 1.6 s       |
| Desktop           | 100         | 0.4 s | 0.4 s | 0 ms                | 0   | 0.5 s       |

Live API, measured with `curl` from one client: `GET /api/health` answered 200 in 0.40 s, and a first-time `POST /api/plan` for Delhi (a Gemini-written plan, `source: "ai"`) answered 200 in 5.51 s. The Lighthouse command and flags are in [ACCESSIBILITY.md](ACCESSIBILITY.md#lighthouse-live-site).
