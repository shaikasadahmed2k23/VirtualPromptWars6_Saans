# Security policy

## Reporting a vulnerability

Please report security problems privately. Do not open a public issue.

1. On this repository's GitHub page, open the **Security** tab and choose **Report a vulnerability**. This opens a private advisory that only the maintainer can see.
2. Describe the problem, how to reproduce it (a request, payload or steps), and what an attacker could gain.
3. If you found it on the live deployment, include the time (UTC) and roughly how many requests you sent.

We aim to acknowledge a report within 3 working days, and to share a fix or a decision within 14 days. Please give us that time before disclosing anything publicly. We will credit you in the advisory unless you prefer not to be named.

**In scope:** the code on `main` and the deployed instance built from it.

**Out of scope:** volumetric denial-of-service, findings that need a compromised device or browser, and issues in Open-Meteo or Google Gemini themselves (report those to them).

Testing against the live instance must stay within the rate limits and must not attempt to read other users' data or the server's secrets.

## What we protect

| Asset                        | How it is protected                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gemini API key**           | Read from `GEMINI_API_KEY` on the server only. It is never sent to the browser or written to a log, and it never appears in any response, error message or prompt.                                                                                                                                                                                                                                |
| **Household data**           | Every request is validated with strict zod schemas (unknown keys rejected, length caps, 10 kB body limit). Nothing is written to disk. Generated plans are cached in memory for at most an hour, keyed by a SHA-256 hash of the profile. Exact coordinates are never sent to Gemini or logged. Request logs keep only the method, the path without its query string, the status and a request id. |
| **The model's instructions** | Free-text notes are stripped of control characters, length-capped, and sent as an escaped, fenced data block marked as untrusted, so they cannot close the block or act as instructions. Gemini's output is schema-validated, unknown impact ids are rejected, and every figure on an impact card comes from our own calculations, not from the model.                                            |
| **The browser**              | helmet sets a strict Content-Security-Policy: same-origin only, no inline script or style, no `eval`, and `frame-ancestors 'none'`. It also sets HSTS, `nosniff` and `no-referrer`. No CORS grant is made, so other origins cannot read the API.                                                                                                                                                  |
| **Availability**             | Per-IP rate limits (10/min for plans, 60/min for the rest of `/api`), timeouts and a single bounded retry on every upstream call, and a deterministic offline plan whenever Gemini is unavailable.                                                                                                                                                                                                |
| **Error responses**          | One shape, `{ error: { code, message } }`. Unexpected errors become a generic 500, and stack traces never reach clients.                                                                                                                                                                                                                                                                          |
| **Supply chain**             | `npm audit --omit=dev --audit-level=high` runs in CI on every push. The container runs as the non-root `node` user with production dependencies only.                                                                                                                                                                                                                                             |

Saans has no user accounts, sessions or cookies, so there are no credentials to steal.
