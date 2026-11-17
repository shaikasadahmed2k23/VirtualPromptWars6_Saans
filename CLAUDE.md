# CLAUDE.md — Saans (PromptWars Virtual, Challenge 6: Urban Air Quality Assistant)

## Mission
GenAI assistant that helps families navigate severe winter smog. It must:
1. Suggest **low-emission daily routines** (time-blocked using the hourly AQI forecast).
2. Give **indoor air quality hacks**.
3. Suggest **sustainable alternatives** (commute, cooking, heating, waste burning).
4. Tailor everything to the user's **location + lifestyle**.
5. **Clearly explain the direct impact** of each choice (exposure avoided + emissions saved), with numbers.

Scored by an AI judge on: Code Quality, Security, Efficiency, Testing, Accessibility, Problem Statement Alignment.
**History: Code Quality has been our weakest score in every round (86, 86, 88, 89) while everything else is 98-100. Code Quality is the whole game. Every rule below exists for that.**

## Stack (TypeScript end to end, one container)
- `shared/` — zod schemas, inferred types, constants. Single source of truth for API contracts.
- `server/` — Node 20 + Express, `@google/genai` SDK, helmet, express-rate-limit, pino logger.
- `web/` — Vite + React 18 + Tailwind. No UI kit bloat.
- Tests: Vitest (+ Testing Library, supertest, vitest-axe). Coverage thresholds: 90% lines on `shared/` and `server/`.
- Deploy: single Dockerfile on Render (server serves the built `web/`). Keep-alive via cron-job.org.
- Data: Open-Meteo Air Quality API (no key) + Open-Meteo Geocoding (no key). Gemini via AI Studio key (`GEMINI_API_KEY`, model from `GEMINI_MODEL` env, never hardcoded).

## Architecture
```
web (React) ──POST /api/plan──▶ server
                                 ├─ AqiProvider (interface) → OpenMeteoAqiProvider  [TTL cache, 15 min, key = lat/lon rounded to 2dp]
                                 ├─ domain/ (PURE functions, no I/O)
                                 │    naqi.ts      CPCB Indian NAQI from PM2.5/PM10 + category + health advisory
                                 │    windows.ts   best/worst outdoor windows from hourly forecast
                                 │    impact.ts    exposure-avoided & CO2-saved calculators
                                 ├─ PlanGenerator (interface) → GeminiPlanGenerator  [structured JSON output, zod-validated]
                                 │                            → RuleBasedPlanGenerator [fallback if Gemini fails/times out]
                                 └─ PlanService: orchestrates; numbers come from domain/, Gemini only writes the explanations
```
**Key design rule: the LLM never invents numbers.** All impact numbers are computed deterministically in `domain/impact.ts` and passed to Gemini, which explains them in plain language. This makes it testable and honest.

## Impact model (domain/impact.ts)
- Inhaled PM2.5 dose (µg) = concentration (µg/m³) × inhalation rate (m³/h) × hours × protection factor.
- Inhalation rates: rest 0.5, light activity 1.0, moderate exercise 2.5 m³/h (cite EPA Exposure Factors Handbook in README).
- Protection factors: indoors windows closed 0.6, indoors + HEPA purifier 0.25, well-fitted N95 0.1 (cite sources, label as estimates).
- CO2 per passenger-km: petrol car, two-wheeler, bus, metro, walk/cycle (constants with source comments).
- Every constant lives in `shared/constants.ts` with a one-line source comment. No magic numbers anywhere else.
- UI always labels these as "estimates".

## NAQI (CPCB) breakpoints — implement exactly, test every boundary
PM2.5 (µg/m³): 0-30 Good | 31-60 Satisfactory | 61-90 Moderate | 91-120 Poor | 121-250 Very Poor | 250+ Severe
PM10  (µg/m³): 0-50 | 51-100 | 101-250 | 251-350 | 351-430 | 430+
Index bands: 0-50, 51-100, 101-200, 201-300, 301-400, 401-500. Overall = max sub-index. Linear interpolation within band.

## User profile (zod schema, all validated server-side)
location (lat/lon or city), household (adults, children, elderly, sensitive members yes/no — no diagnosis fields),
commute mode + distance km, work schedule (home/office, hours), outdoor exercise habit, has purifier, cooking fuel, language (en/hi).

## CODE QUALITY RULES (non-negotiable, enforced by tooling from commit #1)
- `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals/Parameters`.
- ESLint `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, plus:
  `max-lines: 200`, `max-lines-per-function: 40`, `complexity: 8`, `max-params: 3`, `max-depth: 3`,
  `no-console: error`, `@typescript-eslint/no-explicit-any: error`, `eslint-plugin-jsx-a11y` recommended, `import/order`.
- Prettier, run in CI. `npm run check` = typecheck + lint + format:check + test. Must pass before every commit.
- Every exported function/type/component has a JSDoc (what + params + returns + throws).
- Explicit return types on all exported functions.
- One error shape: `{ error: { code, message } }` via a central error middleware + typed `AppError` subclasses. No bare catches; never swallow errors.
- Dependency injection via interfaces (`AqiProvider`, `PlanGenerator`, `Clock`). No module-level singletons that tests can't swap.
- No dead code, no commented-out code, no TODO/FIXME, no `eslint-disable` without a written reason.
- Naming: files kebab-case, components PascalCase, hooks `useX`, constants SCREAMING_SNAKE.
- Small React components (<120 lines), logic in hooks, no inline business logic in JSX.
- Repo hygiene: `.gitignore`, `.env.example`, `.editorconfig`, no build output or node_modules committed, repo < 10 MB.
- GitHub Actions CI (`.github/workflows/ci.yml`): install → typecheck → lint → test with coverage → build.

## SECURITY
helmet with strict CSP; CORS locked to own origin; rate limit `/api/*`; zod validation on every input with length caps;
Gemini key server-side only; user free-text wrapped as data in the prompt (prompt-injection guard) and length-capped;
request body size limit; no stack traces in responses; `npm audit` clean.

## EFFICIENCY
TTL cache for AQI + plan responses (keyed by hash of normalized profile + rounded location + hour);
Gemini call with timeout + single retry then fallback; parallel fetches with `Promise.all`;
code-split heavy UI; gzip/brotli compression; immutable cache headers on hashed assets.

## ACCESSIBILITY (WCAG 2.2 AA)
AQI category shown as text + icon + colour (never colour alone); contrast-checked palette;
semantic landmarks, labelled form fields, visible focus, skip link, `aria-live` for plan results,
keyboard-only flow works end to end, `prefers-reduced-motion` respected, en/hi toggle with `lang` attribute.
vitest-axe test on every page; Lighthouse a11y 100.

## TESTING
- domain/: exhaustive unit tests (every NAQI boundary, impact math, window selection edge cases: empty forecast, all-severe day, missing hours).
- server/: supertest for every route incl. 400 validation, 429 rate limit, Gemini failure → fallback, provider timeout.
- web/: component tests for form validation, results rendering, loading/error states, axe checks.
- Gemini and Open-Meteo are always mocked in tests. No network in tests.

## WORKFLOW RULES FOR CLAUDE CODE
- Work phase by phase. After each phase: run `npm run check`, fix everything, then commit with a clear message.
- After ANY refactor, rerun the full test suite before committing.
- Never add a dependency without saying why.
- Never hardcode secrets or the model name.
