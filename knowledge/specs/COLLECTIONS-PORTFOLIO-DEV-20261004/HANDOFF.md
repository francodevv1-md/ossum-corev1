# Handoff

## Done
- Implemented bounded read-only Collections Portfolio V1 at `/ventas/cartera` in active Antigravity tree. Source/testing/static review completed; later authenticated empty-state browser acceptance passed.

## Changed
- Separate authoritative balances per currency, issuance-age buckets, searchable/filterable oldest/largest invoice list (20 per page), four weekly registered-payment windows, refresh and existing finance workspace links.
- Invalid money/currency/date conditions visible. No invented payer/maturity, currency conversion, balance recomputation or payment mutation. Existing complete-fetch and company-scope hooks reused unchanged.

## Files
- `src/app/ventas/cartera/page.tsx`
- `src/lib/collections-dashboard.utils.ts`
- `src/__tests__/unit/collections-dashboard.utils.test.ts`
- `src/__tests__/components/CollectionsDashboard.test.tsx`
- This isolated task pack and `.opencode/locks/COLLECTIONS-PORTFOLIO-DEV-20261004.lock.md`.

## Validations
- PASS: two new mocked suites48/48; independent final stable-snapshot review PASS.
- Extended finance regressions54/55: existing standalone API-client assertion expects numeric900 instead of existing string900 serialization; unchanged source/test, no foreign fix.
- Global TypeScript FAIL: only foreign `next.config.ts:10` eslint/NextConfig TS2353. No new-file diagnostics; global green not claimed.
- Initial browser BLOCKED was resolved by user-requested headed capture. Later real Chromium1/1 PASS7.7s: company/auth200, both portfolio reads200, empty/search/mobile/reload. Fresh external state reused, no business mutations attempted; browsers closed. Positive-balance runtime fixture coverage NOT RUN (actual portfolio empty).
- Independent browser-runner static review PASS. Build NOT RUN: shared runtime/output owner remains unchanged.
- Replay commands and Diagnose evidence in VALIDATION.md. No actual backend/DB connectivity acceptance performed for this route.

## Risks
- Invoice age is not overdue; authoritative due date/payer still absent from reused contract. List fetches are not a transactional snapshot.
- Direct route only: no shared sidebar edit, preserving another owner's navigation changes.
- Implementer timed out after writing source; coordinator verified actual files/tests and obtained a fresh independent review of final hashes. No completion inferred from timeout.

## Next
- Validate positive-balance populated synthetic cases in a separately authorized fixture scope before claiming complete financial runtime coverage. Current actual browser evidence certifies the empty-state/control flow only.
- Reconcile global config/legacy-test issues separately with their owners; do not alter this bounded read-only package to bypass them. No commit/deploy requested or performed.

## Local checkpoint authorization
- Franco subsequently requested “Commitea los cambios hasta aca y después seguimos”. The local checkpoint includes only this session's Cartera/QA files and released ownership records; no push/deploy or foreign source inclusion.
- Saved browser tooling imports the existing local `scripts/qa/dev-session.mjs`, which is currently untracked work from a separate task. It is intentionally not taken into this commit; replay in a clean checkout also requires that separately owned tooling to be integrated. Existing tracked Cartera hooks/API/money dependencies are unchanged and tracked.
