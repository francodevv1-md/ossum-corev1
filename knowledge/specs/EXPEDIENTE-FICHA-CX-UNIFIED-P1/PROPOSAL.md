# Proposal — EXPEDIENTE-FICHA-CX-UNIFIED-P1

Status: proposed  
Change: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)

---

## Summary

Redesign the active surgery detail / expediente full view into a single, full-width top **Ficha de CX** case-profile block anchored in `ExpedienteFullView` and implemented primarily through a refactor of `ExpedienteHeader`. The new top block becomes the operational identity surface of the case: it concentrates core case identity, operational chips, a compact macro timeline, top actions, and administrative references, with tabs visually attached immediately below it.

This is a desktop-first, ERP médico/quirúrgico information-hierarchy change only. It does not introduce backend, auth, schema, business-rule, or workflow changes.

---

## Why this change

The current expediente full view splits critical case context across multiple surfaces:

- `ExpedienteHeader.tsx` shows a compact top bar, a thin info strip, badges, and an action row.
- `ResumenExpediente.tsx` repeats a large part of the same identity, status, and administrative data.
- `FichaCirugia.tsx` contains the detailed case record, but only after entering the `Cirugía` tab.

That fragmentation weakens scan speed for coordinators and operators. The expediente view is supposed to behave like the operational face of the surgery; today, the top area is still too narrow and too distributed. A unified **Ficha de CX** block fixes this by making the top of the screen the single source of immediate case context while keeping the tabs and detailed panels below.

---

## In scope

- Replace the current compact expediente header composition with one unified, full-width **Ficha de CX** block.
- Keep the redesign inside the active surgery detail flow rendered by `ExpedienteFullView`.
- Concentrate these identity fields in the top block:
  - ID CX
  - Paciente
  - DNI
  - Médico
  - Institución
  - Cliente / financiador
  - Fecha CX
  - Clasificación
  - Coordinador
  - Vendedor
  - Instrumentador
  - Urgente
- Show integrated operational chips for:
  - Estado CX
  - Preparación
  - Documentación
  - Facturación
  - Consumo / Cobranza when applicable
- Highlight **Sin autorización** as a critical operational alert without turning the whole block into an error banner.
- Add a top action cluster with:
  - `Editar ficha`
  - `Generar PR`
  - `Más acciones`
- Keep compact administrative references inside the same top block.
- Place tabs directly below and visually attached to the ficha block.
- Preserve the `Cirugía` tab name.
- Simplify `Resumen` so it stops duplicating identity/status content that moves upward.
- Add a top operational timeline limited to these macro states only:
  - `Sin autorizar`
  - `Autorizado`
  - `Pendiente`
  - `Tránsito`
  - `Realizada`
  - `Finalizada`

---

## Explicitly out of scope

- Any source-code implementation outside the proposal artifact.
- Backend, auth, schema, Prisma, migrations, services, permissions, or business-rule changes.
- Reintroducing a lateral preview panel or split-list/detail layout.
- KPI cards or dashboard metrics above the ficha block.
- Renaming the `Cirugía` tab.
- Treating preparation substates as top-level timeline stages.
- Treating `Apta para facturar` as a top-level timeline stage.

---

## Product shape

The redesigned expediente opens with a single top block that behaves like a **case profile for surgery operations**, not a decorative header.

### 1. Top ficha structure

The block should read as one unified surface with three coordinated layers:

1. **Identity layer** — the main case profile, with the patient and surgery identity fields as the visual anchor.
2. **Operational layer** — state chips plus the macro timeline and the `Sin autorización` alert when applicable.
3. **Action/reference layer** — top actions and compact administrative references.

### 2. Macro timeline rules

The top timeline is intentionally coarse. It is a macro reading aid, not a full circuit explainer.

- Allowed macro stages: `Sin autorizar`, `Autorizado`, `Pendiente`, `Tránsito`, `Realizada`, `Finalizada`.
- Preparation-family substates stay subordinated under the **Preparación** chip/family, including: `Congelado`, `Sin congelar`, `En preparación`, `Enviado`, `Retirado`.
- `Apta para facturar` stays subordinated under **Facturación** / documentation-adjacent logic and does not appear as a macro timeline stage.

### 3. Tabs relationship

Tabs remain below the ficha and should feel physically attached to it, so the top block and the tab strip read as one continuous expediente shell. `Resumen` becomes lighter and more operational because the ficha already owns the repeated case identity.

---

## Implementation direction

This proposal assumes a UI refactor centered on the existing expediente shell, not a new navigation model.

- `ExpedienteFullView.tsx` remains the entry shell for the expanded case view.
- `ExpedienteHeader.tsx` becomes the main target for transformation into the unified **Ficha de CX** block.
- `ResumenExpediente.tsx` should be simplified after identity/status content moves into the top ficha.
- `FichaCirugia.tsx` remains the detailed tab-level surgery record/editor; it should not be duplicated by the new top block.
- The existing tab system in `ExpedienteFullView.tsx` stays in place, but its visual integration with the top block must change.
- Existing action semantics should be reused where possible, but the top ficha action cluster should be framed around the approved trio: `Editar ficha`, `Generar PR`, `Más acciones`.

### Suggested component responsibility split

- **`ExpedienteFullView.tsx`**: shell composition, top-block + tabs relationship.
- **`ExpedienteHeader.tsx`**: unified ficha layout, alert treatment, action cluster, chips, references, timeline.
- **`ResumenExpediente.tsx`**: de-duplicated summary content only.
- **`FichaCirugia.tsx`**: full editable tab content for the surgery record.

---

## Expected repo impact

Primary files expected to change in later phases:

- `src/components/expediente/ExpedienteFullView.tsx` — shell composition and ficha/tabs attachment.
- `src/components/expediente/ExpedienteHeader.tsx` — main redesign target.
- `src/components/expediente/ResumenExpediente.tsx` — duplication reduction.
- `src/components/expediente/FichaCirugia.tsx` — likely minor alignment only, if needed to support `Editar ficha` flow.

Reference inputs that inform the proposal shape:

- `src/app/cirugias/page.tsx` — expanded expediente entry path.
- `src/components/cirugias/CirugiaActionsCell.tsx` — current action hierarchy cues.
- `src/components/cirugias/CircuitProgressCell.tsx` — useful visual precedent for a compact operational progress treatment, but not a semantic match for the new macro timeline.

---

## Risks and open design points

- **R1 — Duplication drift.** If `ResumenExpediente` is not explicitly reduced, the redesign will add a better header but preserve the old duplication below.
- **R2 — Timeline ambiguity.** Existing surgery/preparation/documentation/facturación states do not map 1:1 to the approved six macro stages; the next phase must define the visual/state-mapping rules precisely.
- **R3 — Alert balance.** `Sin autorización` must be prominent enough to drive action without making the full ficha feel visually broken or alarm-fatigued.
- **R4 — Header bloat.** Bringing identity, chips, timeline, actions, and references together risks creating a dense wall of content; layout rules must preserve scan order and hierarchy.
- **R5 — Action overlap.** The top ficha action trio must stay coherent with existing expediente actions and avoid exposing a second competing action system.

---

## Dependencies

### Internal

- `ExpedienteFullView.tsx` current tab shell — available.
- `ExpedienteHeader.tsx` current compact header — available and suitable as refactor target.
- `ResumenExpediente.tsx` current duplication surface — available.
- `FichaCirugia.tsx` existing detailed surgery record tab — available.

### Constraint dependencies

- AGENTS.md prohibitions remain active: no backend/auth/schema/critical cross-domain changes.
- This proposal depends on keeping the redesign desktop-first and UI-only.
- The next SDD phase must define the exact mapping from current state data to the approved macro timeline.

---

## Success criteria for next phases

- The expediente full view has one clearly dominant top **Ficha de CX** block.
- Identity and operational context are readable from the top block without entering `Resumen` or `Cirugía` first.
- `Resumen` no longer repeats the same identity/status/reference payload already visible above.
- Tabs feel attached to the ficha block and the `Cirugía` tab label remains unchanged.
- The macro timeline stays limited to the six approved stages and excludes preparation substates and `Apta para facturar`.
- `Sin autorización` is visually prominent as an operational alert.
- The redesign remains desktop-first and does not reintroduce a lateral preview pattern.

---

## Proposed next step

Proceed to `sdd-spec` for `EXPEDIENTE-FICHA-CX-UNIFIED-P1` and define:

1. exact ficha layout zones,
2. macro timeline mapping rules,
3. duplication-removal rules for `Resumen`,
4. action-cluster behavior expectations,
5. acceptance criteria for the `Sin autorización` alert treatment.
