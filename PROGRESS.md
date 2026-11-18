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

## 3.3 Web tests

- Done: 62 web tests — hooks with a fake API (abort/supersede, debounce, retry, geolocation codes incl. unsupported), API client contract/error mapping, form validation (inline + summary + focus, location required, every select), combobox keyboard pattern, forecast strip + table, plan results for AI and fallback sources, language toggle (UI + `<html lang>` + Hindi plan request), geolocation denied/allowed, and axe on the page in empty, loading, results and error states. Coverage: 100 % lines/functions, 98 % branches.
- Decisions: web `testTimeout` raised to 15 s (full-page jsdom flows with axe are slow); expected React error logs are silenced in the two "outside provider" tests.

## 4.1 README

- Done: problem → solution, a table mapping each line of the brief to code, a mermaid architecture diagram, impact formulas with every constant and its source, the NAQI table and the Severe-band assumption, plus security, efficiency, accessibility, testing, setup, env vars and deployment (Render + cron-job.org keep-alive).
- Decisions: written for the judge and new contributors, and every claim is checked against the code (timeouts, caches, limits, headers).

## 4.2 Self-review (Code Quality)

- Fixed:
  - **Duplication:** `MS_PER_*`/`HOURS_PER_DAY` were redefined in 5 server files; they now live once in `shared/constants.ts`. The "Name, Region, Country" label was implemented on both server and web; it is now `formatPlaceLabel` in `shared/`.
  - **Naming:** identical `WarnLogger`/`StartupLogger` ports are merged into `server/src/lib/log.ts`.
  - **Leaky dependencies:** `PlanService` no longer imports from the fallback _generator_; `explainImpact` moved to `plan/copy/`. The web `SelectedPlace` model moved from `components/` to `hooks/`, so hooks never import components.
- Checked, no change needed: every export has JSDoc (lint-enforced), every function ≤ 40 lines, every file ≤ 200, every component < 120 lines, no TODOs, and the two `eslint-disable`s carry reasons.

## 5.1 Incident: 502 on /api/geocode (2026-11-18)

- **Symptom:** `GET /api/geocode?q=Delhi` returned 502 "Location search is unavailable" in about 450 ms. The log line showed `cause: {}`.
- **Logging bug:** an `Error` serializes to `{}` in JSON, so the reason was thrown away. `describeFailure()` now logs name, message, code, status and the cause chain; each retry is logged too. Never logged: URLs (they carry the user's search or location), bodies, keys.
- **What the message proves:** "is unavailable" is raised only when `fetch` itself rejects. A timeout reads "timed out", a bad status "responded with status N", a schema mismatch "returned an unexpected response". So it was a network-level failure (reset, DNS, TLS), not the zod schema.
- **Schema ruled out:** the real providers were run against the live API for Delhi, Mumbai, Kurnool, Hoshiarpur and the air forecast, and all validated. `git diff 6b8bac5..HEAD -- server/src/providers` is empty; the only `shared/` changes since then are constants and the plan schema.
- **Not reproducible afterwards:** after the fix deployed, 20/20 upstream-only lookups and `/api/air` succeeded from Render. One lookup (Hoshiarpur) failed right after the deploy and worked on the next request. The exact low-level error was never captured, so the cause is "intermittent network failure between Render and Open-Meteo", not proven rate limiting. If it recurs, the Render log now shows `Retrying upstream call` with the real `cause.code`.
- **Hardening:**
  - About 109 major Indian cities are bundled and searched first; Open-Meteo is asked only on a miss.
  - Descriptive `User-Agent`.
  - One retry with backoff plus jitter on a dropped connection, 429 or 5xx (not on timeouts or bad bodies).
  - `/api/air` serves the last good forecast for up to 6 h past its 15-minute TTL, with `staleMinutes` in the response, `Cache-Control: no-store`, and a notice in the UI.
  - A new `GEOCODING_UNAVAILABLE` code so the UI says "City search failed" (en + hi) rather than blaming the air-quality service.

## 5.2 Gemini on Render, live plan check, front-end speed (2026-11-18)

- **Why prod fell back.** `gemini-3.8-flash` on this key answered 503 "high demand" or 429 quota, or ran past the 8 s per-call timeout even with a low thinking level. `gemini-3.1-flash-lite` answers in about 2 s, so Render now uses it. `GEMINI_THINKING_LEVEL` (optional) exists for thinking models.
- **Model list.** `GEMINI_MODELS="a,b"` is tried in order, once each, inside a 20 s overall budget, then the rule-based plan takes over. `GEMINI_MODEL` still works alone and keeps its one retry. Every plan logs the model that served it; every failed attempt logs its reason.
- **Live check of three profiles (source `ai` for all):** Delhi car commuter with two children (en), Lucknow elderly home-based with sensitive members (hi), Mumbai two-wheeler outdoor exerciser (en).
  - First pass found: the field name `restHoursEquivalent` leaking into text, no mention of children, no doctor sentence, routine out of order and unclear which day a time was on, and generic summaries.
  - Fixes: prompt rules (plain wording for rest hours, tailor to household, doctor sentence when sensitive members, day words from the location's clock, chronological routine, summary opens with the current category and the best time to act), plus `day` on every routine block.
  - Second pass, checked by script against the plan's own numbers: no field names, every number in the text appears in the facts or the profile, children mentioned for Delhi, doctor sentence in the Lucknow Hindi plan, routine in chronological order with today/tomorrow labels, Hindi reads naturally and suggests LPG instead of biomass.
- **Best Practices 96.** zod 4 probes `new Function` for its JIT; strict CSP reports that as an eval violation. `config({ jitless: true })` runs before any schema is built; no `unsafe-inline` was added.
- **Speed.** zod and the schemas (about 86 kB) now load by dynamic import on first request or submit. Initial JavaScript fell from 281.6 kB (87.3 kB gzip) to 197 kB (64 kB gzip); local mobile Performance went from 82 to 91 and total blocking time from 760 ms to 370 ms. Not pursued by decision: swapping React, going under 150 kB, lazy-loading the Hindi dictionary.

## STATUS FOR ASAD

**Done.** Phases 0–4. The server (NAQI, windows, impact engine, Open-Meteo providers, Gemini + offline fallback, HTTP layer) and the web UI (en/hi, accessible single page) are built, documented and pushed. `npm run check` is green: 46 shared + 287 server + 62 web tests. Coverage is 100 % on shared and server (domain held at 100 % by threshold) and 100 % lines / 98 % branches on web. CI has been green after every step.

**Left.**

1. **Live Gemini.** It has never been run against the real API (no key here). Every code path is tested with a mocked SDK, and the server falls back cleanly.
2. **Render deploy** and the **cron-job.org** keep-alive are not set up; README → Deployment has the steps.
3. **No visual check in a real browser yet.** The layout is tested with jsdom and axe only. A Lighthouse run (a11y target 100) is still to do.

**Decisions to double-check.**

- **Impact figures.**
  - CO₂ factors are now TERI Delhi per-passenger figures (public-transport data is 2019-20, pre-COVID); metro uses TERI’s upper bound.
  - Commute exposure assumes 20 km/h door to door, plus the per-mode activity/shielding in `COMMUTE_EXPOSURE`.
  - "Close windows" treats an open window as outdoor air (factor 1.0).
- **NAQI method:**
  - The Severe band is interpolated up to PM2.5 380 / PM10 510 (an assumption, documented).
  - Concentrations between integer breakpoints take the lower edge of the next band.
- **Contracts and UI:**
  - Response field is `source: "ai" | "fallback"`.
  - Plans carry `language`.
  - Routine times are `HH:MM`.
  - UI advisories come from the dictionaries (the server's advisory is English-only).
- **Security choices:**
  - No CORS middleware; same origin only.
  - The health route is outside the rate limiter.
  - A missing `GEMINI_MODEL` disables AI, just like a missing key.
- **Prompt privacy:** Gemini sees the household profile without exact coordinates, plus the location label.

**Exact next step.** Create the Render Web Service (Docker) from this repo. Set `GEMINI_API_KEY` and `GEMINI_MODEL`, and use health-check path `/api/health`. Then generate one plan and confirm the badge reads "AI-personalised".
