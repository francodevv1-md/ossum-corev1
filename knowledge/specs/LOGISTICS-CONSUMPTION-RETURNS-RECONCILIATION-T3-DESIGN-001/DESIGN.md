# Design: Phase D — Consumption, Returns, and Logistic Reconciliation

## Technical Approach

Phase D must be one server-authoritative, C14 command path per accepted consumption or return, rooted in the immutable Phase-C `CajasDispatchLine`, not the commercial `RemitoItem` aggregate. WCB-07 (return) and WCB-08 (consumption) already define their required section shapes but are `INERT`. Legacy `consumo.service.ts` and `devolucion.service.ts` remain unsuitable for surgical-Caja dispatches: they accept client quantities or aggregate `RemitoItem.returnedQuantity` without physical lineage or review hold.

## Deducible Design Decisions

| Decision | Rationale |
|---|---|
| Account per physical dispatch line | Each dispatch line preserves Article, unit/scale, lot, serial, expiration, position, trace snapshot, evidence and Remito lineage. Commercial aggregation cannot enforce a physical ceiling. |
| Accept only positive slices within shared remainder | For a locked dispatch/accounting scope, `final + hold + requested <= dispatched net quantity`; consumption and final dispositions use final remainder, `underReview` uses hold remainder. This prevents concurrent or partial over-disposition. |
| Record a complete acceptance atomically | Authorization, idempotency/replay check, audit event, command acceptance, Stock evidence, confirmation/lines, signed disposition, and accounting version/projection commit or roll back together. Exact replay returns its prior result; same key with altered intent is rejected. |
| Preserve returned stock in hold | A received return creates no available-stock effect. `underReview` is supported by source-only `REVIEW_HOLD`; only an explicit, audited receiving/control outcome may resolve it. `CajasConditionProjection` is not acceptance or closure authority. |

## Data Flow and State Projection

```text
Phase-C dispatch line + immutable evidence
  -> locked C14 WCB-07 / WCB-08 acceptance
  -> evidence + confirmation + physical line + disposition
  -> dispatch accounting and surgery reconciliation read model
```

The surgery projection must expose quantities by physical allocation and commercial roll-up: `prepared -> dispatched -> consumed -> returned -> pending`. `pending` is the undisposed remainder plus separately visible review-held quantity; it must never imply available inventory. Partial and full returns remain tied to one Remito/dispatch and, when identifiable, one `CajasDispatchLine`; their snapshots must equal the dispatch lineage. `missing`, `damaged`, `underReview`, and observed return facts remain visible as non-consumption outcomes. No return or consumption may exceed that line's net dispatch.

## Existing Topology and T3 Gates

`CajasReturnLine` permits nullable `dispatchLineId`, but requires `articleId` and `devolucionItemId`; therefore it cannot represent a genuinely unidentifiable physical return. Its current kinds have no distinct observed/incomplete/unidentifiable outcome. `CajasDispatchAccounting.reconciledAt` has neither actor, command acceptance, audit linkage, nor a defined closure predicate. These are T3 schema gates, not gaps to patch in a service. Do not activate WCB-07/WCB-08 or prepare an apply package until the following functional decisions are approved:

1. **Unidentifiable return:** its auditable representation and whether/how it affects a dispatch remainder.
2. **Authoritative closure:** durable owner/state, actor/audit/command links, and predicate for closing a dispatch/surgery reconciliation.
3. **Permissions:** who may record a return, inspect/re-enter it, consume, and close. Current Phase-C stock actions allow only `admin|operator`; legacy flows are broader.
4. **Receiving outcome:** whether all physical receipts first enter `underReview`, the controlled treatment of observed/damaged/incomplete facts, and the explicit outcomes that may release stock to available.

## Contracts and Validation Boundaries

WCB-07 must own Stock evidence, return confirmation/lines, optional replacement pairs, and dispositions; WCB-08 must own Stock evidence, consumption confirmation/lines, and dispositions. Both must reread exact company/dispatch/assignment/article/unit lineage and lock in deterministic scope order before acceptance. `returned` requires destination-only `RETURN` evidence; `consumed` requires source-only `CONSUMPTION`; `underReview` requires `REVIEW_HOLD`. Corrections, reversals, and annulments remain excluded until dedicated lineage is approved.

Validation must prove ceilings under concurrent partial commands, replay identity versus mutation, tenant/role denial, transaction rollback, immutable lot/serial/expiration/unit lineage, held-return non-availability, every return condition, and the authoritative closure predicate once defined. This is a design validation boundary, not a test plan or implementation authorization.

## File Changes

| File | Action | Description |
|---|---|---|
| `knowledge/specs/LOGISTICS-CONSUMPTION-RETURNS-RECONCILIATION-T3-DESIGN-001/DESIGN.md` | Create | This design only. No code, schema, migration, activation, or configuration change is authorized. |

## Open Questions

- [ ] Approve the four functional gates above; otherwise Phase D is blocked before implementation.
