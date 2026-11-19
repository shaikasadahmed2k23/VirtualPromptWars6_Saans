# Architecture

Saans is one TypeScript codebase in three npm workspaces, shipped as one container. The server serves the API and the built web app from the same origin.

## Layers

| Layer      | Folder                   | Responsibility                                                                                                                         |
| ---------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts  | `shared/`                | zod schemas and inferred types for every API payload, sourced numeric constants, local-time and NAQI text helpers. No I/O.             |
| Domain     | `server/src/domain/`     | Pure functions: CPCB NAQI, best/worst outdoor windows, inhaled-dose and CO₂ calculators, routine schedule, rounding. No I/O, no clock. |
| Providers  | `server/src/providers/`  | `AqiProvider` and `GeocodingProvider` interfaces, Open-Meteo implementations, a bundled city list, and caching decorators.             |
| Plan       | `server/src/plan/`       | `PlanGenerator` interface, `GeminiPlanGenerator` (structured output, validated), `RuleBasedPlanGenerator` (en + hi copy), the prompt.  |
| Services   | `server/src/services/`   | `AirService` (forecast → snapshot) and `PlanService` (orchestration, plan cache, AI-or-fallback choice).                               |
| Routes     | `server/src/routes/`     | Thin Express routers: validate input with the shared schemas, call a service, return JSON.                                             |
| Middleware | `server/src/middleware/` | Security headers, rate limits, request logging with ids, the central error handler.                                                    |
| Wiring     | `server/src/compose.ts`  | The composition root: builds real providers, caches and services from config. `index.ts` only composes, listens and shuts down.        |
| Web        | `web/src/`               | React 18 + Tailwind. `api/` (typed client), `hooks/` (all state and logic), `components/` (presentational), `i18n/` (en, hi).          |

Dependencies point inwards: routes → services → domain; providers and generators are reached only through their interfaces.

## Request flow: `POST /api/plan`

1. **Middleware.** helmet sets the headers, the per-IP limiter admits the request (10/min), the JSON parser enforces the 10 kB cap, pino-http tags it with a request id.
2. **Validation.** The route parses the body with the shared `PlanRequest` zod schema (strict objects, ranges, length caps). Failure → `400 { error: { code, message } }`.
3. **Location.** A city name is resolved by the bundled city list first, then by the cached Open-Meteo geocoder.
4. **Plan cache.** The key is a SHA-256 of the normalized profile, the location rounded to 2 dp and the location's local hour. A hit returns immediately.
5. **Facts.** `AirService` fetches the hourly forecast (15 min cache). The domain computes the current NAQI, the best and worst windows and every candidate impact (µg PM2.5 avoided, kg CO₂ saved).
6. **Words.** `GeminiPlanGenerator` receives those facts and writes the routine, tips and explanations as schema-constrained JSON, with a per-call timeout and an overall budget. The output is validated with zod; unknown impact ids are rejected.
7. **Fallback.** On any Gemini failure the `RuleBasedPlanGenerator` writes the plan from the same facts. The response carries `source: "ai" | "fallback"`.
8. **Response.** The plan is cached and returned; the browser validates it with the same shared schema before rendering.

## Engineering decisions

### 1. NAQI as pure functions

- **Context:** The NAQI drives every recommendation, and its breakpoints have exact edges that must not drift.
- **Decision:** `domain/naqi.ts` is a set of pure functions over the breakpoint table in `shared/`.
- **Consequence:** Every boundary is unit-tested at its low end, high end and high + 0.1, without mocks.

### 2. The LLM never invents numbers

- **Context:** A model that writes figures can hallucinate them, and they cannot be tested.
- **Decision:** All numbers are computed in `domain/`; Gemini only explains them. Impact titles come from reviewed copy.
- **Consequence:** Figures are deterministic and testable; the model's output is reduced to prose that is validated against known ids.

### 3. Rule-based fallback

- **Context:** The model can be slow, rate-limited or unconfigured.
- **Decision:** A deterministic `RuleBasedPlanGenerator` implements the same `PlanGenerator` interface, in English and Hindi.
- **Consequence:** A plan is always returned; the UI labels which source wrote it.

### 4. Caching with stale-while-error

- **Context:** The upstream APIs are free and occasionally unreachable; forecasts change hourly.
- **Decision:** TTL caches for forecasts (15 min), geocoding (24 h) and plans (1 h). A forecast past its TTL is served for up to 6 h if the upstream fails, flagged with `staleMinutes`.
- **Consequence:** Fewer upstream calls, faster responses, and the app stays useful through short outages.

### 5. Dependency injection at composition roots

- **Context:** Tests must never touch the network or the real clock.
- **Decision:** Providers, generators, `Clock`, `fetch` and the logger are interfaces passed in by `server/src/compose.ts` and `web/src/main.tsx`. No module-level singletons.
- **Consequence:** Every layer is tested with fakes, including the composition root itself.

### 6. Strict CSP and jitless zod

- **Context:** A strict Content-Security-Policy forbids inline scripts and `eval`; zod 4 probes `new Function` for its JIT.
- **Decision:** `default-src 'self'` with no inline exceptions, and `config({ jitless: true })` before any schema is built.
- **Consequence:** No CSP violations and no `unsafe-*` sources.

### 7. Shared zod contracts

- **Context:** Client and server must agree on every payload.
- **Decision:** Schemas live once in `shared/`; the server validates requests and the client validates responses with them.
- **Consequence:** Types are inferred, not duplicated, and contract drift fails at compile time or in tests.

### 8. Bundled city list

- **Context:** City search is the first step for most users and must not depend on one upstream.
- **Decision:** About 109 major Indian cities are bundled and searched first; Open-Meteo geocoding is asked only on a miss.
- **Consequence:** Common searches are instant and work offline from the upstream.
