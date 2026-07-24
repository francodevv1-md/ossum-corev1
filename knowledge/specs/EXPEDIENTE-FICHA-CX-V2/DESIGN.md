# DESIGN — EXPEDIENTE-FICHA-CX-V2

Status: design
Supersedes: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`
Based on: `PROPOSAL.md` + `SPEC.md`

---

## 1. Layout Architecture

### 1.1 Full Wireframe

The entire ExpedienteFullView renders as **one rounded shell** containing the ficha operative surface, tab strip, and tab content as a continuous visual unit.

```
┌─── rounded-xl border bg-card shadow-sm ──────────────────────────────────┐
│                                                                          │
│  Zone A: Identity Row                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ CX-0271 · García, María  DNI 30123456      Fecha CX 15/07/2026     │ │
│  │                                    10:30  ·  Urgente                │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Zone B: Context Row                                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [Médico: Dr. López] [Inst.: Hospital A] [Cliente: OSDE]            │ │
│  │                                    [Coord. Pérez] [Vend. Gómez]    │ │
│  │                                    [Inst. Ramírez] [🚨 URGENTE]    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Zone C: Circuit + States  (bg-muted/20 rounded-xl border)              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ ○───●───●───○───○───○  (6-stage macro timeline)                     │ │
│  │ [Estado CX] [Preparación] [Documentación] [Facturación] [Consumo]   │ │
│  │ ⚠ Sin autorización                                                  │ │
│  │ Pendiente principal: Falta documentación                             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Zone D: References + Actions  (border-t separator)                     │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ PR-xxx · NR-xxx · FV-xxx · Exp#xxx   [Editar ficha] [PR] [Más ▼]  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ─── border-t ─────────────────────────────────────────────────────────  │
│                                                                          │
│  Tab Strip  (bg-card, no gap from ficha)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [Ficha] [Comercial] [Consumo] [Doc. y trazab.] [Logística] [Correo]│ │
│  │                                                      [Más ▼]       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Tab Content  (bg-background/40, overflow-y-auto)                       │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  (selected tab content renders here)                                 │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 CSS / Tailwind for Each Zone

**Outer shell** (ExpedienteFullView — unchanged class):
```tsx
<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
```

**Zone A** (Identity Row):
```tsx
<div className="flex items-center justify-between px-4 py-3 sm:px-6">
  {/* Left: ID CX + Patient + DNI */}
  {/* Right: Fecha CX + Hora + Clasificación */}
</div>
```

**Zone B** (Context Row):
```tsx
<div className="flex items-start justify-between gap-4 px-4 pb-3 sm:px-6">
  {/* Left: 3-column context descriptors */}
  {/* Right: role pills + urgente badge */}
</div>
```

**Zone C** (Circuit + States):
```tsx
<div className="space-y-3 rounded-xl border bg-muted/20 mx-4 mb-3 px-4 py-4 sm:mx-6 sm:mb-4">
  <ExpedienteMacroTimeline model={model.macroTimeline} />
  <ExpedienteStatusChips chips={model.chips} />
  {/* sin autorización alert — conditional */}
  {/* pendiente principal */}
</div>
```

**Zone D** (References + Actions):
```tsx
<div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
  {/* Left: ExpedienteReferencesStrip */}
  {/* Right: action trio buttons */}
</div>
```

**Tab strip** (inside `<Tabs>`, replacing current `bg-background/80`):
```tsx
<div className="shrink-0 border-t bg-card px-2 sm:px-4 flex items-center gap-0">
  <TabsList className="h-9 w-max justify-start gap-0 bg-transparent p-0">
    {/* EXPEDIENTE_TABS triggers */}
  </TabsList>
  {/* Más dropdown */}
</div>
```

**Tab content area** (unchanged class):
```tsx
<div className="flex-1 overflow-y-auto bg-background/40">
  <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
    {/* TabsContent blocks */}
  </div>
</div>
```

### 1.3 Visual Anchoring — Ficha + Tabs as One Unit

The key difference from the current layout: **no visual gap or color break** between the ficha bottom (Zone D) and the tab strip.

Current code has a separate `<ExpedienteHeader>` component ending with its own `bg-muted/10` references row, and then the `<Tabs>` section starts with `bg-background/80`. This creates a visual wall.

New approach:
1. `ExpedienteHeader` renders Zones A–D inside `<div className="shrink-0 bg-card">` — same background as the shell.
2. The `<Tabs>` section immediately follows with `border-t bg-card` on its container — same background, only a 1px border separates ficha from tabs.
3. The entire shell uses `rounded-xl border bg-card shadow-sm` — one continuous surface.

**No `mb-*` or `mt-*` between ExpedienteHeader and Tabs.**

### 1.4 Responsive Considerations

Desktop-first. On smaller screens:

- **Zone A**: `flex-wrap` on the identity row. If screen < 640px, Fecha CX + Clasificación wrap below the patient name. Add `sm:flex-nowrap` for desktop.
- **Zone B**: Already uses `flex-wrap`. Context descriptors become 1-column on mobile (remove `md:grid-cols-3`, use `grid-cols-1 sm:grid-cols-3`).
- **Zone C**: `mx-4 sm:mx-6` padding already adapts.
- **Zone D**: `flex-wrap` on the action trio. Buttons wrap below references if space is tight.
- **Tab strip**: `overflow-x-auto` with scroll arrows (existing pattern) handles overflow.

---

## 2. ExpedienteHeader Rewrite (Zones A–D)

### 2.1 Props Interface

The existing `ExpedienteHeaderProps` is **preserved** with one removal and one addition:

```ts
interface ExpedienteHeaderProps {
  surgery: Surgery
  presupuestoId?: string
  consumoState?: ConsumoState
  docStatus: string
  model: ExpedienteHeaderModel
  // REMOVED: onBack — navigation moves to page-level
  onEditFicha: () => void
  onViewPR: () => void
  onGeneratePR: () => void
  onViewDocumentacion: () => void
  onViewRemitos: () => void
  onViewConsumo: () => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetNewState: (state: SurgeryState) => void
  onRecover: (s: Surgery) => void
}
```

**Removal**: `onBack` — the back button no longer lives inside the ficha. The caller (ExpedienteFullView) places it above the shell.

### 2.2 Zone A — Identity Row

**JSX structure**:
```tsx
{/* ── Zone A: Identity Row ── */}
<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
  {/* Left: ID CX + Patient + DNI */}
  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
    <span className="font-mono text-lg font-bold text-blue-700">
      {model.identity.idCx}
    </span>
    {model.identity.expedienteNumber && (
      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
        Exp. {model.identity.expedienteNumber}
      </span>
    )}
    <span className="text-xl font-semibold leading-tight text-foreground">
      {model.identity.patient}
    </span>
    {model.identity.patientDni && (
      <span className="text-sm text-muted-foreground">
        DNI {model.identity.patientDni}
      </span>
    )}
  </div>

  {/* Right: Fecha CX + Hora + Clasificación */}
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Fecha CX</span>
      <span className="text-xs font-semibold">{model.identity.dateLabel}</span>
    </div>
    {model.identity.classification && (
      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
        <span className="text-xs font-semibold">{model.identity.classification}</span>
      </div>
    )}
  </div>
</div>
```

**Data bindings**:
| Field | Model path | Rendering |
|-------|-----------|-----------|
| ID CX | `model.identity.idCx` | `font-mono text-lg font-bold text-blue-700` |
| Expediente # | `model.identity.expedienteNumber` | Small pill, conditional |
| Paciente | `model.identity.patient` | `text-xl font-semibold text-foreground` |
| DNI | `model.identity.patientDni` | `text-sm text-muted-foreground`, "DNI" prefix, conditional |
| Fecha CX + Hora | `model.identity.dateLabel` | Compact pill with "Fecha CX" micro-label |
| Clasificación | `model.identity.classification` | Compact pill, conditional |

**Conditional rendering**:
- `model.identity.expedienteNumber`: only render the "Exp." pill if truthy
- `model.identity.patientDni`: only render if truthy
- `model.identity.classification`: only render if truthy

**Visual hierarchy rules**:
- ID CX is the anchor: mono, bold, blue-700. Not a micro-label+value — the visual weight IS the label.
- Paciente is the largest text element: `text-xl font-semibold`.
- DNI is secondary: `text-sm`, muted color.
- Fecha CX is a bordered pill, right-aligned.
- No card containers, no separate micro-label rows for ID/Paciente/DNI.

### 2.3 Zone B — Context Row

**JSX structure**:
```tsx
{/* ── Zone B: Context Row ── */}
<div className="flex items-start justify-between gap-4 px-4 pb-3 sm:px-6">
  {/* Left: Context descriptors */}
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {identityFields.map((field) => (
      <div key={field.label} className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
        <p className="mt-1 text-sm font-medium leading-snug text-foreground break-words">{field.value || "—"}</p>
      </div>
    ))}
  </div>

  {/* Right: Role pills + Urgente */}
  <div className="flex flex-wrap items-center gap-2 shrink-0">
    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Coord.</span>
      <span className="text-xs font-semibold">{model.identity.coordinador}</span>
    </div>
    {model.identity.vendedor && (
      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Vend.</span>
        <span className="text-xs font-semibold">{model.identity.vendedor}</span>
      </div>
    )}
    {model.identity.instrumentador && (
      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Inst.</span>
        <span className="text-xs font-semibold">{model.identity.instrumentador}</span>
      </div>
    )}
    {model.alerts.urgente && (
      <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
        <AlertOctagon className="size-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Urgente</span>
      </div>
    )}
  </div>
</div>
```

**`identityFields` array** (defined inside component, same as current):
```ts
const identityFields = [
  { label: "Médico", value: model.identity.surgeon },
  { label: "Institución", value: model.identity.institution },
  { label: "Cliente / financiador", value: model.identity.clientFinanciador },
]
```

**Data bindings**:
| Field | Model path | Rendering |
|-------|-----------|-----------|
| Médico | `model.identity.surgeon` | Card with micro-label |
| Institución | `model.identity.institution` | Card with micro-label |
| Cliente/financiador | `model.identity.clientFinanciador` | Card with micro-label |
| Coordinador | `model.identity.coordinador` | Pill with "Coord." micro-label |
| Vendedor | `model.identity.vendedor` | Pill with "Vend." micro-label, conditional |
| Instrumentador | `model.identity.instrumentador` | Pill with "Inst." micro-label, conditional |
| Urgente | `model.alerts.urgente` | Red alert pill, conditional |

**Conditional rendering**:
- Vendedor pill: only if `model.identity.vendedor` is truthy
- Instrumentador pill: only if `model.identity.instrumentador` is truthy
- Urgente badge: only if `model.alerts.urgente === true`
- Missing values in cards show "—" (already handled by `field.value || "—"`)
- Missing values in pills show "—" via `model.identity.coordinador` (which defaults to "Sin asignar" in the model builder)

**Visual hierarchy rules**:
- Context descriptors (left): bordered cards with micro-labels. Read as reference info.
- Role pills (right): compact, inline. Read as "who is involved."
- Urgente badge: highest visual priority — red border, AlertOctagon icon.

### 2.4 Zone C — Circuit + States

**JSX structure** (preserved from current code, reorganized):
```tsx
{/* ── Zone C: Circuit + States ── */}
<div className="space-y-3 rounded-xl border bg-muted/20 mx-4 mb-3 px-4 py-4 sm:mx-6 sm:mb-4">
  <ExpedienteMacroTimeline model={model.macroTimeline} />
  <ExpedienteStatusChips chips={model.chips} />

  {model.alerts.sinAutorizacion && (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Sin autorización</p>
      <p className="mt-1 text-sm font-medium">La cirugía sigue bloqueada a la espera de autorización.</p>
    </div>
  )}

  <div className={cn("rounded-lg border px-3 py-2 text-sm font-medium", model.alerts.pendiente.color)}>
    <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Pendiente principal</span>
    {model.alerts.pendiente.text}
  </div>
</div>
```

This is essentially the same as the current Zone C block (lines 146–161 of ExpedienteHeader.tsx), but with responsive padding (`mx-4 sm:mx-6`, `mb-3 sm:mb-4`) and pulled out of the `space-y-4` wrapper into its own zone.

**No structural changes** to ExpedienteMacroTimeline, ExpedienteStatusChips, or the alert blocks.

### 2.5 Zone D — References + Actions

**JSX structure** (merged from current action bar + references strip):
```tsx
{/* ── Zone D: References + Actions ── */}
<div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
  {/* Left: References */}
  <ExpedienteReferencesStrip references={model.references} />

  {/* Right: Action trio */}
  <div className="flex items-center gap-2 shrink-0">
    <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px]" onClick={onEditFicha}>
      <Edit className="size-3" /> Editar ficha
    </Button>
    {hasPR ? (
      <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px]" onClick={onViewPR}>
        <Receipt className="size-3" /> Ver PR
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px]" onClick={onGeneratePR}>
        <Receipt className="size-3" /> Generar PR
      </Button>
    )}
    <DropdownMenu>
      {/* Same dropdown content as current code lines 177–234 */}
    </DropdownMenu>
  </div>
</div>
```

**Data bindings**: Same as current action bar + references strip. No new data.

**Conditional rendering**: Same as current — `hasPR` toggles PR button text.

**Visual rules**: The references strip and action trio are in a single row. `flex-wrap` handles narrow screens. The `border-t` separates Zone D from Zone C.

### 2.6 What Is Removed

The **utility strip** (current lines 72–94) is removed entirely:
- Back button → moves to page-level (see §9)
- "FICHA DE CX" label → removed (the operative surface IS the ficha, no label needed)
- "Open in new tab" button → removed from header (can be added to page-level later if needed)

The **secondary fields row** that mixed Clasificación + Coordinador + Vendedor + Instrumentador + Fecha CX + Urgente into one `flex-wrap` row is split:
- Clasificación → Zone A (right side, with Fecha CX)
- Coordinador/Vendedor/Instrumentador → Zone B (right side, as pills)
- Urgente → Zone B (right side, as alert badge)

---

## 3. FichaTabContent Component

### 3.1 Component Definition

**File**: `src/components/expediente/FichaTabContent.tsx` (new)

**Props interface**:
```ts
interface FichaTabContentProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  comprobantes: Comprobante[]
  remitos: Remito[]
  consumo?: Consumo
  notes: SurgeryNote[]
  docStatus: string
  facturacionStatus: string
  box?: Box
  resumenCobranza: ResumenCobranzaSurgery
  onAddNote: () => void
}
```

### 3.2 Internal Structure — 5 Sections

```
┌─ FichaTabContent ──────────────────────────────────────────────────────┐
│                                                                         │
│  Section 1: Leyenda destacada (amber callout)                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ⚠ Leyenda destacada: {surgery.leyenda}                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Section 2: Comprobantes overview (PR/PE/NR/FV cards)                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ PR-xxx  $12.500   |  NR-xxx  Entregado  |  FV-xxx  Cobrada      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Section 3: Datos de la cirugía (FichaCirugia compact)                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Programación | Gestión | Destino y Facturación                  │  │
│  │  Observaciones | Referencias administrativas                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Section 4: Observaciones y notas                                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Leyenda / Observaciones: {surgery.leyenda}                      │  │
│  │  Notas internas: {surgery.notes}                                 │  │
│  │  ── Separator ──                                                  │  │
│  │  Notas del equipo                                                │  │
│  │  [Agregar nota] button                                           │  │
│  │  Full note list from NotasPanel                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Section 5: Últimas novedades (last 3 notes preview)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Note 1  Note 2  Note 3    [Ver todas →]                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Section 1 — Leyenda Destacada

**Rendering**: Identical to the amber callout in current `ResumenExpediente.tsx` (lines 67–72).

```tsx
{surgery.leyendaDestacada && surgery.leyenda && (
  <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Leyenda destacada</p>
    <p className="text-sm text-amber-900">{surgery.leyenda}</p>
  </div>
)}
```

**Conditional**: Only renders when `surgery.leyendaDestacada === true && surgery.leyenda` is truthy.

### 3.4 Section 2 — Comprobantes Overview

**Rendering**: Extract the comprobantes card rendering from `ResumenExpediente.tsx` (lines 75–125) into an inline section.

```tsx
<div className="rounded-lg border bg-card p-4">
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
    Comprobantes principales
  </h3>
  <div className="space-y-1.5">
    {pr && (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        {/* PR row — same as ResumenExpediente lines 78–89 */}
      </div>
    )}
    {peComp && (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        {/* PE row — same as ResumenExpediente lines 91–102 */}
      </div>
    )}
    {remito && (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        {/* NR row — same as ResumenExpediente lines 103–114 */}
      </div>
    )}
    {resumenCobranza.facturas.length > 0 && resumenCobranza.facturas.map(fv => (
      <FVCard key={fv.facturaNumber} fv={fv} />
    ))}
    {!pr && !peComp && !remito && resumenCobranza.facturas.length === 0 && (
      <p className="text-xs text-muted-foreground py-2">Sin comprobantes asociados</p>
    )}
  </div>
</div>
```

**Dependencies**: The `FVCard` sub-component and `EstadoCobranzaBadge` are extracted from `ResumenExpediente.tsx` and either:
- (a) imported from `ResumenExpediente.tsx` by making them named exports, OR
- (b) duplicated inline in `FichaTabContent.tsx`

**Chosen**: Option (a) — export `FVCard` and `EstadoCobranzaBadge` from `ResumenExpediente.tsx` so both files share the same code. The `NeutralCard` helper is inlined since it's trivial.

### 3.5 Section 3 — Datos de la Cirugía (FichaCirugia Compact)

```tsx
<FichaCirugia surgery={surgery} compact={true} />
```

See §4 for `compact` prop design.

### 3.6 Section 4 — Observaciones y Notas

This section replaces the old "Notas" tab by embedding `NotasPanel` inline.

```tsx
<div className="space-y-4">
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Observaciones y notas
  </h3>

  {/* Surgery-level observations — only if not already shown in leyenda destacada */}
  {surgery.leyenda && !surgery.leyendaDestacada && (
    <div className="rounded-md border px-3 py-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Observaciones</p>
      <p className="text-sm">{surgery.leyenda}</p>
    </div>
  )}

  {/* Surgery internal notes */}
  {surgery.notes && (
    <div className="rounded-md border px-3 py-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Notas internas</p>
      <p className="text-sm whitespace-pre-wrap">{surgery.notes}</p>
    </div>
  )}

  <Separator />

  {/* Team notes — from NotasPanel */}
  <NotasPanel surgery={surgery} notes={notes} onAddNote={onAddNote} />
</div>
```

**Note**: If `surgery.leyendaDestacada` is true, the leyenda is already shown in Section 1 as the amber callout, so Section 4 only shows the non-highlighted leyenda (if any additional observations exist beyond the highlighted one). However, `surgery.leyenda` and `surgery.leyendaDestacada` are the same field — when destacada is true, the amber callout already shows the full leyenda. So Section 4 skips the observaciones block when destacada is true.

### 3.7 Section 5 — Últimas Novedades

**Rendering**: Identical to the "Últimas novedades" card in `ResumenExpediente.tsx` (lines 128–146).

```tsx
<div className="rounded-lg border bg-card p-4">
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
    Últimas novedades
  </h3>
  {lastNotes.length > 0 ? (
    <div className="space-y-2">
      {lastNotes.map(n => (
        <div key={n.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
          <div className="shrink-0 mt-0.5">
            <Badge variant="outline" className="text-[9px] font-semibold">{n.type}</Badge>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium">{n.text}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{n.userName} — {formatDate(n.date)} {n.time}</p>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-muted-foreground py-2">Sin notas recientes</p>
  )}
</div>
```

Where `lastNotes` is:
```ts
const lastNotes = notes.slice(-3).reverse()
```

### 3.8 Full Component Structure

```tsx
"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatCurrency } from "@/lib/formatters"
import type { Surgery, Presupuesto, Comprobante, Remito, Consumo, SurgeryNote, Box } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import { FichaCirugia } from "./FichaCirugia"
import { NotasPanel } from "./NotasPanel"
import { FVCard, EstadoCobranzaBadge } from "./ResumenExpediente" // named exports

export function FichaTabContent({
  surgery, presupuestos, comprobantes, remitos, consumo,
  notes, docStatus, facturacionStatus, box, resumenCobranza,
  onAddNote,
}: FichaTabContentProps) {
  const pr = presupuestos[0]
  const remito = remitos[0]
  const peComp = comprobantes.find(c => c.type === "PE")
  const lastNotes = notes.slice(-3).reverse()

  return (
    <div className="space-y-5">
      {/* Section 1: Leyenda destacada */}
      {surgery.leyendaDestacada && surgery.leyenda && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Leyenda destacada</p>
          <p className="text-sm text-amber-900">{surgery.leyenda}</p>
        </div>
      )}

      {/* Section 2: Comprobantes overview */}
      <div className="rounded-lg border bg-card p-4">
        {/* ... comprobantes cards ... */}
      </div>

      {/* Section 3: Datos de la cirugía (compact FichaCirugia) */}
      <FichaCirugia surgery={surgery} compact />

      {/* Section 4: Observaciones y notas */}
      <div className="space-y-4">
        {/* ... observations + NotasPanel ... */}
      </div>

      {/* Section 5: Últimas novedades */}
      <div className="rounded-lg border bg-card p-4">
        {/* ... last 3 notes ... */}
      </div>
    </div>
  )
}
```

### 3.9 State Management

`FichaTabContent` is a **stateless container**. It has no internal state. All data comes from props. Edit mode is managed by `FichaCirugia`'s internal `editing` state (existing pattern).

### 3.10 Edit Mode Handling

When the user clicks "Editar ficha" in Zone D, `onEditFicha` fires → `setExpTab("ficha")` in ExpedienteFullView. The Ficha tab opens. The user then clicks "Editar" inside `FichaCirugia` to enter edit mode (Option A from SPEC §11.5).

No shared edit mode signal is needed. The `FichaCirugia` component manages its own `editing` state internally.

---

## 4. FichaCirugia Compact Mode

### 4.1 Updated Props Interface

```ts
interface FichaCirugiaProps {
  surgery: Surgery
  compact?: boolean  // NEW — defaults to false for backward compatibility
}
```

### 4.2 Compact Behavior

When `compact={true}`:

**Skipped field groups** (already visible in ficha top Zones A/B):
1. `"Identificación"` group — ID CX, Nº expediente, PR Nº, Clasificación
2. `"Paciente"` group — Paciente, DNI, Obra social, Cliente/Financiador
3. `"Médico / Institución"` group — Médico, Institución, Ciudad, Provincia, Localidad

**Skipped header bar** — The "Ficha de Cirugía" title + Edit/Ver historial buttons (lines 159–186) is hidden in compact mode because:
- The tab already identifies the section ("Ficha" tab is active)
- Edit/Save/Cancel buttons are still needed but rendered differently (see below)

**Rendered field groups** (starting from "Programación"):
1. `"Programación"` — Fecha cirugía, Hora, Fecha probable, Fecha envío material
2. `"Gestión"` — Urgente, Coordinador, Vendedor, Instrumentador, Tipo de gestión, Titular
3. `"Destino y Facturación"` — A quién remitir, A quién facturar
4. `"Observaciones"` — Leyenda, Leyenda destacada checkbox, Notas internas
5. `"Referencias administrativas"` — editor/list

### 4.3 Implementation — Edit Mode (Read Path)

In **read mode** with `compact={true}`:

```tsx
<div className="space-y-6">
  {/* Header bar — HIDDEN in compact mode */}
  {!compact && (
    <div className="flex items-center justify-between">
      {/* ... existing header bar ... */}
    </div>
  )}
  {!compact && <Separator />}

  {/* Skipped groups — HIDDEN in compact mode */}
  {!compact && (
    <>
      <FieldGroup title="Identificación">...</FieldGroup>
      <FieldGroup title="Paciente">...</FieldGroup>
      <FieldGroup title="Médico / Institución">...</FieldGroup>
    </>
  )}

  {/* Always rendered groups */}
  <FieldGroup title="Programación">...</FieldGroup>
  <FieldGroup title="Gestión">...</FieldGroup>
  <FieldGroup title="Destino y Facturación">...</FieldGroup>
  <FieldGroup title="Observaciones">...</FieldGroup>
  {/* Referencias administrativas */}
</div>
```

### 4.4 Implementation — Edit Mode (Write Path)

In **edit mode** with `compact={true}`:

The same conditional rendering applies — the three identity groups are hidden. The header bar (with Edit/Save/Cancel) is also hidden in compact mode, so edit controls need an alternative.

**Solution**: Render a compact edit action bar at the top of the form section in compact mode:

```tsx
{compact && editing && (
  <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 mb-4">
    <span className="text-xs font-medium text-muted-foreground">Editando ficha</span>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={cancelEditing}>
        <X className="size-3" /> Cancelar
      </Button>
      <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveChanges}>
        <Save className="size-3" /> Guardar
      </Button>
    </div>
  </div>
)}
```

This provides a lightweight edit-mode indicator and controls without the full header bar.

### 4.5 Full (Non-Compact) Mode — Backward Compatible

When `compact={false}` or `compact` is undefined:

All groups render. The header bar renders. No behavior change from current code.

The `compact` prop defaults to `false`:
```tsx
export function FichaCirugia({ surgery: initialSurgery, compact = false }: FichaCirugiaProps) {
```

### 4.6 Edit Mode State in Compact

The `editing` state, `form` state, `startEditing`, `cancelEditing`, `saveChanges`, and `updateField` functions all remain **unchanged**. The compact prop only affects which FieldGroups render and whether the header bar is shown.

In compact mode, the "Editar" button is NOT inside the FichaCirugia header (which is hidden). Instead, the user triggers edit mode via:
1. Zone D "Editar ficha" button → switches to Ficha tab
2. The user still needs to click "Editar" somewhere inside the Ficha tab

**Resolution**: In compact mode, add a small "Editar" button at the top of the form section (visible when NOT editing):

```tsx
{compact && !editing && (
  <div className="flex justify-end mb-2">
    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={startEditing}>
      <Edit className="size-3" /> Editar
    </Button>
  </div>
)}
```

This gives the user an explicit entry point into edit mode within the Ficha tab.

---

## 5. ComercialTabContent Component

### 5.1 Component Definition

**File**: `src/components/expediente/ComercialTabContent.tsx` (new)

**Props interface**:
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

### 5.2 Internal Structure

Two sections separated by `<Separator />`. No internal tabs or accordion.

```
┌─ ComercialTabContent ─────────────────────────────────────────────────┐
│                                                                         │
│  Section 1: Presupuesto                                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <PresupuestoPanel /> content                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ── Separator ──                                                        │
│                                                                         │
│  Section 2: Comprobantes                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <RemitosPanel /> content                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ── Separator ──                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <ComprobantesAsociados /> content                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Implementation

```tsx
"use client"

import React from "react"
import { Separator } from "@/components/ui/separator"
import type { Surgery, Presupuesto, Comprobante, Remito, Box } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import { PresupuestoPanel } from "./PresupuestoPanel"
import { RemitosPanel } from "./RemitosPanel"
import { ComprobantesAsociados } from "./ComprobantesAsociados"

export function ComercialTabContent({
  surgery, presupuestos, comprobantes, remitos, box,
  resumenCobranza, onOpenPresupuestoDialog,
}: ComercialTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Presupuesto */}
      <div>
        <PresupuestoPanel
          surgery={surgery}
          presupuestos={presupuestos}
          onOpenPresupuestoDialog={onOpenPresupuestoDialog}
        />
      </div>

      <Separator />

      {/* Section 2: Remitos */}
      <div>
        <RemitosPanel
          surgery={surgery}
          remitos={remitos}
          box={box}
        />
      </div>

      <Separator />

      {/* Section 3: Comprobantes asociados */}
      <div>
        <ComprobantesAsociados
          surgery={surgery}
          comprobantes={comprobantes}
          resumenCobranza={resumenCobranza}
          presupuestos={presupuestos}
        />
      </div>
    </div>
  )
}
```

**Note**: Each embedded panel retains its own section header internally. No additional section headers are added by the tab content wrapper.

---

## 6. DocumentacionTrazabilidadTab Component

### 6.1 Component Definition

**File**: `src/components/expediente/DocumentacionTrazabilidadTab.tsx` (new)

**Props interface**:
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

### 6.2 Internal Structure

```
┌─ DocumentacionTrazabilidadTab ────────────────────────────────────────┐
│                                                                         │
│  Section 1: Documentación                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <DocumentacionPanel /> content                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ── Separator ──                                                        │
│                                                                         │
│  Section 2: Trazabilidad                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <TrazabilidadPanel /> content                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Implementation

```tsx
"use client"

import React from "react"
import { Separator } from "@/components/ui/separator"
import type { Surgery, SurgeryDocumentChecklist, Remito, Consumo, Box } from "@/types"
import { DocumentacionPanel } from "./DocumentacionPanel"
import { TrazabilidadPanel } from "./TrazabilidadPanel"

export function DocumentacionTrazabilidadTab({
  surgery, docChecklist, docStatus, remitos, consumo, box,
}: DocumentacionTrazabilidadTabProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Documentación */}
      <div>
        <DocumentacionPanel
          surgery={surgery}
          docChecklist={docChecklist}
          docStatus={docStatus}
        />
      </div>

      <Separator />

      {/* Section 2: Trazabilidad */}
      <div>
        <TrazabilidadPanel
          surgery={surgery}
          remitos={remitos}
          consumo={consumo}
          box={box}
        />
      </div>
    </div>
  )
}
```

---

## 7. LogisticaTabContent Component

### 7.1 Component Definition

**File**: `src/components/expediente/LogisticaTabContent.tsx` (new)

**Props interface**:
```ts
interface LogisticaTabContentProps {
  surgery: Surgery
  logistics?: LogisticsDetail
  box?: Box
  materialTransito: MaterialTransito[]
}
```

### 7.2 Internal Structure

```
┌─ LogisticaTabContent ─────────────────────────────────────────────────┐
│                                                                         │
│  Section 1: Logística                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <LogisticaPanel /> content                                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ── Separator ──                                                        │
│                                                                         │
│  Section 2: Material en tránsito                                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <MaterialTransitoPanel /> content                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Implementation

```tsx
"use client"

import React from "react"
import { Separator } from "@/components/ui/separator"
import type { Surgery, LogisticsDetail, Box, MaterialTransito } from "@/types"
import { LogisticaPanel } from "./LogisticaPanel"
import { MaterialTransitoPanel } from "./MaterialTransitoPanel"

export function LogisticaTabContent({
  surgery, logistics, box, materialTransito,
}: LogisticaTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Logística */}
      <div>
        <LogisticaPanel
          surgery={surgery}
          logistics={logistics}
          box={box}
        />
      </div>

      <Separator />

      {/* Section 2: Material en tránsito */}
      <div>
        <MaterialTransitoPanel
          surgery={surgery}
          materialTransito={materialTransito}
        />
      </div>
    </div>
  )
}
```

---

## 8. EXPEDIENTE_TABS Update

### 8.1 Current State (14 tabs)

```ts
// cirugias.constants.ts lines 124–139
export const EXPEDIENTE_TABS = [
  { value: "resumen", label: "Resumen", icon: FileText },
  { value: "cirugia", label: "Cirugía", icon: Scissors },
  { value: "presupuesto", label: "Presupuesto", icon: Receipt },
  { value: "remitos", label: "Remitos", icon: Truck },
  { value: "consumo", label: "Consumo", icon: Activity },
  { value: "comprobantes", label: "Comprobantes", icon: Link2 },
  { value: "correo", label: "Correo", icon: Mail },
  { value: "documentacion", label: "Doc.", icon: BookOpen },
  { value: "logistica", label: "Logística", icon: MapPin },
  { value: "transito", label: "Mat. Tránsito", icon: ArrowRightLeft },
  { value: "instrumentador", label: "Instrumentador", icon: Stethoscope },
  { value: "notas", label: "Notas", icon: StickyNote },
  { value: "historial", label: "Historial", icon: History },
  { value: "trazabilidad", label: "Trazabilidad", icon: Search },
] as const
```

### 8.2 New Constants — Exact TypeScript Code

Replace lines 124–151 in `cirugias.constants.ts` with:

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

### 8.3 Icon Import Update

**Current** (line 13–17):
```ts
import {
  Scissors, FileText, Receipt, Truck, Activity, Link2,
  BookOpen, MapPin, ArrowRightLeft, Stethoscope, StickyNote, History, Search,
  Mail,
} from "lucide-react"
```

**New** — remove unused icons (`Scissors`, `Truck`, `Link2`, `ArrowRightLeft`, `StickyNote`, `Search`), keep icons still needed by the new tab arrays and any other consumer in the same file:

```ts
import {
  FileText, Receipt, Activity,
  BookOpen, MapPin, Stethoscope, History,
  Mail,
} from "lucide-react"
```

**Note**: Before removing icons, verify they are not used elsewhere in the same file (e.g., in column definitions or other constants). If `Truck`, `Scissors`, etc. are only used in `EXPEDIENTE_TABS` and `COMPACT_TABS`, they can be safely removed. If they are used in other exported constants, keep them.

### 8.4 COMPACT_TABS Removal

Delete the `COMPACT_TABS` constant (lines 141–151). With only 6 primary tabs, a compact variant is unnecessary — all 6 fit comfortably in the tab strip.

**Before deleting**, verify no other file imports `COMPACT_TABS`:

```bash
rg "COMPACT_TABS" --type ts
```

If any file imports it, replace that reference with `EXPEDIENTE_TABS`.

### 8.5 How ExpedienteFullView Uses the New Tab Constants

**Current** (lines 92–93):
```ts
const PRIMARY_TABS = EXPEDIENTE_TABS.slice(0, 7)
const MORE_TABS = EXPEDIENTE_TABS.slice(7)
```

**New**:
```ts
// No slice needed — EXPEDIENTE_TABS is already the 6 primary tabs
// EXPEDIENTE_MORE_TABS is the 2 overflow tabs
const PRIMARY_TABS = EXPEDIENTE_TABS
const MORE_TABS = EXPEDIENTE_MORE_TABS
```

Or simply use `EXPEDIENTE_TABS` and `EXPEDIENTE_MORE_TABS` directly in the JSX, removing the local aliases.

---

## 9. ExpedienteFullView Modifications

### 9.1 Import Updates

**Current imports** (lines 1–28):
```ts
import { ResumenExpediente } from "./ResumenExpediente"
import { FichaCirugia } from "./FichaCirugia"
import { PresupuestoPanel } from "./PresupuestoPanel"
import { RemitosPanel } from "./RemitosPanel"
import { ConsumoPanel } from "./ConsumoPanel"
import { ComprobantesAsociados } from "./ComprobantesAsociados"
import { DocumentacionPanel } from "./DocumentacionPanel"
import { LogisticaPanel } from "./LogisticaPanel"
import { MaterialTransitoPanel } from "./MaterialTransitoPanel"
import { InstrumentadorPanel } from "./InstrumentadorPanel"
import { NotasPanel } from "./NotasPanel"
import { HistorialPanel } from "./HistorialPanel"
import { TrazabilidadPanel } from "./TrazabilidadPanel"
import { ExpedienteCorreoTab } from "./correo/ExpedienteCorreoTab"
import { EXPEDIENTE_TABS } from "@/lib/cirugias.constants"
```

**New imports**:
```ts
import { FichaTabContent } from "./FichaTabContent"
import { ComercialTabContent } from "./ComercialTabContent"
import { ConsumoPanel } from "./ConsumoPanel"
import { DocumentacionTrazabilidadTab } from "./DocumentacionTrazabilidadTab"
import { LogisticaTabContent } from "./LogisticaTabContent"
import { ExpedienteCorreoTab } from "./correo/ExpedienteCorreoTab"
import { InstrumentadorPanel } from "./InstrumentadorPanel"
import { HistorialPanel } from "./HistorialPanel"
import { EXPEDIENTE_TABS, EXPEDIENTE_MORE_TABS } from "@/lib/cirugias.constants"
```

**Removed imports**: `ResumenExpediente`, `FichaCirugia` (now inside FichaTabContent), `PresupuestoPanel`, `RemitosPanel`, `ComprobantesAsociados`, `DocumentacionPanel`, `LogisticaPanel`, `MaterialTransitoPanel`, `NotasPanel`, `TrazabilidadPanel`.

**Added imports**: `FichaTabContent`, `ComercialTabContent`, `DocumentacionTrazabilidadTab`, `LogisticaTabContent`, `EXPEDIENTE_MORE_TABS`.

### 9.2 Tab Routing — New Switch Cases

Replace all `TabsContent` blocks (lines 232–344) with:

```tsx
{/* ── Tab Content ── */}
<div className="flex-1 overflow-y-auto bg-background/40">
  <div className={cn(
    "mx-auto px-4 py-5 sm:px-6",
    expTab === "correo" ? "max-w-[1600px] xl:px-8" : "max-w-5xl"
  )}>
    <TabsContent value="ficha" className="mt-0">
      <FichaTabContent
        surgery={surgery}
        presupuestos={presupuestos}
        comprobantes={comprobantes}
        remitos={remitos}
        consumo={consumo}
        notes={notes}
        docStatus={docStatus}
        facturacionStatus={facturacionStatus}
        box={box}
        resumenCobranza={resumenCobranza}
        onAddNote={() => { onSetDialogSurgery(surgery); onSetNoteDialogOpen(true) }}
      />
    </TabsContent>

    <TabsContent value="comercial" className="mt-0">
      <ComercialTabContent
        surgery={surgery}
        presupuestos={presupuestos}
        comprobantes={comprobantes}
        remitos={remitos}
        box={box}
        resumenCobranza={resumenCobranza}
        onOpenPresupuestoDialog={onOpenPresupuestoDialog}
      />
    </TabsContent>

    <TabsContent value="consumo" className="mt-0">
      <ConsumoPanel
        surgery={surgery}
        consumo={consumo}
        remitos={remitos}
        box={box}
        editingConsumo={editingConsumo}
        setEditingConsumo={setEditingConsumo}
      />
    </TabsContent>

    <TabsContent value="documentacion" className="mt-0">
      <DocumentacionTrazabilidadTab
        surgery={surgery}
        docChecklist={docChecklist}
        docStatus={docStatus}
        remitos={remitos}
        consumo={consumo}
        box={box}
      />
    </TabsContent>

    <TabsContent value="logistica" className="mt-0">
      <LogisticaTabContent
        surgery={surgery}
        logistics={logistics}
        box={box}
        materialTransito={materialTransito}
      />
    </TabsContent>

    <TabsContent value="correo" className="mt-0">
      <ExpedienteCorreoTab surgery={surgery} />
    </TabsContent>

    {/* Overflow tabs */}
    <TabsContent value="instrumentador" className="mt-0">
      <InstrumentadorPanel
        surgery={surgery}
        instrumentadorSurgery={instrumentadorSurgery}
      />
    </TabsContent>

    <TabsContent value="historial" className="mt-0">
      <HistorialPanel
        surgery={surgery}
        history={history}
      />
    </TabsContent>
  </div>
</div>
```

### 9.3 Removed Tab Cases

The following `TabsContent` blocks are **removed entirely**:

| Old Tab Value | Reason |
|---------------|--------|
| `resumen` | Eliminated — content redistributed to FichaTabContent |
| `cirugia` | Merged into FichaTabContent (FichaCirugia with `compact={true}`) |
| `presupuesto` | Merged into ComercialTabContent |
| `remitos` | Merged into ComercialTabContent |
| `comprobantes` | Merged into ComercialTabContent |
| `transito` | Merged into LogisticaTabContent |
| `notas` | Merged into FichaTabContent |
| `trazabilidad` | Merged into DocumentacionTrazabilidadTab |

### 9.4 Back Button / Navigation Handling

The current `onBack` callback is wired to the header's utility strip back button (line 138: `onBack={onBack}`). In the new design, the back button moves **above** the shell, as page-level navigation.

**Implementation**: Add a small navigation bar above the rounded shell:

```tsx
<div className="flex h-full flex-col bg-background">
  <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-6">

    {/* Page-level navigation — back button */}
    <div className="mb-2 flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onBack}>
            <ArrowLeft className="size-3" /> Cirugías
          </Button>
        </TooltipTrigger>
        <TooltipContent>Volver a la grilla de cirugías</TooltipContent>
      </Tooltip>
    </div>

    {/* Shell: ficha + tabs + content */}
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <ExpedienteHeader ... />
      <Tabs ...>
        ...
      </Tabs>
    </div>

  </div>
</div>
```

**Import required**: `ArrowLeft` from `lucide-react` (already used in current ExpedienteHeader).

**Note**: The `onBack` prop stays in `ExpedienteFullViewProps` but is no longer passed to `ExpedienteHeader`. It's used directly in the page-level nav bar.

### 9.5 onEditFicha Handler Update

**Current** (line 139):
```ts
onEditFicha={() => setExpTab("cirugia")}
```

**New**:
```ts
onEditFicha={() => setExpTab("ficha")}
```

This switches to the Ficha tab (which contains FichaCirugia in compact mode) when the user clicks "Editar ficha" in Zone D.

### 9.6 Tab Strip Update

**Current** (line 157):
```tsx
<div className="shrink-0 border-t bg-background/80 px-2 sm:px-4 flex items-center gap-0">
```

**New**:
```tsx
<div className="shrink-0 border-t bg-card px-2 sm:px-4 flex items-center gap-0">
```

The background changes from `bg-background/80` to `bg-card` to visually match the ficha surface above.

### 9.7 Tab Split Update

**Current** (lines 92–93):
```ts
const PRIMARY_TABS = EXPEDIENTE_TABS.slice(0, 7)
const MORE_TABS = EXPEDIENTE_TABS.slice(7)
```

**New**:
```ts
// Direct references — no slicing needed
const primaryTabs = EXPEDIENTE_TABS
const moreTabs = EXPEDIENTE_MORE_TABS
```

Or inline `EXPEDIENTE_TABS` and `EXPEDIENTE_MORE_TABS` directly in the JSX where `PRIMARY_TABS` and `MORE_TABS` are used.

### 9.8 Default Tab Fallback

When `expTab` references a removed tab key, default to `"ficha"`:

```ts
useEffect(() => {
  const validTabs = [...EXPEDIENTE_TABS, ...EXPEDIENTE_MORE_TABS].map(t => t.value)
  if (!validTabs.includes(expTab as any)) {
    setExpTab("ficha")
  }
}, [expTab])
```

This handles URLs or stored state that still reference old tab keys like `"resumen"` or `"cirugia"`.

### 9.9 ExpedienteHeader Props Update

The `ExpedienteHeader` call in `ExpedienteFullView` loses `onBack`:

**Current** (lines 132–154):
```tsx
<ExpedienteHeader
  surgery={surgery}
  docStatus={docStatus}
  presupuestoId={presupuestoId}
  consumoState={consumoState}
  model={headerModel}
  onBack={onBack}              // REMOVED
  onEditFicha={() => setExpTab("ficha")}  // Changed from "cirugia"
  onViewPR={() => setExpTab("comercial")} // Changed from "presupuesto"
  onGeneratePR={() => onOpenPresupuestoDialog(surgery)}
  onViewDocumentacion={() => setExpTab("documentacion")}  // Same key
  onViewRemitos={() => setExpTab("comercial")}  // Changed from "remitos"
  onViewConsumo={() => setExpTab("consumo")}    // Same key
  onSetDialogSurgery={onSetDialogSurgery}
  onSetFacturarDialogOpen={onSetFacturarDialogOpen}
  onSetNoteDialogOpen={onSetNoteDialogOpen}
  onSetSuspendDialogOpen={onSetSuspendDialogOpen}
  onSetCancelDialogOpen={onSetCancelDialogOpen}
  onSetChangeStateDialogOpen={onSetChangeStateDialogOpen}
  onSetChangeDateDialogOpen={onSetChangeDateDialogOpen}
  onSetNewState={onSetNewState}
  onRecover={onRecover}
/>
```

**Key changes**:
- Remove `onBack={onBack}`
- `onEditFicha` routes to `"ficha"` (was `"cirugia"`)
- `onViewPR` routes to `"comercial"` (was `"presupuesto"`)
- `onViewRemitos` routes to `"comercial"` (was `"remitos"`)

---

## 10. Zero Duplication Enforcement

### 10.1 Complete Duplication Table

| Element | Ficha Top (Zones A-D) | Ficha Tab | Comercial Tab | Other Tabs | Rule |
|---------|----------------------|-----------|---------------|------------|------|
| ID CX | ✅ scan (Zone A) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Expediente # | ✅ pill (Zone A) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Paciente | ✅ scan (Zone A) | ❌ hidden in compact | ❌ | ❌ | Top only |
| DNI | ✅ scan (Zone A) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Fecha CX + Hora | ✅ pill (Zone A) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Clasificación | ✅ pill (Zone A) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Médico | ✅ card (Zone B) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Institución | ✅ card (Zone B) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Cliente/financiador | ✅ card (Zone B) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Coordinador | ✅ pill (Zone B) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Vendedor | ✅ pill (Zone B) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Instrumentador | ✅ pill (Zone B) | ❌ hidden in compact | ✅ overflow (Inst. tab) | ❌ | Top=scan, Overflow=detail |
| Urgente | ✅ badge (Zone B) | ❌ hidden in compact | ❌ | ❌ | Top only |
| Macro timeline | ✅ (Zone C) | ❌ | ❌ | ❌ | Top only |
| Status chips | ✅ (Zone C) | ❌ | ❌ | ❌ | Top only |
| Sin autorización alert | ✅ (Zone C) | ❌ | ❌ | ❌ | Top only |
| Pendiente principal | ✅ (Zone C) | ❌ | ❌ | ❌ | Top only |
| References (compact strip) | ✅ strip (Zone D) | ❌ | ❌ | ❌ | Top = compact scan |
| References (full list/edit) | ❌ | ✅ ReferenciasAdministrativasEditor | ❌ | ❌ | Tab = full detail with edit |
| Comprobantes overview | ❌ | ✅ PR/PE/NR/FV cards (Section 2) | ❌ | ❌ | Tab = overview |
| Comprobantes full detail | ❌ | ❌ | ✅ ComprobantesAsociados | ❌ | Comercial = detail+actions |
| Programación fields | ❌ | ✅ FieldGroup (compact mode) | ❌ | ❌ | Tab only |
| Gestión fields | ❌ | ✅ FieldGroup (compact mode) | ❌ | ❌ | Tab only |
| Destino y Facturación | ❌ | ✅ FieldGroup (compact mode) | ❌ | ❌ | Tab only |
| Observaciones (leyenda) | ❌ | ✅ Section 4 (if not destacada) | ❌ | ❌ | Tab only |
| Leyenda destacada | ❌ | ✅ amber callout (Section 1) | ❌ | ❌ | Tab only (amber callout) |
| Notas internas | ❌ | ✅ (Section 4) | ❌ | ❌ | Tab only |
| Team notes (NotasPanel) | ❌ | ✅ (Section 4) | ❌ | ❌ | Tab only |
| Últimas novedades (3) | ❌ | ✅ preview (Section 5) | ❌ | ❌ | Tab only |
| Presupuesto detail | ❌ | ❌ | ✅ PresupuestoPanel | ❌ | Comercial only |
| Remitos detail | ❌ | ❌ | ✅ RemitosPanel | ❌ | Comercial only |
| Consumo detail | ❌ | ❌ | ❌ | ✅ ConsumoPanel | Consumo tab only |
| Documentación | ❌ | ❌ | ❌ | ✅ Doc. y trazab. | Doc. y trazab. tab only |
| Trazabilidad | ❌ | ❌ | ❌ | ✅ Doc. y trazab. | Doc. y trazab. tab only |
| Logística | ❌ | ❌ | ❌ | ✅ Logística tab | Logística tab only |
| Material en tránsito | ❌ | ❌ | ❌ | ✅ Logística tab | Logística tab only |
| Correo | ❌ | ❌ | ❌ | ✅ Correo tab | Correo tab only |
| Instrumentador detail | ❌ | ❌ | ❌ | ✅ Overflow | Overflow only |
| Historial | ❌ | ❌ | ❌ | ✅ Overflow | Overflow only |

### 10.2 Enforcement Mechanisms

These rules are enforced by **component structure**, not developer discipline:

1. **FichaCirugia `compact` prop**: Physically skips identity groups when `compact={true}`. The JSX conditional `{!compact && <>... </>}` makes it impossible for identity fields to render in the Ficha tab.

2. **FichaTabContent does NOT import**:
   - `ExpedienteStatusChips` — chips live only in Zone C
   - `ExpedienteMacroTimeline` — timeline lives only in Zone C
   - `ExpedienteHeaderModel` — model is only for the header
   - `ExpedienteReferencesStrip` — compact strip lives only in Zone D; the Ficha tab uses `ReferenciasAdministrativasEditor` inside FichaCirugia

3. **ComercialTabContent does NOT render comprobantes overview cards**: The `ComprobantesOverview` cards (PR/PE/NR/FV summary) live only in `FichaTabContent`. `ComercialTabContent` uses `ComprobantesAsociados` which shows full detail with filters and actions.

4. **No tab content panel may import `ExpedienteHeaderModel`**: Only `ExpedienteHeader` reads from the model.

5. **Each panel component receives only its required props**: No panel receives identity data it doesn't need. `ConsumoPanel`, `ExpedienteCorreoTab`, `InstrumentadorPanel`, and `HistorialPanel` continue to receive `surgery: Surgery` as they do today, but they do not re-render identity fields from it (they already don't).

---

## 11. Task Breakdown

### T1: Update EXPEDIENTE_TABS in cirugias.constants.ts

**Task ID**: T1  
**Description**: Replace the 14-tab `EXPEDIENTE_TABS` with the 6-tab version. Add `EXPEDIENTE_MORE_TABS`. Remove `COMPACT_TABS`. Update icon imports.  
**Files changed**:
- `src/lib/cirugias.constants.ts` (lines 13–17, 124–151)  
**Dependencies**: None  
**Verification steps**:
1. TypeScript compiles without errors
2. `EXPEDIENTE_TABS` has exactly 6 entries
3. `EXPEDIENTE_MORE_TABS` has exactly 2 entries
4. `COMPACT_TABS` does not exist
5. No unused icon imports remain
6. `rg "COMPACT_TABS"` returns no results outside the constants file

### T2: Add compact mode to FichaCirugia.tsx

**Task ID**: T2  
**Description**: Add `compact?: boolean` prop (defaults to `false`). When `compact={true}`: skip "Identificación", "Paciente", "Médico/Institución" field groups; hide header bar; add compact edit-mode action bar and "Editar" button.  
**Files changed**:
- `src/components/expediente/FichaCirugia.tsx`  
**Dependencies**: None  
**Verification steps**:
1. `<FichaCirugia surgery={s} />` renders identically to current (backward compat)
2. `<FichaCirugia surgery={s} compact />` skips the 3 identity groups
3. `<FichaCirugia surgery={s} compact />` does not show the header bar
4. `<FichaCirugia surgery={s} compact />` shows "Editar" button in read mode
5. `<FichaCirugia surgery={s} compact />` shows compact edit action bar in edit mode
6. Edit mode works correctly in both compact and non-compact modes
7. TypeScript compiles without errors

### T3: Create FichaTabContent.tsx

**Task ID**: T3  
**Description**: Create the new Ficha tab content component with 5 sections: leyenda destacada, comprobantes overview, FichaCirugia (compact), observaciones y notas, últimas novedades. Export `FVCard` and `EstadoCobranzaBadge` from `ResumenExpediente.tsx` as named exports for reuse.  
**Files changed**:
- `src/components/expediente/FichaTabContent.tsx` (new)
- `src/components/expediente/ResumenExpediente.tsx` (modify: export `FVCard`, `EstadoCobranzaBadge` as named exports)  
**Dependencies**: T2 (needs FichaCirugia with compact prop)  
**Verification steps**:
1. FichaTabContent renders all 5 sections in correct order
2. Leyenda destacada only appears when `surgery.leyendaDestacada && surgery.leyenda`
3. Comprobantes overview shows PR/PE/NR/FV cards correctly
4. FichaCirugia renders in compact mode (no identity groups)
5. NotasPanel is embedded correctly with `onAddNote` wired
6. Últimas novedades shows last 3 notes
7. "Ver todas" link in últimas novedades scrolls to or expands NotasPanel (if implemented)
8. TypeScript compiles without errors

### T4: Create ComercialTabContent.tsx

**Task ID**: T4  
**Description**: Create the new Comercial tab content component combining PresupuestoPanel + RemitosPanel + ComprobantesAsociados with Separator dividers.  
**Files changed**:
- `src/components/expediente/ComercialTabContent.tsx` (new)  
**Dependencies**: None  
**Verification steps**:
1. ComercialTabContent renders 3 sections with separators
2. PresupuestoPanel content is identical to standalone rendering
3. RemitosPanel content is identical to standalone rendering
4. ComprobantesAsociados content is identical to standalone rendering
5. Props are correctly passed to each sub-panel
6. TypeScript compiles without errors

### T5: Create DocumentacionTrazabilidadTab.tsx

**Task ID**: T5  
**Description**: Create the new Doc. y trazabilidad tab content component combining DocumentacionPanel + TrazabilidadPanel with a Separator divider.  
**Files changed**:
- `src/components/expediente/DocumentacionTrazabilidadTab.tsx` (new)  
**Dependencies**: None  
**Verification steps**:
1. DocumentacionTrazabilidadTab renders 2 sections with separator
2. DocumentacionPanel content is identical to standalone rendering
3. TrazabilidadPanel content is identical to standalone rendering
4. Props are correctly passed to each sub-panel
5. TypeScript compiles without errors

### T6: Create LogisticaTabContent.tsx

**Task ID**: T6  
**Description**: Create the new Logística tab content component combining LogisticaPanel + MaterialTransitoPanel with a Separator divider.  
**Files changed**:
- `src/components/expediente/LogisticaTabContent.tsx` (new)  
**Dependencies**: None  
**Verification steps**:
1. LogisticaTabContent renders 2 sections with separator
2. LogisticaPanel content is identical to standalone rendering
3. MaterialTransitoPanel content is identical to standalone rendering
4. Props are correctly passed to each sub-panel
5. TypeScript compiles without errors

### T7: Rewrite ExpedienteHeader.tsx (4-zone ficha)

**Task ID**: T7  
**Description**: Rewrite ExpedienteHeader with the 4-zone layout (A–D). Remove utility strip. Remove `onBack` from props. Restructure identity row to single-line. Merge references strip into Zone D with actions.  
**Files changed**:
- `src/components/expediente/ExpedienteHeader.tsx`  
**Dependencies**: None  
**Verification steps**:
1. Zone A renders as single flex line with ID CX + Paciente + DNI (left) and Fecha CX + Clasificación (right)
2. Zone B renders context descriptors (left) + role pills + urgente badge (right)
3. Zone C renders macro timeline + status chips + alerts (same as current)
4. Zone D renders references strip (left) + action trio (right) with border-t separator
5. No utility strip with back button or "FICHA DE CX" label
6. `onBack` is not in the props interface
7. Component renders without TypeScript errors
8. All action callbacks (Editar ficha, PR, Más acciones) work correctly
9. Dropdown menu content is preserved

### T8: Update ExpedienteFullView.tsx (new tabs, routing, back button)

**Task ID**: T8  
**Description**: Update ExpedienteFullView with new imports, new tab routing, back button above shell, tab strip background change, `onEditFicha` routing to "ficha", tab split using `EXPEDIENTE_TABS` + `EXPEDIENTE_MORE_TABS`, default tab fallback.  
**Files changed**:
- `src/components/expediente/ExpedienteFullView.tsx`  
**Dependencies**: T1, T3, T4, T5, T6, T7 (all must be complete)  
**Verification steps**:
1. 6 primary tabs visible: Ficha, Comercial, Consumo, Doc. y trazab., Logística, Correo
2. Overflow dropdown contains: Instrumentador, Historial
3. Back button appears above the shell, not inside the header
4. `onEditFicha` routes to `"ficha"` tab
5. `onViewPR` routes to `"comercial"` tab
6. `onViewRemitos` routes to `"comercial"` tab
7. Tab strip background is `bg-card` (matches ficha surface)
8. No visual gap between ficha and tab strip
9. Default tab fallback redirects old tab keys to `"ficha"`
10. All 8 TabsContent blocks render correct content
11. ConsumoPanel and ExpedienteCorreoTab still work unchanged
12. InstrumentadorPanel and HistorialPanel accessible via Más dropdown
13. No `ResumenExpediente`, `FichaCirugia`, `PresupuestoPanel`, etc. imports remain
14. TypeScript compiles without errors

### T9: Verify and Clean Up

**Task ID**: T9  
**Description**: Final verification, cleanup, and browser QA. Check for stale imports, unused files, and visual regressions.  
**Files changed**:
- Potentially `src/components/expediente/ResumenExpediente.tsx` (verify exports work)  
**Dependencies**: T8  
**Verification steps**:
1. `npm run build` succeeds without errors
2. Manual walkthrough of all 8 tab views (6 primary + 2 overflow)
3. Verify no content loss from eliminated tabs
4. Verify zero duplication between ficha top and Ficha tab
5. Verify visual anchoring (ficha + tabs as one unit)
6. Verify responsive behavior on smaller screens
7. Check that `ResumenExpediente.tsx` is no longer imported as a standalone tab component (but its `FVCard` and `EstadoCobranzaBadge` exports are still used by `FichaTabContent`)
8. Verify old tab URLs/states are gracefully handled by the fallback
9. No console errors or warnings

---

## Appendix A: File Change Summary

| File | Action | Detail |
|------|--------|--------|
| `src/lib/cirugias.constants.ts` | **MODIFY** | Replace `EXPEDIENTE_TABS` (14→6 entries). Add `EXPEDIENTE_MORE_TABS` (2 entries). Remove `COMPACT_TABS`. Update icon imports. |
| `src/components/expediente/ExpedienteHeader.tsx` | **REWRITE** | 4-zone ficha (A–D). Remove utility strip. Remove `onBack` prop. Merge references + actions into Zone D. |
| `src/components/expediente/ExpedienteFullView.tsx` | **MODIFY** | New imports. New tab routing. Back button above shell. `bg-card` tab strip. `onEditFicha` → `"ficha"`. Default tab fallback. |
| `src/components/expediente/FichaCirugia.tsx` | **MODIFY** | Add `compact?: boolean` prop. Conditional group skipping. Compact edit-mode controls. |
| `src/components/expediente/ResumenExpediente.tsx` | **MODIFY** | Export `FVCard` and `EstadoCobranzaBadge` as named exports for reuse by FichaTabContent. No longer used as standalone tab. |
| `src/components/expediente/FichaTabContent.tsx` | **NEW** | 5-section container: leyenda destacada, comprobantes overview, FichaCirugia (compact), observaciones y notas, últimas novedades. |
| `src/components/expediente/ComercialTabContent.tsx` | **NEW** | 3-section container: PresupuestoPanel, RemitosPanel, ComprobantesAsociados. |
| `src/components/expediente/DocumentacionTrazabilidadTab.tsx` | **NEW** | 2-section container: DocumentacionPanel, TrazabilidadPanel. |
| `src/components/expediente/LogisticaTabContent.tsx` | **NEW** | 2-section container: LogisticaPanel, MaterialTransitoPanel. |
| `src/components/expediente/expediente-header.model.ts` | **NO CHANGE** | Already provides all data for 4-zone ficha. |
| `src/components/expediente/expediente-macro-timeline.ts` | **NO CHANGE** | 6 stages confirmed. |
| `src/components/expediente/ExpedienteMacroTimeline.tsx` | **NO CHANGE** | Working as-is. |
| `src/components/expediente/ExpedienteStatusChips.tsx` | **NO CHANGE** | Working as-is. |
| `src/components/expediente/ExpedienteReferencesStrip.tsx` | **NO CHANGE** | Working as-is. |
| `src/components/expediente/ConsumoPanel.tsx` | **NO CHANGE** | Same tab key (`consumo`). |
| `src/components/expediente/correo/ExpedienteCorreoTab.tsx` | **NO CHANGE** | Same tab key (`correo`). |
| `src/components/expediente/InstrumentadorPanel.tsx` | **NO CHANGE** | Moves to overflow dropdown. |
| `src/components/expediente/HistorialPanel.tsx` | **NO CHANGE** | Moves to overflow dropdown. |
| `src/components/expediente/PresupuestoPanel.tsx` | **NO CHANGE** | Embedded inside ComercialTabContent. |
| `src/components/expediente/RemitosPanel.tsx` | **NO CHANGE** | Embedded inside ComercialTabContent. |
| `src/components/expediente/ComprobantesAsociados.tsx` | **NO CHANGE** | Embedded inside ComercialTabContent. |
| `src/components/expediente/DocumentacionPanel.tsx` | **NO CHANGE** | Embedded inside DocumentacionTrazabilidadTab. |
| `src/components/expediente/TrazabilidadPanel.tsx` | **NO CHANGE** | Embedded inside DocumentacionTrazabilidadTab. |
| `src/components/expediente/LogisticaPanel.tsx` | **NO CHANGE** | Embedded inside LogisticaTabContent. |
| `src/components/expediente/MaterialTransitoPanel.tsx` | **NO CHANGE** | Embedded inside LogisticaTabContent. |
| `src/components/expediente/NotasPanel.tsx` | **NO CHANGE** | Embedded inside FichaTabContent. |

## Appendix B: Risk Mitigations (from PROPOSAL + SPEC)

| ID | Risk | Mitigation in Design |
|----|------|---------------------|
| R1 | Tab consolidation breaks muscle memory | Ficha tab is default landing (same position as Resumen was). Most frequent operations in first 3 tabs. Overflow items remain accessible. |
| R2 | Comercial tab becomes too wide | Sub-section headers with `<Separator />` provide visual breaks. Each embedded panel has its own internal structure. Sticky sub-nav is optional post-V2. |
| R3 | FichaCirugia merge creates edit-mode confusion | Ficha tab defaults to read mode. "Editar ficha" in Zone D switches to Ficha tab. Compact "Editar" button inside FichaCirugia enters edit mode. Same UX pattern as current "Cirugía" tab. |
| R4 | Resumen content redistribution loses discoverability | Ficha tab is new default landing. Leyenda destacada is first element. Comprobantes overview is second element. Both immediately visible. |
| R5 | Header bloat | 4-zone structure with strict visual hierarchy. Zone A = 1 line. Zone B = compact. Zone C = existing. Zone D = 1 line. No decorative spacing. |
| R6 | EXPEDIENTE_TABS restructure affects shared constants | Only tab arrays are changed. Guardrails, state maps, color maps, column definitions untouched. `COMPACT_TABS` references verified before removal. |
