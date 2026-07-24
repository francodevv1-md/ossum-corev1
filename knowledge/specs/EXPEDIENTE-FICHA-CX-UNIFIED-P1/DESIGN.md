# Design — EXPEDIENTE-FICHA-CX-UNIFIED-P1

Status: designed  
Change: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact chain: EXPLORATION → PROPOSAL → SPEC → **DESIGN** → TASKS → APPLY  
Phase: UI-only surgery detail unification

---

## 1. Design Summary

This design converts the approved spec into an implementation-ready UI refactor centered on the active detail path `CirugiasPage -> ExpedienteFullView -> ExpedienteHeader`. The redesign keeps the existing expanded expediente shell and tab model, but replaces the current compact top header with one dominant unified **Ficha de CX** surface composed inside `ExpedienteHeader` and attached visually to the tab strip rendered by `ExpedienteFullView`.

The implementation remains presentational + display-mapping only. It does not change backend flows, store shape, business rules, schema, auth, tabs data model semantics, or workflow semantics. All display state is derived from the same inputs already threaded into `ExpedienteFullView` today: `surgery`, `docStatus`, `presupuestos`, `remitos`, `comprobantes`, `consumo`, `resumenCobranza`, `facturacionStatus`, `pendiente`, and existing action callbacks.

Recommended implementation shape:

- keep `ExpedienteFullView.tsx` as the shell owner;
- refactor `ExpedienteHeader.tsx` into a ficha orchestrator;
- add 3 small ficha subcomponents and 1 pure mapping helper;
- simplify `ResumenExpediente.tsx` so it stops reopening with duplicated identity/status/reference cards.

---

## 2. Component Tree — Before → After

### 2.1 Before (current)

```txt
CirugiasPage
  └─ ExpedienteFullView
       ├─ ExpedienteHeader
       │   ├─ top bar (back + ID + external link)
       │   ├─ info strip (patient / surgeon / institution / date)
       │   ├─ inline badges (CX / preparación / documentación / facturación)
       │   ├─ refs strip (PR / NR / FV / cobro)
       │   ├─ pendiente principal pill
       │   └─ compact action bar
       └─ Tabs
            ├─ attached only by adjacency, not by shared shell styling
            ├─ ResumenExpediente
            │   ├─ Datos principales      ← duplicates top identity
            │   ├─ Referencias admin      ← duplicates top refs
            │   ├─ Estado operativo       ← duplicates top statuses
            │   ├─ Pendiente principal    ← duplicates top blocker
            │   ├─ Comprobantes principales
            │   └─ Últimas novedades
            └─ other expediente tabs
```

### 2.2 After (this design)

```txt
CirugiasPage
  └─ ExpedienteFullView
       ├─ Unified ficha shell
       │   ├─ ExpedienteHeader
       │   │   ├─ FichaShellUtilityStrip        (new helper)
       │   │   ├─ FichaIdentityAnchor           (inline zone in header)
       │   │   ├─ ExpedienteMacroTimeline       (new helper)
       │   │   ├─ ExpedienteStatusChips         (new helper)
       │   │   ├─ SinAutorizacionAlert          (inline block in operational zone)
       │   │   ├─ FichaActionCluster            (inline zone in header)
       │   │   └─ ExpedienteReferencesStrip     (new helper)
       │   └─ Tabs strip visually attached to same shell edge
       └─ Tabs content
            ├─ ResumenExpediente
            │   ├─ highlighted legend / blocker detail
            │   ├─ comprobantes overview
            │   └─ latest notes / novedades
            ├─ FichaCirugia                    ← unchanged edit/detail surface
            └─ other expediente tabs           ← unchanged content ownership
```

### 2.3 Ownership boundary after refactor

- `ExpedienteFullView` owns shell composition, tab attachment, and callback threading.
- `ExpedienteHeader` owns top-ficha layout and orchestrates all top zones.
- `ResumenExpediente` becomes a de-duplicated digest, not a second header.
- `FichaCirugia` remains the full edit surface targeted by `Editar ficha`.

---

## 3. Exact Refactor / Insertion Points

## 3.1 `ExpedienteFullView.tsx`

### Current insertion point

- Header mount: lines 119-141
- Tabs shell starts: line 144
- Tabs border wrapper: lines 145-212

### Required change

Keep the file as the shell owner, but make the header + tab strip read as one continuous ficha shell.

Implementation direction:

1. Keep `ExpedienteHeader` above tab content.
2. Pass two new UI callbacks/props into `ExpedienteHeader`:
   - `onEditFicha: () => setExpTab("cirugia")`
   - `onGeneratePR: () => onOpenPresupuestoDialog(surgery)` (aliasing the existing action into the approved top label)
3. Pass one display-only timeline model prop or the raw timeline inputs, depending on final implementation choice:
   - preferred: `macroTimeline={buildMacroTimelineModel(...)} `
   - fallback: `surgery`, `consumo`, `docStatus`, `facturacionStatus`, `resumenCobranza`, `pendiente`
4. Change the wrapper classes around the tab strip so it visually attaches to the ficha:
   - remove the feeling of a separate border band;
   - keep minimal gap between ficha bottom and tabs top;
   - keep larger separation between tab strip and tab body.

### New shell composition target

```tsx
<div className="flex flex-col h-full bg-background">
  <div className="shrink-0 px-4 pt-4 sm:px-6">
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <ExpedienteHeader ... />
      <Tabs ...>
        <div className="border-t bg-background/80">...</div>
        ...tab content...
      </Tabs>
    </div>
  </div>
</div>
```

This keeps the current navigation model but makes the ficha + tabs one shell.

## 3.2 `ExpedienteHeader.tsx`

### Current refactor surface

- root shell: lines 60-61
- top utility row: lines 62-88
- info strip: lines 90-122
- action bar: lines 124-191

### Required transformation

Replace the current three compact strips with one five-zone ficha card body inside the same component file.

Recommended internal render order:

1. **Shell utility strip**
2. **Identity anchor zone**
3. **Operational zone**
4. **Action zone**
5. **References/admin zone**

### Exact insertion strategy

- keep the existing callbacks and action semantics;
- add `onEditFicha` prop and use it for the `Editar ficha` button;
- replace current inline `HeaderBadge`-only status treatment with grouped chip + timeline treatment;
- keep `HeaderBadge` or rename it to `StatusChip` and reuse the existing color maps;
- remove the dedicated compact `pendiente` strip from its current standalone line and re-home it inside the operational zone;
- replace the current multi-primary action row (`Ver PR`, `Remitir NR`, `Cargar consumo`, `Autorizar FV`) with the approved trio:
  - `Editar ficha`
  - `Generar PR`
  - `Más acciones`

### New internal zones inside `ExpedienteHeader`

#### Zone 1 — Shell utility strip

Keep the existing back button and optional external-link utility here. This zone must stay visually thin and must not hold operational chips.

#### Zone 2 — Identity anchor zone

Primary content:

- `ID CX` + optional `Expediente #`
- `Paciente`
- `DNI`
- `Médico`
- `Institución`
- `Cliente / financiador`
- `Fecha CX` + time

Secondary identity/admin band inside same zone:

- `Clasificación`
- `Coordinador`
- `Vendedor`
- `Instrumentador`
- `Urgente`

Recommended layout:

```txt
Row A:  ID CX / Exp. #    | Paciente + DNI | Fecha CX
Row B:  Médico            | Institución    | Cliente / financiador
Row C:  Clasificación | Coordinador | Vendedor | Instrumentador | Urgente
```

#### Zone 3 — Operational zone

This is the new center of the redesign.

Contains, in order:

1. compact macro timeline;
2. chip row for status families;
3. `Sin autorización` alert block when applicable;
4. top blocker / `pendiente principal` detail pill.

#### Zone 4 — Action zone

One horizontal action cluster only:

- `Editar ficha` → switches to `Cirugía` tab
- `Generar PR` → uses existing presupuesto dialog callback; if PR already exists, label adapts per §6.4 but stays inside the same slot
- `Más acciones` → groups everything else

#### Zone 5 — References/admin zone

Compact scan strip for:

- PR
- NR
- FV
- `Cobro` summary when present
- `Expediente #`
- `referenciasAdministrativas[]`

This zone stays secondary. No large card stack.

## 3.3 `ResumenExpediente.tsx`

### Current duplication surface

- `Datos principales`: lines 86-106
- `Referencias administrativas`: lines 116-133
- `Estado operativo`: lines 135-158
- `Pendiente principal`: lines 160-165

### Required simplification

Remove these sections from the opening payload of `Resumen`:

- full patient/doctor/institution identity grid;
- repeated urgency/classification/coordinator/admin identity;
- repeated admin references card;
- repeated top status card;
- repeated standalone pending card when the same blocker is already visible in the ficha.

Keep / reframe these sections:

- highlighted legend block;
- comprobantes overview (`PR`, `PE`, `NR`, `FV`, cobranza details);
- latest notes / novedades;
- optional short explanatory blocker text only when it adds more detail than the top ficha chip/alert.

### Exact structural target

`ResumenExpediente` should start with either:

1. highlighted legend / operational note, or
2. comprobantes overview,

but not with another full identity card.

## 3.4 `FichaCirugia.tsx`

No structural refactor required. The design only depends on it remaining the detailed surgery record/edit surface. `Editar ficha` must navigate into this tab, not duplicate its form into the top ficha.

---

## 4. Layout Zones Inside the Unified Top Ficha

## 4.1 Visual structure

The ficha is one unified bordered shell, not multiple disconnected cards.

Recommended desktop layout:

```txt
┌────────────────────────────────────────────────────────────────────┐
│ Zone 1 — Shell utility strip                                      │
│ [← Cirugías] [ID CX / Exp.#]                         [↗ optional] │
├────────────────────────────────────────────────────────────────────┤
│ Zone 2 — Identity anchor                                          │
│ Patient / DNI | Médico | Institución | Fecha CX                   │
│ Cliente/financiador | Clasificación | Coord. | Vend. | Instr.     │
│ Urgente marker                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Zone 3 — Operational                                              │
│ Macro timeline                                                    │
│ Estado CX | Preparación | Documentación | Facturación | ...       │
│ Sin autorización alert / Pendiente principal                      │
├────────────────────────────────────────────────────────────────────┤
│ Zone 4 — Actions                                                  │
│ [Editar ficha] [Generar PR / Ver PR] [Más acciones ▼]             │
├────────────────────────────────────────────────────────────────────┤
│ Zone 5 — References / admin                                       │
│ PR | NR | FV | Cobro | refs admin                                 │
├────────────────────────────────────────────────────────────────────┤
│ Attached Tabs                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## 4.2 Density rules

- patient identity must outrank all chips and references;
- the timeline must be compact, not dashboard-sized;
- references must sit at the lowest hierarchy weight;
- `Urgente` and `Sin autorización` must be noticeable without converting the shell into an alert page;
- long names wrap in identity rows, but `ID CX`, actions, and timeline stay stable.

---

## 5. Data Flow / Prop Threading

## 5.1 Current data already available

`ExpedienteFullView` already computes or receives all required top-ficha sources:

- `surgery`
- `docStatus`
- `presupuestoId`
- `remitoId`
- `fvNumber`
- `consumoState`
- `facturacionStatus`
- `cobrosTotal`
- `pendiente`
- action callbacks already used by `ExpedienteHeader`

This is enough for the redesign without new store reads.

## 5.2 Recommended top-ficha view model

Add one pure helper to convert raw inputs into display-ready groups.

Recommended file:

- `src/components/expediente/expediente-header.model.ts`

Recommended API:

```ts
interface ExpedienteHeaderModelInput {
  surgery: Surgery
  docStatus: string
  presupuestoId?: string
  remitoId?: string
  fvNumber?: string
  consumoState?: ConsumoState
  facturacionStatus: string
  cobrosTotal: number
  pendiente: PendientePrincipal
}

interface ExpedienteHeaderModel {
  identity: {...}
  chips: {...}
  references: {...}
  macroTimeline: MacroTimelineModel
  alerts: {
    sinAutorizacion: boolean
    pendiente: PendientePrincipal
    urgente: boolean
  }
}
```

This helper is display-mapping only. No writes. No rule mutation.

## 5.3 Prop threading after refactor

```txt
CirugiasPage
  └─ ExpedienteFullView
       ├─ computes: presupuestoId, remitoId, fvNumber, consumoState, cobrosTotal, pendiente
       ├─ computes: macro/display model (preferred)
       ├─ passes: onEditFicha = () => setExpTab("cirugia")
       └─ ExpedienteHeader
            ├─ identity props/model
            ├─ chips props/model
            ├─ references props/model
            ├─ macroTimeline props/model
            └─ action callbacks
```

## 5.4 Action threading

- `Editar ficha` must not open a new dialog; it must call `onEditFicha` and switch to `Cirugía`.
- `Generar PR` uses existing `onOpenPresupuestoDialog(surgery)`.
- `Más acciones` keeps existing callbacks now present in `ExpedienteHeader`.

No new action semantics are introduced.

---

## 6. Macro Timeline Design

## 6.1 Recommended component shape

New helper component:

- `src/components/expediente/ExpedienteMacroTimeline.tsx`

Interface:

```ts
type MacroTimelineKey =
  | "sin_autorizar"
  | "autorizado"
  | "pendiente"
  | "transito"
  | "realizada"
  | "finalizada"

interface MacroTimelineStage {
  key: MacroTimelineKey
  label: string
  done: boolean
  current: boolean
}
```

Render as a compact 6-step horizontal line using the same visual principle as `CircuitProgressCell.tsx` (dots + connectors), but not the same semantics and not the same stage keys.

## 6.2 Recommended mapping approach using current data sources

Use a pure helper, recommended file:

- `src/components/expediente/expediente-macro-timeline.ts`

### Mapping principle

1. **Primary source**: normalized `surgery.state`
2. **Secondary support signals**: `consumoState`, `docStatus`, `facturacionStatus`, `cobrosTotal`, `pendiente`
3. **Rule**: support signals may clarify ambiguous prototype states, but must not create new business states.

### Recommended precedence

```txt
1. If surgery.state maps explicitly to Finalizada -> active = finalizada
2. Else if surgery.state maps explicitly to Realizada -> active = realizada
3. Else if surgery.state or preparation/logistics cues imply hospital/transit execution -> active = transito
4. Else if surgery is authorized and has scheduled date context -> active = pendiente
5. Else if surgery is authorized but not yet in pending/transit -> active = autorizado
6. Else -> active = sin_autorizar
```

### Display-only clarification rules

- `consumoState` may help confirm `Realizada` when the explicit state is coarse.
- `docStatus === "Apta para facturar"` must **not** advance the macro timeline to a new stage; it remains subordinate.
- `facturacionStatus`, `fvNumber`, and `cobrosTotal` must stay in chips/references, not force macro `Finalizada` unless `surgery.state` already resolves there.
- `Suspendida` / `Cancelada` must not create extra timeline stages. The macro timeline stays at the nearest resolvable main stage, while the exact situation stays visible in `Estado CX` and/or `pendiente` alerting.

### Why this approach fits the spec

- preserves the approved six-state macro model;
- uses the current prototype data only;
- avoids reusing the document/circuit table logic 1:1;
- keeps detailed operational nuance in chips, not in the timeline.

## 6.3 Visual state rules

- completed stages: solid success/complete style
- current stage: highlighted primary style
- future stages: muted outline style
- stage labels: always the approved six labels in order
- no tooltips required for MVP design, but optional if layout needs compression

---

## 7. Macro States vs Substates Coexistence

## 7.1 Macro timeline ownership

The timeline answers only: **where is the case in the macro lifecycle?**

Allowed stages only:

1. `Sin autorizar`
2. `Autorizado`
3. `Pendiente`
4. `Tránsito`
5. `Realizada`
6. `Finalizada`

## 7.2 Substate ownership

Substates remain in chips:

- `Preparación` family: `Congelado`, `Sin congelar`, `En preparación`, `Enviado`, `Retirado`
- `Documentación` family
- `Facturación` family, including `Apta para facturar`
- `Consumo` family
- `Cobranza` family

## 7.3 Coexistence rule

The timeline never expands to explain substates. Instead:

- the timeline shows the macro position;
- the chip row shows the exact active family labels;
- the pending/alert block explains what is blocked or missing now.

Example:

```txt
Macro timeline: Realizada
Chips: Preparación = Retirado | Documentación = Apta para facturar | Facturación = Pendiente FV
```

This is valid and required. The chip layer carries nuance without polluting the macro timeline.

---

## 8. Action Cluster Design

## 8.1 Approved top cluster

Only three top entries:

- `Editar ficha`
- `Generar PR`
- `Más acciones`

## 8.2 Existing action migration from current header

Current top-level buttons to move under `Más acciones` unless they become the PR slot behavior:

- `Ver PR`
- `Remitir NR`
- `Cargar consumo`
- `Autorizar FV`
- `Agregar nota`
- `Ver documentación`
- `Cambiar estado`
- `Cambiar fecha`
- `Suspender`
- `Cancelar cirugía`
- `Recuperar`
- `Imprimir / Exportar`

## 8.3 PR slot behavior

Recommended slot behavior for the second button:

- if no PR exists: show `Generar PR`
- if PR exists: keep the same second slot but adapt to `Ver PR`

This keeps the approved action hierarchy while avoiding two separate PR buttons.

Fallback if product wants the label frozen: keep `Generar PR` label and send existing-PR cases into the presupuesto tab/dropdown logic via `Más acciones`. That is less clear, so the adaptive label is preferred.

---

## 9. References / Admin Zone Design

## 9.1 Compact content

Show as compact pills or small inline items:

- `PR {presupuestoId}`
- `NR {remitoId}`
- `FV {fvNumber}`
- `Cobro: {cobrosTotal}` when `> 0`
- `Exp. {surgery.expedienteNumber}` when present
- `referenciasAdministrativas[]`

## 9.2 Recommended helper component

New file:

- `src/components/expediente/ExpedienteReferencesStrip.tsx`

Purpose:

- centralize compact rendering rules for document/admin anchors;
- keep `ExpedienteHeader` smaller;
- avoid repeating ref chip markup inline.

---

## 10. What Is Removed from `Resumen` vs What Remains

## 10.1 Remove from `Resumen`

- `Datos principales` card in its current full-grid form
- repeated urgency badge row
- repeated coordinator/vendor/instrumentador display
- repeated `Referencias administrativas` card
- repeated `Estado operativo` card
- repeated `Pendiente principal` standalone card when it matches the top blocker reading

## 10.2 Keep in `Resumen`

- `Leyenda destacada`
- narrative operational context when it adds more than the top ficha
- `Comprobantes principales`
- expanded FV/cobranza breakdown
- `Últimas novedades`

## 10.3 Optional rename / microcopy

No rename required. The point is structural de-duplication, not tab renaming.

---

## 11. Tabs Grouping / Placement Strategy

## 11.1 Placement

- keep the tab strip directly below the ficha;
- keep almost no vertical gap between ficha bottom and tabs top;
- keep the larger whitespace below the active tab strip and above tab content;
- retain the current horizontal scroll buttons and overflow dropdown pattern.

## 11.2 Grouping strategy

Recommended minimal-scope approach: keep the current `EXPEDIENTE_TABS.slice(0, 7)` visible/overflow split, because it already matches the active shell and avoids cross-file tab-order churn.

Interpretation after redesign:

- visible strip = operator-primary tabs
- dropdown (`Más`) = support / traceability tabs

This keeps:

- `Resumen` as the default landing tab
- `Cirugía` unchanged and close to the front
- no new navigation model

## 11.3 Fallback adjustment if UX testing says documentation must be first-row

Swap `correo` out of the first seven and bring `documentacion` into the visible strip. This is optional, not required for the first implementation slice.

---

## 12. File-by-File Change Plan

## 12.1 Existing files to modify

### `src/components/expediente/ExpedienteFullView.tsx`

- attach ficha + tabs into one shell
- pass `onEditFicha`
- optionally compute/passthrough macro timeline view model
- keep tab content ownership unchanged

### `src/components/expediente/ExpedienteHeader.tsx`

- main redesign target
- refactor current compact strips into five ficha zones
- collapse action hierarchy to approved trio
- mount macro timeline, chips, alert, references helpers

### `src/components/expediente/ResumenExpediente.tsx`

- remove duplicated identity/status/reference opening cards
- keep digest-only blocks

## 12.2 New additive files (recommended)

### `src/components/expediente/ExpedienteMacroTimeline.tsx`

- pure presentational 6-stage macro timeline

### `src/components/expediente/ExpedienteStatusChips.tsx`

- pure presentational chip row using existing color maps/labels

### `src/components/expediente/ExpedienteReferencesStrip.tsx`

- pure presentational compact references/admin strip

### `src/components/expediente/expediente-header.model.ts`

- pure display-model builder for identity, chips, refs, alerts

### `src/components/expediente/expediente-macro-timeline.ts`

- pure macro-stage mapping helper

## 12.3 Files intentionally unchanged

- `src/app/cirugias/page.tsx` — no structural ownership change required beyond existing full-view usage
- `src/components/expediente/FichaCirugia.tsx` — edit surface remains canonical
- `src/components/cirugias/CircuitProgressCell.tsx` — visual precedent only
- `src/lib/circuit-progress.ts` — do not repurpose semantically for the expediente macro timeline

---

## 13. Implementation Sequencing / Slices

## Slice 1 — Shell + callback threading

- update `ExpedienteFullView` shell styling
- add `onEditFicha`
- attach tabs visually to ficha

Success check: layout shell works before status redesign lands.

## Slice 2 — Header structural refactor

- rebuild `ExpedienteHeader` into five zones
- move identity/admin payload into top ficha
- land references strip

Success check: the top shell is dominant even before final timeline styling.

## Slice 3 — Macro timeline + chip layer

- add pure macro mapping helper
- render `ExpedienteMacroTimeline`
- render chips row and `Sin autorización` treatment
- keep `pendiente` inside operational zone

Success check: macro/substate model is visible and spec-compliant.

## Slice 4 — Action consolidation

- reduce top actions to approved trio
- push secondary actions into `Más acciones`
- verify `Editar ficha` and PR flow

Success check: no second competing action bar remains.

## Slice 5 — Resumen de-duplication

- remove duplicated opening cards
- preserve digest content

Success check: `Resumen` no longer replays the top ficha.

## Slice 6 — Polish + validation

- spacing/hierarchy adjustments
- long-name wrapping checks
- unauthorized/urgent variants
- overflow tab attachment review

---

## 14. Validation / Test Strategy

## 14.1 Required validations

- TypeScript check — no new prop/type drift across `ExpedienteFullView` and `ExpedienteHeader`
- build check — expediente shell renders cleanly
- manual UI review in the active `CirugiasPage` expanded flow only

## 14.2 Scenario matrix for manual UI validation

Validate at least these cases:

1. **Unauthorized case**
   - `Sin autorización` alert visible
   - ficha still reads as normal shell

2. **Authorized with scheduled date**
   - macro stage resolves to `Pendiente`
   - date visible in identity zone

3. **Transit / preparation nuance**
   - macro stage stays `Tránsito`
   - preparation substate remains only in chip layer

4. **Realizada + apta para facturar**
   - macro stays `Realizada`
   - `Apta para facturar` appears only in subordinate chip/facturación reading

5. **Finalized / invoiced / cobrada mix**
   - references and cobranza show correctly
   - no fake timeline stage appears

6. **Missing optional identity fields**
   - layout remains stable with fallbacks

7. **Long names**
   - patient/institution wrap without pushing actions out of view

8. **PR exists vs no PR exists**
   - second action slot behavior is coherent

9. **Edit flow**
   - `Editar ficha` switches to `Cirugía` tab

10. **Resumen**
    - no repeated identity/status/admin opening card remains

## 14.3 Recommended component tests if implementation phase adds them

- macro timeline mapping helper unit tests
- header model builder unit tests
- interaction test for `Editar ficha` callback switching tab
- render test ensuring `Resumen` no longer contains the removed section titles if they are intentionally deleted

---

## 15. Risks and Fallback Decisions

## R1 — Macro mapping ambiguity

Some current prototype `surgery.state` labels may not map cleanly to the six macro stages.

Fallback:

- keep mapping precedence explicit in one pure helper;
- prefer conservative stage resolution;
- let chips carry ambiguous nuance instead of over-promoting the timeline.

## R2 — Header bloat

Bringing identity, chips, timeline, actions, and references together can create a dense wall.

Fallback:

- split hierarchy into five zones with clear separators;
- keep references visually smallest;
- wrap secondary identity/admin fields, not primary anchors.

## R3 — PR action wording conflict

The approved top action says `Generar PR`, but many cases already have a PR.

Fallback:

- preferred: same slot adapts to `Ver PR` when PR exists;
- fallback: keep fixed `Generar PR` label and route view behavior under `Más acciones`.

## R4 — Resumen de-duplication leaves too little at top of tab

If too much is removed, `Resumen` may feel empty.

Fallback:

- retain highlighted legend, blocker explanation, comprobantes, and notes as the digest core.

## R5 — Overusing existing circuit-progress semantics

`CircuitProgressCell` is a visual precedent, not the correct semantic model.

Fallback:

- copy only the compact dot/connector pattern;
- keep a separate expediente-specific stage helper and stage keys.

---

## 16. Design Decisions Locked for Apply Phase

- Active flow is `CirugiasPage -> ExpedienteFullView`; ignore the legacy standalone expediente page.
- `ExpedienteHeader` is the main refactor target.
- Macro timeline is six-stage only.
- `Preparación` substates and `Apta para facturar` stay subordinate.
- `Editar ficha` navigates to `Cirugía`, not to a new editor.
- `Resumen` must be explicitly reduced, not merely visually softened.
- This change remains UI-only and presentational-domain mapping only.
