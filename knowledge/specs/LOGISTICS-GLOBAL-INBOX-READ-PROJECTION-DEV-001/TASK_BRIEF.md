# Task Brief — Global Logistics Inbox Read Projection

**Task ID:** LOGISTICS-GLOBAL-INBOX-READ-PROJECTION-DEV-001
**Status:** Approved DEV read projection; latest-news rule approved
**Scope:** One company-scoped, read-only projection for `/logistica` Inicio, Novedades, and Bandeja.

## Objective

Close the demonstrated cross-surgery read boundary without altering Phase B/C/D/E1 writes: publish a paginated, tenant-safe logistics inbox from persisted facts. It replaces neither the existing surgery list nor E1; opening a row still uses E1 and the existing `LogisticsOperationsWorkspace`.

## Proven Gap and Decision

`GET /api/companies/{companyId}/surgeries` publishes case identity and coarse filters only. E1 (`.../surgeries/{surgeryId}/logistics/operations`) is authoritative but strictly one surgery at a time. Browser fanout over E1 would make priority, counts, partial data, and pagination non-authoritative and unscalable.

The proposed `GET /api/companies/{companyId}/logistics/inbox` is therefore a new read contract, not a client composition. Existing Phase B/C/D records, `Surgery`, `Remito`, and audit/event evidence contain the required persisted facts; **no schema or migration is needed**. A persisted read model is not justified for this first package.

## Required Read Contract

```txt
GET /api/companies/{companyId}/logistics/inbox
  ?q=&cursor=&limit=25&stage=&exception=&priority=&news=&overdue=
  &branchId=&cxStatus=&prepStatus=&from=&to=
```

The server authenticates with `getApiAuthContext`, applies `requireCompanyReadAccess`, and scopes every source query by `companyId` and non-archived Surgery lineage. It returns only display-safe values; UUIDs, raw audit IDs, action target IDs, and technical permission reasons are never presentation fields.

The response has `generatedAt`, `counts` (`news`, `urgent`, `overdue`, `exceptions`), `items`, and `page` (`nextCursor`, `hasMore`). Each item contains visible CX reference; date; patient, doctor, client/payer, institution, and institution locality display names; **separate Surgery main status, preparation status, and logistics/Remito status**; Caja/material summary; published logistics stages/mixed state; decimal-string quantity summary; separate blockers, differences, and alerts summaries; row availability; latest logistics news with responsible display name when persisted; next authoritative action; capability indicators; and a navigation-only selected-surgery reference.

`stage`, `exception`, `priority`, `news`, and `overdue` filter server-derived published fields. Coarse case filters remain server-side. Pagination is cursor-based and sorted deterministically by: open exception; overdue (when available); `priority=urgent`; next-action rank; most recent logistics event; surgery date; Surgery ID as final non-display tie-breaker. Counts use the same authorization and filter scope except cursor pagination.

## Authority Rules

| Published fact | Authoritative source |
| --- | --- |
| Number, date, patient, doctor, client/payer, institution | `Surgery` plus its current contact relations / current surgery serializer |
| Institution locality | Institution contact’s main address (`isMain`) city; publish unavailable when no main-address city exists |
| Surgery main status, preparation, and priority | `Surgery.cxStatus`, `Surgery.prepStatus`, `Surgery.priority` |
| Logistics status | Surgical `Remito.state`; `En_transito` belongs only here, never to `Surgery.cxStatus` |
| Caja/material summary and quantities | Active `CajasAssignment`, immutable allocation/dispatch snapshots, and Phase D aggregated decimal quantities |
| Prepare/control/dispatch state and blockers/differences | `CajasAssignment`, preparation/correlation, control/difference, dispatch/remito lineage |
| Receive/return/reconcile state and exceptions | `CajasPhaseDOperation`, reconciliation events, immutable dispatch lines |
| Latest logistics news and responsible | Latest allowed B/C/D audit or accepted operational event, or persisted surgical Remito state change, joined to existing `User.firstName`/`lastName`; no generic Seguimiento feed |
| Next action and indicators | Server derivation from the exact persisted facts and E1 capability policy; no client inference |

Indicators are published booleans or unavailable states for `prepare`, `dispatch`, `receive`, `return`, and `reconcile`; they are not commands. “Next authoritative action” is an ordered, display-safe recommendation only when its business ordering is explicitly defined and source facts are complete. It never grants permission.

## Approved Latest-News Rule

`lastNovelty` is a read-only projection of the latest compatible persisted occurrence for a Surgery. It unions only allowed B/C/D preparation, control, difference, dispatch, consumption, return, receipt, and reconciliation audit/accepted operational events with persisted surgical Remito state changes in `Emitido`, `En_transito`, `Entregado`, or `Anulado`.

- The occurrence timestamp is authoritative; the newest compatible occurrence wins.
- The same operation represented by B/C/D and Remito is one novelty and B/C/D wins. B/C/D also wins a timestamp tie.
- A closed server-side catalog supplies labels (for example, `Preparación actualizada`, `Caja controlada`, `Despacho emitido`, `Remito en tránsito`, `Material recibido`, and `Conciliación cerrada`). Unknown or technical events are excluded.
- The response exposes only `{ at, label, responsible }`; `responsible` is the visible persisted user name or `null`. It never exposes IDs, payloads, audit actions, or technical metadata.
- If no compatible occurrence exists, `lastNovelty` is `null`. `news` filters and the `counts.news` count use this exact shared candidate CTE predicate in PostgreSQL.

## Surgery Main-State Transition Descriptor

If the inbox exposes a requested Surgery main-state transition, it returns a navigation/confirmation descriptor only:

```ts
{ kind: "surgery-main-state-transition"; targetStatus: string;
  endpoint: ".../surgeries/{surgeryId}/status" | ".../execute";
  method: "PATCH" | "POST"; available: boolean; unavailableReason?: "not_available" }
```

Execution is excluded. A later client must call the existing route unchanged: `Suspendida` and `Cancelada` use `validateSurgeryStatusPatchBody` → `updateSurgeryStatus`/`updateSurgeryCxStatus` → `validateCxStatusTransition`, existing mutation roles, transaction and `surgery.cx_status_changed` audit. `Realizada` uses only `/execute` → `executeScheduledSurgery`, retaining its `scheduled` prerequisite, delivered-Remito prerequisite, atomic performed date, and `surgery.executed` audit. The inbox must not create a parallel service, role rule, validator, audit, or effect.

### State-separation rule

`scheduled` is surgery scheduling and **must never be used as a mapping for `En tránsito`**. `En tránsito` is exclusively `Remito.state = En_transito`. The surgery remains `cxStatus = scheduled` while material is in transit. `prepStatus` is a third independent Surgery field. The UI must render all three dimensions separately: Estado de cirugía, Preparación, and Estado logístico.

`Remito entregado` confirms logistics delivery only. It does not set `Realizada`. `Realizada` is an explicit request that must execute the existing `scheduled → performed` transition; a delivered Remito is a mandatory Logistics precondition, in addition to the mother-rule permissions and validations. `Suspendida` and `Cancelada` remain explicit `updateSurgeryCxStatus` actions. The projection must preserve these independently and must not automate a transition from any logistics event.

Current backend `cxStatus` does not contain `En tránsito`; the legacy frontend helper `src/lib/automations.ts` is not backend authority. No schema/enum/state addition is permitted.

## Partial, Failure, and Legacy Semantics

- Missing legacy trace/lineage or incomplete source facts publish `availability: "partial"` and an exception/blocker; never a successful zero.
- A source unavailable for one surgery leaves that item visible as partial; it does not remove it from counts where the counted fact is known.
- Invalid filters return validation errors; unauthenticated/unauthorized and cross-company data remain undisclosed; unavailable projection returns a normal retryable error and never falls back to E1 fanout.
- `overdue` requires an approved logistics deadline/basis. Until that rule exists it is `null`/unavailable, the count is unavailable, and the filter is rejected rather than guessed.

## Boundaries and Validation

No UI, map, billing, mutation, scanner, E1 modification, schema/migration, or one-E1-per-surgery fanout. Test source mapping, tenant isolation, deterministic ordering/cursor stability, counts, partial legacy data, unavailable overdue rule, no writes, and descriptor parity with existing Surgery routes/services.

## Later Split

1. Inbox read service, validator, route, and unit/route tests.
2. `/logistica` read-only Inicio/Novedades/Bandeja UI consuming only this contract.
3. A separate approved package for UI presentation of the three state dimensions and existing Surgery transition descriptors; no new transition rule.
