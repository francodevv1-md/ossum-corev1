# Spec — NUEVA-CIRUGIA-IA-UX-P1

Status: specified  
Change: `NUEVA-CIRUGIA-IA-UX-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)  
Phase: A (UI-pure, approved by Franco) — Phase B is deferred and out of this spec.

---

## 1. Summary

Layer four UI-pure, presentational improvements onto the existing "Nueva Cirugía" AI recognition flow: a Critical Missing Bar on Paso 1, a compacted confidence pill in the IA results header, a collapsible Material autorizado region, and a read-only "Faltan N obligatorios" count in the footer. Every change is additive, reads existing component state, and introduces no new validation pass, no new submit, no new persistence, no new auto-apply path, and no change to confidence gating semantics. This spec covers Phase A only; Phase B (categoria grouping, safe-data classification, confidence BLOCK gating, IA audit, prompt/provider changes) is out of scope and requires its own proposal after GPT-027F.0A/0B close.

---

## 2. Objective

Improve operator clarity and reduce friction in the existing AI recognition wizard without crossing the active sequence prohibitions in AGENTS.md §5/§11. The gap is presentation quality, not functionality — the core AI flow already exists end-to-end, so this spec defines behavior and acceptance criteria for presentational wrappers that consume state already computed by the current implementation.

---

## 3. In Scope

- Critical Missing Bar on Paso 1 de 3 listing missing required fields as clickable chips that focus the corresponding input.
- Compaction of the existing confidence display in `AiResultsPanel.tsx` into a single pill in the IA recognition header.
- Conversion of the existing flat Material autorizado array into a collapsible native `<details>`/`<summary>` region.
- Read-only "Faltan N obligatorios" count text in the wizard footer derived from the existing `step0Errors` state.
- Additive presentational sub-components under `src/components/cirugias/` (e.g. `MissingFieldsBar`, `MaterialAutorizadoDetails`, `MissingCountText`) that consume existing state.
- Minimal snapshot/render tests for the three high-risk cirugías components, since zero of the 31 existing test files cover the AI stack.
- Ownership lock declaration over the three high-risk files before any edit (AGENTS.md §9.3/§10).

---

## 4. Out of Scope

- Adding a `categoria` field to `MaterialAutorizadoItemSchema` (`src/lib/validators/autorizacion-ai.ts` L27-34 has no `categoria` field) and any grouping by Implantes/Instrumental — Phase B.
- "Safe data" vs "needs-confirm" classification behind an "Aplicar datos seguros (N)" button — Phase B; the safety classification is a business rule requiring Franco.
- Confidence BLOCK gating — today confidence is WARN-only (threshold 0.3); turning warn into block is a behavior change — Phase B / Franco.
- Prompt changes, provider changes, threshold changes, model changes.
- Schema/migrations (`prisma/schema.prisma`), auth changes, multi-company changes.
- Backend/audit work on `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` (the `void durationMs` audit gap at L109 is an independent backend-phase gap, not fixed here).
- Adopting the Stitch mockup blue `#003f87` palette — a product decision requiring Franco; Phase A stays on the existing emerald design system.
- Proactive "Siguiente" disable based on the missing-required count — a behavior change, out of scope.
- Per-field date "Confirmar uso" helper — deferred.
- Provincia IA-injected dropdown option — deferred (current auto-fill comes from the institution contact).
- Replicating the Stitch mockup 1:1 (it is static HTML with Tailwind CDN, not portable into the Next.js + shadcn stack).
- Any touch to `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers, or `src/types/index.ts`.
- Any new dependency (AGENTS.md §11).

---

## 5. Product Rules

### 5.1 Phase boundary

- This spec defines Phase A only. Phase A is UI-pure, presentational, and approval-safe under the active sequence prohibitions.
- Any item that changes business logic, validation behavior, data model, gating semantics, schema, auth, providers, or API routes belongs to Phase B and is excluded.

### 5.2 Critical Missing Bar (Item 1)

- The bar renders at the top of the form body on Paso 1 de 3 only.
- The bar is visible only when there are missing required fields on the current step (i.e. `step0Errors` is non-empty).
- The bar lists each missing required field as a clickable chip.
- Clicking a chip focuses the corresponding input. Focus must not mutate form state, must not clear errors, and must not advance the wizard.
- The bar reads the EXISTING `step0Errors` state computed by `validateStep0` (`src/components/cirugias/dialogs/NewSurgeryDialog.tsx` L366-375). It must NOT introduce a new validation pass, must NOT call `validateStep0` on its own, and must NOT recompute errors.
- The bar is pure presentational; `validateStep0` behavior is unchanged.
- The mockup uses hardcoded hex values (`#fff8e6` bg / `#ffeebb` border / `#b07b00` text); the implementation must instead use the existing emerald design system's warning/amber tokens, NOT the mockup's hardcoded hex values.

### 5.3 Confidence pill compaction (Item 2)

- The already-rendered confidence display (`src/components/cirugias/AiResultsPanel.tsx` L49-50, L74-89: percentage + `Progress` bar + amber `Alert` warning) is compacted into a single pill rendered in the IA recognition header.
- The pill reuses the same `result.confidence` value and the same threshold (`aiConfig.confidenceThreshold`, default `0.3`, `src/lib/services/ai/config.ts` L10/L61). No new threshold, no new constant, no new config.
- The pill shows the confidence percentage plus color coding (ok vs low) derived from the existing `isLowConfidence` comparison (`result.confidence < aiConfig.confidenceThreshold`).
- Gating semantics are UNCHANGED: WARN-only, not BLOCK. The pill is informational and does not prevent apply. Phase B may introduce BLOCK; Phase A must not.
- No data model change. `AiResultsPanelProps`, `result.confidence`, and `aiConfig` are consumed read-only.

### 5.4 Material autorizado as collapsible details (Item 3)

- The existing flat array (`src/components/cirugias/AiResultsPanel.tsx` L173-207) is rendered as a collapsible `<details>`/`<summary>` region.
- The region still lists the same detected materials with their existing catalog badge (`getCatalogByCode`, "En catálogo" / "No en catálogo").
- NO grouping by Implantes/Instrumental. Such grouping requires a `categoria` field on `MaterialAutorizadoItemSchema` (`src/lib/validators/autorizacion-ai.ts` L27-34), which does not exist and is not added in Phase A.
- The summary line shows the item count, e.g. "Material autorizado (5 ítems detectados)", consistent with the existing count rendering at L175-176.
- Native HTML `<details>` is preferred — no new dependency, no Radix Accordion, no shadcn Accordion addition.
- The region is collapsed by default and expands on click. (Design decision: collapsed-by-default to reduce visual load; expand-on-click is the only interaction.)
- Styling uses the existing emerald/secondary design tokens (e.g. the current `rounded-lg border p-3` container at L173 and `bg-muted/40` item styling at L185 may be preserved or mapped to existing tokens). No mockup blue palette.

### 5.5 Footer informational missing count (Item 4)

- The footer displays a read-only informational line "Faltan N obligatorios" derived from the current `step0Errors.length` (the count of keys in the `Step0Errors` object set at L367-373).
- The "Siguiente" button stays always enabled (`src/components/cirugias/dialogs/NewSurgeryDialog.tsx` L1651-1655 — the button has no `disabled` prop and is rendered whenever `wizardStep < 2`). Validation remains on-click via `handleNext`.
- This item MUST NOT proactively disable "Siguiente". It is informational only — it tells the operator how many required fields are missing before they click Siguiente.
- Styling uses existing error/warning tokens from the emerald design system. No mockup palette.

### 5.6 No behavior change

- No user flow changes, no new submits, no new API calls, no new persistence, no new auto-apply paths, no new gating paths.
- The bulk "Aplicar al formulario" behavior (`AiResultsPanel.tsx` L228; `NewSurgeryDialog.tsx` L523-528, empty-fields-only) is untouched in semantics.

---

## 6. Required User Experience

### 6.1 Paso 1 with missing required fields

When the operator is on Paso 1 de 3 and one or more required fields are empty, an amber Critical Missing Bar appears at the top of the form body. Each missing field renders as a clickable chip labeled with a human-readable field name; clicking a chip moves focus to the corresponding input without mutating state or clearing errors. When no required fields are missing on the current step, the bar is not rendered.

### 6.2 IA results header confidence pill

The IA recognition header displays a single compact confidence pill showing the confidence percentage and a color cue (ok/low). When confidence is below the existing threshold, the pill conveys the low-confidence warning inline; the standalone amber `Alert` block may be absorbed into the pill or kept as-is per the design phase, but the WARN-only semantics and the threshold value must not change.

### 6.3 Collapsible Material autorizado

The Material autorizado block renders as a collapsed-by-default `<details>`/`<summary>` region. The summary line states the detected item count (e.g. "Material autorizado (5 ítems detectados)" or "Material autorizado (0 ítems detectados)"). Expanding reveals the same per-item rendering as today: code badge, catalog badge ("En catálogo" / "No en catálogo"), description, cantidad, and precio ref. No Implantes/Instrumental grouping is offered.

### 6.4 Footer missing count

The wizard footer shows a read-only line "Faltan N obligatorios" reflecting the current count of missing required fields. The "Siguiente" button remains enabled regardless of the count; clicking it triggers the existing on-click validation. The count updates reactively as the operator fills or empties required fields (because `step0Errors` is recomputed by the existing `validateStep0` call path — Phase A only reads it).

---

## 7. Persistence and Internal Boundaries

- Phase A introduces no persistence. All four items are presentational and read existing in-component state.
- No server-side boundary is added, modified, or invoked. The API route `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` is not touched.
- The frontend remains a transient view; no new client-side store, no new Zustand slice, no new localStorage key is introduced.
- Internal boundaries to validators, services, providers, and types are respected: Phase A components must not import or call into `src/lib/validators/**`, `src/lib/services/**`, or `src/app/api/**` beyond what the current implementation already does.

---

## 8. States and Feedback

Phase A reuses existing states; it does not introduce new state families. The visible feedback surfaces are:

- Critical Missing Bar: visible / hidden (derived from `step0Errors` emptiness); chip click → input focus.
- Confidence pill: ok color / low color (derived from existing `isLowConfidence`); percentage text.
- Material autorizado details: collapsed / expanded (native `<details>` open state); item count in summary; per-item catalog badge.
- Footer missing count: non-negative integer text derived from `step0Errors.length`; "Siguiente" remains enabled in all states.

No loading, success, or failure states are added by Phase A. No new error states are introduced; existing validation error rendering on each field is unchanged.

---

## 9. Guardrails

- No touch to `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers, or `src/types/index.ts`.
- No new dependencies installed (AGENTS.md §11).
- No schema, migration, or auth changes (AGENTS.md §5/§11).
- No Cirugías refactor beyond minimal additive presentation (AGENTS.md §11). Prefer small presentational sub-components over restructuring the 1710-line `NewSurgeryDialog.tsx`.
- Ownership lock required on the three high-risk cirugías component files before any edit, per AGENTS.md §10 (Lock obligatorio / muy alto riesgo) and §9.3. The lock declares task, agent role, selected model, owned files, and status. No two agents may edit the same file concurrently.
- Emerald design system only — NO mockup blue `#003f87` palette and NO mockup hardcoded amber hex values; use existing shadcn/ui primitives and existing emerald/warning/secondary tokens.
- No new submit, persistence, auto-apply, or gating path. Confidence gating stays WARN-only (no BLOCK).
- A-Q1 compliance: Phase A must NOT add new auto-apply paths. The "safe data" classification is explicitly Phase B. The bulk-apply semantics (`AiResultsPanel.tsx` L228; `NewSurgeryDialog.tsx` L523-528, empty-fields-only) are unchanged.
- No Prisma format/generate, no build pipeline changes, no Tailwind CDN, no migration commands.
- If scope expands, a critical-file overlap appears, or an approval boundary is crossed, the implementer must stop and escalate per AGENTS.md §9.5/§9.6.

---

## 10. Acceptance Criteria

### AC-01 — Critical Missing Bar renders missing required fields as focus chips

On Paso 1 de 3 with non-empty `step0Errors`, an amber Critical Missing Bar renders each missing required field as a clickable chip that focuses the corresponding input, reading the existing `step0Errors` state without invoking a new validation pass.

### AC-02 — Confidence pill compacts existing confidence display without changing gating

The confidence display in `AiResultsPanel.tsx` is compacted into a single pill showing percentage plus ok/low color coding, reusing the existing `result.confidence` value and `aiConfig.confidenceThreshold` (0.3), with WARN-only gating semantics preserved (no BLOCK introduced).

### AC-03 — Material autorizado renders as collapsible details with item count and no grouping

The Material autorizado array renders as a collapsed-by-default native `<details>`/`<summary>` region whose summary shows the detected item count, still listing each material with its catalog badge, with no Implantes/Instrumental grouping and no schema change to `MaterialAutorizadoItemSchema`.

### AC-04 — Footer shows missing count while Siguiente stays enabled

The footer displays a read-only "Faltan N obligatorios" count derived from `step0Errors.length`, the "Siguiente" button remains always enabled (no proactive disable), and on-click validation behavior is unchanged.

### AC-05 — Blocked source trees are not modified

No file under `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers, or `src/types/index.ts` is modified by this change.

### AC-06 — No new dependencies

No new dependency is added to `package.json` / lockfile; no new import introduces a package not already present in the repo.

### AC-07 — Emerald design system used; mockup blue palette not introduced

All new styling uses the existing shadcn/ui + emerald design tokens (warning/amber, secondary, muted, etc.); the mockup blue `#003f87` palette and the mockup hardcoded amber hex values are NOT introduced into the codebase.

### AC-08 — Ownership lock declared for high-risk cirugías files

An ownership lock is declared and recorded before any edit for the three high-risk files — `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`, `src/components/cirugias/AiResultsPanel.tsx`, `src/components/cirugias/AiUploadZone.tsx` — per AGENTS.md §9.3/§10.

### AC-09 — Confidence gating preserved as WARN-only

The change does not introduce any BLOCK path on low confidence; confidence remains a WARN-only signal and the "Aplicar al formulario" action is not gated by confidence in Phase A.

### AC-10 — No new auto-apply path (A-Q1 compliance preserved)

The change introduces no new auto-apply path and no "safe data" classification; bulk-apply semantics remain empty-fields-only (`NewSurgeryDialog.tsx` L523-528) and unchanged.

---

## 11. Implementation Notes for Next Phase

- **Path correction vs. proposal.** The proposal cites `src/components/cirugias/NewSurgeryDialog.tsx`; the verified path is `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (1710 lines, under a `dialogs/` subfolder). The line numbers cited in the proposal are accurate against this verified path. `AiResultsPanel.tsx` and `AiUploadZone.tsx` are directly under `src/components/cirugias/` as cited.
- **Verified anchors** (read before editing):
  - `step0Errors` / `validateStep0`: `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` L366-375.
  - "Siguiente" always-enabled button: `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` L1651-1655 (no `disabled` prop; rendered when `wizardStep < 2`).
  - Bulk apply empty-fields-only: `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` L515-528; `AiResultsPanel.tsx` L228.
  - Confidence display + low-confidence alert: `AiResultsPanel.tsx` L49-50, L74-89.
  - Material autorizado flat list: `AiResultsPanel.tsx` L173-207 (count at L175-176; catalog badge at L188-193).
  - Confidence threshold: `src/lib/services/ai/config.ts` L10 (`DEFAULT_CONFIDENCE_THRESHOLD = 0.3`) and L61 (`confidenceThreshold`). These files are read-only references; they must NOT be edited in Phase A.
  - `MaterialAutorizadoItemSchema` (no `categoria`): `src/lib/validators/autorizacion-ai.ts` L27-34. Read-only reference; must NOT be edited in Phase A.
- **Minimal-change principle.** Introduce small presentational sub-components (e.g. `MissingFieldsBar.tsx`, `MaterialAutorizadoDetails.tsx`, `MissingCountText.tsx`) under `src/components/cirugias/` that consume existing state via props. Avoid restructuring `NewSurgeryDialog.tsx`; mount the bar and footer text at minimal insertion points.
- **Design system.** Use existing shadcn/ui primitives (`Badge`, `Alert`, `Progress` where retained) and existing emerald/warning/secondary/muted tokens. Do NOT introduce the mockup blue `#003f87` palette or the mockup hardcoded amber hex values (`#fff8e6`, `#ffeebb`, `#b07b00`); map them to existing tokens.
- **Testing.** Zero of the 31 existing test files cover the AI stack. Phase A validation should include minimal snapshot/render tests for the three high-risk components (`NewSurgeryDialog.tsx`, `AiResultsPanel.tsx`, `AiUploadZone.tsx`) and for the new presentational sub-components. TypeScript must be clean. No build pipeline changes, no migration commands.
- **Design phase next.** The design phase should specify exact chip labels, the focus-target mapping for each `step0Errors` key, the confidence pill visual contract (ok/low colors, percentage format, whether the standalone amber `Alert` is absorbed or retained), the Material autorizado summary string format, the footer count string format, and the snapshot test scope — without crossing into blocked backend-foundation scope.
