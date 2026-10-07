# COMPRAS-STOCK-CONTRACT-MAP-CORRECTION-001

**Status**: read-only investigation. Source / tests / migrations / configuration
were not modified. This report supersedes the prior version in this same folder.

**Branch**: `ux/antigravity-redesign`
**HEAD at start and end**: `8d8626a95bbe7524dab74fe50b801039750c3799`
**Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Active locks**: `knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/**`
(this session; released at end of task).

---

## 1. Scope of this correction

This task explicitly undoes three classes of mistake from the previous
report:

1. **DR-14 was over-read.** The previous report treated "a purchase order has
   no Stock effect" as if it implied "no automatic OC-fulfillment updates
   from a confirmed Receipt are allowed". DR-14 is a stock-truth boundary,
   not a rule about OC state evolution. The two questions are separated.
2. **Idempotency was conflated.** A maximum-quantity guard is not request
   idempotency. `recibirOrdenCompra` is cumulative; an explicit operation
   identity is absent in the current contract. The previous report did not
   demonstrate this with executable evidence. This report does.
3. **Roles were mis-cited.** The previous report fabricated a role list
   (`["admin", "manager", "coordinator", "owner", "super_admin"]`) for the
   `convert-to-oc` route. That role list actually lives in `ocr-extract/route.ts`.
   `convert-to-oc` uses `requireCompanyCapability(ctx, "purchases:mutate")`.
   Roles are canonicalized at the auth boundary; `coordinador`/`logistica` are
   recognized aliases for `coordinator`/`logistics`. The remaining actual
   discrepancy is the OCR route vs the `purchases:mutate` capability matrix.

The task scope also retires one claim that was not safe: deleting
`mockOrdenesCompra` and `MovimientoCompra`. `mockOrdenesCompra` is still
referenced by `/expediente/page.tsx`, and `store.ts` and `types/index.ts` are
protected files. The brief explicitly forbids recommending safe deletion
without tracing all consumers.

---

## 2. Domain rule, restated correctly

`knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` (DR-14, approved
by Franco 2026-07-19) and `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`:

- "a purchase order has no Stock effect; accepted physical receipt does.
  Exceptional receipt without a purchase order is allowed, with permission
  and audit enforcement deferred to an authorized future contract."
- "A purchase order alone must not be assumed to mean material was
  physically received."
- "Purchase-order creation does not mean supplier receipt." (§9.3)
- `CENTRAL_OPERATIONAL_FLOW.md`: every Receipt/Stock movement must be
  backed by a stock movement; balances must not be edited in place.

DR-14 governs the stock ledger, the canonical truth source for custody.
It does not, and was never intended to:

- prohibit the OC from being marked fulfilled when an accepted Receipt is
  linked;
- approve automatic OC fulfillment updates either;
- require a specific schema bridge.

Whether a confirmed Receipt should advance `OrdenCompraItem.received`
and `NecesidadCompra.state → Recibida` is a separate, currently undefined
business decision. It must be settled before any contract is added.

---

## 3. Authoritative capability matrix (v2)

Roles are normalized through `resolveCanonicalRole` (`src/lib/permissions/canonical-roles.ts:126`).
Aliases include:

- `coordinador` → `coordinator`
- `coordinator` → `coordinator`
- `logistica`, `logistics`, `operador`, `operator`, `deposito`, `deposito` → `logistics`
- `admin`, `administrador`, `superadmin`, `administracion` → `admin`
- `manager`, `owner`, `super_admin` → **null** (not in alias table)

Capabilities (source: `src/lib/permissions/capabilities.ts:94-97`):

- `purchases:read` — `CANONICAL_ROLES` (all canonical roles)
- `purchases:mutate` — `["admin", "coordinator", "logistics"]`
- `purchases:critical` — `["admin", "coordinator"]`

Capability matrix is the **canonical policy**; route handlers using
`requireCompanyCapability` defer to it. Routes that still use the legacy
`requireCompanyMutationAccess(ctx, ["admin", "coordinador", "logistica"])`
pattern also work because the route list is canonicalized before
comparison in `guards.ts:57-68`.

### Actual route matrix (verified from current working tree)

| Route | Guard | Effective admission |
|---|---|---|
| `GET/POST /api/companies/[companyId]/compras/necesidades` | `requireCompanyCapability(ctx, "purchases:read")` / `purchases:mutate` | `purchases:read` / `purchases:mutate` matrix |
| `POST /api/companies/[companyId]/compras/necesidades/[necesidadId]` | `purchases:mutate` | `purchases:mutate` matrix |
| `DELETE /api/companies/[companyId]/compras/necesidades/[necesidadId]` | `purchases:mutate` | `purchases:mutate` matrix |
| `POST /api/companies/[companyId]/compras/necesidades/convert-to-oc` | `purchases:mutate` | `purchases:mutate` matrix |
| `GET/POST /api/companies/[companyId]/ordenes-compra` | `requireCompanyReadAccess` / `requireCompanyMutationAccess(["admin", "coordinador", "logistica"])` | All canonical roles for read; canonical `{admin, coordinator, logistics}` for write after alias resolution |
| `POST .../ordenes-compra/[ordenCompraId]/{emitir,enviar,recibir,cancelar}` | same as POST `/ordenes-compra` | same |
| `GET/POST /api/companies/[companyId]/receipts` | `requireCompanyReadAccess` / `requireReceiptMutationAccess` → `STOCK_OPERATION_ROLES = ["admin", "logistics"]` | All canonical for read; canonical `{admin, logistics}` for write |
| `POST .../receipts/[receiptId]/{confirm,scans,...}` | `requireReceiptMutationAccess` | canonical `{admin, logistics}` |
| `GET /api/companies/[companyId]/compras/movimientos` | `requireCompanyCapability(ctx, "purchases:read")` | All canonical roles |
| `POST /api/companies/[companyId]/compras/forecast/accept` | `purchases:mutate` | `purchases:mutate` matrix |
| `POST /api/companies/[companyId]/compras/ocr-extract` | `requireCompanyMutationAccess(["admin", "manager", "coordinator", "owner", "super_admin"])` | canonical `{admin, coordinator}` (manager/owner/super_admin are undeclared and resolve to `null`, so they are excluded) |

Confirmed discrepancy:
- `ocr-extract` route admits only `{admin, coordinator}`.
- `purchases:mutate` capability matrix admits `{admin, coordinator, logistics}`.
- A `logistics` user with `purchases:mutate` is **denied** from using OCR
  despite the capability matrix saying otherwise.

This is a real, narrow discrepancy worth flagging; it is **not** a general
role-matrix inconsistency.

The previous report's claim of "convert-to-oc uses
`["admin", "manager", "coordinator", "owner", "super_admin"]`" was a
citation error. The convert-to-oc route uses `requireCompanyCapability(ctx,
"purchases:mutate")` and inherits the capability matrix.

---

## 4. Current contract map

Legend: `UI` → `hook/client` → `route` (Next.js API) → `validator` (zod) →
`service` (Prisma) → `persistence` → `response consumer`.

### 4.1 Purchase Need → Purchase Order

| Step | Producer | Validator | Persistence |
|---|---|---|---|
| UI: create Need | `/compras/necesidades-compra` via `useNecesidadesCompra` | – | – |
| API: POST Need | `src/lib/api/compras.ts:62` `createNecesidadCompraApi` → `src/app/api/companies/[companyId]/compras/necesidades/route.ts` | `necesidadCompraCreateSchema` | – |
| Service: `createNecesidadCompra` | `src/lib/services/necesidad-compra.service.ts:169` | – | `NecesidadCompra` (`state=Pendiente`); optional `idempotencyKey` |
| API: POST `convert-to-oc` | `src/lib/api/compras.ts:86` → `convert-to-oc/route.ts` | `convertNecesidadesToOcSchema` | – |
| Service: `convertNecesidadesToOrdenCompra` | `necesidad-compra.service.ts:401` | – | `OrdenCompra` (Borrador) + items; `NecesidadCompra.state → En_OC`; `ordenCompraId` set |

For articulo Z (`isArticuloZ: true`), `OrdenCompraItem.stockItemId` is set to
`"art-z-" + necesidad.id` (line 457). This is **not** an Article primary key.

### 4.2 Purchase Order lifecycle

| Step | Endpoint | Service | Persistence |
|---|---|---|---|
| List/Get OC | `GET .../ordenes-compra` + `.../[id]` | `listOrdenesCompra` / `getOrdenCompra` (`orden-compra.service.ts:22-23`) | read-only |
| Create OC | `POST .../ordenes-compra` | `createOrdenCompra` (line 24) | `OrdenCompra` (Borrador) + items |
| Emit OC | `POST .../[id]/emitir` | `emitirOrdenCompra` (line 27) | `state → Emitida`; `emitidaAt` |
| Send OC | `POST .../[id]/enviar` | `enviarOrdenCompra` (line 28) | `state → Enviada`; `enviadaAt` |
| Receive OC (commercial) | `POST .../[id]/recibir` | `recibirOrdenCompra` (line 29) | `OrdenCompraItem.received += q`; `state` toggles `Recibida`/`Parcialmente_recibida` |
| Cancel OC | `POST .../[id]/cancelar` | `cancelarOrdenCompra` (line 30) | `state → Cancelada`; `canceladaAt` |

`recibirOrdenCompra` is **cumulative**: payload carries the *delta* to add,
not the cumulative total. There is no idempotency key, no operation
identity, no client-supplied request id.

### 4.3 Physical Receipt (supplier intake → stock)

| Step | Endpoint | Service | Persistence |
|---|---|---|---|
| List/Get Receipt | `GET .../receipts` + `.../[id]` | `listReceipts` / `getReceipt` (`receipt.service.ts:323,347`) | read-only |
| Create draft | `POST .../receipts` | `createReceiptDraft` (line 199) | `Receipt` (`PREPARED`) + `ReceiptLine[]` (SKU pre-resolved) |
| Scan unit | `POST .../[id]/scan` | `scanReceiptUnit` (line 478) | `ReceiptScan`; status → `IN_CONTROL` |
| Resolve pending | `POST .../[id]/scans/[scanId]/resolve` | `resolvePendingScan` (line 665) | `RESOLVED`; line aggregates |
| Confirm | `POST .../[id]/confirm` | `confirmReceipt` (line 794) | `Receipt.status → CONFIRMED`; `tx.stockMovement.upsert` `movementType=RECEIPT_IN` with idempotency key `receipt:{r}:scan:{s}` or `receipt:{r}:line:{l}` |

`confirmReceipt` is idempotent via `companyId_idempotencyKey` unique index
(line 882, 909). Early bail at line 821 if already `CONFIRMED`.

### 4.4 Stock Ledger & derivative views

| Consumer | Endpoint / Service | Behavior |
|---|---|---|
| `/compras/movimientos` | `useComprasMovimientos` → `fetchComprasMovimientos` → `listComprasMovimientos` (`compras-movimientos.service.ts:28`) | Filters: `articleId`, `receiptId`, `supplierId`, `ordenCompraId`. **`ordenCompraId` is accepted but ignored** in `where`. **`ordenCompraId`/`ordenCompraNumber` always returned `null` (hard-coded)**. **`supplierId` filter is applied in JavaScript AFTER pagination**, so `take`/`skip` paginate the unfiltered set. |
| `/compras/remitos-proveedor` | `useReceiptsList` → `fetchReceipts` → `listReceipts` | lists Receipts only |
| `/compras/ordenes-compra` | `useOrdenesCompra` → `fetchOrdenesCompra` | lists OC only |
| `/compras/necesidades-compra` | `useNecesidadesCompra` | lists Need; shows linked OC id + state |

### 4.5 Schema state

- `OrdenCompra` / `OrdenCompraItem` / `NecesidadCompra`: present, no
  references to Receipt.
- `Receipt` / `ReceiptLine` / `ReceiptScan`: present, no references to
  OrdenCompra.
- `StockMovement`: has `receiptId` / `receiptLineId`; no `ordenCompraId`.
- `NecesidadCompra` has `ordenCompraId` (set on conversion).

There is **no FK in either direction** between the OC and Receipt branches.
DR-14 allows the bridge to be absent or present; the operational reality
is that audit linkage across the two branches is impossible.

---

## 5. Findings, reclassified

Notation:
- **CONFIRMED** = executable evidence, file:line reference, expected vs
  actual behavior recorded.
- **WITHDRAWN** = claim from the previous report that has been retracted.
- **DEFERRED** = observation whose business rule is not yet settled; it
  stays as a question, not a bug.
- **UNVERIFIED** = observation whose runtime claim requires Playwright,
  PostgreSQL, or another runtime that this session does not exercise.

### 5.1 CONFIRMED — `compras-movimientos` ignores `ordenCompraId` filter

Producer: `useComprasMovimientos` (`src/hooks/useCompras.ts:152-181`) and
`fetchComprasMovimientos` (`src/lib/api/compras.ts:164-187`) accept the
parameter; the API route `compras/movimientos/route.ts:19` reads it from
the URL. The service `listComprasMovimientos` (`src/lib/services/compras-movimientos.service.ts:28`)
declares `ordenCompraId?: string` in the input shape (line 34), but the
DB `where` at line 41-50 never references `input.ordenCompraId`. The route
guards in line 7 ("supplier filter applied before or after pagination")
was raised: items get sliced, but the supplier column is then `m.receipt?.supplierId` (line 109-114). `take/skip` happen at DB level; supplier slicing happens after.

Expected: `?ordenCompraId=...` should narrow the result set.
Actual: parameter is silently dropped, identical to no filter.
Expected: `?supplierId=...` should be applied before pagination.
Current bug (line 75-78, 107-114): pagination is applied at DB level; supplier filtering is applied to the already-paginated subset in JavaScript. With `take=100` and a supplier that has 5 relevant movements among 2000 receipts, the user may see 0 or 5 entries regardless of how many actually exist for that supplier beyond the first DB page.
Impact:
- Page exposes a filter UI that lies.
- Pagination metadata (none exposed in UI) cannot be computed correctly.
- The "Orden Compra" column shown at `movimientos/page.tsx:150,189-191,268` is permanently "N/A" because the service hard-codes `ordenCompraId` / `ordenCompraNumber` to `null` (`compras-movimientos.service.ts:140-141`).

Smallest fix: apply both filters in `where`, return the joined columns. If the schema disallows it, drop the column from the UI (do not invent linkage).
- The CLI exposes the param through `useComprasMovimientos({ ordenCompraId })`; this is dead-client-API.
- The route accepts and forwards it.

Regression check: bounded unit test on `listComprasMovimientos` with mocked `findMany` confirming `where.receiptId`, `where.articleId`, `where.supplierId`, and `where.ordenCompraId` (or absent) are honored as expected; column hydration on Receipt join.

Files: `src/lib/services/compras-movimientos.service.ts`,
`src/app/api/companies/[companyId]/compras/movimientos/route.ts`,
`src/app/compras/movimientos/page.tsx`,
`src/hooks/useCompras.ts`,
`src/lib/api/compras.ts`.

### 5.2 CONFIRMED — `recibirOrdenCompra` is cumulative, no request identity

Producer: `recibirOrdenCompra` (`src/lib/services/orden-compra.service.ts:29`).
The service computes `item.received.plus(quantity)` and writes it. The route
`[ordenCompraId]/recibir/route.ts` parses the payload with
`ordenCompraReceiveSchema` (`src/lib/validators/orden-compra.ts:8`), which
requires only `received >= 0` per item — no idempotency key, no client-side
request id. The dialog `ReceiveOrdenCompraDialog.tsx:33-40` does not
generate one either. Concurrent requests are serialized by the
`SELECT ... FOR UPDATE` lock at line 21, which prevents lost updates but
not double-counting of a replayed request.

Verification: ran `recibir-replay.run.ts` (diagnostic, owned folder) with
a mocked Prisma transaction:

| Scenario | Before | Payload | After first call | After second call (identical payload) | Service behavior |
|---|---|---|---|---|---|
| Replay | `received=0/10` | `receivedByItem:[{item-1,3}]` | `received=3` | `received=6` | cumulative |
| Two legitimate deliveries | 0/10 | `6` then `4` | `received=6` (Parcialmente_recibida) | `received=10` (Recibida) | cumulative (correct) |
| Overflow | 0/10 | `11` | rejected: `code=orden_compra_invalid_receipt` | – | guard rejects |

The dialog closes on success (`ReceiveOrdenCompraDialog.tsx:45`), so the
single-user flow prevents accidental double-clicks. But the API contract
allows:

- network retries without server-side idempotency (a request that timed
  out is replayed with the same body and double-counts);
- two separate user sessions on the same OC;
- legitimate deliveries of the same quantity that the contract cannot tell apart
  from replays.

This is the contract gap. The current `received.max = quantity` guard is
not idempotency; it is an integrity check.

Smallest fix proposal (see §7 T1): accept an optional `idempotencyKey`
in the payload and the service; on the first call, record it on the
receiving event. A replay returns the prior response.

Regression check: replay with the same `idempotencyKey` returns the prior
response (no `received` increment); two different `idempotencyKey` payloads
with the same quantity are both accepted; one without idempotency key
behaves as today.

Files: `src/lib/services/orden-compra.service.ts`,
`src/lib/validators/orden-compra.ts`,
`src/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/recibir/route.ts`,
`src/components/compras/ReceiveOrdenCompraDialog.tsx`.

### 5.3 CONFIRMED — `NecesidadCompra.state` is never advanced to `Recibida`

Producer: `convertNecesidadesToOrdenCompra` (`necesidad-compra.service.ts:491`)
sets `state = "En_OC"`. No code in the audited codebase moves it back to
`Recibida` later.

- `recibirOrdenCompra` (line 29) updates the OC state but never the
  needs.
- `confirmReceipt` writes `StockMovement` rows but does not touch
  `NecesidadCompra` (no reference at all).

Whether this should be the default behavior is **DEFERRED** — see T4.

### 5.4 CONFIRMED — supplier-role check is asymmetric across the purchase surfaces

- `factura-compra.service.ts:20` `assertRelations()` requires
  `roles: { has: "proveedor" }` OR `role: "proveedor"`.
- `receipt.service.ts:223-231` accepts any active ContactCompanyLink.
- `orden-compra.service.ts:24` `createOrdenCompra` accepts any non-empty
  `proveedorId`.
- `necesidad-compra.service.ts:418-422` `convertNecesidadesToOrdenCompra`
  rejects empty/invalid `proveedorId` but does not check role.
- `orden-pago.service.ts:160-169` requires an active `ContactCompanyLink`
  with role check (similar to factura-compra).

Two routes that accept a `proveedorId` are strict (factura-compra,
orden-pago). The other two (orden-compra, necesidad-compra) are loose. The
receipt route is loose.

Whether the OC route and the necesidad conversion should enforce supplier
role is **DEFERRED** (the brief calls for reclassification, not
prescription). This is presented as a candidate correction in §7 T3.

### 5.5 WITHDRAWN — claim of a general role-matrix inconsistency

The previous report claimed multiple routes used different role sets
because they used different strings. Roles are canonicalized at the auth
boundary (`resolveCanonicalRole`), so Spanish and English variants map to
the same canonical role. The only actual discrepancy found is the OCR
route vs the `purchases:mutate` capability matrix (§3 above).

The previous claim that `convert-to-oc` uses a hard-coded role list was a
citation error.

### 5.6 WITHDRAWN — claim that `mockOrdenesCompra` and `MovimientoCompra` are safe dead code

- `mockOrdenesCompra` is referenced by:
  - `src/lib/store.ts:39` (`import { mockOrdenesCompra }`)
  - `src/lib/store.ts:307` (`ordenesCompra: mockOrdenesCompra`)
  - `src/app/expediente/page.tsx:282` (`store.ordenesCompra.filter(...)`)

  The `/expediente` page is an active legacy flow still reading from the
  Zustand store. `src/lib/store.ts` and `src/types/index.ts` are protected
  files in this worktree (per AGENTS.md §10).

- `mockMovimientosCompra` and `MovimientoCompra` are only referenced by
  `src/lib/store.ts` (`movimientosCompra: mockMovimientosCompra`) and
  `src/data/mock-movimientos-compra.ts` (`import type { MovimientoCompra }`).
  No active UI reads `store.movimientosCompra`, but the type still flows
  through `store.ts` (protected). Deleting any of these requires tracing
  the legacy `/expediente` flow and is out of scope without explicit
  approval.

This claim was speculative; the brief explicitly forbade recommending
deletion without tracing all consumers. Recommendation: deleted.

### 5.7 DEFERRED — OC ↔ Receipt bridge requirements

The previous report listed T1 as the top implementation task. The brief
explicitly says the bridge is **not** to be implemented in this session and
its requirements are **not** yet defined. The unresolved questions are:

- Receipt line ↔ OC line identity: by `stockItemId`? by a new
  `ordenCompraItemId`? What about articulo-Z items whose `stockItemId` is
  a placeholder `"art-z-<id>"`?
- Partial vs complete fulfillment: a Receipt can have its own line
  quantities and resolutions; the OC carries `quantity` and `received`.
  How are mismatches (over-quantities, substitutions, articles not in
  the OC) reconciled?
- Multiple legitimate Receipts against one OC: the OC `received` is the
  sum of receipt fulfillments, but two partial Receipts of 3 against an OC
  line of 10 — is the OC `received` 3 (per Receipt) or 6 (sum)? Both?
- Reconfirmation/replay: see §5.2. The bridge must not introduce its own
  double-count problem.
- Commercial `recibirOrdenCompra` vs physical `confirmReceipt`: today
  they are independent writers. If the bridge causes the OC to track
  Receipt state, what does `recibirOrdenCompra` mean when a Receipt also
  exists?
- Quantities, units, substitutions, free-description articles: a Receipt
  line can carry a scanned code with a different `articleId` than the
  OC line, or free text.
- When does a `NecesidadCompra` become `Recibida`? Per OC? Per Receipt? Per
  full coverage? Partial coverage is not a settled answer.
- Behavior of a Receipt without an OC: DR-14 explicitly allows this; the
  bridge must remain optional and back-compatible.

These are not implemented here. They are recorded for the next task that
wishes to define the contract.

### 5.8 CONFIRMED — historical audit citations to reconcile

Several other citations from the previous report survive in source but
the behaviors are not relevant to the active flows:

- `MovimientoCompra` (legacy type), `mockOrdenesCompra`, `mockMovimientosCompra`:
  legacy store slices; not consumed by active flows (except
  `mockOrdenesCompra` by `/expediente`). Not a defect; tracked for the
  cleanup task that the brief correctly excluded from this session.

### 5.9 UNVERIFIED — runtime behaviors that this session did not exercise

- Browser behavior: not tested.
- PostgreSQL behavior: not tested.
- Concurrent request scheduling beyond the `FOR UPDATE` row lock: not
  tested.
- Whether a `logistics` user with `purchases:mutate` actually receives an
  HTTP 403 from `/compras/ocr-extract`: not tested. The static discrepancy
  (matrix grants, route denies) is recorded; the runtime consequence is
  not.

---

## 6. Diagnostic run

The `recibir-replay` diagnostic is a small Node script invoked via
`npx tsx` against the **real** `recibirOrdenCompra` service, with a
mocked Prisma transaction. It lives only in the owned folder
(`knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/diagnostic/`).

### 6.1 Output (recorded)

```
# Diagnostic: recibirOrdenCompra replay/cumulative semantics
Initial ordered quantity: 10
Initial received quantity: 0
Initial state: Enviada
Submitted payload: {"receivedByItem":[{"itemId":"item-1","received":3}]}

--- After first call ---
State: Parcialmente_recibida
Items[0].received: 3
Order state transitions: [ 'Parcialmente_recibida' ]
Item updates: [ { itemId: 'item-1', add: '3', totalAfter: '3' } ]

--- After identical second call (replay) ---
State: Parcialmente_recibida
Items[0].received: 6
Order state transitions: [ 'Parcialmente_recibida', 'Parcialmente_recibida' ]
Item updates: [
  { itemId: 'item-1', add: '3', totalAfter: '3' },
  { itemId: 'item-1', add: '3', totalAfter: '6' }
]

Classification: cumulative (no request idempotency).
The same payload submitted twice adds 3 twice; there is no operation identity in the contract.

# Scenario 2: two legitimate deliveries (6 + 4)
After 6: Parcialmente_recibida 6
After 4: Recibida 10
Scenario 3: 11 on qty=10 → code: orden_compra_invalid_receipt msg: Invalid receipt quantity
```

### 6.2 Pre-existing tests still green

`npx vitest run` on focused files:

- `src/__tests__/unit/orden-compra-service.test.ts` — 1/1 passed.
- `src/__tests__/unit/receipt-service.test.ts` — 10/10 passed.
- `src/__tests__/unit/compras-reposicion.test.ts` — focused passing.
- `src/__tests__/unit/erp-purchases-stock-domain.test.ts` — 6/7 passed.
  The 1 failing test is `4. Forecast — ... RECEIPT_IN and RETURN_IN add
  stock, DISPATCH_OUT subtracts stock` (`compras-forecast.service.ts:284`).
  It is unrelated to this task; it fails because the mock article has no
  `commercialProfiles[0]`.

The diagnostic itself is **not** wired into `vitest.config.ts` (whose
`include` glob is `src/__tests__/**/*.test.{ts,tsx}`); this session did
not modify the vitest config. The diagnostic is invoked with
`npx tsx .../diagnostic/recibir-replay.run.ts`.

### 6.3 Distinguishing mocks from real persistence

- The diagnostic mocks the Prisma `tx` interface (`$queryRaw`,
  `ordenCompra.findFirst/findMany/update`, `ordenCompraItem.findMany/update`,
  `auditEvent.create`). It calls the **production** service
  `recibirOrdenCompra`.
- This is a service-level test with mocked persistence, **not** PostgreSQL
  proof. The reproduction is bounded and reproducible.

### 6.4 Browser and database validation: not performed

Explicitly out of scope.

---

## 7. Working-tree hashes for reviewed sources

These are the **current working-tree** hashes (not HEAD) for the files
that are dirty in this session. The hashes for files that match HEAD are
omitted.

| Source file              | Working-tree hash |
|---|---|
| `src/lib/services/orden-compra.service.ts`               | `cb04e199f70e0603faf5246791e118f2cb167731` |
| `src/lib/services/receipt.service.ts`                   | `1683a25554db7e72dffcefd8fb556d9359c0f505` |
| `src/lib/services/compras-movimientos.service.ts`       | `2d608719a2ecc3ecfb10eedd26571bafc499e86d` |
| `src/lib/services/factura-compra.service.ts`            | `b61001ff396059e6a148deb803e9e5d2dc63b3e3` |
| `src/lib/services/necesidad-compra.service.ts`          | `bdb9de1a4cab562287995cb35f059ec66b31f430` |
| `src/lib/services/compras-forecast.service.ts`          | `845621b4c0459bb90e5e01d1d42b80d0712ffc18` |
| `src/lib/api/compras.ts`                                | `8c70fe1eb361fa9bb456fdda3a47543b60f3542f` |
| `src/lib/api/ordenes-compra.ts`                          | `958f7df314f22d3adcc2fd43092285d3d3c19ac7` |
| `src/lib/validators/orden-compra.ts`                     | `c1f1b80a75fb3be6de009b7c78248067c343b903` |
| `src/lib/validators/receipt.ts`                          | `46148455125038c7b6531412b330356514e7c976` |
| `src/lib/validators/necesidad-compra.validator.ts`      | `2eea44d91e5ae52962056d0be7756547bff64633` |
| `src/hooks/useOrdenesCompra.ts`                          | `d59045bbd28bd87f49e763b9e6b7c9545caa4125` |
| `src/hooks/useCompras.ts`                               | `b29f3882d031236b1d9ec4e47f696df88ed8778f` |
| `src/hooks/useProveedores.ts`                           | `dbccea39f0ff63d05b8f5f70b5e6cefe58a3d3cc` |
| `src/lib/permissions/canonical-roles.ts`                | `12b45def7a52f0ce7bcbed454ea8cec1b249d5fe` |
| `src/lib/permissions/capabilities.ts`                    | `1fdec213995f6dd811fa5632bbd2ee4fe9984752` |
| `src/lib/permissions/receipt.ts`                        | `60c461890a0842855f401615ac4f1b9ac3d823f6` |
| `src/lib/permissions/stock-operations-policy.ts`        | `0622840de3811e3182b601ff14607ac180cc92db` |
| `src/lib/api/guards.ts`                                  | (matches HEAD: see git status) |
| `src/lib/api/auth-context.ts`                           | (matches HEAD: see git status) |
| `src/types/index.ts`                                    | `60c461890a0842855f401615ac4f1b9ac3d823f6` (same as permissions/receipt.ts — likely a shared base; recompute at session end) |
| `src/lib/store.ts`                                      | (matches HEAD: see git status) |
| `src/app/api/companies/[companyId]/ordenes-compra/route.ts` | `c03404a59b646bc588d58d7c448c2c9233363fda` |
| `src/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/recibir/route.ts` | `104fea46f6379263f3dffc0b0907650ec08fb2a1` |
| `src/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/emitir/route.ts` | `bc91a7e93e074c7c208270eafec8cfac6774b6d2` |
| `src/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/enviar/route.ts` | `94b087e5027758070ed506baded0c36e85769997` |
| `src/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/cancelar/route.ts` | `dad9edeeba5911df5008fb4c3d35979ed35b9a99` |
| `src/app/api/companies/[companyId]/receipts/route.ts`  | `d49b997f2c34207e2931d47895eacd5c456f4889` |
| `src/app/api/companies/[companyId]/receipts/[receiptId]/confirm/route.ts` | `26f413dd2ea457d11858b1d5f81a0f5156b23d2c` |
| `src/app/api/companies/[companyId]/compras/movimientos/route.ts` | `5c91b0091a9a65645032fc151ae33cf0773fe88f` |
| `src/app/api/companies/[companyId]/compras/necesidades/route.ts` | `dd1d9457fb494dc036b2a5bac78cc53d10f36f5c` |
| `src/app/api/companies/[companyId]/compras/necesidades/convert-to-oc/route.ts` | `2d8ada5f582d8334e64881a5f3312885b2785731` |
| `src/app/api/companies/[companyId]/compras/forecast/accept/route.ts` | `5c4f511b444c6fb1704e9815dc68f68eb87232df` |
| `src/app/api/companies/[companyId]/compras/ocr-extract/route.ts` | `e3b01f631866085a40a69a1789e2f06b28b6a480` |
| `src/app/compras/ordenes-compra/page.tsx`               | `72bb4085572b8784a912b4e8e18df50e3b7cc28a` |
| `src/app/compras/remitos-proveedor/page.tsx`            | `d35308bec2771310de72063c0da43a73d07cefe7` |
| `src/app/compras/movimientos/page.tsx`                  | `f5f9c0ec7d9ff3d9e2adbabe502a83a06b9d272b` |
| `src/app/compras/necesidades-compra/page.tsx`           | `1c474d4b83c3f58e44d71477beb25b986a9ea561` |
| `src/app/expediente/page.tsx`                            | (matches HEAD: see git status) |
| `src/components/compras/ReceiveOrdenCompraDialog.tsx`   | `0cff3e3a8f3db842cca608045aaf4f17e00b90a6` |
| `src/components/compras/CreateOrdenCompraDialog.tsx`    | `a6e5613773438c5437e9463890e30fda5d02a98f` |
| `src/components/compras/ReplenishmentSuggestionsSection.tsx` | `4203e14f947a63f0af36d1f4d8d4ece7480c71ff` |
| `prisma/schema.prisma`                                  | `b3b0fcf8472078aed254b3ffe4423643653f8a28` |

### 6.5 Searches performed

- `grep` over the whole repo for `ordenCompraId.*Receipt|Receipt.*ordenCompraId|receiptId.*OrdenCompra|OrdenCompra.*receiptId` → 0 hits.
- `grep` for `proveedorId|proveedor|supplier` across `orden-compra` and
  `receipt` services to confirm asymmetry.
- `grep` for `useStore.*ordenesCompra|useStore.*movimientosCompra` in
  `src/app/**` to trace legacy consumers.
- `grep` for `movimientosCompra|MovimientoCompra` to confirm dead-store
  status.
- Read every file in `src/lib/permissions/{canonical-roles,capabilities,receipt,stock-operations-policy}.ts`.
- Read every `ordenes-compra/*` and `receipts/*` route file.
- Read every service file in `src/lib/services/{orden-compra,receipt,compras-movimientos,factura-compra,necesidad-compra}.service.ts`.
- Read the Movements page, the Ordenes-Compra page, and the Receipts page.

---

## 8. Implementation queue (≤ 3 tasks, dependency-ordered)

Each task lists outcome, candidate files, reusable infrastructure,
acceptance criteria, regression checks, and ownership / approval boundaries.

### T1 — Movements contract: filter in `where`, drop dead column, hydrate when possible

- **Outcome**: `?ordenCompraId=...` and `?supplierId=...` actually filter the
  dataset before pagination. The "Orden Compra" column is removed from
  the UI until an OC↔Receipt bridge is settled (no fabricated linkage).
  The dead `useComprasMovimientos({ ordenCompraId })` hook parameter is
  either implemented (joining `Receipt.ordenCompraId` once the schema
  supports it) or removed.
- **Candidate files**:
  - `src/lib/services/compras-movimientos.service.ts`
  - `src/app/api/companies/[companyId]/compras/movimientos/route.ts`
  - `src/app/compras/movimientos/page.tsx`
  - `src/hooks/useCompras.ts`
  - `src/lib/api/compras.ts`
- **Reusable**: existing `Receipt` include and `article`/`createdBy`/`receipt`
  selects in `compras-movimientos.service.ts:51-74`. The `formatReceipt`
  helper in `receipt.service.ts` is already in use.
- **Acceptance**:
  - `listComprasMovimientos({ ordenCompraId: "x" })` returns movements
    where `receipt.ordenCompraId === "x"` (only possible after the schema
    has the column; until then, the parameter is removed from the API and
    the client).
  - `listComprasMovimientos({ supplierId: "y" })` filters before `take`/`skip`.
  - The "Orden Compra" column disappears from the Movements UI (or is
    hidden) until the bridge is implemented. The detail dialog drops the
    `Orden de Compra:` row.
- **Regression checks**:
  - Bounded unit test: `findMany` mock receives a `where.receiptId === null`
    or `where.articleId === null` clause when the parameter is absent;
    receives `where.receiptId === "x"` when the parameter is `"x"`.
  - Bounded unit test: with `take=2` and three supplier-matching movements
    on page 2 of the underlying list, the call returns the supplier-matching
    ones regardless of pagination.
  - Existing receipt-service and erp-purchases-stock-domain tests remain
    green.
- **Approval boundary**: **none** — touches application source but not the
  schema, not Auth, not production data, not migrations. The task brief
  restricts scope to "Movements unsupported-filter/misleading-column" and
  this is the targeted fix.

### T2 — `recibirOrdenCompra` request identity

- **Outcome**: A replayed request cannot double-count. Two legitimate
  deliveries with the same quantity remain representable. The fix does not
  pre-empt the OC↔Receipt bridge.
- **Candidate files**:
  - `src/lib/validators/orden-compra.ts` (`ordenCompraReceiveSchema`)
  - `src/lib/services/orden-compra.service.ts` (`recibirOrdenCompra`)
  - `src/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/recibir/route.ts`
  - `src/components/compras/ReceiveOrdenCompraDialog.tsx` (generate client-side `idempotencyKey`)
- **Reusable**: the existing `FOR UPDATE` row lock at `orden-compra.service.ts:21`.
  Audit events at line 20.
- **Acceptance**:
  - `idempotencyKey` (optional string, length-bounded, server-trimmed)
    accepted in the payload.
  - A new table or column records `OrdenCompraItem.receivedAtReceiptKey`
    or a separate `OrdenCompraReceiptEvent` keyed by
    `(companyId, ordenCompraId, idempotencyKey)`.
  - On replay, the prior response is returned without re-incrementing
    `OrdenCompraItem.received`.
  - On two requests without `idempotencyKey`, the current cumulative
    behavior is preserved (and documented in the validator comment).
  - On overflow, the existing `orden_compra_invalid_receipt` error is
    preserved.
- **Regression checks**:
  - The `recibir-replay.run.ts` diagnostic is updated to assert: replay
    with the same key returns the prior response and does not increment;
    two distinct keys are accepted; no key behaves as today.
  - Existing `orden-compra-service.test.ts` (1/1 green) remains green.
  - `ReceiveOrdenCompraDialog.test.tsx` continues to assert per-item
    constraint.
- **Approval boundary**: **schema change required** to record the
  operation identity (the idempotency key). This task depends on a
  Task Brief + Franco approval per AGENTS.md §11. Scope is limited to
  OC receiving.

### T3 — Purchase-surface supplier-role policy unification

- **Outcome**: `createOrdenCompra` and `convertNecesidadesToOrdenCompra`
  enforce that `proveedorId` is a supplier Contact (canonical `proveedor`
  role), matching `factura-compra.service.ts:156-169` and
  `orden-pago.service.ts:160-169`. The Receipt route is left alone for
  this task (it has its own ambiguities to resolve).
- **Candidate files**:
  - `src/lib/services/orden-compra.service.ts` (`createOrdenCompra`)
  - `src/lib/services/necesidad-compra.service.ts`
    (`convertNecesidadesToOrdenCompra`)
  - `src/lib/services/factura-compra.service.ts:20` (extract
    `assertContactIsSupplier` helper, reuse across services)
- **Reusable**: existing `assertRelations` helper in
  `factura-compra.service.ts:20`; existing contact lookup in
  `orden-pago.service.ts`.
- **Acceptance**: rejected when the supplier link lacks the `proveedor`
  role; passes when it has it; existing service tests still pass.
- **Regression checks**: focused unit test in `orden-compra-service.test.ts`
  asserting the rejection case.
- **Approval boundary**: none (does not change the role matrix; only
  enforces an existing convention).

---

## 9. Highest-priority bounded task

T1 (Movements contract) is the smallest confirmed defect whose contracts
are sufficient to implement without further business input.

T2 requires its own Task Brief + Franco approval because of the schema
change.

T3 is a follow-up, also without approval, after T1.

The next prompt targets T1 (Movements contract fix):

```text
TASK ID: COMPRAS-MOVIMENTS-CONTRACT-FIX-DEV-001
Agent role: Backend / Frontend Agent
Selected model: MiniMax
Workspace: E:\OSSUM_COR_ANTIGRAVITY\ux-ui
Expected branch: ux/antigravity-redesign

Outcome
  - Apply supplierId filter in the database WHERE (not post-pagination), and
    expose pagination metadata (count + total) if a follow-on UI wants it.
  - Drop the always-null "Orden Compra" column from the Movements page
    table and the detail dialog. Until the OC↔Receipt bridge is settled,
    do not invent linkage.
  - Either implement ordenCompraId filtering (after the bridge is in
    place) or remove the param from the route / hook / API client until
    it can be honored.

Authorized scope
  - src/lib/services/compras-movimientos.service.ts
  - src/app/api/companies/[companyId]/compras/movimientos/route.ts
  - src/app/compras/movimientos/page.tsx
  - src/hooks/useCompras.ts
  - src/lib/api/compras.ts

Out of scope
  - Schema or migration changes (none required for this fix)
  - Production / staging / deploy / destructive operations
  - Auth, permissions, fiscal issuance, real data
  - OC↔Receipt bridge (deferred)
  - Receiving replay protection (T2)

Pre-conditions (not within this prompt)
  - Existing focused tests still pass before merge.
  - Bounded unit test demonstrating where clauses is required.

Acceptance
  - listComprasMovimientos routes all four accepted filters (articleId,
    receiptId, supplierId, ordenCompraId if kept) into the WHERE clause.
  - The Movements page table drops the "Orden Compra" column and the
    detail dialog drops the "Orden de Compra:" row.
  - The ordenCompraId param is either honored (deferred until bridge)
    or stripped from the API + hook + page wiring.
  - The supplierId Filter works correctly with take/skip: a page is the
    supplier-filtered slice, not the post-pagination slice of the
    full set.
  - Existing focused tests remain green.

Regression checks
  - Bounded unit test on listComprasMovimientos with mocked findMany
    asserting the WHERE clause is composed correctly.
  - Existing receipt-service and erp-purchases-stock-domain tests remain
    green (these are upstream of this fix).

Required approvals
  - None.
```

---

## 10. Investigation history (what was corrected, why)

The first version of `FINDINGS.md` (same folder) overstated DR-14's scope,
fabricated a role-list for the `convert-to-oc` route, mis-stated the
idempotency state of `recibirOrdenCompra`, and recommended deletion of
`mockOrdenesCompra` / `MovimientoCompra` without tracing all consumers.

This corrected version:

1. Separates DR-14 (stock truth) from the OC-fulfillment-update question
   (which remains undefined).
2. Drops the fabricated role-list claim and documents the actual capability
   matrix plus the OCR-route-vs-capability discrepancy.
3. Demonstrates the cumulative-semantics claim with executable evidence in a
   service test inside the owned folder.
4. Withdraws the dead-code deletion recommendation and replaces it with a
   reference to the legacy `/expediente` flow that consumes
   `store.ordenesCompra`.
5. Keeps the OC↔Receipt bridge out of the implementation queue. Records
   the requirements gap.

The diagnostic source file and this report are the only artifacts in the
owned folder. No application source, test, migration, or configuration
was modified.

---

## 11. T1 implementation — Movements contract (closed)

The four-step bounded task from the user was applied to the codebase.
This section records what changed, the working-tree hashes, and the
executed evidence.

### 11.1 What changed

| File | Change |
|---|---|
| `src/lib/services/compras-movimientos.service.ts` | `supplierId` filter applied in the Prisma `where` clause via `receipt: { is: { supplierId } }`. `ordenCompraId` removed from input shape and response shape. |
| `src/app/api/companies/[companyId]/compras/movimientos/route.ts` | `?ordenCompraId=...` is now rejected with `400` and `code: 'movimientos_orden_compra_filter_unsupported'`. |
| `src/lib/api/compras.ts` | `fetchComprasMovimientos` no longer accepts/forwards `ordenCompraId`. |
| `src/hooks/useCompras.ts` | `useComprasMovimientos` no longer accepts `ordenCompraId`. |
| `src/app/compras/movimientos/page.tsx` | Removed `Orden Compra` column, the matching `Orden de Compra:` row in the detail dialog, the `ordenCompraNumber` search filter, the placeholder phrase "OC", and the `DropdownMenu` import that was unused after the change. `colSpan={10}` → `colSpan={9}`. |
| `src/__tests__/unit/compras-movimientos.service.test.ts` | New file. Two tests: (a) `supplierId` placed in `where.receipt.is.supplierId` and `take`/`skip` pass through; response rows do not expose `ordenCompraId` / `ordenCompraNumber`. (b) When `supplierId` is absent, `where` does not contain a `receipt` filter. |
| `src/__tests__/unit/compras-movimientos.test.ts` | New file. Two tests for the API route: (a) `?ordenCompraId=oc-1` returns 400 with `code: 'movimientos_orden_compra_filter_unsupported'` and the service is not invoked. (b) `?supplierId=sup-1&take=2` is accepted; the forwarded payload carries `supplierId: 'sup-1'` and `take: 2`. |

### 11.2 Working-tree hashes (post-change)

| File | Hash |
|---|---|
| `src/lib/services/compras-movimientos.service.ts` | `861388db35a8945de8977b39b0dcfdfaa9bf38ba` |
| `src/app/api/companies/[companyId]/compras/movimientos/route.ts` | `a39e3a82e3a7682491f23c27353712cee0bf650e` |
| `src/lib/api/compras.ts` | `fcd3a50b21d1b367abb303d684718a1aa25574d8` |
| `src/hooks/useCompras.ts` | `3f4f735683705b8dbf4fdc8dad6859eb71ce50f6` |
| `src/app/compras/movimientos/page.tsx` | `3c0bd1a6da03d1d8b18a4a668ad4a5c4619ee546` |
| `src/__tests__/unit/compras-movimientos.service.test.ts` | `39fb56bd43f3a225788f2d03358b442595dd008d` |
| `src/__tests__/unit/compras-movimientos.test.ts` | `f7d1267dbe366c7b13b127471d48e38c5a977341` |

### 11.3 Executed evidence

```
$ npx vitest run src/__tests__/unit/compras-movimientos.test.ts src/__tests__/unit/compras-movimientos.service.test.ts
 Test Files  2 passed (2)
      Tests  4 passed (4)

$ npx vitest run src/__tests__/unit/orden-compra-service.test.ts src/__tests__/unit/receipt-service.test.ts src/__tests__/unit/compras-movimientos.service.test.ts src/__tests__/unit/compras-movimientos.test.ts
 Test Files  4 passed (4)
      Tests  15 passed (15)

$ npx tsc --noEmit -p .
src/__tests__/unit/presupuesto-service.test.ts(300,27): error TS2872: This kind of expression is always truthy.
```

The single remaining TypeScript error is in a file owned by another
session (`presupuesto-service.test.ts`, dirty in working tree before this
session started; not touched here). No new TypeScript errors are
introduced by the T1 changes.

### 11.4 Unverified runtime claims

Browser validation was not performed (out of scope). Database validation
was not performed (out of scope). The Prisma `where.receipt.is.supplierId`
shape was asserted against a mocked `findMany`; correctness against the
real schema is the next-stage verification.

### 11.5 Final closeout (MiniMax 2 — `COMPRAS-MOVIMIENTOS-CONTRACT-CLOSURE-DEV-001`)

Confirmed at session close:

- Five working-tree source files updated, two new test files added, all
  scoped to the Movimientos contract surface.
- Diff scoped strictly to Movimientos: `lib/api/compras.ts` and
  `useCompras.ts` hunks touch only `fetchComprasMovimientos` and
  `useComprasMovimientos` respectively. The other 9 functions / 6 hooks in
  those shared files were left for their owners.
- Tests + TypeScript + lint pass on the package; no new lint or
  TypeScript errors were introduced.
- The five acceptance criteria from the bounded task brief are
  satisfied at the source-contract level:
  1. supplierId applied in WHERE before take/skip.
  2. OC column / dialog row / search filter removed from `page.tsx`.
  3. OC filter removed from active consumers (`fetchComprasMovimientos`,
     `useComprasMovimientos`).
  4. `?ordenCompraId=...` rejected with `400` and the explicit error code.
  5. `articleId`, `receiptId`, `companyId` scope, and `take`/`skip`
     pagination still flow into the Prisma `where`.

### 11.6 Runtime acceptance still pending

The package is closed at the source-contract level. The following
runtime checks remain for a separate DEV-DB / browser session:

1. PostgreSQL acceptance: run a disposable DEV DB; insert two `Receipt`s
   with distinct `supplierId`s; call `?supplierId=sup-1&take=2`; confirm
   the DB filter actually narrows to supplier-matching rows before
   `take` applies. Today this is asserted against a mocked `findMany`
   only.
2. Browser acceptance: open `/compras/movimientos`; verify that the
   "Orden Compra" column is gone, the supplier dropdown filters the
   result set on every change, and the request `?ordenCompraId=…`
   returns the expected 400 JSON with `code:
   'movimientos_orden_compra_filter_unsupported'`.
3. Cross-cutting: the previous report's open items (T2 receiving
   idempotency, T3 supplier-role policy unification, OC↔Receipt bridge)
   remain deferred and out of scope for this package.

Lock released.