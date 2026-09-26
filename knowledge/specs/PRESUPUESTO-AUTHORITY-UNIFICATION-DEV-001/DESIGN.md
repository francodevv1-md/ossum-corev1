# Design: Presupuesto Authority Unification DEV

## Technical Approach

Keep the existing company-scoped routes, Zod boundary validation, injected Prisma service, `apiFetch`, and `AuditEvent`. Add one family table plus explicit version slots and optimistic revision; do not add dependencies or a second authority. All mutation commands run server-side, calculate money with `Prisma.Decimal`, write audit in the same transaction, and return one canonical DTO consumed by Sales, New Surgery, Expediente, PDF, and email.

## Architecture Decisions

| Decision | Choice and rationale |
|---|---|
| Family identity | Add `PresupuestoFamily(id, companyId, surgeryId?, createdAt, updatedAt)` with tenant FKs and a unique non-null `(companyId, surgeryId)` index. A standalone quotation gets its own family. This is smaller and safer than inferring families from recursive parents. |
| Version slots | Add `familyId`, `sourcePresupuestoId?`, `versionNumber`, `slot` (`DRAFT`, `CURRENT`, `HISTORY`), and `revision @default(1)` to `Presupuesto`. Unique `(familyId, versionNumber)` plus partial unique indexes for one `DRAFT` and one `CURRENT` make races fail in PostgreSQL. Check constraints bind `Borrador` to `DRAFT`, `Reemplazado` to `HISTORY`, and emitted terminal states to `CURRENT` or `HISTORY`. |
| Commercial persistence | Retain current totals and add `branchId?`, `clientContactId?`, `payerContactId?`, `documentDate`, `paymentTerms`, `priceListCode`, `legend`, `notes`, `generalDiscountRate`, and a validated `commercialSnapshot` JSON for company/branch/client/payer/responsible and firm-price details. Items retain `discount`/`tax` as amounts and add `position`, `discountRate`, and `taxRate`. Explicit query fields stay relational; bounded display snapshots remain immutable data. |
| Concurrency | Use `Serializable` transactions with the existing bounded `P2034` retry. Lock the family row; require `expectedRevision`; conditional update failure or unique/check violation maps to deterministic `409`. Database constraints, not pre-reads, are final authority. |
| Cutover | Add one typed API adapter/hook and switch visible surfaces directly; no dual write, local fallback, cache persistence, or new state library. |

## Data and Command Flow

```text
UI -> src/lib/api/presupuestos.ts -> company route -> validator
   -> presupuesto.service transaction -> Family/Version/Items + AuditEvent
   <- canonical DTO (decimal strings, revision, slot, history/actions)
```

Commands in `presupuesto.service.ts` are: `createFamilyDraft`, `replaceDraft`, `deleteDraft`, `createRevisionDraft`, `emitDraft`, `approve`, `reject`, `expire`, and `annul`. There is no generic state mutation. Revision creation copies the current immutable snapshot into one `DRAFT` without changing the source. Emission allocates visible number if absent, moves the old `CURRENT` to `Reemplazado/HISTORY`, and moves the draft to `Emitido/CURRENT` atomically. Draft replacement deletes/recreates only its items and increments `revision`.

Totals are recalculated as gross line amount, line discount, apportioned general discount, item VAT, then header subtotal/discount/tax/total; client totals are ignored.

## API Contracts

- `GET /presupuestos?surgeryId=...` and `GET /presupuestos/:id`: canonical family/version projections ordered current, draft, then history.
- `POST /presupuestos`: commercial draft payload; returns `201` DTO.
- `PATCH|DELETE /presupuestos/:id`: draft payload or `{ expectedRevision }`.
- `POST /:id/versions`: `{ expectedRevision }`; `POST /:id/emitir`: `{ expectedRevision }`.
- `PATCH /:id/state`: `{ command: "approve"|"reject"|"expire"|"annul", expectedRevision }`.
- Stale/family-slot races return `409 { error: { code: "presupuesto_conflict", message } }`; validation is `400`, cross-company lookup is `404`. Email re-reads the record and permits only `Emitido`/`Aprobado`.

## Audit Snapshots

Each accepted mutation writes one `AuditEvent` inside its transaction with actor/company, family/version/source/replacement IDs, command, prior/new state and revision, and complete bounded before/after header plus ordered item snapshots (decimal strings). Exclude secrets, arbitrary email body, and provider credentials; email keeps its existing delivery audit.

## Frontend Integration

`usePresupuestos` owns load/mutate/refetch and exposes server-derived valid actions. Sales and `PresupuestoFormDialog` map form fields to the adapter and stop calling store actions. `ExpedienteFullView` loads by the persisted Surgery ID and uses that result for header, Ficha, and Comercial/`PresupuestoPanel`; its legacy prop may remain compatibility-only during this scoped cutover but is ignored.

New Surgery remains a sequential compensation flow: create Surgery, then create the Presupuesto with `persistedSurgery.id` (never visible/local ID). If quotation creation fails, keep the valid Surgery, show “created without presupuesto,” retain the draft payload in component memory, and offer retry/open Expediente; never delete or roll back the Surgery.

## File Changes

Modify only the Change Pack allowlist: schema plus one migration; Presupuesto service/validator/routes/email permission; new API adapter and hook; Sales/form components; scoped New Surgery/Expediente seams; minimum legacy store/type removal; focused tests. Preserve the accepted dirty baseline.

## Testing and Migration

Migration preflight inventories duplicate Surgery families/drafts, lineage/version conflicts, and missing deterministic commercial data. SQL creates/backfills family/slot/revision data, then constraints/indexes; stop rather than repair destructively. Apply only after re-proving disposable DEV identity.

Unit tests cover decimal calculations, validators, transitions, snapshots, and adapter mapping. DB integration tests cover tenant isolation, immutable history, stale revisions, concurrent create/revise/emit (one winner), audit atomicity, and migration constraints. Component tests cover loading/errors/actions and New Surgery compensation/retry. E2E proves Sales -> Surgery -> Expediente continuity, refresh persistence, PDF/email eligibility, and absence of visible Zustand/localStorage writes.

## Open Questions

None. DEV identity or non-deterministic legacy violations are apply-time stop conditions, not design gaps.
