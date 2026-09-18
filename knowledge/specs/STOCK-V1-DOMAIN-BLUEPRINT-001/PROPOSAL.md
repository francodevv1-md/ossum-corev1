# Proposal — STOCK-V1-DOMAIN-BLUEPRINT-001

Status: **APPROVED AND CLOSED — DR-01–DR-16 approved by Franco on 2026-07-19; only the next documentary UX blueprint phase is authorized**
Change: `STOCK-V1-DOMAIN-BLUEPRINT-001`
Language: English
Approver: Franco
Approval date: 2026-07-19
Authorization boundary: The next documentary UX blueprint phase only; SPEC, DESIGN, schema, migration, backend, API, permissions, Auth, UI implementation, Cajas implementation, Cirugías changes, TASKS, and APPLY remain unauthorized.
Artifact chain: **PROPOSAL** → SPEC → DESIGN → TASKS → APPLY

---

## 1. Purpose and proposal boundary

This approved proposal defines the Stock V1 domain blueprint for OSSUM COR. It establishes product scope, domain vocabulary, ownership boundaries, approved quantity and movement semantics, domain-level checkpoints, invariants, progressive depth, and the DR-01–DR-16 baseline approved by Franco.

This is a product/domain proposal only. It does not select a persistence model, ledger architecture, transaction mechanism, schema, API, service, permission model, Auth behavior, UI, migration, or implementation sequence. Terms such as “record,” “movement,” “balance,” and “checkpoint” are domain concepts here; they do not imply database tables, event sourcing, endpoints, or source-code structures.

The approved Cajas product behavior cited in this proposal is an inherited constraint for the surgical/logistics Box scope. It does not, by itself, settle the wider Stock V1 decisions listed in the Decision Register.

---

## 2. Why Stock V1 is needed

Stock is transversal to the canonical Surgery/Record circuit:

```text
Contacts → Surgery/Record → Budget → Preparation → Remittance
→ Consumption → Return → Comparison → Documentation → Billing → Collection
```

The operation must eventually explain what material existed, where it was, what was committed, what physically moved, what was consumed, what returned, what remained unresolved, and which business operation caused each change. This is necessary to reduce missing-material risk, improve the remit-consume-return comparison, and preserve trustworthy evidence before billing.

The current repository cannot yet provide that Stock truth consistently:

- several product areas still use prototype, mock, local, or soft-reference data;
- backend persistence exists for selected slices, but productive fine-grained Stock does not yet exist;
- current Remittance, Consumption, Return, and read-only Traceability behavior must not be mistaken for a complete Stock model;
- Stock fine detail—movements, lots, serials, expiration, and physical Boxes—was explicitly deferred;
- current UI concepts can look operationally complete even where no final Stock source of truth exists; and
- direct balance editing would not explain why quantities changed or prevent duplicate operational effects.

A bounded Stock V1 domain contract is therefore needed before technical design. It must connect the central operation without turning Stock into an isolated ERP or prematurely implementing a full warehouse-management, costing, or asset-tracking system.

---

## 3. Authoritative inputs and decision classes

This proposal distinguishes three classes of statements.

### 3.1 Canonical constraints

These constraints are already authoritative and are not reopened here:

1. OSSUM COR is multi-company and centered on the Surgery/Record.
2. Stock, Boxes, traceability, and purchases are transversal to the canonical circuit and may be delivered progressively.
3. Stock must be explainable by movements rather than being only an unexplained balance.
4. Relevant inbound and outbound operations must leave Stock movement evidence.
5. A Return must not create an inbound effect without human validation.
6. Critical operations require company context, actor attribution, timestamps, state, related-document references, and auditability.
7. The backend—not the frontend—must ultimately enforce company access and business effects.
8. Operational and fiscal/accounting concerns must not be merged prematurely.

### 3.2 Approved inherited Cajas constraints

The closed Cajas DG-01–DG-07 decisions represented in the Cajas SPEC fix the following observable product obligations for surgical/logistics Boxes. This proposal preserves them without choosing their implementation:

- selecting a `Caja identificada` and its physical components for an operation reserves them;
- preparation control and re-control create evidence only and do not duplicate reservation or infer dispatch, return, or consumption;
- only successful Remittance issuance establishes `Contenido despachado` and the approved dispatched/in-transit Stock checkpoint;
- failed issuance creates neither definitive dispatch evidence nor a Stock effect;
- pre-dispatch cancellation releases the relevant reservation without dispatch, return, consumption, billing, commercial, or accounting effects;
- correctly returned material with no unresolved difference must return to `Disponible` at the corresponding confirmed Return/re-control checkpoint;
- consumed material receives a consumption effect and must not also be treated as returned available;
- missing, damaged, or unresolved-incident material remains unavailable or under review;
- added and replacement items require explicit Stock effects rather than inferred balancing;
- every approved Stock checkpoint effect must be atomic at the domain level, audited, and idempotent: the confirmed business outcome and its required Stock effect must both succeed, or no partial accepted effect may remain, and retries must not duplicate reservations, releases, movements, Consumption, snapshots, or records; and
- no Cajas Stock checkpoint automatically creates billing, commercial, or accounting consequences.

These obligations are closed for Cajas. Their generalization to all Article Stock and their exact domain vocabulary follow the approved decisions in §12.

### 3.3 Approved proposal content

Franco approved the concrete DR-01–DR-16 baseline recorded in §12 on 2026-07-19. Derived vocabulary, boundaries, checkpoints, and progressive-depth statements in this artifact express those selections without retaining rejected alternatives. This approval does not convert domain language into technical architecture or implementation authorization.

The proposed Stock transaction ADR is evidence that viable technical families exist, but its preferred option remains unapproved and is not adopted by this domain proposal.

---

## 4. V1 goals

Stock V1 should, under the approved decisions in §12:

1. Provide an explainable company-scoped account of Stock changes caused by real operations.
2. Let users answer a bounded set of operational questions: what Article, how much, at which location or custody context, in which availability condition, and because of which operation.
3. Connect Preparation, Remittance, Consumption, and Return without making any of those domains a duplicate Stock source of truth.
4. Distinguish physical movement, temporary commitment, final use, validated return, review/hold, correction, and reversal at the domain level.
5. Prevent the same confirmed operation from producing the same Stock consequence more than once.
6. Preserve historical truth when documents are cancelled, corrected, or reversed.
7. Support a minimal useful Stock depth while leaving lot-, serial-, expiration-, and unit-level traceability for independently approved progression where not already required by the approved Cajas behavior.
8. Keep Stock consequences independent from automatic billing, accounting, costing, and fiscal consequences.

---

## 5. Explicit non-goals

Stock V1 does not propose or authorize:

- a full warehouse-management system;
- demand planning, automated replenishment, procurement optimization, or supplier scoring;
- costing methods, inventory valuation, cost of goods sold, accounting journals, or general-ledger integration;
- tax or fiscal behavior;
- automatic billing, invoicing, credit notes, collections, payments, or commercial-price consequences;
- a Product Information Management redesign or full catalog cleanup;
- universal lot, serial, GTIN, expiration, UDI, or per-unit tracking from day one;
- a complete physical-Box implementation beyond already approved Cajas product obligations;
- independent maintenance, sterilization, repair, damage, quarantine, or quality-management workflows;
- route planning, carrier management, or a logistics-management subsystem;
- production planning, manufacturing, kits as bills of materials, or assembly accounting;
- inventory import, legacy reconstruction, opening-balance migration, or invented historical movements;
- financial “cajas,” treasury, tills, cash registers, cash reconciliation, payments, or collections;
- changes to the canonical Surgery/Record flow or sensitive Cirugías surfaces; or
- schema, migrations, APIs, services, validators, permissions, Auth, UI, source code, tests, rollout, or APPLY.

---

## 6. Approved domain glossary

The glossary is conceptual and intentionally does not map terms to tables, models, endpoints, or enums.

| Term | Approved domain meaning | Decision status |
| --- | --- | --- |
| **Article** | The catalog identity of an item that may participate in operational documents. Stock eligibility follows approved `DR-01`. | Existing concept; approved under `DR-01`. |
| **Stock-controlled Article** | An explicitly eligible Article whose operational quantity or physical identity is governed by Stock rules. Articles without that eligibility are outside Stock V1. | Approved under `DR-01`. |
| **Stock** | The explainable operational position of Stock-controlled Articles by company and applicable custody/location context. It is not merely one editable number. | Canonical principle; approved under `DR-02`. |
| **Deposit / location** | A business-recognized place or custody context in which material can be located or assigned. V1 depth and terminology follow approved `DR-12`. | Existing concept; approved under `DR-12`. |
| **Stock position** | A read concept combining a Stock-controlled Article, company, applicable deposit/transit context, and approved quantity views or final disposition at a point in time. | Approved under `DR-01`, `DR-02`, and `DR-12`. |
| **Movement** | Evidence that a confirmed business operation changed physical quantity, custody/location, or final disposition. Reservation, release, and review status are explicit non-physical Stock effects. | Canonical need; approved under `DR-02` and `DR-04`. |
| **Movement cause** | The business reason and source operation that explains a Stock effect, such as supplier receipt, Remittance dispatch, Return validation, Consumption validation, transfer, inventory correction, or reversal. | Approved baseline vocabulary. |
| **On hand** | Quantity physically held in an approved company deposit context. | Approved under `DR-02`, `DR-05`, and `DR-12`. |
| **Reserved / committed** | Quantity or identified unit removed from availability at confirmed Preparation selection and held for that operation until explicit release or later disposition. | Approved under the Cajas baseline and `DR-04`. |
| **Available** | On-hand quantity or identified units eligible for confirmed Preparation selection after reservations and review blocks are considered. | Approved under `DR-02` and `DR-04`. |
| **In transit / dispatched** | Material removed from availability by successful dispatch and held in dispatched/external-custody/transit context until validated Consumption or Return. | Approved under the Cajas baseline, `DR-05`, and `DR-08`. |
| **Under review / unavailable** | Material blocked from availability because of a discrepancy, damage, missing status, unresolved incident, or pending validation. | Approved under the Cajas baseline, `DR-02`, and `DR-07`. |
| **Consumption** | Validated evidence of material actually used, producing the approved final Stock effect and never simultaneously counting the same quantity as returned available. | Existing domain concept; approved under `DR-06`. |
| **Return** | Human-validated evidence that classifies dispatched material as available, under review, consumed, damaged, or missing. A draft Return has no availability effect. | Canonical validation rule; approved under `DR-07`. |
| **Transfer** | An included V1 operation with separate dispatch and receipt checkpoints for material moving between approved company deposits through transit. | Existing movement concept; approved under `DR-08`. |
| **Inventory count** | A physical observation used to compare expected and observed Stock at an approved scope. | Existing concept; approved under `DR-09`. |
| **Adjustment / correction** | An explicitly justified Stock change used only when a more specific traceable operation cannot represent the real cause. | Approved under `DR-09`. |
| **Reversal** | A new, linked consequence that neutralizes a prior accepted Stock effect without deleting or rewriting its historical evidence. | Approved under `DR-10`. |
| **Lot / serial / expiration / GTIN / UDI** | Traceability attributes attached to applicable physical Stock, not to a reusable Box formula. Article+deposit applies throughout V1; lot/expiration applies where relevant; serial/identified-unit tracking applies to Boxes and equipment. | Approved under Cajas and `DR-11`. |
| **Box SKU / `Caja`** | A compound Article/SKU with reusable `Contenido esperado`. | Approved Cajas vocabulary. |
| **Identified Box / `Caja identificada`** | A uniquely identified physical instance of a Box SKU. | Approved Cajas vocabulary. |
| **Balance** | A calculated or reconciled quantity view whose trust must be explainable from accepted Stock history and any approved opening position under `DR-15`. | Approved under `DR-02` and `DR-15`. |

---

## 7. Approved domain boundaries

These boundaries identify business ownership, not software modules or service boundaries.

### 7.1 Articles / catalog and Stock

- **Articles/catalog owns:** shared Article identity, description, categorization, and the reusable definition of what an item is.
- **Stock owns:** the explainable operational position, commitments, physical/custody changes, disposition, and Stock history of eligible Articles.
- **Approved boundary:** only explicitly Stock-controlled Articles participate; each uses one Stock unit, configurable fractional quantities, and no general conversion engine in V1 (`DR-01`, `DR-03`).
- **Cajas inheritance:** `Caja`, versioned `Contenido esperado`, and `Caja identificada` remain managed through Articles/Stock as already approved; reusable formula data is not physical Stock evidence.

### 7.2 Deposits / locations and Stock

- **Deposits/locations own:** the business identity of places or custody contexts.
- **Stock owns:** how much or which identified material is associated with an approved place/context and why that position changed.
- **Approved boundary:** V1 supports multiple deposits per company plus a transit context; detailed internal locations may deepen later (`DR-12`).

### 7.3 Preparation and Stock

- **Preparation owns:** the operation-specific plan, selected material, comparison against expected content, control evidence, and readiness for dispatch.
- **Stock owns:** any approved commitment of material to that operation and its later Stock consequences.
- **Inherited Cajas rule:** selection reserves; preparation control/re-control records evidence only and does not itself create dispatch, return, or consumption.
- **Approved boundary:** confirmed Preparation selection reserves Stock; release is explicit and reservations must not oversubscribe availability (`DR-04`).

### 7.4 Remittance and Stock

- **Remittance owns:** the document describing what leaves, for whom, when, and under which operation/logistics context.
- **Stock owns:** the Stock consequence of a successfully issued or otherwise approved dispatch checkpoint.
- A Remittance document is not itself a Stock balance.
- **Inherited Cajas rule:** successful issuance is the dispatch checkpoint; failure has no dispatch Stock effect.
- **Approved boundary:** successful dispatch removes availability and moves material to dispatched/external-custody/transit until validated Consumption or Return; cancellation uses linked reversal/correction rather than deletion (`DR-05`, `DR-10`).

### 7.5 Consumption and Stock

- **Consumption owns:** the operation-specific declaration and validation of what was actually used.
- **Stock owns:** the corresponding final disposition and prevention of duplicate or contradictory quantity effects.
- **Approved boundary:** human validation makes Consumption effective; partial Consumption is allowed and remains linked to its Remittance (`DR-06`).

### 7.6 Return and Stock

- **Return owns:** what came back or was accounted for, its validation, exceptions, and operation evidence.
- **Stock owns:** the bounded disposition of each accepted quantity or identified unit—available, under review, consumed, damaged, or missing.
- A draft or unvalidated Return must not increase available Stock.
- **Approved boundary:** human validation is required; only the bounded dispositions above apply, drafts never create availability, and approved Cajas behavior remains intact (`DR-07`).

### 7.7 Boxes / Cajas and Stock

- “Cajas” in this scope means surgical/logistics Boxes, never financial cash boxes.
- Box master/formula and physical-unit identity follow the approved Cajas contract.
- Stock provides the physical availability, commitment, location/custody, and explicit effects needed by the approved Cajas checkpoints.
- Surgery/Record remains the operation context for Box preparation, control, dispatch, and Return.
- **Approved boundary:** V1 includes the minimum approved Cajas Stock effects and identified units, without implementing full Box-composition Stock (`DR-13`).

### 7.8 Purchases and supplier receipts

- **Purchases owns:** supplier, order, commercial terms, expected quantities, and purchasing workflow.
- **Stock owns:** accepted physical receipt and resulting Stock evidence.
- A purchase order alone must not be assumed to mean material was physically received.
- **Approved boundary:** a purchase order has no Stock effect; accepted physical receipt does. Exceptional receipt without a purchase order is allowed, with permission and audit enforcement deferred to an authorized future contract (`DR-14`).

### 7.9 Billing, accounting, and Stock

- Billing may consume verified operational evidence but does not own physical Stock truth.
- Stock effects do not automatically create invoices, charges, credit notes, collections, valuation, cost recognition, or journal entries.
- Any future financial consequence requires a separately approved domain and technical contract.
- **Approved exclusion:** V1 valuation and automatic accounting linkage remain excluded under `DR-16`.

---

## 8. Approved Stock lifecycle and checkpoints

The following is the approved domain-level sequence. It is not a state machine, transaction design, or mandatory path for every Stock-controlled Article.

```text
Catalog eligibility
→ opening/received Stock evidence
→ located and potentially available
→ reserved at confirmed Preparation selection
→ prepared and controlled (evidence checkpoint; no physical effect for Cajas)
→ successfully dispatched / in transit
→ validated consumption and/or validated Return disposition
→ available, under review, consumed, transferred, or otherwise explicitly resolved
→ correction or reversal only through linked historical evidence
```

Approved blueprint checkpoints:

1. **Stock eligibility:** the Article is recognized as Stock-controlled.
2. **Entry acceptance:** a supplier receipt, validated Return from an external context, approved positive correction, or approved opening position under `DR-15` establishes quantity or identity.
3. **Reservation:** confirmed Preparation selection commits eligible Stock, removes it from availability, prohibits oversubscription, and requires explicit release when the commitment ends before disposition.
4. **Preparation control:** operational evidence confirms selection; under approved Cajas behavior it creates no additional Stock effect.
5. **Dispatch:** a successful Remittance checkpoint removes availability and moves material to dispatched/external-custody/transit. A failed checkpoint has no effect.
6. **In-transit or external-custody period:** dispatched material remains explicitly unresolved until an approved later disposition.
7. **Consumption validation:** human-validated, Remittance-linked Consumption may be partial and gives used material its final consumption effect once.
8. **Return validation:** human-validated returned/accounted material is classified as available, under review, consumed, damaged, or missing; a draft has no availability effect.
9. **Transfer:** included V1 transfer uses separate dispatch and receipt checkpoints through transit without changing company total.
10. **Inventory reconciliation:** observed differences are reviewed before any correction is accepted.
11. **Reversal/correction:** prior history remains visible; the corrective consequence is separately attributable.

The checkpoint definitions above form the approved domain baseline under the relevant Decision Register rows. They do not select a state machine or transaction implementation.

---

## 9. Approved movement taxonomy

The approved taxonomy separates business causes from implementation representations. It does not authorize SPEC or technical implementation.

### 9.1 Approved physical or disposition movement families

| Approved family | Example business cause | Approved quantity/custody baseline | Decision reference |
| --- | --- | --- | --- |
| **Supplier receipt** | Accepted supplier Remittance or receiving control | Increase accepted company Stock at a location/context. | `DR-14` |
| **Operational dispatch** | Successful surgical or other outbound Remittance | Remove material from availability and move it to dispatched/external-custody/transit until validated Consumption or Return. | `DR-05` |
| **Validated Return disposition** | Human-confirmed Return after dispatch | Classify material as available, under review, consumed, damaged, or missing; never infer availability from a draft. | `DR-07` |
| **Validated consumption** | Human-confirmed partial or complete material use linked to a Remittance | Reduce the outstanding usable quantity exactly once and never also return it to available Stock. | `DR-06` |
| **Transfer dispatch / receipt** | Movement between company deposits | Use separate dispatch and receipt checkpoints through transit while preserving company total. | `DR-08`, `DR-12` |
| **Inventory correction** | Accepted difference after a physical count | Adjust expected Stock to an approved observation with reason and evidence. | `DR-09` |
| **Operational correction** | Non-count correction where no specific source operation applies | Explicit, exceptional change; not a shortcut around Remittance, Consumption, Return, or Transfer. | `DR-09` |
| **Reversal** | Cancellation or correction of an accepted prior effect | Neutralize or supersede a prior effect through linked evidence rather than deletion. | `DR-10` |
| **Opening position** | Approved initial adoption of Stock truth | Establish a starting point without inventing prior movements. | `DR-15` |

### 9.2 Approved non-physical Stock effects

These may affect availability without being physical movements:

- **Reserve** — at confirmed Preparation selection, commit Stock to an operation, remove it from availability, and prohibit oversubscription.
- **Release** — explicitly remove an unconsumed commitment under approved conditions.
- **Hold / under review** — prevent availability while a discrepancy or incident remains unresolved.
- **Resolve hold** — restore availability or apply another explicit disposition after review.

These are non-physical Stock effects, distinct at domain level from physical/disposition movements. This distinction does not select a ledger or persistence design.

### 9.3 Explicitly rejected implicit effects

Except where already fixed by the approved Cajas contract, these rejected implicit effects are approved boundaries under the corresponding Decision Register rows:

- Budget approval does not automatically change Stock.
- Purchase-order creation does not mean supplier receipt.
- Preparation control does not automatically mean dispatch or consumption.
- Remittance draft creation does not mean material left.
- Return draft creation does not make material available.
- Comparison does not silently create balancing movements.
- Billing or invoice issuance does not silently consume or release Stock.
- Editing a balance does not replace a traceable operation when that operation exists.

---

## 10. Approved quantity semantics

The quantity semantics in this section are the approved domain baseline. They do not select a schema, calculation implementation, or technical representation.

### 10.1 Approved quantity views

Stock V1 distinguishes:

- **physical/on-hand quantity** — material considered under company custody;
- **reserved quantity** — material committed to active operations;
- **available quantity** — material eligible for new commitment;
- **dispatched/in-transit quantity** — material that left an origin checkpoint but lacks final disposition;
- **under-review quantity** — material physically known or expected but blocked from availability;
- **final disposition, as applicable** — consumed, damaged, or missing material after human validation.

### 10.2 Approved quantity relationships

- Available Stock excludes reserved, in-transit, and under-review Stock.
- Successful dispatch removes material from availability and places it in dispatched/external-custody/transit until validated Consumption or Return.
- Human-validated final disposition classifies material as consumed, damaged, or missing where applicable.
- Fungible Stock-controlled Articles use quantities; Boxes and equipment use serial/identified-unit availability where applicable.
- Aggregates must never permit one quantity or identified unit to be counted twice.

### 10.3 Approved quantity decision boundaries

1. Minimal V1 must expose on hand, reserved, available, in transit, under review, and final disposition where applicable.
2. Dispatch removes availability and places material in dispatched/external-custody/transit until validated Consumption or Return.
3. Confirmed Preparation selection creates reservation; explicit release removes it; oversubscription is prohibited.
4. V1 uses one Stock quantity unit per Article, supports configurable fractional quantities, and excludes a general unit-conversion engine.
5. Partial Consumption is human-validated, linked to its Remittance, and cannot exceed its approved originating quantity.
6. Return is human-validated and uses only the approved available, under-review, consumed, damaged, or missing dispositions.

These approved decision boundaries map to `DR-02`, `DR-03`, `DR-05`, `DR-06`, and `DR-07`.

---

## 11. Approved domain invariants

### 11.1 Existing authoritative invariants

The following are already required at principle level:

- **Company isolation:** Stock from one company must not be visible, committed, or changed as Stock of another company.
- **Explainability:** a Stock change must have a recognizable business cause; Stock cannot be only an unexplained manually maintained balance.
- **Critical-action auditability:** critical Stock changes require attributable history.
- **Validated Return:** material does not become available merely because a Return was drafted or inferred.
- **Cajas no-double-effect:** approved Cajas confirmations and retries must not duplicate reservations, releases, dispatch, Return, Consumption, snapshots, or records.
- **No automatic financial effect:** approved Cajas Stock checkpoints do not automatically create billing, commercial, or accounting entries.

### 11.2 Franco-approved domain invariants

1. **One accepted cause, one Stock consequence (`DR-02`):** the same confirmed source operation must not apply the same Stock effect twice, including retries.
2. **No contradictory disposition (`DR-06`, `DR-07`):** the same dispatched quantity cannot simultaneously be classified as consumed and returned available.
3. **Origin ceiling (`DR-05`–`DR-07`):** cumulative dispatch, Consumption, Return, and unresolved quantities cannot exceed the approved originating quantity without an explicit correction path.
4. **Historical truth (`DR-10`):** accepted Stock evidence is not destructively rewritten; cancellation or correction adds linked evidence.
5. **No orphan effect (`DR-02`):** every accepted Stock effect identifies its company, Article or physical identity, quantity/unit where applicable, business cause, effective time, actor, and relevant operation/document context.
6. **Location conservation (`DR-08`):** a completed internal Transfer does not change company total; incomplete transfer remains explicitly in transit or unresolved.
7. **Reservation integrity (`DR-04`):** one exclusive physical unit cannot be reserved by two active operations; fungible reservations cannot silently oversubscribe approved availability.
8. **Validation before availability (`DR-07`, `DR-09`):** Returns and inventory differences do not increase available Stock before required human review.
9. **Traceability attachment (`DR-11`):** lot/serial/expiration/GTIN/UDI data, where required, belongs to applicable physical Stock evidence and is preserved through later history.
10. **Formula/history separation (`DR-13`):** editing reusable `Contenido esperado` never rewrites prior physical selection, control, dispatch, Consumption, or Return evidence.
11. **Opening honesty (`DR-15`):** initial Stock adoption uses an explicit dated opening position and never fabricates prior operational movements.
12. **Adjustment last resort (`DR-09`):** an adjustment cannot replace a more specific Remittance, Consumption, Return, Transfer, or reversal when that operation is known.
13. **Cross-domain neutrality (`DR-16`):** no Stock confirmation automatically creates valuation, billing, accounting, collection, or fiscal evidence.

Approval of these invariants defines required observable business behavior only. It does not approve how atomicity, concurrency, idempotency, audit, or persistence are implemented.

---

## 12. Decision Register — approved by Franco on 2026-07-19

Franco approved all **16 concrete decisions**, `DR-01` through `DR-16`, exactly according to the baseline below on 2026-07-19. The rows contain no unresolved option family; they must not be narrowed or expanded without a new decision. Approval closes the Stock V1 domain blueprint and authorizes only the next documentary UX blueprint phase. It does not authorize SPEC, DESIGN, schema, migration, backend, API, permissions, Auth, UI implementation, Cajas implementation, Cirugías changes, TASKS, or APPLY.

| ID | Approved decision | Accepted baseline | Approval result |
| --- | --- | --- | --- |
| `DR-01` | **Stock-controlled scope.** | Only explicitly Stock-controlled Articles participate in Stock V1. | **Approved by Franco — 2026-07-19.** |
| `DR-02` | **Core quantity vocabulary and effect taxonomy.** | V1 distinguishes on hand, reserved, available, in transit, under review, and final disposition where applicable. | **Approved by Franco — 2026-07-19.** |
| `DR-03` | **Quantity units.** | One Stock unit per Article; fractional quantities are configurable; no general conversion engine exists in V1. | **Approved by Franco — 2026-07-19.** |
| `DR-04` | **Reservation scope and lifecycle.** | Confirmed Preparation selection reserves Stock; release is explicit; oversubscription is prohibited. | **Approved by Franco — 2026-07-19.** |
| `DR-05` | **Remittance dispatch semantics.** | Successful dispatch removes availability and moves material to dispatched/external-custody/transit until validated Consumption or Return. | **Approved by Franco — 2026-07-19.** |
| `DR-06` | **Consumption semantics and timing.** | Consumption is human-validated, may be partial, and remains linked to its Remittance. | **Approved by Franco — 2026-07-19.** |
| `DR-07` | **Return validation and disposition.** | Human-validated disposition is bounded to available, under review, consumed, damaged, or missing; a draft never creates availability; approved Cajas behavior is preserved. | **Approved by Franco — 2026-07-19.** |
| `DR-08` | **Transfer and transit semantics.** | Transfers are included with separate dispatch and receipt checkpoints through transit. | **Approved by Franco — 2026-07-19.** |
| `DR-09` | **Inventory count and adjustment policy.** | Count observation is separate from a justified, reviewed, and audited correction. | **Approved by Franco — 2026-07-19.** |
| `DR-10` | **Cancellation, correction, and reversal behavior.** | Accepted Stock history is never deleted; correction or reversal creates linked evidence. | **Approved by Franco — 2026-07-19.** |
| `DR-11` | **Traceability depth for minimal V1.** | Hybrid traceability: Article+deposit always; lot/expiration where applicable; serial/identified unit for Boxes and equipment. | **Approved by Franco — 2026-07-19.** |
| `DR-12` | **Deposit/location depth.** | Multiple deposits per company plus a transit context; detailed internal locations may deepen later. | **Approved by Franco — 2026-07-19.** |
| `DR-13` | **Cajas inclusion in the first Stock increment.** | Include minimum approved Cajas Stock effects and identified units, without full composition Stock implementation. | **Approved by Franco — 2026-07-19.** |
| `DR-14` | **Purchases and supplier receipt boundary.** | A purchase order has no Stock effect; accepted physical receipt does; exceptional no-PO receipt is allowed with future permission and audit enforcement. | **Approved by Franco — 2026-07-19.** |
| `DR-15` | **Initial adoption and historical truth.** | Use a dated, reconciled opening position; never invent historical movements. | **Approved by Franco — 2026-07-19.** |
| `DR-16` | **Financial separation.** | V1 has no costing, valuation, accounting, billing, collection, or fiscal effects. | **Approved by Franco — 2026-07-19.** |

### 12.1 Decision discipline

- Franco approved every row independently and collectively exactly as recorded above.
- The approved rows are concrete domain selections; no rejected option remains available by implication.
- These product decisions are recorded before any technical options may be compared.
- Approval closes the domain blueprint and authorizes only the next documentary UX blueprint phase.
- No decision in this register authorizes schema, migration, APIs, permissions, Auth, UI, implementation, or APPLY.

---

## 13. Progressive-depth proposal — approved independently

### 13.1 Approved minimal Stock V1 depth

**Approved by Franco on 2026-07-19 as part of the DR-01–DR-16 baseline:**

Start with the smallest Stock depth that can explain the central operational circuit:

- explicitly Stock-controlled Articles only;
- multiple deposits per company plus a transit context;
- one Stock quantity unit per Article, configurable fractions, and no general conversion engine;
- accepted physical supplier receipt—including exceptional no-PO receipt under future permission/audit enforcement—and a dated reconciled opening position;
- reservation at confirmed Preparation selection with explicit release and no oversubscription;
- successful Remittance dispatch effect;
- validated Consumption effect;
- validated Return disposition;
- Transfer with separate dispatch and receipt checkpoints through transit;
- count observation separated from justified, reviewed, and audited correction; linked reversal/correction without deletion;
- on-hand, reserved, available, in-transit, under-review, and applicable final-disposition views;
- Article+deposit traceability throughout, lot/expiration where applicable, and serial/identified-unit depth for Boxes and equipment; and
- minimum Cajas effects and identified units without full Box-composition Stock implementation.

### 13.2 Deferred later depth

Later, separately approved increments may add:

- broader lot and expiration coverage beyond the applicable V1 classes;
- serial or unique-unit tracking beyond Boxes and equipment;
- GTIN/UDI capture and scanning;
- detailed internal locations within deposits and deeper branch logistics;
- external custody, consignment, loan, or institution-held Stock;
- detailed Box composition Stock and per-component reconciliation;
- cycle counting and richer inventory programs;
- replenishment and purchase suggestions;
- maintenance, sterilization, repair, quarantine, or quality workflows; and
- costing, valuation, or accounting integration under separate domain and architecture approval.

### 13.3 Why progressive depth is proposed

This sequence preserves the canonical requirement that Stock be transversal and explainable while avoiding a first increment dominated by rare traceability cases, full warehouse behavior, or financial accounting. It also prevents the prototype's current soft references from being treated as sufficient physical truth.

Approval of progressive depth approves only the product sequencing principle. It does not approve a technical architecture, delivery plan, or implementation.

---

## 14. Risks and proposal-level controls

| Risk | Proposal-level control |
| --- | --- |
| A balance becomes the only truth | Require cause-based explainability and route manual differences through approved opening/correction decisions. |
| Dispatch is counted as both outbound loss and later Consumption | Apply approved `DR-05` and `DR-06` together and enforce non-contradictory disposition as a domain invariant. |
| Returned material becomes available without inspection | Preserve human validation and explicit Return disposition. |
| Reservations are confused with physical movement | Keep reservation and explicit release labeled as non-physical Stock effects triggered by confirmed Preparation selection; prohibit oversubscription. |
| A retry or duplicate confirmation changes Stock twice | Enforce the approved one-cause/one-consequence invariant; technical mechanism remains unauthorized. |
| Cross-company or cross-location Stock leaks | Preserve company isolation and apply the approved `DR-12` location semantics in any later authorized specification. |
| Adjustments hide known operational causes | Make adjustment a last-resort, reviewed, attributable cause. |
| Cancellation destroys history | Apply approved `DR-10`: use linked reversal/correction and prohibit silent rewrite. |
| Cajas decisions are accidentally reopened | Treat approved Cajas obligations as inherited constraints and limit `DR-13` to sequencing/depth. |
| Cajas is mistaken for treasury | Explicitly exclude financial cash boxes, payments, collections, and reconciliation. |
| Stock creates unapproved financial effects | Apply the approved `DR-16` exclusion; every financial integration still requires separate future approval. |
| Fine traceability inflates V1 | Apply the approved bounded `DR-11` profile and progressive-depth sequence. |
| Existing soft references are treated as historical Stock truth | Apply approved `DR-15` opening/reconciliation boundaries; never invent historical movements. |

---

## 15. Acceptance conditions and T1 closure

T1 is closed as an approved proposal-writing task after independent read-only verification and Franco's DR-01–DR-16 approval confirmed that:

1. This single artifact records Franco's approval and the exact authorization boundary.
2. The business need and current prototype/backend limitations are stated without treating mock or soft-reference data as final Stock truth.
3. V1 goals and explicit non-goals are bounded around the canonical operation.
4. The glossary is domain-level and does not map concepts to database tables, models, endpoints, or enums.
5. Boundaries among Stock, Articles/catalog, Deposits/locations, Preparation, Remittance, Consumption, Return, Cajas, purchases, billing, and accounting are explicit.
6. Approved Cajas product obligations are preserved as inherited constraints and are not reopened as undecided.
7. Movement families and quantity semantics match the concrete approved baseline without retaining rejected alternatives.
8. Canonical invariants are distinguishable from the Franco-approved domain invariants.
9. The lifecycle is described through domain checkpoints without selecting a transaction, ledger, persistence, API, or state-machine implementation.
10. Progressive depth is an independently approved proposal rather than a hidden decision.
11. The Decision Register contains exactly **16 approved decisions**, `DR-01` through `DR-16`.
12. No technical architecture is selected, including the proposed direction in `ADR-CAJAS-STOCK-TRANSACTIONS.md`.
13. All implementation and protected-file boundaries in §16 remain explicit.
14. Only `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` was created by this task.

T1 closure means the Stock V1 domain blueprint and DR-01–DR-16 baseline are approved. It authorizes only the next documentary UX blueprint phase and does not authorize SPEC, DESIGN, schema, migration, backend, API, permissions, Auth, UI implementation, Cajas implementation, Cirugías changes, TASKS, or APPLY.

---

## 16. Explicit blocked work

Following Franco's Decision Register approval, only the next documentary UX blueprint phase is authorized. All of the following remain blocked unless separately approved:

- Stock SPEC, DESIGN, TASKS, and APPLY;
- technical architecture selection, including Stock ledger, journal, reservation, projection, transaction, concurrency, idempotency, and audit-storage mechanisms;
- Prisma schema or any other data-model change;
- database migration, seed, import, reconciliation, opening-balance load, or provider change;
- APIs, routes, Server Actions, services, validators, integrations, background jobs, or storage;
- permission matrix, capability implementation, multi-company access design, security changes, or Auth changes;
- UI/UX implementation or modification of Articles, Stock, Deposits, Preparation, Remittance, Consumption, Return, Comparison, Cajas, purchases, billing, or accounting surfaces;
- implementation of Cajas or financial cash-box functionality;
- changes to Cirugías, Surgery/Record, Expediente, their hooks, store, types, or sensitive components;
- production data creation, catalog cleanup, legacy migration, or rollout; and
- any implementation command, protected-file edit, or APPLY activity.

No approval of this proposal alone lifts any of those blocks.

---

## 17. Approval and closure statement

`STOCK-V1-DOMAIN-BLUEPRINT-001` is approved and closed. Franco approved DR-01–DR-16 on 2026-07-19 and authorized continuation to the next documentary UX blueprint phase only. This approval does not adopt any technical architecture or authorize SPEC, DESIGN, schema, migration, backend, API, permissions, Auth, UI implementation, Cajas implementation, Cirugías changes, TASKS, or APPLY.
