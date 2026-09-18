# Design — NUEVA-CIRUGIA-IA-UX-P1

Status: designed  
Change: `NUEVA-CIRUGIA-IA-UX-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)  
Phase: A (UI-pure, approved by Franco) — Phase B is deferred and out of this design.

---

## 1. Design summary

Phase A layers four additive, presentational improvements onto the existing "Nueva Cirugía" AI recognition wizard, without touching validators, services, schema, auth, API routes, providers, types, or confidence gating semantics:

1. **Critical Missing Bar** — an amber bar at the top of the Paso 1 ("Datos del caso") form body that renders each missing required field as a clickable chip; clicking a chip focuses the corresponding input. It only **reads** the existing `step0Errors` state.
2. **Confidence pill** — the existing confidence display in `AiResultsPanel.tsx` (percentage + `Progress` bar + standalone amber `Alert`) is compacted into a single pill in the IA recognition header. The standalone amber `Alert` is **absorbed** into the pill.
3. **Material autorizado as collapsible `<details>`** — the existing flat array is wrapped in a native `<details>`/`<summary>` region with the item count in the summary. No Implantes/Instrumental grouping.
4. **Footer "Faltan N obligatorios" count** — a read-only line in the wizard footer derived from `step0Errors.length`. "Siguiente" stays always enabled.

The implementation introduces three small presentational sub-components (`MissingFieldsBar`, `MaterialAutorizadoDetails`, `MissingCountText`) and an inline confidence-pill restructure of `AiResultsPanel`. No new dependencies. No new submits, persistence, auto-apply, or gating paths. Emerald/amber design tokens only — no mockup blue `#003f87` palette, no mockup hardcoded amber hex values.

---

## 2. Phase A constraints that govern the design

- UI-pure and presentational only; no business logic, no validation behavior change.
- No touch to `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers, or `src/types/index.ts`.
- No schema/migration/auth/multi-company changes (AGENTS.md §5/§11).
- No new dependencies (AGENTS.md §11).
- No Cirugías refactor beyond minimal additive presentation; prefer small sub-components over restructuring the 1710-line `NewSurgeryDialog.tsx`.
- Confidence gating stays **WARN-only** (threshold `0.3`, `src/lib/services/ai/config.ts` L10/L61 — read-only reference). No BLOCK path.
- Bulk "Aplicar al formulario" semantics (`AiResultsPanel.tsx` L228; `NewSurgeryDialog.tsx` L515-528, empty-fields-only) unchanged. No new auto-apply path (A-Q1).
- Emerald design system only; the mockup blue `#003f87` palette and the mockup hardcoded amber hex values (`#fff8e6`, `#ffeebb`, `#b07b00`) are NOT introduced.
- Ownership lock required on the three high-risk cirugías files before any edit (AGENTS.md §9.3/§10).

---

## 3. Repo-fit design

### 3.1 Verified path correction

The proposal cites `src/components/cirugias/NewSurgeryDialog.tsx`; the verified path is `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (1710 lines, under a `dialogs/` subfolder). All line anchors below are against this verified path. `AiResultsPanel.tsx` and `AiUploadZone.tsx` are directly under `src/components/cirugias/` as cited.

### 3.2 Minimal integration points

- `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`
  - mount `MissingFieldsBar` at the top of the Paso 0 body (inside the `step0Ref` container, before the IA section);
  - add a `data-step0-field="<key>"` wrapper attribute around each of the five validated fields (focus targets);
  - mount `MissingCountText` in the `DialogFooter`.
- `src/components/cirugias/AiResultsPanel.tsx`
  - restructure the confidence section (L74-89) into a single pill in the header (L64-69);
  - replace the Material autorizado `<section>` (L173-207) with `MaterialAutorizadoDetails`.
- `src/components/cirugias/AiUploadZone.tsx`
  - no Phase A change; protected by ownership lock only.
- new additive sub-components under `src/components/cirugias/`:
  - `MissingFieldsBar.tsx`
  - `MaterialAutorizadoDetails.tsx`
  - `MissingCountText.tsx`
- new additive tests under `src/__tests__/components/` (Vitest + jsdom, matching existing pattern).

### 3.3 What does NOT change

- `validateStep0` (L366-375), `handleNext` (L423-437), `scrollToFirstError` (L400-420): untouched.
- `ContactLookupField.tsx` and `ClasificacionSelectorModal.tsx`: untouched (no `id`/`data-*` prop added to them; focus is resolved via wrapper attributes in `NewSurgeryDialog.tsx`).
- `src/lib/services/ai/config.ts`, `src/lib/validators/autorizacion-ai.ts`, `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts`: read-only references, not edited.
- The duplicate low-confidence paragraph in `NewSurgeryDialog.tsx` L837-841 (rendered outside `AiResultsPanel`) is **not** removed by Phase A. It is a separate presentational surface not referenced by spec §5.3, and removing it would expand scope beyond the four approved items. Flagged for Phase B consideration.

---

## 4. Component boundaries

### 4.1 `MissingFieldsBar` (new, presentational)

Pure presentational, no internal state. Reads `step0Errors` and a label/focus-target map; renders one chip per present error key; on chip click, focuses the target input via a DOM query against a `data-step0-field` wrapper. The click must **not** mutate form state, must **not** clear errors, and must **not** advance the wizard (focus only).

```ts
import type { Step0Errors } from "./step0FieldMap" // see §5; or inline in NewSurgeryDialog

type Step0ErrorKey = "patient" | "surgeon" | "institution" | "client" | "classification"

interface MissingFieldTarget {
  /** Human-readable chip label (Spanish, matches the field label minus the asterisk). */
  label: string
  /** CSS selector for the field wrapper carrying data-step0-field="<key>". */
  focusSelector: string
}

interface MissingFieldsBarProps {
  /** Read-only view of the existing step0Errors state. */
  errors: Step0Errors
  /** Label + focus-target map for every possible error key. */
  fields: Record<Step0ErrorKey, MissingFieldTarget>
  /**
   * Optional override for the focus action. When omitted, the bar performs
   * the focus internally: document.querySelector(focusSelector)
   *   ?.querySelector('input, button, select, textarea')?.focus() + scrollIntoView.
   * Provided mainly for unit testing.
   */
  onFocusField?: (key: Step0ErrorKey, focusSelector: string) => void
}
```

Rendering rules:

- If `Object.keys(errors).length === 0`, render `null`.
- Otherwise render an amber bar (see §7.1) with a leading icon and the chips for each key present in `errors`, in the canonical order `patient → surgeon → institution → client → classification` (matches the on-screen field order in `NewSurgeryDialog.tsx` L1006-1109).
- Each chip is a `<button type="button">` with the field's `label`. On click: call `onFocusField` if provided; otherwise perform the internal focus + `scrollIntoView({ block: "center" })`.

### 4.2 `MaterialAutorizadoDetails` (new, presentational)

Pure presentational wrapper around the existing flat array. Receives the existing `material_autorizado` array and renders it inside a native `<details>`/`<summary>`. No grouping, no `categoria` field, no new dependency (no Radix/shadcn Accordion).

```ts
import type { AutorizacionAIResponse } from "@/lib/validators/autorizacion-ai"

interface MaterialAutorizadoDetailsProps {
  items: AutorizacionAIResponse["extracted"]["material_autorizado"]
}
```

Rendering rules:

- If `items.length === 0`: render the existing empty message `No se detectó material autorizado.` under a flat (non-collapsible) summary line `Material autorizado (0 ítems detectados)`. No `<details>` for the empty case (nothing to expand).
- If `items.length > 0`: render `<details>` **without** the `open` attribute (collapsed by default), with `<summary>` text `Material autorizado (N ítems detectados)` where `N = items.length`.
- The per-item rendering is moved verbatim from the current `AiResultsPanel.tsx` L180-202: `Badge variant="outline"` for `item.codigo || "Sin código"`, the `getCatalogByCode(item.codigo)` lookup, `Badge variant="success"` `En catálogo` / `Badge variant="secondary"` `No en catálogo`, `item.descripcion || "Sin descripción"`, `Cantidad: {item.cantidad || "—"}`, `Precio ref.: {item.precio_referencia || "—"}`. Item wrapper class `rounded-md bg-muted/40 p-3 text-sm` is preserved (L185).
- `<summary>` uses `cursor-pointer` and a `ChevronRight` lucide icon that rotates to `ChevronDown` when open, via the `[&[open]>summary>svg]:rotate-90` pattern (or `group-open:rotate-90`). Default triangle marker is suppressed with `[&>summary]:list-none` / `[&>summary::-webkit-details-marker]:hidden`.

### 4.3 `MissingCountText` (new, presentational)

Pure presentational footer line. Receives the error count and renders the informational text. No state.

```ts
interface MissingCountTextProps {
  count: number // Object.keys(step0Errors).length
}
```

Rendering rules:

- If `count <= 0`, render `null`.
- If `count === 1`, render `Faltan 1 obligatorio` (singular).
- If `count > 1`, render `Faltan {count} obligatorios` (plural).

> Note on string format: spec §5.5 / proposal L83 literally write "Faltan N obligatorios". This design refines the singular case to `Faltan 1 obligatorio` for grammatical correctness. This is a presentational string detail within the design-phase purview (spec §11 explicitly asks the design to define "the footer count string format"). The plural form matches the spec verbatim.

### 4.4 Confidence pill (inline restructure of `AiResultsPanel`)

Implemented as an inline restructure of `AiResultsPanel.tsx` (not a separate file), because the pill reuses the component's existing `result.confidence`, `aiConfig.confidenceThreshold`, and `renderConfidence` helper (L42-44).

Decision — **the standalone amber `Alert` (L82-89) is ABSORBED into the pill.** Rationale: the spec §6.2 explicitly allows absorbing it or retaining it; absorbing it satisfies the "compaction" objective of Item 2 and removes a redundant surface. The `result.warnings` list (L91-100) is a separate concern and stays untouched.

The pill replaces two things:

1. The `<section className="space-y-2">` block at L74-80 (the "Confianza" label + `Progress` bar) — **removed**.
2. The `{isLowConfidence && (<Alert ...>)}` block at L82-89 — **removed** (absorbed).

The pill is added to the header badge row at L64-69 (the `<div className="flex flex-wrap gap-2">` that already holds the Provider badge and the "Parece autorización"/"Documento dudoso" badge).

Visual contract — see §7.2.

Adjacent cleanups required to keep TypeScript/lint clean:

- `Progress` import (L9) becomes unused → remove.
- `Alert` and `AlertDescription` imports (L5) become unused (they were only used by the absorbed Alert) → remove.
- `AlertTriangle` import (L3) is **retained** and reused as the low-confidence pill icon.
- `renderConfidence` (L42-44) and `confidencePercent` (L49) and `isLowConfidence` (L50) are **retained** and reused by the pill. `confidencePercent` may become unused if the pill only shows the rounded percentage text (it is no longer fed to `Progress`); if so, remove `confidencePercent` (L49) as well. `isLowConfidence` stays (drives pill color).

---

## 5. step0Errors key → chip label → focus target mapping

Source of truth: `Step0Errors` interface (`NewSurgeryDialog.tsx` L281-287) and `validateStep0` (L366-375). The error message strings set at L368-372 confirm the human-readable field names used in the form.

| # | `Step0Errors` key | Error message set by `validateStep0` (L368-372) | Chip label (Spanish) | Field component & mount line | Focus target (selector) |
|---|---|---|---|---|---|
| 1 | `patient` | `Paciente es obligatorio` | `Paciente` | `ContactLookupField` @ L1024-1038 | `[data-step0-field="patient"]` → first `input` |
| 2 | `surgeon` | `Médico es obligatorio` | `Médico` | `ContactLookupField` @ L1041-1055 | `[data-step0-field="surgeon"]` → first `input` |
| 3 | `institution` | `Institución es obligatoria` | `Institución` | `ContactLookupField` @ L1058-1087 | `[data-step0-field="institution"]` → first `input` |
| 4 | `client` | `Cliente / Pagador es obligatorio` | `Cliente / Pagador` | `ContactLookupField` @ L1007-1021 | `[data-step0-field="client"]` → first `input` |
| 5 | `classification` | `Clasificación es obligatoria` | `Clasificación` | `ClasificacionSelectorModal` trigger `<Button>` @ L1100-1109 | `[data-step0-field="classification"]` → first `button` |

### 5.1 Focus mechanism

The four `ContactLookupField` instances and the `ClasificacionSelectorModal` trigger do not expose an `id` or `data-*` prop today (`ContactLookupField.tsx` L24-35 has no `id` prop; its inner `<Input>` only has an internal `ref={codeInputRef}` at L188). To avoid modifying `ContactLookupField.tsx` and `ClasificacionSelectorModal.tsx` (out of the locked set and out of scope), the focus target is resolved by wrapping each field's existing JSX in a `<div data-step0-field="<key>">` inside `NewSurgeryDialog.tsx`. The bar then does:

```ts
const wrapper = document.querySelector(focusSelector)
const focusable = wrapper?.querySelector<HTMLElement>("input, button, select, textarea")
focusable?.focus()
focusable?.scrollIntoView({ behavior: "smooth", block: "center" })
```

For `ContactLookupField` fields this focuses the inner code `<Input>` (the same input `handleClear` refocuses at `ContactLookupField.tsx` L160). For `classification` this focuses the selector trigger `<Button>` (L1100), which is the actionable element.

### 5.2 Label/focus map location

The `fields: Record<Step0ErrorKey, MissingFieldTarget>` map may live inline in `NewSurgeryDialog.tsx` (minimal-footprint, no new file) or as a tiny constant module `src/components/cirugias/step0FieldMap.ts`. Recommended: inline constant in `NewSurgeryDialog.tsx` to avoid a new file and keep the lock footprint tight. The `Step0ErrorKey` / `Step0Errors` types continue to be imported from `NewSurgeryDialog.tsx`'s local interface (L281-287); if `MissingFieldsBar.tsx` needs the type, re-declare a structurally identical local type in the sub-component to avoid importing a private type across module boundaries (or export `Step0Errors` from `NewSurgeryDialog.tsx`). Recommended: export `Step0Errors` and `Step0ErrorKey` from `NewSurgeryDialog.tsx` and import them in `MissingFieldsBar.tsx` (one-line additive export, no behavior change).

---

## 6. Insertion points

### 6.1 Critical Missing Bar (Item 1)

Mount inside the Paso 0 container, immediately after the `step0Ref` div opens and before the IA section.

- `NewSurgeryDialog.tsx` L784: `<div ref={step0Ref} className="space-y-1 overflow-y-auto flex-1 px-4 py-3">`
- Insert at **L785** (between L784 and L786):

```tsx
{wizardStep === 0 && !creationDone && Object.keys(step0Errors).length > 0 && (
  <MissingFieldsBar errors={step0Errors} fields={STEP0_FIELD_MAP} />
)}
```

The bar therefore renders above the "Reconocimiento con IA" emerald panel (L786) and above "Section 1: Datos principales" (L989-992). It is hidden when `step0Errors` is empty.

### 6.2 Confidence pill (Item 2)

In `AiResultsPanel.tsx`:

- Remove the confidence `<section>` at **L74-80** (the "Confianza" label + `<Progress value={confidencePercent} />`).
- Remove the `{isLowConfidence && (<Alert ...>)}` block at **L82-89**.
- Add the pill into the header badge row at **L64-69** (`<div className="flex flex-wrap gap-2">`), after the existing Provider/looks-like-authorization badges.

### 6.3 Material autorizado collapsible details (Item 3)

In `AiResultsPanel.tsx`:

- Replace the entire `<section className="space-y-2 rounded-lg border p-3">` block at **L173-207** (the "Material autorizado" flat list) with `<MaterialAutorizadoDetails items={extracted.material_autorizado} />`.

### 6.4 Footer missing count (Item 4)

In `NewSurgeryDialog.tsx`:

- `DialogFooter` opens at **L1642**. The first conditional button (`Anterior`) is at L1646-1650.
- Insert `MissingCountText` as the first child inside `DialogFooter`, before the `Anterior` button block, at **L1646**:

```tsx
{!creationDone && wizardStep === 0 && (
  <MissingCountText count={Object.keys(step0Errors).length} />
)}
```

`MissingCountText` uses `mr-auto` so the existing right-aligned buttons (`Anterior`, `Siguiente`, `Cancelar`) keep their positions. The "Siguiente" button at L1652 keeps `onClick={handleNext}` and **no `disabled` prop** — unchanged.

### 6.5 Field wrapper attributes (supporting change for §5)

In `NewSurgeryDialog.tsx`, wrap each of the five field blocks in a `<div data-step0-field="<key>">`:

- `client` (L1007-1021) → wrap with `<div data-step0-field="client">`
- `patient` (L1024-1038) → wrap with `<div data-step0-field="patient">`
- `surgeon` (L1041-1055) → wrap with `<div data-step0-field="surgeon">`
- `institution` (L1058-1087) → wrap with `<div data-step0-field="institution">`
- `classification` (L1089-1109) → wrap with `<div data-step0-field="classification">`

These wrappers are additive `data-*` attributes on existing JSX; they do not alter rendering, validation, or behavior.

---

## 7. Visual contract

All tokens below are already used in the cirugías domain. No new hex values. No mockup blue `#003f87`. No mockup amber hex (`#fff8e6`, `#ffeebb`, `#b07b00`).

### 7.1 Critical Missing Bar

Bar container — reuse the proven amber Alert token set from `AiResultsPanel.tsx` L83:

```
rounded-lg border border-amber-300 bg-amber-50 text-amber-900
dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200
px-3 py-2
```

Leading icon: `AlertTriangle` (lucide, already imported in the domain) at `size-4 text-amber-700 dark:text-amber-400`.

Chips — `<button type="button">` styled with the proven cirugías amber chip token set (matches `SmartSurgerySearch.tsx` L70 and `ActiveFilterChips.tsx` L14):

```
inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50
px-2 py-0.5 text-xs text-amber-700
hover:bg-amber-100 hover:text-amber-900
dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60
```

A short introductory span `Faltan datos obligatorios:` in `text-xs font-medium text-amber-800 dark:text-amber-300` precedes the chips.

### 7.2 Confidence pill

A single `<span>` (or `Badge`-shaped span) in the header badge row. Two states driven by the existing `isLowConfidence` (`result.confidence < aiConfig.confidenceThreshold`, `AiResultsPanel.tsx` L50):

- **ok** (`!isLowConfidence`): emerald pill, no icon.

  ```
  inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100
  px-2 py-0.5 text-xs font-medium text-emerald-800
  dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300
  ```

  Text: `Confianza {NN}%` where `NN = Math.round(result.confidence * 100)` (reuses `renderConfidence`, L42-44).

- **low** (`isLowConfidence`): amber pill + `AlertTriangle` icon (`size-3.5`), matching the existing amber pill pattern in `PostCreationPanel.tsx` L63.

  ```
  inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100
  px-2 py-0.5 text-xs font-medium text-amber-800
  dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300
  ```

  Text: `Confianza baja · {NN}%`. The `AlertTriangle` icon plus the ` baja ·` text absorb the warning semantics of the removed standalone `Alert` (L82-89). A `title` attribute `Confianza baja — revisá los datos antes de aplicar.` preserves the removed `AlertDescription` text (L86) as a native tooltip, so no information is lost.

Percentage format: integer percent, no decimals, matching the existing `renderConfidence` (`${Math.round(confidence * 100)}%`). Example: `Confianza 72%` / `Confianza baja · 18%`.

### 7.3 Material autorizado details

- Outer container: preserve the existing `rounded-lg border p-3` classes from L173 (mapped to default border token `border-border` via the existing class; no emerald needed here).
- `<summary>`: `cursor-pointer select-none text-sm font-medium flex items-center gap-1.5` with `ChevronRight` icon (`size-4 text-muted-foreground`) rotating to `ChevronDown` when `[open]`. Summary text color: default `text-foreground`; on hover `hover:text-emerald-700 dark:hover:text-emerald-400` (subtle emerald affordance, consistent with the emerald system).
- Summary string: `Material autorizado (N ítems detectados)` (see §4.2). Note the current code at L175-176 uses English `item`/`items`; Phase A changes this to Spanish `ítems detectados` per spec §5.4/§6.3.
- Item wrapper: preserve `rounded-md bg-muted/40 p-3 text-sm` (L185). Catalog badges keep `Badge variant="success"` / `Badge variant="secondary"` (L190/L192).

### 7.4 Footer missing count

`MissingCountText` styling — reuse the amber paragraph token set already used in `NewSurgeryDialog.tsx` L838:

```
mr-auto text-xs text-amber-700 dark:text-amber-400
```

Optional leading `AlertTriangle` icon (`size-3.5`) for visual consistency with the bar. Text: `Faltan {N} obligatorio(s)` per §4.3.

---

## 8. Test plan

Vitest 4.1.6 + jsdom (already configured: `vitest.config.ts`, `package.json` L12/L108/L114). New tests follow the existing pattern under `src/__tests__/components/*.test.tsx` (component render tests) and `src/__tests__/unit/*.test.ts` (pure-logic tests). No new test framework or config.

Scope (assertions only — no test code in this phase):

### 8.1 `MissingFieldsBar.test.tsx`

- Renders `null` when `errors` is `{}`.
- Renders one chip per key present in `errors`, in the canonical order `patient → surgeon → institution → client → classification`, each with the mapped `label`.
- Clicking a chip triggers focus on the matching `[data-step0-field="<key>"]` target: render the bar alongside sibling `<div data-step0-field="patient"><input /></div>` stubs, fire `click` on the `Paciente` chip, assert `document.activeElement` is the patient input. Assert no state mutation occurs (no `onFocusField` callback that would clear errors is wired; the bar only focuses).
- When `onFocusField` is provided, clicking a chip calls it with `(key, focusSelector)` and does not perform the internal DOM focus (so the callback is the single source of the focus side-effect).

### 8.2 `MaterialAutorizadoDetails.test.tsx`

- With `items.length === 0`: renders the flat summary `Material autorizado (0 ítems detectados)` and the empty message `No se detectó material autorizado.`; no `<details>` element is rendered.
- With `items.length > 0` (e.g. 3): renders a `<details>` element **without** an `open` attribute (collapsed by default); `<summary>` text is `Material autorizado (3 ítems detectados)`.
- Expanding (setting `open`) reveals one item block per item with the code `Badge`, the catalog `Badge` (`En catálogo` when `getCatalogByCode` matches, `No en catálogo` otherwise), description, `Cantidad`, and `Precio ref.` — asserting the per-item rendering contract from §4.2 is preserved.
- Snapshot (optional, cheap): one snapshot for the 3-item collapsed state and one for the 0-item state.

### 8.3 `MissingCountText.test.tsx`

- Renders `null` when `count === 0`.
- Renders `Faltan 1 obligatorio` when `count === 1` (singular).
- Renders `Faltan 2 obligatorios` when `count === 2` (plural); and `Faltan 5 obligatorios` for 5.
- The text uses the amber token classes (assert `className` contains `text-amber-700`).

### 8.4 `AiResultsPanel.test.tsx` (integration — confidence pill + material details)

- Renders the confidence pill in the header with `Confianza {NN}%` and the ok (emerald) classes when `result.confidence >= aiConfig.confidenceThreshold`.
- Renders the pill with `Confianza baja · {NN}%`, the `AlertTriangle` icon, and the amber classes when `result.confidence < aiConfig.confidenceThreshold`.
- Asserts the standalone amber `Alert` block ("Confianza baja — revisá los datos antes de aplicar.") is **no longer rendered** (absorbed into the pill).
- Asserts the `Progress` bar is no longer rendered.
- Asserts Material autorizado renders inside a `<details>` with the correct summary count string.
- Asserts the "Aplicar al formulario" button (`L228`) is still rendered with `disabled` driven only by `canApply` (`result.looks_like_authorization !== false`) — i.e. confidence does NOT gate apply (AC-09).
- Snapshot (optional): one ok-confidence snapshot and one low-confidence snapshot.

### 8.5 `NewSurgeryDialog` focused render test (light, not full snapshot)

`NewSurgeryDialog.tsx` is 1710 lines with many store/auth/hook dependencies; a full snapshot is brittle and out of scope. A **focused** render test:

- Mock `useOrtoTrackStore`, `useAuth`, `useAiExtraction`, and the `ContactLookupField`/`ClasificacionSelectorModal` children to thin stubs (matching the existing `cirugia-creation.test.ts` approach).
- On Paso 0 with a `step0Errors` value of `{ patient: "...", classification: "..." }`: assert `MissingFieldsBar` renders chips `Paciente` and `Clasificación`; assert `MissingCountText` renders `Faltan 2 obligatorios` in the footer.
- Assert the "Siguiente" button (`data-testid="wizard-next-btn"`, L1652) is **enabled** (no `disabled` attribute) regardless of the error count (AC-04).
- Assert clicking the `Paciente` chip focuses the `[data-step0-field="patient"]` input.

### 8.6 `AiUploadZone` snapshot test

- One baseline snapshot of `AiUploadZone` in the idle state and one in the `isProcessing` state, to establish a regression baseline (spec/proposal R2: zero of the 31 existing test files cover the AI stack). No behavior change is expected; this is a guard against incidental regression.

### 8.7 TypeScript

- `tsc --noEmit` (or the repo's typecheck script) must be clean after the four edits + three new sub-components + adjacent import cleanups (§4.4).

---

## 9. Ownership lock plan

Per AGENTS.md §9.3/§10, an ownership lock is declared and recorded before any edit for the three high-risk cirugías files. Lock states follow `reserved → editing → review → released`. No two agents may write the same file concurrently.

### 9.1 Lock declarations

| Lock | Task | Agent role | Selected LLM | Owned files | Status |
|---|---|---|---|---|---|
| L1 | `NUEVA-CIRUGIA-IA-UX-P1` | Frontend / UI Agent | per Orchestrator assignment | `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`; `src/components/cirugias/MissingFieldsBar.tsx` (new); `src/components/cirugias/MissingCountText.tsx` (new) | `reserved` |
| L2 | `NUEVA-CIRUGIA-IA-UX-P1` | Frontend / UI Agent | per Orchestrator assignment | `src/components/cirugias/AiResultsPanel.tsx`; `src/components/cirugias/MaterialAutorizadoDetails.tsx` (new) | `reserved` |
| L3 | `NUEVA-CIRUGIA-IA-UX-P1` | Frontend / UI Agent | per Orchestrator assignment | `src/components/cirugias/AiUploadZone.tsx` (expected unchanged in Phase A; lock held defensively) | `reserved` |

### 9.2 Lock rules

- L1, L2, L3 are held by a single owner (one task = one owner = 1 scope = 1 set of files = 1 handoff, AGENTS.md §9.2). They may be held concurrently by the same agent because their file sets are disjoint.
- No agent edits `ContactLookupField.tsx`, `ClasificacionSelectorModal.tsx`, `ContactSearchModal.tsx`, or any `src/lib/**` / `src/app/api/**` / `prisma/**` file. If implementation reveals a need to touch any of these, the agent must stop and escalate (AGENTS.md §9.5/§9.6).
- New test files under `src/__tests__/components/` are additive and not in a locked set; they may be authored by the same owner alongside the corresponding sub-component.
- Locks move to `editing` when the first edit is applied, `review` when the change is handed to QA/Reviewer, and `released` after validation and handoff.

---

## 10. Out of scope reminders

- No touch to `src/lib/**` (including `src/lib/services/ai/config.ts`, `src/lib/validators/autorizacion-ai.ts`, `src/lib/cirugias.*`, `src/lib/store.ts`).
- No touch to `src/app/api/**` (including `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts`).
- No touch to `prisma/**` (including `prisma/schema.prisma`).
- No touch to `src/types/index.ts`, `src/app/cirugias/page.tsx`.
- No new dependencies in `package.json` / lockfile.
- No confidence BLOCK gating — confidence stays WARN-only (threshold `0.3`); the "Aplicar al formulario" button is not gated by confidence (AC-09).
- No "safe data" classification, no "Aplicar datos seguros (N)" button, no new auto-apply path (AC-10). Bulk apply stays empty-fields-only (`NewSurgeryDialog.tsx` L515-528; `AiResultsPanel.tsx` L228).
- No `categoria` field added to `MaterialAutorizadoItemSchema`; no Implantes/Instrumental grouping (Phase B).
- No proactive "Siguiente" disable (AC-04). The button at L1652 keeps no `disabled` prop.
- No mockup blue `#003f87` palette; no mockup hardcoded amber hex values (`#fff8e6`, `#ffeebb`, `#b07b00`) (AC-07).
- No removal of the duplicate low-confidence paragraph at `NewSurgeryDialog.tsx` L837-841 (separate surface, not referenced by spec §5.3; flagged for Phase B).
- No prompt/provider/threshold/model changes.
- No Prisma format/generate, no build pipeline changes, no Tailwind CDN, no migration commands.

---

## 11. Stop / escalate boundaries

Stop and escalate before/during implementation if any of these become necessary (AGENTS.md §9.5/§9.6):

1. The focus mechanism requires modifying `ContactLookupField.tsx` or `ClasificacionSelectorModal.tsx` (out of the locked set — would expand scope).
2. Compacting the confidence display requires changing `aiConfig.confidenceThreshold` or the `isLowConfidence` comparison semantics (behavior change — Phase B / Franco).
3. Material autorizado grouping by Implantes/Instrumental is required (needs `categoria` on `MaterialAutorizadoItemSchema` — Phase B).
4. The footer count is required to disable "Siguiente" proactively (behavior change — Phase B / Franco).
5. Any file under `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers, or `src/types/index.ts` needs editing (blocked — AGENTS.md §5/§11).
6. A new dependency is needed (blocked — AGENTS.md §11).
7. The mockup blue palette or mockup hardcoded amber hex values are requested by QA/review (product decision — Franco).
8. A critical-file overlap appears with another concurrent task (stop and escalate to Orchestrator — AGENTS.md §9.3/§9.4).
9. The `NewSurgeryDialog` focused render test cannot be made stable without restructuring the 1710-line component (stop; a broader refactor is out of scope and requires Franco approval).

---

## 12. Implementation-ready conclusion

The safest Phase A path is:

- Three additive presentational sub-components (`MissingFieldsBar`, `MaterialAutorizadoDetails`, `MissingCountText`) under `src/components/cirugias/`, each pure, stateless, and consuming existing state via props.
- One inline restructure of `AiResultsPanel.tsx` that compacts the confidence display into a single pill (absorbing the standalone amber `Alert`) and wraps Material autorizado in `<details>`/`<summary>`.
- Five additive `data-step0-field` wrappers in `NewSurgeryDialog.tsx` to anchor the MissingFieldsBar focus targets without touching `ContactLookupField.tsx` or `ClasificacionSelectorModal.tsx`.
- Two minimal insertion points in `NewSurgeryDialog.tsx` (top of the Paso 0 body, footer) and three in `AiResultsPanel.tsx` (header badge row, confidence section removal, material section replacement).
- Emerald/amber design tokens already proven in the cirugías domain; no mockup palette, no new hex values, no new dependencies.
- Vitest + jsdom render/snapshot tests for the three new sub-components, the `AiResultsPanel` integration, a focused `NewSurgeryDialog` render test, and a baseline `AiUploadZone` snapshot.
- Ownership locks L1/L2/L3 over the three high-risk files, held by a single owner with disjoint file sets.
- No validator/service/schema/auth/API/provider/type touches; confidence stays WARN-only; bulk-apply semantics unchanged; "Siguiente" stays always enabled.

This design is intentionally additive and presentational, and is replacement-friendly for a later Phase B that may add `categoria` grouping, safe-data classification, confidence BLOCK gating, and IA audit — all behind their own proposal after GPT-027F.0A/0B close.
