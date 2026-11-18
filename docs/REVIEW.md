# Code-quality review

A strict review of `shared/src`, `server/src`, `web/src` and the configs on 2026-11-18, checked against the code rather than against PROGRESS.md or the README. Baseline: `npm run check` green with shared 63, server 384 and web 79 tests. Coverage was shared 100 %, server 99.7 % lines and 97.95 % branches, and web 100 % lines and 98.3 % branches. `knip` was run for unused exports and files.

**Outcome:** `npm run check` is green with shared 69, server 388 and web 80 tests. Coverage is now shared 100 %; server 100 % lines and 98.8 % branches; web 100 % lines and 98.3 % branches. That is up on every package: new tests cover the AI-failure unwrapping, the default retry timer and the select guard. Behaviour is unchanged. The fallback plan text was compared byte for byte against a golden run of 16 scenarios in both languages. The only contract change is that the plan response's coordinates are now range-checked like every other coordinate.

Status: **Fixed** means changed in this pass. **Left** means deliberately not changed, with the reason.

## High

### H1. The local date-time string format is parsed in seven places (Fixed)

The `YYYY-MM-DDTHH:MM` format is cut up by hand across all three packages:

- `shared/src/relative-day.ts:9-10` defines `DATE_LENGTH` and `HOUR_PREFIX_LENGTH`, and `startsNow` (`:36`) re-implements `startOfHour`.
- `server/src/domain/local-time.ts:9-11` defines the same lengths again, plus `startOfHour` and `clockTime`.
- `server/src/domain/routine-schedule.ts:5-6` redefines `DATE_LENGTH` and `HOURS_PER_DAY = 24`, which is already in `shared/constants.ts`.
- `web/src/components/air/window-format.ts:3-12` has `clockOf`, a copy of `clockTime`.
- `web/src/components/air/air-now.tsx:52` uses `.slice(-5)`, `forecast-strip.tsx:95` uses `.slice(11, 13)`, and `forecast-table.tsx:34` uses `.slice(0, 10)`.

The problem: one format, seven parsers. A format change, such as seconds precision, breaks some of them silently.

The fix: a new `shared/src/local-time.ts` with `localDate`, `clockTime`, `clockHour` and `startOfHour`. Every caller now uses it. The server's `domain/local-time.ts` keeps only the epoch arithmetic.

### H2. NAQI health advisories and category names are copied between server and web (Fixed)

- `server/src/domain/naqi.ts:16-24` (`NAQI_ADVISORIES`) and `web/src/i18n/en.ts:22-30` (`advisories`) hold the same six CPCB statements, word for word.
- The category names are defined four times: `server/src/plan/copy/en.ts:29-36`, `copy/hi.ts:29-36`, `web/src/i18n/en.ts:3-10` and `web/src/i18n/hi.ts:11-18`.

The problem: an official CPCB wording change has to be made in two or four places, and nothing fails if one is missed.

The fix: `shared/src/naqi-text.ts` now holds `NAQI_CATEGORY_NAMES` and `NAQI_ADVISORIES`, per language. The server and web dictionaries import them.

### H3. Plan logic is duplicated inside the en and hi copy files (Fixed)

- `server/src/plan/copy/en.ts:39-49` and `hi.ts:39-49` each carry the same three-way branch for the summary: no window, best window now, or best window later or least bad.
- `en.ts:131-146` and `hi.ts:131-144` each carry the same rule for choosing between the CO₂ and exposure clauses of the metro explanation, including the same code comment.

The problem: translation files contain business rules, so a rule fix has to be made once per language.

The fix: the copy files now provide only phrases. `plan-copy.ts` owns the decisions, in `summarize()` and `metroBenefits()`. The generated text is unchanged; the tests compare it exactly.

## Medium

### M1. Type assertions in production code (Fixed)

| Where                                             | Cast                                                     | Fix                                                                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/lib/ttl-cache.ts:100`                 | `keys().next().value as K`                               | Check the iterator result's `done`.                                                                                                                                                           |
| `server/src/plan/ai-failure.ts:25`                | `error as { status?: unknown }`                          | Shared `statusOf()` in `failure-detail.ts`.                                                                                                                                                   |
| `server/src/plan/ai-failure.ts:32`                | `errors.at(-1) as unknown`                               | Typed `unknown[]` binding.                                                                                                                                                                    |
| `web/src/components/profile/profile-form.tsx:102` | `Object.entries(errors) as [...]`                        | `listFieldErrors()` walks a typed field list.                                                                                                                                                 |
| `web/src/components/profile/fields.tsx:103,114`   | `Object.entries(options) as [T, string][]`, `value as T` | `SelectField` takes `values: readonly T[]` (shared constants) plus labels, and matches the picked value. A typed `bind.choice()` replaces four hand-wired select handlers in `fieldsets.tsx`. |

### M2. Two modules turn failures into log fields, with diverging copies (Fixed)

`server/src/lib/failure-detail.ts` and `server/src/plan/ai-failure.ts` each define `MAX_ISSUES = 5`, each format zod issues as `path: …`, and each read `status` off an unknown error in a different way: `Reflect.get` in one, an `as` cast in the other. `ai-failure.ts` now uses `statusOf()` and `summarizeIssues()` from `failure-detail.ts`. It still logs issue codes, not messages, because a message can echo model output.

### M3. The Gemini thinking level is declared twice, and its name shadows the SDK's (Fixed)

`server/src/config.ts:18` (`GEMINI_THINKING_LEVELS`) and `server/src/plan/gemini-plan-generator.ts:35` (`type ThinkingLevel = 'low' | 'medium' | 'high'`) are independent declarations. `create-ai-generator.ts:1` imports the SDK's own `ThinkingLevel` enum, so two different `ThinkingLevel`s meet in one file. There is now one `GeminiThinkingLevel` type, derived from the config tuple, and `SDK_LEVELS` is checked with `satisfies Record<GeminiThinkingLevel, ThinkingLevel>`.

### M4. Coordinate and city-name contracts are re-declared (Fixed)

- `shared/src/schemas/profile.ts:14-15` defines `latitudeSchema` and `longitudeSchema`. `air.ts:72-73` rebuilds them, and the coords variant of `locationSchema` (`profile.ts:25-30`) repeats the `coordinatesSchema` fields instead of extending it.
- `server/src/providers/aqi-provider.ts:17-20` declares its own `Coordinates` interface, which duplicates shared `CoordinatesInput`.
- `server/src/routes/geocode.ts:13-18` rebuilds the city-name rule, with its message, from `profile.ts:33-36`.

The fix: shared exports `latitudeSchema`, `longitudeSchema`, `cityNameSchema` and one `Coordinates` type, and every caller uses them.

### M5. `roundCoordinates` lives in a provider module (Fixed)

`server/src/providers/aqi-provider.ts:48` is a pure rounding function. `PlanService` imports it from there for cache keys and labels, so the service layer reaches into a provider just for maths. It now lives in `server/src/domain/rounding.ts`, next to `roundTo`.

### M6. A magic cache lifetime that can drift from the real one (Fixed)

`server/src/routes/air.ts:11` hardcodes `max-age=900`, and the comment says it "matches the server-side forecast cache". The header is now derived from `AQI_CACHE_TTL_MS`.

### M7. Broad `object` return type in the prompt builder (Fixed)

`server/src/plan/prompt.ts:53`: `withTiming` returns `object | null`, which throws away the shape sent to Gemini. It now returns a named `TimedWindow` type.

### M8. Enum values inline in schemas, and one duplicated union (Fixed)

- `shared/src/schemas/profile.ts:59` (work location) and `:71` (exercise timing) list their values inline. The web form re-derives the types and could not iterate the values without a cast (see M1).
- `shared/src/schemas/plan.ts:52` repeats `['today', 'tomorrow']`, which `relative-day.ts:7` declares separately as a type.

The fix: `WORK_LOCATIONS`, `EXERCISE_TIMINGS` and `RELATIVE_DAYS` constants, with the types derived from them.

### M9. A set typed wider than its contents (Fixed)

`server/src/plan/rule-based-plan-generator.ts:30`: `LOW_CARBON_MODES: ReadonlySet<string>` is now `ReadonlySet<CommuteMode>`.

### M10. Dead or over-exported code (Fixed)

- knip found nine unused value exports: `epochMsToLocal`, `DEFAULT_WINDOW_OPTIONS`, `GEMINI_TIMEOUT_MS`, `GEMINI_TOTAL_BUDGET_MS`, `useDebouncedValue`, web `WORST_WINDOW`, and server test-app's `DELHI_PLACE`, `fakeAqi` and `fakeGeocoder` (now used; see M11).
- `shared/src/schemas/primitives.ts:77,79`: `activityLevelSchema` and `protectionLevelSchema` are used nowhere.
- `web/src/components/ui/section-card.tsx:10`: the `aside` prop is never passed.

### M11. Duplicated test setup and weak fixtures (Fixed)

- PlanService is wired by hand three times: `server/src/test/test-app.ts:58-75`, `services/plan-service.test.ts:44-71` and `plan/time-awareness.test.ts:85-107`.
- The forecast literal `{ timezone: 'Asia/Kolkata', utcOffsetSeconds, samples }` appears five times, and the Delhi `GeoPlace` twice.
- `providers/open-meteo-aqi-provider.test.ts:85-158` has two identical `setup()` functions and forecasts, plus `MINUTE_MS = 60_000`, which duplicates `MS_PER_MINUTE`.
- `web/src/hooks/hooks.test.tsx:13` and `web/src/api/api-client.test.ts:45` build profiles with `{ language: 'en' } as never`, which defeats the type checker.
- `server/src/middleware/security.test.ts:19` asserts only `toBeDefined()` on the rate-limit policy header.

The fix: shared factories (`forecastFixture`, `DELHI_PLACE`, `createTestPlanService`, web `PROFILE`), one setup per suite, and an exact header assertion.

### M12. The docs don't match the code (Fixed)

- The README claims 100 % server coverage; it is 99.7 % lines and 97.95 % branches. It also gives web as "100 % lines, 98 % branches" without branches being checked.
- The README says Gemini has "an 8 s timeout and one retry" and leaves out the 20 s overall budget and the model list.
- PROGRESS.md "STATUS FOR ASAD" says live Gemini was never run and Render is not set up, which contradicts its own §5.2. It also gives stale test counts: 46/287/62 against 63/384/79.

### M13. An orphan diagnostic script (Fixed)

`scripts/check-gemini.mjs` is referenced from nowhere (knip: unused file), so it reads as a leftover. It is the tool that diagnosed the 2026-11-18 Gemini fallback, so it is kept but made intentional: `npm run gemini:check`, documented in the README.

## Low

| #   | Where                                                          | Problem                                                                                                                                                                                   | Status                                                                                                                   |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| L1  | `web/src/components/profile/use-field-binder.ts`               | The only hook outside `hooks/`.                                                                                                                                                           | Fixed: moved to `web/src/hooks/`.                                                                                        |
| L2  | `web/src/components/plan/plan-results.tsx:34-35`               | Hardcoded `id="impacts-heading"`, where sibling sections use `useId`.                                                                                                                     | Fixed.                                                                                                                   |
| L3  | `web/src/hooks/use-geolocation.ts:37-40`                       | Inline return type, where every other hook has a named interface.                                                                                                                         | Fixed.                                                                                                                   |
| L4  | `web/src/components/air/forecast-strip.tsx:22`                 | `PERCENT = 100` duplicates `PERCENT_SCALE`.                                                                                                                                               | Fixed.                                                                                                                   |
| L5  | `shared/src/schemas/air.ts:15`                                 | `24 * 60` literals.                                                                                                                                                                       | Fixed: `HOURS_PER_DAY * MINUTES_PER_HOUR`.                                                                               |
| L6  | `server/src/lib/ttl-cache.ts:86`                               | A private helper sits between the public methods.                                                                                                                                         | Fixed: moved last.                                                                                                       |
| L7  | `rule-based-plan-generator.ts:65` vs `candidate-impacts.ts:58` | "Commutes" means `work.location !== 'home'` in one and also needs office days > 0 and distance > 0 in the other, so the fallback may suggest the metro tip to someone with 0 office days. | **Left**: making them agree changes which tips appear, which is a behaviour change outside this pass. Worth doing next.  |
| L8  | `routes/*.ts`                                                  | `Cache-Control` values are literals per route (`no-store`, `private, no-store`, `private, max-age=…`).                                                                                    | **Left**: each value is deliberate and commented; a shared table would add indirection for four strings.                 |
| L9  | knip "unused exported types" (≈50)                             | Mostly component props interfaces and option types.                                                                                                                                       | **Left**: they appear in exported signatures; exporting them is the convention and lets callers type their arguments.    |
| L10 | `server/src/lib/ttl-cache.ts:49` `size`                        | Public getter used only by tests.                                                                                                                                                         | **Left**: cheap, read-only, and the eviction tests need it.                                                              |
| L11 | `shared/src/index.ts`                                          | `export *` exposes the zod helper builders (`boundedInt`, `oneOf`, …) as well as the contracts.                                                                                           | **Left**: the server and web build query schemas with the same helpers, so they need them; dead ones were removed (M10). |
