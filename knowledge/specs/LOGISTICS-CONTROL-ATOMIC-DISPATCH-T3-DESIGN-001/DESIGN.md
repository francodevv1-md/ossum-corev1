# Design: Logistics Control and Atomic Surgical Dispatch — Phase C

## Purpose, non-goals, established facts

This approval proposal adds human physical-preparation control and one-Caja, atomic surgical Remito dispatch. It does not implement, activate, migrate, alter Auth/RLS, add UI, or cover consumption, returns, replenishment, purchases, billing, fiscalization, or multiple Cajas per Remito.

Phase B already persists immutable per-allocation `CajasReservationCorrelation.allocationTraceSnapshot`, supports multi-position/multi-lot allocation and explicit release/replacement, and projects `DRAFT/PARTIAL/COMPLETE/DIFFERENT`. It creates neither control nor dispatch. Current `deriveSurgicalDispatch`/WCB-06 is single-reservation and bijective to `RemitoItem`; it must be superseded in a future approved apply, not treated as compatible now.

## Commands and state machine

| Command | Preconditions | Accepted transition / durable result |
|---|---|---|
| `acceptControl` | one active Caja assignment; current preparation is `COMPLETE`; every active allocation has active reservation, complete compatible trace and immutable snapshot | create `CajasControl` (`control` or `recontrol`) and one immutable `CajasControlLine` **per physical allocation**; set `latestControlId`, `requiresRecontrol=false`; open `CajasDifference` for each detected difference |
| `resolveDifference` | open difference from that current control | append `CajasDifferenceResolution`: accept closes it; reject remains open. Both record actor, authoritative time, reason, and supporting evidence reference |
| `changeComposition` | accepted preparation mutation/release/replacement | append `CajasCompositionChange` and lines; increment preparation version and set `requiresRecontrol=true`; prior control is stale |
| `acceptDispatch` | current accepted control; no open differences; all allocations still valid | atomically issue one Remito, consolidated commercial lines, physical lines/effects, and dispatch acceptance |

`acceptControl` result is `CLEAN` when no differences, otherwise `WITH_DIFFERENCES`; dispatch requires the latter's differences to be closed. Any composition change after control invalidates dispatch eligibility, regardless of whether the eventual projection remains COMPLETE.

## Invariants and rejection

Reject dispatch when there is not exactly one active Caja assignment; preparation is not COMPLETE; control is stale/missing; a difference is open; a correlation is superseded/released/cancelled or its reservation is not `ACTIVE`; allocation quantity/unit/scale/article mismatches; trace mode, lot/serial/expiration/identified-unit evidence is incomplete or incompatible; unavailable Stock is detected; or a Remito/dispatch for the same semantic command already has a different intent.

One surgical Remito owns exactly one Caja assignment. It has one commercial `RemitoItem` per Article (quantity is the sum of accepted physical allocations), while every allocation produces one physical child line. No client-provided Article, quantity, trace, availability, or lineage is authoritative.

## Data mapping and approval gates

| Persisted artifact | Phase C mapping |
|---|---|
| `RemitoItem` | immutable commercial/printed Article aggregate |
| `CajasControlLine` | immutable controlled physical allocation snapshot |
| `CajasDispatchLine` | immutable physical child detail, many rows may reference one `remitoItemId` |
| `StockEvidenceLine` | per-allocation Stock movement: reservation, position, quantity, lot/serial/expiration snapshots |
| `CajasReservationCorrelation` | preparation-to-reservation immutable allocation lineage |
| `CajasDispatch`, `StockEvidence`, `StockReservationEvidence`, `OperationalCommandAcceptance/Effect`, audit | accepted dispatch, Stock application, idempotency and audit evidence |

**No schema addition is currently required:** `CajasDispatchLine` plus `StockEvidenceLine` can represent physical children and link each to its reservation; its shared `remitoItemId` permits commercial consolidation. A future apply must prove deterministic `dispatch line → StockEvidenceLine.reservationId → correlation` lineage. If that proof fails, the only schema gate is an explicit correlation/reservation reference on `CajasDispatchLine`; it requires separate Franco approval before any migration.

## Atomic flow, retry, concurrency, audit

```text
request/idempotency key
  -> lock assignment + preparation + active correlations/reservations/positions
  -> revalidate control, differences, trace, availability, one Caja
  -> group allocations by Article -> create RemitoItems
  -> create StockEvidence/lines + one reservation-apply evidence/effect per reservation
  -> create CajasDispatch/physical lines + Remito issued state + audit/acceptance
  -> COMMIT all | ROLLBACK all
```

Use `OperationalCommandAcceptance` semantic uniqueness and an intent hash: identical retries return the persisted dispatch; changed intent conflicts. Lock the assignment/preparation first, then reservations/positions in stable ID order; conditional projection updates remain the final no-double-dispatch guard. The acceptance, audit event, effects, Remito state, Stock evidence, and every lineage link share one transaction.

## Permissions, boundaries, and projected artifacts

Reuse existing `STOCK_OPERATION_ROLES` (`admin`, `operator`) for preparation and dispatch. Control and difference decision use the same vocabulary but are **open approval decisions**: whether `operator` may control, and whether difference resolution requires `admin`, cannot be derived from current policy. Routes only authenticate/authorize and validate transport; a Phase-C service owns all validation/transactionality. It projects: preparation control status, immutable control/difference history, dispatch eligibility/rejection reason, Remito commercial lines, and physical allocation trace lines.

## Test matrix

| Layer | Proof |
|---|---|
| Service | COMPLETE/control snapshots; difference accept/reject; invalidation; consolidation; every rejection invariant |
| Integration | transaction rollback; concurrent attempts/no double dispatch; same-key replay and changed-key conflict; multi-lot/position lineage; tenant isolation |
| Regression | Phase-B release/replacement; generic preparation; existing WCB-06 remains unchanged until explicitly superseded |

## Open decisions for Franco

1. May `operator` accept control, or is control `admin`-only?
2. May `operator` accept/reject a difference, or is resolution `admin`-only?
3. Is a rejected difference intentionally left open and dispatch-blocking (the proposed interpretation of existing `closesDifference=false`)?
