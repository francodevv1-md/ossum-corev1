# Validation evidence

- Test allowlist (only this file): `node_modules/.bin/vitest.cmd run src/__tests__/components/ComprobantesAsociados.http.test.tsx` — 1 file, 11 tests passed, 3.30 seconds.
- Fetch/auth boundary mocked; real presupuesto/invoice/apiFetch clients. GET-only endpoint/query-key allowlist rejects unrelated HTTP. No database or integration tests loaded.
- Covers supported backend surgery filter and company path; both endpoints' 500-row pagination; real number/date/state/currency/amount; draft/no numbering; absent vs zero invoice balance; budgets not debt; empty/missing-company/missing-ID/loading/error/retry; company/surgery late success and error; loaded scope hiding; mismatched response rejected; no fake actions or legacy authority.
- Browser not run: no authorized session/context supplied. No persistence acceptance claim.
- Build not run: shared dev/build output has no exclusive window for this task.

## TypeScript Diagnose — cycle 1

- Reproduce: `node_modules/.bin/tsc.cmd --noEmit --incremental false` reached tool's 120-second timeout, no diagnostics emitted.
- Scope: repository-wide static compiler only; no test execution or application/database commands.
- Evidence: tool timeout with empty output; tsconfig includes all TS/TSX and disallows incremental output for this command. No surviving compiler process observed after timeout; concurrent server Node processes left untouched.
- Hypothesis: compiler exceeds the short timeout on this dirty multi-package worktree; no evidence yet of a source type error.
- Minimal Fix: no source/config changes; extend timeout for the same read-only compiler command.
- Validate: `node_modules/.bin/tsc.cmd --noEmit --incremental false --extendedDiagnostics` passed without errors. 4,550 files; compiler total 47.22 seconds; no emit, memory 3,540,497 KB. No source fix required.
- Regression Check: panel HTTP tests already passed; no unrelated package QA repeated.
- Handoff: if retry exposes unrelated errors, report rather than editing outside ownership; no DB or shared build retry.

## Static scope review

- Both existing services filter by authenticated company + `surgeryId`; clients support `take`/`skip`; response arrays have no count/cursor. Reuse existing `fetchAllInvoices`; budget loop stops at short page, same 500-row page size.
- Existing clients, parents and shared components unchanged. Prop signature preserved; legacy commercial inputs ignored.
- Exact-document navigation not implemented by existing screens. Removed all ordinary placeholder actions and fiscal-evidence entry from this bounded operational read view; no synthetic URL navigation.
- Known out-of-scope parent: `ComercialTabContent.tsx:62–74` still displays legacy base-budget and balance cards outside the backend panel. Do not describe those cards or the entire Ficha CX as backend-authoritative. No ownership expansion performed.
- Offset pagination inherits server ordering and does not provide a snapshot under concurrent writes. No DB acceptance performed.

## Independent review evidence

- Read-only exploration `statistical-emerald-thrush` traced callers, real clients, route/service filter contracts and navigation limitations.
- Initial reviewer `mammoth-aqua-yak` returned only `Review complete; findings above.` with no persisted findings/conclusion. This is NOT treated as a passing review.
- Reassigned exact three-file read-only review to `characteristic-purple-nightingale`, requiring all findings in the final persisted response. Result: **No blocking findings**; contract, pagination, numbering/balance, no fallback, scope races, GET-only allowlist and no fake actions checked. Reviewer did not rerun tests or TypeScript; those executions are owned by Sol above. Compact evidence in REVIEW.md.

## Validated source fingerprints

Git blob hashes (`git hash-object`, no staging):
- `src/components/expediente/ComprobantesAsociados.tsx`: `36df47e893319626fc1696294a4f13636fd8b892`
- `src/hooks/useSurgeryComprobantes.ts`: `34b069aa5fe26d1c07a83238a0b8e0427b2bf5bc`
- `src/__tests__/components/ComprobantesAsociados.http.test.tsx`: `8ec1aac0acaf8af4f22e6bdea6e6044dbcbac3b7`
