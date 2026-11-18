# Progress log

Running log of autonomous work. Each entry: what's done, decisions made, anything left.

## Phase 0–1 (done before this log)

- Scaffold, tooling, CI and Docker (`59750a4`); CLAUDE.md moved to Node 22 and the production-only audit (`35e8ff6`); shared contracts and the pure domain layer (`6db2c50`); explicit `HOST=0.0.0.0` (`91aaf1c`).
- Repo: https://github.com/shaikasadahmed2k23/VirtualPromptWars6_Saans. CI is green on `91aaf1c` (check + docker jobs).

## 2.1 lib/ — TTL cache, errors, error middleware

- Done: `Clock`, `TtlCache` (TTL, max entries, evicts oldest write), `AppError` + Validation/NotFound/PayloadTooLarge/RateLimit/Upstream, central error middleware, JSON `/api` 404, pino-http request ids (new dep: needed for request-id logging).
- Decisions: added `PAYLOAD_TOO_LARGE` (413) to the shared error codes; any 4xx `http-errors` from Express internals keeps its meaning (a missing asset is a JSON 404, not a 500); import/order no longer puts type imports in their own group; jest-dom matchers are now registered explicitly (the side-effect entry stopped working under Vitest 5).

## 2.2 providers/ — Open-Meteo air quality + geocoding

- Done: `AqiProvider`/`OpenMeteoAqiProvider` (pm2_5+pm10, 2 days, timezone=auto; nulls dropped as gaps) and `GeocodingProvider`/`OpenMeteoGeocodingProvider` (5 results), both behind caching decorators (15 min by coords rounded to 2 dp; 24 h by normalized query). `fetchJson` helper: AbortController timeout (5 s), and every failure becomes `UpstreamError`.
- Decisions: caching is a decorator (`Cached*Provider`), not built into the HTTP class; the cache key's rounded coordinates are also the coordinates queried; the forecast carries `utcOffsetSeconds` so the plan can find the location's current hour; `GeoPlace` lives in `shared/` for the web combobox.

## 2.3 Plan generation

- Done: `deriveImpacts` (metro switch, N95 commute, exercise shift / indoors, close windows, run/buy purifier — only if relevant), `PlanContext`/`PlanGenerator`, `GeminiPlanGenerator` (`responseJsonSchema`, temperature 0.2, 8 s timeout + 1 retry, strict zod parse, unknown impact ids rejected), `RuleBasedPlanGenerator` (reviewed en + hi copy), `AirService`, `PlanService` (geocode → forecast → domain → AI or fallback, 1-hour cache keyed by a SHA-256 of the normalized profile + rounded location + local hour). Shared schemas split into `shared/src/schemas/`.
- Decisions: impact **titles** always come from our copy, and Gemini writes only explanations (any it skips are filled deterministically); Gemini's JSON schema is derived from zod with unsupported keywords stripped (zod still enforces lengths); exact coordinates are never sent to Gemini; commute exposure assumes 20 km/h door-to-door and per-mode activity/shielding (product estimates in `constants.ts`); routine times are `HH:MM`; response field `source: "ai" | "fallback"`. **Left:** the Gemini call hasn't been run against the live API (no key here), so check one real plan once `GEMINI_API_KEY` is set.

## 2.4 HTTP layer

- Done: `createApp(deps)` composition with DI; `index.ts` wires real providers/caches. Routes `GET /api/geocode?q=`, `GET /api/air?lat=&lon=`, `POST /api/plan`. Middleware: helmet with strict CSP (self only, no inline), `trust proxy` 1, compression, pino-http request ids, 10 kB JSON limit, per-IP limits (plan 10/min, other `/api` 60/min, health exempt), JSON 404, error handler last. New deps: helmet, express-rate-limit, compression (+ types). Smoke-tested the built server against live Open-Meteo: health, air (Delhi NAQI 201), geocode, and a Hindi fallback plan for Lucknow all returned 200.
- Decisions: "CORS same-origin" means no CORS middleware at all, since browsers then block cross-origin reads (tested: no `Access-Control-Allow-Origin`); missing `GEMINI_API_KEY` **or** `GEMINI_MODEL` → warning + offline plans, server still boots; blank env values count as unset; the health route sits outside the rate limiter so keep-alive pings never get 429.

## 3.1 Web foundations

- Done: typed `ApiClient` (all responses validated with the shared zod schemas; failures typed as server error codes or `NETWORK_ERROR`/`BAD_RESPONSE`) injected through `ApiProvider`; `useAsyncTask` (one request at a time, aborts superseded/unmounted ones) under `useAirQuality`, `usePlan`, `useCitySearch` (300 ms debounce, ≥ 2 chars), and `useGeolocation`; en + hi dictionaries with a key-parity test; `I18nProvider` keeps `<html lang>` in sync; NAQI category colours + distinct icons, contrast-tested ≥ 4.5:1.
- Decisions: category colours are near-CPCB but adjusted for AA contrast; UI shows translated messages by error code, never raw server text; `@saans/shared` is now a web dependency (bundled by Vite). Lint config: destructured params (React props) are documented on their interfaces rather than per field.

## 3.2 Screens

- Done: one page — header (wordmark, tagline, en/hi toggle, skip link) → location ("Use my location" + ARIA combobox city search with debounced listbox and live status) → air now (big NAQI, category as text + icon + colour, dominant pollutant, CPCB advisory, "indicative" note) → 48 h CSS bar strip with best/worst windows marked + visually hidden table → profile form (4 fieldsets, labels, hints, inline errors with `aria-describedby`, focused error summary with links) → plan (polite live region, lazy-loaded results: source badge, summary, routine timeline, indoor hacks, alternatives, impact cards labelled "Estimate", disclaimer). Skeletons, error-with-retry and empty states throughout. Results chunk is code-split (3 kB).
- Decisions: the advisory shown is the dictionary's CPCB statement for the category (the server's is English-only); `PlanResponse` gained `language`, so a plan keeps its `lang` after the UI toggles; system font stack (CSP allows no external fonts); bar heights use React style properties (CSSOM, allowed by the strict CSP). New dev dep: `@testing-library/user-event` (real typing/keyboard in tests).
