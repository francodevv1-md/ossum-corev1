# Task Brief — Receipt + Surgery Preparation V1

- **Status:** Approved by Franco — DEV implementation package
- **ID:** `STOCK-V1-RECEIPT-PREPARATION-IMPLEMENTATION-001`
- **Scope:** Goods receipt, traceable stock intake, surgery preparation, reservations, and optional existing-box association

## Objective

Extend Article Master into the first operational stock flow:

```txt
Article → GoodsReceipt → StockEvidence(RECEIPT) → StockPosition
                                      ↓
Surgery requirement → StockReservation → Preparation partial/complete
                                      ↓
                              existing Box assignment (optional)
```

The UI accompanies the physical operation and reports missing or ambiguous information without imposing document order. Critical integrity failures remain blocked server-side.

## V1 behavior

### Receipt

- Start with no document, invoice/remito reference, or supplier context.
- Scan or search an Article through the shared Article lookup/Scan Core boundary.
- Capture quantity and applicable lot, serial, and expiry once.
- Preserve raw scan evidence and resolution status.
- Allow receipt lines to remain pending until the user resolves ambiguity or completes missing trace data.
- Confirm atomically into `StockEvidence` with `RECEIPT` kind and derived stock positions.
- Never create stock from Article creation alone.

### Preparation

- Create or reopen a preparation linked to an authorized surgery.
- Show requested, available, reserved, prepared, and missing quantities.
- Scan/select available traceable stock and reserve it for the surgery.
- Support partial preparation and continuation.
- Prevent duplicate reservation of an identified unit and prevent oversubscription of fungible quantity.
- Keep reservation separate from dispatch/remito/consumption.
- Optionally associate the preparation with an existing `CajasAssignment`; do not create a new box subsystem.

## Persistence rules

- Reuse `StockEvidence` / `StockEvidenceLine` for receipt effects.
- Reuse `StockPosition`, `StockIdentifiedUnit`, and `StockLot` for physical traceability.
- Reuse `StockReservation`, evidence, and projections for preparation commitments.
- Add only source records needed for `GoodsReceipt`, `GoodsReceiptLine`, `ScanEvent`, `SurgeryPreparation`, and `SurgeryPreparationLine`.
- Use company-scoped relations, server-side transactions, audit, and semantic idempotency where existing infrastructure requires it.
- Do not introduce a parallel `StockMovement` or local preparation ledger.

## Out of scope

- OCR execution or document storage redesign.
- Automatic purchasing or replenishment.
- Dispatch, Remito issuance, Consumption, Devolución, or fiscal behavior.
- New Box model or box composition engine.
- Camera mobile application.
- Production/staging data, deploy, publication, commit, push, or PR.

## Required gates

1. G-SCHEMA — additive models/relations and constraints reviewed against Stock design.
2. G-MIGRATION — migration artifact applied only to the confirmed disposable DEV database.
3. G-BACKEND — receipt/preparation services, validators, permissions, audit, transactions, and idempotency.
4. G-CIRUGIAS — surgery linkage limited to preparation records; no Cirugías redesign.
5. G-UI — receipt and preparation surfaces using existing Stock/Expediente interaction language.
6. G-VERIFY — focused tests, Prisma validation/generate, typecheck/build, and authenticated browser QA when a DEV session exists.

## Acceptance criteria

1. A receipt can be created without an invoice or supplier document.
2. A scan resolves a known Article and preserves raw scan/trace evidence.
3. Ambiguous or unknown scans remain actionable pending review and never silently create identity.
4. Receipt confirmation creates stock evidence and traceable position data atomically.
5. Article creation still creates no physical stock.
6. A surgery preparation can be partial and resumed.
7. Reservation excludes active reservations and prevents duplicate identified-unit assignment.
8. Preparation does not issue a Remito or alter Consumption/Devolución.
9. Company boundaries and mutation permissions are enforced server-side.
10. Retry/idempotency does not duplicate receipt evidence or reservation effects.
11. Existing Stock/Expediente UX patterns are extended, not replaced by a separate visual system.

## Stop conditions

- Any need to invent stock truth outside existing evidence/position/reservation models.
- Any cross-company reference or unresolved traceability rule.
- Any destructive migration or non-disposable database mutation.
- Any required redesign of Cirugías, Expediente, Auth, permissions, or Cajas beyond the stated linkage.
