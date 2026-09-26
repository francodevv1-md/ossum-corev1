# C14 candidate — schema baseline provenance and dependency boundary

Status: evidence and proposal only. This document does not authorize schema,
migration, database, C13, or deployment work.

## Candidate layers

| Layer | Source | Delta | Status |
|---|---|---:|---|
| Baseline | `HEAD` `06e696e` | — | Legacy Cajas topology; no generic operational-command closure. |
| Preserved index | `prisma/schema.prisma` staged before this candidate | +2315 / -1016 | Broad, mixed schema recovery candidate. It is not a C14-only diff. |
| Worktree overlay | unstaged `prisma/schema.prisma` | +38 / -26 | Restores ContactAddress and Article supplier/identifier tenant relations over the preserved index. |
| WCB-06 runtime | seven C14 source/test/runbook files | no schema declaration | Requires the generic schema closure below; it cannot safely use the `HEAD` legacy topology. |

The candidate index reviewed on 2026-09-21 contained the preserved index plus
the worktree overlay. It did not mutate the repository index.

## Baseline-to-candidate provenance

The +2315/-1016 preserved-index delta contains at least these independent
packages, so it is not reviewable as a C14 commit:

1. Remito scan/public verification models and rate metrics.
2. Generic stock/evidence/reservation/projection/operational-command topology,
   replacing the legacy `CajasCommand*` and reference-record topology.
3. Cajas assignment, preparation, control, dispatch, reconciliation,
   maintenance, and unit-log relation rewrites.
4. Article taxonomy, Xadmin import/mapping, identifiers, suppliers, and
   traceability policy models.
5. Goods receipt, scan-event, and surgery-preparation persistence.
6. Phase-D operational models and durable attempt audit.

The 38/26 overlay is mandatory tenant preservation, not a C14 feature:

- `ContactAddress.companyId` plus `ContactCompanyLink` composite ownership;
- company-scoped main-address uniqueness;
- company-qualified `ArticleIdentifier` and `ArticleSupplierMapping` relations
  and active uniqueness.

## WCB-06 schema dependency closure

`src/lib/services/c14/bundles/wcb-06.ts` executes these Prisma operations:

| Runtime operation | Required model / constraint |
|---|---|
| Membership recheck and row lock | `UserCompanyAccess(userId, companyId)` |
| Anchor locks | `StockIdentifiedUnit`, `StockPosition`, `StockReservation`, `cajas_assignment`, `Remito`, each company-qualified |
| Acceptance/replay | `OperationalCommandAcceptance` and company/semantic uniqueness |
| Audit write | `AuditEvent` |
| Evidence writes and final-state read | `StockEvidence`, `StockEvidenceLine` |
| Per-reservation writes and final-state read | `StockReservationEvidence` |
| Dispatch writes and final-state read | `CajasDispatch`, `CajasDispatchLine` |
| Effects write and final-state read | `OperationalCommandEffect` |

This closure uses inverse Prisma relations and compound tenant FKs across the
generic stock/Cajas topology. Extracting only these declarations from `HEAD`
previously produced missing inverse relations; therefore a C14-only schema
slice is not separable from a coherent schema-baseline package.

## Literal GGA candidate report — 2026-09-21 (final retry)

Command: `gga run` with a temporary index rebuilt from `HEAD` and exactly the
eight candidate files below. The repository index was not changed.

```text
STATUS: FAILED
- [critical] prisma/schema.prisma:18 — §9.5/§11 approval boundary — Critical schema/database architecture is rewritten without a supplied GGA-verified Task Brief and Franco approval for this exact scope.
- [critical] prisma/schema.prisma:GoodsReceiptLine.article — multiempresa isolation — `GoodsReceiptLine`, `ScanEvent`, and `SurgeryPreparationLine` reference `Article.id` without organization/company lineage, permitting cross-tenant article associations.
- [high] prisma/schema.prisma:StockReservationEvidence — schema/runtime consistency — `@@unique([companyId, commandAcceptanceId])` allows one reservation evidence per command, while WCB-06 supports writing multiple distinct reservation evidences under that acceptance.
- [high] prisma/schema.prisma:18 — database/schema parity — Extensive destructive/additive schema changes have no staged forward migration; `prisma migrate deploy` cannot create the schema required by the staged runtime.
```

The prior authorization-proof and runbook-cleanup findings are resolved in the
worktree. Validation now retains the exact immutable proof identity instead of
exporting a function that could approve an arbitrary copy, and the runbook has
one outer cleanup `finally`. Focused unit coverage proves a structured-cloned
proof is denied.

## File, operation, and test association

| File | Candidate role | Operation / evidence |
|---|---|---|
| `src/lib/permissions/c14/authorize-insert-writer.ts` | authorization | roles, active membership, same-row lock, opaque proof identity |
| `src/lib/services/c14/bundles/private-writer-runtime.ts` | private types | command and controlled error contract |
| `src/lib/validators/c14/bundles/wcb-06.ts` | trust boundary | payload closure, fixed-scale quantity arithmetic, frozen command |
| `src/lib/services/c14/bundles/wcb-06.ts` | writer | tenant locks, replay/final-state Decimal comparison, C14 DML |
| `src/__tests__/unit/c14-wcb-06.test.ts` | unit proof | 15 passing tests: malformed input/no writes, multi-reservation rejection, proof identity, membership lock order, Decimal final state |
| `src/__tests__/integration/c14-wcb-06-revocation-locking-postgres.test.ts` | opt-in integration | 3 guard tests pass; PostgreSQL lock/Decimal tests are skipped without the isolated DEV approval flag |
| `knowledge/runbooks/C14_WCB06_REVOCATION_LOCKING_DEV.md` | guarded procedure | explicit isolated-DEV constraints; cleanup is now in `finally` |
| `prisma/schema.prisma` | prerequisite only | broad baseline candidate, not eligible for a C14-only commit |

## Required prior schema package (proposal)

Create and approve a separate T3 package before C14 can include schema:
`STOCK-CAJAS-SCHEMA-BASELINE-RECOVERY-001`.

Its minimum accepted scope is:

1. Reconcile the complete generic stock/Cajas schema closure with its exact
   migration lineage; do not mix C13 history repair into the package.
2. Preserve the current tenant overlay for ContactAddress, ArticleIdentifier,
   and ArticleSupplierMapping.
3. Repair the three receipt/preparation article relations with enforced
   company/organization lineage (prefer the existing company-scoped article
   eligibility relation where it expresses the real owner).
4. Change `StockReservationEvidence` uniqueness to
   `[companyId, commandAcceptanceId, reservationId]`, mapped to
   `uq_sre_command_reservation`, and supply a reviewed forward migration.
5. Validate Prisma format/generate/typecheck and GGA as that package, then
   establish its commit as C14's schema baseline.

No part of this proposal is applied by the current C14 candidate.
