# Testing

Measured on `main` on 2026-11-19 with `npm run check` (Vitest 5.1, v8 coverage). **560 tests in 52 files, 0 failures.** No test touches the network: Open-Meteo is replaced by an injected fake `fetch` ([server/src/test/fake-fetch.ts](server/src/test/fake-fetch.ts)), Gemini by an injected `generateContent`, and the clock by a fake `Clock`.

## Test pyramid

| Package / layer                                     | Files  | Tests   | What is covered                                                                                                                          |
| --------------------------------------------------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/` schemas                                   | 1      | 40      | Every zod contract: strict objects, ranges, length caps, unknown keys rejected                                                           |
| `shared/` helpers                                   | 5      | 29      | Local-time, relative-day, place-label and NAQI text helpers; health contract                                                             |
| **shared total**                                    | **6**  | **69**  |                                                                                                                                          |
| `server/src/domain/` (pure units)                   | 7      | 139     | Every NAQI breakpoint, window edge cases, impact maths against hand-calculated values, routine scheduling, rounding, local time          |
| `server/src/plan/`                                  | 8      | 113     | Gemini generator (mocked): valid, invalid, timeout, retry, model list, budget; rule-based plans in en + hi; prompt fencing; impact rules |
| `server/src/lib/`                                   | 5      | 48      | `fetchJson` timeout / retry with jitter, `TtlCache` expiry, eviction and stale grace, error classes, graceful shutdown                   |
| `server/src/providers/` (fake `fetch`)              | 3      | 31      | Open-Meteo request and mapping, nulls as gaps, malformed bodies, caching, stale-while-error, bundled cities                              |
| `server/src/routes/` (supertest)                    | 1      | 27      | Every route: 200, 400, 404, 413, 502, fallback path, compression                                                                         |
| `server/src/middleware/` (supertest)                | 3      | 19      | Security headers on API and HTML, 429 rate limits, no CORS grant, no stack traces, error mapping, privacy-safe request logs              |
| `server/src/services/`                              | 1      | 11      | `PlanService`: AI path, fallback path, deterministic numbers and titles, plan cache, city not found                                      |
| `server/src/` root                                  | 4      | 23      | `createApp` (static assets, SPA fallback, health), composition root wired with fakes, config parsing, logger                             |
| **server total**                                    | **32** | **411** |                                                                                                                                          |
| `web/src/` app + a11y (Testing Library, vitest-axe) | 2      | 10      | Whole-page flows; axe on 6 page states; skip link and landmarks; Hindi switch; geolocation allowed and denied; zod JIT off for the CSP   |
| `web/src/components/`                               | 5      | 29      | Air now, 48 h strip and its table, ARIA combobox keyboard pattern, profile form validation, plan results                                 |
| `web/src/hooks/`                                    | 3      | 16      | Async task races, air and plan loading and retry, debounced city search, geolocation, form validation                                    |
| `web/src/api/`                                      | 2      | 10      | Typed client validates every response, maps error codes, passes aborts through                                                           |
| `web/src/i18n/`, `web/src/naqi/`                    | 2      | 15      | Hindi covers every English key, `<html lang>` follows the toggle, category colours ≥ 4.5:1 contrast                                      |
| **web total**                                       | **14** | **80**  |                                                                                                                                          |

## Coverage

| Package   | Statements        | Branches          | Functions       | Lines           | Threshold (all four metrics)                                                             |
| --------- | ----------------- | ----------------- | --------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `shared/` | 100 % (100/100)   | 100 % (4/4)       | 100 % (19/19)   | 100 % (98/98)   | 100 % ([shared/vitest.config.ts](shared/vitest.config.ts))                               |
| `server/` | 100 % (751/751)   | 98.78 % (325/329) | 100 % (242/242) | 100 % (719/719) | 90 %, and 100 % for `src/domain/**` ([server/vitest.config.ts](server/vitest.config.ts)) |
| `web/`    | 99.75 % (401/402) | 98.32 % (176/179) | 100 % (165/165) | 100 % (376/376) | 90 % ([web/vitest.config.ts](web/vitest.config.ts))                                      |

`server/src/domain/` is at 100 % on every metric. The run fails if any threshold is missed.

## Key edge cases

| Test (exact name)                                                                                              | File                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `PM2.5 %d µg/m³ → %d`: each band's low end, high end and high + 0.1, for PM2.5 and PM10                        | [server/src/domain/naqi.test.ts](server/src/domain/naqi.test.ts)                                             |
| `caps at 500 beyond the assumed Severe upper breakpoint`                                                       | [server/src/domain/naqi.test.ts](server/src/domain/naqi.test.ts)                                             |
| `still returns the least-bad window when every waking hour is Severe`, `never spans a gap in the forecast`     | [server/src/domain/windows.test.ts](server/src/domain/windows.test.ts)                                       |
| `at 16:14 IST the best window is tomorrow, labelled so, and blocks run in order from now`                      | [server/src/plan/time-awareness.test.ts](server/src/plan/time-awareness.test.ts)                             |
| `labels a window on the next calendar day as Tomorrow, by the location’s clock`                                | [web/src/components/air/forecast-strip.test.tsx](web/src/components/air/forecast-strip.test.tsx)             |
| `serves the last good forecast marked with its age, and logs why` (stale-while-error)                          | [server/src/providers/open-meteo-aqi-provider.test.ts](server/src/providers/open-meteo-aqi-provider.test.ts) |
| `retries once, then throws UpstreamError on %s`: invalid JSON, empty response, schema break, unknown impact id | [server/src/plan/gemini-plan-generator.test.ts](server/src/plan/gemini-plan-generator.test.ts)               |
| `falls back to the offline plan and logs a warning when Gemini fails`                                          | [server/src/services/plan-service.test.ts](server/src/services/plan-service.test.ts)                         |
| `uses AI text when Gemini succeeds, but keeps titles and numbers deterministic`                                | [server/src/services/plan-service.test.ts](server/src/services/plan-service.test.ts)                         |
| `answers 429 once a client exceeds the plan limit`                                                             | [server/src/middleware/security.test.ts](server/src/middleware/security.test.ts)                             |
| `rejects a body over 10 kB with 413`                                                                           | [server/src/routes/api.test.ts](server/src/routes/api.test.ts)                                               |
| `cannot be broken out of by notes that try to close the data block` (prompt-injection-style input)             | [server/src/plan/prompt.test.ts](server/src/plan/prompt.test.ts)                                             |
| `switches the whole interface to Hindi and shows a Hindi plan accessibly`                                      | [web/src/app.test.tsx](web/src/app.test.tsx)                                                                 |
| `waits a jittered delay and logs why, without the URL`                                                         | [server/src/lib/fetch-json.test.ts](server/src/lib/fetch-json.test.ts)                                       |

## CI pipeline

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `main`:

| Step                   | Command                                     | Run it locally                                             |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Install                | `npm ci`                                    | same                                                       |
| Typecheck              | `npm run typecheck`                         | same                                                       |
| Lint (0 warnings)      | `npm run lint`                              | same                                                       |
| Format                 | `npm run format:check`                      | same                                                       |
| Duplication            | `npm run duplication`                       | same                                                       |
| Test with coverage     | `npm run test:coverage`                     | same                                                       |
| Audit all dependencies | `npm audit --audit-level=high`              | same                                                       |
| Build                  | `npm run build`                             | same                                                       |
| Docker + health probe  | build the image, run it, poll `/api/health` | `docker build -t saans . && docker run -p 8080:8080 saans` |

[.github/workflows/codeql.yml](.github/workflows/codeql.yml) runs CodeQL (`security-extended`) on every push to `main` and weekly.

`npm run check` runs every step up to and including the tests in one command. `npm test` runs the tests alone.
