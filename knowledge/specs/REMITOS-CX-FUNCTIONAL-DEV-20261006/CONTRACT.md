# Existing Remitos contract for Surgery connection

Status: current-source contract, bounded DEV backend acceptance passed. Not a new schema, security policy or production approval. See `VALIDATION.md` for evidence and outstanding UI/global gates.

## Identity and authority
- Scope every request by active backend `companyId`.
- Surgery relationship/filter is `surgery.backendId`, not `surgery.id`/visible CX number. No local fallback when that technical identity is missing.
- One Surgery may have multiple Remitos. Use `Remito.id` for actions; `visibleNumber` is only its displayed number.
- Server and PostgreSQL are authoritative. Creation does not imply shipment; printing does not imply issuance. Do not generate Remitos automatically from Surgery or Presupuesto creation.
- Remito records outgoing content, Consumption records use, Return records returned content. Consumption/Return linkage remains per Remito; no universal one-consumption-per-Surgery assumption.

## Transport
Base: `/api/companies/{companyId}/remitos`. Success envelope: `{ data: ... }`; failure envelope: `{ error: { code, message } }`.

| Operation | Method/path | Payload / result |
| --- | --- | --- |
| Surgery list | `GET ?surgeryId={backendId}&take=100&skip=0` | Array of Remitos including items; this is a page, not an unbounded total |
| Detail/reload | `GET /{remitoId}` | Current persisted Remito with items |
| Create draft | `POST` | `branchId`, technical `surgeryId`, `origin`, `salidaReason`, nonempty `items`; existing recipient/logistics snapshots optional |
| Edit draft | `PATCH /{remitoId}` | Mutable draft fields; submit observed `expectedUpdatedAt` to reject lost updates |
| Explicit issue | `POST /{remitoId}/emitir` | Optional body for ordinary manual issuance; explicit matching `cajasDispatch` required for linked Cajas content |
| Logistics transition | `PATCH /{remitoId}/state` | `{ state }`; server validates transition; this endpoint cannot issue Borrador → Emitido |
| Existing return compatibility | `POST /{remitoId}/devolucion` | Existing `{ items: [{ itemId, returnedQuantity }] }`; delegates to Return services, not certified by this bounded acceptance |

Existing DTO/payload definitions: `src/lib/api/remitos.ts`. Existing validation/transition authority: `src/lib/validators/remito.ts`, `src/lib/services/remito.service.ts`.

## Persistence and client refresh
- Draft state is `Borrador`; visible number stays null until dedicated issuance allocates it transactionally with `issuedAt`.
- Issued documents are not editable drafts. Preserve item/recipient/logistics snapshots; do not silently rebuild them from live contact or formula values.
- Quantities use database Decimal(18,4); serialized reads may contain strings. Submit positive numeric/string quantities through the existing client/validator.
- Some create/mutation responses are compact. Refetch detail/list before rendering items. Existing `useRemitos` already follows this pattern.
- Do not turn a failed refresh into an authoritative zero or "Sin remitos". Summary distinguishes unavailable/loading/error. Its bounded count shows `≥100` when the page is full.
- Existing mutation roles, auth resolver and company guards remain unchanged; the API has final authority.

## Stock / Cajas boundary
- A manual document is not automatic proof of stock decrement. Do not invent a stock effect for free/manual lines.
- Existing Cajas dispatch carries assignment/preparation/item identities, observed preparation version and an idempotency key. It requires current clean control, reservations and compatible trace evidence.
- Issuance and accepted stock dispatch share the transaction. Failure must leave neither issued numbering nor outgoing stock effect. An identical retry replays the accepted effect rather than decrementing again; changed intent on the same key conflicts.
- Real DEV acceptance proved an outgoing quantity0.5 and remaining reservation/pending balance0.5 with one stock movement after replay.

## Acceptance limits
- PostgreSQL and actual route handlers passed; browser login/JWT/middleware and updated live build remain unverified.
- No schema, migrations, Auth, permissions or backend source were changed. No fiscal issuance, production/staging, real records, historical cleanup or broad circuit refactor is included.
