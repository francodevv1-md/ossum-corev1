# Spec — NUEVA-CIRUGIA-IA-UX-P2-LATERAL

Status: specified  
Change: `NUEVA-CIRUGIA-IA-UX-P2-LATERAL`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)  
Phase: UI-only follow-up after Phase A

---

## 1. Summary

Restructure the "Nueva Cirugía" AI assistant from a tall inline block into a compact lateral panel that preserves the main form's vertical space. The default panel view is summarized and field-oriented: each detected entity (Paciente, Médico, Institución, Cliente/Pagador) renders as a short proposition row with direct actions to link, keep text, or create a contact. Extraction details remain available, but collapsed behind an explicit expand action. This slice also fixes the top step control so the current/completed/pending states are visually consistent.

---

## 2. Objective

Reduce layout invasion and scrolling in Paso 1 while keeping the AI workflow fast, legible, and field-driven. The form must remain the primary surface; the AI assistant becomes a secondary helper rail.

---

## 3. In Scope

- Replace the current large inline AI suggestion block in `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` with a compact lateral panel layout.
- Keep upload/process controls inside the lateral panel.
- Render per-field proposition rows for:
  - Paciente
  - Médico
  - Institución
  - Cliente / Pagador
- Each proposition row exposes fast actions such as:
  - link best candidate
  - keep detected text
  - create contact
- Move confidence/material/patología/ubicación and other extracted details behind an expandable "details" affordance.
- Fix the wizard step control visual treatment at the top of the modal.
- Minimal tests for the new render hierarchy and the step control state rendering.

---

## 4. Out of Scope

- No backend/API/provider/prompt/schema/auth changes.
- No change to extraction logic or confidence threshold.
- No change to the ranking algorithm already fixed in the previous slice.
- No new business rules for auto-apply, safe-data classification, or confidence blocking.
- No 1:1 Stitch implementation.

---

## 5. Product Rules

### 5.1 Lateral panel priority

- The AI assistant must no longer push the full form downward with a long inline result stack.
- The primary reading order remains the surgery form.
- The AI assistant is secondary, compact, and visually contained.

### 5.2 Default = summarized

- The first visible state is summarized, not verbose.
- The operator should understand field suggestions in one scan without reading extraction internals.

### 5.3 Per-field proposition model

- Each supported field row shows:
  - field label,
  - detected text,
  - best quick action,
  - optional secondary actions.
- The quick action wording should be operational and short (e.g. "Vincular", "Crear contacto", "Mantener texto").
- The row must not require opening a long subpanel to complete the common action.

### 5.4 Details on demand

- Full extraction details stay available, but hidden by default.
- Examples of expandable detail content:
  - confidence status,
  - material autorizado,
  - patología sugerida,
  - ubicación sugerida,
  - warnings.

### 5.5 Step control fix

- The top step control must clearly communicate:
  - completed steps,
  - current step,
  - pending steps.
- Alignment, spacing, and state contrast must remain stable across the wizard.
- The control remains compact and must not compete visually with the AI panel.

---

## 6. Required User Experience

### 6.1 Paso 1 layout

Paso 1 is visually split into two coordinated areas:
- main form area,
- lateral AI assistant panel.

The main form keeps priority in width and attention.

### 6.2 AI assistant panel

The lateral panel contains:
1. compact upload/process zone,
2. summarized propositions by field,
3. expandable detail section.

The panel should help without forcing additional vertical scrolling through large extraction cards.

### 6.3 Proposition rows

Each row answers, at a glance:
- what the AI detected,
- what the system recommends,
- what the operator can do now.

Preferred interaction pattern:
- primary CTA for the best move,
- secondary CTA(s) for fallback actions,
- no long repeated candidate cards unless explicitly expanded.

### 6.4 Detail expansion

The operator can optionally expand a detail area to inspect the rawer extraction summary. This detail view is supportive, not the default working mode.

### 6.5 Step control

The step control must read cleanly at first glance and remain visually correct even when the modal body becomes denser.

---

## 7. Guardrails

- UI-only slice.
- No new dependency.
- No touch to `src/lib/**`, `src/app/api/**`, `prisma/**`, auth/provider internals, or `src/types/index.ts`.
- Keep changes localized to the cirugías UI layer and focused tests.
- Preserve the current emerald-based design system.

---

## 8. Acceptance Criteria

### AC-01 — IA assistant moves to a compact lateral layout

Paso 1 renders the AI assistant as a lateral panel or equivalent side-rail composition that does not dominate the main form vertically.

### AC-02 — Default AI view is summarized

The default AI state shows compact per-field propositions instead of a long vertical result list.

### AC-03 — Fast actions exist per field

For each detected supported field, the operator can directly choose a fast action such as linking the best suggestion, keeping the text, or creating a contact.

### AC-04 — Extraction details are collapsed by default

Confidence/material/patología/ubicación and related extraction details remain accessible but are hidden behind an explicit expand action by default.

### AC-05 — Step control is visually corrected

The top wizard step control clearly differentiates completed/current/pending states with stable layout and consistent spacing.

### AC-06 — No behavior regression

Existing validated flows remain intact:
- upload/process,
- apply detected text,
- link candidate,
- create contact,
- step navigation.

### AC-07 — No blocked source trees are modified

No file under `src/lib/**`, `src/app/api/**`, `prisma/**`, auth/provider internals, or `src/types/index.ts` is modified.

---

## 9. Implementation Notes for Next Phase

- Prefer extracting small presentational subcomponents for the lateral panel and proposition rows rather than growing `NewSurgeryDialog.tsx` further.
- Reuse the current ranking output; only presentation and layout should change in this slice.
- The expandable detail area may wrap the existing IA result surfaces rather than replacing their internals.
- The step control fix can remain in the same file if it is small and isolated.
