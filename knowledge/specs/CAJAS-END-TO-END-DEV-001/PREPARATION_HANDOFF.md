# Preparation recovery — bounded partial delivery

## Done
- Sole recovery writer after mighty-amaranth-galliform termination. Service ownership released; schema remained released throughout, hash b3b0fcf8472078aed254b3ffe4423643653f8a28.
- Actual service tests prove identified-unit, lot and fungible selection; immutable change data and revision/recontrol invalidation; box-plus-component reservation; accepted snapshot replay including reused reservations and replay after closure; payload conflict rejection; stale-version/exclusivity/capacity/dispatched-edit blocks; rejected resolution remains open; explicit fresh recontrol appends history; open differences and pending dispatch/reservations block closure; bounded serialization retry.
- Existing control implementation retained. Difference authority recovered from root Phase-C TASK_BRIEF:5; no grants edited.

## Changed
- Selection reloads preparation after assignment lock, checks exclusive ownership and position capacity before accepting selection.
- Reservation acceptance stores the complete JSON-normalized result in its existing immutable audit metadata AFTER all reservations succeed inside the same serializable transaction. Fresh accepts and retries return that snapshot. Result includes reused reservations; later row mutations cannot change it. Old acceptances without snapshot retain the legacy batch lookup fallback.
- Difference resolution revalidates active assignment after lock. Closure checks selected active undispatched content in addition to existing control/difference/accounting/reservation guards.
- Corrected proven selection TypeScript defects: scope inferred as null and redundant companyId in nested composite-key change creation.

## Files
- src/lib/services/cajas-command.service.ts — final blob 500eea765c158477d62da9662ad50b746dbe094a
- src/lib/services/cajas-assignment.service.ts — 043bf680aca6488bcac6a6bacb7a51d5b1c50a2d
- src/lib/services/cajas-component-selection.service.ts — 2a5953eb044ee56a4aa58260607440f9c78e21ae
- src/lib/services/stock-reservation.service.ts — 0340e9992606cdeacb9dd7772d11fee1bb2df32d
- src/lib/services/cajas-control.service.ts — unchanged 5b8058ab33cb929fb8f0f38ae6217014a16183ac
- src/lib/services/cajas-difference.service.ts — 130aa3f13d3b7dcf40532c5ed7f37c61b6e3b15e
- src/__tests__/unit/cajas-preparation-recovery.test.ts — 06e9ad41702ba1362ce3b4c4115989cce1d9aa5f
- This handoff and LOCK.md. Other dirty sources preserved.

## Validations
- `npx vitest run src/__tests__/unit/cajas-preparation-recovery.test.ts`: 14/14 passed.
- Combined targeted new suite + cajas-slice1-formula/cajas-slice3-assignment/stock-physical-unit: 36 passed / 5 failed / 41 total. Original three regressions before recovery edits: 22 passed / same 5 failed / 27 total.
- Five existing slice3 tests use pre-recovery mocks: missing cajasCommandAcceptance.findUnique and $queryRaw; initial failure precedes domain logic. Existing test files were outside this writer's new-test-only scope and left intact. Do not claim original 27 remain green.
- First `npx tsc --noEmit --incremental false` reproduced owned scope/nested-create errors and three new-test assertion typing errors; fixed minimally. Also reported foreign MobileCirugiaCard/onOpenActions errors and cajas-accounting unchanged disposition enum error. Second typecheck hit 25-second budget; no successful global typecheck claimed.
- Diagnose: reproduce exact targeted/typecheck commands; scope preparation replay/lock reads and Prisma nested typing; evidence batch-only replay excludes existing reservations, pre-lock selection read and compiler diagnostics; hypothesis incomplete accepted result and stale state; minimal changes above; focused suite passes; original regression failures unchanged.
- Doubles exercise real services but do NOT prove PostgreSQL atomicity, rollback, locking/concurrency or tenant isolation. No DB tests, build, unfiltered Vitest, browser or Git mutations executed.

## Risks
- Partial core delivery, not seven-stage completion. Legacy accepted reservation commands without saved snapshot cannot recover omitted reused members; do not silently reinterpret their historic result.
- Eligibility consultation still does not fully align with trace-policy filtering or legacy draft reservations; selection capacity uses active Cajas position reservations, while final reservation also subtracts legacy drafts. PostgreSQL proof must cover this conservative capacity interaction.
- Removed inactive lines currently cannot be reactivated through selectCajasComponent; cancellation/removal-to-closure usability needs owning integration review. Clean controls of empty preparation remain blocked. No successful closure/reuse, replacement rollback or release/re-reserve DB proof claimed.
- Existing control replay looks up active assignment before replay; historic control retry after closure needs review. New reservation replay with explicit key/version works after closure; default version-derived legacy keys are not a substitute for client-provided intent keys.

## Next
- Main may acquire released service scope for dispatch/accounting integration. Finish remaining preparation gaps above; update existing assignment regression fixtures under its own scope.
- Wire company-scoped selection, resolution and explicit recontrol endpoints, validated reservation intent, approved existing role policies and operation-context UI. Current reservation/control routes still call legacy defaults and do not expose the complete lifecycle.
- Run actual disposable-DEV PostgreSQL concurrency/rollback/isolation/replay/closure proofs, dispatch/accounting partial balances, broader typecheck/build and authenticated browser gates. Prior article/minStock 22 and Remito/Consumo/Devolucion 84 passes are caller-provided baseline only, not rerun here.
