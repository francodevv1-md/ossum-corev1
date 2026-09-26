# Design: Global Logistics Inbox Read Projection

## Technical Approach

Create one company-scoped read service behind `GET /api/companies/:companyId/logistics/inbox`. It projects existing Surgery plus Phase B/C/D facts in server queries, returns page rows and aggregate counts in the same filter scope, and never calls E1 per Surgery. E1 remains the selected-surgery physical authority.

## Architecture Decisions

| Option | Trade-off | Decision |
| --- | --- | --- |
| Browser E1 fanout | Reuses E1 but is non-authoritative for global ordering/counts | Reject |
| Persisted read model | Faster later, adds schema/write invalidation | Reject for first package |
| Server composition of existing records | Query complexity, no new persistence | Choose |
| Invent overdue/next-task rules | Convenient UI, changes business semantics | Publish unavailable until approved |

No schema or migration is required: Phase B allocation/control/difference, Phase C dispatch/remito, Phase D operation/reconciliation, Surgery, and existing audit/acceptance facts already persist the required lineage.

## Data Flow

```text
GET company/logistics/inbox + filters
  -> auth + requireCompanyReadAccess
  -> validated server filters
  -> Surgery + B/C/D + event facts (company-scoped)
  -> row facts, counts, deterministic cursor order
  -> Inicio / Novedades / Bandeja read response

row open -> existing E1 GET for that Surgery -> unchanged workspace
```

## Interfaces / Contracts

```ts
type LogisticsInboxResponse = {
  generatedAt: string
  counts: { news: number; urgent: number; overdue: number | null; exceptions: number }
  availability: { overdue: "available" | "unavailable" }
  items: Array<{
    surgery: {
      reference: string; date: string | null; patient: string | null; doctor: string | null
      client: string | null; institution: string | null; locality: string | null
      surgeryStatus: string | null; preparationStatus: string | null
      logisticsStatus: "Borrador" | "Emitido" | "En_transito" | "Entregado" | "Parcialmente_devuelto" | "Devuelto" | "Anulado" | "mixed" | "unavailable"; priority: string | null
    }
    logistics: {
      stages: Array<"prepare" | "control" | "dispatch" | "receive" | "return" | "reconcile"> | "mixed" | "unavailable"
      cajas: Array<{ reference: string }> | "unavailable"
      materials: { count: number; availability: "available" | "partial" | "unavailable" }
      quantities: { expected: string; assigned: string; dispatched: string; consumed: string; returned: string; pending: string; quarantine: string }
      availability: "available" | "partial" | "unavailable"
      blockers: { count: number; highest: "missing_expected" | "missing_trace" | "missing_remito_lineage" | null }
      differences: { open: number; closed: number }
      alerts: { count: number; highest: "pending_identification" | "receipt_observed" | "receipt_not_fit" | "reconciliation_reopened" | null }
      exceptions: { count: number; highest: "blocker" | "difference" | "pending_identification" | "partial" | null }
      lastNovelty: { label: string; at: string; responsible: string | null } | null
      nextAction: { label: string; stage: string } | null
      indicators: Record<"prepare" | "dispatch" | "receive" | "return" | "reconcile", "ready" | "pending" | "unavailable">
      capabilities: Record<"prepare" | "dispatch" | "receive" | "return" | "reconcile", "available" | "unavailable">
    }
    transition: SurgeryTransitionDescriptor | null
  }>
  page: { nextCursor: string | null; hasMore: boolean }
}
type SurgeryTransitionDescriptor = {
  kind: "surgery-main-state-transition"; targetStatus: string
  endpoint: string; method: "PATCH" | "POST"; available: boolean
  unavailableReason?: "not_available"
}
```

Filters are `q`, `cursor`, `limit` (bounded), `stage`, `exception`, `priority`, `news`, `overdue`, `branchId`, `cxStatus`, `prepStatus`, `from`, and `to`. Sort: exception, available-overdue, urgent priority, approved next-action rank, newest logistics event, date, non-display Surgery ID. Cursor encodes those keys; all filtering and ordering occurs before pagination.

The transition descriptor is read-only. The UI receives and renders three independent state dimensions: `surgeryStatus` (`Surgery.cxStatus`), `preparationStatus` (`Surgery.prepStatus`), and `logisticsStatus` (surgical `Remito.state`). `scheduled` is surgery scheduling and is never a mapping for `En tránsito`; `En_transito` belongs exclusively to `logisticsStatus`, so Surgery remains `scheduled` while material is in transit. For multiple relevant Remitos, `logisticsStatus` is the sole shared state when all are equal, otherwise `mixed`; missing lineage is `unavailable`.

`Remito entregado` confirms logistics delivery only. `Realizada` is always an explicit `scheduled → performed` request through `POST .../execute`, retaining the delivered-Remito prerequisite, permissions, validations, atomic date, and `surgery.executed` audit/effect. `Suspendida` and `Cancelada` use the existing generic Surgery status PATCH authority. No descriptor executes, changes permissions, leaks technical denial text, automates a transition, creates a parallel route/service, or adds a Surgery state. Institution locality comes only from the existing institution-contact main-address (`isMain`) city; User first/last name supplies the latest-event responsible when available.

`En tránsito` is not a validated backend `cxStatus`; the legacy frontend `runAutomations` helper is not backend authority. No implementation package may add it to Surgery or infer it from `prepStatus`.

### Latest-news projection

The candidate CTE owns `lastNovelty`. Its `news_events` CTE unions only an explicit allowlist of B/C/D audit/accepted operational occurrences and surgical Remito states `Emitido`, `En_transito`, `Entregado`, and `Anulado`. Each row carries a closed presentation label, occurrence timestamp, persisted responsible user display name, operation key, and source priority. `DISTINCT ON (surgery_id, operation_key)` removes duplicate representations of one operation with B/C/D priority; the per-surgery selection then orders timestamp descending and B/C/D before Remito on a tie.

`lastNovelty` exposes `{ at, label, responsible }` only. Unknown actions, payload-only technical events, and unsupported Remito states do not enter the union. The candidate projection derives `has_news` from the same selected row, so page filtering and `counts.news` have exactly the same PostgreSQL semantics. `lastNovelty: null` is the only result when no compatible row exists.

## File Changes

| File | Action | Description |
| --- | --- | --- |
| `src/lib/services/logistics-global-inbox-read.service.ts` | Create | Server projection, counts, order, cursor |
| `src/lib/validators/logistics-global-inbox-read.ts` | Create | Bounded query validation |
| `src/app/api/companies/[companyId]/logistics/inbox/route.ts` | Create | Read-only route and guards |
| Focused unit/integration tests | Create | Mapping, isolation, pagination, partial states |

## Testing Strategy

| Layer | Proof |
| --- | --- |
| Unit | mapping, counts, ordering, cursor, unavailable overdue, descriptor routing |
| Integration | company isolation, archived exclusion, filter scope, no writes |
| Regression | E1 and Surgery transition route/service tests remain unchanged |

## Migration / Rollout

No migration required. Roll out the route first; a later small UI package consumes it. Legacy/incomplete records remain explicit partial rows.

## Open Questions

- [ ] Approve the business deadline/basis and ranking for `overdue` and next authoritative action; neither exists in current B/C/D/E1 contracts.
