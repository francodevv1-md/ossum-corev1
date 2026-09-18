# Proposal — STOCK-V1-UX-BLUEPRINT-001

Status: **APPROVED AND CLOSED — UXD-01–UXD-12 approved by Franco on 2026-07-20; only the next documentary architecture-decision phase is authorized**

Change: `STOCK-V1-UX-BLUEPRINT-001`

Language: English; illustrative public UI copy is neutral/professional Spanish

Owner task: `STOCK-V1-UX-BLUEPRINT/T02-APPROVAL-CLOSE`

Approver: Franco

Approval date: 2026-07-20

Approved domain source: `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` at working-tree blob `926476e1d5e275768296329e099e32e04069224e`

Authorization boundary: The next documentary architecture-decision phase only; SPEC, DESIGN, TASKS, schema, migration, backend/API, permissions/Auth, UI implementation, Cajas implementation, Cirugías changes, APPLY, and production changes remain unauthorized.

Artifact chain: **PROPOSAL** → SPEC → DESIGN → TASKS → APPLY

---

## 1. Purpose, authorization, and non-authorization

This proposal defines a bounded Stock V1 user-experience blueprint for OSSUM COR. It translates the approved Stock domain baseline into proposed information architecture, operator journeys, information hierarchy, state semantics, cross-domain handoffs, safety expectations, responsive behavior, and accessibility expectations.

This phase is authorized because Franco approved and closed the concrete `DR-01`–`DR-16` baseline on 2026-07-19 and authorized the next documentary UX blueprint phase only. This UX proposal inherits those exact synchronized domain selections; it does not choose, compare, narrow, or reopen them.

This artifact does **not** authorize or select:

- Stock SPEC, DESIGN, TASKS, APPLY, UI implementation, Cajas implementation, Cirugías changes, or production rollout;
- technical architecture, persistence, ledger/journal representation, schema, migration, seed, import, or provider;
- backend, API, route, Server Action, service, validator, transaction, concurrency, idempotency-key, audit-storage, cache, or offline-storage design or implementation;
- Auth changes, role names, role-to-capability mappings, a permission matrix, or multi-company security implementation;
- source-code changes, component structure, exact URL contracts, or sensitive Surgery/Record placement/refactor;
- database reconciliation or creation of opening positions;
- billing, costing, valuation, accounting, collection, fiscal, or commercial effects; or
- implementation of Stock, Articles, Deposits, Purchases, Preparation, Remittance, Consumption, Return, Cajas, or Cirugías.

Franco approved `UXD-01`–`UXD-12` exactly according to their verified recommended baselines on 2026-07-20. This closes T2 and authorizes only the next documentary architecture-decision phase; it does not authorize SPEC, DESIGN, TASKS, schema, migration, backend/API, permissions/Auth, UI implementation, Cajas implementation, Cirugías changes, APPLY, or production changes.

---

## 2. Source hierarchy and inherited baseline

### 2.1 Source hierarchy used

This proposal follows the repository authority order and uses only the task-approved evidence set:

1. `AGENTS.md` and current Knowledge governance.
2. `PROJECT_BRIEF.md`, `CANONICAL_DECISIONS.md`, and the current-state warning that prototype surfaces are not final truth.
3. The current Stock, Preparation/Remittance/Consumption, and central-flow domain documents.
4. The approved and closed Stock domain proposal, including the concrete `DR-01`–`DR-16` baseline, read at working-tree blob `926476e1d5e275768296329e099e32e04069224e`.
5. The approved Cajas proposal and its current SPEC/DESIGN, solely to preserve their closed observable obligations and ownership boundaries.
6. The current `/stock` source, Stock-relevant prototype types/store slices, shared presentation conventions, formatters, and mock data as audit evidence only.

When prototype behavior conflicts with the approved domain baseline, the approved baseline governs. The bounded UX choices approved by Franco remain visibly identified in §18 and do not reopen domain decisions.

### 2.2 Approved Stock baseline inherited without reinterpretation

The UX MUST preserve all sixteen concrete approved domain decisions below. This list is an inherited synopsis of the authoritative domain artifact, not a set of UX recommendations or alternatives:

1. Only explicitly Stock-controlled Articles participate.
2. The position vocabulary distinguishes on hand, reserved, available, in transit, under review, and applicable final disposition.
3. Each Article has one Stock quantity unit; fractions are configurable where allowed; V1 has no general conversion engine.
4. Confirmed Preparation selection reserves Stock; release is explicit; oversubscription is prohibited.
5. Dispatch removes availability and places material in dispatched/external custody/in transit until Consumption or Return resolves it.
6. Consumption is human-validated, may be partial, and is linked to a Remittance.
7. Return is human-validated and uses bounded explicit disposition: available, under review, consumed, damaged, or missing as applicable. Draft Return never creates availability.
8. Transfers use separate dispatch and receipt checkpoints.
9. A count records an observation; correction is separate, justified, reviewed, and audited.
10. Accepted history is never deleted; correction uses linked reversal/corrective evidence.
11. Traceability is hybrid: Article+deposit always, lot/expiration where applicable, and serial/identified unit for Boxes/equipment.
12. V1 supports multiple deposits per company and a transit context; detailed internal locations may deepen later.
13. V1 includes the minimum Cajas Stock effects and identified units without requiring full composition Stock implementation.
14. A purchase order has no Stock effect; accepted physical receipt does. Exceptional receipt without PO is allowed only under future approved access/audit behavior.
15. Initial adoption uses a dated, reconciled opening position and never invented historical movements.
16. Stock V1 has no costing, valuation, accounting, billing, collection, or fiscal effect.

These are not Decision Register options. The register in §18 decides only bounded UX presentation and interaction choices within them.

### 2.3 Inherited Cajas obligations

The UX MUST preserve the approved Cajas behavior without widening it:

- `Caja`, `Contenido esperado`, and `Caja identificada` remain Articles/Stock master concepts.
- Selecting an identified Box and physical components for an operation reserves them.
- Preparation control and re-control create evidence only; they do not duplicate reservation or infer dispatch, Return, or Consumption.
- Only successful Remittance issuance creates `Contenido despachado` and the dispatched/in-transit Stock checkpoint.
- Failed issuance creates neither definitive dispatch evidence nor a Stock effect.
- Pre-dispatch cancellation releases the applicable reservation without downstream effects.
- Correctly returned, fully resolved material becomes `Disponible` only at the approved confirmed checkpoint.
- Consumed material is not also returned to availability.
- Missing, damaged, or unresolved material remains `No disponible` / `En revisión` as applicable.
- Added/replacement items require explicit Stock effects; comparison alone never silently balances them.
- Confirmed checkpoint behavior is observable as atomic, audited, and idempotent, while its technical mechanism remains unselected.
- `/cajas` remains search/summary; Articles/Stock owns masters; operation actions remain in the Surgery/Record `Cajas` context and existing contextual Remittance/Return flows.

---

## 3. Current `/stock` UX audit

### 3.1 What exists and what is only a prototype

The current `/stock` page is a client-rendered prototype backed by Zustand persistence initialized from `mock-stock.ts` and `mock-stock-movements.ts`. It is useful evidence for compact operational tables, filters, badges, dialogs, Argentine date/number formatting, and familiar interaction patterns. It is **not** productive Stock truth or an approved Stock workflow.

The current mock row combines Article-like identity, one lot, one deposit/location, quantity, minimum, sterilization, supplier, price, and receipt reference. The movement dialog reads mock history by a local Stock item identifier. None of this proves final ownership, cardinality, aggregation, persistence, or business effects.

### 3.2 Misleading or unsafe prototype behavior

| Prototype behavior | Why it is misleading against the approved baseline | UX correction direction |
| --- | --- | --- |
| `Cantidad` is the only operational quantity. | It hides reserved, available, in-transit/external-custody, and under-review quantities. | Show an explicit quantity hierarchy with scope and reconciliation, never an unexplained single balance. |
| `Total artículos` counts filtered Stock rows. | A row may represent a lot/deposit slice rather than one Article; the label implies a hidden aggregation. | Label the result unit explicitly and keep Article, position, lot, and unit counts distinct. |
| `Bajo mínimo` and `Sin stock` are prominent KPIs. | Replenishment thresholds are not the approved Stock V1 core, and `quantity === 0` does not explain reservations or transit. | Prioritize operational position and unresolved exceptions; defer replenishment emphasis unless separately approved. |
| Every row requires lot, expiration, sterilization, price, and supplier fields. | Approved depth is hybrid; not every Article is lot/expiration-controlled, sterilization is not a V1 workflow, and Stock V1 excludes valuation/costing. | Reveal traceability only where applicable; keep commercial price and unsupported lifecycle claims outside Stock position truth. |
| `Ajustar stock` asks for a replacement number and optional reason. | It collapses count, review, correction, and causal history; reason is not mandatory. | Separate observed count from reviewed correction; require cause/evidence before critical confirmation. |
| Confirming adjustment shows a success toast only. | The handler does not change Stock or preserve evidence, yet communicates completed success. | Never announce critical success before accepted confirmation is returned and current data is reconciled. |
| Generic mock movements use `Ingreso`, `Egreso`, `Devolución`, `Ajuste`, and `Traspaso`. | They do not expose approved reservation/release, dispatch/transit, consumption, Return disposition, transfer checkpoints, reversal, or opening position semantics. | Present cause-specific events and their source documents/checkpoints. |
| Movement sign is derived from a positive numeric value. | Mock `Egreso` rows can visually render with a plus sign, making direction unreliable. | Render direction and effect from explicit causal semantics; never infer meaning from display sign alone. |
| `Devolución` appears as a simple positive movement. | A draft or unvalidated Return must never create availability, and confirmed outcomes can differ. | Display Return validation and disposition explicitly. |
| Movement evidence is a short card with date, user, generic details, and optional related ID. | It cannot reliably answer effective time, cause, source checkpoint, before/after scope, reversal relationship, or unresolved disposition. | Use causal history with source-document links and immutable linked correction/reversal evidence. |
| Hard-coded filters and option vocabularies do not consistently match mock values. | This can produce silent no-match results and suggests static master truth. | Distinguish catalog empty, filtered empty, partial filter availability, and stale data. |
| Empty results always say `No se encontraron artículos`. | Empty catalog, no filter match, denied access, loading, and error are conflated. | Use the complete state matrix in §13. |
| Dialog-only detail and history compress broad operational context. | Long causality and traceability cannot be safely understood in a small modal. | Use a durable detail/history context; reserve dialogs for bounded review/confirmation. |
| No visible company/data scope, refresh state, conflict state, or partial-data warning. | Users cannot judge whether the position is current, complete, or correctly scoped. | Keep scope, freshness, and completeness visible. |

### 3.3 Prototype patterns worth retaining as references

- compact, operational density on desktop;
- visible search and high-value filters;
- direct row access to detail and history;
- neutral Spanish labels and `es-AR` formatting;
- responsive horizontal inspection when tabular data genuinely requires it; and
- shared visual conventions, provided they do not mask missing states or false success.

This audit creates no obligation to preserve current components, source structure, fields, routes, or state management.

---

## 4. Operator problems to solve

The future experience must let an operator answer, without reconstructing facts across unrelated screens:

1. Is this Article Stock-controlled, and in which Stock unit is it read?
2. What is the current position for this company and selected deposit/custody scope?
3. How much is available, reserved, in transit/external custody, or under review, and how does that relate to on hand?
4. Which lot/expiration or identified unit is involved when the Article requires it?
5. Which confirmed business operation caused each position change?
6. What is still unresolved after dispatch, partial Consumption, or partial Return?
7. Why is material unavailable, and what owning workflow must resolve it?
8. Has a supplier receipt, Transfer receipt, correction, reversal, or opening position actually been accepted, or is it still a draft/review?
9. Is the information current and complete enough to support a critical action?
10. Where should the operator continue when the causal operation belongs to Preparation, Remittance, Consumption, Return, Cajas, Purchases, or Articles?

---

## 5. UX principles

### 5.1 Explainability before compression

A summary may accelerate scanning, but every number must expose its company, deposit/custody, Article, traceability depth, freshness, and causal path. No total may hide incompatible scopes or identified units.

### 5.2 Causal history, not editable balance

The primary mental model is “position explained by accepted causes.” Direct balance replacement is not a normal action. Count, correction, reversal, and opening position remain visibly distinct.

### 5.3 Honest state

Draft, pending review, confirmed, failed, stale, partial, and unresolved are never presented as equivalent. Previously loaded data may remain visible during refresh or connectivity loss only when clearly marked with its last successful freshness.

### 5.4 No premature success

Critical actions—receipt acceptance, reservation/release, dispatch, Consumption, Return disposition, Transfer dispatch/receipt, correction, reversal, and opening position—show success only after the accepted business outcome and required Stock consequence are confirmed. Closing a dialog, clicking twice, refreshing, or retrying must not imply or duplicate success.

### 5.5 Progressive depth without hidden depth

The default view remains readable for quantity-managed Articles while lot/expiration and identified-unit detail appears where applicable. Progressive disclosure may reduce visual load, but it may not conceal an unavailable condition, unresolved custody, traceability obligation, or aggregation rule.

### 5.6 Ownership is visible

Stock explains position and consequence. The originating domain owns its business document and execution. Contextual links move the user to the owner rather than creating parallel editable versions.

### 5.7 Exception-focused, not exception-silent

Daily work emphasizes unresolved reservations, transit, review, count differences, and failed/stale confirmations. Exceptions are concise but never hidden inside a green total.

### 5.8 Accessible safety

Critical distinctions use text, structure, and semantics—not color alone. Review order, keyboard order, focus movement, announcements, and touch target size must support safe completion.

---

## 6. Proposed conceptual information architecture

This section defines product surfaces and ownership only. Names are conceptual; they are not exact route, component, or backend contracts.

```text
Stock and Articles
├─ Stock operations index (`/stock` as current entry concept)
│  ├─ Browse/search positions
│  ├─ Operational quantity and custody filters
│  ├─ Attention/unresolved lens
│  └─ Contextual entry to owned operations
├─ Articles / Stock masters
│  ├─ Article identity and explicit Stock-control configuration
│  ├─ Stock quantity unit and fraction policy
│  ├─ applicable lot/expiration or identified-unit depth
│  └─ Caja / Contenido esperado / Caja identificada ownership as already approved
├─ Stock position detail
│  ├─ position by deposit/custody
│  ├─ quantity hierarchy
│  ├─ applicable traceability slices
│  ├─ causal history and source documents
│  └─ linked corrections/reversals
├─ Deposits and custody contexts
│  ├─ multiple deposits per company
│  ├─ transit/external-custody visibility
│  └─ deposit-scoped positions/history
├─ Transfers
│  ├─ transfer dispatch
│  └─ transfer receipt
├─ Inventory / count
│  ├─ count scope and observations
│  ├─ expected-versus-observed review
│  └─ separate correction proposal/confirmation
├─ Supplier receipts
│  ├─ receipt against purchase order
│  └─ exceptional receipt without PO, subject to future approved access behavior
└─ Opening position
   ├─ dated reconciled scope
   ├─ explicit review
   └─ accepted starting evidence, never fabricated history

Contextual operation owners
├─ Preparation: selection, reservation request, release context
├─ Remittance: dispatch checkpoint
├─ Consumption: human-validated consumed quantity per Remittance
├─ Return: human validation and explicit disposition
├─ Surgery/Record Cajas: Box operation actions and evidence
└─ Purchases: order/commercial expectation; no Stock effect until physical receipt
```

### 6.1 Surface ownership

| Surface | Owns in the UX | Must not own |
| --- | --- | --- |
| Stock operations index | Discovery, scoped position reading, attention signals, history entry points, contextual operation links | Article definition, purchase-order editing, Surgery/Record execution, parallel Remittance/Consumption/Return forms |
| Articles / Stock masters | Stock eligibility, one Stock unit per Article, fraction policy, applicable traceability profile, approved Box masters/identified units | Operational movement history editing or operation-specific evidence |
| Stock position detail/history | Current explained position, deposit/custody breakdown, traceability slices, accepted causal evidence | Silent correction of source documents or destructive history edits |
| Deposit/custody view | Location identity context and positions attributed to it | Hidden company totals or invented detailed-bin workflow |
| Supplier receipt | Physical receipt observation/review/acceptance | Purchase-order commercial management or the assumption that an order equals receipt |
| Transfer | Dispatch from origin and receipt at destination as separate checkpoints | Consumption, supplier receipt, or instant one-step relocation |
| Inventory/count | Count scope, observations, differences, and review | Automatic correction on count completion |
| Preparation | Operation-specific selection and explicit reservation/release context | Stock balance editing or dispatch inference |
| Remittance | What is dispatched and the successful issuance checkpoint | Consumption or Return disposition |
| Consumption | Human validation of what was used against a specific Remittance | Generic Stock adjustment or inferred Return |
| Return | Human validation and bounded disposition | Draft availability or silent balancing |
| Surgery/Record `Cajas` | Approved Box selection/preparation/control/re-control/dispatch/Return context | Box master administration or parallel Stock truth |

---

## 7. Proposed browse, search, and inspection model

### 7.1 Stock operations index

The proposed default is an operational index of **Stock positions**, not a catalog-price table and not a movement-only ledger. It should:

- keep the active company scope and data freshness visible;
- search by Article code/name and, where applicable, lot or identified-unit code;
- filter by deposit/custody, quantity condition, applicable traceability, Stock-controlled category/classification already available, and unresolved attention;
- identify whether results represent Article-level rollups or expanded deposit/traceability positions;
- expose `Disponible` prominently for selection decisions while keeping `En existencia`, `Reservado`, `En tránsito / custodia externa`, and `En revisión` adjacent and reconcilable;
- avoid displaying commercial price as part of Stock truth;
- distinguish the full empty state from no filter matches; and
- provide a durable path to position detail and causal history.

The index should not lead with generic KPIs that consume operational space. A compact scoped summary may show counts/quantities requiring attention only when its aggregation unit is explicit and it follows the current filter scope.

### 7.2 Position detail

The detail context should preserve Article identity, Stock unit, company, selected scope, and freshness while presenting:

1. current quantity/custody summary;
2. deposit/custody breakdown;
3. lot/expiration or identified-unit breakdown where applicable;
4. unresolved reservations, transit, review, or outstanding dispatched quantities;
5. chronological causal history;
6. source-document and Surgery/Record references where applicable; and
7. linked reversal/correction relationships.

The detail should be a stable reading context. Bounded confirmations may use a dialog or review step, but broad history must not depend on a small modal.

### 7.3 Attention lens

An attention lens may collect, without inventing a new domain status:

- stale or failed confirmations;
- in-transit Transfers awaiting receipt;
- dispatched quantities awaiting Consumption/Return disposition;
- under-review, damaged, or missing material;
- count differences awaiting correction review;
- receipts awaiting acceptance; and
- positions whose available quantity changed since the operator loaded the action context.

Each item must state the underlying approved condition and owning workflow. “Attention” is a view, not a new Stock state.

---

## 8. Quantity/status hierarchy and Spanish label candidates

### 8.1 Proposed hierarchy

The quantity/status set below is inherited from the concrete approved domain baseline. The proposed UX choice is limited to its display order, emphasis, and Spanish public-label candidates for normal availability decisions:

1. **Available — `Disponible`:** quantity or identified units eligible for a new operation.
2. **On hand — `En existencia`:** physical quantity under the applicable company custody interpretation, with dispatched/external custody kept explicitly separate.
3. **Reserved — `Reservado`:** committed to active operations and unavailable elsewhere.
4. **In transit / external custody — `En tránsito / custodia externa`:** dispatched or transferring quantity awaiting the next approved checkpoint.
5. **Under review — `En revisión`:** known/expected material blocked from availability.
6. **Final/exception disposition:** `Consumido`, `Dañado`, or `Faltante` where applicable to history and unresolved accounting, not blended into available Stock.

`Disponible` is prominent because it answers “can I select this?”, but it must never appear alone when other non-zero buckets explain the position.

### 8.2 No hidden aggregation rules

- Every quantity displays its Stock unit.
- Fractions display only when the Article permits them; the UX never offers arbitrary conversion.
- Company total, deposit subtotal, transit context, lot slice, and identified-unit count are labeled separately.
- Quantity-managed and identity-managed Stock are not summed into an ambiguous number.
- A Box/equipment unit count must not be presented as interchangeable with fungible quantity.
- Filters must indicate whether summaries follow the filtered scope or the full company scope.
- Partial or unavailable breakdowns show `Datos parciales` rather than presenting a complete-looking total.
- `En existencia` and `Disponible` must not be treated as synonyms.
- `Consumido`, `Dañado`, and `Faltante` must not be added back into a current usable total.

### 8.3 Candidate explanatory copy

- `Disponible para nuevas operaciones`
- `Reservado para operaciones activas`
- `En tránsito o bajo custodia externa`
- `En revisión; no disponible`
- `Datos actualizados al {fecha y hora}`
- `Este total corresponde al depósito y filtros seleccionados`

These are proposed label candidates, except approved Cajas strings `Caja`, `Contenido esperado`, `Caja identificada`, `Control de preparación`, `Contenido despachado`, `Disponible`, `Con diferencias`, and `Recontrolar caja`, which remain inherited exact labels in their Cajas context.

---

## 9. Row and detail granularity options

The approved hybrid depth requires a bounded presentation that works for fungible Articles and identified Boxes/equipment.

### 9.1 Option A — Article-only rows

One row per Article with all deposits and traceability aggregated.

- Advantage: compact.
- Risk: hides location, lot, transit, and identity; unsafe for action selection.
- Disposition: **not recommended as the sole operational view**.

### 9.2 Option B — Fully flattened position rows

One row for every Article + deposit/custody + lot/expiration or identified unit combination.

- Advantage: explicit.
- Risk: high duplication and poor scanning, especially for mixed traceability depth.
- Disposition: **not recommended as the default**; suitable as an export-like or expanded inspection view only if later approved.

### 9.3 Option C — Hierarchical hybrid rows (recommended)

Use one Article summary row within the active scope, expandable into deposit/custody positions, then into applicable lot/expiration slices or identified units.

- Quantity-managed Articles: Article → deposit/custody → lot/expiration where applicable.
- Identity-managed Boxes/equipment: Article/base identity → deposit/custody → identified units.
- Direct search for a lot or unit opens/highlights the matching child while preserving its Article parent.
- Critical actions require an explicit actionable child scope; they never act on an ambiguous aggregate.

This option is proposed in `UXD-02`. It is a presentation hierarchy, not a persistence hierarchy.

---

## 10. Primary user journeys

### 10.1 Browse and search

1. Enter Stock with company and freshness visible.
2. Search by Article identity or applicable lot/unit identifier, or filter by deposit/custody and condition.
3. Read the result unit and scoped quantity hierarchy.
4. Expand a result only when deposit/traceability detail is needed.
5. Open stable detail/history without losing search/filter context.
6. On return, preserve the prior browse context unless it is stale; then mark and refresh it honestly.

### 10.2 Inspect position and causality

1. Open an Article position.
2. Confirm Stock unit, company, deposit/custody scope, traceability depth, and freshness.
3. Reconcile available, on-hand, reserved, transit, and review quantities.
4. Select a quantity or custody bucket to filter causal history without changing the underlying facts.
5. Open the source document/checkpoint or Surgery/Record context.
6. If an entry was reversed/corrected, inspect the original and linked neutralizing evidence together.

### 10.3 Supplier receipt with purchase order

1. Enter physical receipt from the Purchases context or a Stock receipt entry point with the purchase order referenced.
2. Review expected order lines as reference only; do not present them as received.
3. Record observed physical Article, quantity/unit, destination deposit, and applicable lot/expiration or identified unit.
4. Show discrepancies without silently editing the purchase order.
5. Review the exact physical receipt and resulting proposed Stock position effect.
6. Confirm once.
7. On success, show accepted receipt evidence and refreshed position; on failure/stale conflict, preserve the draft and show no inbound success.

### 10.4 Exceptional supplier receipt without purchase order

1. Choose `Recepción sin orden de compra` only when the future approved access behavior makes it available.
2. Show an exceptional-path warning without naming an invented role.
3. Require supplier/source reference, physical evidence, Article/quantity/unit, deposit, applicable traceability, and justification.
4. Review that no purchase order supports the receipt.
5. Confirm under future approved authorization/audit behavior.
6. Show success only after accepted physical receipt; denial/failure creates no position effect.

The proposal does not decide who may perform this action.

### 10.5 Reservation and release

1. In Preparation, select Stock for a specific operation.
2. Show available quantity or eligible identified units at current scope.
3. On confirmed selection, present reservation success and updated availability once.
4. If availability changed or another active reservation conflicts, block false success and require reload/reselection.
5. Release from the owning Preparation/cancellation context with explicit scope and reason/context.
6. Show the linked release in Stock history; do not imply physical movement.

### 10.6 Dispatch

1. Enter the existing Remittance issuance flow with selected/reserved material in context.
2. Review what will leave, from which deposit, and the effect `Disponible` → `Despachado / En tránsito`.
3. Confirm Remittance issuance through its owning flow.
4. On success, show the source Remittance and updated custody; on failure, retain reservation/control evidence and show no dispatch.
5. Keep dispatched material unresolved until linked Consumption or Return disposition.

### 10.7 Consumption

1. Enter Consumption from the relevant Remittance/Surgery context.
2. Start from dispatched lines and remaining accountable quantity.
3. Record partial or complete consumed quantity, preserving applicable traceability.
4. Validate against the source Remittance ceiling and prior accepted dispositions.
5. Review what becomes `Consumido` and what remains unresolved.
6. On accepted confirmation, show linked Consumption evidence once; on failure/conflict, preserve draft and no final-use success.

### 10.8 Return disposition

1. Enter Return from the relevant dispatch evidence.
2. Start from outstanding dispatched material; a draft does not change availability.
3. Record returned/accounted quantities and explicit disposition: available, under review, consumed, damaged, or missing as applicable.
4. Keep partial unresolved quantity visible.
5. Preview the exact resulting availability/review/final disposition.
6. Confirm through the owning Return flow.
7. Show accepted evidence and updated position only after success.
8. For Cajas, preserve the approved exception-driven `Disponible` / `Con diferencias` and explicit re-control behavior.

### 10.9 Transfer dispatch and receipt

1. Start a Transfer with origin, destination, Article/quantity or identified units, and applicable traceability.
2. Review origin availability and destination identity.
3. Confirm dispatch: material leaves origin availability and becomes `En tránsito`; it does not yet appear as received destination availability.
4. At destination, inspect expected transfer contents and record received quantities/units and discrepancies.
5. Confirm receipt: accepted material enters the destination position; differences remain explicit and unresolved.
6. Preserve both checkpoints in one causal chain and keep company total conservation understandable.

### 10.10 Count and correction

1. Define count scope by company, deposit, Article range, and applicable traceability depth.
2. Record physical observations without changing Stock.
3. Complete the count as evidence and compare observed versus expected.
4. Review each difference; route known causes to their owning operation rather than adjustment.
5. For a justified remaining difference, create a separate correction proposal with mandatory reason/evidence.
6. Review the proposed consequence and confirm under future approved access behavior.
7. Show accepted correction linked to the count; failure or rejection preserves count evidence and leaves position unchanged.

### 10.11 Reversal

1. Open an accepted effect and choose the bounded reversal/correction path when available under future approved access behavior.
2. Show the original effect as immutable and identify downstream/unresolved context that may prevent a simple reversal.
3. Require reason and link to the source operation/document.
4. Preview the neutralizing consequence; do not offer deletion.
5. Confirm once.
6. Show original and reversal as a linked pair, with the current position recalculated only after accepted success.

### 10.12 Opening position

1. Define a company, date, deposit/custody, Article, Stock unit, and applicable traceability scope.
2. Present the entry explicitly as `Posición inicial`, not `Ingreso` and not reconstructed history.
3. Record reconciled quantities/identified units and evidence reference.
4. Review completeness, exceptions, and date.
5. Confirm under future approved review/access behavior.
6. Show one dated accepted starting position; never create invented supplier receipts, Transfers, or historical movements.

---

## 11. Causal history and evidence UX

### 11.1 History entry anatomy

Each accepted Stock-effect entry should expose, as applicable:

- cause label and effect direction/condition;
- effective date/time and recorded/confirmed date/time when different and available;
- actor identity according to existing product conventions, without inventing identity rules;
- Article and quantity/unit or identified unit;
- origin and destination deposit/custody where applicable;
- lot/expiration/serial/identified-unit data where applicable;
- source domain and source document/checkpoint;
- Surgery/Record reference where applicable;
- disposition or unresolved quantity;
- justification/evidence for correction, reversal, exceptional receipt, or opening position; and
- links to original/reversal/correction entries.

### 11.2 Causal families in public language

Candidate labels include:

- `Recepción de proveedor`
- `Reserva` / `Liberación de reserva`
- `Despacho por remito`
- `Consumo validado`
- `Devolución validada`
- `Transferencia despachada` / `Transferencia recibida`
- `Corrección de inventario`
- `Reversión`
- `Posición inicial`
- `En revisión` / `Resolución de revisión`

These labels must identify cause, not merely `Ingreso` or `Egreso` when the specific cause is known.

### 11.3 Relationship to source documents

Stock history is the consequence reader; the source domain remains the document owner. A source link should open the relevant purchase receipt/order context, Preparation, Remittance, Consumption, Return, Transfer, count, correction, Cajas evidence, or Surgery/Record context. Stock must not expose an editable duplicate of that source document.

If a source is unavailable to the viewer under existing access, history should retain a non-sensitive reference and explain that the linked detail is unavailable; it must not mislabel the event as orphaned or empty.

### 11.4 Immutability cues

Accepted entries use read-only visual treatment and explicit labels such as `Confirmado`, `Revertido mediante…`, or `Corregido mediante…`. Current position is visually separated from historical evidence. No accepted history row offers inline editing or deletion.

---

## 12. Cross-domain handoffs and ownership boundaries

### 12.1 Preparation

- Preparation owns selected material, operation readiness, and cancellation context.
- Stock exposes eligibility/availability and records the approved reservation/release consequence.
- Stock does not infer dispatch from control or readiness.

### 12.2 Remittance

- Remittance owns what leaves and successful issuance.
- Stock shows the resulting dispatched/in-transit custody consequence.
- Draft or failed issuance creates no definitive Stock success.

### 12.3 Consumption

- Consumption owns the human-validated declaration per specific Remittance.
- Stock shows the final consumed disposition and remaining unresolved dispatched quantity.
- Stock does not create or edit Consumption as a generic adjustment.

### 12.4 Return

- Return owns validation, exceptions, and disposition input.
- Stock shows the accepted disposition and updated availability/review state.
- Draft Return never changes availability; comparison alone never balances Stock.

### 12.5 Cajas

- Articles/Stock owns `Caja`, `Contenido esperado`, and `Caja identificada` masters.
- Surgery/Record `Cajas` owns operation-specific selection, preparation, control, re-control, and contextual dispatch/Return work.
- Stock detail/history remains read-only for active-operation evidence and links back to the owner.
- Full Box composition Stock remains outside this proposal; the approved minimum effects and identified-unit behavior are preserved.

### 12.6 Articles

- Articles owns shared identity and categorization.
- Articles/Stock master UX owns explicit Stock-control configuration, Stock unit/fraction policy, and applicable traceability profile.
- Stock owns position, commitments, custody, disposition, and causal history.

### 12.7 Purchases and deposits

- Purchases owns orders and commercial expectations; a purchase order has no Stock effect.
- Physical receipt owns observed/accepted material and hands the accepted consequence to Stock.
- Deposit/custody identity is master context; Stock owns quantities/units attributed to it and their causal changes.

No handoff in this section selects APIs, routes, services, components, or transaction design.

---

## 13. Complete UX state matrix

| State | Required presentation | Allowed action | Prohibited implication |
| --- | --- | --- | --- |
| **Initial loading** | Labeled skeleton/progress preserving expected structure; no quantities or success badges | Cancel navigation when safe | False zeros, empty state, or accepted checkpoint |
| **Ready/populated** | Current scope, freshness, quantity hierarchy, applicable traceability | Normal read/contextual actions | Hidden scope or aggregation |
| **Empty** | Surface-specific successful absence, e.g. no Stock-controlled Articles/positions/receipts | Legitimate master/referral action only | Error or filtered no-match |
| **Filtered empty** | `No hay resultados para la búsqueda o los filtros aplicados` with active filters visible | `Limpiar filtros` / adjust search | Claim that Stock/catalog is empty |
| **Denied surface** | Explicit access denial, safe context, no invented role | Back/safe navigation | Empty, not found, or load error |
| **Denied action** | Readable context; action visible but disabled/explained when consistent with approved Cajas behavior/current conventions | Existing request/help path only if already supported | Role invention or security enforcement by UI alone |
| **Validation error** | Error summary plus field/row association; preserve input and focus first relevant issue | Correct and resubmit | Accepted effect or data loss |
| **Server/load error** | Distinct error, safe prior data marked non-current if retained | Retry when meaningful | Empty data or current truth |
| **Action failure** | Preserve draft/review, identify that confirmation did not complete | Retry once meaningful or return to edit | Stock success, source-document success, or duplicated retry |
| **Conflict/stale** | Blocking explanation that newer information exists; show changed scope/evidence after reload | Reload/reconcile and review again | Silent merge, overwrite, or confirmation |
| **Refreshing** | Keep last successful content with `Actualizando…` and prior freshness | Read; avoid duplicate critical confirmation | Flash zero/empty/success or claim newest data |
| **Partial data** | Persistent `Datos parciales` banner; name unavailable scope/buckets where safely possible | Retry/load missing detail; restrict unsafe actions | Complete-looking totals or reconciliation |
| **Offline/no connectivity** | `Sin conexión`; retain read-only last successful data with timestamp when available | Retry on reconnect; safe draft retention only if later authorized | Critical offline confirmation or queued-success claim |
| **Submitting** | Action-specific progress; controls prevent accidental duplicate invocation while preserving cancel rules | Wait/cancel only where safe | Multiple submissions or success before outcome |
| **Accepted success** | Explicit cause, affected scope, source reference, confirmation time, and refreshed/refreshing position | Continue to detail/history | Success based solely on toast or dialog close |
| **No longer applicable** | Explain that source state changed or action was already completed/reversed | Open current evidence | Reapply or silently ignore |

Offline behavior is intentionally limited to honest read/draft presentation. This proposal does not authorize offline mutation, synchronization, or storage architecture.

---

## 14. Action safety, confirmation, retry, and idempotent interaction expectations

### 14.1 Critical-action review pattern

Before a critical confirmation, the UX should show:

1. action/cause in plain language;
2. company and operation/source context;
3. Article, quantity/unit or identified units;
4. origin/destination deposit or custody where applicable;
5. applicable traceability;
6. current and proposed quantity/custody consequence;
7. unresolved or downstream consequences;
8. mandatory justification/evidence where required; and
9. a single unambiguous confirm label, e.g. `Confirmar recepción` rather than generic `Aceptar`.

### 14.2 Confirmation proportionality

- Browsing, filtering, and disclosure require no confirmation.
- Draft edits can be cancelled without implying rollback of accepted facts.
- Receipt acceptance, exceptional receipt, release, dispatch, Consumption, Return disposition, Transfer checkpoints, correction, reversal, and opening position require explicit review and confirmation.
- Destructive language is avoided because accepted history is not deleted.

### 14.3 Retry behavior

- A failed attempt preserves entered information and does not show accepted success.
- Retry copy states whether the prior outcome is known failed or unknown/pending.
- When outcome is uncertain, the UX first refreshes/reconciles current evidence before enabling another confirmation.
- Repeated clicks, browser refresh, back/forward navigation, and retry must not result in duplicate observable effects.
- If the action was already accepted, the user is routed to the accepted evidence rather than invited to confirm again.

These are observable UX expectations for the approved idempotent domain behavior. They do not select an idempotency mechanism.

### 14.4 Optimistic behavior boundary

Optimistic visual updates are acceptable only for non-critical local presentation such as expanding a row or changing a filter. The UX must not optimistically claim accepted Stock effects, availability, reservation, dispatch, Consumption, Return disposition, receipt, Transfer, correction, reversal, or opening position.

---

## 15. Responsive behavior

### 15.1 Desktop

- Use a compact operational table/hierarchical grid with sticky identity and quantity headings when useful.
- Keep search and high-value filters visible without placing large KPI blocks above the work.
- Show Article summary and quantity hierarchy together; expanded deposit/traceability children remain visually subordinate.
- Position detail may use side-by-side summary and history filters, but history itself remains a durable reading surface.
- Confirmation review keeps consequence and confirm action visible without obscuring evidence.

### 15.2 Tablet

- Preserve the same information order with fewer simultaneous columns.
- Move secondary classification and causal metadata into row disclosure.
- Keep `Disponible`, deposit/custody, unresolved condition, and detail action visible.
- Avoid hover-only controls and ensure contextual actions remain reachable by touch and keyboard.

### 15.3 Mobile

- Convert rows into semantic position cards: Article identity → scope → `Disponible` → other non-zero buckets → attention → detail.
- Expand deposit, lot, and unit children inline or in a full-width durable detail, never in a clipped micro-table.
- Use one primary action per review step; place it in a non-obscuring sticky action region when necessary.
- Keep company/source context, critical quantity/unit, proposed consequence, unresolved condition, and confirm action visible before confirmation.
- Long codes, lots, serials, and source references wrap or use bounded horizontal inspection without hijacking page scroll.

Representative verification should include desktop, tablet, and `412x915` mobile viewports. Breakpoint implementation is not selected here.

---

## 16. WCAG 2.2 AA and inclusive-operation expectations

The future UX should meet WCAG 2.2 AA and the following operational expectations:

- all search, filters, disclosures, row/detail navigation, history filters, receipt/count/transfer/reversal review, retry, and confirmation controls are keyboard operable in logical task order;
- focus is always visible and moves to dialog/review headings, error summaries, stale-conflict notices, and post-success evidence appropriately;
- icon-only actions have accessible names including the affected Article/unit or action;
- repeated and primary touch targets are at least `44x44` CSS pixels or provide an equivalent usable target area;
- quantities, state, causality, direction, errors, stale data, and unresolved conditions never rely on color alone;
- table headers/captions and mobile label/value relationships remain programmatically understandable;
- loading completion, result-count changes, errors, conflicts, action progress, accepted success, and changed availability are announced concisely without reading every row;
- status messages do not steal focus unless immediate correction or safety requires it;
- text, controls, focus indicators, disabled states, and non-text status indicators meet applicable AA contrast;
- zoom/reflow does not hide critical context or actions;
- target ordering does not change unexpectedly when data refreshes; and
- plain language distinguishes `borrador`, `pendiente`, `confirmado`, `en revisión`, `falló`, and `datos desactualizados`.

---

## 17. Scope, non-goals, risks, and anti-patterns

### 17.1 Included UX scope

- conceptual Stock information architecture and ownership;
- browse/search, position detail, causal history, and applicable hybrid traceability;
- supplier receipt with/without PO;
- reservation/release, dispatch, Consumption, Return disposition;
- Transfer dispatch/receipt;
- count and separate correction;
- linked reversal and dated opening position;
- complete operational state semantics;
- critical-action safety and honest retry behavior;
- responsive and WCAG 2.2 AA expectations; and
- a bounded UX Decision Register for Franco.

### 17.2 Explicit non-goals

- full warehouse-management, detailed bin/location, picking-wave, route, carrier, or replenishment design;
- procurement optimization or purchase-order redesign;
- costing, valuation, prices as Stock truth, COGS, accounting, billing, collections, or fiscal behavior;
- complete Cajas composition Stock, maintenance, sterilization, repair, quarantine, or quality workflows;
- universal lot/serial/UDI/GTIN capture beyond the approved hybrid profile;
- general quantity-unit conversion;
- mass import, legacy reconstruction, invented historical movement, or production opening-position load;
- new role names, capability mappings, permission matrix, or two-person approval rule;
- schema, API, technical state machine, event sourcing, ledger, transaction, sync, or offline architecture;
- exact route/component design or sensitive Surgery/Record refactor; and
- implementation or automatic progression to later SDD phases.

### 17.3 Risks and controls

| Risk | Proposal control |
| --- | --- |
| Users trust one total without understanding custody | Explicit quantity hierarchy, scope, and non-zero bucket visibility |
| Article rollup hides lot/unit conflicts | Hierarchical hybrid rows and action on explicit child scope |
| Return draft increases availability | Draft/confirmed distinction and no critical optimistic success |
| Dispatch and Consumption double-reduce Stock | Cause-specific history and unresolved dispatched accounting |
| Count silently becomes adjustment | Separate observation, review, and correction journey |
| Retry duplicates a consequence | Unknown-outcome reconciliation and accepted-evidence redirect |
| Stock steals source-domain ownership | Contextual links and read-only consequence history |
| Cajas behavior is weakened | Explicit inherited obligations and ownership boundary |
| Partial data looks complete | Persistent partial-data state and restricted unsafe actions |
| Mobile hides causal or traceability detail | Mandatory card hierarchy and full-width durable detail |
| Prototype pricing implies valuation | Remove commercial price from Stock position truth |
| “Attention” becomes a new status | Treat it only as a view over approved conditions |

### 17.4 Anti-patterns prohibited by this direction

- editable `Cantidad` as the primary Stock truth;
- one generic `Ingreso/Egreso` label when the causal operation is known;
- hidden aggregation across company, deposits, custody contexts, lots, or identified units;
- treating `En existencia` as `Disponible`;
- a draft Return, receipt, or Transfer shown as accepted;
- a count action that immediately corrects Stock;
- deleting or overwriting accepted history;
- success toast without accepted evidence;
- retry without checking an uncertain prior outcome;
- hiding denied actions as empty data where an explicit denial is required;
- color-only status or direction;
- dialog-only broad history;
- `/stock` duplicating Preparation, Remittance, Consumption, Return, Cajas, or purchase-order ownership;
- default display of costing/price as Stock position; and
- offline queued critical actions presented as successful.

---

## 18. UX Decision Register — approved by Franco on 2026-07-20

Franco approved all twelve bounded UX presentation and interaction choices below exactly according to their verified recommended baselines on 2026-07-20. No row was revised or deferred.

The register does not ask Franco to reapprove any domain selection. In particular, `UXD-03` only decides display hierarchy/labels for the inherited quantity set; `UXD-06` only decides the receipt interaction around the inherited PO/no-PO boundary; `UXD-07` only decides presentation of the inherited two-checkpoint Transfer; and `UXD-08` only decides interaction separation for the inherited count-versus-correction rule.

| ID | UX decision | Verified recommended baseline | Approval result |
| --- | --- | --- | --- |
| `UXD-01` | **Stock entry and surface ownership** | Use `/stock` conceptually as the Stock operations index; keep Articles/Stock masters, supplier receipt, Transfers, inventory/count, and opening position as distinct owned journeys linked from it. Source-domain operations remain with their owners. | **Approved by Franco — 2026-07-20.** |
| `UXD-02` | **Default result granularity** | Use hierarchical hybrid rows: Article summary → deposit/custody → applicable lot/expiration or identified unit. Direct lot/unit search preserves the Article parent; critical actions require explicit child scope. | **Approved by Franco — 2026-07-20.** |
| `UXD-03` | **Quantity hierarchy and public labels** | Make `Disponible` primary for selection, with adjacent `En existencia`, `Reservado`, `En tránsito / custodia externa`, and `En revisión`; use `Consumido`, `Dañado`, and `Faltante` in applicable history/disposition. Never hide non-zero buckets. | **Approved by Franco — 2026-07-20.** |
| `UXD-04` | **Index summary strategy** | Do not lead with large `Total/Bajo mínimo/Sin stock` cards. Use compact, filter-scoped attention summaries only when their aggregation unit is explicit; keep operational results above the fold. | **Approved by Franco — 2026-07-20.** |
| `UXD-05` | **Position detail and history form** | Use a durable full reading context for position, traceability, causality, and linked evidence; use dialogs only for bounded review/confirmation, not broad history. | **Approved by Franco — 2026-07-20.** |
| `UXD-06` | **Supplier-receipt UX** | Use physical-observation → discrepancy review → explicit acceptance. PO lines are reference only. `Recepción sin orden de compra` is a visibly exceptional justified path governed later by approved access behavior, without invented roles. | **Approved by Franco — 2026-07-20.** |
| `UXD-07` | **Transfer UX** | Present Transfer dispatch and receipt as two separate checkpoints with an explicit `En tránsito` interval and discrepancy review at destination; never present an instant one-step move. | **Approved by Franco — 2026-07-20.** |
| `UXD-08` | **Count/correction UX** | Completing a count creates observation evidence only. Any remaining difference requires a separate justified correction review/confirmation linked to the count; known causes route to their owning workflow. | **Approved by Franco — 2026-07-20.** |
| `UXD-09` | **Critical action and retry UX** | Require consequence review and explicit action-specific confirmation; no optimistic critical success. Preserve drafts on failure, reconcile unknown outcomes before retry, and redirect already-accepted attempts to evidence. | **Approved by Franco — 2026-07-20.** |
| `UXD-10` | **Attention and unresolved-work lens** | Provide an `Atención` lens over approved conditions (transit pending, dispatched unresolved, review, count difference, receipt pending, stale/failure) while stating each underlying condition and owner; `Atención` is not a Stock status. | **Approved by Franco — 2026-07-20.** |
| `UXD-11` | **Responsive transformation** | Desktop uses compact hierarchical tables; tablet reduces columns with disclosure; mobile uses semantic cards and full-width detail while preserving scope, available quantity, non-zero exceptions, causality, and confirmation context. | **Approved by Franco — 2026-07-20.** |
| `UXD-12` | **Partial/offline honesty** | Retain last successful data only as timestamped read-only context with `Datos parciales`, `Actualizando…`, or `Sin conexión`; block critical confirmation when completeness/currentness is insufficient. No offline mutation is implied. | **Approved by Franco — 2026-07-20.** |

**Decision count:** exactly **12 approved UX decisions**, `UXD-01` through `UXD-12`.

Approval of these decisions closes the UX blueprint and authorizes only the next documentary architecture-decision phase. It does not select role mappings, APIs, schema, technical architecture, source files, or implementation.

---

## 19. Acceptance signals

T2 is approved and closed after independent review and Franco's approval confirmed that:

1. All `DR-01`–`DR-16` decisions are inherited and none is reopened as an alternative.
2. Current `/stock` mocks and false-success behavior are plainly labeled as prototype limitations.
3. Users can distinguish Article, Stock position, deposit/custody, lot/expiration slice, and identified unit.
4. `Disponible`, `En existencia`, `Reservado`, `En tránsito / custodia externa`, and `En revisión` are understandable without hidden aggregation.
5. Every primary journey identifies draft, review, accepted, failure, conflict, and causal evidence behavior.
6. Supplier receipt, reservation/release, dispatch, Consumption, Return, Transfer, count/correction, reversal, and opening position preserve their approved checkpoints.
7. Count does not mutate Stock and accepted history is not deleted.
8. Source-domain ownership remains clear; Stock reads consequences and links to source evidence rather than duplicating editable workflows.
9. Approved Cajas labels, checkpoints, failure behavior, idempotent observable effects, and host ownership are preserved.
10. The complete state matrix distinguishes loading, empty, filtered empty, denied, validation, server/action failure, stale/conflict, refreshing, partial data, offline, submitting, success, and no-longer-applicable states.
11. Critical actions never use optimistic success and retries do not invite duplication.
12. Desktop, tablet, and mobile expectations preserve critical context; WCAG 2.2 AA expectations are explicit.
13. Exactly 12 UX decisions, `UXD-01`–`UXD-12`, are approved by Franco exactly according to their verified recommended baselines.
14. No role names/capability mappings, schema, APIs, technical state machine, transaction mechanism, or implementation architecture are invented.
15. Only this proposal file is changed by T02.

These are proposal-review signals, not implementation acceptance tests.

---

## 20. Stop conditions and blocked continuation

Work must stop and return to Franco/the orchestrator if any later phase requires:

- changing or narrowing an approved `DR-01`–`DR-16` decision;
- weakening an approved Cajas obligation;
- inventing a role, capability mapping, permission matrix, or multi-company security behavior;
- selecting schema, persistence, ledger/journal, API, transaction, idempotency, concurrency, audit-storage, cache, sync, or offline architecture;
- choosing exact source files, components, routes, or a sensitive Surgery/Record/Cirugías refactor;
- adding costing, valuation, accounting, billing, collection, fiscal, or automatic commercial effects;
- introducing full warehouse, universal traceability, maintenance/sterilization/quarantine, or replenishment workflows;
- performing import, reconciliation, opening-position creation, migration, or production data work;
- proceeding beyond the authorized documentary architecture-decision phase without a new explicit approval; or
- observing baseline hash change, writer overlap, or a need to edit any file outside the owned proposal.

Following Franco's UX approval, only the next documentary architecture-decision phase is authorized:

- Stock SPEC, DESIGN, and TASKS remain blocked;
- schema and migration work remain blocked;
- backend/API and permissions/Auth work remain blocked;
- UI implementation, Cajas implementation, and Cirugías changes remain blocked;
- APPLY and all production changes remain blocked; and
- no protected file or productive behavior may be changed.

---

## 21. Approval and closure statement

`STOCK-V1-UX-BLUEPRINT-001` records one coherent, explainable, causality-first Stock V1 UX direction grounded in the approved domain baseline and current prototype audit. It preserves explicit quantity/custody semantics, hybrid traceability, source-domain ownership, Cajas obligations, historical integrity, honest operational states, critical-action safety, responsive behavior, and WCAG 2.2 AA expectations.

Franco approved all **12 UX decisions**, `UXD-01` through `UXD-12`, exactly according to their verified recommended baselines on 2026-07-20. T2 is **APPROVED AND CLOSED**. Only the next documentary architecture-decision phase is authorized; SPEC, DESIGN, TASKS, schema, migration, backend/API, permissions/Auth, UI implementation, Cajas implementation, Cirugías changes, APPLY, and production changes remain blocked.
