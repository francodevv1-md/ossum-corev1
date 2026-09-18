# Proposal — COORDINATION-INTERACTIVE-METRICS-001

Status: proposed; approved product rules recorded; documentation only; ready for DESIGN and SPEC  
Change: `COORDINATION-INTERACTIVE-METRICS-001`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact chain: **PROPOSAL** → DESIGN → SPEC → TASKS → APPLY

---

## 1. Summary

Make the compact metrics in production **`Mi bandeja`** useful as cumulative operational filters and replace the current secondary-filter disclosure with a compact advanced-filter modal.

The summary metrics become **`Poner fecha`**, **`Fuera de plazo`**, **`Coordinadas`**, and **`En tránsito`**. Each metric is a toggle button. Multiple selected metrics combine with logical AND, counts remain stable while filters are changed, active state is exposed with `aria-pressed`, and contradictory selections produce an explicit filtered-empty state rather than silently looking like an empty inbox.

**`Más filtros`** opens a centered, mobile-friendly modal containing filters for **`CX`**, surgery-date range, **`Institución`**, **`Cliente`**, material-availability-date range, and CX state. Applied advanced filters are represented by an active count and removable chips, and all filters have explicit apply and clear paths.

This is a read-only filtering and presentation change. It does not create or complete an `AvailabilityRequest`, redesign case actions, or alter domain state. The persisted coordinator-assignment `createdAt` already exists and is already serialized by the server Coordination read service; this change is expected to require only carrying that field through the remaining existing productive read mapping. No schema or migration is expected.

---

## 2. Problem and current-state evidence

### 2.1 Summary metrics do not match the approved coordination questions

The current production summary uses **`Pendientes`**, **`SLA vencido`**, **`Sin disponibilidad`**, and **`En tránsito`** as passive cards. Those labels neither expose the approved date-coordination responsibilities nor let the coordinator drill into the counted cases. **`Sin disponibilidad`** also mixes material-availability language into the quick coordinator responsibility summary, where it is no longer approved.

The current quick filters are mutually exclusive. A coordinator cannot combine operational questions such as cases that still need a date and are already outside the 48-hour coordination window.

### 2.2 Secondary filters are too limited and not represented after disclosure

The current secondary disclosure contains only free-text search and state. It does not provide the approved CX, date-range, institution, client, or material-availability date filters. On constrained screens, active secondary state is summarized only generically, without a precise count or removable values.

### 2.3 The assignment timestamp exists but is dropped before productive derivation

`SurgeryContactAssignment.createdAt` is persisted by the current Prisma model. The surgery service selects it, the coordinator read model serializes it as an ISO timestamp, and `coordination-view.service.ts` includes it in each coordinator assignment DTO. However, the productive API-to-`Surgery` mapping currently retains only `contactId`, `label`, and `isPrimary`, dropping both `assignmentId` and `createdAt` from the hydrated client representation.

The existing generic SLA helper may fall back to history or authorization-date evidence. Those fallbacks are not valid for the approved **`Fuera de plazo`** metric. `Surgery.createdAt` is also explicitly not a coordination-assignment timestamp and must never be used for this metric.

---

## 3. Goals

1. Replace the current production `Mi bandeja` summary metrics with the four approved operational metrics and make them directly interactive.
2. Define one deterministic predicate for each metric over the successful, company-scoped personal-inbox dataset.
3. Allow any number of metric predicates to be selected simultaneously with AND semantics.
4. Keep displayed metric counts stable and understandable while metric or advanced filters are active.
5. Provide explicit active, clear, general filtered-empty, and contradictory filtered-empty behavior.
6. Replace the constrained secondary-filter disclosure with a compact centered/mobile-friendly **`Más filtros`** modal containing the approved fields.
7. Show the number and values of applied advanced filters outside the modal through an active count and removable chips.
8. Carry the already persisted coordinator-assignment timestamp through the existing read path without schema change or inferred substitutes.
9. Preserve personal-inbox identity, company isolation, one row per surgery, current state dimensions, and existing loading/error/true-empty distinctions.
10. Keep metric and advanced-filter interactions entirely read-only and independent from availability-request commands.

---

## 4. Non-goals

- No implementation is authorized by this proposal.
- No Prisma schema change, migration, seed, backfill, database mutation, or assignment rewrite.
- No Auth, permission, company-membership, preview-capability, or personal-subject redesign.
- No notification workflow, `AvailabilityRequest` workflow, PÍVOT designation, creator attribution, or material-availability mutation.
- No automatic request creation or action launch from a metric, chip, modal, filtered row, or empty state.
- No change to coordinator assignment creation, reassignment, ambiguity resolution, or active-contact eligibility.
- No change to CX state transitions, preparation state, logistics, surgery scheduling, availability-date ownership, or SLA policy outside this exact filter presentation.
- No action redesign, Expediente redesign, global-dashboard redesign, unrelated `Panel global` change, or broad Cirugías refactor.
- No replacement of backend/PostgreSQL truth with Zustand, `localStorage`, history inference, or client-created timestamps.
- No broad removal of material-availability facts from case detail. The approved removal is from coordinator summary metrics and quick responsibility language; separately valid detail or incident information is not redefined here.

---

## 5. Approved metric semantics

### 5.1 Base population

All four metrics operate on the same **base personal-inbox population**:

- a successful current-company Coordination read;
- the fixed resolved production `Mi bandeja` subject;
- surgeries whose coordinator assignment resolves to that subject under the existing assignment contract;
- one entry per surgery; and
- cases eligible for the existing active Coordination surface.

Loading, backend error, blocked personal resolution, cross-company data, ambiguous assignment, and true-empty states do not produce metric zeroes. Existing server-side company and personal-subject isolation remains authoritative; client filtering is never a tenant boundary.

For this proposal, an **active coordinator case** means a case in the existing non-final active Coordination population. DESIGN and SPEC must bind this term to the current shared bucket/eligibility helper rather than introduce a second lifecycle model. A completed, cancelled, suspended, archived, unresolved, or ambiguous case must not become active merely because another field matches a metric.

### 5.2 `Poner fecha`

A base case matches **`Poner fecha`** only when:

1. its coordinator assignment is resolved to the current inbox subject;
2. it is active; and
3. it has no canonical CX/surgery date in the existing Coordination read model.

Whitespace, malformed values, probable dates, material-availability dates, assignment dates, and display placeholders do not count as a CX date.

### 5.3 `Fuera de plazo`

A base case matches **`Fuera de plazo`** only when:

1. it still satisfies the coordination obligation represented by **`Poner fecha`**; and
2. at least 48 continuous hours have elapsed from the persisted `createdAt` of the resolved coordinator assignment for the current inbox subject.

The threshold is `elapsed >= 48 hours`, evaluated against an instant-preserving ISO timestamp. It is not “two calendar days.” The metric must use the persisted assignment timestamp and must never use `Surgery.createdAt`, authorization date, history text, probable date, current time minus a fabricated default, or any other fallback.

If a resolved assignment reaches the client without a valid assignment `createdAt`, the case does not qualify as **`Fuera de plazo`**. The implementation must preserve an honest missing-base outcome for diagnostics; it must not guess. Discovery of persisted assignment rows without `createdAt` would contradict the current model expectation and must stop implementation for data investigation.

### 5.4 `Coordinadas`

A base case matches **`Coordinadas`** when it has a valid canonical CX/surgery date in the existing Coordination read model. The metric does not mean “material available,” “prepared,” “notified,” or “request completed.”

### 5.5 `En tránsito`

A base case matches **`En tránsito`** only when its current canonical CX state is **`En tránsito`**. Preparation, box, remittance, material, or logistics signals cannot independently place a case in this metric.

### 5.6 Removal of `Sin disponibilidad`

**`Sin disponibilidad`** is removed from the production coordinator summary and from quick responsibility-filter language. It is not renamed into one of the four metrics. Material availability remains available only as the separately approved advanced date-range filter and wherever an independently governed detail/read model still requires it.

---

## 6. Metric interaction and count behavior

1. Each metric renders as a button with its Spanish label and stable count.
2. Selecting a metric toggles only that predicate. Selected buttons expose `aria-pressed="true"`; unselected buttons expose `aria-pressed="false"`.
3. Zero-count metrics remain operable and understandable; warning emphasis may reflect approved urgency but must not be the only selected-state cue.
4. Multiple selected metrics combine cumulatively with logical AND. They never behave as radio buttons and never silently replace a previous selection.
5. Metric predicates also combine with every applied advanced filter using AND.
6. Metric counts are computed from the successful base personal-inbox population before applying any metric or advanced filter. They do not facet, decrement, or recompute merely because a user selects another filter.
7. Counts may change only when the authoritative base dataset changes through a successful refresh, subject/company context changes, or the underlying case data changes. Filter interaction alone must not change them.
8. A visible clear path resets all selected metrics and applied advanced filters. Individual metric buttons and advanced-filter chips remain independently removable.
9. A normal no-match result renders **`No hay resultados con estos filtros`** and offers **`Limpiar filtros`** without implying that no cases are assigned.
10. A logically contradictory combination renders an explicit message such as **`Los filtros seleccionados se contradicen`**, identifies the active predicates through the existing active-state/chip presentation, and offers **`Limpiar filtros`**. The canonical example is **`Poner fecha`** AND **`Coordinadas`**, because one requires the CX date to be absent and the other requires it to be present.
11. Contradictory selection is allowed and represented honestly; the UI must not silently deselect one metric, rewrite AND as OR, or disable a metric without explanation.

---

## 7. Advanced-filter modal

### 7.1 Entry and applied-state summary

- The trigger label is **`Más filtros`**.
- When advanced filters are applied, the trigger shows an exact active-value count, for example **`Más filtros · 3`**.
- Applied values are visible outside the modal as concise removable chips with Spanish labels or unambiguous values.
- The count represents applied advanced filter values, not selected metric buttons. A date range contributes one active filter when either or both bounds are set; DESIGN must preserve that rule consistently in count and chips.
- Removing a chip immediately removes only that applied advanced filter and recomputes results under the remaining AND predicates.

### 7.2 Approved fields

The compact modal contains only these advanced filters:

1. **`CX`** — case reference/visible CX identifier using the existing read value; partial-match normalization may be specified later but must be deterministic.
2. **`Fecha de cirugía desde`** and **`Fecha de cirugía hasta`** — inclusive surgery-date range.
3. **`Institución`** — same-company institution value from the loaded authorized dataset or approved read projection.
4. **`Cliente`** — same-company client/payer value from the loaded authorized dataset or approved read projection.
5. **`Disponibilidad desde`** and **`Disponibilidad hasta`** — inclusive material-availability-date range using the existing read-model value, not request state.
6. **`Estado`** — canonical CX state, kept separate from preparation/material state.

Blank fields impose no predicate. Date-only values must compare as date-only values without browser time-zone shifts. An invalid range whose start is after its end must be explained inline and cannot be applied. Institution and client filtering should use stable IDs when the existing authorized projection supplies them; display-label matching must not become an authorization or cross-company lookup mechanism.

### 7.3 Draft, apply, and clear behavior

- Opening the modal initializes editable draft values from the currently applied advanced filters.
- Editing draft values does not change results, metric counts, chips, or the external active count until **`Aplicar`** is activated.
- **`Aplicar`** validates both ranges, commits the complete draft atomically as the applied advanced-filter set, closes the modal, and moves focus back to the trigger or result summary under the accessibility design.
- **`Limpiar`** clears every advanced-filter draft and applied advanced filter. It does not clear selected metric buttons unless the user invokes the global **`Limpiar filtros`** action.
- Closing or cancelling without applying discards draft-only changes and preserves the previously applied values.
- Reopening the modal reflects the current applied state, including changes made through external chip removal.

---

## 8. Data and read-path requirements

### 8.1 Assignment timestamp

The approved timestamp source for **`Fuera de plazo`** is the persisted `SurgeryContactAssignment.createdAt` belonging to the resolved coordinator assignment for the current personal-inbox subject.

Current exploration confirms:

```txt
SurgeryContactAssignment.createdAt (persisted)
  → surgery.service select
  → surgery-coordinator-read-model ISO DTO
  → coordination-view.service response
  → productive adapter/hydration mapping (currently drops createdAt)
  → shared metric predicate
```

The change must extend only the existing read representation needed to preserve `assignmentId`/`createdAt` through the final productive mapping. It must not add a second timestamp, duplicate assignment persistence, query Prisma from React, synthesize history, or change assignment writes.

If implementation exploration later disproves that the timestamp is persisted or available through the authorized company-scoped read service, work must stop and escalate; a schema or migration cannot be introduced under this change.

### 8.2 Other advanced-filter fields

CX date, current CX state, institution, client/payer, and visible CX reference already participate in the current Surgery/Coordination read projection. Material availability is presently an existing derived Coordination read value. DESIGN must identify the exact authoritative read field used by each predicate and preserve the current source hierarchy; it may carry already-read IDs or values through mapping but cannot create persistence.

An advanced filter must not query unrestricted contact lists from the browser, reveal cross-company options, or interpret a display label as tenant authority. If an approved filter field is not present in the authorized read model, the implementation may make a bounded read-projection addition only when the underlying value already exists; otherwise it must stop rather than add schema or invent data.

### 8.3 State ownership

Filter selections are presentation state, not domain state. They may live in the bounded `Mi bandeja` view state and must not mutate Surgery, assignment, notification, request, availability, Auth, or persisted user preferences under this change. A future decision may separately approve persisted filter preferences; this proposal does not.

---

## 9. Responsive, accessibility, and state constraints

### 9.1 Responsive behavior

- Metrics remain compact and must not push representative populated results beyond the existing requirement that results begin no later than the second viewport at `412x915` after persistent navigation and applicable banners.
- The four metric buttons must remain usable at desktop and mobile without clipped labels or horizontal page overflow. Layout may wrap or use a deliberate contained strip, but selected state and counts remain visible.
- **`Más filtros`** opens a compact centered dialog at desktop and a viewport-bounded, mobile-friendly dialog at constrained widths. It must not become a full dashboard or nested card stack.
- The modal body may scroll independently when necessary, while its title, context, and **`Aplicar`**/**`Limpiar`** actions remain reachable.
- Chips wrap without causing horizontal page overflow and may use a concise overflow treatment only if every active filter remains discoverable and removable.
- Interactive targets are at least `44x44` CSS pixels.

### 9.2 Accessibility

- Metric buttons expose accessible names containing the visible Spanish label and count, and expose toggle state with `aria-pressed`.
- The metric group has an accessible Spanish group name such as **`Filtros por métricas de coordinación`**.
- The modal has an accessible title, programmatic labels for every control, visible keyboard focus, focus trapping while open, Escape/cancel behavior that preserves applied state, and focus restoration on close.
- Date-range errors are programmatically associated with their controls and announced without relying on color.
- The trigger communicates the applied advanced-filter count; chips have specific remove labels such as **`Quitar filtro Institución: Hospital Italiano`**.
- Result-count changes, normal filtered-empty outcomes, contradictory outcomes, apply/clear actions, and refreshed metric counts use an appropriate concise live-region strategy. The system must not announce every case row.
- Loading, backend error, blocked identity, true empty, normal filtered empty, and contradictory filtered empty remain distinct and follow the existing precedence contract.

---

## 10. Scalability and maintainability constraints

1. Metric and advanced predicates must be pure, composable, and shared between count/filter tests rather than duplicated across JSX branches.
2. The successful base dataset should be normalized once per authoritative refresh. Stable metric counts are derived once from that base, and applied results are derived from the same snapshot without repeated per-render service calls.
3. One surgery remains one result even when it satisfies several metrics or advanced predicates.
4. Institution/client option construction must deduplicate deterministically and remain company-scoped. Large future datasets may move filtering or option search server-side, but must preserve the exact predicates, stable-count contract, AND semantics, and personal/company isolation specified here.
5. No metric click or modal edit may trigger one request per case, an N+1 contact lookup, a write, or an unrestricted global dataset fetch.
6. Date parsing and boundary comparisons must be centralized. The assignment timestamp uses instant arithmetic; surgery and material-availability ranges use date-only arithmetic.
7. Existing shared personal-inbox loading and refresh behavior remains authoritative: initial loading cannot flash zero counts, and background refresh should preserve the last successful display until the accepted read-state contract replaces it.

---

## 11. Separation from `AvailabilityRequest`

This change and `COORDINATION-AVAILABILITY-REQUEST-001` are independent.

- Interactive metrics and advanced filters are read-only views over authorized case data.
- **`Poner fecha`** refers to the missing CX/surgery schedule date, not **`Fecha de disponibilidad del material`** and not an open availability request.
- The material-availability date range filters a read value; it does not inspect, create, complete, reopen, or authorize an availability request.
- **`Sin disponibilidad`** is removed from summary/quick responsibility language and is not replaced by an `AvailabilityRequest` count.
- Clicking a metric, applying an advanced filter, removing a chip, or clearing filters cannot invoke **`Pedir disponibilidad`**, choose recipients, open an actionable request modal, or imply mutation permission.
- Any future row action for **`Pedir disponibilidad`** must continue through its separately approved server authorization, PÍVOT, creator, lifecycle, audit, idempotency, transaction, schema, and migration gates.
- Availability-request state must not alter these metric formulas unless a later independently approved specification changes them.

---

## 12. Dependencies and sequencing

1. `COORDINATION-DEV-PREVIEW-001` remains the upstream contract for strict production personal identity, company-scoped successful reads, explicit UI states, one surgery per row, and responsive hierarchy.
2. Current coordinator-assignment persistence and the existing surgery/Coordination read services are prerequisites. This proposal depends on their already serialized `assignmentId` and `createdAt`; it does not redesign them.
3. Current canonical separation of CX state from preparation/material state remains mandatory.
4. `COORDINATION-AVAILABILITY-REQUEST-001` is a separate downstream/parallel workflow and is not a prerequisite for these read-only filters.
5. DESIGN must freeze exact active-case eligibility reuse, assignment timestamp selection, filter-state model, modal/chip behavior, date normalization, and component ownership.
6. SPEC must convert the acceptance outline below into deterministic scenarios, including clock-boundary and contradiction cases.
7. TASKS must assign one writer and lock the sensitive Coordination/adapter/type chain before implementation. Any need to touch schema, migration, Auth, general permissions, AvailabilityRequest, Cirugías page, Expediente, or unrelated dashboard code stops the task for a new approval.

---

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| `Fuera de plazo` is calculated from Surgery creation or inferred history | Require the resolved persisted assignment `createdAt`; prohibit every fallback and test source precedence. |
| The productive mapping keeps dropping assignment time | Freeze the complete service → DTO → adapter/hydration → predicate contract in DESIGN and test every boundary. |
| Metric counts change after each click and become misleading | Compute all four counts from the unfiltered successful base population; filter state never facets counts. |
| Multiple metrics accidentally use OR or radio semantics | Centralize conjunction over a selected-predicate set and cover multi-selection scenarios. |
| Contradictory filters look like a true empty inbox | Give contradiction a distinct filtered-empty state and clear action under existing state precedence. |
| `En tránsito` is inferred from preparation or logistics | Match only canonical current CX state `En tránsito`. |
| `Coordinadas` is confused with material availability | Define it solely by canonical CX/surgery date and keep availability in the advanced range filter. |
| Removing `Sin disponibilidad` hides all useful availability context | Limit removal to summary/quick responsibility language; preserve separately governed detail/read information. |
| Modal draft changes unexpectedly alter live results | Separate draft from applied state; only `Aplicar`, `Limpiar`, or chip removal commits changes. |
| Date values shift across time zones | Use instant arithmetic for assignment SLA and date-only comparisons for surgery/availability ranges. |
| Contact option labels leak or collide across companies | Build options only from the authorized company-scoped projection and prefer stable IDs when already available. |
| Client filtering is mistaken for authorization | Preserve server company/subject isolation; filters only narrow already authorized data. |
| Scope expands into request workflow, actions, or schema | Keep explicit separation and stop when any new persistence or mutation is proposed. |
| Many filters cause repeated work or N+1 reads | Use one normalized base snapshot, pure memoizable predicates, deduplicated options, and no per-case request. |

---

## 14. Acceptance outline

A later SPEC must cover at least the following:

1. A successful resolved personal inbox renders exactly **`Poner fecha`**, **`Fuera de plazo`**, **`Coordinadas`**, and **`En tránsito`** as interactive metric buttons; **`Pendientes`**, **`SLA vencido`**, and summary **`Sin disponibilidad`** are absent.
2. `Poner fecha` counts and filters only active cases resolved to the current coordinator with no canonical CX date.
3. `Coordinadas` counts and filters cases with a canonical CX date, independently from material availability and preparation.
4. `En tránsito` counts and filters only current canonical CX state `En tránsito`; logistics/preparation signals alone do not match.
5. A case reaches `Fuera de plazo` exactly at 48 continuous hours from its resolved persisted assignment `createdAt`, not before.
6. `Fuera de plazo` never uses `Surgery.createdAt`, authorization date, history, probable date, or a fabricated fallback.
7. Missing or malformed assignment `createdAt` does not qualify as overdue and remains diagnosable without guessing.
8. Selecting two or more metric buttons applies all selected predicates with AND, and every selected button exposes `aria-pressed="true"`.
9. Metric counts remain unchanged while metric buttons, advanced filters, and chips are selected or removed; they update only with a new successful base dataset/context.
10. `Poner fecha` AND `Coordinadas` renders **`Los filtros seleccionados se contradicen`** (or approved equivalent), not true-empty copy, and offers **`Limpiar filtros`**.
11. A non-contradictory no-match combination renders **`No hay resultados con estos filtros`** and does not imply that the inbox has no assigned cases.
12. The global clear action removes all selected metrics and advanced filters; individual metric toggles and chips remove only their own predicate.
13. **`Más filtros`** opens a compact accessible modal with CX, surgery-date range, institution, client, material-availability-date range, and CX state—no unapproved workflow/action controls.
14. Draft modal edits do not change results before **`Aplicar`**. Apply commits all valid draft values together; cancel preserves previous applied state; **`Limpiar`** clears advanced filters under the defined boundary.
15. Invalid date ranges cannot be applied and expose an accessible inline Spanish explanation.
16. The external advanced-filter count and chips exactly represent applied values; removing one chip preserves every other metric and advanced filter.
17. Surgery and material-availability date ranges are inclusive and date-only with no time-zone day shift.
18. Institution and client options/results remain within the authorized company dataset and do not create cross-company lookup or disclosure.
19. Initial loading, background refresh, backend error, blocked identity, true empty, filtered empty, and contradictory filtered empty remain distinct; initial loading does not flash stable zero counts.
20. At desktop and `412x915`, metrics, trigger, modal, chips, and populated results remain operational; targets are at least `44x44`, focus is visible, the modal traps/restores focus, and changes are announced concisely.
21. One surgery renders once even when it satisfies several selected predicates.
22. No metric/filter interaction creates a mutation or changes Surgery, assignment, CX/preparation/logistics state, availability, request, notification, Auth, permission, or persisted preference data.
23. The existing persisted assignment timestamp travels through the current read path to the predicate without schema, migration, backfill, or duplicate timestamp storage.
24. Final-diff verification shows no schema, migration, Auth, DB workflow, notification workflow, AvailabilityRequest, action-redesign, unrelated dashboard, or dependency changes.

---

## 15. Proposal gate

This proposal records the approved product semantics and authorizes only progression to DESIGN and SPEC. It does not authorize APPLY.

The expected implementation is schema-free because assignment `createdAt` is already persisted and already present in the server Coordination DTO. If later work discovers that satisfying any acceptance condition requires new persistence, migration, Auth/permission changes, a material-availability request workflow, or a new business rule, the change must stop and return to Franco for a separate decision and Task Brief.
