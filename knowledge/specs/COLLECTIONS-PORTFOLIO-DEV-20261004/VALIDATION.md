# Validation evidence

## Prerequisites checked
- 2026-10-04: TCP DEV5000 reachable. No server restart, build or business request executed by this check.
- `CORE_FLOW_STORAGE_STATE` is not configured in this session. Authenticated application browser QA is currently BLOCKED before launch; do not search arbitrary saved sessions or alter Auth.
- `node scripts/qa/dev-session.mjs preflight`: BLOCKED session prerequisites or runtime (redacted output), before browser launch. This is a missing QA prerequisite, not a portfolio regression or evidence of expired Auth.
- DEV5000/shared `.next` is reserved by DEV-QA-READINESS-SESSION-20261003; no exclusive build window acquired. Production build NOT RUN here.

## Focused replay
Run from `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`:

```powershell
.\node_modules\.bin\vitest.cmd run src/__tests__/unit/collections-dashboard.utils.test.ts src/__tests__/components/CollectionsDashboard.test.tsx --maxWorkers=1
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
```

These commands must remain limited to mocked unit/component scope; never use the broad `npm test` command which can discover PostgreSQL writes. Implementation/test results and independent review will be recorded after execution. Component tests do not certify real browser/API connectivity.

## Actual coordinator results
- PASS: focused two new suites, 48/48 tests, 2.76 seconds. Pure projection and mocked-hook UI checks only; no actual API/DB/browser evidence.
- Extended regression: four suites (the two new ones plus billing-payments-hooks and billing-payments-api-client), 54 PASS / 1 FAIL. New portfolio and hook suites passed. Existing API-client expectation fails on numeric `900` versus existing serialized string `"900"`.
- FAIL: global `tsc --noEmit --incremental false`: only `next.config.ts(10,3) TS2353`, obsolete `eslint` property in foreign-owned config. No diagnostics reported in the new files. This is not a global TypeScript PASS.
- Initial independent static review: PASS, no source edits. A later hash comparison differed for page/component tests, so final current-snapshot review was requested rather than relying on that earlier verdict.
- Final independent static review: useful-lavender-peacock PASS on current snapshot; hashes matched start/end. Page A7F688C4E42E; utility B4EE4D1C4565; unit7A3AE911DF37; component6C1A03D32F1A. No correctness findings; no independent runtime execution claimed.
- Build NOT RUN (exclusive runtime/output reservation not acquired); browser QA BLOCKED (authenticated state not configured). No schema, data, Auth, dependencies, shared navigation or existing source edited.

## Diagnose — existing regression, no foreign fix
- Reproduce: the existing billing-payments-api-client suite fails alone with the identical mismatch, without importing Cartera.
- Scope/evidence: API client and existing test have no Git diff; payments.ts:113/117 explicitly String-normalizes payloads, while existing test line51 expects number values. Cartera performs no payment mutations.
- Hypothesis: existing assertion and existing payload serialization contract disagree, unrelated to the additive read-only route.
- Minimal fix: none applied; both existing files are outside reserved write scope. Do not change financial serialization just to make an old assertion pass.
- Validate/regression: new tests PASS48; extended run54/55; isolated existing run3/4. Existing TypeScript config failure likewise parked without editing another owner's configuration.

## Browser continuation — 2026-10-04
- Franco requested opening the browser for testing. Existing headed capture tool reported PASS fresh session saved outside Git. No credentials automation, session contents in reports, Auth edits, server restart or business writes.
- PASS: saved `browser.spec.ts` via `browser.config.ts`, one actual Chromium test in7.7s. Reused the same captured state; expected-company membership200 and actual invoices/payments GETs200 verified.
- Exercised actual empty portfolio, read-only copy/finance links, search/clear, mobile390px control visibility/search bounds, and route reload. Actual current DEV portfolio is empty: positive-balance/currency/ranking loops were NOT runtime exercised. Their existing48mockedtests remain the populated-data evidence.
- Browser contexts closed by capture/Playwright; no unattended session retained. Shared runtime/build ownership unchanged. No build or global typecheck green claim added.
- Saved command (external session/artifact variables must be configured locally, never pasted into source):

```powershell
.\node_modules\.bin\playwright.cmd test --config=knowledge/specs/COLLECTIONS-PORTFOLIO-DEV-20261004/browser.config.ts
```

- Test-only Diagnose: first attempt reached protected-route session verification before membership and timed out at15s. Matched existing verified login-preflight entry and60s cold-DEV wait, without Auth changes. Next attempt proved empty section exists but has zero height; changed readiness assertion to visible priority heading plus attached balances section. Next snapshot proved currency accessible role/name `combobox Moneda`; changed exact label locator to that role. Final run PASS; no application fixes required.
- Independent saved-runner review spontaneous-copper-tern PASS. Limits: backend financial oracle reuses projection helper; mutation guard covers matching API routes, not arbitrary side effects; desktop/mobile checks are scoped controls, not full visual certification. Populated actual fixture validation remains future work, not implicitly authorized data mutation.
- Post-browser full TypeScript attempt exceeded120s without diagnostics; outcome BLOCKED/timeout, not PASS. Prior complete global run already identified the foreign next.config.ts issue. No source/config fixes or uncontrolled process termination performed.
