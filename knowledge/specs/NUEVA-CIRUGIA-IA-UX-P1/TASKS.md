# TASKS.md — NUEVA-CIRUGIA-IA-UX-P1

Status: ready  
Change: `NUEVA-CIRUGIA-IA-UX-P1`  
Stage: `Phase A only` (UI-pure, approved by Franco) — Phase B is deferred and out of scope.  
Artifact store: hybrid (filesystem + Engram)

---

## Reference

- Proposal: `knowledge/specs/NUEVA-CIRUGIA-IA-UX-P1/PROPOSAL.md`
- Spec: `knowledge/specs/NUEVA-CIRUGIA-IA-UX-P1/SPEC.md` (acceptance criteria AC-01 … AC-10)
- Design: `knowledge/specs/NUEVA-CIRUGIA-IA-UX-P1/DESIGN.md` (component contracts, insertion points, visual tokens, test plan)
- Root rules: `AGENTS.md` §9.3/§9.5/§9.6 (locks, approval boundaries, stop/escalate), §10 (sensitive files), §11 (prohibitions), §12 (quality gates), §13 (handoff)

All line numbers below are verified against the on-disk files (see DESIGN §3.1 / §11 "Verified anchors").

---

## Guardrails for all tasks

- No edit to `src/lib/**` (incl. `src/lib/services/ai/config.ts`, `src/lib/validators/autorizacion-ai.ts`, `src/lib/cirugias.*`, `src/lib/store.ts`).
- No edit to `src/app/api/**` (incl. `ai-extract/route.ts`).
- No edit to `prisma/**` (incl. `prisma/schema.prisma`), `src/types/index.ts`, `src/app/cirugias/page.tsx`.
- No edit to `ContactLookupField.tsx`, `ClasificacionSelectorModal.tsx`, `ContactSearchModal.tsx` (out of the locked set — focus is resolved via wrapper attributes in `NewSurgeryDialog.tsx`).
- No new dependency in `package.json` / lockfile (AGENTS.md §11).
- No schema, migration, auth, or multi-company change (AGENTS.md §5/§11).
- No Prisma format/generate, no build pipeline change, no Tailwind CDN, no migration command.
- No confidence BLOCK gating — confidence stays WARN-only (threshold `0.3`); "Aplicar al formulario" is not gated by confidence (AC-09).
- No new auto-apply path, no "safe data" classification, no "Aplicar datos seguros (N)" button (AC-10). Bulk apply stays empty-fields-only.
- No proactive "Siguiente" disable (AC-04). The button at `NewSurgeryDialog.tsx` L1652 keeps no `disabled` prop.
- No `categoria` field on `MaterialAutorizadoItemSchema`; no Implantes/Instrumental grouping (Phase B).
- No mockup blue `#003f87` palette; no mockup hardcoded amber hex (`#fff8e6`, `#ffeebb`, `#b07b00`) (AC-07). Use existing shadcn/ui + emerald/amber/secondary/muted tokens only.
- No removal of the duplicate low-confidence paragraph at `NewSurgeryDialog.tsx` L837-841 (separate surface; flagged for Phase B).
- One task = one owner = one scope = one set of files = one handoff (AGENTS.md §9.2).

---

## Task T1 — Declare ownership locks L1/L2/L3

### Goal

Declare and record the ownership locks over the three high-risk cirugías files before any edit, per AGENTS.md §9.3/§10 and DESIGN §9. This is a prerequisite for every implementation task.

### Files

- None edited. Lock record declared in the task handoff / worklog (and Engram if used).

### Dependencies

- None.

### Acceptance criteria

- AC-08 — Ownership lock declared for high-risk cirugías files.

### Tasks

- [ ] Declare L1 over `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` + new `MissingFieldsBar.tsx` + new `MissingCountText.tsx` (status `reserved`).
- [ ] Declare L2 over `src/components/cirugias/AiResultsPanel.tsx` + new `MaterialAutorizadoDetails.tsx` (status `reserved`).
- [ ] Declare L3 over `src/components/cirugias/AiUploadZone.tsx` (expected unchanged in Phase A; lock held defensively, status `reserved`).
- [ ] Record agent role, selected LLM, owned files, and status for each lock (DESIGN §9.1 table).
- [ ] Confirm no other task holds an overlapping file before moving any lock to `editing`.

### Validation

- Lock declarations visible in the handoff/worklog before the first code edit.
- L1, L2, L3 file sets are pairwise disjoint (DESIGN §9.2).

### Stop / escalate

- Another task already holds any of the three files → stop and escalate to Orchestrator (AGENTS.md §9.3/§9.4).
- Assignment requires a different model/agent than the lock declares → re-declare before editing.

---

## Task T2 — Create presentational sub-components (additive, new files)

### Goal

Create the three pure, stateless presentational sub-components that consume existing state via props. These are new files under `src/components/cirugias/` — additive, no lock conflict, no behavior change.

### Files (new)

- `src/components/cirugias/MissingFieldsBar.tsx` (owned by L1)
- `src/components/cirugias/MaterialAutorizadoDetails.tsx` (owned by L2)
- `src/components/cirugias/MissingCountText.tsx` (owned by L1)

### Dependencies

- T1 (locks declared).

### Acceptance criteria

- AC-01 (sub-component for the bar), AC-03 (sub-component for material details), AC-04 (sub-component for footer count), AC-07 (emerald/amber tokens only).

### Tasks

- [ ] **MissingFieldsBar.tsx** — implement per DESIGN §4.1:
  - Props: `errors: Step0Errors`, `fields: Record<Step0ErrorKey, MissingFieldTarget>`, optional `onFocusField?: (key, focusSelector) => void`.
  - `Step0ErrorKey = "patient" | "surgeon" | "institution" | "client" | "classification"`.
  - Render `null` when `Object.keys(errors).length === 0`.
  - Otherwise render the amber bar (DESIGN §7.1 token set) with `AlertTriangle` leading icon, the span `Faltan datos obligatorios:`, and one `<button type="button">` chip per present key in canonical order `patient → surgeon → institution → client → classification`.
  - On chip click: if `onFocusField` provided, call it with `(key, focusSelector)` and do not perform internal DOM focus; otherwise `document.querySelector(focusSelector)?.querySelector<HTMLElement>("input, button, select, textarea")?.focus()` + `scrollIntoView({ behavior: "smooth", block: "center" })`.
  - Chip must NOT mutate form state, clear errors, or advance the wizard (focus only).
  - Export `Step0Errors` and `Step0ErrorKey` types from `NewSurgeryDialog.tsx` (one-line additive export, no behavior change) and import them here; OR re-declare a structurally identical local type (DESIGN §5.2). Pick one and stay consistent.
- [ ] **MaterialAutorizadoDetails.tsx** — implement per DESIGN §4.2/§7.3:
  - Props: `items: AutorizacionAIResponse["extracted"]["material_autorizado"]` (import the type read-only from `@/lib/validators/autorizacion-ai` — no edit to that file).
  - `items.length === 0`: render flat summary `Material autorizado (0 ítems detectados)` + the existing empty message `No se detectó material autorizado.`; NO `<details>` element.
  - `items.length > 0`: render `<details>` WITHOUT the `open` attribute (collapsed by default); `<summary>` text `Material autorizado (N ítems detectados)` where `N = items.length`.
  - Move the per-item rendering verbatim from `AiResultsPanel.tsx` L180-202: `Badge variant="outline"` for `item.codigo || "Sin código"`, `getCatalogByCode(item.codigo)` lookup, `Badge variant="success"` `En catálogo` / `Badge variant="secondary"` `No en catálogo`, `item.descripcion || "Sin descripción"`, `Cantidad: {item.cantidad || "—"}`, `Precio ref.: {item.precio_referencia || "—"}`. Preserve item wrapper class `rounded-md bg-muted/40 p-3 text-sm` (L185).
  - `<summary>`: `cursor-pointer select-none text-sm font-medium flex items-center gap-1.5` with `ChevronRight` icon rotating when open; suppress default marker via `[&>summary]:list-none` / `[&>summary::-webkit-details-marker]:hidden`. Summary text color default `text-foreground`, hover `hover:text-emerald-700 dark:hover:text-emerald-400`.
  - Native `<details>` only — no Radix/shadcn Accordion, no new dependency.
- [ ] **MissingCountText.tsx** — implement per DESIGN §4.3/§7.4:
  - Props: `count: number` (= `Object.keys(step0Errors).length`).
  - `count <= 0`: render `null`.
  - `count === 1`: render `Faltan 1 obligatorio` (singular).
  - `count > 1`: render `Faltan {count} obligatorios` (plural).
  - Styling: `mr-auto text-xs text-amber-700 dark:text-amber-400` (reuse the amber paragraph token set from `NewSurgeryDialog.tsx` L838). Optional leading `AlertTriangle` (`size-3.5`) for visual consistency with the bar.

### Validation

- Each component is pure, stateless, consumes state via props only — no internal state, no store import, no API import, no validator import beyond the read-only `AutorizacionAIResponse` type.
- No mockup hex values; only existing emerald/amber/secondary/muted tokens (AC-07).
- `npx tsc --noEmit` clean for the three new files (run together in T8).

### Stop / escalate

- Implementation reveals a need to import/edit `ContactLookupField.tsx`, `ClasificacionSelectorModal.tsx`, or any `src/lib/**` / `src/app/api/**` file → stop and escalate (DESIGN §11.1/§11.5).
- A new dependency would be required (e.g. an Accordion) → stop and escalate (AGENTS.md §11).

---

## Task T3 — Add `data-step0-field` wrappers in NewSurgeryDialog.tsx

### Goal

Add additive `data-step0-field="<key>"` wrapper attributes around the five Paso 1 validated field blocks so `MissingFieldsBar` can focus them without modifying `ContactLookupField.tsx` or `ClasificacionSelectorModal.tsx`. Minimal additive attributes, no behavior change.

### Files

- `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (L1 lock → move to `editing`)

### Dependencies

- T1 (L1 lock declared).

### Acceptance criteria

- AC-01 (enables the focus-target mapping from DESIGN §5/§6.5).

### Tasks

- [ ] Wrap the `client` block (L1007-1021) with `<div data-step0-field="client">`.
- [ ] Wrap the `patient` block (L1024-1038) with `<div data-step0-field="patient">`.
- [ ] Wrap the `surgeon` block (L1041-1055) with `<div data-step0-field="surgeon">`.
- [ ] Wrap the `institution` block (L1058-1087) with `<div data-step0-field="institution">`.
- [ ] Add `data-step0-field="classification"` to the classification block (L1089-1112). Note: the block already has a wrapper `<div className="space-y-1">` at L1090 — prefer adding the `data-step0-field` attribute to that existing wrapper (minimal change) rather than nesting a new div. The focus target `[data-step0-field="classification"]` → first `button` resolves to the trigger `<Button>` at L1100-1110.
- [ ] Confirm the wrappers are additive `data-*` attributes on existing JSX and do not alter rendering, validation, or behavior (DESIGN §6.5).

### Validation

- The five wrappers exist and each wraps only its field block.
- `validateStep0` (L366-375), `handleNext`, and `scrollToFirstError` are untouched.
- `npx tsc --noEmit` clean (run in T8).

### Stop / escalate

- The focus mechanism would require modifying `ContactLookupField.tsx` or `ClasificacionSelectorModal.tsx` → stop and escalate (DESIGN §11.1).
- A critical-file overlap appears on `NewSurgeryDialog.tsx` → stop and escalate (AGENTS.md §9.3/§9.4).

---

## Task T4 — Mount MissingFieldsBar in NewSurgeryDialog.tsx

### Goal

Mount `MissingFieldsBar` at the top of the Paso 1 form body, feeding it the existing `step0Errors` state + the label/focus-target map. Bar hidden when `step0Errors` is empty.

### Files

- `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (L1 lock, `editing`)

### Dependencies

- T1 (L1 lock), T2 (`MissingFieldsBar.tsx` exists), T3 (wrappers exist so focus targets resolve).

### Acceptance criteria

- AC-01 — Critical Missing Bar renders missing required fields as focus chips, reading the existing `step0Errors` state without invoking a new validation pass.

### Tasks

- [ ] Define the `STEP0_FIELD_MAP: Record<Step0ErrorKey, MissingFieldTarget>` inline constant in `NewSurgeryDialog.tsx` (DESIGN §5.2 — recommended inline to keep the lock footprint tight), using the chip labels and focus selectors from DESIGN §5 table:
  - `patient` → label `Paciente`, selector `[data-step0-field="patient"]`
  - `surgeon` → label `Médico`, selector `[data-step0-field="surgeon"]`
  - `institution` → label `Institución`, selector `[data-step0-field="institution"]`
  - `client` → label `Cliente / Pagador`, selector `[data-step0-field="client"]`
  - `classification` → label `Clasificación`, selector `[data-step0-field="classification"]`
- [ ] Import `MissingFieldsBar` (and the `Step0Errors`/`Step0ErrorKey` types if not already exported in T2).
- [ ] Insert at **L785** (between the `step0Ref` div open at L784 and the IA emerald panel at L786), per DESIGN §6.1:
  ```tsx
  {wizardStep === 0 && !creationDone && Object.keys(step0Errors).length > 0 && (
    <MissingFieldsBar errors={step0Errors} fields={STEP0_FIELD_MAP} />
  )}
  ```
- [ ] Confirm the bar renders above the "Reconocimiento con IA" panel and above "Section 1: Datos principales", and is hidden when `step0Errors` is empty.
- [ ] Confirm the bar only READS `step0Errors`; it does NOT call `validateStep0`, does NOT recompute errors, does NOT mutate state, does NOT clear errors, does NOT advance the wizard.

### Validation

- Bar visible only on Paso 0 with non-empty `step0Errors`; hidden otherwise.
- `validateStep0` behavior unchanged (still on-click via `handleNext`).
- `npx tsc --noEmit` clean (run in T8).
- Focused render test in T7 verifies chip render order + focus behavior.

### Stop / escalate

- The bar would need to call `validateStep0` or recompute errors to work → stop and escalate (DESIGN §11; behavior change → Phase B / Franco).
- Focus cannot be resolved without touching `ContactLookupField.tsx` / `ClasificacionSelectorModal.tsx` → stop and escalate (DESIGN §11.1).

---

## Task T5 — Mount MissingCountText in NewSurgeryDialog.tsx footer

### Goal

Insert the read-only "Faltan N obligatorios" count text in the `DialogFooter`. The "Siguiente" button stays always enabled (no `disabled` prop).

### Files

- `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (L1 lock, `editing`)

### Dependencies

- T1 (L1 lock), T2 (`MissingCountText.tsx` exists).

### Acceptance criteria

- AC-04 — Footer shows missing count while Siguiente stays enabled.

### Tasks

- [ ] Import `MissingCountText`.
- [ ] Insert as the first child inside `DialogFooter` (opens at L1642), before the `Anterior` button block at L1646, per DESIGN §6.4:
  ```tsx
  {!creationDone && wizardStep === 0 && (
    <MissingCountText count={Object.keys(step0Errors).length} />
  )}
  ```
- [ ] Confirm `MissingCountText` uses `mr-auto` so the existing right-aligned buttons (`Anterior`, `Siguiente`, `Cancelar`) keep their positions.
- [ ] Confirm the "Siguiente" button at L1651-1655 keeps `onClick={handleNext}` and `data-testid="wizard-next-btn"` and **no `disabled` prop** — unchanged. Do NOT add a `disabled` prop driven by the count.
- [ ] Confirm on-click validation behavior (`handleNext`) is unchanged.

### Validation

- Footer shows `Faltan N obligatorio(s)` only on Paso 0 with `count > 0`; hidden otherwise.
- "Siguiente" remains enabled regardless of the count (AC-04).
- Count updates reactively as the operator fills/empties required fields (driven by the existing `step0Errors` recomputation — Phase A only reads it).
- `npx tsc --noEmit` clean (run in T8).
- Focused render test in T7 verifies the footer count + enabled Siguiente.

### Stop / escalate

- A requirement appears to proactively disable "Siguiente" based on the count → stop and escalate (behavior change → Phase B / Franco; DESIGN §11.4).

---

## Task T6 — Confidence pill + Material autorizado details in AiResultsPanel.tsx

### Goal

One task on one file (L2): compact the existing confidence display into a single pill (absorbing the standalone amber `Alert`), wrap the Material autorizado flat list in `MaterialAutorizadoDetails`, and remove now-unused imports. WARN-only gating preserved; "Aplicar al formulario" untouched in semantics.

### Files

- `src/components/cirugias/AiResultsPanel.tsx` (L2 lock → move to `editing`)

### Dependencies

- T1 (L2 lock), T2 (`MaterialAutorizadoDetails.tsx` exists).

### Acceptance criteria

- AC-02 — Confidence pill compacts existing confidence display without changing gating.
- AC-03 — Material autorizado renders as collapsible details with item count and no grouping.
- AC-09 — Confidence gating preserved as WARN-only (no BLOCK introduced).
- AC-10 — No new auto-apply path; bulk-apply semantics unchanged.

### Tasks

- [ ] **Confidence pill (DESIGN §4.4/§6.2/§7.2):**
  - Remove the confidence `<section className="space-y-2">` block at L74-80 (the "Confianza" label + `<Progress value={confidencePercent} />`).
  - Remove the `{isLowConfidence && (<Alert ...>)}` block at L82-89 (absorbed into the pill).
  - Add the pill into the header badge row at L64-69 (`<div className="flex flex-wrap gap-2">`), after the existing Provider/looks-like-authorization badges.
  - ok state (`!isLowConfidence`): emerald pill, no icon, text `Confianza {NN}%` where `NN = Math.round(result.confidence * 100)` (reuse `renderConfidence`, L42-44).
  - low state (`isLowConfidence`): amber pill + `AlertTriangle` icon (`size-3.5`), text `Confianza baja · {NN}%`, plus a `title` attribute `Confianza baja — revisá los datos antes de aplicar.` preserving the removed `AlertDescription` text (L86).
  - Reuse existing `isLowConfidence` (L50) and `aiConfig.confidenceThreshold` (default `0.3`) — NO new threshold, NO new constant, NO new config. Gating stays WARN-only.
- [ ] **Material autorizado details (DESIGN §4.2/§6.3/§7.3):**
  - Replace the entire `<section className="space-y-2 rounded-lg border p-3">` block at L173-207 (the "Material autorizado" flat list) with `<MaterialAutorizadoDetails items={extracted.material_autorizado} />`.
  - Import `MaterialAutorizadoDetails`.
- [ ] **Adjacent import cleanups (keep TypeScript/lint clean, DESIGN §4.4):**
  - Remove the `Progress` import (L9) — now unused.
  - Remove the `Alert` and `AlertDescription` imports (L5) — now unused (the absorbed `Alert` was their only use).
  - Retain `AlertTriangle` (L3) — reused as the low-confidence pill icon.
  - Retain `renderConfidence` (L42-44) and `isLowConfidence` (L50). If `confidencePercent` (L49) becomes unused (no longer fed to `Progress`), remove it as well.
- [ ] **Do NOT touch:**
  - `result.warnings` list (L91-100) — separate concern, stays as-is.
  - "Aplicar al formulario" button (L221-229): keep `onClick={onApply}` and `disabled={!canApply}` where `canApply = result.looks_like_authorization !== false` (L51). Confidence must NOT gate apply (AC-09). No semantic change (AC-10).
  - "Limpiar" button (L218-220).
  - `result.confidence` value, `aiConfig`, `AiResultsPanelProps` — consumed read-only.

### Validation

- Header renders a single confidence pill; the standalone amber `Alert` block and the `Progress` bar are gone.
- ok-confidence → emerald pill `Confianza {NN}%`; low-confidence → amber pill `Confianza baja · {NN}%` with `AlertTriangle`.
- WARN-only semantics preserved — low confidence does NOT disable "Aplicar al formulario" (still only `!canApply`).
- Material autorizado renders inside a collapsed-by-default `<details>` with summary `Material autorizado (N ítems detectados)`; per-item rendering (code badge, catalog badge, description, cantidad, precio ref.) preserved.
- No new dependency; no new hex value (AC-07).
- `npx tsc --noEmit` clean — no unused imports remain (run in T8).
- Integration render test in T7 verifies pill + material details + apply-button semantics.

### Stop / escalate

- Compacting the confidence display would require changing `aiConfig.confidenceThreshold` or the `isLowConfidence` comparison → stop and escalate (behavior change → Phase B / Franco; DESIGN §11.2).
- Material autorizado grouping by Implantes/Instrumental is requested → stop and escalate (needs `categoria` on `MaterialAutorizadoItemSchema` → Phase B; DESIGN §11.3).
- A BLOCK path on low confidence is requested → stop and escalate (AC-09 violation; Phase B / Franco).

---

## Task T7 — Snapshot / render tests (additive, new test files)

### Goal

Add minimal Vitest + jsdom render/snapshot tests for the new sub-components, the `AiResultsPanel` integration, a focused `NewSurgeryDialog` Paso 0 render, and a baseline `AiUploadZone` snapshot. Establishes the first regression net for the AI stack (spec/proposal R2: zero of the 31 existing test files cover it).

### Files (new)

- `src/__tests__/components/MissingFieldsBar.test.tsx`
- `src/__tests__/components/MaterialAutorizadoDetails.test.tsx`
- `src/__tests__/components/MissingCountText.test.tsx`
- `src/__tests__/components/AiResultsPanel.test.tsx`
- `src/__tests__/components/NewSurgeryDialog.test.tsx` (focused render, not full snapshot)
- `src/__tests__/components/AiUploadZone.test.tsx` (baseline snapshot)

Follow the existing pattern under `src/__tests__/components/*.test.tsx`. No new test framework or config (Vitest 4.1.6 + jsdom already configured: `vitest.config.ts`, `package.json`).

### Dependencies

- T2 (sub-components exist), T3 (wrappers exist), T4 (bar mounted), T5 (footer count mounted), T6 (pill + material details mounted).

### Acceptance criteria

- Validates AC-01, AC-02, AC-03, AC-04, AC-09 (and the AC-07 token usage where asserted).

### Tasks

- [ ] **MissingFieldsBar.test.tsx (DESIGN §8.1):**
  - Renders `null` when `errors` is `{}`.
  - Renders one chip per key present in `errors`, in canonical order `patient → surgeon → institution → client → classification`, each with the mapped `label`.
  - Clicking a chip focuses the matching `[data-step0-field="<key>"]` target: render the bar alongside sibling `<div data-step0-field="patient"><input /></div>` stubs, fire `click` on the `Paciente` chip, assert `document.activeElement` is the patient input. Assert no state mutation.
  - When `onFocusField` is provided, clicking a chip calls it with `(key, focusSelector)` and does not perform the internal DOM focus.
- [ ] **MaterialAutorizadoDetails.test.tsx (DESIGN §8.2):**
  - `items.length === 0`: renders flat summary `Material autorizado (0 ítems detectados)` + `No se detectó material autorizado.`; no `<details>` element.
  - `items.length > 0` (e.g. 3): renders `<details>` WITHOUT `open` (collapsed by default); `<summary>` text `Material autorizado (3 ítems detectados)`.
  - Expanding reveals one item block per item with code `Badge`, catalog `Badge` (`En catálogo` when `getCatalogByCode` matches, `No en catálogo` otherwise), description, `Cantidad`, `Precio ref.`.
  - Optional snapshots: 3-item collapsed + 0-item.
- [ ] **MissingCountText.test.tsx (DESIGN §8.3):**
  - Renders `null` when `count === 0`.
  - Renders `Faltan 1 obligatorio` when `count === 1` (singular).
  - Renders `Faltan 2 obligatorios` when `count === 2`; `Faltan 5 obligatorios` for 5 (plural).
  - Assert `className` contains `text-amber-700` (AC-07 token check).
- [ ] **AiResultsPanel.test.tsx (DESIGN §8.4 — integration):**
  - Renders the confidence pill with `Confianza {NN}%` + emerald classes when `result.confidence >= aiConfig.confidenceThreshold`.
  - Renders the pill with `Confianza baja · {NN}%`, `AlertTriangle`, amber classes when `result.confidence < aiConfig.confidenceThreshold`.
  - Asserts the standalone amber `Alert` block ("Confianza baja — revisá los datos antes de aplicar.") is NO longer rendered (absorbed).
  - Asserts the `Progress` bar is no longer rendered.
  - Asserts Material autorizado renders inside a `<details>` with the correct summary count string.
  - Asserts "Aplicar al formulario" is still rendered with `disabled` driven only by `canApply` (`result.looks_like_authorization !== false`) — confidence does NOT gate apply (AC-09).
  - Optional snapshots: one ok-confidence + one low-confidence.
- [ ] **NewSurgeryDialog.test.tsx (DESIGN §8.5 — focused render, NOT full snapshot):**
  - Mock `useOrtoTrackStore`, `useAuth`, `useAiExtraction`, and `ContactLookupField`/`ClasificacionSelectorModal` children to thin stubs (match the existing `cirugia-creation.test.ts` approach).
  - On Paso 0 with `step0Errors = { patient: "...", classification: "..." }`: assert `MissingFieldsBar` renders chips `Paciente` and `Clasificación`; assert `MissingCountText` renders `Faltan 2 obligatorios` in the footer.
  - Assert the "Siguiente" button (`data-testid="wizard-next-btn"`, L1652) is enabled (no `disabled` attribute) regardless of the error count (AC-04).
  - Assert clicking the `Paciente` chip focuses the `[data-step0-field="patient"]` input.
- [ ] **AiUploadZone.test.tsx (DESIGN §8.6 — baseline snapshot):**
  - One baseline snapshot of `AiUploadZone` in the idle state and one in the `isProcessing` state, to establish a regression baseline. No behavior change expected; guard against incidental regression. (L3 lock held defensively; no edit to the component.)

### Validation

- All new test files pass via `npm test` (run in T8).
- No existing test file is modified (additive only).
- `NewSurgeryDialog` test stays focused (light) — NOT a full snapshot of the 1710-line component.

### Stop / escalate

- The `NewSurgeryDialog` focused render test cannot be made stable without restructuring the 1710-line component → stop and escalate (a broader refactor is out of scope and requires Franco approval; DESIGN §11.9).
- A test would require importing/editing a blocked file under `src/lib/**` or `src/app/api/**` → stop and escalate (DESIGN §11.5).

---

## Task T8 — Validation gate (TypeScript + Vitest)

### Goal

Run the quality gate: TypeScript clean + the new Vitest tests pass. No build. No migrations. No Prisma. (AGENTS.md §12.)

### Files

- None edited.

### Dependencies

- T2, T3, T4, T5, T6, T7 (all implementation + tests complete).

### Acceptance criteria

- Supports AC-05 (no blocked tree modified — verified by diff inspection) and AC-06 (no new dependency — verified by lockfile inspection).

### Tasks

- [ ] Run `npx tsc --noEmit` — must be clean (no errors) across the new sub-components, the two edited components, and the new tests.
- [ ] Run `npm test` — the new test files from T7 must pass.
- [ ] Inspect `git diff` / `git status` to confirm NO file under `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers, or `src/types/index.ts` was modified (AC-05).
- [ ] Inspect `package.json` + lockfile to confirm NO new dependency was added (AC-06).
- [ ] Confirm no `categoria` field was added to `MaterialAutorizadoItemSchema`; no Implantes/Instrumental grouping; no proactive "Siguiente" disable; no confidence BLOCK path; no mockup blue/amber hex values (AC-07/AC-09/AC-10).

### Validation

- `tsc --noEmit` exit code 0.
- `npm test` exit code 0 for the new test files.
- Diff scope matches exactly: 3 new sub-components, 2 edited components (`NewSurgeryDialog.tsx`, `AiResultsPanel.tsx`), new test files, nothing else.

### Stop / escalate

- `tsc` or `npm test` fails → run the Diagnose cycle (Reproduce/Scope/Evidence/Hypothesis/Minimal Fix/Validate/Regression Check/Handoff, AGENTS.md §13) before applying any fix; do not apply blind fixes.
- A fix would require touching a blocked tree or adding a dependency → stop and escalate (AGENTS.md §11).

---

## Task T9 — Release locks + handoff

### Goal

Release L1/L2/L3, generate the Caveman-format handoff, update the worklog if applicable, and save the Engram session summary.

### Files

- None edited (handoff/worklog/Engram only).

### Dependencies

- T8 (validation gate passed).

### Acceptance criteria

- Closes AC-08 (locks released) and satisfies AGENTS.md §12/§13.

### Tasks

- [ ] Move L1, L2, L3 to status `released`.
- [ ] Generate the handoff in Caveman format (Done / Changed / Files / Validations / Risks / Next) per AGENTS.md §13.
- [ ] Update the worklog if the project maintains one for this change.
- [ ] Save the Engram `mem_session_summary` (Goal / Instructions / Discoveries / Accomplished / Next Steps / Relevant Files).
- [ ] Declare any open risks (e.g. the duplicate low-confidence paragraph at `NewSurgeryDialog.tsx` L837-841 flagged for Phase B; the independent IA audit gap at `ai-extract/route.ts` L109).

### Validation

- Locks show `released` in the handoff.
- Handoff contains Done/Changed/Files/Validations/Risks/Next.
- Engram session summary saved.

### Stop / escalate

- Any Phase B item (categoria grouping, safe-data classification, confidence BLOCK, IA audit) is requested during handoff → do NOT start it; flag as a separate future proposal requiring Franco approval after GPT-027F.0A/0B close.

---

## Suggested executor order

1. T1 — locks (prerequisite for all)
2. T2 — create the three sub-components (new files, no lock conflict)
3. T3 — `data-step0-field` wrappers in `NewSurgeryDialog.tsx` (L1)
4. T4 — mount `MissingFieldsBar` in `NewSurgeryDialog.tsx` (L1; needs T2 + T3)
5. T5 — mount `MissingCountText` in `NewSurgeryDialog.tsx` footer (L1; needs T2)
6. T6 — confidence pill + material details in `AiResultsPanel.tsx` (L2; needs T2)
7. T7 — tests (needs T2–T6)
8. T8 — validation gate (needs T7)
9. T9 — release locks + handoff (needs T8)

> Parallelism note: L1 (T3/T4/T5) and L2 (T6) are disjoint file sets and MAY be held concurrently by the same owner (DESIGN §9.2). T3/T4/T5 are sequenced because they all edit `NewSurgeryDialog.tsx` (one writer at a time). T6 edits `AiResultsPanel.tsx` and could run in parallel with T3–T5 if a second owner is assigned, but the default order above assumes a single owner holding all three locks.

This order keeps the change additive, presentational, testable, and aligned with the Phase A guardrails: no validator/service/schema/auth/API/provider/type touches, confidence stays WARN-only, bulk-apply semantics unchanged, "Siguiente" stays always enabled, emerald/amber tokens only.
