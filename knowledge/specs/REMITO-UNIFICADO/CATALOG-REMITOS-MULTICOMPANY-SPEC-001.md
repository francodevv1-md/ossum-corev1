# Product Catalog and Dynamic Remito Search — Implementation Specification

**Task ID:** `CATALOG-REMITOS-MULTICOMPANY-SPEC-001`
**Status:** implementation-ready specification; documentation only
**Language:** English technical artifact
**Authority:** the approved policy in the task request. This document does not authorize execution of its migration by itself.

## 1. Decisions and boundaries

### Approved decisions

- A Product belongs to exactly one Company.
- `sku` is required and unique within that Company, including archived Products.
- Supported traceability modes are `none`, `lot`, `serial`, and `lot_and_serial`.
- Product management is permitted to `admin`, `coordinador`, and `logistica`.
- Remito-capable read roles may search and select active Products.
- Archival preserves history and prevents new selection; it is not deletion.
- A Remito line may remain manual and have no SKU or Product.
- This phase excludes stock, availability, prices, purchase orders, invoice imports, persistent lot/serial inventory, and every import semantic.

### Explicit non-goals

No stock reservation or decrement; product availability; price/cost/tax fields; Product-to-Presupuesto import; product bulk import/export; Box integration; persistent lots/serials; serial uniqueness across lines; automatic trace value generation; or changes to Remito lifecycle, emission, returns, consumption, invoice, authentication, or company-selection behavior.

## 2. Exact Prisma proposal

The following is the target delta to `prisma/schema.prisma`. It deliberately uses `String` plus centralized validation rather than a Prisma enum, consistent with the current Remito catalog convention.

```prisma
model Company {
  // existing relations
  products Product[]
}

model Product {
  id               String   @id @default(cuid())
  companyId        String
  sku              String
  name             String
  description      String?
  unit             String?
  traceabilityMode String   @default("none") // none | lot | serial | lot_and_serial
  archivedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  company     Company      @relation(fields: [companyId], references: [id], onDelete: Restrict)
  remitoItems RemitoItem[]

  @@unique([companyId, sku])
  @@index([companyId, archivedAt, sku])
  @@index([companyId, archivedAt, name])
}

model RemitoItem {
  // existing fields
  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([productId])
  // preserve all current indexes
}
```

### Schema invariants

1. `Product.sku` is stored as a trimmed, uppercase canonical SKU. The API returns that stored value. Therefore the database compound unique constraint implements case-insensitive business uniqueness without a PostgreSQL extension or a second normalized column.
2. `Product.name` is required; `description` and `unit` are optional catalog defaults, not pricing or inventory fields.
3. `productId` is nullable. `RemitoItem.itemId` remains unchanged, nullable, opaque, and is **not** repurposed as a Product FK.
4. The Product relation uses `onDelete: Restrict`. The application exposes archive/unarchive, never Product hard-delete; the FK is a final database safety net for historical links.
5. `Product.companyId` and `Remito.companyId` must match for every linked `RemitoItem`. This cross-table tenancy invariant cannot be represented by this FK alone and is enforced in the Remito service transaction.
6. Existing line snapshots (`sku`, `description`, `unit`, `lotNumber`, `serialNumber`, `expirationDate`, and `metadata`) remain the printable/historical record. A Product rename, unit change, archive, or later trace-mode edit never rewrites them.

### Migration safety

- Create `Product`, add `Company.products`, add nullable `RemitoItem.productId`, its FK, and its index in one reviewed migration.
- Adding nullable `productId` requires no backfill and must not modify `itemId`, snapshots, rows, states, timestamps, or audit history of existing Remitos.
- Generate the migration only after Franco's schema/migration approval is reconfirmed in the APPLY task. Inspect generated SQL before applying; no `db push`, reset, destructive DDL, or production apply.
- The deploy order is migration → generated Prisma client → server services/routes → client. A release must not send `productId` before the server generated from the migrated schema is deployed.
- Rollback is code rollback first. Do not drop `Product` or `RemitoItem.productId` after data exists without a separately approved archival/export and destructive-migration plan.

## 3. Server contracts

### Authorization and company isolation

Define and centralize these catalog constants (the exact module location is an implementation choice):

```ts
PRODUCT_MANAGEMENT_ROLES = ["admin", "coordinador", "logistica"] as const
PRODUCT_READ_ROLES = REMITO_READ_ROLES
```

- All routes obtain `getApiAuthContext(request, companyId)` before parsing a body or querying Products.
- Search/read uses `requireCompanyReadAccess(ctx)` and must additionally ensure the role is in `PRODUCT_READ_ROLES` if the generic read guard is broader.
- Create, edit, archive, and unarchive use `requireCompanyMutationAccess(ctx, PRODUCT_MANAGEMENT_ROLES)`.
- Every Product query has `where: { companyId: ctx.companyId, ... }`. A foreign Product ID returns the same `404 product_not_found` as an absent ID; never disclose cross-company existence.
- The Remito create/update service—not the browser—resolves every submitted `productId` with its active Product and the Remito company inside its transaction.

### Product validation

- Accepted create/update fields: `sku`, `name`, `description?`, `unit?`, `traceabilityMode`.
- Reject unknown write keys. Trim strings; blank optional values normalize to `null`/`undefined`; blank SKU/name is invalid.
- Limits: SKU 1–64 characters after normalization; name 1–160; description 1–1,000 when supplied; unit 1–40; traceability mode exactly one approved value.
- A duplicate canonical SKU in the same Company returns `409 product_sku_conflict`. The service must also map Prisma unique violation `P2002` to that code, so concurrent creates are safe.
- Archive/unarchive is idempotent in effect but audit only when the persisted state changes. Archive changes only `archivedAt`; it does not touch linked RemitoItems.

### Remito line validation and snapshot mapping

Extend the existing item body with optional `productId: string` and preserve every legacy field.

For each line with `productId`, the server obtains the Company-scoped Product and overwrites client-provided catalog snapshot fields:

| Product field | RemitoItem persisted field |
| --- | --- |
| `id` | `productId` |
| canonical `sku` | `sku` |
| `name` | `description` |
| `unit` | `unit` |
| `traceabilityMode` | validation input only; do not persist it as a new inventory model |

`itemId`, `boxId`, `presupuestoItemId`, quantities, explicit lot/serial/expiration fields, and non-catalog metadata retain their existing behavior. The server ignores a client attempt to use catalog data to overwrite the Product snapshot mapping.

For a manual line (`productId` absent/null), retain current validation: `description` and positive quantity are required; SKU remains optional; no Product lookup occurs.

Trace rules for a Product-backed line:

| Mode | Required at save/create/update |
| --- | --- |
| `none` | no trace field |
| `lot` | non-empty `lotNumber` |
| `serial` | non-empty `serialNumber` |
| `lot_and_serial` | both non-empty `lotNumber` and `serialNumber` |

Expiration remains optional for all four modes. These are line-entry validations only; this phase does not model lot/serial entities, validate inventory existence, or enforce serial-to-quantity cardinality.

Archived Product rule:

- Search never returns archived Products.
- Create rejects an archived Product ID as `409 product_archived_not_selectable`.
- Draft update permits a line that already persisted with the same archived `productId`, preserving history; it rejects a newly introduced or changed archived Product ID. The service determines this by loading the current draft items before replacement.
- Emitted/non-draft Remito rules remain unchanged.

### Audit

Reuse `createAuditEvent` inside the same write transaction. Required events:

| Action | entityType | module | Payload rule |
| --- | --- | --- | --- |
| Product create | `Product` | `catalog` | safe new Product snapshot |
| Product update | `Product` | `catalog` | old/new editable fields |
| Product archive/unarchive | `Product` | `catalog` | old/new archive state |
| Remito create/update with Product-backed line changes | existing `Remito` | existing `remitos` | include only changed line IDs/product IDs and snapshot fields; do not duplicate arbitrary metadata |

Do not audit search/read requests. Do not record sensitive unrelated request bodies.

## 4. Product search API

### Endpoint

`GET /api/companies/[companyId]/products/search?q=&cursor=&limit=`

This endpoint returns only active Products and is for Remito selection. A separate catalog-management list endpoint may include archived records only when explicitly requested and authorized.

### Request

| Parameter | Rule |
| --- | --- |
| `q` | optional; trim and collapse internal whitespace; 0–80 characters; at most five whitespace-separated terms |
| `limit` | optional integer; default `20`, minimum `1`, maximum `50` |
| `cursor` | optional opaque base64url cursor returned by this endpoint only |

Search is case-insensitive substring matching over `sku`, `name`, and non-null `description`. Multiple terms are ANDed; each term can match any one of those fields. Results have the stable order `sku ASC, id ASC`.

The cursor encodes version, normalized query, last SKU, and last ID. The service rejects a malformed, unknown-version, or query-mismatched cursor rather than applying it to another search.

### Success response

The normal API envelope stays `{ data: ... }`:

```json
{
  "data": {
    "items": [
      {
        "id": "cl...",
        "sku": "IMP-RTR-001",
        "name": "Femoral implant",
        "description": "Optional catalog description",
        "unit": "unidad",
        "traceabilityMode": "lot_and_serial"
      }
    ],
    "nextCursor": "opaque-string-or-null"
  }
}
```

No company ID, archived timestamp, stock, price, cost, supplier, historical Remito count, or user/audit data is returned.

### Error semantics

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_product_search_query` | invalid `q`, excess terms, or invalid `limit` |
| 400 | `invalid_product_search_cursor` | malformed, unsupported, or query-mismatched cursor |
| 401/403 | existing auth/access code | no authenticated/read-capable access; authorization occurs before search work |
| 500 | existing internal envelope | unexpected failure; no database detail is exposed |

An empty successful result is `200` with `items: []` and `nextCursor: null`, not `404`.

### Catalog management surface

The implementation must also expose company-scoped Product create/read/update/archive/unarchive server operations using the authorization and validation above. Their exact UX placement is intentionally not designed by this specification; a production management screen requires a small, separately approved UX task. DEV seed data is sufficient to make the approved Remito search usable during this phase.

## 5. Workspace search and line UX

Replace only the current disabled `Buscar producto · Próximamente` control in the operational Remito workspace.

1. The enabled control opens a modal dialog titled `Buscar producto`; focus starts in the query input.
2. Typing debounces search by 250–300 ms. Cancel the prior client request when possible; discard stale responses by request generation. Search starts at two characters, while an empty state explains how to search. No mock catalog or browser-local source is used.
3. Results show SKU, name, optional unit, and a concise traceability badge. They are keyboard selectable with visible focus and an accessible result count/status.
4. Selecting a Product closes the modal and fills the target line with `productId`, SKU, name/description, and default unit. It never changes opaque legacy `itemId`, `boxId`, `presupuestoItemId`, quantity, or existing trace values.
5. When the chosen mode requires trace data, keep focus in the line and show an inline, mode-specific requirement: lot, serial, or both. Client validation mirrors the server rule and prevents a misleading save attempt; the server remains authoritative.
6. A selected Product is visibly labeled as catalog-backed. `Cambiar producto` reopens the dialog for that line; `Desvincular producto` clears only `productId` and leaves the current snapshots editable as a manual line. Removing a line keeps existing behavior.
7. A search error is retryable inline in the dialog. Empty results state that no active Product matched. A `409 product_archived_not_selectable` on save keeps local form values and asks the operator to choose an active Product or unlink the line.
8. The modal is unavailable in locked/non-draft documents, exactly as other editing controls are. It does not add import, availability, stock, price, or automatic line merge behavior.

## 6. Compatibility, DEV seed, and test plan

### Compatibility

- Existing Remito API consumers remain valid because `productId` is optional and all old snapshot fields remain accepted for manual lines.
- Existing historical Remito rows remain readable without a Product relation.
- The legacy mock catalog remains outside the Remito execution path and must not be treated as migration input or authoritative data.
- Existing `itemId` is neither migrated nor inferred as `productId` because it is opaque and may refer to stock, Presupuesto, catalog mock, or another legacy source.

### DEV seed

- Add only deterministic, Company-scoped example Products for the existing approved DEV Company.
- Use idempotent lookup by `(companyId, sku)`; do not create duplicate Products on re-seed.
- Include at least one active example for each traceability mode and one archived example proving search exclusion/history behavior.
- Seed no stock quantities, lots, serials, prices, suppliers, purchase orders, invoice imports, or Product links on existing Remito history.

### Automated tests

1. Schema/client generation and migration verification in a disposable approved DEV database.
2. Product validator/service tests: canonical SKU, same-company duplicate rejection including archived row, cross-company independence, trace mode validation, archive/unarchive, and audited mutations.
3. Search route tests: auth before query parsing, company isolation, active-only filtering, SKU/name/description matching, limit bounds, cursor stability, malformed/mismatched cursors, and empty result.
4. Remito service/route tests: manual line compatibility; active Product snapshot overwrite; no mutation of `itemId`; cross-company/missing/archived Product denial; legacy persisted archived Product retained on draft update; trace mode requirements; no change to emitted lock/concurrency behavior; audit transaction coverage.
5. Workspace component/API-client tests: debounce/stale-response protection, keyboard dialog flow, selection mapping, unlinking, required trace errors, save conflict/error retention, and no mock search fallback.
6. Browser QA in approved DEV: search by SKU/name, keyboard selection, each trace mode, manual no-SKU line, archive then blocked new selection, an existing historical linked line, narrow viewport, and normal draft save/emit regression.

## 7. Assumptions requiring confirmation or explicit retention

1. **SKU canonicalization:** this spec proposes trimmed uppercase storage. If SKU casing is business-significant, stop before migration because PostgreSQL's default compound unique constraint is case-sensitive.
2. **Trace cardinality:** the approved policy defines modes but not serial-per-unit cardinality. This V1 requires non-empty fields per line only; enforcing one serial per quantity or unique serials requires persistent serial semantics and is excluded.
3. **Audit model reuse:** this spec assumes the current `AuditEvent` model and `createAuditEvent` helper are suitable for Product events and have a valid actor. If a system/no-actor catalog write is required, stop rather than making `AuditEvent.userId` nullable.
4. **Catalog management UX:** server management is in scope; no production screen placement is prescribed. Do not silently add a settings/navigation surface without a scoped UX decision.
5. **Search scale:** the proposed B-tree indexes are appropriate for the initial minimal catalog. If production catalog size or response measurements require PostgreSQL trigram/full-text indexes, stop for a performance/migration decision; do not add extensions opportunistically.
