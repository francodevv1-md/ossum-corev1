# Spec — EXPEDIENTE-FICHA-CX-UNIFIED-P1

Status: specified  
Change: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)  
Phase: UI-only surgery detail unification

---

## 1. Summary

Redesign the expanded surgery detail view into one dominant top **Ficha de CX** surface that becomes the operator's single immediate source of case identity, macro operational status, key actions, and compact references. The redesign stays inside the existing `ExpedienteFullView` shell, keeps the current tab model, preserves the `Cirugía` tab name, and removes duplicated identity/status payload from `Resumen`. This is a desktop-first information-hierarchy change only: no backend, schema, auth, permission, workflow, or business-rule changes are introduced.

---

## 2. Objective

Make the top of the expediente behave like the operational face of the surgery case so a coordinator can understand who the case is, where it stands, what is blocked, and what the next likely action is without scanning `Resumen` and `Cirugía` for repeated information.

---

## 3. In Scope

- One unified full-width **Ficha de CX** block at the top of `ExpedienteFullView`.
- Refactor target centered on `ExpedienteHeader.tsx` with shell/tabs alignment in `ExpedienteFullView.tsx`.
- Explicit top layout zones, content inventory, visual hierarchy, and behavior rules.
- One compact macro timeline using only the six approved top states.
- Operational chips/badges inside the ficha.
- One top action cluster with the approved trio: `Editar ficha`, `Generar PR`, `Más acciones`.
- Compact administrative references inside the same top surface.
- Tabs visually attached directly below the ficha.
- Explicit duplication-removal rules for `ResumenExpediente.tsx`.
- Acceptance criteria, edge cases, and out-of-scope limits for later design/apply phases.

---

## 4. Out of Scope

- Any backend, auth, Prisma, schema, migration, service, validator, permission, or audit change.
- Any new workflow stage, business-rule mutation, or data-model change.
- Any rename of the `Cirugía` tab.
- Any return to a lateral preview or split master/detail layout.
- KPI cards above the ficha.
- Treating `Preparación` substates as top-level timeline stages.
- Treating `Apta para facturar` as a top-level timeline stage.
- Duplicating the full editable surgery record from `FichaCirugia.tsx` into the top ficha.
- Mobile redesign. This spec is desktop-first; smaller breakpoints may degrade gracefully but are not optimized here.

---

## 5. Product Rules

### 5.1 Single-source top surface

- The top ficha is the dominant summary surface for the active surgery case.
- Identity, macro state reading, operational alerting, and primary actions must be readable from this single surface.
- The same identity/status/reference payload must not be repeated again in `Resumen` unless explicitly listed in §8.2.

### 5.2 Ficha layout zones

The top block is one unified card/shell with five ordered zones:

1. **Shell utility strip**  
   Back navigation and lightweight shell utilities only.

2. **Identity anchor zone**  
   The strongest visual zone. Shows who the case is and what surgery record is being viewed.

3. **Operational zone**  
   Contains the macro timeline, operational chips, and the `Sin autorización` alert treatment when applicable.

4. **Action zone**  
   Contains the approved top action cluster and no competing second action bar.

5. **References/admin zone**  
   Compact references and administrative labels that are useful for context but must not dominate the ficha.

Visual reading order must be identity first, status second, action third, references fourth.

### 5.3 Exact identity content to surface at the top

The ficha top area must surface these fields, visible without opening any tab:

- `ID CX` — always visible; primary case anchor.
- `Paciente` — always visible; primary human anchor.
- `DNI` — visible when available.
- `Médico` — visible when available.
- `Institución` — visible when available.
- `Cliente / financiador` — visible when available.
- `Fecha CX` — always visible as the scheduled surgery date; time may appear adjacent when present.
- `Clasificación` — visible when available.
- `Coordinador` — visible; fallback `Sin asignar` when empty.
- `Vendedor` — visible when available.
- `Instrumentador` — visible when available.
- `Urgente` — visible as an explicit operational marker, not buried in `Resumen`.

Identity rules:

- `Paciente` and `ID CX` are the two visual anchors.
- `DNI`, `Médico`, `Institución`, `Cliente / financiador`, and `Fecha CX` belong in the first-read identity band.
- `Clasificación`, `Coordinador`, `Vendedor`, `Instrumentador`, and `Urgente` belong in a secondary identity/admin band inside the same top block.
- `Expediente #` may appear near `ID CX` as a secondary identifier when available.

### 5.4 Macro timeline semantics

The top timeline is a coarse reading aid and must use only these six states, in this order:

1. `Sin autorizar`
2. `Autorizado`
3. `Pendiente`
4. `Tránsito`
5. `Realizada`
6. `Finalizada`

Timeline rules:

- The timeline is macro-only, not a full circuit explainer.
- It must never show more than these six stages.
- The active/current stage must be visually distinguishable from completed and pending stages.
- The timeline must remain compact enough to fit inside the top ficha without becoming the dominant visual element over patient identity.
- The timeline is not a substitute for detailed status chips or tab-level detail.

### 5.5 Substates are not timeline stages

- `Preparación` is a status family and must render as an operational chip/badge, not as a top timeline stage.
- Preparation-family substates such as `Congelado`, `Sin congelar`, `En preparación`, `Enviado`, and `Retirado` remain subordinate to the `Preparación` chip/family.
- `Apta para facturar` is also a subordinate status and must not appear as a top timeline stage.
- `Apta para facturar` belongs under facturación/documentación-adjacent status reading, not under the macro timeline.

### 5.6 Operational chips / badges

The ficha must show compact operational chips for the following families:

- `Estado CX`
- `Preparación`
- `Documentación`
- `Facturación`
- `Consumo` when applicable
- `Cobranza` when applicable

Chip rules:

- Chips are for quick status scanning, not for verbose explanation.
- Each chip shows the currently resolved label already available to the UI; this spec does not redefine business logic.
- `Urgente` may render as a dedicated chip or high-contrast marker in the identity/admin band.
- If `Consumo` or `Cobranza` has no applicable data yet, absence may be shown as neutral text/chip or omitted according to the current data availability, but the ficha must not show fake completeness.

### 5.7 `Sin autorización` alert treatment

- `Sin autorización` must be visibly prominent inside the operational zone.
- It must read as a critical operational alert, not as a full-width error page/banner.
- The alert must not visually overpower patient identity or make the full ficha feel broken.
- The alert should sit near the macro timeline and operational chips because it is an operational blocker.

### 5.8 Top action cluster behavior

The top ficha action cluster is limited to three primary entry points:

- `Editar ficha`
- `Generar PR`
- `Más acciones`

Behavior expectations:

- `Editar ficha` must take the operator to the `Cirugía` tab context or equivalent existing surgery-record editing surface. It does not open a new editing model.
- `Generar PR` is the explicit top-call action when no PR exists. If a PR already exists, the UI may adapt the label/action presentation in design/apply phase, but the top cluster must still preserve the approved action hierarchy and avoid duplicating multiple PR-related buttons at top level.
- `Más acciones` groups secondary actions already supported by the expediente flow.
- Secondary actions such as notes, date change, state change, suspension/cancellation, document access, remito, consumo, invoicing-related actions, print/export, and recovery stay under `Más acciones` unless already approved elsewhere.
- The ficha must not create a second competing action system separate from the existing expediente action semantics.
- The top cluster should expose only one primary row; do not add a second stacked action bar.

### 5.9 Compact references / admin area

The ficha must include a compact references/admin area for quick scanning of administrative anchors, including when available:

- PR reference
- NR reference
- FV reference
- Expediente number
- compact administrative references already stored on the surgery

Rules:

- References must remain compact and secondary to identity and operations.
- References should support scanability, not become full cards with large explanatory text.
- Administrative references currently shown in `Resumen` move to the ficha-level admin area unless they need expanded detail that belongs in `Cirugía`.

### 5.10 Tabs placement and grouping

- The tab strip stays immediately below the ficha and must feel physically attached to it.
- The ficha + tab strip must read as one continuous expediente shell.
- `Cirugía` stays named exactly `Cirugía`.
- No tab is promoted above the ficha.
- The visual separation between ficha and tabs should be minimal compared with the separation between the tabs and the tab content body.
- Existing tab grouping/order may remain unless later design work needs minor visual adjustment, but no navigation model change is introduced by this spec.

---

## 6. Required Content Distribution

### 6.1 Content that must move out of `Resumen`

The following content must move to the unified top ficha and must stop being repeated as a top-level `Resumen` payload:

- Patient identity block (`Paciente`, `DNI`)
- Doctor / institution identity block (`Médico`, `Institución`)
- Client / financer identity block
- Surgery schedule identity (`Fecha CX`, optional time)
- Classification
- Coordinator / seller / instrumentador identity/admin fields
- Urgency marker
- Main status family payload (`Estado CX`, `Preparación`, `Documentación`, `Facturación`, applicable `Consumo`, applicable `Cobranza`)
- Main pending/blocked operational reading when already surfaced at the top
- Administrative references as a repeated standalone card

### 6.2 Content that remains in `Resumen`

`Resumen` remains as a lighter operational digest and may keep:

- highlighted legend / note when present
- key pending operational explanation if it adds detail beyond the top chip/alert
- main comprobantes overview (PR / PE / NR / FV / cobranza summaries)
- latest notes / novedades
- concise operational summary blocks that do not repeat the full identity/status header payload

`Resumen` must not re-open with another full patient/status/administrative identity card after the ficha exists.

---

## 7. Desktop-First Visual / UX Constraints

- The redesign is desktop-first and optimized for wide operational screens.
- The ficha must use horizontal information density responsibly; avoid tall stacked mobile-style blocks on desktop.
- The layout must privilege scan speed over decorative spacing.
- The operator must be able to identify case + macro state + next likely action from the top viewport without entering another tab.
- The ficha must remain a unified surface, not three disconnected cards.
- Avoid duplicate labels/value repetition across multiple zones.
- Avoid oversized chips, oversized icons, or dashboard-style KPI boxes.
- Avoid a visually noisy wall of equal-weight metadata.
- Patient identity and operational stage must have stronger hierarchy than administrative references.
- Tabs must remain visible as the next interaction surface directly under the ficha.

---

## 8. Edge Cases

- **No authorization yet**: `Sin autorización` is prominently shown, but the ficha still renders as a normal case profile rather than an error state.
- **Missing optional identity fields**: absent values (`DNI`, `Instrumentador`, `Vendedor`, etc.) render as neutral empty/fallback values without collapsing the top layout.
- **No PR / no NR / no FV**: the references/admin zone must not show fake placeholders that look like real document numbers.
- **PR already exists**: top action treatment must avoid showing both `Generar PR` and a competing `Ver PR` primary button at the same hierarchy level unless the later design phase resolves it within the approved trio contract.
- **No consumo / no cobranza yet**: chips or indicators must remain neutral or absent; they must not imply completion.
- **Long patient / institution / surgeon names**: truncation/wrapping rules must preserve layout stability and keep `ID CX`, macro status, and actions visible.
- **Highlighted legend present**: the top ficha may surface urgency/blocking context, but long narrative legend content remains below in `Resumen` or `Cirugía`; the ficha must not become a large notes panel.
- **Cancelled or suspended surgery**: current case state remains readable through chips/timeline mapping without inventing new top-level macro stages.

---

## 9. Acceptance Criteria

### AC-01 — One dominant top ficha exists

The expanded expediente view renders one clearly dominant top **Ficha de CX** surface that consolidates identity, macro status reading, actions, and references.

### AC-02 — Exact top identity payload is surfaced

The ficha top area exposes `ID CX`, `Paciente`, `DNI`, `Médico`, `Institución`, `Cliente / financiador`, `Fecha CX`, `Clasificación`, `Coordinador`, `Vendedor`, `Instrumentador`, and `Urgente` when available, with `Paciente` and `ID CX` as the primary anchors.

### AC-03 — Macro timeline is limited to the six approved states

The top operational timeline uses only `Sin autorizar`, `Autorizado`, `Pendiente`, `Tránsito`, `Realizada`, and `Finalizada`, in that order, with no additional top-level stages.

### AC-04 — `Preparación` and `Apta para facturar` remain subordinate

`Preparación` and its substates render as chip/family status only, and `Apta para facturar` does not appear as a macro timeline stage.

### AC-05 — Operational chips exist inside the ficha

The ficha shows compact operational chips/badges for `Estado CX`, `Preparación`, `Documentación`, `Facturación`, and `Consumo` / `Cobranza` when applicable.

### AC-06 — `Sin autorización` is prominent but balanced

When the case is unauthorized, the ficha shows a visible operational alert for `Sin autorización` without converting the whole top block into a destructive banner.

### AC-07 — Top action cluster stays coherent

The top action cluster is framed around `Editar ficha`, `Generar PR`, and `Más acciones`, and does not create a second competing action system.

### AC-08 — Tabs are attached to the ficha and `Cirugía` remains unchanged

The tabs appear directly below and visually attached to the ficha, and the `Cirugía` tab label stays exactly `Cirugía`.

### AC-09 — `Resumen` no longer duplicates top identity/status payload

After the redesign, `Resumen` no longer opens with a repeated full identity/status/admin card for the same case data already shown in the ficha.

### AC-10 — The design remains desktop-first and operator-first

The top viewport of the expanded case lets an operator identify case identity, current macro status, main operational blocker, and next likely action without entering another tab.

---

## 10. Implementation Notes for Next Phases

- `ExpedienteFullView.tsx` is the shell anchor for ficha + tabs attachment.
- `ExpedienteHeader.tsx` is the main refactor target and currently contains a compact top bar, inline status badges, references, and an action row that are all candidates for unification.
- `ResumenExpediente.tsx` currently repeats identity, status, and administrative references; later implementation must explicitly remove that duplication, not merely add a better top header.
- `FichaCirugia.tsx` remains the detailed surgery record/edit surface and must not be duplicated into the top ficha.
- `src/components/cirugias/CirugiaActionsCell.tsx` is a valid action-hierarchy reference for primary-vs-secondary action behavior.
- `src/components/cirugias/CircuitProgressCell.tsx` is only a visual compact-progress precedent; its current semantics are not the same as the approved six-state macro timeline and must not be copied 1:1 semantically.
- The design/apply phases must define the exact visual mapping from current prototype data to the six approved macro states without changing business rules.
