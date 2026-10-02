# Isolated commit validation

- Base HEAD: `2d8d61799290ee20c6280b58fdb980254601e83a`.
- Candidate patch SHA256: `2ead6329a0708cf40bf392bcd43f296bb8075dcd43326d8e5451033dfd8a9d25`.
- Candidate: 19 source/test files, exact Git blob allowlist in MANIFEST.md.
- Scratch only; no original source, shared build output, server, browser, database, credentials, schema, or membership mutation.

## Focused checks

Existing installed tools ran in the isolated HEAD-plus-candidate copy, with database/provider/session variables removed. Vitest reused the original configuration, changing only its scratch cache location.

`node node_modules/vitest/vitest.mjs run --config isolation-vitest.config.ts --reporter=verbose` with these eight explicit suites:

- `src/__tests__/components/PresupuestoConnectedForm.test.tsx`
- `src/__tests__/unit/invoice-service.test.ts`
- `src/__tests__/unit/presupuesto-concurrency.test.ts`
- `src/__tests__/unit/presupuesto-service.test.ts`
- `src/__tests__/unit/presupuesto-api-routes.test.ts`
- `src/__tests__/unit/presupuesto-mvp-closure.test.ts`
- `src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts`
- HEAD's `src/__tests__/unit/pending-invoices-page.test.tsx`

Result: exit 0, eight files, 79 passing tests, 7.43 seconds. No selected test skipped or assertion weakened. Controlled/uncontrolled Select and localStorage runtime warnings remain; not a globally clean console claim.

Scoped ESLint on the form, API adapter, and connected-form test: exit 0. This is not all-file lint certification.

`node node_modules/typescript/bin/tsc --noEmit --incremental false`: candidate and clean-base logs are byte-identical after newline normalization. Both have eight pre-existing Stock/Cirugias diagnostics; zero added diagnostics. This is NOT a clean global TypeScript result. See DIAGNOSE.md.

## Preservation and patch proof

- Final recovery ran `finalize.py check`: all 1,912 original tracked/source/Prisma/script file entries preserved; source HEAD and index preserved before staging.
- All 19 candidate SHA256 values and the patch SHA256 match the frozen manifest.
- Patch applies to canonical base Git blobs; every candidate file matches the reconstructed result, every nonallowlisted archived file is unchanged.
- Direct byte-safe Git reads avoid PowerShell text-pipeline encoding loss and LF/CRLF confusion.
- Independent read-only review accepted this exact candidate; REVIEW.md records scope and limits.

## Evidence limits

Earlier connected-package browser/build/real PostgreSQL evidence belongs to the original dirty-tree snapshot. It is retained as history, not relabeled exact-candidate acceptance. No repeated full QA, live PostgreSQL, browser journey, or production build ran for this isolated commit.

The untracked opt-in `presupuesto-revision-postgres.test.ts` remains outside this candidate. Its earlier real contention evidence is not replaced by mock concurrency tests. Existing `presupuestos-api.test.ts` only adapts returned revisions to the new request contract; its real-DB suite was not executed.
