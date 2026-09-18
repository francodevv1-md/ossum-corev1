# SPEC — EXPEDIENTE-FICHA-CX-V2

Status: spec  
Supersedes: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## 1. Overview

This spec defines the exact implementation contract for replacing the current ExpedienteHeader (5-zone card) + 14-tab fragmented layout with a unified **Ficha de CX** operative surface and a consolidated 7-tab structure (6 primary + overflow).

**Scope**: Desktop-first, ERP quirúrgico information-architecture and UI change only. No backend, auth, schema, store, business-rule, or workflow changes.

**Problem statement (carried from PROPOSAL)**: The P1 implementation added a better header block but left the fundamental problems unsolved — the ficha still feels like an additional card sitting above tabs, 14 tabs fragment operational scope, identity data appears in three places, and the tab strip is visually disconnected from the ficha.

---

## 2. Ficha Operativa Unificada — Layout Zones

The current `ExpedienteHeader.tsx` (242 lines, 5 zones: utility strip → identity → operational → action bar → references strip) is **rewritten** into a 4-zone operative surface with no utility strip.

### Zone A: Identity Row

Single-line, high visual weight. Left-anchored identity, right-anchored scheduling.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ID CX · Paciente · DNI        Fecha CX · Hora · Clasificación       │
└──────────────────────────────────────────────────────────────────────┘
```

**Left side (primary identity, left-anchored)**:
- `model.identity.idCx` — mono font, bold, blue-700, `text-lg`
- `model.identity.patient` — `text-xl font-semibold`, immediately after ID CX
- `model.identity.patientDni` — `text-sm text-muted-foreground`, "DNI" prefix, after patient name

**Right side (scheduling, right-anchored)**:
- `model.identity.dateLabel` — compact pill/badge with "Fecha CX" label
- Surgery time — if present, appended to date label (already joined by `buildExpedienteHeaderModel`)
- `model.identity.classification` — compact badge, after date

**Visual rules**:
- Single flex row, `items-center`, `justify-between`
- No card-like bordered containers around individual fields
- No mini-labels ("ID CX", "Paciente") as separate rows — the visual weight of the values themselves is the identity anchor
- Expediente number, if present, as a small inline pill after ID CX (preserved from current code)

### Zone B: Context Row

Compact descriptors and role pills. Immediately below Zone A.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Médico · Institución · Cliente/financiador   Coord. · Vend. · Inst. │
│                                               [URGENTE]             │
└──────────────────────────────────────────────────────────────────────┘
```

**Left side (context descriptors)**:
- `model.identity.surgeon` — with "Médico" micro-label
- `model.identity.institution` — with "Institución" micro-label
- `model.identity.clientFinanciador` — with "Cliente/financiador" micro-label
- Rendered as a row of compact bordered cards or inline label+value pairs (reuses the current 3-column `identityFields` pattern from ExpedienteHeader.tsx lines 57–61)

**Right side (role pills + alerts)**:
- Coordinador pill: `model.identity.coordinador`
- Vendedor pill: `model.identity.vendedor`
- Instrumentador pill: `model.identity.instrumentador`
- Urgente alert badge: only if `model.alerts.urgente === true` — red border, AlertOctagon icon (preserved from current code)

**Visual rules**:
- Role pills use the current `rounded-full border bg-background px-3 py-1.5` pattern (from ExpedienteHeader.tsx lines 127–136)
- Urgente badge uses current `border-red-200 bg-red-50 text-red-700` pattern (from ExpedienteHeader.tsx lines 137–142)
- Missing values show "—" in pills, never empty space

### Zone C: Circuit + States

The operative reading zone. Macro timeline, status chips, blocking alerts.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ○───●───●───○───○───○  (macro timeline 6 stages)                    │
│ [Estado CX] [Preparación] [Documentación] [Facturación] [Consumo]   │
│ [⚠ Sin autorización]  [Pendiente principal: ...]                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Elements (top to bottom within the zone)**:
1. `ExpedienteMacroTimeline` — `model.macroTimeline`, 6 stages (unchanged component, possibly tighter spacing)
2. `ExpedienteStatusChips` — `model.chips` (unchanged component)
3. Sin autorización alert — conditional, only if `model.alerts.sinAutorizacion === true`. Uses current `border-amber-300 bg-amber-50` pattern (from ExpedienteHeader.tsx lines 150–155)
4. Pendiente principal — `model.alerts.pendiente`, always visible. Uses current rounded-lg border pattern (from ExpedienteHeader.tsx lines 157–160)

**Visual rules**:
- Zone C sits inside a subtle container: `rounded-xl border bg-muted/20 px-4 py-4` (preserved from current code line 146)
- Alerts are inside the same container, not in a separate section
- Timeline + chips + alerts read as one operative block

### Zone D: References + Actions

Single row, border-top separator from Zone C.

```
┌──────────────────────────────────────────────────────────────────────┐
│ PR-xxx · NR-xxx · FV-xxx · Exp#xxx   [Editar ficha] [PR] [Más ▼]  │
└──────────────────────────────────────────────────────────────────────┘
```

**Left side (references strip)**:
- `ExpedienteReferencesStrip` — `model.references` (unchanged component)

**Right side (action trio)**:
- Editar ficha button — `onEditFicha` callback
- PR slot — conditional: "Ver PR" if `hasPR`, "Generar PR" if not (preserved from current code lines 168–176)
- Más acciones dropdown — `DropdownMenu` with all secondary actions (preserved from current code lines 177–234)

**Visual rules**:
- `border-t` separator above the row
- `flex items-center justify-between` layout
- Actions right-aligned, references left-aligned
- Compact: `py-3 px-4 sm:px-6` padding (preserved from current code)

### What is REMOVED from the current header

The current `ExpedienteHeader.tsx` has a **utility strip** (lines 72–94) containing:
- Back button ("Cirugías" with ArrowLeft)
- "FICHA DE CX" label
- "Open in new tab" button

This zone is **removed entirely** from the ficha. Meta-navigation (back button, external link) belongs to:
- The page shell (`ExpedienteFullView`) or the tab strip area — not the ficha operative surface
- If a back button is needed, it is placed above the ficha as part of the page-level navigation, not inside the ficha

---

## 3. Tab Consolidation — 14 → 7

### 3.1 Current tab structure (to be replaced)

Current `EXPEDIENTE_TABS` in `cirugias.constants.ts` (14 tabs):
1. resumen, 2. cirugia, 3. presupuesto, 4. remitos, 5. consumo, 6. comprobantes, 7. correo, 8. documentacion, 9. logistica, 10. transito, 11. instrumentador, 12. notas, 13. historial, 14. trazabilidad

Split in `ExpedienteFullView.tsx`: PRIMARY_TABS = first 7, MORE_TABS = rest.

### 3.2 New tab structure

| # | New Tab | Key | Absorbs | Content | Panel Component |
|---|---------|-----|---------|---------|-----------------|
| 1 | Ficha | `ficha` | resumen + cirugia + notas | Editable surgery details (compact mode), leyenda destacada, comprobantes overview, últimas novedades, notes, references. NO identity duplication. | `FichaTabContent` (new) |
| 2 | Comercial | `comercial` | presupuesto + comprobantes | PR, remitos, facturas, comprobantes, amounts, due dates, commercial status, cobranza detail | `ComercialTabContent` (new, combines `PresupuestoPanel` + `ComprobantesAsociados` + `RemitosPanel`) |
| 3 | Consumo | `consumo` | consumo (standalone) | Consumption, differences, used/returned material, validation | `ConsumoPanel` (existing, re-keyed, minimal changes) |
| 4 | Doc. y trazab. | `documentacion` | documentacion + trazabilidad | Document checklist, attachments, signed remitos, lot/serial, implant traceability | `DocumentacionTrazabilidadTab` (new, combines `DocumentacionPanel` + `TrazabilidadPanel`) |
| 5 | Logística | `logistica` | logistica + transito | Departure, transport, logistics/shipment dates, box status, movements, material in transit | `LogisticaTabContent` (new, combines `LogisticaPanel` + `MaterialTransitoPanel`) |
| 6 | Correo | `correo` | correo (standalone) | Emails, WhatsApp, communications | `ExpedienteCorreoTab` (existing, re-keyed, no changes) |
| 7 | Más (overflow) | — | instrumentador + historial | Secondary/infrequent info accessed via dropdown | Individual panels (`InstrumentadorPanel`, `HistorialPanel`) via dropdown |

### 3.3 New EXPEDIENTE_TABS constant

Replace the current 14-tab `EXPEDIENTE_TABS` and `COMPACT_TABS` with:

```ts
export const EXPEDIENTE_TABS = [
  { value: "ficha", label: "Ficha", icon: FileText },
  { value: "comercial", label: "Comercial", icon: Receipt },
  { value: "consumo", label: "Consumo", icon: Activity },
  { value: "documentacion", label: "Doc. y trazab.", icon: BookOpen },
  { value: "logistica", label: "Logística", icon: MapPin },
  { value: "correo", label: "Correo", icon: Mail },
] as const

export const EXPEDIENTE_MORE_TABS = [
  { value: "instrumentador", label: "Instrumentador", icon: Stethoscope },
  { value: "historial", label: "Historial", icon: History },
] as const
```

**Icon imports to update**: Remove unused icons (`Scissors`, `Truck`, `Link2`, `ArrowRightLeft`, `StickyNote`, `Search`) from the import block. Add no new icons — all needed icons (`FileText`, `Receipt`, `Activity`, `BookOpen`, `MapPin`, `Mail`, `Stethoscope`, `History`) are already imported.

**COMPACT_TABS**: Remove entirely. With only 6 primary tabs, a compact variant is unnecessary — all 6 fit comfortably in the tab strip. If `COMPACT_TABS` is referenced elsewhere, replace those references with `EXPEDIENTE_TABS`.

### 3.4 Rationale for each consolidation

- **Ficha** absorbs Resumen + Cirugía + Notas: the surgery record IS the case; leyenda and novedades belong with the case record; notes are case-level; Resumen was a catch-all for things without a home.
- **Comercial** absorbs Presupuesto + Comprobantes + Remitos: they share a single commercial lifecycle (quote → remito → invoice → payment); operators think in commercial flow, not document-type silos. Remitos are included because they are commercial delivery instruments tied to the PR/NR lifecycle.
- **Consumo** stays standalone: consumption is a distinct operational act with its own validation rules and material flow; merging it would dilute its focused workflow.
- **Doc. y trazabilidad** absorbs Documentación + Trazabilidad: both are about document and implant evidence; traceability without documentation context is incomplete; signed remitos bridge both.
- **Logística** absorbs Logística + Tránsito: departure, transport, material movement, and box status are one logistics chain; separating them creates artificial navigation.
- **Correo** stays standalone: communication is orthogonal to the surgery record and commercial/logistics flow; it has its own interaction patterns.
- **Más** overflow keeps instrumentador and historial accessible without cluttering the primary strip.

---

## 4. Ficha Tab Content (replaces Resumen + Cirugía + Notas)

### 4.1 Structure

The `FichaTabContent` component renders the following sections in order:

```
┌─ FichaTabContent ──────────────────────────────────────────────────┐
│ 1. Leyenda destacada callout (if applicable)                       │
│ 2. Comprobantes overview (from old ResumenExpediente)              │
│ 3. FichaCirugia (compact mode)                                     │
│ 4. Notas sub-section (from NotasPanel)                             │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 FichaCirugia compact mode

A new `compact` prop is added to `FichaCirugia`:

```ts
interface FichaCirugiaProps {
  surgery: Surgery
  compact?: boolean  // NEW — defaults to false for backward compat
}
```

When `compact={true}`:
- **Skip these field groups entirely** (already visible in ficha top):
  - "Identificación" group (ID CX, Nº expediente, PR Nº, Clasificación)
  - "Paciente" group (Paciente, DNI, Obra social, Cliente/Financiador)
  - "Médico / Institución" group (Médico, Institución, Ciudad, Provincia, Localidad)
- **Start rendering from** "Programación" group (Fecha cirugía, Hora, Fecha probable, Fecha envío material)
- **Render normally** all subsequent groups: Gestión, Destino y Facturación, Observaciones, Referencias administrativas
- In edit mode, the skipped groups are still excluded — the user edits identity fields via the ficha top "Editar ficha" action, not through the Ficha tab form
- The "Ficha de Cirugía" header bar (with Edit/Ver historial buttons) is removed in compact mode — the tab header serves that role

When `compact={false}` (default):
- Render all groups as today — no behavior change. This preserves backward compatibility if FichaCirugia is used elsewhere.

### 4.3 Content from ResumenExpediente

The following content is redistributed from the eliminated ResumenExpediente:

| Resumen content | New location | Rendering |
|-----------------|-------------|-----------|
| Leyenda destacada callout | Top of Ficha tab | Identical to current rendering (amber callout box). Only shown if `surgery.leyendaDestacada && surgery.leyenda`. |
| Comprobantes principales (PR/PE/NR/FV cards) | Below leyenda, above FichaCirugia | Extract the `NeutralCard` + comprobantes rendering from ResumenExpediente into a reusable `ComprobantesOverview` sub-component. Render in Ficha tab as an overview. |
| Últimas novedades (last 3 notes) | Below FichaCirugia, as "Novedades recientes" sub-section | Render the last 3 notes inline. "Ver todas" link scrolls to or expands the full Notas sub-section. |

### 4.4 NotasPanel integration

The `NotasPanel` content is included as a sub-section at the bottom of the Ficha tab:

- Section header: "Notas" with "Agregar nota" button
- Full note list (not just last 3 — the "últimas novedades" above is a preview)
- The `onAddNote` callback from `NotasPanel` is wired through `FichaTabContent`

### 4.5 Edit mode flow

- Ficha tab defaults to **read mode**
- "Editar ficha" button in Zone D triggers `onEditFicha` → sets tab to `ficha` AND switches FichaCirugia to edit mode
- The edit toggle is managed by FichaCirugia's internal `editing` state (already exists)
- When editing is active, the leyenda callout and comprobantes overview sections remain visible (they are above/below FichaCirugia, not inside it)
- Save/Cancel buttons remain inside FichaCirugia's edit form (existing pattern)

---

## 5. Comercial Tab Content

### 5.1 Internal structure

The `ComercialTabContent` combines `PresupuestoPanel` + `RemitosPanel` + `ComprobantesAsociados` into a single tab with sub-sections:

```
┌─ ComercialTabContent ─────────────────────────────────────────────┐
│ 1. Presupuesto section (PresupuestoPanel content)                  │
│ 2. Remitos section (RemitosPanel content)                          │
│ 3. Comprobantes section (ComprobantesAsociados content)            │
│    - Includes FV cobranza detail                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Sub-section navigation

- Each sub-section has a section header with the original panel title
- Sub-sections are separated by `<Separator />`
- No internal tabs or accordion — vertical scroll with clear section headers
- If the Comercial tab risks becoming too long (Risk R2 from PROPOSAL), consider adding a sticky sub-nav at the top of the tab content that jumps to each section — but this is optional and can be added post-V2 if needed

### 5.3 Props passthrough

`ComercialTabContent` receives the union of props from `PresupuestoPanel`, `RemitosPanel`, and `ComprobantesAsociados`:

```ts
interface ComercialTabContentProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  comprobantes: Comprobante[]
  remitos: Remito[]
  box?: Box
  resumenCobranza: ResumenCobranzaSurgery
  onOpenPresupuestoDialog: (s: Surgery) => void
}
```

Each sub-component receives only its required props.

---

## 6. Documentación y Trazabilidad Tab Content

### 6.1 Internal structure

```
┌─ DocumentacionTrazabilidadTab ────────────────────────────────────┐
│ 1. Documentación section (DocumentacionPanel content)               │
│ 2. Trazabilidad section (TrazabilidadPanel content)                 │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 Props

```ts
interface DocumentacionTrazabilidadTabProps {
  surgery: Surgery
  docChecklist?: SurgeryDocumentChecklist
  docStatus: string
  remitos: Remito[]
  consumo?: Consumo
  box?: Box
}
```

Sub-sections separated by `<Separator />`. No internal tabs.

---

## 7. Logística Tab Content

### 7.1 Internal structure

```
┌─ LogisticaTabContent ─────────────────────────────────────────────┐
│ 1. Logística section (LogisticaPanel content)                       │
│ 2. Material en tránsito section (MaterialTransitoPanel content)     │
└────────────────────────────────────────────────────────────────────┘
```

### 7.2 Props

```ts
interface LogisticaTabContentProps {
  surgery: Surgery
  logistics?: LogisticsDetail
  box?: Box
  materialTransito: MaterialTransito[]
}
```

Sub-sections separated by `<Separator />`. No internal tabs.

---

## 8. Visual Anchoring — Ficha + Tabs as One Unit

### 8.1 Structure

The ficha top + tab strip + tab content must render as ONE visual unit, not a header card with a separate tab bar floating below:

```
┌─ Ficha de CX (unified operative surface) ──────────────────────────┐
│  Zone A: Identity row                                                │
│  Zone B: Context row                                                 │
│  Zone C: Circuit + States                                            │
│  Zone D: References + Actions                                        │
├──────────────────────────────────────────────────────────────────────┤
│ [Ficha] [Comercial] [Consumo] [Doc. y trazab.] [Logística] [Correo] │
│                                                      [Más ▼]        │
├──────────────────────────────────────────────────────────────────────┤
│ Tab content (full width, scrollable)                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.2 Implementation in ExpedienteFullView

The current structure in `ExpedienteFullView.tsx` is:

```tsx
<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
  <ExpedienteHeader ... />          {/* Card-like header */}
  <Tabs ...>                        {/* Separate tab strip */}
    <div className="shrink-0 border-t bg-background/80 ...">
      <TabsList ... />
    </div>
    <div className="flex-1 overflow-y-auto ...">
      <TabsContent ... />
    </div>
  </Tabs>
</div>
```

The new structure keeps the same outer shell but removes the visual gap between header and tabs:

```tsx
<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
  {/* Ficha operative surface (Zones A-D) — no separate card, part of the shell */}
  <ExpedienteHeader ... />

  {/* Tab strip — NO gap, NO border-t that creates visual separation */}
  <Tabs ...>
    <div className="shrink-0 border-t bg-card px-2 sm:px-4 flex items-center gap-0">
      <TabsList ... />
    </div>
    <div className="flex-1 overflow-y-auto bg-background/40">
      <TabsContent ... />
    </div>
  </Tabs>
</div>
```

**Key visual changes**:
- Tab strip background: `bg-card` (matches ficha surface) instead of `bg-background/80` (which creates a color break)
- No margin or gap between `ExpedienteHeader` bottom and `Tabs` top
- The `border-t` between ficha and tab strip is kept as a subtle separator (it is part of the unified surface, not a wall)
- The entire rounded-xl border shell encompasses ficha + tabs + content as one unit

### 8.3 Active tab indicator

The active tab must have a clear visual indicator that ties it to the ficha surface:
- `border-b-2 border-primary` on the active tab trigger (already in current code, line 174)
- `data-[state=active]:bg-transparent` to avoid a contrasting background that detaches from the ficha (already in current code)
- No additional changes needed — the existing indicator style is sufficient when the tab strip shares the ficha's background

---

## 9. Zero Duplication Rules

### 9.1 Identity fields

| Field | Ficha top (Zone A/B) | Ficha tab | Comercial tab | Other tabs |
|-------|---------------------|-----------|---------------|------------|
| ID CX | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Paciente | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| DNI | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Médico | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Institución | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Cliente/financiador | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Fecha CX | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Hora | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Clasificación | ✅ Scan view | ❌ Hidden in compact mode | ❌ | ❌ |
| Coordinador | ✅ Pill | ❌ Hidden in compact mode | ❌ | ❌ |
| Vendedor | ✅ Pill | ❌ Hidden in compact mode | ❌ | ❌ |
| Instrumentador | ✅ Pill | ❌ Hidden in compact mode | ✅ (overflow) | ❌ |
| Urgente | ✅ Badge | ❌ Hidden in compact mode | ❌ | ❌ |

**Rule**: Ficha top = scan view (always visible, not editable inline). Ficha tab = detail/edit view (compact mode hides identity, full mode shows all). Other tabs never repeat identity.

### 9.2 Status and states

| Element | Ficha top (Zone C) | Tabs |
|---------|---------------------|------|
| Macro timeline (6 stages) | ✅ Only here | ❌ |
| Status chips (Estado CX, Preparación, etc.) | ✅ Only here | ❌ |
| Sin autorización alert | ✅ Only here | ❌ |
| Pendiente principal | ✅ Only here | ❌ |

**Rule**: Status chips appear in the ficha top only. No tab may render an identical chip row or timeline.

### 9.3 References

| Element | Ficha top (Zone D) | Ficha tab |
|---------|---------------------|-----------|
| References strip (PR, NR, FV, Exp#, admin refs) | ✅ Compact strip | ✅ Full list with edit (ReferenciasAdministrativasEditor in FichaCirugia edit mode) |

**Rule**: Ficha top = compact scan (read-only pills). Ficha tab = full detail with edit capability. These are different renderings of the same data, not duplication.

### 9.4 Comprobantes

| Element | Ficha tab | Comercial tab |
|---------|-----------|---------------|
| Comprobantes overview (PR/PE/NR/FV cards) | ✅ Overview (from old Resumen) | ❌ No overview — starts with full detail |
| Full comprobante detail + actions | ❌ | ✅ Full detail with amounts, due dates, cobranza |

**Rule**: Ficha tab shows a read-only overview (what the case has). Comercial tab shows full detail with actions (what the operator can do).

### 9.5 Enforcement

These rules are enforced by component structure, not by developer discipline:
- FichaCirugia `compact` prop physically skips identity groups
- `FichaTabContent` does not import or render `ExpedienteStatusChips`, `ExpedienteMacroTimeline`, or `ExpedienteReferencesStrip`
- `ComercialTabContent` does not render comprobantes overview cards (those live only in `FichaTabContent`)
- No tab content panel may import `ExpedienteHeaderModel` — only `ExpedienteHeader` reads from the model

---

## 10. Component Changes Summary

| Component | Action | Detail |
|-----------|--------|--------|
| `ExpedienteHeader.tsx` | **REWRITE** | New 4-zone ficha (A–D). Remove utility strip zone (lines 72–94 of current file). Restructure identity row to single-line. Merge references strip into Zone D with actions. |
| `ExpedienteFullView.tsx` | **MODIFY** | Update tab rendering: remove `resumen`/`cirugia`/`presupuesto`/`remitos`/`comprobantes`/`transito`/`notas`/`trazabilidad` TabsContent entries. Add `ficha`/`comercial`/`documentacion`/`logistica` routing. Change tab split to use `EXPEDIENTE_TABS` (6 primary) + `EXPEDIENTE_MORE_TABS` (2 overflow). Update `onEditFicha` to route to `ficha` tab. Change tab strip background to `bg-card`. |
| `FichaCirugia.tsx` | **MODIFY** | Add `compact?: boolean` prop. When `compact={true}`: skip "Identificación", "Paciente", "Médico/Institución" field groups; remove header bar with Edit/Ver historial buttons (the tab shell provides navigation). Default `compact={false}` preserves current behavior. |
| `ResumenExpediente.tsx` | **REMOVE from tab routing** | No longer rendered as a standalone tab. Its content is redistributed: leyenda destacada → `FichaTabContent`, comprobantes overview → `FichaTabContent` (as `ComprobantesOverview`), últimas novedades → `FichaTabContent`. The component file may be kept for the `FVCard` and `ComprobantesOverview` sub-components extracted from it, or the content may be inlined into `FichaTabContent`. |
| `FichaTabContent.tsx` | **NEW** | Container component. Renders: (1) Leyenda destacada callout, (2) Comprobantes overview, (3) FichaCirugia with `compact={true}`, (4) Notas sub-section. Receives all needed props (surgery, presupuestos, comprobantes, remitos, notes, etc.). |
| `ComercialTabContent.tsx` | **NEW** | Combines PresupuestoPanel + RemitosPanel + ComprobantesAsociados as sub-sections. Each sub-section renders its existing panel component with a section header. |
| `DocumentacionTrazabilidadTab.tsx` | **NEW** | Combines DocumentacionPanel + TrazabilidadPanel as sub-sections. |
| `LogisticaTabContent.tsx` | **NEW** | Combines LogisticaPanel + MaterialTransitoPanel as sub-sections. |
| `cirugias.constants.ts` | **MODIFY** | Replace `EXPEDIENTE_TABS` (14 entries) with new 6-entry version. Replace `COMPACT_TABS` (9 entries) with removal — delete the constant and update any references to use `EXPEDIENTE_TABS`. Add `EXPEDIENTE_MORE_TABS` (2 entries). Remove unused icon imports. |
| `expediente-header.model.ts` | **NO CHANGE** | Already provides all data needed for the 4-zone ficha. The `identity`, `chips`, `references`, `macroTimeline`, `alerts` structures map directly to Zones A–D. |
| `expediente-macro-timeline.ts` | **NO CHANGE** | 6 stages confirmed. `resolveMacroTimelineKey()` and `buildMacroTimelineModel()` unchanged. |
| `ExpedienteMacroTimeline.tsx` | **MINOR** | Possibly adjust `gap` or `px` values for tighter integration with Zone C. No structural changes. |
| `ExpedienteStatusChips.tsx` | **NO CHANGE** | Already working. |
| `ExpedienteReferencesStrip.tsx` | **NO CHANGE** | Already working. |
| `ConsumoPanel.tsx` | **NO CHANGE** | Stays as-is. Just re-keyed under `consumo` tab (same key). |
| `ExpedienteCorreoTab.tsx` | **NO CHANGE** | Stays as-is. Just re-keyed under `correo` tab (same key). |
| `InstrumentadorPanel.tsx` | **NO CHANGE** | Moves to overflow dropdown. Content unchanged. |
| `HistorialPanel.tsx` | **NO CHANGE** | Moves to overflow dropdown. Content unchanged. |
| Preview components (`ExpedientePreview*.tsx`) | **NO CHANGE THIS PR** | Out of scope. Legacy cleanup is a separate task. |

---

## 11. Detailed Implementation Notes

### 11.1 ExpedienteHeader rewrite

The rewritten component maintains the same props interface (no API contract change for consumers). The internal structure changes:

**Current structure (5 zones)**:
1. Utility strip (back button + label + external link)
2. Identity block (ID CX, Patient, DNI, identityFields cards, secondary pills)
3. Operational zone (timeline + chips + alerts inside `bg-muted/20` container)
4. Action bar (Editar ficha, PR slot, Más acciones)
5. References strip (separate `bg-muted/10` row)

**New structure (4 zones)**:
1. Zone A: Identity row — single flex line, `items-center justify-between`, no micro-labels for ID/patient/DNI (visual weight is the label)
2. Zone B: Context row — 3-column context descriptors (left) + role pills + urgente badge (right)
3. Zone C: Circuit + States — timeline + chips + alerts inside `bg-muted/20` container (preserved from current)
4. Zone D: References + Actions — single row with `border-t`, references left, action trio right

**Removed**: Utility strip zone entirely. The back button and "FICHA DE CX" label move to the page shell or are handled by the browser back button / breadcrumb.

### 11.2 FichaCirugia compact mode implementation

Add the `compact` prop to the interface. Inside the render, wrap the three identity-related FieldGroups in a conditional:

```tsx
{!compact && (
  <>
    <FieldGroup title="Identificación">...</FieldGroup>
    <FieldGroup title="Paciente">...</FieldGroup>
    <FieldGroup title="Médico / Institución">...</FieldGroup>
  </>
)}
```

Also in compact mode, remove the header bar with "Ficha de Cirugía" title + Edit/Ver historial buttons:

```tsx
{!compact && (
  <div className="flex items-center justify-between">
    {/* Header bar */}
  </div>
)}
```

In compact mode, the Edit/Save/Cancel controls are still rendered (they are part of the form, not the header), but they appear more subtly — perhaps as a floating action bar or inline at the top of the form section.

### 11.3 Tab content routing in ExpedienteFullView

Replace the current 14 `TabsContent` blocks with 8 (6 primary + 2 overflow):

```tsx
<TabsContent value="ficha" className="mt-0">
  <FichaTabContent surgery={surgery} presupuestos={presupuestos} ... />
</TabsContent>

<TabsContent value="comercial" className="mt-0">
  <ComercialTabContent surgery={surgery} presupuestos={presupuestos} ... />
</TabsContent>

<TabsContent value="consumo" className="mt-0">
  <ConsumoPanel surgery={surgery} consumo={consumo} ... />
</TabsContent>

<TabsContent value="documentacion" className="mt-0">
  <DocumentacionTrazabilidadTab surgery={surgery} ... />
</TabsContent>

<TabsContent value="logistica" className="mt-0">
  <LogisticaTabContent surgery={surgery} ... />
</TabsContent>

<TabsContent value="correo" className="mt-0">
  <ExpedienteCorreoTab surgery={surgery} />
</TabsContent>

{/* Overflow tabs */}
<TabsContent value="instrumentador" className="mt-0">
  <InstrumentadorPanel surgery={surgery} instrumentadorSurgery={instrumentadorSurgery} />
</TabsContent>

<TabsContent value="historial" className="mt-0">
  <HistorialPanel surgery={surgery} history={history} />
</TabsContent>
```

### 11.4 Default tab

When `expTab` is unset or references a removed tab key (`resumen`, `cirugia`, `presupuesto`, `remitos`, `comprobantes`, `transito`, `notas`, `trazabilidad`), default to `ficha`.

This can be handled in the parent component or with a `useEffect` in `ExpedienteFullView`:

```ts
useEffect(() => {
  const validTabs = [...EXPEDIENTE_TABS, ...EXPEDIENTE_MORE_TABS].map(t => t.value)
  if (!validTabs.includes(expTab)) {
    setExpTab("ficha")
  }
}, [expTab])
```

### 11.5 onEditFicha routing

Current behavior: `onEditFicha` routes to `"cirugia"` tab (line 139 of ExpedienteFullView).

New behavior: `onEditFicha` routes to `"ficha"` tab AND passes a signal to FichaCirugia to enter edit mode.

Implementation options:
- Option A: `onEditFicha` calls `setExpTab("ficha")` and FichaCirugia manages its own edit state internally (current pattern). The user clicks "Editar ficha" in Zone D, the Ficha tab opens, and then clicks "Editar" inside FichaCirugia.
- Option B: `onEditFicha` calls `setExpTab("ficha")` and also sets a shared state (`editingFicha: boolean`) that FichaCirugia reads to auto-enter edit mode.

**Chosen**: Option A — simpler, no new shared state. The "Editar ficha" button in Zone D switches to the Ficha tab; the user then clicks "Editar" inside FichaCirugia to enter edit mode. This is one click more but avoids prop drilling a mode signal.

---

## 12. Acceptance Criteria

### Ficha operative surface

- [ ] Ficha top renders as a single operative surface within one rounded shell — not a card-like block
- [ ] Zone A: Identity row is a single flex line with ID CX + Paciente + DNI (left) and Fecha CX + Hora + Clasificación (right)
- [ ] Zone B: Context row shows Médico/Institución/Cliente (left) + Coordinador/Vendedor/Instrumentador pills + Urgente badge (right)
- [ ] Zone C: Macro timeline shows 6 stages, status chips render below timeline, sin autorización alert and pendiente principal render below chips
- [ ] Zone D: References strip (left) + action trio (right) in a single row with border-top separator
- [ ] No utility strip with back button or "FICHA DE CX" label inside the ficha

### Tab consolidation

- [ ] 6 primary tabs are visible: Ficha, Comercial, Consumo, Doc. y trazab., Logística, Correo
- [ ] Overflow dropdown ("Más") contains: Instrumentador, Historial
- [ ] Total visible navigation items: 7 (6 tabs + Más dropdown)
- [ ] Resumen tab no longer exists
- [ ] Cirugía tab no longer exists as a separate tab
- [ ] All existing tab content is preserved and accessible via the new tabs (no content loss)
- [ ] Default landing tab is "Ficha" (replacing Resumen)

### Zero duplication

- [ ] No identity field duplication between ficha top and Ficha tab (FichaCirugia compact mode skips Identificación, Paciente, Médico/Institución groups)
- [ ] No status chip duplication between ficha top and any tab
- [ ] No timeline duplication between ficha top and any tab
- [ ] References in ficha top (compact strip) are a different rendering than references in Ficha tab (full list with edit)
- [ ] Comprobantes in Ficha tab = overview only; Comercial tab = full detail with actions

### Visual anchoring

- [ ] No visual gap between ficha bottom and tab strip
- [ ] Tab strip background matches ficha surface (`bg-card`), not a contrasting color
- [ ] Active tab indicator ties to the ficha (bottom border, same background)
- [ ] Ficha + tab strip + tab content render inside one rounded border shell

### Technical

- [ ] `EXPEDIENTE_TABS` constant replaced with 6-entry version
- [ ] `EXPEDIENTE_MORE_TABS` constant added with 2 entries
- [ ] `COMPACT_TABS` constant removed (or updated to match)
- [ ] `FichaCirugia` accepts `compact` prop without breaking existing usage
- [ ] No backend/store/auth changes
- [ ] TypeScript compiles without errors
- [ ] No new dependencies installed

---

## 13. Risks (carried from PROPOSAL, with mitigations)

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Tab consolidation breaks muscle memory | Ficha tab is default landing (same position as Resumen was). Comercial is second tab. Most frequent operations in first 3 tabs. Overflow items remain accessible. |
| R2 | Comercial tab becomes too wide | Sub-section headers with `<Separator />` provide visual breaks. Sticky sub-nav is optional post-V2. |
| R3 | FichaCirugia merge creates edit-mode confusion | Ficha tab defaults to read mode. Editar ficha in Zone D switches to Ficha tab. User clicks Edit inside FichaCirugia. Same UX pattern as current "Cirugía" tab, just inside a different tab. |
| R4 | Resumen content redistribution loses discoverability | Ficha tab is new default landing. Leyenda destacada is first element in Ficha tab. Comprobantes overview is second element. Both are immediately visible on landing. |
| R5 | Header bloat (inherited from P1) | 4-zone structure with strict visual hierarchy. Identity first, timeline/states second, actions third, refs fourth. No decorative spacing. Compact and operative. |
| R6 | EXPEDIENTE_TABS restructure affects shared constants | Only restructure the tab arrays. Do not touch guardrails, state maps, color maps, or column definitions. Verify no other files import `COMPACT_TABS`. |

---

## 14. Out of Scope

- Preview components cleanup (`ExpedientePreview*.tsx`)
- Backend, store, auth, schema, migration, service, validator, permission, or audit changes
- New business rules or workflow stages
- Mobile responsive redesign (desktop-first; smaller breakpoints may degrade gracefully)
- KPIs or analytics
- FichaCirugia store migration (stays Zustand for now)
- Treating Preparación substates or Apta para facturar as top-level timeline stages
- Changes to `src/lib/businessRules.ts`
- Changes to `src/lib/cirugias.utils.ts` guardrails beyond tab restructure
- Changes to `expediente-header.model.ts` or `expediente-macro-timeline.ts`
- New dependencies or package installations
- Any return to a lateral preview or split master/detail layout

---

## 15. Migration Path

### Step 1: Update constants

1. Replace `EXPEDIENTE_TABS` in `cirugias.constants.ts`
2. Add `EXPEDIENTE_MORE_TABS`
3. Remove or update `COMPACT_TABS`
4. Remove unused icon imports

### Step 2: Create new tab content components

1. Create `FichaTabContent.tsx`
2. Create `ComercialTabContent.tsx`
3. Create `DocumentacionTrazabilidadTab.tsx`
4. Create `LogisticaTabContent.tsx`

### Step 3: Modify FichaCirugia

1. Add `compact?: boolean` prop
2. Conditionally skip identity groups when `compact={true}`
3. Conditionally hide header bar when `compact={true}`

### Step 4: Rewrite ExpedienteHeader

1. Remove utility strip zone
2. Restructure to 4-zone layout (A–D)
3. Merge references strip into Zone D with actions
4. Maintain same props interface

### Step 5: Update ExpedienteFullView

1. Replace tab content routing (remove old tabs, add new)
2. Update tab split to use `EXPEDIENTE_TABS` + `EXPEDIENTE_MORE_TABS`
3. Change tab strip background to `bg-card`
4. Update `onEditFicha` routing from `"cirugia"` to `"ficha"`
5. Add fallback for removed tab keys → `"ficha"`

### Step 6: Verify and validate

1. TypeScript compilation
2. Manual walkthrough of all 8 tab views (6 primary + 2 overflow)
3. Verify no content loss from eliminated tabs
4. Verify zero duplication between ficha top and Ficha tab
5. Verify visual anchoring (ficha + tabs as one unit)
