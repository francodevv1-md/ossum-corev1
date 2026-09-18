# SPEC — CAJAS-UX-SDD-PROPOSAL-001

Status: **specified; DG-01–DG-07 and CD-01–CD-10 synchronized; ready for independent verification**
Change: `CAJAS-UX-SDD-PROPOSAL-001`
Language: English
Sources: Franco-approved `PROPOSAL.md`; approved Cajas lifecycle decisions available on 2026-07-17; Franco-approved DG-01–DG-07 decisions recorded in Engram #2816, #2817, #2824, #2826, #2827, #2828, #2836, with aggregate closure in #2837; Franco-approved `DECISIONS-CD01-CD10.md` addendum dated 2026-07-20
Artifact chain: PROPOSAL → **SPEC** → DESIGN → TASKS → APPLY

---

## 1. Purpose

This specification defines the observable V1 user experience for surgical/logistics Boxes as compound Articles/SKUs integrated with Articles, Stock, and the Surgery/Record circuit. It covers discovery, expected-composition visibility, preparation from physical stock, preparation control, post-control changes, definitive dispatch evidence, and exception-driven return control.

This specification defines product behavior only. It does not prescribe persistence, APIs, routes, components, data models, provider choices, role mappings, stock-accounting architecture, or implementation architecture.

## 2. Scope boundaries

**SCOPE-01.** The product MUST present a Box as a compound Article/SKU and MUST NOT present Boxes as a rigid isolated catalog, inventory registry, or product subsystem.

**SCOPE-02.** Every Boxes surface MUST use “Box” only for a surgical/logistics compound SKU or one of its physical units; it MUST NOT expose financial cash, treasury, till, collection, payment, or reconciliation behavior.

**SCOPE-03.** Operation-specific selection, preparation, control, re-control, dispatch, and return MUST be hosted by the `Cajas` section of the relevant Surgery/Record, while shared SKU definition, expected formula, and physical-unit identity MUST be managed through Articles/Stock.

**SCOPE-04.** V1 MUST NOT require mass import, legacy Districorr migration or code preservation, production example creation, or a separate workflow for sterilization, maintenance, damage, quarantine, repair, or quality control.

**SCOPE-05.** Any examples shown in review or product guidance MUST be labeled illustrative and MUST NOT imply real inventory, import authorization, or a mandatory component catalog.

## 3. Product vocabulary and information separation

- **Box SKU — public label `Caja`:** the shared compound Article/SKU definition.
- **Expected formula — public label `Contenido esperado`:** the reusable list of component Articles and expected quantities for the Box SKU.
- **Physical unit — public label `Caja identificada`:** one uniquely identified instance of the Box SKU, created and managed through Articles/Stock.
- **Selected composition:** the actual physical components selected for one Surgery/Record preparation.
- **Controlled snapshot — public label `Control de preparación`:** the selected composition accepted at preparation control.
- **Definitive dispatch snapshot — public label `Contenido despachado`:** the composition frozen when the remittance is issued.
- **Return exception:** a consumed, missing, added, or replaced item recorded against the definitive dispatch snapshot.
- **Current condition:** the present actionable condition of a `Caja identificada`; it is distinct from every immutable historical control, dispatch, return, difference-resolution, and re-control record.
- **`Disponible` / `Con diferencias`:** the approved public labels for the two V1 return-control results and corresponding conditions covered by this specification. They are not a complete Box lifecycle state machine.

**VOCAB-01.** Public UI MUST use the exact approved strings `Caja`, `Contenido esperado`, `Caja identificada`, `Control de preparación`, `Contenido despachado`, `Disponible`, and `Con diferencias` for their concepts. A surface containing more than one concept MUST label or group them so they cannot reasonably be mistaken for one another. The technical term “snapshot” MUST NOT appear as public UI copy.

**VOCAB-02.** Lot, serial, GTIN, expiration, and equivalent traceability values MUST NOT be requested or displayed as reusable expected-formula attributes.

**VOCAB-03.** Traceability values MUST be associated with the selected physical stock/component to which they apply and MUST remain visible in later controlled, dispatch, and return evidence when previously captured.

**VOCAB-04.** Later formula changes or current preparation changes MUST NOT be represented as edits to prior controlled snapshots, definitive dispatch snapshots, or confirmed return evidence.

## 4. Boxes list, search, filters, and summaries

**LIST-01.** The Boxes entry point MUST identify itself as an Articles/Stock view of compound Box SKUs rather than as an independent product catalog.

**LIST-02.** Each Box SKU result MUST expose enough shared identity to distinguish it from another Box SKU and MUST provide a direct path to its SKU detail.

**LIST-03.** Each `Caja` result MUST expose the number of associated `Cajas identificadas` and MUST distinguish units whose current condition is `Disponible` from units whose current condition is `Con diferencias`, without replacing or rewriting the historical records that produced those conditions.

**LIST-04.** Search MUST match a Box SKU’s visible identity or description and MUST also allow locating a physical unit by its unique serial/internal code without treating that unit as a separate base SKU.

**LIST-05.** V1 filtering MUST allow users to narrow results by the visible current conditions `Disponible` and `Con diferencias`; it MUST NOT invent or imply a closed lifecycle state machine.

**LIST-06.** Status summaries MUST display distinguishable counts for `Disponible` and `Con diferencias`, MUST derive those counts from the current condition of `Cajas identificadas` rather than SKU rows or historical-result rows, and MUST update consistently with the active search/filter scope.

**LIST-07.** A unit without either approved current condition MUST NOT be silently counted as `Disponible` or `Con diferencias`; the list MUST present it without inventing a third return-control result or erasing another approved operational checkpoint condition.

**LIST-08.** An empty Boxes catalog, a successful search/filter with no matches, an initial load, and a load failure MUST be visibly distinguishable and MUST provide an appropriate next action when one exists.

## 5. Box SKU and physical-unit detail

**DETAIL-01.** Box SKU detail MUST present the shared SKU definition, expected formula, and physical units as distinct sections or equivalently distinct information groups.

**DETAIL-02.** The expected formula MUST show, for each formula line, the component Article and expected quantity; it MUST also show the quantity unit when the number would otherwise be ambiguous and MAY expose a presentation order without implying physical selection.

**DETAIL-03.** Formula lines MUST NOT ask the user to choose a lot, serial, GTIN, expiration, or other physical-stock identifier.

**DETAIL-04.** The physical-units group MUST show each unit’s unique serial/internal code, its base `Caja`, its current condition when one exists, and enough current operational context to locate the relevant Surgery/Record evidence; historical results MUST remain separately inspectable as immutable records.

**DETAIL-05.** Opening a physical unit MUST preserve visible context identifying its base Box SKU and unique serial/internal code.

**DETAIL-06.** A physical-unit detail MUST provide access to relevant operation evidence in chronological context while keeping master SKU/formula information distinct from operation-specific snapshots.

**DETAIL-07.** Formula viewing MUST make clear that the formula is a reusable expectation and not proof of what a physical unit currently contains or what was dispatched for an operation.

**DETAIL-08.** V1 MUST NOT expose physical-unit creation as a Box-only action; if creation is reachable, the experience MUST route or refer the user to the existing Articles/Stock process.

**DETAIL-09.** `Contenido esperado` MUST be editable in V1 only from Articles/Stock, through direct editing followed by explicit confirmation; it MUST NOT be editable from Surgery/Record or `/cajas`.

## 6. Preparation for a Surgery/Record

**PREP-01.** Box preparation MUST start in the context of a specific Surgery/Record and MUST identify that operation throughout the preparation journey.

**PREP-02.** The user MUST be able to choose the relevant uniquely identified physical Box unit from Articles/Stock without creating a new unit inside the preparation flow.

**PREP-03.** After a physical unit is chosen, the expected formula MUST appear as the default preparation reference so the user does not have to rebuild the expected composition from zero.

**PREP-04.** The preparation surface MUST distinguish every expected formula line from the actual physical component or components selected for that line.

**PREP-05.** The user MUST be able to select actual physical component stock and MUST see enough Article identity and available traceability to distinguish one candidate from another.

**PREP-06.** When the selected physical component requires or provides lot, serial, GTIN, expiration, or equivalent traceability, the preparation journey MUST preserve that traceability with the selection rather than attaching it to the formula.

**PREP-07.** The preparation journey MUST make under-quantity, over-quantity, missing expected lines, unexpected added components, and physical substitutions visibly distinguishable from matching selections without requiring a separate incident workflow.

**PREP-08.** Before preparation control, each relevant expected-versus-selected difference MUST either be corrected or explicitly acknowledged; acknowledgement MUST NOT silently change the expected formula.

**PREP-09.** The user MUST be able to review the complete actual selected composition and all acknowledged differences before confirming preparation control.

**PREP-10.** Reopening or refreshing an in-progress preparation MUST NOT present an unconfirmed selection as a controlled snapshot or definitive dispatch snapshot.

## 7. Preparation control and controlled snapshot

**CONTROL-01.** Confirming preparation control MUST create an observable controlled snapshot of the complete actual selected composition at that checkpoint, including captured component traceability and acknowledged differences.

**CONTROL-02.** Before confirmation, the experience MUST summarize the physical Box unit, selected components, expected-versus-selected differences, and the fact that this is preparation control rather than definitive dispatch.

**CONTROL-03.** A successful control MUST show an explicit confirmation and MUST identify the controlled snapshot as historical evidence for the Surgery/Record.

**CONTROL-04.** A failed control attempt MUST preserve the user’s review context, MUST explain that control was not completed, and MUST NOT present the composition as controlled.

**CONTROL-05.** The controlled snapshot MUST remain readable after later composition changes and MUST NOT be overwritten by the current selection.

**CONTROL-06.** The controlled snapshot MUST be visibly distinguishable from the expected formula and from the definitive dispatch snapshot, even when all three compositions happen to match.

## 8. Change after control and mandatory re-control

**CHANGE-01.** If any selected component, quantity, or captured traceability changes after control and before remittance issuance, the experience MUST mark the current composition as changed after control and MUST NOT represent the prior control as sufficient for dispatch.

**CHANGE-02.** Each post-control change MUST remain visible in history with what changed and when; the experience MUST show the responsible user when that identity is already available under existing product conventions, without defining a new permission or identity model.

**CHANGE-03.** Post-control history MUST distinguish additions, removals, replacements, quantity changes, and traceability changes at a level sufficient to compare the prior controlled snapshot with the current composition.

**CHANGE-04.** Remittance issuance MUST remain blocked at the product-behavior level while the current composition contains any change made after the latest successful preparation control.

**CHANGE-05.** Re-control MUST review the complete current composition, not only the latest change, and a successful re-control MUST establish a new controlled snapshot without deleting prior controlled evidence or change history.

**CHANGE-06.** Cancelling or failing re-control MUST leave the composition visibly pending re-control and MUST NOT restore dispatch eligibility.

## 9. Definitive dispatch/remittance snapshot

**DISPATCH-01.** The remittance-issuance review MUST identify the physical Box unit and MUST show the complete latest successfully controlled composition that is about to become definitive dispatch evidence.

**DISPATCH-02.** The remittance MUST NOT be issuable when there is no successful control for the current composition or when a post-control change still requires re-control.

**DISPATCH-03.** Successful remittance issuance MUST freeze a definitive dispatch snapshot containing the actual dispatched composition and its captured traceability.

**DISPATCH-04.** The definitive dispatch snapshot MUST remain readable from the Surgery/Record and relevant Box physical-unit context and MUST NOT be silently rewritten by later formula, preparation, return, or incident-note changes.

**DISPATCH-05.** A failed remittance issuance MUST NOT create or display a definitive dispatch snapshot and MUST preserve the latest controlled snapshot as a distinct earlier checkpoint.

## 10. Exception-driven return control

**RETURN-01.** Return control MUST start from one specific definitive dispatch snapshot and MUST NOT require the user to re-enter unchanged dispatched contents within the portion being confirmed.

**RETURN-02.** The default return view MAY treat the portion declared in the current Return as unchanged unless the user records an exception; it MUST NOT treat any balance outside that confirmed portion as returned or otherwise accounted for.

**RETURN-03.** The user MUST be able to record an item or quantity as consumed or missing and MUST be able to record an added item or a replacement, with physical traceability retained where applicable.

**RETURN-04.** A replacement MUST make both the dispatched item being replaced and the replacement item identifiable; it MUST NOT silently rewrite the definitive dispatch snapshot.

**RETURN-05.** The user MUST be able to add one optional return note without being forced to classify the return into a separate incident workflow.

**RETURN-06.** Before confirmation, the return review MUST summarize only the recorded consumed, missing, added, and replaced exceptions plus the optional note, while keeping the complete definitive dispatch composition available for inspection.

**RETURN-07.** When no return exception or attention-requiring incident is recorded for the confirmed portion, confirmation MUST record that portion as correctly returned; `Disponible` applies only where the relevant component or box availability conditions in `RETURN-15`–`RETURN-16` and `RESOLUTION-01`–`RESOLUTION-05` are satisfied.

**RETURN-08.** When at least one consumed, missing, added, or replaced exception is recorded, or the optional note records an unresolved sterilization, maintenance, damage, or quarantine incident, confirmation MUST produce the result `Con diferencias`.

**RETURN-09.** The user MUST see the resulting `Disponible` or `Con diferencias` outcome before final confirmation and MUST receive explicit success feedback after confirmation.

**RETURN-10.** A failed return confirmation MUST preserve the entered exceptions and note, MUST explain that confirmation did not complete, and MUST NOT display a new confirmed result.

**RETURN-11.** Confirmed return evidence MUST remain linked to the definitive dispatch snapshot and MUST NOT alter that snapshot.

**RETURN-12.** Return confirmation MUST apply only the approved stock checkpoint effects in `STOCK-06`–`STOCK-09`; it MUST NOT create an automatic billing, commercial, or accounting effect, and it MUST NOT bypass the explicit difference-resolution and re-control behavior in `RESOLUTION-01`–`RESOLUTION-05`.

## 11. Simple incidents and notes

**INCIDENT-01.** The optional return note MUST support plain-language sterilization, maintenance, damage, and quarantine context without requiring a dedicated form or workflow for each category.

**INCIDENT-02.** Outside return control, a physical-unit or operation context MAY expose a simple note/incident entry when already supported by the surrounding product, but it MUST NOT create a separate V1 lifecycle or mandatory classification system.

**INCIDENT-03.** An incident note MUST remain visible with the relevant unit and operation evidence and MUST NOT rewrite formula, controlled, dispatch, or return snapshots.

**INCIDENT-04.** The product MUST NOT imply that recording an incident note performs maintenance, sterilization, repair, quarantine release, stock adjustment, or any other operational resolution.

## 12. Loading, empty, error, access, and stale-data behavior

**STATE-01.** Initial loading MUST be explicit and MUST NOT briefly show empty results, zero status summaries, or a successful operational checkpoint.

**STATE-02.** A successful empty catalog, no search/filter matches, no physical units, and no operation evidence MUST use distinct messages appropriate to the surface and MUST NOT be rendered as errors.

**STATE-03.** A load failure MUST be distinct from empty data, MUST preserve safe previously loaded context when available without presenting it as current, and MUST offer retry when retry is meaningful.

**STATE-04.** When existing access rules deny a surface or action, the experience MUST show a permission-denied state, MUST NOT present the denial as empty or failed loading, and MUST NOT invent or name roles not approved by this specification.

**STATE-05.** A background refresh MUST keep the last successful information distinguishable as refreshing and MUST NOT flash false zero counts, empty results, or false checkpoint success.

**STATE-06.** If the physical unit, selected composition, control evidence, or dispatch evidence changed since the user’s view was loaded, a conflicting confirm action MUST NOT silently overwrite the newer information; the experience MUST identify the view as stale and require the user to reload or reconcile before confirming.

**STATE-07.** After stale data is refreshed, the experience MUST preserve already confirmed historical snapshots and MUST clearly show the current actionable composition or return evidence.

## 13. Responsive and accessibility requirements

**ACCESS-01.** The complete journeys in this specification MUST remain usable at representative desktop and `412x915` viewports without loss of required information or actions.

**ACCESS-02.** On constrained widths, expected formula, selected composition, differences, snapshots, and return exceptions MAY use progressive disclosure, but the current concept and checkpoint MUST remain visible and understandable before confirmation.

**ACCESS-03.** Wide composition data MUST remain inspectable without clipping identifiers, quantities, exception types, or confirmation actions; horizontal interaction MUST NOT block normal page scrolling.

**ACCESS-04.** Every interactive control MUST have an accessible name, and icon-only actions MUST expose a text alternative that communicates their action and affected item.

**ACCESS-05.** Search, filters, SKU/unit navigation, component selection, difference acknowledgement, control, re-control, dispatch review, return exceptions, retry, and confirmation MUST be keyboard operable with visible focus in a logical order.

**ACCESS-06.** Touch targets for primary controls and repeated line-item actions MUST be at least `44x44` CSS pixels or provide an equivalently usable target area.

**ACCESS-07.** Formula-versus-actual distinctions, status results, exceptions, stale state, errors, and required re-control MUST NOT rely on color alone.

**ACCESS-08.** Loading completion, errors, result-count changes, control success, re-control requirement, dispatch success, stale conflicts, return result, and confirmation failures MUST be communicated to assistive technology without repeatedly announcing every composition line.

**ACCESS-09.** Text, status indicators, focus indicators, and disabled controls MUST meet WCAG 2.2 AA contrast and interaction expectations appropriate to their function.

## 14. Approved DG-02–DG-07 behavior

### 14.1 `Contenido esperado` editing and versioning

**FORMULA-01.** Only a user with the approved Articles/Stock capability MAY edit `Contenido esperado`; consultation remains governed by current access, and this requirement MUST NOT be interpreted as an approved role mapping or Auth implementation.

**FORMULA-02.** Each confirmed save of `Contenido esperado` MUST create a new version and MUST NOT mutate or replace any prior version.

**FORMULA-03.** A new `Contenido esperado` version MUST apply only to preparations started after that version is successfully saved. Preparations already open MUST retain the version with which they started.

**FORMULA-04.** Controlled, dispatched, returned, difference-resolution, and re-control evidence MUST retain the applicable earlier version and MUST NOT be rewritten by a later `Contenido esperado` edit.

**FORMULA-05.** Cancelling confirmation or failing the save MUST leave the current version in force, MUST create no new version, and MUST produce no change to open preparations or historical evidence.

### 14.2 Difference resolution and explicit re-control

**RESOLUTION-01.** A confirmed historical result and its recorded differences MUST be immutable. Resolving a difference MUST create or append resolution evidence for that individual difference and MUST NOT edit the historical result.

**RESOLUTION-02.** While any recorded difference remains open, the `Caja identificada` MUST remain in the current condition `Con diferencias`.

**RESOLUTION-03.** The explicit action `Recontrolar caja` MUST become available only after every recorded difference for the relevant operation has been individually closed; closing the last difference MUST NOT itself change the current condition.

**RESOLUTION-04.** Successfully completing `Recontrolar caja` MUST create a new re-control record while preserving every prior result, difference, resolution, and control record.

**RESOLUTION-05.** For a `Caja identificada` currently `Con diferencias`, only a successful explicit re-control with no differences MUST change the current condition to `Disponible`. A cancelled or failed re-control, or a completed re-control that still has differences, MUST create no false `Disponible` condition and MUST leave the prior current condition effective.

### 14.3 Multiplicity, partial returns, and reuse

**MULTI-01.** One Surgery/Record MAY contain multiple `Cajas identificadas`.

**MULTI-02.** One `Caja identificada` MUST belong to no more than one active Surgery/Record at a time. An attempt to assign it to another active Surgery/Record MUST be rejected without changing either assignment or creating operation evidence.

**MULTI-03.** One `Caja identificada` MAY have multiple dispatches/remittances and multiple partial returns within its assigned operation.

**MULTI-04.** Each successful dispatch/remittance MUST preserve its own immutable `Contenido despachado`; a later dispatch, return, formula edit, or re-control MUST NOT rewrite another dispatch record.

**MULTI-05.** A partially returned `Caja identificada` MUST remain linked to its Surgery/Record until all dispatched contents have been accounted for and all differences have been closed.

**MULTI-06.** A `Caja identificada` MAY be reused for another Surgery/Record only when the prior operation has ended and its current condition is `Disponible`; it MUST NOT be mixed between active operations.

### 14.4 Capabilities, access, rejection, and audit

**CAPABILITY-01.** Consultation of Cajas information MUST follow current access rules; this specification creates no new role name or role taxonomy.

**CAPABILITY-02.** Editing `Contenido esperado` MUST require the Articles/Stock capability. Preparation, preparation control, and `Recontrolar caja` MUST require the operational capability.

**CAPABILITY-03.** Dispatch/remittance and return actions MUST reuse their existing permissions; this specification MUST NOT define replacement permissions or map the approved capabilities to roles.

**CAPABILITY-04.** V1 MUST NOT require preparation, control, or re-control to be performed by two different people.

**CAPABILITY-05.** Formula editing, preparation, control, re-control, dispatch/remittance, return, and difference-resolution actions MUST be auditable under the future approved technical contract, including actor, company, cause, and result. This audit obligation MUST NOT be interpreted as assigning the still-unresolved ownership or capability for difference resolution.

**CAPABILITY-06.** An action unavailable to the current user MUST remain visible but disabled with an explanation. Any backend/API contract later approved to serve the action MUST also reject an unauthorized attempt and MUST create no version, snapshot, record, assignment, stock movement, current-condition change, or other business side effect.

### 14.5 Product-surface ownership

**HOST-01.** Articles/Stock MUST manage the `Caja` definition, `Contenido esperado`, and `Cajas identificadas`.

**HOST-02.** Each Surgery/Record MUST provide a section labeled exactly `Cajas` for selection, preparation, preparation control, `Recontrolar caja`, dispatch/remittance, and return in that operation context.

**HOST-03.** Dispatch/remittance and return MUST reuse their existing flows contextualized from the Surgery/Record `Cajas` section; this specification MUST NOT create parallel remittance or return ownership.

**HOST-04.** `/cajas` MUST remain a search and summary surface and MUST NOT be the primary operational host for selection, preparation, control, re-control, dispatch, or return.

**HOST-05.** During an active operation, Articles/Stock MUST expose the history of a `Caja identificada` as consultation only; operation actions MUST remain in the Surgery/Record `Cajas` section. Any sensitive Surgery/Record refactor remains blocked pending a separate Task Brief and Franco approval.

### 14.6 Stock checkpoint effects

**STOCK-01.** Explicitly confirming incorporation of a `Caja identificada` and its physical component Articles into active preparation MUST reserve that box and those confirmed Articles for the operation. Browsing, opening, comparing, drafting, or provisionally selecting them MUST NOT reserve Stock.

**STOCK-02.** Preparation control and re-control MUST record evidence only and MUST NOT duplicate a reservation, create a dispatch or return movement, or infer consumption.

**STOCK-03.** Only remittance issuance accepted as emitted and operationally valid MUST establish `Contenido despachado` and apply the approved `Despachado` / `En tránsito` stock checkpoint effect; draft, preview, tentative numbering, download, or attempted issuance MUST NOT do so.

**STOCK-04.** Failed remittance issuance MUST create neither `Contenido despachado` nor a stock movement and MUST preserve the prior controlled evidence and reservation without a false dispatch condition.

**STOCK-05.** Cancelling the operation before dispatch MUST release all its undispatched box and Article reservations and MUST NOT create dispatch, return, consumption, billing, commercial, or accounting evidence. Dispatched content MUST NOT be handled as a simple reservation release.

**STOCK-06.** A correctly returned component with no unresolved difference MAY return to `Disponible` only after the applicable human validation. A partial Return MUST NOT imply global availability of its `Caja identificada`.

**STOCK-07.** An item confirmed as consumed MUST generate the corresponding consumption effect and MUST NOT also be treated as returned to `Disponible`.

**STOCK-08.** A missing or damaged item, or an item with an unresolved incident, MUST remain under the approved `No disponible` / `En revisión` stock checkpoint effect and MUST NOT be released as `Disponible`.

**STOCK-09.** Added and replacement items MUST require explicit stock movements; the product MUST NOT infer or silently combine those movements from return comparison alone.

**STOCK-10.** Every stock checkpoint effect in `STOCK-01`–`STOCK-09` MUST be atomic, audited, and idempotent. Retrying the same confirmed operation MUST NOT duplicate reservations, releases, movements, consumption, snapshots, or records. None of these effects MUST automatically create billing, commercial, or accounting entries.

These approved effects define observable product obligations only. Their schema, transaction design, API shape, provider, role mapping, migration, and implementation remain unresolved and unauthorized.

### 14.7 Reservation commitment, replacement, removal, and cancellation

**RESERVATION-01.** A `Caja identificada` or physical component MUST become reserved only when its incorporation into active preparation is explicitly confirmed; browsing, opening, comparison, provisional marking, draft selection, or another unconfirmed state MUST NOT reserve it.

**RESERVATION-02.** A confirmed reservation MUST be limited to the applicable Surgery/Record and MUST reject a confirmation that would oversubscribe the same exclusive unit or available quantity.

**RESERVATION-03.** Confirming a replacement before dispatch MUST coherently release the previous reservation and reserve the replacement without exposing an intermediate or final oversubscribed result; cancellation or failure MUST leave the previously confirmed reservation effective and MUST NOT reserve the proposed replacement.

**RESERVATION-04.** Before dispatch, removing one confirmed component from preparation MUST release only that component's still-undispatched reservation and MUST preserve all other applicable reservations.

**RESERVATION-05.** Before dispatch, removing a confirmed `Caja identificada` from preparation MUST release the box and every still-undispatched component reservation incorporated through it.

**RESERVATION-06.** Cancelling the whole operation MUST release every reservation for content that remains undispatched; dispatched content MUST retain its dispatch evidence and MUST NOT be represented as a simple release.

**RESERVATION-07.** Any removal, replacement, or cancellation after a successful control MUST preserve the prior control and change evidence and MUST require the applicable re-control for any remaining or replacement composition.

### 14.8 Successful issuance and later annulment

**DISPATCH-06.** Remittance issuance MUST count as successful only when the owning Remittance flow accepts the document as emitted and operationally valid; draft, preview, tentative numbering, download, or an attempted issuance MUST NOT establish success.

**DISPATCH-07.** Successful issuance MUST accept the Remittance, its immutable `Contenido despachado`, and the corresponding Stock dispatch effect together; if any part fails, none of those three outcomes MUST be presented or retained as successful.

**DISPATCH-08.** Later annulment MUST preserve the emitted Remittance, immutable `Contenido despachado`, and prior Stock evidence and MUST add linked correction or reversal evidence rather than erasing or mutating them. This requirement defines no fiscal, tax, billing, or commercial effect.

### 14.9 Multiple dispatches and redispatch

**MULTI-07.** One `Caja identificada` MAY participate in multiple independent dispatches within its assigned operation, but the same physical unit or quantity MUST NOT belong to more than one current dispatch.

**MULTI-08.** Cumulative dispatch for an identified box MUST NOT exceed its applicable successfully controlled and reserved composition.

**MULTI-09.** Content not included in a successful dispatch MUST remain reserved for the operation, and every dispatch MUST preserve independent immutable evidence and accounting.

**MULTI-10.** Redispatch of returned material MUST occur only after the applicable operational review and MUST create new dispatch evidence without editing or replacing any earlier dispatch or Return evidence.

### 14.10 Partial Return accounting and replacement custody

**RETURN-13.** Each partial Return MUST reference exactly one dispatch and MUST dispose only the quantity or physical units explicitly confirmed in that Return.

**RETURN-14.** “Without changes” or equivalent unchanged-return behavior MUST apply only to the portion explicitly declared in the current confirmation; the undisposed balance of the dispatch MUST remain pending.

**RETURN-15.** A correctly returned component MAY become `Disponible` only after applicable human validation confirms it has no difference and no other approved checkpoint keeps it unavailable.

**RETURN-16.** A partial Return result MUST NOT imply global availability of the `Caja identificada`; the box MUST remain linked to the Surgery/Record and non-reusable while any dispatched content is pending or any difference remains open.

**RETURN-17.** Every added item or item received as a replacement MUST remain `En revisión` / Under Review until its origin, belonging, and disposition are explicitly resolved.

**RETURN-18.** Replacement evidence MUST preserve the identity and applicable evidence of both the originally dispatched item and the received replacement item without presuming physical custody of the original.

**RETURN-19.** A comparison involving an added or replacement item MUST NOT by itself infer compensation, availability, Stock entry, Stock exit, or another physical movement.

### 14.11 Shared Consumption and Return accounting — approved new product rule

**ACCOUNTING-01.** Consumption MUST become effective only through explicit human confirmation linked to the applicable Remittance/dispatch and MAY account for only part of that dispatch.

**ACCOUNTING-02.** Consumption and Return MAY be confirmed in either order against one shared conceptual pending balance for each dispatch. This is an expressly approved new product rule.

**ACCOUNTING-03.** Each quantity or physical unit MUST receive at most one accepted disposition across Consumption and Return, including consumed, returned, damaged, missing, or under review.

**ACCOUNTING-04.** When a confirmed Return explicitly classifies a quantity as consumed, that Return MUST produce the single corresponding consumption effect and reduce the shared pending balance accordingly.

**ACCOUNTING-05.** A later Consumption interaction MUST recognize any quantity already classified as consumed by Return as accounted and MUST NOT create a second disposition or effect.

### 14.12 Critical-confirmation freshness

**FRESHNESS-01.** Selection incorporation, control, dispatch, Return, Consumption, and difference-resolution confirmations MUST revalidate current server truth before acceptance and MUST reject or require reconciliation of stale input.

**FRESHNESS-02.** After a critical confirmation succeeds, the same operation context MUST immediately show its own confirmed result and MUST NOT wait for an informational read model before acknowledging success.

**FRESHNESS-03.** Search, summary, history, and other informational views MAY refresh later only while clearly marked updating or non-current; they MUST NOT show false zero, success, or availability, and MUST NOT enable confirmation from stale data. No technical refresh-time SLA is selected.

### 14.13 Company and conceptual capability boundary

**COMPANY-01.** Every Cajas query and mutation MUST be limited to the authorized company and validated against current server truth.

**COMPANY-02.** A cross-company reference MUST be rejected without disclosing whether the referenced resource exists and without creating any business, Stock, evidence, audit-success, or other side effect.

**COMPANY-03.** Every critical action MUST require its applicable approved conceptual capability and MUST audit actor, company, cause, and result. The exact ownership and capability for difference resolution remain pending Franco's later business definition and MUST NOT be inferred from current roles, mapped technically, or treated as closed by this requirement.

## 15. Acceptance scenarios

### 15.1 Scope, list, and discovery

```gherkin
Scenario: BOX-01 Boxes remains an Articles/Stock view
  Given the user opens the Boxes entry point
  When Box SKU results are shown
  Then the surface MUST identify the results as compound Articles/SKUs
  And it MUST NOT present a separate Box-only catalog or financial cash capability

Scenario: BOX-02 Search finds a Box SKU
  Given multiple Box SKUs are available
  When the user searches by a visible SKU identity or description
  Then matching Box SKU results MUST be shown
  And each result MUST provide a path to its SKU detail

Scenario: BOX-03 Search finds a physical unit without changing its base identity
  Given physical unit U1 has unique serial/internal code C1 under Box SKU B1
  When the user searches for C1
  Then U1 and its relationship to B1 MUST be shown
  And U1 MUST NOT be presented as a separate base SKU

Scenario: BOX-04 Status filters and summaries use current physical-unit conditions
  Given B1 has two units currently Disponible, one currently Con diferencias, and one unit without either condition
  When the list and status summaries load successfully
  Then Disponible MUST show two and Con diferencias MUST show one
  And the unclassified unit MUST be counted as neither result

Scenario: BOX-05 No-match is not an empty catalog or error
  Given the Boxes catalog contains results
  When active search or filters match none
  Then a no-match message and filter-reset path MUST be shown
  And the surface MUST NOT claim that the catalog is empty or failed to load
```

### 15.2 SKU, formula, and physical-unit detail

```gherkin
Scenario: DETAIL-01 SKU concerns remain distinct
  Given the user opens Box SKU B1
  When the detail loads
  Then shared definition, expected formula, and physical units MUST be distinguishable
  And operation snapshots MUST NOT appear as editable formula data

Scenario: DETAIL-02 Formula contains expectations but no physical traceability
  Given B1 expects two units of component Article A1
  When its formula is shown
  Then A1 and expected quantity two MUST be shown with a quantity unit when needed for clarity
  And no lot, serial, GTIN, or expiration selection MUST be requested on that formula line

Scenario: DETAIL-03 Physical-unit detail preserves identity and context
  Given U1 belongs to B1 and has code C1
  When the user opens U1
  Then B1 and C1 MUST remain visible
  And relevant Surgery/Record evidence MUST be reachable without conflating it with the master formula

Scenario: DETAIL-04 Unit creation remains in Articles/Stock
  Given the user needs a new physical unit
  When the user inspects the Boxes experience
  Then no Box-only unit registry action MUST be offered
  And any creation path MUST refer or route to Articles/Stock
```

### 15.3 Preparation and control

```gherkin
Scenario: PREP-01 Formula assists physical preparation
  Given Surgery/Record S1 requires physical Box unit U1
  And B1's expected formula contains A1 quantity two
  When the user starts preparation for S1 and chooses U1
  Then the expected formula MUST appear as the default reference
  And the user MUST be able to select actual physical stock for A1

Scenario: PREP-02 Selected traceability belongs to physical stock
  Given selected component P1 provides a lot, serial, GTIN, or expiration value
  When P1 is selected for S1
  Then that traceability MUST remain attached to P1 in the selected composition
  And the reusable formula MUST remain unchanged

Scenario: PREP-03 Matching composition is controlled
  Given the selected composition matches the expected formula
  And the user has reviewed the complete physical composition
  When preparation control succeeds
  Then a controlled snapshot MUST be confirmed for S1
  And it MUST be identified as preparation control rather than definitive dispatch

Scenario: PREP-04 Difference requires correction or acknowledgement
  Given the expected formula requires two A1 components
  And the selected composition contains only one
  When the user attempts preparation control without correcting or acknowledging the difference
  Then control MUST NOT complete
  And the under-quantity MUST remain visible for correction or explicit acknowledgement

Scenario: PREP-05 Acknowledged difference remains evidence
  Given a relevant expected-versus-selected difference is explicitly acknowledged
  When preparation control succeeds
  Then the controlled snapshot MUST preserve the actual composition and acknowledged difference
  And the expected formula MUST remain unchanged

Scenario: PREP-06 Failed control is not a snapshot
  Given the user reviews a valid selected composition
  When control confirmation fails
  Then the review context MUST remain available
  And no successful controlled snapshot or definitive dispatch snapshot MUST be shown
```

### 15.4 Change, re-control, and dispatch

```gherkin
Scenario: CHANGE-01 Post-control change invalidates dispatch readiness
  Given composition C1 has a successful controlled snapshot
  When a selected item, quantity, or traceability value changes
  Then the current composition MUST be marked as changed after control
  And remittance issuance MUST remain unavailable until successful re-control

Scenario: CHANGE-02 Re-control preserves history
  Given controlled snapshot C1 exists and a later change produces composition C2
  When the user reviews the complete C2 and re-control succeeds
  Then C2 MUST become the latest controlled snapshot
  And C1 and the intervening change history MUST remain readable

Scenario: CHANGE-03 Failed re-control stays pending
  Given the current composition changed after control
  When re-control is cancelled or fails
  Then the current composition MUST remain visibly pending re-control
  And dispatch MUST NOT become eligible

Scenario: DISPATCH-01 Current controlled composition becomes definitive
  Given the current composition has a successful control and no later change
  When the user reviews and successfully issues the remittance
  Then the complete actual composition MUST become the definitive dispatch snapshot
  And its captured traceability MUST remain readable from the Surgery/Record

Scenario: DISPATCH-02 Uncontrolled change cannot be dispatched
  Given the composition changed after its latest successful control
  When the user attempts to issue the remittance
  Then issuance MUST remain blocked
  And the experience MUST direct the user to re-control without overwriting prior evidence

Scenario: DISPATCH-03 Failed issuance creates no definitive snapshot
  Given a valid controlled snapshot exists
  When remittance issuance fails
  Then no definitive dispatch snapshot MUST be shown
  And the controlled snapshot MUST remain visible as the earlier checkpoint
```

### 15.5 Return by exception and incidents

```gherkin
Scenario: RETURN-01 Unchanged return is default-assisted
  Given definitive dispatch snapshot D1 exists
  And the full remaining dispatch balance is declared returned with no exception or attention-requiring incident
  When the user opens return control and confirms the unchanged return
  Then the user MUST NOT be required to re-enter D1
  And after applicable human validation the confirmed result MUST be Disponible when no other checkpoint blocks availability

Scenario: RETURN-02 Consumed or missing item produces differences
  Given D1 contains physical component P1
  When the user records P1 as consumed or missing and confirms
  Then the exception MUST remain linked to D1 without rewriting D1
  And the confirmed result MUST be Con diferencias

Scenario: RETURN-03 Added item preserves applicable traceability
  Given an item not present in D1 is returned with the Box
  When the user records it as added
  Then the added physical item and applicable traceability MUST be identifiable
  And confirmation MUST produce Con diferencias

Scenario: RETURN-04 Replacement identifies both sides
  Given D1 contains P1 and physical item P2 replaces it on return
  When the user records the replacement
  Then P1 and P2 MUST both be identifiable in the exception
  And D1 MUST remain unchanged

Scenario: RETURN-05 Incident remains simple and visible
  Given the user records an unresolved damage, sterilization, maintenance, or quarantine incident in the optional note
  When return control is confirmed
  Then the result MUST be Con diferencias
  And no separate incident workflow or claimed operational resolution MUST be created

Scenario: RETURN-06 Failed confirmation preserves input without false result
  Given the user entered return exceptions and an optional note
  When return confirmation fails
  Then the entered information MUST remain available for retry
  And no new Disponible or Con diferencias result MUST be shown as confirmed

Scenario: RETURN-07 Con diferencias requires only the approved explicit resolution flow
  Given a return is confirmed Con diferencias
  When the user views the result
  Then the differences and associated evidence MUST remain visible
  And the product MUST NOT claim an automatic transition to Disponible or an automatic billing, commercial, or accounting effect
```

### 15.6 Product states and concurrency

```gherkin
Scenario: STATE-01 Loading does not flash false information
  Given a Boxes, detail, preparation, dispatch, or return surface has not completed its initial load
  When the surface renders
  Then an explicit loading state MUST be shown
  And false zero counts, empty messages, or successful checkpoints MUST remain hidden

Scenario: STATE-02 Error and permission denial remain distinct
  Given one user encounters a load failure and another is denied by existing access rules
  When each outcome renders
  Then the first MUST see an error state with retry when meaningful
  And the second MUST see permission denied without invented role names or empty-state copy

Scenario: STATE-03 Stale preparation cannot overwrite newer evidence
  Given user A loaded composition C1
  And user B changed or controlled the same preparation, producing newer evidence C2
  When user A attempts to control or dispatch C1
  Then the action MUST NOT silently overwrite C2
  And user A MUST be required to reload or reconcile before confirming

Scenario: STATE-04 Background refresh remains honest
  Given successful data is visible
  When a background refresh begins
  Then the prior data MUST be distinguishable as refreshing
  And the surface MUST NOT flash false empty results, zero summaries, or checkpoint success
```

### 15.7 Responsive and accessible operation

```gherkin
Scenario: ACCESS-01 Complete operation works at desktop and mobile
  Given representative formula, selected composition, differences, and return exceptions
  When the journey is used at desktop and 412x915
  Then all required information and confirmation actions MUST remain reachable
  And identifiers, quantities, and exception types MUST remain inspectable without blocking page scroll

Scenario: ACCESS-02 Keyboard operation and focus are complete
  Given a keyboard-only user prepares, controls, reviews dispatch, or controls a return
  When the user navigates the required controls
  Then every action MUST be operable in logical order
  And visible focus MUST identify the current control

Scenario: ACCESS-03 Meaning is not color-only
  Given expected and actual composition differ or re-control is required
  When the condition is displayed
  Then text, symbols, structure, or another non-color cue MUST communicate the condition
  And assistive technology MUST receive the relevant state change

Scenario: ACCESS-04 Touch and control naming remain usable
  Given a user operates repeated line actions at 412x915
  When component, exception, retry, and confirmation controls are presented
  Then their usable targets MUST be at least 44x44 CSS pixels or equivalent
  And every control MUST have an accessible name
```

### 15.8 Approved DG-01–DG-07 behavior

```gherkin
Scenario: DG01-01 Approved public vocabulary is exact
  Given a surface presents the shared SKU, formula, physical unit, control, dispatch, or return condition
  When public labels are rendered
  Then the applicable labels MUST be Caja, Contenido esperado, Caja identificada, Control de preparación, Contenido despachado, Disponible, or Con diferencias exactly
  And the public UI MUST NOT use snapshot as the label for historical evidence

Scenario: DG02-01 A confirmed formula edit creates a future-only version
  Given an authorized Articles/Stock user edits Contenido esperado
  And preparation P1 is already open under version V1
  When the user confirms a successful save as version V2
  Then V2 MUST apply only to preparations started after the save
  And P1 and all historical evidence under V1 MUST remain linked to V1 and unchanged

Scenario: DG02-02 Formula edit cancellation or failure has no side effect
  Given an Articles/Stock user has proposed an edit to Contenido esperado
  When confirmation is cancelled or the save fails
  Then no new formula version MUST be created
  And the current version, open preparations, and historical evidence MUST remain unchanged

Scenario: DG03-01 Closing differences does not rewrite history or auto-release the box
  Given a Caja identificada is Con diferencias with multiple recorded differences
  When the user closes each difference individually
  Then the historical result and differences MUST remain immutable with appended resolution evidence
  And closing the last difference MUST enable Recontrolar caja without changing the current condition

Scenario: DG03-02 Only a clean explicit re-control makes the box Disponible
  Given every recorded difference has been closed
  When Recontrolar caja succeeds with no differences
  Then a new re-control record MUST be created and all prior evidence MUST remain readable
  And the current condition MUST change to Disponible

Scenario: DG04-01 Multiple boxes are allowed but active assignment is exclusive
  Given Surgery/Record S1 already has one or more Cajas identificadas
  And Caja identificada U1 belongs to active Surgery/Record S1
  When a user attempts to assign U1 to active Surgery/Record S2
  Then the additional boxes in S1 MUST remain valid
  And the U1-to-S2 assignment MUST be rejected without changing either operation or creating evidence

Scenario: DG04-02 Partial returns retain the operation link and each dispatch snapshot
  Given U1 has multiple successful dispatches in S1 and only part of the dispatched contents has returned
  When the partial return is confirmed
  Then each dispatch MUST retain its own immutable Contenido despachado
  And U1 MUST remain linked to S1 and unavailable for reuse until all dispatched contents are accounted for, differences are closed, S1 has ended, and U1 is Disponible

Scenario: DG05-01 Capabilities govern actions without inventing roles
  Given a user may consult Cajas but lacks the capability required for an action
  When formula edit, preparation, control, re-control, dispatch, or return is presented
  Then the action MUST use the approved capability or existing permission applicable to it
  And an unavailable action MUST be disabled with an explanation without naming a new role

Scenario: DG05-02 Unauthorized invocation is rejected without side effects
  Given a user lacks the capability or existing permission required for an action
  When the user invokes the underlying backend/API action directly
  Then the attempt MUST be rejected
  And no version, snapshot, record, assignment, stock movement, or current-condition change MUST occur

Scenario: DG06-01 Product surfaces keep their approved ownership
  Given the user manages a Caja and later operates it for Surgery/Record S1
  When the user moves between Articles/Stock, /cajas, and S1
  Then Articles/Stock MUST manage definition, Contenido esperado, and Cajas identificadas
  And /cajas MUST provide search/summary while S1 section Cajas hosts selection, preparation, control, re-control, dispatch, and return

Scenario: DG06-02 Active-operation history is read-only in Stock
  Given Caja identificada U1 belongs to an active operation
  When its operation history is opened from Articles/Stock
  Then the history MUST be consultation-only
  And operational actions MUST remain in the Surgery/Record Cajas section through contextualized existing remittance and return flows

Scenario: DG07-01 Confirmed incorporation reserves and control records evidence only
  Given an operator has reviewed a Caja identificada and physical component Articles for an operation
  When incorporation into active preparation is explicitly confirmed and preparation control later succeeds
  Then the box and selected Articles MUST be reserved once for that operation
  And control MUST record evidence without duplicating reservation or creating dispatch, return, or consumption movement

Scenario: DG07-02 Dispatch failure creates neither snapshot nor movement
  Given the latest current composition has successful preparation control
  When remittance issuance fails
  Then no Contenido despachado or stock movement MUST be created
  And the controlled evidence and reservation MUST remain without a false dispatch condition

Scenario: DG07-03 Pre-dispatch cancellation and return outcomes apply explicit checkpoints
  Given an operation has reserved stock but has not dispatched it
  And a separate dispatched operation has items under return control
  When the first operation is cancelled and the separate return is confirmed
  Then its box and Article reservations MUST be released without dispatch, return, consumption, billing, commercial, or accounting evidence
  And a later confirmed return MUST make correct items Disponible, generate consumption for consumed items, and keep missing, damaged, or unresolved-incident items No disponible / En revisión

Scenario: DG07-04 Stock effects are explicit, atomic, audited, and idempotent
  Given a return contains an added or replacement item
  When its explicit stock movement succeeds and the same confirmed operation is retried
  Then the required movement MUST be atomic and auditable
   And the retry MUST NOT duplicate any reservation, release, movement, consumption, snapshot, record, billing, commercial, or accounting effect
```

### 15.9 Approved CD-01–CD-10 behavior

```gherkin
Scenario: CD01-01 Provisional browsing and selection do not reserve Stock
  Given an operator browses, opens, compares, or provisionally selects a Caja identificada and physical components
  When incorporation into active preparation has not been explicitly confirmed
  Then no box or component reservation MUST be created
  And the candidates MUST NOT be presented as reserved by that draft activity

Scenario: CD01-02 Confirmed replacement is coherent and cannot oversubscribe
  Given preparation has a confirmed reservation for component P1
  When the operator confirms replacement P2
  Then P1 MUST be released and P2 MUST be reserved as one coherent confirmation
  And failure or oversubscription MUST leave P1 effective without reserving P2

Scenario: CD02-01 Removing undispatched content releases only the applicable reservations
  Given an identified box and its components are confirmed in preparation and remain undispatched
  When one component is removed
  Then only that component's reservation MUST be released
  And removing the whole box MUST instead release the box and all of its still-undispatched component reservations

Scenario: CD02-02 Cancellation preserves dispatched and post-control evidence
  Given an operation contains undispatched reservations and may contain already dispatched evidence
  When the whole operation is cancelled after an applicable preparation control
  Then all undispatched reservations MUST be released and dispatched content MUST NOT be handled as a simple release
  And prior control/change evidence MUST remain readable with applicable re-control required for any continuing composition

Scenario: CD03-01 Only operationally valid issuance succeeds as one confirmation
  Given a Remittance is in draft, preview, tentative numbering, download, or attempted issuance
  When the owning flow has not accepted it as emitted and operationally valid
  Then no successful issuance, Contenido despachado, or Stock dispatch effect MUST be shown
  And when issuance succeeds all three MUST be accepted together or none MUST succeed

Scenario: CD03-02 Later annulment appends correction evidence
  Given a Remittance was emitted with immutable Contenido despachado and Stock dispatch evidence
  When it is later annulled
  Then the original evidence MUST remain unchanged and readable
  And a linked correction or reversal MUST be added without inferring fiscal or commercial effects

Scenario: CD04-01 Multiple dispatches are independent and cumulatively bounded
  Given one Caja identificada has controlled and reserved composition for an operation
  When multiple non-overlapping dispatches are confirmed
  Then every dispatch MUST retain independent immutable evidence and accounting
  And cumulative dispatch MUST NOT exceed the applicable controlled and reserved composition

Scenario: CD04-02 Undispatched content remains reserved and redispatch is new evidence
  Given only part of an identified box is dispatched and returned material later passes applicable review
  When the remaining content stays pending or the returned material is redispatched
  Then undispatched content MUST remain reserved
  And redispatch MUST create new evidence without editing any prior dispatch or Return

Scenario: CD05-01 A partial Return disposes only its declared portion
  Given dispatch D1 has an undisposed balance
  When a partial Return against D1 confirms one declared portion without changes
  Then only that portion MUST be accounted as correctly returned
  And the remaining balance MUST stay pending rather than inherit the without-changes result

Scenario: CD05-02 Partial correctness does not release the whole box
  Given a partial Return contains correctly returned components but other content remains pending or has differences
  When human validation accepts the correct components
  Then those components MAY become Disponible when no other checkpoint blocks them
  And the Caja identificada MUST remain linked and non-reusable without global Disponible status

Scenario: CD06-01 Consumption before Return uses the shared pending balance
  Given dispatch D1 has a shared conceptual pending balance
  When Consumption first confirms part of D1 and Return later confirms another part
  Then each confirmation MUST reduce the same pending balance
  And no quantity MUST receive two dispositions

Scenario: CD06-02 Return before Consumption uses the shared pending balance
  Given dispatch D1 has a shared conceptual pending balance
  When Return first confirms part of D1 and Consumption later confirms another part
  Then each confirmation MUST reduce the same pending balance
  And the order MUST NOT create duplicate or conflicting dispositions

Scenario: CD06-03 Return-classified consumption is already accounted
  Given a confirmed Return classified quantity Q1 as consumed
  When Consumption later loads or confirms against the same dispatch
  Then Q1 MUST be recognized as already accounted
  And no second consumption disposition or effect MUST be created

Scenario: CD07-01 Added and replacement items remain custody-neutral Under Review
  Given a Return records an added item or a received replacement item
  When origin, belonging, or disposition is unresolved
  Then the received item MUST remain En revisión / Under Review
  And no availability, entry, exit, or compensation MUST be inferred from comparison alone

Scenario: CD07-02 Replacement preserves both sides without presuming the original is held
  Given dispatched item P1 is associated with received replacement P2
  When replacement evidence is confirmed
  Then P1 and P2 MUST both retain identifiable evidence
  And the evidence MUST NOT claim physical custody of P1 unless separately established

Scenario: CD09-01 Every critical confirmation revalidates current server truth
  Given a user reviewed selection, control, dispatch, Return, Consumption, or resolution input
  And current server truth changed before confirmation
  When the user confirms
  Then stale input MUST NOT be accepted
  And the user MUST be required to reload or reconcile before a new confirmation

Scenario: CD09-02 Success is immediate while informational refresh remains honest
  Given a critical confirmation succeeds
  When its operation context and informational views render
  Then the same operation MUST immediately show its confirmed result
  And any later-refreshed view MUST be marked updating or non-current without false zero, success, availability, or stale confirmation

Scenario: CD10-01 Cross-company access is rejected without disclosure or effects
  Given a query or mutation references a resource outside the authorized company
  When the server validates the request
  Then the request MUST be rejected without revealing whether the resource exists
  And no business, Stock, evidence, or successful audit effect MUST occur

Scenario: CD10-02 Critical audit does not close difference-resolution capability
  Given a critical Cajas action requires an applicable conceptual capability
  When the action is accepted or rejected
  Then actor, company, cause, and result MUST be auditable
  And the exact owner or capability for difference resolution MUST remain unassigned pending Franco's later business definition
```

## 16. Required verification

### 16.1 Product and scenario verification

1. Verify every requirement family against at least one scenario in §15 and verify the key exception paths for control, post-control changes, dispatch, return confirmation, loading, access denial, stale updates, authorization rejection, version-save failure, re-control failure, dispatch failure, and idempotent stock retries.
2. Verify the exact approved public labels are used, the technical term “snapshot” remains out of public copy, and formula, physical stock, selected composition, controlled evidence, dispatch evidence, current condition, and historical records remain distinct.
3. Verify only `Disponible` and `Con diferencias` are introduced as V1 return-control results and that current condition remains distinct from immutable historical records without implying a closed Box lifecycle state machine.
4. Verify search by SKU identity/description and physical-unit serial/internal code, result filters, and physical-unit summary counts.
5. Verify formula rows never request lot, serial, GTIN, expiration, or equivalent physical traceability.
6. Verify controlled evidence survives post-control changes, re-control, remittance issuance, return, and later formula viewing without silent rewriting.
7. Verify return control starts from the definitive dispatch snapshot and records unchanged lines without repeated entry.
8. Verify CD-01–CD-10 against `RESERVATION-01`–`RESERVATION-07`, `DISPATCH-06`–`DISPATCH-08`, `MULTI-07`–`MULTI-10`, `RETURN-13`–`RETURN-19`, `ACCOUNTING-01`–`ACCOUNTING-05`, `RESOLUTION-01`–`RESOLUTION-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`; scenarios `CD01-01`–`CD05-02`, `CD06-01`–`CD06-03`, `CD07-01`–`CD07-02`, reused `DG03-01`–`DG03-02`, `CD09-01`–`CD09-02`, and `CD10-01`–`CD10-02`.
9. Verify no provisional selection reserves Stock, Consumption and Return share one pending balance per dispatch in either order, replacement evidence remains custody-neutral for the original item, partial results never imply whole-box availability, and difference-resolution ownership/capability remains unresolved.

### 16.2 Manual UX and accessibility verification

At representative desktop and `412x915` viewports, verify populated, loading, empty, no-match, error, permission-denied, refreshing, stale, and successful states. Complete preparation, difference acknowledgement, control, post-control change, re-control, dispatch review, and each return exception using keyboard and touch. Confirm focus visibility, accessible names, target sizes, non-color meaning, state announcements, and inspectability of long identifiers and composition rows.

### 16.3 Scope verification

Final review MUST confirm that the artifact and any future implementation derived from it do not introduce financial cash/treasury scope, a rigid Box-only subsystem, legacy migration commitments, mass import, independent incident workflows, invented Auth roles or role mappings, unapproved permission architecture, schema/API/provider architecture, stock-accounting implementation, automatic billing/commercial/accounting effects, or any cardinality beyond `MULTI-01`–`MULTI-10`.

## 17. Closed product decisions, unresolved implementation choices, and stop conditions

### 17.1 DG-01–DG-07 closure

The following product decisions are CLOSED by Franco and MUST NOT be described as open or deferred in artifacts derived from this specification:

1. **DG-01 — terminology:** exact public labels are defined by `VOCAB-01`.
2. **DG-02 — formula editing/versioning:** direct confirmed editing occurs only in Articles/Stock; every save creates a future-only version while open preparations and history retain their prior version (`DETAIL-09`, `FORMULA-01`–`FORMULA-05`).
3. **DG-03 — difference resolution/re-control:** differences close individually; history is immutable; explicit `Recontrolar caja` creates a new record; only a clean successful re-control changes the current condition to `Disponible` (`RESOLUTION-01`–`RESOLUTION-05`).
4. **DG-04 — multiplicity/partial returns/reuse:** multiple boxes, multiple dispatches/remittances, partial returns, exclusive active-operation assignment, retained linkage, and bounded reuse follow `MULTI-01`–`MULTI-06`.
5. **DG-05 — capabilities/access:** current consultation access, approved action capabilities, existing dispatch/return permissions, no mandatory two-person rule, audit, disabled explanations, and server rejection follow `CAPABILITY-01`–`CAPABILITY-06`.
6. **DG-06 — Surgery/Record host:** Articles/Stock owns master management, Surgery/Record section `Cajas` hosts operation actions, existing remittance/return flows are contextualized, and `/cajas` remains search/summary (`HOST-01`–`HOST-05`).
7. **DG-07 — Stock checkpoints:** reservation, evidence-only control, dispatch success/failure, pre-dispatch release, return/consumption/review outcomes, explicit added/replacement movements, and atomic/audited/idempotent behavior follow `STOCK-01`–`STOCK-10`.

### 17.2 CD-01–CD-10 closure

The product decisions in `DECISIONS-CD01-CD10.md` are CLOSED by Franco and are normative through the following requirements and scenarios:

1. **CD-01 — reservation commitment:** `RESERVATION-01`–`RESERVATION-03`; `CD01-01`–`CD01-02`.
2. **CD-02 — pre-dispatch removal/cancellation:** `RESERVATION-04`–`RESERVATION-07`; `CD02-01`–`CD02-02`.
3. **CD-03 — successful issuance/annulment:** `DISPATCH-06`–`DISPATCH-08`; `CD03-01`–`CD03-02`.
4. **CD-04 — multiple dispatches/redispatch:** `MULTI-07`–`MULTI-10`; `CD04-01`–`CD04-02`.
5. **CD-05 — partial Return semantics:** `RETURN-13`–`RETURN-16`; `CD05-01`–`CD05-02`.
6. **CD-06 — shared Consumption/Return accounting:** expressly approved new product rule in `ACCOUNTING-01`–`ACCOUNTING-05`; `CD06-01`–`CD06-03`.
7. **CD-07 — added/replacement custody:** `RETURN-17`–`RETURN-19`; `CD07-01`–`CD07-02`.
8. **CD-08 — difference resolution/availability:** existing `RESOLUTION-01`–`RESOLUTION-05`; existing `DG03-01`–`DG03-02`; no new normative identifiers.
9. **CD-09 — read-model freshness:** `FRESHNESS-01`–`FRESHNESS-03`; `CD09-01`–`CD09-02`.
10. **CD-10 — company/capability boundary:** `COMPANY-01`–`COMPANY-03` and audit clarification in `CAPABILITY-05`; `CD10-01`–`CD10-02`. Exact difference-resolution ownership/capability remains unresolved.

### 17.3 Choices that remain unresolved and unauthorized

This specification does not select or authorize:

1. data model, schema, relationships, migration, seed, or production data;
2. API, service, validator, transaction, idempotency-key, concurrency-control, or audit-storage architecture;
3. Auth changes, capability implementation, role mapping, permission matrix, multi-company security design, provider changes, or the exact ownership/capability for difference resolution;
4. formula-edit validation rules and exact version presentation beyond the approved direct edit, confirmation, and observable version behavior;
5. Stock ledger/accounting representation, replenishment design, warehouse redesign, or any checkpoint effect not stated in `STOCK-01`–`STOCK-10`;
6. exact route, component, or sensitive Surgery/Record refactor needed to host section `Cajas`;
7. remittance, return, or consumption technical contracts and any financial/accounting integration; or
8. APPLY, implementation, production rollout, or mutation of protected files.

Any later artifact MUST stop and return to Franco if it needs to choose one of these items, expand an approved product rule, or cross a protected approval boundary. In particular, schema, migrations, Auth, productive Stock, role mapping, and sensitive Surgery/Record refactor remain blocked by their separate Task Briefs and approvals.

## 18. Proposal and decision traceability

This specification contains **154 normative requirements** and **70 acceptance scenarios**.

| Approved proposal outcome | Specification coverage |
| --- | --- |
| Box is a compound Article/SKU integrated with Articles/Stock | §§2–5; scenarios BOX-01–BOX-05 and DETAIL-01–DETAIL-04 |
| Base SKU and uniquely identified physical units | §§3–5; scenarios BOX-03, DETAIL-03–DETAIL-04 |
| Formula remains separate from physical selections and traceability | §§3, 5–7; scenarios DETAIL-02 and PREP-01–PREP-05 |
| Boxes list, search/filter/status summaries | §4; scenarios BOX-02–BOX-05 |
| SKU/unit detail and composition visibility | §5; scenarios DETAIL-01–DETAIL-04 |
| Formula-assisted physical preparation | §6; scenarios PREP-01–PREP-05 |
| Controlled preparation snapshot | §7; scenarios PREP-03–PREP-06 |
| Post-control history and mandatory re-control | §8; scenarios CHANGE-01–CHANGE-03 |
| Definitive remittance/dispatch snapshot | §9; scenarios DISPATCH-01–DISPATCH-03 |
| Exception-driven return without repeated entry | §10; scenarios RETURN-01–RETURN-06 |
| `Disponible` versus `Con diferencias` | §§3–4, 10, 14.2; scenarios BOX-04, RETURN-01–RETURN-07, DG03-01–DG03-02 |
| Simple incidents, not separate workflows | §11; scenarios RETURN-05 and RETURN-07 |
| Loading, empty, error, denied, refreshing, stale behavior | §12; scenarios STATE-01–STATE-04 |
| Responsive and accessible operation | §13; scenarios ACCESS-01–ACCESS-04 |
| Historical integrity and no unapproved implementation commitments | §§2–3, 14, 16–17 |
| DG-01 exact public terminology | §3; scenario DG01-01 |
| DG-02 future-only formula versioning | §§5, 14.1; scenarios DG02-01–DG02-02 |
| DG-03 immutable difference resolution and explicit re-control | §14.2; scenarios DG03-01–DG03-02 |
| DG-04 multiplicity, partial returns, and reuse | §14.3; scenarios DG04-01–DG04-02 |
| DG-05 capability-based access, audit, and rejection | §§12, 14.4; scenarios DG05-01–DG05-02 |
| DG-06 approved surface ownership | §§2, 14.5; scenarios DG06-01–DG06-02 |
| DG-07 approved Stock checkpoints and no-side-effect failures | §§9–10, 14.6; scenarios DG07-01–DG07-04 |
| CD-01 reservation only on explicit active-preparation incorporation | §§14.6–14.7; scenarios CD01-01–CD01-02 |
| CD-02 granular undispatched release and cancellation | §14.7; scenarios CD02-01–CD02-02 |
| CD-03 operationally valid issuance and non-destructive annulment | §§9, 14.8; scenarios CD03-01–CD03-02 |
| CD-04 independent bounded dispatches and redispatch | §§14.3, 14.9; scenarios CD04-01–CD04-02 |
| CD-05 dispatch-specific partial Return accounting and bounded availability | §§10, 14.10; scenarios CD05-01–CD05-02 |
| CD-06 approved shared Consumption/Return pending balance | §14.11; scenarios CD06-01–CD06-03 |
| CD-07 custody-neutral added/replacement review | §§10, 14.10; scenarios CD07-01–CD07-02 |
| CD-08 immutable difference resolution and explicit clean re-control | §14.2; existing scenarios DG03-01–DG03-02 |
| CD-09 critical-confirmation and read-model freshness | §§12, 14.12; scenarios CD09-01–CD09-02 |
| CD-10 company isolation, audit, and unresolved resolution capability | §§14.4, 14.13, 17.3; scenarios CD10-01–CD10-02 |
