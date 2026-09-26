# Task Brief — Real Caja Physical Preparation (DEV-only)

## Approval

Franco explicitly approved this DEV-only Phase B on 2026-09-06, including B1–B4: multiple position/lot allocations with per-allocation traceability; audited draft composition changes and visible non-final differences; operational acknowledgement without control approval; and retained partial reservations until an explicit audited release action.

After the initial topology stop, Franco additionally approved the smallest additive schema and DEV migration: nullable immutable `allocationTraceSnapshot` JSON on `CajasReservationCorrelation`. Every new Phase B correlation must contain a complete server-derived snapshot with physical/stock unit, lot, serial, expiry where relevant, source physical position, assigned quantity, and capture time. Existing correlation IDs and FKs remain the operational lineage. Corrections append a release/replacement chain and a new correlation; correlations are never overwritten.

## Intended scope

Implement only server-authoritative Caja expected-line physical preparation: eligible-position reads, atomic reservation, expected-line allocation correlation, expected-versus-found projection, and DRAFT/PARTIAL/COMPLETE/DIFFERENT states. The client supplies only permitted identities, quantity, idempotency key, and reason/observation fields.

## Explicit exclusions

- No UI, Auth or permission-policy change.
- No `CajasControl` or `latestControlId` write, Remito, dispatch, billing, fiscal integration, purchase, replenishment, deployment, commit, push, or PR.

## Schema and database boundary

- The migration is additive and nullable for legacy rows.
- The existing C14 append-only trigger on `cajas_reservation_correlation` also protects the new column, so no broad new trigger system is added.
- Migration application is allowed only after the target is explicitly proven to be the confirmed disposable DEV database. Static migration validation may proceed without that proof.

## Pre-implementation topology proof

The existing topology was inspected before claiming application files:

1. `CajasReservationCorrelation` supports multiple rows for one `preparationLineId`, and each row refers to an individual `StockPosition`, `StockReservation`, and `StockReservationEvidence`.
2. It does **not** contain a trace snapshot field.
3. `StockReservationEvidence` records quantity, unit, scale, actor, cause, and command/audit references, but no lot, expiration, serial, identified-code, or JSON trace snapshot.
4. `CajasPreparationLine.traceCapture` is a single mutable field for the whole expected line. With B1, two allocations from different lots or identified units would overwrite or conflate one line-level trace capture. It cannot preserve an immutable trace snapshot for each allocation.
5. Existing `StockPosition` relations can describe the current lot/unit, but they are not the required retained allocation snapshot and may change after reservation.

## Historic topology finding

The approved contract requires that every allocation retain its own traceability and that the projection expose its trace snapshots. The currently materialized write topology has no per-`CajasReservationCorrelation` trace-snapshot storage, and reusing line-level `traceCapture` would violate B1 for multi-position/lot fulfillment.

This Task Brief records the topology and contract that required the schema decision; it does not assert the current application implementation state. Implementing the command without a schema change would have either lost historical per-allocation traceability or fabricated it from mutable current state, both contrary to the approved rules.

## Resolved approval

The separate T3 schema decision and DEV migration approval were granted as recorded above. The minimum decision provides immutable per-allocation trace capture linked one-to-one with each correlation/reservation evidence; migration application remains subject to the disposable-DEV proof in the database boundary.
