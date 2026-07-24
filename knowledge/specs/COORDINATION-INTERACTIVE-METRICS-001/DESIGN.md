# DESIGN — COORDINATION-INTERACTIVE-METRICS-001

Status: **designed; implementation not authorized**  
Change: `COORDINATION-INTERACTIVE-METRICS-001`  
Language: English; visible UI labels and examples are Spanish  
Sources: approved `PROPOSAL.md`, normative `SPEC.md`, and the current Coordination personal-inbox/read-path contracts  
Scope: production **`Mi bandeja`** only

---

## 1. Purpose and design decision

This design implements the SPEC conceptually as one read-only client derivation over the latest accepted, company-scoped personal-inbox snapshot. It replaces the legacy summary and radio-like quick filters with four stable-count metric toggle buttons and a transactional advanced-filter dialog.

The design has five decisions:

1. preserve authorized assignment ownership independently from timestamp quality, and carry the existing persisted coordinator-assignment `createdAt` and `assignmentId` through the productive adapter and hydration boundary as an explicit valid/missing/invalid SLA basis; do not infer or persist another timestamp;
2. normalize one immutable `CoordinatorCase[]` base snapshot per accepted read and derive metric counts and filtered results through centralized pure functions;
3. represent selected metrics, applied advanced filters, and modal draft filters as separate presentation states;
4. invalidate all snapshot and filter state when actor, company, mode, surface, or subject identity changes, while preserving the last accepted display during a same-context refresh; and
5. keep this change completely independent from `AvailabilityRequest`, all commands, `Panel global`, schema, Auth, permissions, and domain writes.

The implementation SHALL stop rather than weaken any of those decisions.

---

## 2. Current evidence and no-schema proof

### 2.1 Existing persisted and serialized assignment timestamp

Current repository evidence establishes this chain:

| Boundary | Current evidence | Design consequence |
| --- | --- | --- |
| Persistence | `SurgeryContactAssignment.createdAt` already exists. | No model, migration, backfill, seed, or duplicate timestamp is needed. |
| Surgery projection | `surgeryReadSelect(companyId)` selects assignment `id`, `contactId`, `isPrimary`, and `createdAt`. | The existing company-valid assignment query remains authoritative. |
| Assignment serializer | `serializeEligibleCoordinatorAssignments()` emits `assignmentId` and `createdAt.toISOString()`. | The server already creates an instant-preserving ISO value. |
| Coordination view | `mapCoordinationSurgery()` emits every assignment's `assignmentId` and `createdAt`. | The endpoint contract already contains the required data. |
| Productive adapter parser | `readCoordinatorAssignments()` already reads both fields, but currently rejects the complete assignment item when `createdAt` is absent. | Parsing must preserve an identity-valid assignment independently from timestamp quality; no new endpoint or database read is needed. |
| Productive hydration | `mapApiSurgeryRowToSurgery()` currently maps only `contactId`, `label`, and `isPrimary` from parsed rows and recomputes resolution after parsing. | The bounded gap is to preserve the already-returned server resolution independently and carry timestamp quality through the final client representation. |

Therefore, the permitted read-path change is to retain already-read fields. If implementation evidence disproves any row above, work stops under §16.

### 2.2 Existing advanced-filter inputs

The existing authorized Coordination response already contains:

- visible CX reference: `visibleNumber`;
- canonical CX date input: `surgeryDate`, hydrated as `Surgery.date`;
- canonical CX state input: `cxStatus`, hydrated as normalized `Surgery.state`;
- institution identity and label: `institutionId` plus `institution` relation;
- client/payer identity and label: `payerContactId` plus `payer` relation; and
- the current productive `CoordinatorCase` construction already produces `materialAvailabilityDate` through the existing bounded `getMaterialAvailability()` derivation over its loaded operational read state.

The productive adapter currently retains the labels but not both already-returned stable IDs. A bounded adapter/hydration extension may carry `institutionId` to `Surgery.institutionContactId` and `payerContactId` to `Surgery.clientContactId`. It creates no lookup and no authority. If a required value is not already available in the authorized snapshot or existing bounded read projection, implementation stops; it does not query an unrestricted contact list or add persistence.

### 2.3 Existing eligibility and identity contracts

- The server resolves and filters the production personal subject by exact coordinator contact ID.
- `filterCoordinatorCasesByContactId()` rechecks `coordinatorAssignmentState === "resolved"` and exact `coordinadorContactId` equality.
- `getCoordinatorBucket()` is the current shared lifecycle/bucket derivation.
- Archived surgeries are already excluded by the surgery service query.
- `CoordinatorCase` is already the personal-inbox view model used by productive rendering.

This design does not add a second lifecycle model. It defines the active base as cases that pass existing personal resolution and whose existing bucket is non-null and not `finalizado`. Consequently, finalized, realized/non-bucketed, cancelled, suspended, archived, unresolved, ambiguous, differently assigned, and cross-company cases cannot re-enter through a filter predicate.

---

## 3. Architecture and component boundaries

### 3.1 Modules

The implementation should have four bounded concerns:

1. **Existing server read path**
   - continues to select, serialize, authorize, and return assignment and surgery data;
   - receives no new query, mutation, permission, or schema behavior.

2. **Productive adapter/hydration extension**
   - consumes the server-returned `coordinatorAssignment` resolution as the authorized ownership result, independently from assignment timestamp parsing;
   - preserves identity-valid assignment `assignmentId`/`contactId` even when `createdAt` is missing or malformed;
   - hydrates timestamp quality as an explicit valid/missing/invalid SLA-basis state in `Surgery.coordinatorAssignments` and then `CoordinatorCase`;
   - preserves already-returned institution and payer/client IDs;
   - performs structural validation without choosing or weakening assignment ownership.

3. **Pure Coordination filtering module**
   - defines normalized filter types, date parsers, exact metric predicates, advanced predicates, option builders, contradiction detection, stable counts, chips, and conjunction;
   - imports no React, store, API client, command, or dialog code;
   - receives `now` explicitly.

4. **Personal-inbox presentation**
   - owns metric selection, applied advanced filters, dialog draft, focus/live-region behavior, and rendering;
   - derives from one accepted base snapshot;
   - does not place predicate logic in JSX and does not alter existing case actions.

### 3.2 Proposed file placement

The expected minimal implementation surface is:

```txt
src/types/index.ts
src/lib/api/surgery-adapter.ts
src/components/coordinadores/coordinator-queue.helpers.ts
src/components/coordinadores/coordination-filtering.ts          // new pure module
src/components/coordinadores/CoordinationMetricFilters.tsx      // new presentation
src/components/coordinadores/CoordinationAdvancedFilters.tsx    // new dialog/chips
src/components/coordinadores/CoordinatorInboxView.tsx
src/components/coordinadores/coordination-ui-state.ts
src/components/coordinadores/CoordinationStateSurface.tsx
src/hooks/useCoordinationView.ts                                // only if accepted-context metadata is needed
focused unit/component tests
```

`CoordinationSecondaryFilters.tsx` may be removed from the productive personal-inbox graph or replaced by the new advanced-filter component. It must not remain as a second live search/state filter. `Panel global` and preview-only component graphs are outside scope.

---

## 4. Exact assignment data flow

### 4.1 End-to-end flow

```txt
SurgeryContactAssignment.createdAt + id
  → surgeryReadSelect(companyId).contactAssignments
  → serializeEligibleCoordinatorAssignments()
       { assignmentId, contactId, label, isPrimary, createdAt: ISO }
  → mapCoordinationSurgery().coordinatorAssignments
  → GET /api/companies/{companyId}/coordination/view (private, no-store)
  → fetchCoordinationView()
  → mapApiSurgeryToRow()
       ownership := server coordinatorAssignment resolution
       rows := readCoordinatorAssignments() without timestamp-based row rejection
  → mapApiSurgeryRowToSurgery()
       Surgery.coordinatorAssignmentState/contact ID retain authorized ownership
       Surgery.coordinatorAssignments[] retains identity + timestamp status
  → store hydration for the accepted production context
  → CoordinatorCase construction
       resolvedAssignmentSlaBasis := valid | missing | invalid
  → overdue(case, capturedNow)
```

No point in this chain may make authorized ownership contingent on timestamp validity or substitute `Surgery.createdAt`, `fechaAutorizacion`, history, probable date, a display label, array order, `isPrimary`, or a fabricated default.

### 4.2 Wire, parser, and hydrated read shapes

The canonical server DTO remains the current no-schema contract:

```ts
type CoordinatorAssignmentWireDto = {
  assignmentId: string
  contactId: string
  label: string
  isPrimary: boolean
  createdAt: string // current serializer emits Date.toISOString()
}
```

The browser treats the network payload as untrusted. It parses assignment identity separately from timestamp quality. A row with valid `assignmentId`, `contactId`, `label`, and `isPrimary` is retained even when `createdAt` is absent or malformed:

```ts
type CoordinatorAssignmentClient = {
  assignmentId: string
  contactId: string
  label: string
  isPrimary: boolean
  slaBasis:
    | { status: "valid"; createdAt: string; epochMs: number }
    | { status: "missing"; diagnosticCode: "assignment_created_at_missing" }
    | {
        status: "invalid"
        diagnosticCode: "assignment_created_at_invalid"
      }
}
```

The parser rejects a complete assignment row only when its ownership identity fields are structurally unusable; timestamp absence or malformation never causes row rejection. The server-returned singular `coordinatorAssignment` resolution is parsed independently and remains authoritative for `coordinatorAssignmentState`, `coordinadorContactId`, and personal-inbox membership. The client must not recompute ownership from only the timestamp-valid subset of assignment rows.

`CoordinatorCase` exposes the subject-specific basis explicitly:

```ts
type AssignmentSlaBasis =
  | {
      status: "valid"
      assignmentId: string
      contactId: string
      createdAt: string
      epochMs: number
    }
  | {
      status: "missing"
      contactId: string
      assignmentId?: string
      diagnosticCode: "assignment_created_at_missing" | "resolved_assignment_row_missing"
    }
  | {
      status: "invalid"
      contactId: string
      assignmentId?: string
      diagnosticCode: "assignment_created_at_invalid" | "multiple_resolved_assignment_rows"
    }

type CoordinatorCase = {
  // existing fields
  resolvedAssignmentSlaBasis: AssignmentSlaBasis
}
```

These fields remain read-only DTO/view-model data. They are not editable assignment state and do not alter server ownership.

### 4.3 Exact resolved-row association

Assignment ownership and SLA-basis classification are two separate operations.

**Ownership operation:** consume the existing server-authorized `coordinatorAssignment` resolution. A singular resolved contact remains resolved and remains eligible for **`Mi bandeja`** under the existing personal/bucket contract regardless of whether its timestamp is valid, missing, or malformed. Timestamp parsing cannot turn `resolved` into `none` or `ambiguous`.

**SLA-basis operation:** after ownership is fixed:

1. require case resolution status `resolved`;
2. require exact equality between the current personal subject contact ID and `surgery.coordinadorContactId`;
3. select identity-valid assignment rows whose `contactId` equals that exact subject ID;
4. when exactly one row has a valid explicit-offset ISO instant, return `valid` with its exact `assignmentId`, `contactId`, ISO value, and epoch;
5. when the exact row exists but its timestamp is absent, return `missing`;
6. when the exact row exists but its timestamp is malformed, return `invalid`;
7. when no relational row exists for an otherwise authorized legacy-only resolution, return `missing` with `resolved_assignment_row_missing`; and
8. when several rows for the resolved contact prevent exact row association, return `invalid` with `multiple_resolved_assignment_rows` rather than selecting by order, primary, or recency.

`missing` and `invalid` are SLA-basis outcomes, not assignment-resolution outcomes. Both make **`Fuera de plazo`** false, but the case remains in the base snapshot and can still match **`Poner fecha`**, **`Coordinadas`**, **`En tránsito`**, and advanced filters according to their independent fields.

The outcome must be observable through a bounded diagnostic code/counter or existing client diagnostics hook so tests and operations can distinguish valid, missing, and invalid bases. Diagnostics must not fabricate time, expose another tenant, change visible ownership, trigger a write, or require schema. Discovery of a persisted row whose database `createdAt` is actually absent still triggers the SPEC RPATH-05 investigation stop; the read behavior remains fail-honest and does not remove the already authorized case while that condition is surfaced.

### 4.4 Timestamp validation and arithmetic

An assignment timestamp is valid only when it:

- is a non-empty ISO/RFC 3339 datetime containing `T` and an explicit `Z` or numeric UTC offset;
- parses to a finite instant; and
- is not date-only or dependent on browser-local timezone interpretation.

`overdue(case, now)` reads `case.resolvedAssignmentSlaBasis`, computes raw epoch milliseconds, and returns true only when:

```txt
putDate(case) === true
AND case.resolvedAssignmentSlaBasis.status === valid
AND nowMs >= case.resolvedAssignmentSlaBasis.epochMs
AND nowMs - case.resolvedAssignmentSlaBasis.epochMs >= 172_800_000
```

One `evaluationNow` is captured when a successful base snapshot is accepted. It is reused for all four counts and all result derivations from that snapshot. Filter interaction never recaptures time. A refresh accepts a new snapshot and captures a new instant atomically, allowing the 48-hour boundary to advance without count drift during interaction.

---

## 5. Base snapshot normalization

### 5.1 Snapshot envelope

The personal inbox derives a single immutable envelope:

```ts
type CoordinationBaseSnapshot = {
  contextKey: string
  acceptedAt: number
  subjectContactId: string
  cases: readonly CoordinatorCase[]
  counts: Readonly<Record<MetricKey, number>>
  institutionOptions: readonly FilterOption[]
  clientOptions: readonly FilterOption[]
  diagnostics: {
    assignmentSlaBasis: {
      missing: number
      invalid: number
      byCode: Readonly<Record<string, number>>
    }
  }
}
```

It is created only when `controller.hasSuccessfulData` is true for the exact accepted context. Normalization performs, in order:

1. hydrate the server-authorized assignment resolution without filtering assignment rows by timestamp validity;
2. build existing `CoordinatorCase` values and classify each resolved subject's `resolvedAssignmentSlaBasis` as `valid`, `missing`, or `invalid`;
3. recheck exact personal contact ID with `filterCoordinatorCasesByContactId()` using the independent authorized resolution fields;
4. retain only the existing non-final active bucket population (`bucket !== null && bucket !== "finalizado"`);
5. deduplicate by stable surgery identity, preferring `backendId` when present and otherwise the already unique hydrated surgery ID;
6. freeze the case order using the existing personal-inbox ordering contract;
7. capture `acceptedAt` once;
8. derive all metric counts and authorized options from those exact cases; and
9. emit one non-identifying assignment-SLA diagnostic aggregate for the accepted snapshot, counting `missing`/`invalid` cases by diagnostic code without raw timestamps, labels, or cross-company data.

No metric, advanced predicate, or SLA-basis status participates in assignment ownership or base formation. A resolved active case with `missing` or `invalid` SLA basis remains in `cases`; only the `Fuera de plazo` predicate excludes it. One surgery therefore appears at most once regardless of how many predicates it satisfies.

### 5.2 Canonical field bindings

| Predicate input | Exact `CoordinatorCase` source | Normalization |
| --- | --- | --- |
| CX visible reference | `surgery.visibleNumber` | trim + Unicode case fold for substring matching; no technical-ID fallback |
| Canonical CX date | `surgery.date` hydrated from `surgeryDate` | valid calendar `YYYY-MM-DD` only |
| Canonical CX state | `surgery.state` hydrated from backend CX state | exact existing canonical Spanish state value |
| Institution identity | `surgery.institutionContactId`, else authorized normalized `surgery.institution` label | stable ID preferred; exact fallback key |
| Client identity | `surgery.clientContactId`, else authorized normalized `surgery.client` label | stable ID preferred; exact fallback key |
| Material availability date | `CoordinatorCase.materialAvailabilityDate` from existing `getMaterialAvailability()` | valid calendar `YYYY-MM-DD` only |
| Active eligibility | existing `bucket` result | non-null and not `finalizado` |
| Assignment ownership | server-authorized `coordinatorAssignment` resolution, hydrated independently | exact resolved contact ID; never timestamp-dependent |
| Assignment SLA basis | `CoordinatorCase.resolvedAssignmentSlaBasis` from exact subject-matching identity rows | explicit `valid` / `missing` / `invalid`; only `valid` carries an epoch instant |

Whitespace, malformed values, placeholders, probable dates, and display labels such as `Sin fecha` never become canonical dates.

---

## 6. Pure predicate and count pipeline

### 6.1 Metric keys and predicates

```ts
type MetricKey = "put-date" | "overdue" | "coordinated" | "in-transit"

putDate(c)      = active(c) && !canonicalCxDate(c)
overdue(c, now) = putDate(c) && validResolvedBasis(c) && elapsed(c, now) >= 48h
coordinated(c)  = canonicalCxDate(c) is valid
inTransit(c)    = canonicalCxState(c) === "En tránsito"
```

The base has already enforced personal ownership and active eligibility, but `putDate` retains the active guard so focused predicate tests cannot accidentally use it over an ineligible case. `coordinated` and `inTransit` are evaluated only over the base and do not inspect material, preparation, request, remittance, box, or logistics signals.

The old generic `getSlaMeta(getCoordinatorAssignmentBaseDate(...))` is not used for `Fuera de plazo`. Existing SLA display/incident behavior outside these new metric predicates is unchanged.

### 6.2 Stable counts

```ts
function countMetrics(B, now) {
  return {
    "put-date": count(B, c => putDate(c)),
    overdue: count(B, c => overdue(c, now)),
    coordinated: count(B, c => coordinated(c)),
    "in-transit": count(B, c => inTransit(c)),
  }
}
```

`countMetrics` runs against the accepted base before any selected metric or applied advanced filter. Its result is stored in the snapshot envelope. Button toggles, draft edits, apply, modal clear, chip removal, and global clear do not invoke it with filtered data. A new successful same-context snapshot atomically replaces cases, options, counts, and `acceptedAt`.

### 6.3 Result conjunction

The filtered result pipeline is:

```txt
accepted base cases
  → every selected metric predicate is true
  → every non-blank applied advanced predicate is true
  → preserve one-row identity and existing deterministic order
  → section derivation/rendering
```

There is no OR branch. Zero selected metrics means the metric stage is an identity operation. Blank advanced values impose no predicate.

### 6.4 Contradiction detection

Contradiction is determined from predicate definitions, not current rows. The pure detector reports these known unsatisfiable sets:

- `Poner fecha` + `Coordinadas`;
- `Fuera de plazo` + `Coordinadas`, because overdue implies missing canonical CX date;
- `Poner fecha` or `Fuera de plazo` + an active surgery-date range, because that range requires a canonical CX date.

The canonical required case remains `Poner fecha` + `Coordinadas`. Contradictory selections stay active and flow to a dedicated state; buttons are never disabled or silently rewritten.

---

## 7. Advanced-filter predicates

### 7.1 Applied shape

```ts
type DateOnlyRange = { from: string; to: string }

type AdvancedFilters = {
  cx: string
  surgeryDate: DateOnlyRange
  institution: FilterIdentity | null
  client: FilterIdentity | null
  availabilityDate: DateOnlyRange
  cxState: string
}

type FilterIdentity =
  | { kind: "id"; value: string; label: string }
  | { kind: "label-key"; value: string; label: string }
```

Empty strings and null identities are blank. Applied filter objects are replaced, not mutated.

### 7.2 Text and identity normalization

CX query and candidate are trimmed, normalized with Unicode `NFKC`, and locale-lowercased consistently. The non-empty query matches a contiguous substring of `visibleNumber` only.

Institution and client options are built only from cases in the accepted authorized base. Stable IDs are preferred. When an ID is absent, the fallback key is a deterministic `NFKC`, trimmed, whitespace-collapsed, locale-lowercased exact label. Options are deduplicated by `kind + value` and sorted by normalized label then key. Missing/placeholder values do not create options. Labels never authorize, widen, or trigger a lookup.

### 7.3 Date-only rules

Surgery and availability dates and bounds are accepted only as valid Gregorian `YYYY-MM-DD` calendar values. Comparison uses normalized date strings after validity checking because that format is lexically ordered. No `Date`, UTC conversion, browser-local midnight, or instant arithmetic is used.

- lower bounds are inclusive;
- upper bounds are inclusive;
- either bound may be independently active;
- a case with a missing/invalid corresponding date does not match an active range;
- if both bounds exist and `from > to`, apply is blocked without changing applied state.

Spanish inline errors should be specific, for example **`La fecha desde no puede ser posterior a la fecha hasta.`** Each error is associated with both controls in its range and announced once.

### 7.4 CX state and availability separation

`Estado` is exact equality with canonical current CX state. It does not list or inspect preparation, material, box, remittance, or logistics states.

The availability range reads only `CoordinatorCase.materialAvailabilityDate`. It never imports, fetches, or inspects `AvailabilityRequest`, request status, request recipients, or request permissions.

---

## 8. Presentation state and transitions

### 8.1 State model

```ts
type CoordinationFilterState = {
  selectedMetrics: ReadonlySet<MetricKey>
  appliedAdvanced: AdvancedFilters
  modal: {
    open: boolean
    draft: AdvancedFilters
    errors: RangeErrors
  }
}
```

All state is in-memory and bounded to the mounted personal inbox. It is not stored in Zustand persistence, `localStorage`, URL state, cookies, server preferences, or domain data.

### 8.2 Metric transitions

- Clicking a metric toggles only its key in `selectedMetrics`.
- Any zero-to-four metrics may remain active.
- Results recompute immediately from the same base and applied advanced set.
- Stable counts do not change.
- Global **`Limpiar filtros`** empties `selectedMetrics` and resets `appliedAdvanced`; the next modal open copies the empty set.

### 8.3 Dialog transaction

- **Open/reopen:** copy the complete current `appliedAdvanced` into `modal.draft`; clear stale validation errors.
- **Edit:** update draft only. Results, metric counts, trigger count, and external chips remain unchanged.
- **Aplicar:** validate both ranges. On success, atomically replace `appliedAdvanced` with a normalized copy of the complete draft, close, recompute results, announce the summary, and restore focus according to §11. On failure, keep the dialog open and focus/announce the first invalid range.
- **Cancel / Escape / non-apply close:** discard draft and errors; retain all applied state and selected metrics.
- **Limpiar inside dialog:** immediately reset both draft and applied advanced filters, preserve selected metrics, chips/count/results update immediately, and announce **`Filtros avanzados eliminados`**. The dialog may remain open with empty controls.
- **External chip removal:** remove exactly one logical applied value and immediately recompute. If the dialog is closed, the next open copies this new state. No hidden stale draft survives reopening.

### 8.4 Active count and chips

The advanced count excludes metrics and is the sum of six logical fields:

1. CX;
2. surgery-date range when either bound exists;
3. Institution;
4. Cliente;
5. availability-date range when either bound exists;
6. Estado.

The maximum is six. Each active logical field creates exactly one external chip; a two-bound range remains one chip. Removing a range chip removes both bounds. Labels are concise and unambiguous, for example:

- `CX: 1042`
- `Cirugía: 20/07/2026–22/07/2026`
- `Institución: Hospital Italiano`
- `Disponibilidad: desde 20/07/2026`
- `Estado: En tránsito`

### 8.5 Legacy quick-filter replacement

The four metric buttons are the new quick-filter layer. The legacy **`Mi bandeja`**, **`Vence hoy`**, **`Vencidas`**, and **`Sin fecha`** radio-like strip is removed from productive personal filtering, as are the old live free-text/state controls. Their replacement is:

```txt
interactive metric group
→ Más filtros trigger + exact advanced count
→ applied chips
→ result state and case sections
```

Metrics and applied advanced filters always combine with AND. Opening or editing advanced draft state has no interaction with quick metric selection until a valid apply or explicit modal clear.

---

## 9. Loaded-state and stale-context protection

### 9.1 State precedence

The personal UI state extends the existing state machine with two distinct filtered-empty outcomes:

```txt
blocked/access or identity state
→ initial loading
→ initial backend error
→ accepted true empty
→ accepted populated
   → contradictory filtered empty
   → normal filtered empty
```

A same-context background refresh may overlay the last accepted true-empty or populated display. Initial loading, blocked identity, access denial, and initial error never render zero metric counts or filtered-empty copy.

### 9.2 Context identity

The trust identity is the tuple already represented by the controller context key:

```txt
actorId : companyId : mode : surface : subjectContactId
```

Before data for a different tuple can render, the controller and inbox SHALL invalidate:

- prior response/store rows for the Coordination display;
- accepted base snapshot and counts;
- institution/client options;
- selected metrics;
- applied advanced filters and chips;
- open dialog, draft, and validation errors; and
- pending live-region messages that name prior results.

Late responses are rejected by the existing request sequence and exact request-context check. Filter state is reset on trust-context change, not merely after a new request succeeds. A failed or blocked transition therefore cannot expose the prior subject's rows or zeroes.

### 9.3 Same-context refresh

During a refresh for the same trust tuple:

- keep the complete prior accepted snapshot, counts, options, selected metrics, and applied filters visible;
- mark the surface `aria-busy="true"` and show **`Actualizando…`**;
- do not mutate the snapshot from partial hydration;
- on success, normalize one replacement, capture one new `acceptedAt`, and atomically replace cases/counts/options/results;
- retain applied filters and metrics, but clear any now-invalid selected option identity only if that option no longer exists, then announce the adjustment explicitly;
- on failure, preserve the prior display and show the existing refresh-error message.

The accepted context key and accepted snapshot should be exposed together by the controller or formed in one memoized boundary after successful synchronous hydration. A render that combines a new response context with old store rows is forbidden.

---

## 10. Modal and responsive architecture

### 10.1 Dialog structure

Use the repository's existing accessible dialog primitive; no dependency is added. The dialog contains one form-like layout:

```txt
Title: Más filtros
Context: Afiná los casos de tu bandeja
CX
Fecha de cirugía desde / hasta
Institución
Cliente
Disponibilidad desde / hasta
Estado
inline range errors
sticky/reachable actions: Limpiar | Aplicar
```

It contains no request, recipient, preparation, logistics, mutation, or action controls. The dialog component receives authorized option arrays and draft/apply callbacks; it does not access the store, API, Auth, or domain services.

### 10.2 Desktop

- Centered dialog with a bounded width suitable for two-column range rows.
- Compact spacing and one visual surface; no nested dashboard or card stack.
- Body scrolls independently if viewport height requires it.
- Header and action area remain visible or reachable without page overflow.

### 10.3 Mobile at `412x915`

- Viewport-bounded dialog with safe horizontal margins and maximum height based on the dynamic viewport.
- Single-column controls except each date pair may remain a deliberate two-column row only if labels and values do not clip.
- Internal body scrolling; title and actions remain reachable.
- Metric buttons use a compact 2×2 wrap or equivalent contained layout with visible label/count and no horizontal page overflow.
- Chips wrap within the content width; no chip forces document overflow.
- Every button, trigger, select, input, and chip removal control has at least a `44x44` CSS-pixel target.
- With representative populated content, the first result begins no later than the second viewport after persistent navigation and applicable banners.

The dialog is not converted into a separate dashboard. Responsive behavior changes layout, not fields or semantics.

---

## 11. Accessibility and announcements

### 11.1 Metric group

- Render a semantic group named **`Filtros por métricas de coordinación`**.
- Each metric is a real button with visible Spanish label and count.
- Accessible name includes both, for example **`Fuera de plazo, 2 casos`**.
- `aria-pressed` is always explicit.
- Selected state uses more than color: pressed styling plus a persistent visual indicator.
- Zero-count buttons remain keyboard- and pointer-operable.

### 11.2 Dialog and focus

- Dialog has programmatic title and optional description.
- All controls have visible/programmatic Spanish labels.
- Focus is trapped while open and Escape behaves as cancel.
- On ordinary cancel/close and modal clear, focus returns to **`Más filtros`**.
- On successful apply, focus normally returns to the trigger; when an empty outcome needs immediate explanation, focus may move to a programmatically focusable result summary. The chosen behavior must be consistent and tested.
- Invalid apply focuses the first invalid range and associates the error through `aria-describedby`/invalid state without relying on color.

### 11.3 Chips and live region

Each removal control has a specific label such as **`Quitar filtro Institución: Hospital Italiano`**. The visible chip remains understandable without its remove icon.

Use one concise polite live region for aggregate changes, not row announcements. Examples:

- **`12 resultados. 2 métricas y 3 filtros avanzados activos.`**
- **`Filtro Institución eliminado. 18 resultados.`**
- **`Los filtros seleccionados se contradicen.`**
- **`Filtros eliminados. 24 resultados.`**
- **`Datos actualizados. Fuera de plazo: 3. 14 resultados.`**

Initial errors continue to use the existing alert semantics. The UI must not announce every case row or duplicate the same change from multiple nested live regions.

---

## 12. Empty-state behavior

Given an accepted snapshot:

| Condition | State and Spanish copy |
| --- | --- |
| Base has zero cases | Existing true empty: **`No tenés casos asignados en esta etapa.`** No clear action. |
| Known contradiction exists | Dedicated contradictory state: **`Los filtros seleccionados se contradicen`** plus **`Limpiar filtros`**. Active buttons/chips remain visible. |
| Base is non-empty, filters active, conjunction has zero rows | Normal filtered empty: **`No hay resultados con estos filtros`** plus **`Limpiar filtros`**. |
| Filtered rows exist | Populated sections render normally. |

Contradiction takes precedence over normal filtered empty but never over blocked, loading, error, or true-empty states. True empty is determined before user filters; active presentation state should already have been cleared on context replacement.

---

## 13. Explicit separation from AvailabilityRequest and permissions

`COORDINATION-AVAILABILITY-REQUEST-001` is a separate workflow and is neither an input nor a dependency of this design.

- **`Poner fecha`** means missing canonical CX/surgery date, not missing material availability.
- The availability range reads an existing derived date; it does not read request state.
- **`Sin disponibilidad`** disappears only from summary/quick responsibility language; independently governed detail and incident displays are unchanged.
- No metric, chip, modal action, result, or empty state can create, complete, reopen, authorize, or navigate into an availability request.
- No request recipients, original creator, PÍVOT, lifecycle, audit, idempotency, transaction, schema, or migration rule is imported into this change.
- Existing production case actions remain under their current permissions, but this filtering feature grants no action and changes no permission.
- `Panel global` datasets, filters, metrics, preview permissions, and personal/global access checks remain unchanged.

Client filtering only narrows data already authorized and personally scoped by the server. It is never a tenant boundary or proof of access.

---

## 14. Verification and SPEC trace map

### 14.1 Pure unit tests

| Test group | Required coverage | SPEC/scenarios |
| --- | --- | --- |
| Base normalization | exact subject, existing active/non-final eligibility, archived/final/ineligible exclusion, dedupe by surgery identity; resolved cases remain present with missing/invalid SLA basis | BASE-01–03; M-2, M-6, M-7, I-5 |
| Ownership versus SLA basis | server-authorized resolved ownership survives valid, absent, and malformed timestamps; exact subject association; zero/duplicate/invalid rows; no primary/order/recency fallback | RPATH-01–05; M-5, M-6, S-7 |
| Timestamp arithmetic | future instant, malformed, missing, 1 ms before 48h, exact 48h, after 48h, explicit offsets | METRIC-02; M-5, M-6 |
| Metrics | exact four predicates; canonical date; CX state only; no material/preparation/request influence | METRIC-01–05; M-1–M-4 |
| Stable counts | counts from base only; unchanged by metric/advanced/draft/chip/clear interaction; new snapshot replacement | METRIC-05–06; M-8 |
| AND composition | zero through four metrics, every advanced predicate, one row, individual removal | INT-01–06; I-1, I-4, I-5 |
| Contradictions | canonical pair and implied missing-date/date-required combinations | INT-07–09; I-2, I-3 |
| CX predicate | trim, Unicode case fold, contiguous substring, visible reference only | ADV-01 |
| Date-only | valid calendar dates, inclusive one/two-sided bounds, missing/invalid cases, no timezone shift | ADV-02, 05, 07–08; A-2–A-4 |
| Options/identity | stable ID preferred, fallback exact key, deterministic dedupe/sort, no placeholders | ADV-03–04, 09; A-9 |
| Active count/chips | maximum six, one per logical range, exact removal behavior | MODAL-07–09; A-8 |

### 14.2 Adapter/read-path tests

- service serializer preserves `assignmentId` and ISO `createdAt`;
- Coordination response preserves them unchanged;
- adapter parser retains an identity-valid assignment when `createdAt` is absent or malformed and classifies its SLA basis without fabricating values;
- the server-returned `coordinatorAssignment` resolution hydrates ownership independently from the assignment timestamp subset;
- hydration preserves identity and valid/missing/invalid timestamp status in `Surgery.coordinatorAssignments` and `CoordinatorCase.resolvedAssignmentSlaBasis`;
- a resolved active case with missing/malformed `createdAt` remains in **`Mi bandeja`**, may match independent predicates, never matches **`Fuera de plazo`**, and emits the matching diagnostic/observability code;
- exact subject matching with a valid basis reaches the overdue predicate;
- missing, invalid, legacy-row-missing, and duplicate-row diagnostic states are distinguishable without exposing another tenant or issuing a write;
- institution and payer IDs survive only from already-authorized response fields;
- `Surgery.createdAt`, history, authorization, probable date, and generic SLA helper are never read by the overdue predicate;
- no schema, migration, backfill, assignment rewrite, or duplicate timestamp exists.

Coverage: RPATH-01–05 and S-7.

### 14.3 Reducer/component tests

- exactly four button labels render; legacy metrics and legacy quick filters are absent;
- each button name includes count and exposes correct `aria-pressed`;
- multi-select remains AND and zero-count buttons operate;
- opening copies applied state to draft;
- draft edits do not change external state;
- valid apply atomically replaces all advanced values;
- invalid range blocks apply and preserves prior applied values;
- cancel/Escape discards draft;
- modal **`Limpiar`** clears draft/applied advanced state but preserves metrics;
- global **`Limpiar filtros`** clears metrics and advanced state;
- chip removal affects one logical filter and reopening sees the updated applied state;
- true empty, normal filtered empty, and contradictory empty have distinct copy and precedence;
- concise live announcements occur once and rows are not individually announced.

Coverage: INT-01–09, MODAL-01–09, A-1, A-4–A-8, A11Y-01–05.

### 14.4 Controller/state tests

- initial loading/blocked/error show no zero counts or filtered-empty copy;
- same-context refresh preserves prior display and replaces snapshot atomically on success;
- refresh failure preserves prior display with stale/error notice;
- actor/company/mode/surface/subject change clears snapshot, options, selections, applied filters, chips, drafts, and rows before new data;
- late prior-context response cannot hydrate/render;
- no filter interaction makes a request or write;
- `Panel global` remains unchanged.

Coverage: STATE-01–06; S-1–S-3, S-6.

### 14.5 Accessibility and responsive QA

At desktop and `412x915`, verify:

- no clipped metric labels, chips, or horizontal page overflow;
- first populated result no later than the second viewport;
- all targets at least `44x44` CSS pixels;
- keyboard order and visible focus;
- dialog title/labels, focus trap, Escape, invalid-range association, and focus restoration;
- accessible metric group/button names and chip removal names;
- screen-reader announcements are concise and non-duplicated;
- dialog body scroll and actions remain reachable.

Coverage: RESP-01–03, A11Y-01–05; S-4, S-5.

### 14.6 Isolation and final-diff audit

Verify network and persistence evidence for metric toggles, modal edit/apply/clear, chip removal, and global clear:

- no POST/PUT/PATCH/DELETE;
- no per-case or N+1 request;
- no unrestricted contact/global fetch;
- no preference, Surgery, assignment, availability, request, notification, Auth, permission, or audit write;
- no `AvailabilityRequest` import or behavior;
- no schema, migration, seed, backfill, package, lockfile, global-panel, unrelated dashboard, Expediente, or broad Cirugías change.

Coverage: BOUND-01–06, SCALE-01–04; S-6, S-7; SPEC §12.8–9.

---

## 15. File ownership and execution serialization

Implementation, if separately authorized, must use one writer per package and visible locks with `reserved → editing → review → released`.

### Package A — read representation

Own together:

- `src/types/index.ts`;
- `src/lib/api/surgery-adapter.ts`;
- focused adapter/read-path tests.

Read-only verification may inspect `src/lib/services/surgery.service.ts`, `surgery-coordinator-read-model.ts`, and `coordination-view.service.ts`. They are not expected to require edits because the timestamp and IDs are already selected and serialized. If an edit becomes necessary, Package A must expand its lock explicitly before proceeding and remain bounded to read projection only.

Exit gate: authorized ownership survives independently from timestamp quality; identity-valid rows are not discarded for missing/malformed `createdAt`; valid/missing/invalid SLA basis, `assignmentId`, institution ID, and payer/client ID survive the mapping without ownership or persistence changes.

### Package B — pure derivation

Own together:

- `src/components/coordinadores/coordinator-queue.helpers.ts` only for minimal `CoordinatorCase`/shared eligibility integration;
- new `src/components/coordinadores/coordination-filtering.ts`;
- focused pure tests.

Exit gate: exact predicates, stable counts, date semantics, contradiction detection, options, and conjunction pass without React/store/API dependencies.

### Package C — personal presentation and state

Own together:

- `CoordinatorInboxView.tsx`;
- `CoordinationSecondaryFilters.tsx` replacement/removal from this graph;
- new metric/dialog components;
- `coordination-ui-state.ts`;
- `CoordinationStateSurface.tsx`;
- `useCoordinationView.ts` only if required for accepted-context metadata;
- focused component/controller tests.

Exit gate: transactional modal, quick/advanced AND interaction, state precedence, stale-context invalidation, accessibility, and responsive checks pass.

Packages A, B, and C are serialized in that order because the UI depends on the read shape and pure contract. No concurrent writer may touch `src/types/index.ts`, the surgery adapter/service chain, Coordination helpers/components/hook, `src/lib/store.ts`, Cirugías hooks, or either Coordination page. `src/lib/store.ts` is not expected to change; discovering a need to change its persistence or semantics requires escalation.

---

## 16. Stop conditions

Implementation must stop and return to Franco/SDD review if:

1. the existing assignment `createdAt` cannot cross the authorized read path as valid/missing/invalid without making ownership depend on timestamp quality;
2. persisted assignment rows unexpectedly lack `createdAt` and require data investigation under RPATH-05, or duplicate same-subject rows cannot remain an explicit invalid SLA basis without inventing a precedence/business rule;
3. an approved filter requires schema, migration, backfill, seed, new persistence, an invented value, or unrestricted lookup;
4. active-case membership cannot reuse the existing company-scoped personal resolution and bucket contract;
5. exact AND semantics, stable base-snapshot counts, one-row identity, or date-only/instant separation cannot be preserved;
6. implementation would change Auth, permissions, company membership, assignment writes, lifecycle transitions, notifications, material availability ownership, or persisted preferences;
7. implementation would touch `AvailabilityRequest`, **`Pedir disponibilidad`**, creator/PÍVOT rules, request recipients, request lifecycle, or request persistence;
8. implementation would alter `Panel global`, preview capability, unrelated dashboards, Expediente, broad Cirugías behavior, schema, migration, or dependencies;
9. context changes cannot invalidate stale personal rows and presentation state before new protected data renders;
10. a sensitive-file ownership overlap appears; or
11. any new product or business rule is needed.

Runtime `missing`/`invalid` SLA-basis classification itself does not remove or block an otherwise authorized case; only an attempt to repair, infer, rewrite, or add persistence crosses the stop boundary. All stop conditions fail closed. No schema or migration is authorized by this design.

---

## 17. Requirement traceability summary

| SPEC area | Design coverage |
| --- | --- |
| BOUND-01–06 | §§1–3, 13, 14.6, 16 |
| BASE-01–03 | §§2.3, 5, 9, 12 |
| RPATH-01–05 | §§2.1, 4, 14.2, 16 |
| METRIC-01–06 | §§4.4, 5.2, 6, 14.1 |
| INT-01–09 | §§6.3–6.4, 8, 11–12, 14.3 |
| ADV-01–09 | §§5.2, 7, 14.1 |
| MODAL-01–09 | §§8, 10–11, 14.3 |
| STATE-01–06 | §§9, 12, 14.4 |
| RESP-01–03 | §10, §14.5 |
| A11Y-01–05 | §11, §14.3, §14.5 |
| SCALE-01–04 | §§3, 5–7, 14.6 |
| M-1–M-8 | §§4–6, 14.1–14.2 |
| I-1–I-5 | §§6, 8, 12, 14.1–14.3 |
| A-1–A-9 | §§7–8, 10–11, 14.1, 14.3 |
| S-1–S-7 | §§4, 9–14 |

This DESIGN is consistent with the normative SPEC and authorizes progression to TASKS only. It does not authorize implementation.
