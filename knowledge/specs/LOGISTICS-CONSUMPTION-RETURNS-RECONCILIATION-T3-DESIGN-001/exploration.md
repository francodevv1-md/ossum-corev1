# Exploration: Logistics Consumption, Returns, and Reconciliation — Phase D

### Current State
Phase C is verified: a surgical dispatch persists immutable physical `CajasDispatchLine` rows, each linked to a `StockEvidenceLine`, reservation, controlled allocation, and consolidated `RemitoItem` (`src/lib/services/remito.service.ts:947-1007`; Phase-C verify report:37-55). The Phase-D C14 contracts already reserve Return (`WCB-07`) and Consumption (`WCB-08`) shapes, but both bundles are `INERT` (`src/lib/services/c14/bundles/wcb-07.ts:1`, `wcb-08.ts:1`).

The legacy services are not a valid Phase-D writer: consumption accepts client quantities and optional remito-item linkage (`src/lib/services/consumo.service.ts:487-624`); return confirmation only caps aggregated `RemitoItem.returnedQuantity` and changes the Remito state (`src/lib/services/devolucion.service.ts:169-290, 575-672`). Neither reaches physical dispatch lineage, Stock evidence, or inspection hold.

### Affected Areas
- `prisma/schema.prisma:3284-3655` — dispatch accounting, signed dispositions, return/consumption confirmations and physical lines.
- `prisma/schema.prisma:2467-2541` — immutable Stock evidence and source/destination movement fields.
- `src/lib/services/c14/bundles/wcb-07.ts`, `wcb-08.ts` — reserved but inactive Phase-D command contracts.
- `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/RECOMMENDED_PACKAGES.md:29-33,190-205` — non-double-counting remainder, Return/Consumption evidence semantics, and review hold.
- `src/lib/services/consumo.service.ts`, `src/lib/services/devolucion.service.ts` — legacy flows to supersede for surgical-Caja dispatches, not extend.

### Approaches
1. **Activate only the existing C14 topology** — use `CajasConsumptionLine.dispatchLineId` and return/disposition/accounting rows for identified dispatch allocations.
   - Pros: physical lineage, trace snapshots, per-dispatch shared remainder, C14 acceptance/audit topology already exist.
   - Cons: cannot meet the required authoritative closure state or an unidentifiable physical return. `CajasReturnLine.articleId` and `devolucionItemId` are required (`prisma/schema.prisma:3511-3541`); `CajasDispatchAccounting.reconciledAt` has no actor/command/closure record (`3374-3416`).
   - Effort: Medium, but insufficient for the stated scope.

2. **Resolve the structural gates, then design one Phase-D writer** — preserve the C14 topology for identifiable allocations and stop until the two gaps below have an approved structural decision.
   - Pros: meets trace, capped allocation, audited human reception, and durable closure requirements without pretending legacy aggregates are authoritative.
   - Cons: crosses a T3 schema/approval boundary.
   - Effort: High.

### Recommendation
Do not design an apply package yet. Reuse the C14 physical topology after Franco resolves the required structural gates: (1) a recorded unidentifiable return cannot satisfy the required `articleId`/`devolucionItemId` lineage; (2) no authoritative, actor/audit-linked dispatch closure artifact exists. This is a stop/escalate result, not a schema proposal.

For derivable rules once unblocked: consume/return only against one dispatched physical line; lock the dispatch/accounting scope; accept positive quantities only while `final + hold + requested <= netDispatch`; write the command acceptance, audit, Stock evidence, confirmation, lines, signed disposition, and accounting projection atomically; replay identical intent and reject changed intent. `returned` uses destination-only `RETURN` evidence, while `underReview` is a hold and not available re-entry (`RECOMMENDED_PACKAGES.md:197-201`).

### Risks
- C14 explicitly defers condition/closure lifecycle semantics; `CajasConditionProjection` is not acceptance authority (`RECOMMENDED_PACKAGES.md:207-231`).
- Existing role policies conflict: Phase-C stock actions are `admin|operator` (`src/lib/permissions/stock-operations-policy.ts:1-11`), while legacy consumption/return mutations include broader roles (`consumo.service.ts:35-43`, `devolucion.service.ts:38-46`). The Phase-D action policy needs Franco.
- Correction is structurally supported, but Return/Consumption reversal and annulment are explicitly blocked without dedicated lineage (`MATRICES_PROPOSAL.md:122-129`).

### Ready for Proposal
No. Ask Franco only to decide: (a) the required auditable treatment of unidentifiable physical returns; (b) the durable closure authority/state and closure predicate; (c) who may record reception, inspect/re-enter, consume, and close; and (d) whether receipt first creates `underReview` hold and only a separate inspection releases it to available stock. Do not infer these from current C14 or legacy services.
