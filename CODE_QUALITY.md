# Code quality

Every figure on this page was measured on `main` on 2026-11-19 with the commands under [Verify it yourself](#verify-it-yourself). The rules are enforced by tools in `npm run check` and in CI, not by review alone.

## Layer map

```
shared/            zod contracts · inferred types · sourced constants · pure text/time helpers
   ▲    ▲
   │    └──────────────────────────────── web/src/  api · hooks · components · i18n · naqi
   │
server/src/
   domain/        pure maths: NAQI, windows, impact, routine schedule, rounding (no I/O, no clock)
   providers/     AqiProvider / GeocodingProvider interfaces, Open-Meteo, Cached* decorators
   plan/          PlanGenerator interface, Gemini and rule-based strategies, prompt, copy (en, hi)
   services/      AirService, PlanService (orchestration, plan cache, AI-or-fallback)
   routes/        thin Express routers: parse with shared zod, call a service, return JSON
   middleware/    security headers, rate limits, request logging, central error handler
   lib/           AppError family, fetch-json (timeout + retry), TtlCache, Clock, shutdown
   compose.ts     the composition root: the only place concrete classes are wired together
```

**Dependency direction.** Routes → services → plan / providers → domain → `shared`. Checked by searching the imports:

- `server/src/domain/` imports only `@saans/shared` and its own siblings. No Express, no `node:` modules, nothing from `routes/`, `providers/`, `services/` or `lib/`.
- `web/src/` production code imports only `react`, `react-dom`, `zod` and `@saans/shared`. It never imports server code.

## Enforced rules

From [eslint.config.js](eslint.config.js). Every rule is set to `error` and lint runs with `--max-warnings 0`.

| Rule                                                          | Setting                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `max-lines`                                                   | 200 per file (blank lines and comments skipped)                                |
| `max-lines-per-function`                                      | 40 (blank lines and comments skipped; off inside test files only)              |
| `complexity`                                                  | 8                                                                              |
| `max-params`                                                  | 3                                                                              |
| `max-depth`                                                   | 3                                                                              |
| typescript-eslint                                             | `strictTypeChecked` + `stylisticTypeChecked`, type-aware                       |
| `@typescript-eslint/no-explicit-any`                          | error                                                                          |
| `@typescript-eslint/explicit-module-boundary-types`           | error                                                                          |
| `@typescript-eslint/consistent-type-imports`                  | error                                                                          |
| `jsdoc/require-jsdoc` (publicOnly)                            | functions, classes, methods, interfaces, type aliases, enums, exported consts  |
| `jsdoc/require-throws`                                        | error                                                                          |
| `check-file/filename-naming-convention`                       | KEBAB_CASE for every `.ts`/`.tsx` file; folders under `src/` also kebab-case   |
| `import/order`, `import/no-duplicates`                        | builtin → external → `@saans/**` → parent → sibling, alphabetised, blank lines |
| `no-warning-comments`                                         | `todo`, `fixme`, `xxx`, `hack` are errors                                      |
| `eslint-comments/require-description`, `no-unlimited-disable` | every disable needs a written reason; no blanket disables                      |
| `reportUnusedDisableDirectives`                               | error                                                                          |
| `no-console`, `eqeqeq`                                        | error                                                                          |
| `react-hooks` (web), `jsx-a11y` recommended (web `.tsx`)      | error                                                                          |

TypeScript runs with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` ([tsconfig.base.json](tsconfig.base.json)).

## Measured results

Production code means every `.ts`/`.tsx` file under `shared/src`, `server/src` and `web/src`, excluding `*.test.*` files and `test/` helper folders: **107 files, 7,334 lines** (shared 18 files / 927 lines, server 51 / 3,740, web 38 / 2,667).

| Measure                                               | Result                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ESLint errors / warnings                              | **0 / 0** (`npm run lint`, `--max-warnings 0`)                                                                                |
| `any` in production code                              | **0**                                                                                                                         |
| Type assertions (`x as T`, `<T>x`) in production code | **0** (only `as const`, which is not a cast)                                                                                  |
| Non-null assertions (`x!`) in production code         | **0**                                                                                                                         |
| `eslint-disable` directives                           | **1**, with its reason: Express needs a 4-argument error handler ([error-handler.ts](server/src/middleware/error-handler.ts)) |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`     | **0**                                                                                                                         |
| Duplicated code (jscpd, ≥ 50 tokens, tests excluded)  | **0 clones, 0.00 %** over 102 files and 37,574 tokens                                                                         |
| Exported declarations with a TSDoc block              | **379 / 379**                                                                                                                 |
| TypeScript errors                                     | **0** in all three workspaces                                                                                                 |

The three zero counts were taken with ESLint itself over the 107 production files, with `consistent-type-assertions: never`, `no-non-null-assertion` and `no-explicit-any` switched on from the command line. A plain-text search confirmed them: every `as` in production code is `as const` or `import * as`.

### Largest production files

The limit is 200 lines per file, not counting blank lines and comments. These are raw line counts (`wc -l`).

| #   | File                                                                                           | Lines |
| --- | ---------------------------------------------------------------------------------------------- | ----- |
| 1   | [web/src/components/profile/fields.tsx](web/src/components/profile/fields.tsx)                 | 199   |
| 2   | [server/src/plan/candidate-impacts.ts](server/src/plan/candidate-impacts.ts)                   | 198   |
| 3   | [web/src/hooks/use-profile-form.ts](web/src/hooks/use-profile-form.ts)                         | 176   |
| 4   | [server/src/plan/copy/en.ts](server/src/plan/copy/en.ts)                                       | 173   |
| 5   | [server/src/plan/copy/hi.ts](server/src/plan/copy/hi.ts)                                       | 172   |
| 6   | [web/src/i18n/en.ts](web/src/i18n/en.ts)                                                       | 164   |
| 7   | [web/src/components/location/city-combobox.tsx](web/src/components/location/city-combobox.tsx) | 159   |
| 8   | [server/src/plan/gemini-plan-generator.ts](server/src/plan/gemini-plan-generator.ts)           | 158   |
| 9   | [server/src/services/plan-service.ts](server/src/services/plan-service.ts)                     | 157   |
| 10  | [server/src/plan/copy/plan-copy.ts](server/src/plan/copy/plan-copy.ts)                         | 155   |

## Patterns, with where to find them

| Pattern                             | Where                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency injection at one root    | [server/src/compose.ts](server/src/compose.ts) builds every provider, cache, generator and service from config plus an injected `fetch`, `Clock` and logger. [server/src/index.ts](server/src/index.ts) only composes, listens and shuts down. The browser's root is [web/src/main.tsx](web/src/main.tsx). No module-level singletons.                 |
| Pure domain functions               | [server/src/domain/](server/src/domain/): `computeNaqi`, `findBestWindow`, `inhaledDose`, `exposureAvoided`, `co2Saved`, `scheduleRoutine`. They take values and return values. They have no I/O and no clock, and coverage is held at 100 % by threshold.                                                                                             |
| Interface + decorator providers     | `AqiProvider` and `GeocodingProvider` ([aqi-provider.ts](server/src/providers/aqi-provider.ts), [geocoding-provider.ts](server/src/providers/geocoding-provider.ts)) are wrapped by `CachedAqiProvider` (TTL + stale-while-error), `CachedGeocodingProvider` and `StaticFirstGeocodingProvider` (bundled cities first) without changing their callers. |
| Strategy pattern for plan text      | `PlanGenerator` ([plan-generator.ts](server/src/plan/plan-generator.ts)) has two strategies: [GeminiPlanGenerator](server/src/plan/gemini-plan-generator.ts) and [RuleBasedPlanGenerator](server/src/plan/rule-based-plan-generator.ts). [PlanService](server/src/services/plan-service.ts) tries the first and falls back to the second.              |
| One error model                     | `AppError` subclasses ([errors.ts](server/src/lib/errors.ts)) carry `status` and `code`. The central [error-handler.ts](server/src/middleware/error-handler.ts) turns them, and Express's own 4xx errors, into `{ error: { code, message } }`. Anything else becomes a generic 500. The shape is the shared `apiErrorSchema`.                          |
| Shared zod contracts                | [shared/src/schemas/](shared/src/schemas/) defines every payload once. The server parses requests with it ([routes/validate.ts](server/src/routes/validate.ts)), and the browser parses every response with the same schemas ([web/src/api/api-client.ts](web/src/api/api-client.ts)). Types are `z.infer`, never written twice.                       |
| Sourced constants                   | [shared/src/constants/](shared/src/constants/) has one module per domain (exposure, emissions, NAQI breakpoints, time, limits) and a source comment on each value.                                                                                                                                                                                     |
| Logic in hooks, views in components | [web/src/hooks/](web/src/hooks/) holds all state and effects. [web/src/components/](web/src/components/) is presentational.                                                                                                                                                                                                                            |

## Verify it yourself

```bash
npm ci
npm run check          # typecheck → lint (0 warnings) → format check → duplication → tests with coverage
npm run lint           # ESLint only
npm run duplication    # jscpd only (config: .jscpd.json, threshold 0)
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the same steps, then a full `npm audit`, the build and a Docker health probe.
