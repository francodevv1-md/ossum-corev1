# Handoff

## Done
- READY. Three fixes, actual connected DEV journey/duplicate409, independent review and production build passed on the same validated eight-file snapshot. DEV5000 restored/HTTP200; ownership released, browser closed, no commit/deploy.

## Changed
- Form/API boundary resolves selected surgery.backendId and rejects missing identity honestly.
- Sales draft edit loads persisted fields/items/revision, preserves commercial/FIRM/snapshot/currency/legend/IDs/unit/item metadata and exact unchanged amounts, sends displayed expectedRevision; failed/conflicted input retained without automatic token refresh/overwrite.
- Both invoice helper callers retain identical advisory SQL/key/sorted scope/transaction, now executeRaw avoids decoding void. Duplicate rejection uses existing conflict ApiError factory so the untouched API mapper returns409 instead of500; no broad InvoiceError/mapper/role changes.

## Files
- src/components/presupuestos/PresupuestoFormDialog.tsx
- src/app/ventas/presupuestos/page.tsx
- src/lib/api/presupuestos.ts
- src/lib/services/invoice.service.ts
- src/__tests__/components/PresupuestoConnectedForm.test.tsx
- src/__tests__/unit/invoice-service.test.ts
- src/__tests__/unit/liquidation-billing-gate.test.ts (transaction mock compatibility only)
- src/__tests__/integration/presupuesto-revision-postgres.test.ts
- This task folder. Starting/final hashes in LOCK.md; all pre-existing changes preserved.

## Validations
- Build-only authorized follow-up: npm run build exit0, Next16.2.6 webpack compiled33.0s/generated65static pages. All8source/test hashes unchanged before/after. DEV5000 restored, /login HTTP200. Existing QA reused without Playwright/full-suite repetition; details in BUILD_EVIDENCE.md.
- Focused command: `npx vitest run src/__tests__/components/PresupuestoConnectedForm.test.tsx src/__tests__/unit/invoice-service.test.ts src/__tests__/unit/presupuesto-concurrency.test.ts src/__tests__/unit/presupuesto-service.test.ts src/__tests__/unit/presupuesto-api-routes.test.ts src/__tests__/unit/presupuesto-mvp-closure.test.ts src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts src/__tests__/unit/pending-invoices-page.test.tsx src/__tests__/unit/liquidation-billing-gate.test.ts` →9files/96passed.
- `npx tsc --noEmit --incremental false`, global `git diff --check`, scoped form/API/new-form-test ESLint →PASS. No waiver/assertion weakening.
- Confirmed-target PostgreSQL opt-in suite11/11:9pure gates + actual independent-connection race + actual invoice creation/duplicate rejection. Same exact disposable DEV target corroborated with live owned record. Synthetic owned records retained; no schema/auth/membership/fiscal/reset operations.
- Actual Chrome recovery session10:58:03UTC →11:11:28UTC (13m25s). User manual login/storageState outsideGit; actual application/me200. Initial surgery options were legacy; navigating normal /cirugias loaded existing backend projections, then real sales UI journey executed. No store/core edits or fabricated browser state.
- UI create sent sgdevsurgery1000000000000, not visible CX; revision1/total242. Edit GET hydrated fields and items, PATCH used revision1, quantity2→3, accepted revision2/total363; commercial metadata retained. Full reload/reopen recovered revision2 and edited text. Emit accepted revision3; approve accepted revision4. Pending source showed backend surgery and owned budget. Actual invoice POST201 created operational Borrador with no visible/fiscal number or issuedAt.
- Exact-owned browser budget cmuqux9el000i5whu6yowgj56, invoice cmuquy8fc000p5whu41vrv531. Fresh authenticated API reads recovered budget Aprobado/revision4/total363/edited notes/client OSDE Binario/30días/LP-OSDE-2026-04 and exactly one Borrador invoice/total363. Replayed same-source POST through Playwright's existing authenticated request object (no token/header contents read or fabricated), actual409/invoice_source_already_invoiced. No second invoice/fiscal/payment operation.
- Earlier failed automation and budget suspensions in QA_STATUS are historical, not acceptance passes. Original full script's duplicate assertion exposed real generic500 translation; narrow conflict factory fix + regression + reruns closed it. No false claim that a failed script was green.
- Independent read-only review suspicious-white-warbler verified8file correction snapshot without confirmed defects; final coming-crimson-cuckoo rechecked duplicate ApiError translation/test delta, no SQL/key/predicate/scope change. Owner final hashes matched reviews. First general reviewer timed out and is NOT counted as completed review.

## Risks
- Former build blocker closed after explicit exclusive-window authorization; build passed, validated source snapshot unchanged and DEV5000 responds200. No remaining gate for this bounded package.
- Other InvoiceError branches still map generically500; unchanged, outside these three blockers. No whole-module/API green claim.
- Test mocks, real PG and browser evidence are separate. Legacy-only surgery selections without backend identity remain unavailable by design until normal backend surgery loading occurs.

## Next
- Package closed READY; proceed to next task. No functional correction or validation gate remains in this package.
