# Design: E1 Logistics Operations Read Projection

## Technical Approach

Add one server-authoritative, read-only projection service for a company-scoped Surgery and a separate code resolver scoped to that same Surgery. It composes Phase B preparation/correlation facts, Phase C control/dispatch/remito facts, and Phase D operations/reconciliation facts without persisting a read model or inferring a new state machine. The E-phase UX consumes this contract; it does not calculate physical state.

## Architecture Decisions

| Option | Trade-off | Decision |
|---|---|---|
| Reuse legacy Trace | Available but commercial/derived and explicitly `v0-derived` | New physical projection; keep Trace separate and labelled derived |
| Persist a projection | Faster reads later; requires schema/write invalidation | Compose existing indexed records on GET |
| Resolve to first matching code | Convenient but unsafe | Return explicit zero/one/many resolution; never select on many |

## Data Flow

```text
GET surgery/logistics/operations
  -> auth + company read access
  -> getSurgeryLogisticsOperations(companyId, surgeryId, actor)
  -> Phase B/C/D records + role/grants
  -> physical allocations, summaries, lineage, capabilities

POST surgery/logistics/operations/resolve-code { code }
  -> same scope -> eligible physical allocation candidates
  -> { kind: none | exact | ambiguous }
```

## Interfaces / Contracts

`GET /api/companies/:companyId/surgeries/:surgeryId/logistics/operations`

```ts
type LogisticsOperationsProjection = {
  companyId: string; surgeryId: string; generatedAt: string
  summary: Record<"expected" | "assigned" | "dispatched" | "consumed" | "returned" | "pending" | "quarantine" | "blockers" | "differences", string>
  assignments: Array<{ id: string; caja: { articleId: string; identifiedUnitId: string }; assigned: ActorTime
    preparations: Array<{ id: string; version: number; requiresRecontrol: boolean; expected: Quantity; assigned: Quantity; status: "DRAFT" | "PARTIAL" | "COMPLETE" | "DIFFERENT" }>
    dispatches: Dispatch[] }>
  allocations: Array<{ id: string; assignmentId: string; preparationLineId: string; dispatchLineId: string | null; remito: Ref | null
    expected: Quantity; assigned: Quantity; dispatched: Quantity; consumed: Quantity; returned: Quantity; pending: Quantity; quarantine: Quantity
    positionId: string | null; lot: string | null; serial: string | null; identifiedCode: string | null; unit: string; snapshots: Snapshot
    differences: Difference[]; receipt: Receipt | null; reconciliation: Reconciliation | null; lineage: Lineage; capabilities: Capabilities }>
}
type Capabilities = Record<"prepare" | "control" | "dispatch" | "consume" | "return" | "receive" | "closeReconciliation" | "reopenReconciliation", { allowed: boolean; reason: string | null }>
type ResolveCode = { kind: "none"; code: string } | { kind: "exact"; code: string; allocation: ScanCandidate } | { kind: "ambiguous"; code: string; candidates: ScanCandidate[] }
```

Quantities are decimal strings. `ActorTime`, `Snapshot`, `Ref`, `Difference`, `Receipt`, `Reconciliation`, and `Lineage` contain only persisted IDs, actor IDs, authoritative timestamps, command/audit/evidence IDs, and source-kind values. `pending` is dispatched less final Phase-D disposition; `quarantine` is `PENDING_IDENTIFICATION` or non-FIT/review-held return evidence, never availability. The service must expose unavailable/missing source facts as blockers, not fabricate zero-success states.

Codes match normalized `identifiedCodeSnapshot`, `serialNumberSnapshot`, and Caja identified-unit code only; candidates must have a current allocation and at least one currently allowed action. Exact means exactly one candidate. `none` and `ambiguous` are 200 read results; a mutation remains a separate confirmed request.

## Source Mapping and Access

| Source | Projection fact |
|---|---|
| `CajasAssignment`, `CajasPreparation(Line)`, `CajasReservationCorrelation` | Caja, expected/assigned physical allocation and immutable allocation snapshot |
| `CajasControl(Line)`, `CajasDifference(Resolution)` | control/recontrol, differences and blockers |
| `CajasDispatch(Line)`, `Remito(Item)`, `StockEvidenceLine` | dispatch, commercial parent, position/lot/serial/unit snapshots and lineage |
| `CajasPhaseDOperation`, `CajasPhaseDReconciliationEvent` | consumption, returns, receipt/quarantine and reconciliation history |

The route uses `getApiAuthContext` and `requireCompanyReadAccess`; every query filters `companyId` and surgery lineage. Capability derivation reuses `canPerformStockOperations`, the existing Caja control/difference/dispatch role arrays, and checks each Phase-D action through existing `CajasPhaseDActionGrant`; reopen additionally requires `admin`. Read access never grants an action. Do not add grants or alter policy.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/services/logistics-operations-read.service.ts` | Create | Physical projection, source composition, capability and scan resolution. |
| `src/lib/validators/logistics-operations-read.ts` | Create | Bounded normalized scan-code input. |
| `src/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/route.ts` | Create | Read-only projection GET. |
| `src/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/resolve-code/route.ts` | Create | Scoped resolver POST. |
| `src/__tests__/unit/logistics-operations-read.service.test.ts` | Create | Totals, blockers, capabilities, none/exact/ambiguous. |
| `src/__tests__/integration/logistics-operations-read.route.test.ts` | Create | tenant/surgery isolation and route authorization. |

## Testing Strategy

| Layer | Proof |
|---|---|
| Unit | physical versus commercial roll-up; decimal totals; receipt/quarantine; exact capability reasons; no auto-selection |
| Integration | all B/C/D lineage fields; same-company other-surgery and cross-company non-disclosure; Phase-D explicit grants |
| Regression | existing Trace and command routes unchanged; projection performs no writes |

## Migration / Rollout

No schema or migration required. Existing models contain the required physical IDs, immutable snapshots, dispositions, receipt outcomes, reconciliation events, actors, times, and command/audit lineage.

## Open Questions

None.
