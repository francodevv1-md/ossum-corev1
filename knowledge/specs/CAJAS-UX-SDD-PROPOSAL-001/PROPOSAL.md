# Proposal — CAJAS-UX-SDD-PROPOSAL-001

Status: approved by Franco; SPEC and DESIGN exist and passed joint verification; TASKS and APPLY are not authorized  
Change: `CAJAS-UX-SDD-PROPOSAL-001`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact chain: **PROPOSAL** → SPEC → DESIGN → TASKS → APPLY

---

## 1. Summary

Define a bounded V1 UX direction for surgical Boxes as compound Articles/SKUs that participate in Stock and in the central Surgery/Record flow. The future experience should let operators understand the reusable expected formula, identify each physical unit, select the actual physical components used for an operation, control preparation, freeze what was dispatched, and reconcile the return by exception.

The intended outcome is sufficient operational traceability without creating a rigid Box subsystem or a daily workflow that is too costly to maintain. This proposal establishes product and information-architecture boundaries only. It does not prescribe data models, APIs, component structure, storage, permissions, or implementation architecture.

In this proposal, **Box** always means a surgical/logistics compound SKU and its physical units. It never means a financial cash box, treasury, till, cash register, cash opening/closing, reconciliation, or payment-management capability.

---

## 2. User problem

Operational teams need to answer a connected set of questions that the current concept does not present clearly:

- What kind of box is this and what is its expected reusable composition?
- Which physical box unit is being handled?
- Which physical instruments, implants, motors, equipment, disposables, or other Articles were actually selected?
- Was that real composition checked before dispatch?
- What composition was definitively issued on the remittance?
- What was consumed, missing, added, or replaced when the box returned?
- Can the unit be considered available, or does it remain with differences?

Without a clear separation between the compound SKU, its expected formula, physical units, selected physical stock, and operation-specific snapshots, users risk treating an ideal formula as if it were the traceable dispatched contents. At the other extreme, a highly specialized lifecycle for every incident would impose a level of operational complexity that Franco has explicitly rejected for V1.

---

## 3. Intended outcome

The proposed V1 should provide one understandable operational path:

```txt
Box compound SKU and formula
→ physical unit from Articles/Stock
→ assign/select for a Surgery/Record
→ prepare actual physical components
→ control and preserve a controlled snapshot
→ record any later changes and re-control
→ issue remittance and preserve the definitive dispatch snapshot
→ return control by exception
→ Available or With differences
```

Users should be able to move through this path with minimal repeated entry, strong visual distinction between expected and actual composition, and explicit checkpoints where operational evidence becomes stable.

---

## 4. Approved product commitments

The following decisions are fixed inputs to all later phases and must not be reinterpreted as optional design suggestions:

1. A Box is an Article/SKU of compound type, not a rigid isolated entity or a separate product subsystem.
2. Its flexible formula contains component Articles and expected quantities. Components may include instruments, implants, motors, equipment, disposables, or other Articles.
3. Physical units are created in Stock/Articles under a shared base SKU and are identified by a unique serial or internal code.
4. The expected formula is separate from selected physical components. Lot, serial, GTIN, expiration, and related traceability belong to the selected physical stock/components, not to the reusable formula.
5. Preparation has two checkpoints: a controlled snapshot after preparation control and a definitive dispatch snapshot when the remittance is issued. Any change between them requires history and re-control.
6. V1 remains operationally simple. Return control starts from the dispatched composition and records only consumed, missing, added or replaced items, plus an optional note, before confirmation. The result is `Available` or `With differences`.
7. Sterilization, maintenance, damage, and quarantine are notes or simple incidents in V1, not independent workflows.
8. Example records may be described only for illustration. No mass import or production implementation is authorized.

These commitments describe product behavior and vocabulary. They do not authorize or imply a particular schema, relationship model, endpoint, state machine implementation, component hierarchy, or persistence strategy.

---

## 5. Proposed information architecture

### 5.1 Boxes list

The Boxes entry point should present compound Box SKUs without making them look like an independent catalog outside Articles. It should help operators locate a Box SKU, understand its general purpose, see its physical units, and identify whether units are available or require attention.

The list should preserve the relationship to Articles/Stock and provide a clear path to the Box/SKU detail. Exact columns, filters, bulk actions, density, and visual layout are later design decisions.

### 5.2 Box/SKU detail

The detail should provide a stable overview of the shared compound Article/SKU and separate three concerns:

1. **Definition:** the shared identity and description of the Box as an Article/SKU.
2. **Expected formula:** reusable component Articles and expected quantities.
3. **Physical units:** individually identified units created and managed through Articles/Stock.

Operation-specific preparation, dispatch, and return evidence should be reachable in context but must not be mistaken for editable master formula data.

### 5.3 Physical units

Physical-unit views should identify the base Box SKU, the unique serial/internal code, and enough current operational context to locate or act on the unit.

The Box experience may expose these units, but their creation belongs to the Stock/Articles process. This proposal does not create a separate Box-only unit registry.

### 5.4 Formula viewing and editing concept

The formula experience should show component Article and expected quantity as the reusable expectation. It should support a future, intentionally bounded editing journey while making clear that editing the formula does not edit a previously selected, controlled, dispatched, or returned composition.

Lot, serial, GTIN, expiration, and equivalent traceability fields must not be requested as reusable formula attributes. They enter the operational journey only when physical stock/components are selected.

The exact editing interaction, version presentation, validation rules, and authority to edit remain for later SPEC/DESIGN and approval.

### 5.5 Surgery/Record operational context

Preparation, control, dispatch, and return belong to the central Surgery/Record circuit rather than to an isolated Box lifecycle. The Surgery/Record should remain the place where users understand what was prepared, dispatched, consumed, returned, and left different for that operation.

The Boxes area provides master and physical-unit context; the Surgery/Record flow provides operation-specific execution and evidence. Navigation may connect both directions without duplicating ownership of the same facts.

---

## 6. Proposed V1 journeys

### Journey A — Find and understand a Box

1. The user enters Boxes and locates a compound Box SKU.
2. The user opens its detail and sees the Box definition, expected formula, and physical units as distinct sections.
3. The user can inspect a physical unit by its unique serial/internal code.

**Boundary:** viewing a physical unit in Boxes does not move its creation away from Articles/Stock.

### Journey B — Review or propose a formula change

1. The user reviews component Articles and expected quantities.
2. If authorized in a later contract, the user enters a bounded formula-editing experience.
3. The experience reinforces that this is an expected reusable composition, not a selection of lots, serials, GTINs, or expirations.
4. Existing operation snapshots remain historical facts and are not rewritten by formula changes.

**Boundary:** this proposal does not decide edit permissions, version mechanics, approval rules, or technical persistence.

### Journey C — Prepare and control for a Surgery/Record

1. From the Surgery/Record preparation context, the user chooses the relevant physical Box unit.
2. The expected formula acts as a preparation reference.
3. The user selects the actual physical components from Stock, with traceability attached to those selected components where applicable.
4. The user resolves or explicitly acknowledges relevant differences from the expected formula.
5. Preparation control confirms the real selected composition and produces the controlled snapshot.

**Boundary:** the expected formula guides the work but never substitutes for the selected physical composition.

### Journey D — Change after control and dispatch

1. If the composition changes after preparation control, the experience identifies the controlled snapshot as no longer sufficient for dispatch.
2. The change is retained in history.
3. The changed composition requires re-control.
4. Issuing the remittance freezes the definitive composition actually dispatched.

**Boundary:** UI convenience must not allow an unrecorded change or bypass the required re-control between the two checkpoints.

### Journey E — Return control by exception

1. The user starts from the definitive dispatched composition rather than rebuilding the box from zero.
2. The user records consumed items, missing items, and any added or replaced items.
3. The user may add one optional note, including a simple incident such as sterilization, maintenance, damage, or quarantine context.
4. The user reviews the exceptions and confirms.
5. The result is either `Available` or `With differences`.

**Boundary:** V1 does not branch those incident notes into independent workflows or require exhaustive classification when there is no exception.

---

## 7. Bounded V1 scope

This proposal includes:

- information architecture for a Boxes list and Box/SKU detail;
- visibility of physical units associated with a shared base Box SKU;
- a concept for viewing and later editing the expected formula;
- contextual connection between Boxes, Articles/Stock, and Surgery/Record;
- selection of the actual physical Box unit and physical components during preparation;
- clear separation of expected formula, current selection, controlled snapshot, and definitive dispatch snapshot;
- history and mandatory re-control when composition changes after control;
- remittance issuance as the definitive dispatch checkpoint;
- simple return control by exception;
- final operational result of `Available` or `With differences`;
- notes/simple incidents for sterilization, maintenance, damage, and quarantine; and
- at most a small illustrative example in future review material, with no import or production data creation.

---

## 8. Explicit non-goals

- No Prisma schema, database model, migration, seed, fixture, or production data change.
- No backend, API, service, validator, permission, audit, Auth, storage, or multi-company implementation design.
- No source-code, component, route, state-management, or technical architecture prescription.
- No implementation of Articles, Stock, Boxes, preparation, remittances, consumption, returns, or traceability.
- No rigid Box-only product catalog, inventory registry, or separate product subsystem.
- No financial cash box, treasury, till, point-of-sale cash drawer, opening/closing, cash count, bank reconciliation, collection, payment, or accounting workflow.
- No mass import, Districorr migration, bulk code generation, production example creation, or catalog cleanup.
- No independent V1 workflow for sterilization, maintenance, damage, quarantine, repair, quality control, or asset servicing.
- No complete warehouse-management, purchasing, replenishment, route logistics, or fine-grained stock movement redesign.
- No change to the canonical Surgery/Record flow or refactor of sensitive Surgery files.
- No decision that every Surgery uses exactly one Box, that every Box has one remittance, or that every return has one consumption; such cardinality and exception rules are not approved here.
- No automatic stock mutation, availability release, billing effect, or commercial consequence defined by this proposal.
- No automatic progression to SPEC, DESIGN, TASKS, or APPLY after proposal review.

---

## 9. Constraints and proposal boundaries

1. **Operational simplicity:** defaults, comparison, and exception entry should reduce daily effort; the experience must not require users to restate unchanged dispatched contents.
2. **Vocabulary clarity:** Box SKU, formula, physical unit, selected physical component, controlled snapshot, and dispatch snapshot must remain visibly distinct.
3. **Traceability placement:** lot, serial, GTIN, expiration, and related identifiers belong to selected physical stock/components, never to the reusable formula.
4. **Historical integrity:** later formula edits or preparation changes must not silently rewrite prior controlled or dispatched evidence.
5. **Central-flow alignment:** operation-specific work remains connected to the Surgery/Record and to remittance, consumption, and return concepts.
6. **Progressive depth:** Stock, Boxes, and traceability are transversal, but V1 depth must remain bounded and maintainable.
7. **Human approval:** any later business rule, permission model, architecture, schema, migration, or sensitive Surgery change requires its own approved phase and applicable OSSUM COR guardrails.

---

## 10. Dependencies

- Canonical Articles/Stock concepts must provide the vocabulary and source for base SKUs, physical units, component selection, and relevant traceability.
- The central Surgery/Record preparation context must provide the operation in which actual composition is selected and controlled.
- Remittance issuance must provide the business checkpoint that establishes the definitive dispatch snapshot.
- Consumption and return concepts must be able to reference the dispatched composition without forcing a one-to-one relationship not approved by this proposal.
- Later SPEC/DESIGN work must reconcile the proposed journeys with current product surfaces and obtain explicit ownership before touching sensitive files.
- Franco approved this proposal, and the existing SPEC and DESIGN passed joint verification.

These are product dependencies, not commitments to a particular implementation sequence or architecture.

---

## 11. Risks and mitigations

| Risk | Proposal-level mitigation |
| --- | --- |
| Boxes are implemented as an isolated subsystem | Keep Box identity rooted in Articles/SKU and physical units rooted in Articles/Stock across all later artifacts. |
| Expected formula is confused with actual traceable contents | Use distinct terminology and surfaces; never place lot, serial, GTIN, or expiration on the reusable formula. |
| Users believe the controlled snapshot is the final dispatch record | Present the two checkpoints explicitly and identify remittance issuance as definitive. |
| A post-control change is dispatched without review | Require visible history and re-control before the definitive dispatch checkpoint. |
| Return entry becomes too burdensome | Start from dispatched composition and capture only exceptions plus an optional note. |
| `Available` hides unresolved differences | Keep `With differences` as the explicit alternate result; later SPEC must define confirmation signals without inventing new workflows. |
| Incident notes grow into unapproved lifecycle systems | Keep sterilization, maintenance, damage, and quarantine as notes/simple incidents in V1. |
| “Cajas” is mistaken for treasury or cash management | State the surgical/logistics meaning in navigation and artifacts; keep all financial cash/treasury capabilities out of scope. |
| Illustrative records are treated as import authorization | Label examples as illustrative and limit them to one or a few review records; prohibit mass import and production creation. |
| Later phases prematurely prescribe schema or backend architecture | Require a separate reviewed SPEC/DESIGN and Franco approval under existing guardrails. |

---

## 12. Acceptance signals for the proposal direction

The direction is successful enough to proceed to later SDD review when Franco and representative operators can confirm that:

1. They understand a Box as a compound Article/SKU rather than a separate product system.
2. They can distinguish the reusable expected formula from physical units and actual selected components.
3. They understand where lot, serial, GTIN, expiration, and related traceability are captured.
4. They can identify the controlled preparation checkpoint and the definitive remittance/dispatch checkpoint.
5. They understand that a change after control is historical and requires re-control.
6. They can complete the proposed return journey by recording only consumed, missing, added/replaced items and an optional note.
7. They consider `Available` and `With differences` sufficient V1 outcomes without separate incident workflows.
8. They can locate Box master context in Articles/Stock and operation-specific evidence in the Surgery/Record flow without perceiving duplicate sources of truth.
9. They do not interpret the module as financial cash/treasury.
10. The direction can be explored further without assuming schema, backend architecture, permissions, cardinality, or implementation details.

These are review signals, not an implementation acceptance test suite.

---

## 13. Open questions for later SPEC/DESIGN

The following questions are intentionally unresolved and must not be answered by inventing business rules during this proposal phase:

1. Which user-facing labels best distinguish the Box SKU, physical unit, expected formula, selected composition, controlled snapshot, and dispatched composition in everyday Spanish?
2. Which fields and filters are essential on the Boxes list for V1, and which should remain progressively disclosed?
3. What minimal summary should a physical-unit view expose before opening its operation history?
4. How should formula changes be presented over time without implying that prior snapshots changed?
5. What is the smallest usable interaction for acknowledging an expected-versus-selected preparation difference?
6. How should operators see who controlled, changed, re-controlled, and dispatched without overloading the primary workflow?
7. What visual treatment best communicates `With differences`, and what later authorized action—if any—is required before it becomes `Available`?
8. How should multiple Boxes, multiple remittances, partial returns, or cross-operation reuse be handled if representative V1 cases require them?
9. Which roles may view or edit formulas, select stock, control preparation, issue remittances, and confirm returns? This requires separate permission approval.
10. Which existing product surfaces should host each journey, given that any sensitive Surgery/Record refactor requires a separate Task Brief and explicit approval?

Any answer that introduces a new business rule, schema, backend contract, Auth/permission model, or independent incident workflow must return to Franco for approval before being incorporated.

---

## 14. Proposal decision

`CAJAS-UX-SDD-PROPOSAL-001` is a coherent bounded direction for a future V1 UX/UI: Boxes remain compound Articles/SKUs, physical identification remains in Articles/Stock, operation-specific composition remains in the Surgery/Record circuit, and return control remains exception-driven and simple.

The proposal is approved by Franco, and its SPEC and DESIGN passed joint verification. It does not authorize TASKS, implementation, schema/backend work, financial treasury scope, or changes to sensitive Surgery surfaces.
