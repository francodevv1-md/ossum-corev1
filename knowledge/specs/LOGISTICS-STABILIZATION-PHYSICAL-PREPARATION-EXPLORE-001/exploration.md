# Exploration: LOGISTICS-STABILIZATION-PHYSICAL-PREPARATION-EXPLORE-001

## Current State

### Current reality

- **Reachable generic path:** `POST /surgeries/:surgeryId/preparation` creates `SurgeryPreparation`; `POST .../preparation/reserve` reserves one selected `StockPosition` for one generic line. The reservation is company-scoped, idempotent, locks the preparation line, conditionally decrements `StockPositionProjection`, and writes reservation evidence/projection (`src/lib/services/preparation.service.ts:91-145`).
- **Reachable Cajas start:** `POST /surgeries/:surgeryId/cajas` assigns one physical Caja and snapshots its formula into `CajasPreparation` + `CajasPreparationLine` expected lines (`src/lib/services/cajas-assignment-preparation.service.ts:246-368`). Those lines deliberately have `stockPositionId: null` (`:343-359`); this is a formula expectation, not physical preparation.
- **Implemented but locally gated Remito spine:** surgical `emitirRemito()` only runs when `OSSUM_C14_WCB06_ENABLED=true`; it derives server lineage, requires exactly one active assignment, current accepted control, reservation correlations, and a bijection to Remito items before WCB-06 can atomically dispatch (`src/lib/services/remito.service.ts:947-1003`, `1005-1116`). The activation was local-DEV-only in the prior pack (`knowledge/specs/CORE-FLOW-E2E-DEV-001/TASK_BRIEF.md:34-39`).
- **Documentary/inert topology:** Prisma already declares `CajasPreparationLine.stockPositionId`, trace capture, `CajasReservationCorrelation`, `CajasControl`, and dispatch models (`prisma/schema.prisma:2991-3360`), but no application writer creates Cajas reservation correlations or controls. Their only runtime consumer is Remito derivation (`src/lib/services/remito.service.ts:950-982`). Thus schema presence is not a live physical-preparation slice.
- **Known integrity debt:** WCB-06 replay only confirms matching acceptance/result dispatch existence (`src/lib/services/c14/bundles/wcb-06.ts:57-63`); it does not revalidate persisted evidence, effects, counts, timestamps, or complete lineage. This is the accepted HIGH follow-up (`knowledge/specs/CORE-FLOW-E2E-DEV-001/HANDOFF.md:41-52`).

### Confirmed invariants

- Formula versions are future-only; accepted preparations retain their starting version (`knowledge/specs/CAJAS-B01-D2-SCHEMA-DESIGN-001/PROPOSAL.md:187-190`).
- One identified Caja can have only one active assignment, enforced by `uq_ca_active_box` (`prisma/schema.prisma:2901-2908`); assignment snapshots expected formula lines atomically.
- Browsing does not reserve; confirmed incorporation must invoke the Stock reservation boundary and create a Cajas correlation (`knowledge/specs/CAJAS-B01-D2-SCHEMA-DESIGN-001/PROPOSAL.md:209-222`).
- A physical selection must retain the selected position and traceability, while the formula remains unchanged (`knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/SPEC.md:456-487`).
- Dispatch is not preparation control: it requires a current accepted control and no re-control requirement (`src/lib/services/remito.service.ts:954-982`; `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/SPEC.md:517-533`).
- A surgical dispatch must be server-derived, single-assignment, non-empty, bijective, company-scoped, and atomic with Remito issuance (`knowledge/specs/REMITO-STOCK-ATOMIC-DISPATCH-001/TASK_BRIEF.md:85-112`).

### Gaps

1. No live command binds a Cajas expected line to a server-selected physical `StockPosition`, captures traceability, reserves it, and creates `CajasReservationCorrelation`.
2. No live expected-versus-found composition read model exists. Existing `CajasPreparationLine` expected rows are not proof of found composition.
3. No Cajas control/re-control command produces `CajasControl`/lines or updates `latestControlId`; WCB-06 therefore remains unreachable from a normal Caja workflow.
4. The generic reservation service writes `StockReservation` for `SurgeryPreparationLine`, not `CajasPreparationLine`; reusing it directly would not supply the Cajas correlation/lineage required by `deriveSurgicalDispatch()`.
5. Current WCB-06 requires all mapped dispatch lines to reference exactly **one** reservation (`src/lib/services/remito.service.ts:981-982`). A normal multi-component formula, whose components need distinct positions/reservations, cannot reach this contract without a separately approved dispatch-contract change. Phase B must not claim multi-component dispatch enablement.
6. Replay-integrity HIGH is open; activation or expansion of the Remito path before its focused resolution is a no-go.

## Affected Areas

- `src/lib/services/preparation.service.ts` — live generic reservation contract; modified in the dirty worktree.
- `src/lib/services/cajas-assignment-preparation.service.ts` — live Caja assignment and expected-line snapshot; untracked dirty worktree file.
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/cajas/route.ts` — current Caja command ingress; untracked dirty worktree file.
- `src/lib/services/remito.service.ts` — server-derived WCB-06 lineage and single-reservation restriction; modified dirty file.
- `src/lib/services/c14/bundles/wcb-06.ts` — replay integrity and atomic writer; added dirty file.
- `prisma/schema.prisma` — existing physical-preparation structures; heavily modified dirty critical file. No schema conclusion is made here.
- `src/__tests__/unit/{preparation.service,cajas-assignment-preparation.service,remito-service,c14-wcb-06}.test.ts` and `src/__tests__/integration/remito-stock-atomic-dispatch.test.ts` — focused evidence; all are dirty/untracked.

## Approaches

1. **Two bounded packages (recommended)** — first stabilize existing WCB-06/Preparation contracts without schema; then build physical selection/reservation correlation without dispatch/control activation.
   - Pros: resolves the accepted integrity HIGH before wider use; separates pre-existing dirty ownership from new logistics work; proves real stock selection without pretending the full chain is reachable.
   - Cons: Phase B stops at dispatch-readiness data, not operational Remito issuance for arbitrary formulas.
   - Effort: Medium.

2. **One end-to-end Cajas-to-Remito package** — add physical selection, control, multi-reservation dispatch semantics, and issue Remitos together.
   - Pros: one visible full workflow.
   - Cons: crosses unresolved business rules and likely schema/stock/dispatch-contract boundaries; exceeds safe review and dirty-tree isolation limits.
   - Effort: High; not recommended.

## Recommendation

### Proposed two-package sequence

**Phase A — `LOGISTICS-PREPARATION-REMITO-STABILIZATION-DEV-001` (smallest bounded stabilization):**

- Own and resolve only the accepted WCB-06 replay-lineage/evidence HIGH: a same-intent replay must validate the persisted dispatch, exact seven-section evidence/effects, counts, acceptance/time bindings, and supplied semantic lineage before returning success.
- Preserve existing generic Preparation reservation semantics and surgical/non-surgical Remito separation; do not add Cajas control, physical-selection UX, schema, migrations, or activation/config persistence.
- Use focused WCB-06, Remito issuance, and preparation-reservation regression evidence. Keep WCB-06 disabled except an explicitly approved local DEV validation process.

**Phase B — `LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001` (minimum viable real preparation):**

- For an existing active Caja assignment and its formula snapshot, expose only server-selected eligible Stock positions per expected line.
- Confirm one physical selection at a time in one transaction: lock the relevant preparation/position scope; revalidate company, active assignment, formula/version, Article, unit/scale/traceability, and availability; reserve Stock; persist selected `CajasPreparationLine` composition and `CajasReservationCorrelation`; return expected-versus-found status.
- Treat confirmed selection/reservation/correlation as the **control prerequisite**, not a control acceptance and not dispatch eligibility. Do not write `CajasControl`, change `latestControlId`, or enable a surgical Remito.
- Reuse existing models only if an exact service design proves they express the required append-only/current-projection behavior. Otherwise stop for explicit schema/migration approval; this exploration does not decide either outcome.

### Acceptance evidence

- Phase A: focused replay tests demonstrate valid replay; missing/mismatched evidence, effect, count, time, company, reservation, or lineage rejects with no new writes; existing atomic rollback and non-surgical issuance tests remain green.
- Phase B: focused service/route tests demonstrate server-only position selection, tenant isolation, position/article/unit/scale/trace checks, oversubscription/race protection, idempotency conflict/replay, reservation plus correlation atomicity, and expected-versus-found projection.
- One disposable-DEV integration proof may be run only after explicit approval and a fresh authenticated preflight; no E2E failure caused solely by expired auth is a logistics regression.

## Risks

- **Dirty ownership overlap:** `prisma/schema.prisma`, `preparation.service.ts`, `remito.service.ts`, WCB-06, their tests, and Caja assignment files are already modified/added/untracked. The observed status identifies no active logistics lock from the released `CAJAS-ASSIGNMENT-PREPARATION-DEV-001` lock, but Git state does not identify a current owner. No implementation starts until an owner isolates/stages the existing work and publishes a new lock.
- **T3 gate:** Phase B touches stock truth, reservations, Caja/surgery linkage, and business rules; it requires Franco's explicit bounded approval and a Task Brief. Any schema/migration is separately forbidden until explicitly approved and the target is confirmed disposable DEV.
- **No-go:** do not enable or widen surgical Remito issuance while WCB-06 replay HIGH remains unresolved, while Cajas control has no live producer, or while multi-component reservation semantics remain undefined.
- **Unanswered business decisions (must be answered before Phase B apply):** whether one expected component may be fulfilled by multiple positions/lots; whether substitution/addition/removal is allowed before control; who may acknowledge a difference; whether a partial found composition may retain/release reservations; and whether a single Caja may contain multiple component reservations for a later dispatch. None may be inferred from UI or schema.

### Exact recommended next Task Brief

`LOGISTICS-PREPARATION-REMITO-STABILIZATION-DEV-001`: **T3 DEV-only, implementation + QA.** Resolve only WCB-06 same-intent replay evidence/lineage revalidation in `src/lib/services/c14/bundles/wcb-06.ts`, its focused tests, and strictly necessary Remito integration tests. No schema, migration, persistent activation, Cajas control/physical-selection behavior, Auth/permissions changes, billing/purchases, deploy, commit, or database mutation. Stop on dirty-file ownership conflict, any need to alter the single-reservation dispatch contract, or a newly required business rule. Require focused regression, atomic rollback/replay proof, TypeScript/build evidence as applicable, and independent read-only review.

## Ready for Proposal

**Yes for Phase A**, after ownership isolation and explicit approval of the bounded T3 stock/Remito integrity fix. **No for Phase B apply** until the listed physical-composition decisions are made and the implementation design proves whether current schema is sufficient.

## Handoff

### Done

Read-only exploration completed; no implementation or schema decision finalized.

### Changed

Created this exploration artifact only.

### Files

- `knowledge/specs/LOGISTICS-STABILIZATION-PHYSICAL-PREPARATION-EXPLORE-001/exploration.md`

### Validations

Inspected live routes/services, Prisma topology, focused tests, canonical specs, prior handoff, and dirty-worktree status. No tests or DB commands were run.

### Risks

Open WCB-06 replay HIGH, no live Cajas control/correlation producer, multi-reservation dispatch mismatch, and broad dirty ownership overlap.

### Next

Obtain ownership isolation and approval for Phase A; decide the listed Phase B business rules before proposal/apply.
