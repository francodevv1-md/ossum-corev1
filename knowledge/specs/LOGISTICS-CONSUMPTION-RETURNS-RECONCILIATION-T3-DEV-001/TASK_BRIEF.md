# Task Brief — LOGISTICS-CONSUMPTION-RETURNS-RECONCILIATION-T3-DEV-001

## Scope

Implement the approved DEV-only Phase D server-authoritative reconciliation path for immutable Phase-C physical dispatch lines. The path records consumption, identifiable or pending-identification returns, controlled receipt dispositions, and explicit reconciliation close/reopen snapshots.

## Invariants

- Every identified disposition is bounded by one immutable `CajasDispatchLine` net quantity.
- Identified units are whole-unit only; return intake never changes available stock.
- Unidentified returns remain quarantined and linked to surgery, Remito, return record, actor, evidence and later resolution.
- Action capabilities are separate: consumption, return registration, receiving/control, reconciliation close, and admin-only reopen/correction.
- Commands are company-scoped, transactional, idempotent, append-only, and audited.

## Explicit exclusions

Purchases, replenishment, fiscal/billing work, automatic shortage actions, UI redesign, production/staging/deploy, authentication architecture, and DB mutation application.

## DB gate

This task may create additive schema and migration artifacts. It must not apply a migration unless the target is explicitly proven to be a disposable DEV database.
