# CLAUDE.md — contributor and agent guide for Saans

## Purpose

Saans is a GenAI assistant that helps families in Indian cities through severe winter smog. From a location and a household profile it builds a plan for today: a low-exposure routine timed to the hourly forecast, indoor air hacks, sustainable alternatives (commute, cooking, heating, waste), and the direct impact of each choice in numbers (PM2.5 avoided, CO₂ saved). English and Hindi.

## Stack

- `shared/` — zod schemas, inferred types and sourced constants: the single source of truth for API contracts.
- `server/` — Node 22, Express 5, `@google/genai`, helmet, express-rate-limit, pino.
- `web/` — Vite, React 18, Tailwind.
- Tests: Vitest, Testing Library, supertest, vitest-axe.
- Data: Open-Meteo Air Quality and Geocoding (no key). Gemini via `GEMINI_API_KEY`; the model comes from `GEMINI_MODEL`.
- Deploy: one Dockerfile; the server serves the built web app.

## Commands

```bash
npm ci                 # install
npm run dev:server     # API on :8080
npm run dev:web        # UI on :5173, proxies /api
npm run check          # typecheck + lint + format:check + tests with coverage
npm run build          # web, then server
```

`npm run check` must pass before every commit, and after every refactor.

## Architecture rules

- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for layers, request flow and decisions.
- **The LLM never invents numbers.** Every figure is computed in `server/src/domain/` (pure, no I/O); Gemini only explains it.
- Every constant lives in `shared/src/constants.ts` with a one-line source comment. No magic numbers elsewhere. Impact figures are labelled as estimates in the UI.
- NAQI follows the CPCB 2014 breakpoints exactly; overall index = max sub-index, linear interpolation within a band.
- Dependencies are injected through interfaces (`AqiProvider`, `GeocodingProvider`, `PlanGenerator`, `Clock`, `fetch`) at the composition roots. No module-level singletons.
- Gemini failures (timeout, error, invalid output) fall back to `RuleBasedPlanGenerator`.

## Coding standards

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; explicit return types on exports.
- ESLint `strictTypeChecked` + `stylisticTypeChecked`, jsx-a11y, import/order; limits: 200 lines per file, 40 per function, complexity 8, 3 params, depth 3. Zero warnings.
- JSDoc on every export (what, params, returns, throws).
- One error shape `{ error: { code, message } }` via `AppError` subclasses and the central error middleware. Never swallow errors; never return stack traces.
- No dead or commented-out code, no TODO/FIXME, no `eslint-disable` without a written reason.
- Naming: files kebab-case, components PascalCase, hooks `useX`, constants SCREAMING_SNAKE.
- React components stay under 120 lines; logic lives in hooks.
- Security: strict CSP, no CORS grant, rate limits on `/api`, zod on every input with length caps, user free text fenced as data in the prompt, secrets server-side only. Never hardcode secrets or the model name.
- Accessibility (WCAG 2.2 AA): category as text + icon + colour, labelled fields, visible focus, skip link, `aria-live` results, keyboard-only flow, reduced motion, `lang` follows the language toggle, targets ≥ 24×24 px.
- Say why whenever a dependency is added.

## Testing rules

- `domain/`: exhaustive unit tests — every NAQI boundary, impact maths, window edge cases (empty, all-Severe, gaps). Held at 100 % coverage.
- `server/`: supertest for every route, including 400, 404, 413, 429, upstream failure and the Gemini fallback.
- `web/`: component and hook tests for validation, loading, error and results states, with axe checks on every state.
- Gemini and Open-Meteo are always mocked. No network in tests.
- Coverage thresholds: 100 % on `shared/`, 90 % on `server/` and `web/`.

## Repository hygiene

- One branch, `main`. Conventional commit messages.
- No build output, `node_modules` or secrets committed; `.env.example` documents every variable.
