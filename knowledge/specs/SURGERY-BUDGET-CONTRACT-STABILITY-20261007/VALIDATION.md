# Validation evidence

## Baseline
- Four existing budget unit suites: 32 tests passed.
- Existing connected budget component suite: 11 tests passed.
- Surgery-create API integration: initially 2 failures (403). Cause: auth fixture omitted current `canonicalRole`. After that fixture correction, remaining failure was the absent transactional `contactCompanyLink.findMany` mock used by current automatic contact numbering. Both fixture-only corrections applied; 2/2 passed. No product Auth/contact changes.
- Global TypeScript: default Node heap exhausted (~4 GB). Explicit 12 GB process heap completed with pre-existing errors across Remitos, Compras, Cajas, authorization evidence tests, Cloudflare/global DOM types, and other files. Preserve these failures as baseline; do not expand product scope to fix them.
- Real-DB `presupuestos-api.test.ts` loads environment credentials and creates/deletes database fixtures. It was not run against an unconfirmed target.

## Reproduced budget round-trip gaps
Command: `npx vitest run src/__tests__/unit/presupuesto-form-roundtrip.test.ts --maxWorkers=2`

The injected repository echoes actual service writes rather than returning a canned successful row. Real payload builders, JSON serialization, create/update validators and service serialization run together. Initial result: 4/4 failed:
- General discount ignored: 2 × 100, 10% line discount, 10% general discount, 21% VAT persisted 217.8 instead of 196.02.
- Unchanged editor save retains the wrong amount.
- Clearing notes/payment terms omitted properties from JSON; persisted notes remained unchanged.
- `NO_GRAVADO` hydrated as `exento`.

Reproduction strengthened to execute real POST/PATCH/GET route handlers as well as builders/validators/services; only auth context, audit sink and Prisma I/O are mocked. Same four failures reproduced at HTTP readback. Additional pre-change concurrency/VAT suites: 71 tests passed.

## Intake checkpoint review
- Directed implementation first reproduced four failures; 41 focused tests passed after initial correction.
- Independent review identified ambiguous-outcome retry duplication and opening an absent-store expediente after refresh failure. Corrective checkpoint remains open until those regressions pass.
- Corrective implementation reproduced 4 regressions, then passed 49 focused hook/dialog tests: only definitive 4xx rejection permits retry POST; ambiguous writes are reconciliation-only; absent-store navigation retains partial-intake context. Existing two Contacto fixture type errors corrected within owned suite.
- Pre-field-change surgery regression baseline: 53 tests passed across visible numbering, backend adapter, management route/service and coordinator read model.
- Parent follow-up: 2 failing pending-navigation assertions reproduced; disabling Previous during confirmation closes the submitted-vs-displayed snapshot mismatch. Full dialog suite: 35/35 passed.
- Final review candidate: initial Surgery POST itself may have an ambiguous network/5xx outcome before an ID is received. Verify that another confirmation cannot blindly replay that write; budget-only reconciliation is insufficient for this boundary.
- Initial Surgery POST candidate resolved: network/5xx/missing ID blocks another POST within the same wizard session; definitive 4xx allows correction. Focused hook/round-trip tests: 51 passed.
- Field checkpoint correction: sparse PATCH omission preserves existing assignment/identity/notes/precision fields, explicit null clears; switching to an addressless institution clears prior derived geography. Corrective regression run: 129 passed.
- Independent intake re-review: PASS on both field corrections and initial-write ambiguity guard. Replay protection remains session-scoped; reopening/reloading is not server idempotency.
- Parent-executed intake gate after re-review: 11 suites, 166 tests passed (`--maxWorkers=2`), including API create, hook/dialog, real service-write round trips, management, adapter, numbering and coordinator reads. No database connection or browser involved.

## Validation boundaries
- Final current-source isolated build: PASS, exit 0 in 83.507 seconds, 66/66 static pages. Existing missing-export warnings in Compras and billing-gate remain. Project build configuration skips TypeScript checks; the independent scoped/global TypeScript results above remain authoritative. Shared DEV runtime untouched.
- Final joint regression: 13 suites / 239 tests passed after budget review corrections and test typing fixes. Earlier broader intake gate: 11 suites / 166 passed.
- Corrected scoped TypeScript gate: PASS, no diagnostics. Uses original compiler options with explicit task roots and shared test setup; excludes unrelated global Cloudflare ambient declarations. This does not replace the failing repository-wide gate.
- Budget independent re-review: PASS. Legacy monetary changes recompute amounts; unchanged legacy and provenance-backed fixed amounts remain intact. Clear/reopen/save retains empty editable values.
- Scoped `git diff --check`: PASS (only existing LF/CRLF conversion notices).
- Budget checkpoint initial parent gate: 120 tests in 8 suites passed, plus 11 connected component tests. Connected-journey Prisma fixture needed scoped branch/contact delegates after new reference validation; reproduced failure then corrected fixture only.
- Independent budget review found legacy monetary edits retaining obsolete tax and cleared display placeholders reappearing in editable values; corrective implementation in progress.
- Initial scoped TypeScript attempt omitted shared test setup (missing jest-dom matchers); temporary validation config corrected. One newly added dialog item fixture lacked required FormItem properties; completed fixture, dialog 37/37 passed.
- Post-change global TypeScript still fails on baseline errors plus newly identified test JSON response typing under Cloudflare ambient declarations; new test errors must be corrected before final closure.
- Isolated build attempt compiled with existing missing-export warnings in Compras and billing-gate, then exceeded the runner timeout (320 seconds including termination). Build gate is not PASS.
- No Browser QA, deployment, schema changes or operational data writes.
- Full build runs in a separate source snapshot to preserve the reserved live dev runtime.
- Unit/API integration evidence is not a claim of live PostgreSQL or browser acceptance.
