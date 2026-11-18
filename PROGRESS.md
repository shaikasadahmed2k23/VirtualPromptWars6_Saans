# Progress log

Running log of autonomous work. Each entry: what's done, decisions made, anything left.

## Phase 0–1 (done before this log)

- Scaffold, tooling, CI and Docker (`59750a4`); CLAUDE.md moved to Node 22 and the production-only audit (`35e8ff6`); shared contracts and the pure domain layer (`6db2c50`); explicit `HOST=0.0.0.0` (`91aaf1c`).
- Repo: https://github.com/shaikasadahmed2k23/VirtualPromptWars6_Saans. CI is green on `91aaf1c` (check + docker jobs).

## 2.1 lib/ — TTL cache, errors, error middleware

- Done: `Clock`, `TtlCache` (TTL, max entries, evicts oldest write), `AppError` + Validation/NotFound/PayloadTooLarge/RateLimit/Upstream, central error middleware, JSON `/api` 404, pino-http request ids (new dep: needed for request-id logging).
- Decisions: added `PAYLOAD_TOO_LARGE` (413) to the shared error codes; any 4xx `http-errors` from Express internals keeps its meaning (a missing asset is a JSON 404, not a 500); import/order no longer puts type imports in their own group; jest-dom matchers are now registered explicitly (the side-effect entry stopped working under Vitest 5).
