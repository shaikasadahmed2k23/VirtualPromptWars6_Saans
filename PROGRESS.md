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
