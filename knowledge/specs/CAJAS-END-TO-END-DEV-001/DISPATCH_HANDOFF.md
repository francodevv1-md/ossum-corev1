# Dispatch / Remito bounded implementation

## Done
- Actual emitirRemito invokes acceptCajasDispatch in its owning Serializable transaction, after accepting Emitido/visibleNumber and before Remito audit/notification. Helper starts no nested transaction. Dispatch failure rejects the owner callback; PostgreSQL rollback is NOT proven by unit doubles.
- Partial component dispatch keeps remaining component and box reservations active. Accepted dispatch/header/immutable lines, DISPATCH_OUT ledger, stock references, pending accounting, command acceptance/effects and both audits share the owner transaction.
- Ownership released in DISPATCH_LOCK.md; preparation LOCK and schema remain released. Shared schema unchanged b3b0fcf8472078aed254b3ffe4423643653f8a28. Six preparation source hashes match PREPARATION_HANDOFF.md.

## Changed
- Optional typed emission body: `{ cajasDispatch: { assignmentId, idempotencyKey, expectedVersion, lines: [{ preparationLineId, remitoItemId, quantity }] } }`. Empty body preserves generic issuance.
- Persisted linkage convention: `metadata.cajas.assignmentId`. Such drafts require matching intent; successful intent issuance persists linkage. Legacy soft `boxId` alone retains existing operation. Draft callers must persist this explicit marker for new Cajas-linked Remitos; UI integration is later-owned.
- Route reuses existing CAJAS_DISPATCH_ACTION_ROLES with existing canonical guard in addition to Remito mutation roles; no grants changed. Client accepts optional typed intent. Response retains ordinary Remito fields and adds accepted `cajasDispatch` for this branch.
- Replay command hash includes owning remitoId. Exact replay resolves accepted dispatch without issuing another visible number/effect, including closed assignment. Changed payload/Remito conflicts; different command cannot dispatch same Remito again. One intent owns one assignment.
- Assignment is reloaded after row lock; activeSlot, current clean control/version/recontrol and open differences gate acceptance. Box reservation must match assignment scope. Component reservation/article/scope/activeSlot, immutable control quantity/unit/trace and Remito item trace must agree. Duplicate preparation lines, overdispatch, item quantity mismatch and precision >4 rejected.
- Article row locks and canonical stock-position ledger balance check prevent accepting quantity beyond current physical stock, including aggregate lines sharing a position.

## Files
- src/lib/services/cajas-dispatch.service.ts — 7ed50e994f533a322be407cbe987ca05b03a9b57
- src/lib/services/remito.service.ts — af6d5df3b7ccbb2b91b8394c84e7a4f9de12e744
- src/lib/validators/remito.ts — 29b330dc62fc84c3ed720b15eda9180f7e7ae638
- src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts — 6c08cae81e8436e50e5ea139827201cd4a2b005f
- src/lib/api/remitos.ts — 929d41b51e2e9680c45973ee4a718ed29938f8e1
- src/__tests__/unit/cajas-dispatch-owner.test.ts — ebad7646c6274db4cb7e27134c577b4a70bc5782
- knowledge/specs/CAJAS-END-TO-END-DEV-001/DISPATCH_LOCK.md and DISPATCH_HANDOFF.md.

## Validations
- `npx vitest run src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts`: first run 41 passed / 1 failed; second run 42/42 passed across 3 suites (27 existing + 15 new), 12.45s.
- New tests exercise actual owner/helper/command/audit/ledger services, mocking only persistence and notifications. Cover partial dispatch/pending accounting/traces, owner Serializable invocation and rejection propagation, missing/stale/recontrol, same replay after closure/no new number/effect, changed payload/Remito, duplicate/overdispatch/trace/stock/reservation/inactive/open difference rejection, explicit linkage without intent, legacy soft-box emission and intent schema.
- Diagnose: Reproduce caller search shows orphaned helper; raw payload lacks remitoId; evidence ledger helper appends without capacity checks. Scope owner/helper/API only. Hypothesis omitted owner invocation and incomplete binding/validation. Minimal fixes above. First test failure was double remito.update returning old id despite other Remito query; corrected only new fixture to return requested other id. Rerun all targeted suites passes. Regression check existing Remito service/route green.
- Read-only `git hash-object` at baseline, immediately before edits and release; no Git mutation. Exact final hashes above. No unfiltered tests, DB tests, schema/migration/generate, dependency install, build/typecheck or browser executed in bounded block. Seven-suite 84 baseline was user-provided, not rerun here.

## Risks
- Unit transaction snapshot simulates rollback; cannot prove PostgreSQL atomicity, locking/concurrency/isolation or number rollback. Actual PostgreSQL proof is mandatory later.
- Explicit metadata marker identifies Cajas drafts. A draft without marker or supplied intent is intentionally legacy; later UI must reliably persist the marker. This block does not solve draft-marker removal/history governance.
- No successful global typecheck/build claim. Existing identified-unit ledger/position consistency and concurrent dispatch/reservation capacity need disposable-DEV PostgreSQL proof. Existing legacy acceptances hashed without remitoId are conservatively rejected on new replay rather than rebound.
- Route-specific new intent authorization/body cases validated by code trace/schema tests, not new HTTP cases; existing remito-route suite remains green. UI not wired. Accounting implementation and later return/consumption effects remain next-owner responsibility.

## Next
- Orchestrator review scoped diff and typed linkage/response convention; next owner integrates accounting. Run isolated PostgreSQL partial balance, rollback, replay, tenant isolation and concurrency proof. Later UI persists explicit linkage and sends intent; broaden quality gates under its own block.
