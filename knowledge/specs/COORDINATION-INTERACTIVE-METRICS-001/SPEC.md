# SPEC — COORDINATION-INTERACTIVE-METRICS-001

Status: **specified; implementation not authorized**  
Change: `COORDINATION-INTERACTIVE-METRICS-001`  
Language: English; visible UI labels and examples are Spanish  
Source: approved `PROPOSAL.md` and the existing Coordination personal-inbox/read-path contracts  
Artifact chain: PROPOSAL → DESIGN → **SPEC** → TASKS → APPLY

---

## 1. Purpose

This specification defines four interactive, cumulative metrics and a compact advanced-filter modal for production **`Mi bandeja`**. The change is a read-only presentation and read-projection change. It SHALL preserve the existing company-scoped personal subject, one row per surgery, active-case eligibility, state precedence, and server authority.

The four metric buttons SHALL be exactly **`Poner fecha`**, **`Fuera de plazo`**, **`Coordinadas`**, and **`En tránsito`**. Selected metric predicates and applied advanced-filter predicates SHALL combine only with logical AND.

## 2. Scope and authoritative terms

- **Base snapshot:** the latest accepted successful, current-company Coordination read for the fixed resolved production personal-inbox subject, normalized to one entry per surgery and restricted by the existing shared non-final active Coordination eligibility/bucket contract. It excludes completed/finalized, cancelled, suspended, archived, unresolved, ambiguous, differently assigned, and cross-company cases.
- **Canonical CX date:** the existing canonical surgery/CX scheduling date in the authorized Coordination read model. Probable dates, material-availability dates, assignment dates, malformed values, whitespace, and display placeholders are not canonical CX dates.
- **Resolved assignment timestamp:** the persisted `SurgeryContactAssignment.createdAt` for the coordinator assignment that resolves the surgery to the current personal-inbox subject.
- **Applied filters:** selected metric predicates plus committed advanced-filter values. Modal draft values are not applied filters.
- **Contradictory selection:** an active predicate set that is logically unsatisfiable by definition, independently of the current data. The required contradiction in this change is **`Poner fecha`** AND **`Coordinadas`**.
- **Normal filtered empty:** the base snapshot is non-empty, the active predicate set is not contradictory, and no surgery matches all applied filters.
- **True empty:** a successful resolved personal-inbox read yields no base cases before user filtering.

## 3. Boundaries and prohibitions

**BOUND-01.** This change MUST apply to production **`Mi bandeja`** and MUST NOT alter `Panel global` datasets, metrics, filters, permissions, or derivations.

**BOUND-02.** The server SHALL remain authoritative for current company, personal subject, assignment resolution, and authorized data. Client filtering MUST only narrow an already authorized base snapshot and MUST NOT establish tenant or subject isolation.

**BOUND-03.** Metric and advanced-filter interactions MUST NOT create or modify Surgery, assignments, CX/preparation/logistics state, material availability, `AvailabilityRequest`, notifications, Auth, permissions, company membership, audit subject, or persisted user preferences.

**BOUND-04.** This change MUST NOT modify Prisma schema, create or run migrations, add a backfill, seed data, duplicate assignment timestamps, add persistence, or introduce a dependency.

**BOUND-05.** **`Sin disponibilidad`**, **`Pendientes`**, and **`SLA vencido`** MUST be absent from the production personal-inbox summary metrics. Removing **`Sin disponibilidad`** from this summary MUST NOT remove independently governed availability detail or incident information.

**BOUND-06.** No metric, chip, modal control, empty state, or filtered row MAY initiate **`Pedir disponibilidad`** or any other command.

## 4. Base snapshot and read path

**BASE-01.** Metrics, counts, options, and results MUST be derived only after a successful company-scoped read and resolved personal subject. Loading, backend error, blocked identity, stale context, and access denial MUST NOT be represented as zero metric counts.

**BASE-02.** Active-case membership SHALL reuse the existing shared Coordination eligibility/bucket helper. This specification MUST NOT create a second lifecycle model. A case SHALL NOT enter the base snapshot merely because it matches a date, state, institution, client, or availability predicate.

**BASE-03.** The normalized base snapshot SHALL contain each surgery ID at most once, even when several assignment representations or predicates match.

**RPATH-01.** The authorized read path SHALL preserve the resolved assignment's existing `assignmentId` and instant-preserving ISO `createdAt` through the existing chain:

```txt
SurgeryContactAssignment.createdAt
  → surgery service projection
  → coordinator read-model DTO
  → Coordination view response
  → productive adapter/hydration representation
  → shared metric predicate
```

**RPATH-02.** The productive mapping MUST associate `createdAt` with the exact assignment row/contact ID used by existing assignment resolution. It MUST NOT select another assignment by array order, `isPrimary`, label, or recency.

**RPATH-03.** `Surgery.createdAt`, authorization date, history text, probable date, current time minus a fabricated duration, or any other inferred value MUST NOT substitute for assignment `createdAt`.

**RPATH-04.** If a resolved client-side assignment timestamp is absent or is not a valid instant-preserving ISO timestamp, the case SHALL be classified as an honest missing/invalid overdue base, SHALL NOT match **`Fuera de plazo`**, and SHALL remain diagnosable without fabricated data.

**RPATH-05.** Discovery that persisted assignment rows lack `createdAt`, or that an approved filter field requires new persistence rather than a bounded projection of an existing value, MUST stop implementation and escalate to Franco. No schema or migration is permitted under this change.

## 5. Exact metric predicates

For every case `c` in base snapshot `B`, predicates SHALL be pure and evaluated against one accepted snapshot and one captured evaluation instant `now`.

**METRIC-01 — `Poner fecha`.** `putDate(c)` SHALL be true if and only if `c` remains resolved to the current inbox subject, is active under `BASE-02`, and has no valid canonical CX date.

**METRIC-02 — `Fuera de plazo`.** `overdue(c, now)` SHALL be true if and only if `putDate(c)` is true, the resolved assignment timestamp is valid, and `now - assignment.createdAt >= 48 × 60 × 60 × 1000` milliseconds. The comparison SHALL use continuous instant arithmetic, not calendar-day arithmetic or rounded displayed hours. A future assignment timestamp SHALL not match.

**METRIC-03 — `Coordinadas`.** `coordinated(c)` SHALL be true if and only if `c` has a valid canonical CX date. Material availability, preparation, notification, request, and logistics state MUST NOT affect this predicate.

**METRIC-04 — `En tránsito`.** `inTransit(c)` SHALL be true if and only if the current canonical CX state equals exactly **`En tránsito`** under the existing canonical state representation. Preparation, box, remittance, material, or logistics signals alone MUST NOT satisfy it.

**METRIC-05.** The four displayed counts SHALL equal the independent cardinalities of `{c ∈ B | predicate(c)}`. They SHALL be computed before applying any metric or advanced filter.

**METRIC-06.** A metric count MAY change only when a new successful authoritative base snapshot is accepted, its underlying case data changes, the resolved subject changes, or company/session context changes. Selecting, removing, drafting, applying, or clearing filters MUST NOT facet or recompute counts from filtered results.

## 6. Metric interaction and result conjunction

**INT-01.** Each metric SHALL render as an operable toggle button with its Spanish label and stable count. Selected buttons SHALL expose `aria-pressed="true"`; unselected buttons SHALL expose `aria-pressed="false"`.

**INT-02.** Activating a metric button SHALL toggle only that metric. Any number from zero through four MAY be selected. Selection MUST NOT behave as radio input, silently replace another selection, or use OR.

**INT-03.** A surgery SHALL be visible if and only if it belongs to `B` and satisfies every selected metric predicate and every applied advanced-filter predicate.

**INT-04.** Zero-count metric buttons SHALL remain operable. Color or warning emphasis MUST NOT be the sole selected-state cue.

**INT-05.** Individually toggling a selected metric off SHALL remove only that predicate. Removing an advanced-filter chip SHALL remove only that advanced predicate. Both actions SHALL immediately recompute results from the same base snapshot without changing metric counts.

**INT-06.** The global **`Limpiar filtros`** action SHALL clear all selected metrics and all applied advanced filters. It SHALL also reset any subsequently opened modal draft to the now-empty applied advanced state.

**INT-07.** **`Poner fecha`** AND **`Coordinadas`** SHALL remain selectable and SHALL produce the contradictory filtered-empty state. The UI MUST NOT disable, deselect, rewrite, or hide either predicate.

**INT-08.** A contradictory result SHALL display **`Los filtros seleccionados se contradicen`** (or a Franco-approved equivalent), preserve identification of active predicates, and offer **`Limpiar filtros`**. It MUST NOT display true-empty copy.

**INT-09.** A non-contradictory zero-result conjunction over a non-empty base SHALL display **`No hay resultados con estos filtros`** and **`Limpiar filtros`** and MUST NOT imply that no surgeries are assigned.

## 7. Advanced-filter model and exact predicates

The compact **`Más filtros`** modal SHALL contain only the following fields. Blank draft/applied values impose no predicate.

**ADV-01 — `CX`.** The predicate SHALL compare the existing visible CX reference. Both query and candidate SHALL be trimmed and Unicode case-folded; a case matches when the non-empty normalized query is a contiguous substring of the normalized visible reference. It MUST NOT search unrestricted records or unrelated case fields.

**ADV-02 — surgery-date range.** **`Fecha de cirugía desde`** and **`Fecha de cirugía hasta`** SHALL compare the canonical CX date as a calendar date. A present lower bound is inclusive (`caseDate >= from`); a present upper bound is inclusive (`caseDate <= to`). A case with a missing or invalid canonical CX date SHALL not match an active surgery-date range.

**ADV-03 — `Institución`.** Selection SHALL use the stable institution ID when the authorized projection supplies it. Otherwise it SHALL use one deterministic normalized exact-label key built only from the loaded authorized company snapshot. A case matches only the selected option identity. Labels MUST NOT become authorization evidence or trigger cross-company lookup.

**ADV-04 — `Cliente`.** Selection SHALL use the stable payer/client contact ID when the authorized projection supplies it. Otherwise it SHALL use one deterministic normalized exact-label key built only from the loaded authorized company snapshot. A case matches only the selected option identity. Client filtering MUST NOT alter authorization.

**ADV-05 — availability-date range.** **`Disponibilidad desde`** and **`Disponibilidad hasta`** SHALL compare the existing derived material-availability read value as a calendar date, with inclusive lower and upper bounds. A case with a missing or invalid availability date SHALL not match an active availability-date range. `AvailabilityRequest` state MUST NOT contribute to this predicate.

**ADV-06 — `Estado`.** The predicate SHALL be exact equality with the existing canonical current CX state selected under **`Estado`**. Preparation, material, box, remittance, and logistics state MUST NOT be options or substitutes.

**ADV-07.** Date-only inputs and case values SHALL be normalized as calendar `YYYY-MM-DD` values without conversion through browser-local or UTC instants. Instant arithmetic is reserved for **`Fuera de plazo`**.

**ADV-08.** If a date range has both bounds and `from > to`, **`Aplicar`** SHALL be blocked. A specific Spanish inline error SHALL identify the invalid range and be programmatically associated with its controls. An invalid draft SHALL not change the applied set.

**ADV-09.** Institution and client options SHALL be company-scoped, deduplicated deterministically by their stable option identity, and derived only from the authorized snapshot or an approved bounded read projection. Missing values SHALL not create selectable fabricated options.

## 8. Modal draft, apply, clear, count, and chips

**MODAL-01.** The trigger SHALL be labeled **`Más filtros`** and SHALL open a compact accessible dialog centered on desktop and viewport-bounded/mobile-friendly at constrained widths.

**MODAL-02.** Opening or reopening the modal SHALL copy the complete currently applied advanced-filter set into a separate editable draft, including any prior external chip removals.

**MODAL-03.** Draft edits SHALL NOT change visible results, stable metric counts, external chips, or the trigger's active count before **`Aplicar`**.

**MODAL-04.** **`Aplicar`** SHALL validate both date ranges and, only when valid, atomically replace the complete applied advanced-filter set with the complete draft, close the modal, recompute results under all remaining AND predicates, and restore focus to the trigger or move it to the result summary according to the accessibility implementation.

**MODAL-05.** Cancel, Escape, or non-apply close SHALL discard draft-only edits and preserve the applied advanced-filter set, selected metrics, results, chips, and active count.

**MODAL-06.** **`Limpiar`** inside the modal SHALL clear every advanced-filter draft and every applied advanced filter immediately. It SHALL preserve selected metrics. It SHALL NOT require or imply a domain write. Whether the dialog remains open is presentational, but its draft and external applied state MUST both be empty after the action.

**MODAL-07.** The trigger count SHALL equal the number of active advanced-filter values and SHALL exclude metric buttons. CX, Institution, Cliente, and Estado each contribute one. Each date range contributes one when either or both of its bounds is present. Thus the maximum count is six.

**MODAL-08.** When the count is nonzero, the trigger SHALL expose it exactly, for example **`Más filtros · 3`**. Applied advanced filters SHALL also appear outside the modal as concise removable chips. Each logical date range SHALL produce one chip, including whichever bounds are set.

**MODAL-09.** Removing one chip SHALL preserve every selected metric and every other applied advanced filter. The active count, modal reopening state, results, and live-region summary SHALL update consistently.

## 9. State transitions and context changes

**STATE-01.** Existing state precedence SHALL remain authoritative: access/capability denial or blocked identity; initial loading; backend error; successful loaded true-empty/populated; contradictory filtered empty; normal filtered empty. Background refresh MAY overlay the last successful loaded state.

**STATE-02.** Initial loading MUST NOT flash zero metric counts or any empty-state copy. A background refresh SHALL preserve the last successful display until the accepted read-state contract replaces it and MUST NOT present stale counts as newly refreshed.

**STATE-03.** On a successful same-company, same-subject refresh, applied presentation filters MAY remain selected; counts and results SHALL be recomputed atomically from the newly accepted base snapshot.

**STATE-04.** When a case changes canonical date, CX state, active eligibility, assignment resolution, institution/client, or availability date, no local filter interaction may pretend to mutate it. Its membership and counts SHALL change only when a successful authoritative refresh accepts that changed data.

**STATE-05.** A change of authenticated session, current company, or resolved/preview subject SHALL invalidate the prior base snapshot, counts, options, chips, drafts, and selected metrics before protected data for the new context is shown. No filter state or result from one tenant/subject MAY be presented as belonging to another.

**STATE-06.** A failed or blocked context transition SHALL show the existing error/blocked state and SHALL expose neither stale personal rows nor stale metric zeroes.

## 10. Responsive, accessibility, and scalability requirements

**RESP-01.** The four metrics MUST remain compact and usable at desktop and `412x915`, without clipped labels or horizontal page overflow. Representative populated results SHALL begin no later than the second viewport after persistent navigation and applicable banners.

**RESP-02.** Metrics MAY wrap or use a deliberate contained strip. Selected state and counts SHALL remain visible. Chips SHALL wrap without page overflow; any overflow treatment MUST keep every active filter discoverable and removable.

**RESP-03.** The modal body MAY scroll independently, but its title, context, **`Aplicar`**, and **`Limpiar`** actions SHALL remain reachable. It MUST NOT become a full dashboard or nested card stack.

**A11Y-01.** Interactive targets SHALL be at least `44x44` CSS pixels. Keyboard focus SHALL be visible and follow visual order.

**A11Y-02.** Each metric's accessible name SHALL contain its visible Spanish label and count. The group SHALL have an accessible Spanish name such as **`Filtros por métricas de coordinación`**.

**A11Y-03.** The modal SHALL have an accessible title and programmatic labels for every control, trap focus while open, support Escape/cancel without application, and restore focus when closed.

**A11Y-04.** Date errors SHALL be announced and MUST NOT rely on color. Chip remove controls SHALL use specific Spanish labels such as **`Quitar filtro Institución: Hospital Italiano`**.

**A11Y-05.** Result-count changes, refresh-completed metric changes, apply/clear actions, and both filtered-empty outcomes SHALL use a concise live-region strategy. The system MUST NOT announce every row.

**SCALE-01.** Metric and advanced predicates SHALL be pure, composable, centralized, and shared by counts/filter verification rather than duplicated across rendering branches.

**SCALE-02.** The successful dataset SHALL be normalized once per accepted refresh. Counts and filtered results SHALL derive from the same snapshot without per-render service calls.

**SCALE-03.** Metric clicks, modal edits, chip removal, and clear actions MUST NOT cause one request per case, N+1 contact lookup, unrestricted global fetch, or write.

**SCALE-04.** Future server-side filtering or option search MAY replace local evaluation for scale only if it preserves these exact predicates, stable-count snapshot contract, AND semantics, one-row identity, and company/personal isolation.

## 11. Acceptance scenarios

### 11.1 Base, metrics, timestamps, and counts

```gherkin
Scenario: M-1 The approved metric set replaces legacy summary metrics
  Given a successful resolved production personal inbox
  When its summary renders
  Then exactly "Poner fecha", "Fuera de plazo", "Coordinadas", and "En tránsito" SHALL render as metric buttons
  And "Pendientes", "SLA vencido", and summary "Sin disponibilidad" SHALL be absent

Scenario: M-2 Poner fecha requires an active resolved case without canonical CX date
  Given an active case is resolved to the current subject and has no valid canonical CX date
  When the metric predicates run
  Then it SHALL match "Poner fecha"
  But a probable date, availability date, assignment date, malformed value, whitespace, or placeholder SHALL not count as a CX date

Scenario: M-3 Coordinadas depends only on canonical CX date
  Given an active base case has a valid canonical CX date
  When its material, preparation, notification, and request facts vary
  Then it SHALL match "Coordinadas" in every variation
  And it SHALL not match "Poner fecha"

Scenario: M-4 En tránsito uses canonical CX state only
  Given one case has canonical CX state "En tránsito"
  And another case has logistics or preparation transit signals but a different CX state
  When the predicate runs
  Then only the first case SHALL match "En tránsito"

Scenario: M-5 Fuera de plazo starts exactly at 48 continuous hours
  Given an active "Poner fecha" case has resolved assignment createdAt "2026-07-18T12:00:00.000Z"
  When now is "2026-07-20T11:59:59.999Z"
  Then it SHALL not match "Fuera de plazo"
  When now is "2026-07-20T12:00:00.000Z"
  Then it SHALL match "Fuera de plazo"

Scenario: M-6 Overdue has no fallback
  Given a "Poner fecha" case has a missing or malformed resolved assignment createdAt
  And Surgery.createdAt, authorization date, history, and probable date are present
  When "Fuera de plazo" is evaluated
  Then the case SHALL not match
  And the missing or invalid assignment timestamp SHALL remain diagnosable

Scenario: M-7 Final or ineligible cases cannot re-enter through a metric
  Given a completed, cancelled, suspended, archived, unresolved, ambiguous, differently assigned, or cross-company case otherwise matches a metric field
  When the base snapshot is formed
  Then the case SHALL be excluded before metric evaluation

Scenario: M-8 Counts are stable under filter interaction
  Given one accepted base snapshot has metric counts 4, 2, 5, and 1
  When metrics are toggled, modal drafts are edited or applied, or chips are removed
  Then the displayed counts SHALL remain 4, 2, 5, and 1
  When a new successful authoritative snapshot is accepted
  Then all counts and results SHALL update atomically from that snapshot
```

### 11.2 AND selection, clearing, and empty states

```gherkin
Scenario: I-1 Multiple metrics and advanced filters are conjunctive
  Given "Poner fecha" and "Fuera de plazo" are selected
  And an Institution filter is applied
  When results are derived
  Then a surgery SHALL render only if all three predicates are true
  And both metric buttons SHALL expose aria-pressed="true"

Scenario: I-2 Contradictory metrics remain selected and explicit
  Given "Poner fecha" is selected
  When the user selects "Coordinadas"
  Then both buttons SHALL remain selected
  And the UI SHALL show "Los filtros seleccionados se contradicen"
  And "Limpiar filtros" SHALL be offered
  And neither radio, OR, disable, nor silent deselection behavior SHALL occur

Scenario: I-3 Normal filtered empty differs from true empty
  Given the successful base snapshot contains assigned cases
  And a non-contradictory applied conjunction matches none
  When results render
  Then the UI SHALL show "No hay resultados con estos filtros" and "Limpiar filtros"
  And it SHALL not claim that no surgeries are assigned

Scenario: I-4 Individual and global clear boundaries
  Given two metrics and three advanced filters are active
  When one metric is toggled off
  Then only that metric predicate SHALL be removed
  When one chip is removed
  Then only that advanced predicate SHALL be removed
  When "Limpiar filtros" is activated
  Then all metric and advanced predicates SHALL be removed

Scenario: I-5 One surgery remains one result
  Given one surgery satisfies several selected predicates
  When results render
  Then that surgery SHALL render exactly once
```

### 11.3 Advanced predicates and modal transaction

```gherkin
Scenario: A-1 The modal contains only approved fields
  Given the user activates "Más filtros"
  When the modal opens
  Then it SHALL contain CX, surgery-date range, Institución, Cliente, availability-date range, and Estado
  And it SHALL contain no request, workflow, mutation, preparation-state, or logistics-state control

Scenario: A-2 Inclusive date-only ranges do not shift by time zone
  Given surgery-date bounds are 2026-07-20 through 2026-07-22
  And cases have canonical dates on 2026-07-20, 2026-07-22, no date, and 2026-07-23
  When the range is applied in any browser time zone
  Then the boundary-date cases SHALL match
  And the missing-date and 2026-07-23 cases SHALL not match

Scenario: A-3 Missing availability date does not match an active availability range
  Given an availability range has at least one bound
  And a case has no valid material-availability read value
  When results are derived
  Then that case SHALL not match
  And no AvailabilityRequest state SHALL be inspected

Scenario: A-4 Invalid ranges cannot be applied
  Given a draft range starts after it ends
  When the user activates "Aplicar"
  Then application SHALL be blocked
  And an accessible inline Spanish error SHALL identify the range
  And prior applied filters and results SHALL remain unchanged

Scenario: A-5 Draft changes are transactional
  Given applied advanced filters already exist
  When the modal opens and the user edits several draft values
  Then results, chips, active count, and metric counts SHALL remain unchanged
  When the user activates "Aplicar" with valid ranges
  Then the complete draft SHALL replace the applied advanced set atomically
  And the modal SHALL close

Scenario: A-6 Cancel discards draft-only changes
  Given the modal draft differs from the applied set
  When the user cancels, presses Escape, or closes without applying
  Then the previous applied set, results, chips, and count SHALL remain
  And reopening SHALL initialize from that applied set

Scenario: A-7 Modal clear preserves metrics
  Given metrics and advanced filters are active
  When the user activates modal "Limpiar"
  Then all advanced draft and applied values SHALL clear immediately
  And every selected metric SHALL remain selected

Scenario: A-8 Count and chips represent logical advanced values exactly
  Given CX, both surgery-date bounds, Institución, one availability bound, and Estado are applied
  Then the trigger SHALL read "Más filtros · 5"
  And five removable logical chips SHALL be represented
  When the Institución chip is removed
  Then the trigger SHALL read "Más filtros · 4"
  And all other metrics and advanced values SHALL remain

Scenario: A-9 Options remain company scoped
  Given authorized company C1 and foreign company C2 contain similarly labeled institutions or clients
  When options and results are built for C1
  Then only authorized C1 values SHALL be available
  And labels SHALL not authorize or disclose C2 records
```

### 11.4 State, context, responsive, accessibility, and no-write behavior

```gherkin
Scenario: S-1 Initial loading and failure never flash metric zeroes
  Given no successful base snapshot is accepted
  When the read is loading, blocked, or fails
  Then zero metric counts, true-empty copy, and filtered-empty copy SHALL remain hidden
  And the existing loading, blocked, or error state SHALL render instead

Scenario: S-2 Same-context refresh accepts one coherent replacement
  Given a successful same-company and same-subject display with active filters
  When a background refresh begins and later succeeds with changed case data
  Then the prior successful display SHALL remain honest during refresh
  And counts, options, and results SHALL switch together to the accepted new snapshot

Scenario: S-3 Tenant, subject, or session change clears stale presentation state
  Given company C1 or subject K1 data and filters are displayed
  When the session, current company, or resolved subject changes
  Then prior rows, counts, options, chips, drafts, and selections SHALL be invalidated
  And none SHALL be presented as data for the new context

Scenario: S-4 Desktop and mobile remain operational
  Given representative populated results at desktop and 412x915
  When metrics, trigger, chips, and modal render
  Then labels SHALL not clip or cause horizontal page overflow
  And results SHALL begin no later than the second viewport
  And every target SHALL be at least 44x44 CSS pixels

Scenario: S-5 Modal and changes are accessible
  Given a keyboard or assistive-technology user operates the filters
  When the modal opens, validates, applies, clears, or closes
  Then focus SHALL be visible and trapped while open and restored on close
  And controls, errors, aria-pressed states, chip removal, counts, and concise result changes SHALL be programmatically understandable
  And individual case rows SHALL not each be announced

Scenario: S-6 Filtering remains read-only and bounded
  Given the user toggles metrics, edits or applies the modal, removes chips, and clears filters
  When network and persisted state are inspected
  Then no domain, preference, request, notification, assignment, Auth, or permission write SHALL occur
  And no per-case request, N+1 lookup, or unrestricted global fetch SHALL occur

Scenario: S-7 The persisted timestamp crosses the existing read path without persistence changes
  Given an assignment has persisted assignmentId and createdAt
  When the personal Coordination read is projected, serialized, mapped, and hydrated
  Then both values SHALL remain associated with the resolved assignment used by the predicate
  And no schema, migration, backfill, duplicate timestamp, or assignment rewrite SHALL exist
```

## 12. Required verification

1. **Predicate tests:** all four exact predicates; active-case exclusion; canonical-date validation; exact CX state; missing dates; future, malformed, missing, 1 ms before, and exact 48-hour assignment timestamps; prohibited fallback sources.
2. **Composition tests:** zero through four selected metrics; AND with every advanced filter; contradiction; normal filtered empty; one row per surgery; independent removal and global clear.
3. **Stable-count tests:** metric/advanced toggle, draft, apply, chip removal, clear, same-context refresh, and context replacement.
4. **Advanced-filter tests:** deterministic CX partial match; exact institution/client identity; exact CX state; inclusive one-sided/two-sided date-only ranges; missing/invalid case dates; invalid draft ranges; six-value maximum count; one chip per logical range.
5. **Read-path tests:** persisted assignment `createdAt` and `assignmentId` survive service → DTO → response → productive mapping → predicate and remain tied to the resolved subject assignment.
6. **State tests:** initial loading, background refresh, backend error, blocked identity, true empty, populated, normal filtered empty, contradiction, tenant/session/subject change, and stale-data exclusion.
7. **Accessibility/responsive tests:** accessible group/button names and `aria-pressed`; modal labels, focus trap/restore, Escape, errors, live regions, specific chip labels, `44x44` targets, no overflow, and `412x915` second-viewport result position.
8. **Isolation/no-write tests:** company/subject option and result scope; no `AvailabilityRequest` coupling; no mutation or persisted preference; no per-case/N+1/global fetch.
9. **Final-diff review:** no schema, migration, seed, backfill, Auth, permission, DB workflow, notification workflow, `AvailabilityRequest`, unrelated dashboard, dependency, or broad Cirugías changes.

## 13. Stop conditions

Implementation MUST stop and return to Franco if:

- the approved assignment timestamp is not persisted or cannot pass through the existing authorized read service;
- any approved filter requires new persistence, migration, schema, unrestricted contact lookup, or an invented domain value;
- active-case eligibility cannot reuse the current shared Coordination contract;
- company/personal isolation, exact AND behavior, stable counts, or one-row identity cannot be preserved;
- the work would alter Auth, permissions, assignments, CX/preparation/logistics transitions, availability-request workflow, notification workflow, global panel, or unrelated Cirugías behavior; or
- a new business rule is required.

## 14. Proposal traceability

| Approved proposal rule | Specification coverage |
| --- | --- |
| Four exact interactive metrics; legacy summary removal | §§1, 3, 5–6; M-1–M-4 |
| Shared active personal-inbox base; company/subject isolation; one row | §§2, 4; M-7, I-5, S-3 |
| Persisted assignment `createdAt`; exact 48 continuous hours; no fallback | §§4–5; M-5–M-6, S-7 |
| AND-combinable metrics and advanced filters | §6; I-1–I-2 |
| Stable non-faceted counts | §§5–6; M-8 |
| Normal and contradictory filtered-empty states | §6; I-2–I-3 |
| Individual removal and global clear | §§6, 8; I-4 |
| Compact `Más filtros` modal and approved fields only | §§7–8; A-1 |
| Draft/apply/cancel/clear semantics | §8; A-4–A-7 |
| Exact active count and removable chips; range counts as one | §8; A-8 |
| Inclusive date-only ranges and missing/invalid dates | §7; A-2–A-4 |
| Institution/client company scope and stable identity | §7; A-9 |
| CX and canonical CX-state predicates | §7; predicate verification in §12 |
| Loading/error/blocked/true-empty/refresh distinctions | §9; S-1–S-2 |
| Tenant/session/subject changes and domain state transitions | §9; S-2–S-3 |
| Responsive and accessibility constraints | §10; S-4–S-5 |
| Pure predicates, one snapshot, no N+1, scalable equivalence | §10; S-6 |
| Personal/global boundary; read-only; AvailabilityRequest separation | §3; S-6 |
| Existing read-path propagation; no schema expectation | §4; S-7; §§12–13 |

This SPEC authorizes progression to TASKS only after any required DESIGN artifact is consistent with it. It does not authorize APPLY.
