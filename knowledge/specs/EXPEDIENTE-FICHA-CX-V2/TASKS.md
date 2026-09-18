# TASKS — EXPEDIENTE-FICHA-CX-V2

Status: tasks  
Based on: `PROPOSAL.md` + `SPEC.md` + `DESIGN.md`

---

## Global Guardrails (apply to ALL tasks)

- No backend, auth, schema, store, or business-rule changes
- No touching `prisma/`
- No new dependencies (`npm install`)
- No KPI cards or dashboard metrics
- No lateral preview or split master/detail layout
- No changes to `src/lib/businessRules.ts`
- No changes to `src/lib/cirugias.utils.ts` guardrails beyond tab restructure
- No changes to `expediente-header.model.ts` or `expediente-macro-timeline.ts`
- Strong colors only for alerts/critical states
- Keep existing panel components working — they are reused inside new tab containers, not rewritten
- No tab content panel may import `ExpedienteHeaderModel` — only `ExpedienteHeader` reads from the model
- No `FichaTabContent` import of `ExpedienteStatusChips`, `ExpedienteMacroTimeline`, or `ExpedienteReferencesStrip`
- No `ComercialTabContent` rendering of comprobantes overview cards (those live only in `FichaTabContent`)

---

## T1: Update EXPEDIENTE_TABS Constant

- **Status**: ready
- **Estimated complexity**: S

### Description

Replace the current 14-tab `EXPEDIENTE_TABS` constant with a 6-tab primary array and a 2-tab overflow array. Remove the `COMPACT_TABS` constant. Update icon imports to remove unused ones.

### Files to change

- `src/lib/cirugias.constants.ts`

### Files to create

(none)

### Dependencies

(none)

### What to implement

1. Replace the `EXPEDIENTE_TABS` array (currently 14 entries) with the following 6-entry version:

   ```ts
   export const EXPEDIENTE_TABS = [
     { value: "ficha", label: "Ficha", icon: FileText },
     { value: "comercial", label: "Comercial", icon: Receipt },
     { value: "consumo", label: "Consumo", icon: Activity },
     { value: "documentacion", label: "Doc. y trazab.", icon: BookOpen },
     { value: "logistica", label: "Logística", icon: MapPin },
     { value: "correo", label: "Correo", icon: Mail },
   ] as const
   ```

2. Add a new `EXPEDIENTE_MORE_TABS` constant immediately after:

   ```ts
   export const EXPEDIENTE_MORE_TABS = [
     { value: "instrumentador", label: "Instrumentador", icon: Stethoscope },
     { value: "historial", label: "Historial", icon: History },
   ] as const
   ```

3. Remove the `COMPACT_TABS` constant entirely. Before deleting, verify no other file imports it (`rg "COMPACT_TABS" --type ts`). If any file references it, replace that reference with `EXPEDIENTE_TABS`.

4. Update the icon import block. Remove unused icons that were only referenced by deleted tab entries and `COMPACT_TABS`: `Scissors`, `Truck`, `Link2`, `ArrowRightLeft`, `StickyNote`, `Search`. Keep icons still used: `FileText`, `Receipt`, `Activity`, `BookOpen`, `MapPin`, `Stethoscope`, `History`, `Mail`. Before removing any icon, verify it is not used elsewhere in the same file (e.g., column definitions or other constants).

5. If the `ExpTab` type (or equivalent union type derived from `EXPEDIENTE_TABS`) exists, update it to reflect the new tab values: `"ficha" | "comercial" | "consumo" | "documentacion" | "logistica" | "correo" | "instrumentador" | "historial"`.

### Guardrails

- Do NOT touch guardrails, state maps, color maps, or column definitions in the same file
- Do NOT change any other exported constant besides `EXPEDIENTE_TABS`, `COMPACT_TABS`, and icon imports
- Do NOT add new icons — all needed icons are already imported

### Verification steps

1. TypeScript compiles without errors
2. `EXPEDIENTE_TABS` has exactly 6 entries
3. `EXPEDIENTE_MORE_TABS` has exactly 2 entries
4. `COMPACT_TABS` does not exist in the file
5. No unused icon imports remain
6. `rg "COMPACT_TABS"` returns no results anywhere in the codebase
7. `EXPEDIENTE_MORE_TABS` is exported and importable from `@/lib/cirugias.constants`

---

## T2: Add Compact Mode to FichaCirugia

- **Status**: ready
- **Estimated complexity**: M

### Description

Add a `compact?: boolean` prop to `FichaCirugia` that, when `true`, skips identity-related field groups and the component's own header bar. Default is `false` for full backward compatibility.

### Files to change

- `src/components/expediente/FichaCirugia.tsx`

### Files to create

(none)

### Dependencies

(none)

### What to implement

1. Add `compact?: boolean` to the `FichaCirugiaProps` interface. Default it to `false` in the function signature:

   ```ts
   export function FichaCirugia({ surgery: initialSurgery, compact = false }: FichaCirugiaProps) {
   ```

2. When `compact={true}`, **skip these field groups entirely** (they are already visible in ficha top Zones A/B):
   - `"Identificación"` group (ID CX, Nº expediente, PR Nº, Clasificación)
   - `"Paciente"` group (Paciente, DNI, Obra social, Cliente/Financiador)
   - `"Médico / Institución"` group (Médico, Institución, Ciudad, Provincia, Localidad)

   Wrap these groups in a conditional:

   ```tsx
   {!compact && (
     <>
       <FieldGroup title="Identificación">...</FieldGroup>
       <FieldGroup title="Paciente">...</FieldGroup>
       <FieldGroup title="Médico / Institución">...</FieldGroup>
     </>
   )}
   ```

3. When `compact={true}`, **hide the header bar** (the "Ficha de Cirugía" title + Edit/Ver historial buttons). The tab shell provides navigation context instead:

   ```tsx
   {!compact && (
     <div className="flex items-center justify-between">
       {/* existing header bar */}
     </div>
   )}
   {!compact && <Separator />}
   ```

4. When `compact={true}` and **not editing**, add a small "Editar" button at the top of the form section to provide an explicit entry point into edit mode (since the header bar with its Edit button is hidden):

   ```tsx
   {compact && !editing && (
     <div className="flex justify-end mb-2">
       <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={startEditing}>
         <Edit className="size-3" /> Editar
       </Button>
     </div>
   )}
   ```

5. When `compact={true}` and **editing**, render a compact edit action bar at the top of the form section (since the header bar with Save/Cancel is hidden):

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

6. The following field groups **always render** regardless of compact mode (starting from "Programación"):
   - `"Programación"` — Fecha cirugía, Hora, Fecha probable, Fecha envío material
   - `"Gestión"` — Urgente, Coordinador, Vendedor, Instrumentador, Tipo de gestión, Titular
   - `"Destino y Facturación"` — A quién remitir, A quién facturar
   - `"Observaciones"` — Leyenda, Leyenda destacada checkbox, Notas internas
   - `"Referencias administrativas"` — editor/list

7. The `editing` state, `form` state, `startEditing`, `cancelEditing`, `saveChanges`, and `updateField` functions remain **unchanged**. The compact prop only affects which FieldGroups render and whether the header bar / edit controls are shown.

### Guardrails

- When `compact={false}` (or undefined), behavior must be **identical** to the current code — no visual or functional changes
- Do NOT change the edit mode state management logic
- Do NOT remove or rename any existing props
- Do NOT touch the Zustand store integration or save logic

### Verification steps

1. `<FichaCirugia surgery={s} />` renders identically to current (backward compat)
2. `<FichaCirugia surgery={s} compact />` skips the 3 identity groups
3. `<FichaCirugia surgery={s} compact />` does not show the header bar
4. `<FichaCirugia surgery={s} compact />` shows "Editar" button in read mode
5. `<FichaCirugia surgery={s} compact />` shows compact edit action bar when in edit mode
6. Edit mode works correctly in both compact and non-compact modes (save, cancel, field editing)
7. TypeScript compiles without errors

---

## T3: Create FichaTabContent Component

- **Status**: ready
- **Estimated complexity**: L

### Description

Create the new Ficha tab content component that replaces the old Resumen + Cirugía + Notas tabs. Renders 5 sections in order: leyenda destacada callout, comprobantes overview, FichaCirugia (compact mode), observaciones y notas, and últimas novedades. Also export reusable sub-components from `ResumenExpediente.tsx`.

### Files to change

- `src/components/expediente/ResumenExpediente.tsx` — export `FVCard` and `EstadoCobranzaBadge` as named exports

### Files to create

- `src/components/expediente/FichaTabContent.tsx`

### Dependencies

- T2 (needs FichaCirugia with `compact` prop)

### What to implement

1. **Modify `ResumenExpediente.tsx`**: Export `FVCard` and `EstadoCobranzaBadge` as named exports so `FichaTabContent` can import them. The `NeutralCard` helper is trivial — inline it in `FichaTabContent` rather than exporting it. The default export of `ResumenExpediente` remains unchanged.

2. **Create `FichaTabContent.tsx`** with the following props interface:

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

3. **Section 1 — Leyenda Destacada**: Identical amber callout from current `ResumenExpediente.tsx` (lines 67–72). Conditional: only renders when `surgery.leyendaDestacada === true && surgery.leyenda` is truthy.

   ```tsx
   {surgery.leyendaDestacada && surgery.leyenda && (
     <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
       <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Leyenda destacada</p>
       <p className="text-sm text-amber-900">{surgery.leyenda}</p>
     </div>
   )}
   ```

4. **Section 2 — Comprobantes Overview**: Extract the comprobantes card rendering from `ResumenExpediente.tsx` (lines 75–125) into an inline section. Shows PR, PE, NR, and FV cards as a read-only overview. Uses the `FVCard` and `EstadoCobranzaBadge` named exports from `ResumenExpediente.tsx`. Shows "Sin comprobantes asociados" if none exist.

   Derive data:
   ```ts
   const pr = presupuestos[0]
   const remito = remitos[0]
   const peComp = comprobantes.find(c => c.type === "PE")
   ```

5. **Section 3 — Datos de la Cirugía (compact FichaCirugia)**:

   ```tsx
   <FichaCirugia surgery={surgery} compact />
   ```

6. **Section 4 — Observaciones y Notas**: Replaces the old "Notas" tab. Contains:
   - Surgery-level observations — only if `surgery.leyenda` exists and `surgery.leyendaDestacada` is `false` (when destacada is true, the leyenda is already in Section 1's amber callout)
   - Surgery internal notes — if `surgery.notes` is truthy
   - `<Separator />`
   - `<NotasPanel surgery={surgery} notes={notes} onAddNote={onAddNote} />` — embedded NotasPanel with wired callback

7. **Section 5 — Últimas Novedades**: Identical to the "Últimas novedades" card in `ResumenExpediente.tsx` (lines 128–146). Shows last 3 notes as a preview:

   ```ts
   const lastNotes = notes.slice(-3).reverse()
   ```

   Each note shows type badge, text, user name, and formatted date/time. If no notes, shows "Sin notas recientes".

8. The component is **stateless** — no internal state. All data comes from props. Edit mode is managed by FichaCirugia's internal `editing` state.

9. Wrap all 5 sections in `<div className="space-y-5">`.

10. Required imports:
    - `Badge` from `@/components/ui/badge`
    - `Separator` from `@/components/ui/separator`
    - `formatDate`, `formatCurrency` from `@/lib/formatters`
    - Types: `Surgery`, `Presupuesto`, `Comprobante`, `Remito`, `Consumo`, `SurgeryNote`, `Box`
    - `ResumenCobranzaSurgery` from `@/lib/cobros.utils`
    - `FichaCirugia` from `./FichaCirugia`
    - `NotasPanel` from `./NotasPanel`
    - `FVCard`, `EstadoCobranzaBadge` from `./ResumenExpediente`

### Guardrails

- Do NOT import `ExpedienteStatusChips`, `ExpedienteMacroTimeline`, or `ExpedienteReferencesStrip` — those live only in the ficha top
- Do NOT duplicate identity fields — FichaCirugia compact mode handles the skip
- Do NOT add internal state — this is a stateless container
- Do NOT modify the `NotasPanel` or `FichaCirugia` components (T2 handles FichaCirugia changes)
- Do NOT render comprobantes full detail — only the overview; full detail lives in ComercialTabContent

### Verification steps

1. FichaTabContent renders all 5 sections in correct order
2. Leyenda destacada only appears when `surgery.leyendaDestacada && surgery.leyenda`
3. Comprobantes overview shows PR/PE/NR/FV cards correctly
4. FichaCirugia renders in compact mode (no identity groups)
5. NotasPanel is embedded correctly with `onAddNote` wired
6. Últimas novedades shows last 3 notes
7. Observaciones block is skipped when `leyendaDestacada` is true (leyenda already in Section 1)
8. TypeScript compiles without errors
9. `FVCard` and `EstadoCobranzaBadge` are importable from `ResumenExpediente.tsx`

---

## T4: Create ComercialTabContent Component

- **Status**: ready
- **Estimated complexity**: M

### Description

Create the new Comercial tab content component that combines PresupuestoPanel + RemitosPanel + ComprobantesAsociados with `<Separator />` dividers between sections.

### Files to change

(none)

### Files to create

- `src/components/expediente/ComercialTabContent.tsx`

### Dependencies

(none)

### What to implement

1. Create `ComercialTabContent.tsx` with the following props interface:

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

2. Render 3 sections in order, separated by `<Separator />`:

   **Section 1 — Presupuesto**:
   ```tsx
   <PresupuestoPanel
     surgery={surgery}
     presupuestos={presupuestos}
     onOpenPresupuestoDialog={onOpenPresupuestoDialog}
   />
   ```

   **Section 2 — Remitos**:
   ```tsx
   <RemitosPanel
     surgery={surgery}
     remitos={remitos}
     box={box}
   />
   ```

   **Section 3 — Comprobantes asociados**:
   ```tsx
   <ComprobantesAsociados
     surgery={surgery}
     comprobantes={comprobantes}
     resumenCobranza={resumenCobranza}
     presupuestos={presupuestos}
   />
   ```

3. Wrap all sections in `<div className="space-y-6">`.

4. Each embedded panel retains its own internal section header. No additional section headers are added by the wrapper.

5. Required imports:
   - `Separator` from `@/components/ui/separator`
   - Types: `Surgery`, `Presupuesto`, `Comprobante`, `Remito`, `Box`
   - `ResumenCobranzaSurgery` from `@/lib/cobros.utils`
   - `PresupuestoPanel` from `./PresupuestoPanel`
   - `RemitosPanel` from `./RemitosPanel`
   - `ComprobantesAsociados` from `./ComprobantesAsociados`

### Guardrails

- Do NOT render comprobantes overview cards (those live only in `FichaTabContent`)
- Do NOT add internal tabs or accordion — vertical scroll with section headers only
- Do NOT modify `PresupuestoPanel`, `RemitosPanel`, or `ComprobantesAsociados` — they are embedded as-is
- Each panel receives only its required props — no prop over-injection

### Verification steps

1. ComercialTabContent renders 3 sections with separators
2. PresupuestoPanel content is identical to standalone rendering
3. RemitosPanel content is identical to standalone rendering
4. ComprobantesAsociados content is identical to standalone rendering
5. Props are correctly passed to each sub-panel
6. TypeScript compiles without errors

---

## T5: Create DocumentacionTrazabilidadTab Component

- **Status**: ready
- **Estimated complexity**: M

### Description

Create the new Doc. y trazabilidad tab content component that combines DocumentacionPanel + TrazabilidadPanel with a `<Separator />` divider.

### Files to change

(none)

### Files to create

- `src/components/expediente/DocumentacionTrazabilidadTab.tsx`

### Dependencies

(none)

### What to implement

1. Create `DocumentacionTrazabilidadTab.tsx` with the following props interface:

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

2. Render 2 sections in order, separated by `<Separator />`:

   **Section 1 — Documentación**:
   ```tsx
   <DocumentacionPanel
     surgery={surgery}
     docChecklist={docChecklist}
     docStatus={docStatus}
   />
   ```

   **Section 2 — Trazabilidad**:
   ```tsx
   <TrazabilidadPanel
     surgery={surgery}
     remitos={remitos}
     consumo={consumo}
     box={box}
   />
   ```

3. Wrap all sections in `<div className="space-y-6">`.

4. Required imports:
   - `Separator` from `@/components/ui/separator`
   - Types: `Surgery`, `SurgeryDocumentChecklist`, `Remito`, `Consumo`, `Box`
   - `DocumentacionPanel` from `./DocumentacionPanel`
   - `TrazabilidadPanel` from `./TrazabilidadPanel`

### Guardrails

- Do NOT modify `DocumentacionPanel` or `TrazabilidadPanel` — they are embedded as-is
- Do NOT add internal tabs — vertical scroll with separator only
- Do NOT add section headers — each panel has its own internal header

### Verification steps

1. DocumentacionTrazabilidadTab renders 2 sections with separator
2. DocumentacionPanel content is identical to standalone rendering
3. TrazabilidadPanel content is identical to standalone rendering
4. Props are correctly passed to each sub-panel
5. TypeScript compiles without errors

---

## T6: Create LogisticaTabContent Component

- **Status**: ready
- **Estimated complexity**: M

### Description

Create the new Logística tab content component that combines LogisticaPanel + MaterialTransitoPanel with a `<Separator />` divider.

### Files to change

(none)

### Files to create

- `src/components/expediente/LogisticaTabContent.tsx`

### Dependencies

(none)

### What to implement

1. Create `LogisticaTabContent.tsx` with the following props interface:

   ```ts
   interface LogisticaTabContentProps {
     surgery: Surgery
     logistics?: LogisticsDetail
     box?: Box
     materialTransito: MaterialTransito[]
   }
   ```

2. Render 2 sections in order, separated by `<Separator />`:

   **Section 1 — Logística**:
   ```tsx
   <LogisticaPanel
     surgery={surgery}
     logistics={logistics}
     box={box}
   />
   ```

   **Section 2 — Material en tránsito**:
   ```tsx
   <MaterialTransitoPanel
     surgery={surgery}
     materialTransito={materialTransito}
   />
   ```

3. Wrap all sections in `<div className="space-y-6">`.

4. Required imports:
   - `Separator` from `@/components/ui/separator`
   - Types: `Surgery`, `LogisticsDetail`, `Box`, `MaterialTransito`
   - `LogisticaPanel` from `./LogisticaPanel`
   - `MaterialTransitoPanel` from `./MaterialTransitoPanel`

### Guardrails

- Do NOT modify `LogisticaPanel` or `MaterialTransitoPanel` — they are embedded as-is
- Do NOT add internal tabs — vertical scroll with separator only
- Do NOT add section headers — each panel has its own internal header

### Verification steps

1. LogisticaTabContent renders 2 sections with separator
2. LogisticaPanel content is identical to standalone rendering
3. MaterialTransitoPanel content is identical to standalone rendering
4. Props are correctly passed to each sub-panel
5. TypeScript compiles without errors

---

## T7: Rewrite ExpedienteHeader (4-Zone Ficha)

- **Status**: ready
- **Estimated complexity**: L

### Description

Rewrite `ExpedienteHeader.tsx` from the current 5-zone structure (utility strip → identity → operational → action bar → references strip) to a 4-zone operative surface (Zone A: Identity Row → Zone B: Context Row → Zone C: Circuit + States → Zone D: References + Actions). Remove the utility strip. Remove `onBack` from props. Merge references strip into Zone D with actions.

### Files to change

- `src/components/expediente/ExpedienteHeader.tsx`

### Files to create

(none)

### Dependencies

(none)

### What to implement

1. **Remove `onBack` from the props interface**. The back button no longer lives inside the ficha — it moves to page-level navigation in `ExpedienteFullView`. All other props remain unchanged.

2. **Remove the utility strip zone** (current lines 72–94): back button, "FICHA DE CX" label, and "Open in new tab" button.

3. **Zone A — Identity Row**: Single flex line, `items-center justify-between`. No card-like bordered containers around individual fields. No micro-labels for ID/Paciente/DNI — visual weight is the label.

   ```tsx
   <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
     {/* Left: ID CX + Expediente # + Patient + DNI */}
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

4. **Zone B — Context Row**: 3-column context descriptors (left) + role pills + urgente badge (right).

   Define `identityFields` inside the component:
   ```ts
   const identityFields = [
     { label: "Médico", value: model.identity.surgeon },
     { label: "Institución", value: model.identity.institution },
     { label: "Cliente / financiador", value: model.identity.clientFinanciador },
   ]
   ```

   Render as bordered cards (left) and pills (right):
   ```tsx
   <div className="flex items-start justify-between gap-4 px-4 pb-3 sm:px-6">
     {/* Left: 3-column context descriptors */}
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
       {/* Coordinador pill — always shown */}
       <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
         <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Coord.</span>
         <span className="text-xs font-semibold">{model.identity.coordinador}</span>
       </div>
       {/* Vendedor pill — conditional */}
       {model.identity.vendedor && (
         <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
           <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Vend.</span>
           <span className="text-xs font-semibold">{model.identity.vendedor}</span>
         </div>
       )}
       {/* Instrumentador pill — conditional */}
       {model.identity.instrumentador && (
         <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
           <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Inst.</span>
           <span className="text-xs font-semibold">{model.identity.instrumentador}</span>
         </div>
       )}
       {/* Urgente badge — conditional */}
       {model.alerts.urgente && (
         <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
           <AlertOctagon className="size-3.5" />
           <span className="text-[10px] font-semibold uppercase tracking-wide">Urgente</span>
         </div>
       )}
     </div>
   </div>
   ```

5. **Zone C — Circuit + States**: Preserved from current code. Same `bg-muted/20` container with timeline, chips, sin autorización alert, and pendiente principal. Adjust responsive padding to `mx-4 sm:mx-6`, `mb-3 sm:mb-4`.

   ```tsx
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

6. **Zone D — References + Actions**: Single row with `border-t` separator. References strip left, action trio right.

   ```tsx
   <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
     <ExpedienteReferencesStrip references={model.references} />
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

7. Wrap the entire component in `<div className="shrink-0 bg-card">` to match the shell background and ensure visual continuity with the tab strip below.

8. The `hasPR` logic (checking `presupuestoId` or equivalent) is preserved from the current code.

9. The `DropdownMenu` content (Más acciones) is preserved from the current code with all secondary actions (cambiar estado, cambiar fecha, suspender, cancelar, recuperar, etc.).

### Guardrails

- Do NOT change the props interface beyond removing `onBack`
- Do NOT modify `ExpedienteMacroTimeline`, `ExpedienteStatusChips`, or `ExpedienteReferencesStrip` — they are used as-is
- Do NOT add new callbacks or change callback signatures
- Do NOT change the dropdown menu items — preserve all existing secondary actions
- Do NOT add `mb-*` or `mt-*` at the bottom of the component — no visual gap before the tab strip
- Do NOT use `bg-muted/10` or `bg-background/80` — the ficha surface uses `bg-card`

### Verification steps

1. Zone A renders as a single flex line with ID CX + Paciente + DNI (left) and Fecha CX + Clasificación (right)
2. Zone B renders 3 context descriptor cards (left) + role pills + urgente badge (right)
3. Zone C renders macro timeline + status chips + alerts (same visual as current)
4. Zone D renders references strip (left) + action trio (right) with border-t separator
5. No utility strip with back button or "FICHA DE CX" label
6. `onBack` is not in the props interface
7. Component renders without TypeScript errors
8. All action callbacks (Editar ficha, PR, Más acciones) work correctly
9. Dropdown menu content is fully preserved
10. Component bottom has no margin/gap before the tab strip

---

## T8: Update ExpedienteFullView

- **Status**: ready
- **Estimated complexity**: L

### Description

Update `ExpedienteFullView.tsx` to use the new tab structure, new tab content components, and the updated ExpedienteHeader (without `onBack`). Move the back button above the shell. Update tab routing, tab strip background, and `onEditFicha` target. Add default tab fallback for removed tab keys.

### Files to change

- `src/components/expediente/ExpedienteFullView.tsx`

### Files to create

(none)

### Dependencies

- T1 (needs `EXPEDIENTE_TABS` + `EXPEDIENTE_MORE_TABS` constants)
- T3 (needs `FichaTabContent` component)
- T4 (needs `ComercialTabContent` component)
- T5 (needs `DocumentacionTrazabilidadTab` component)
- T6 (needs `LogisticaTabContent` component)
- T7 (needs `ExpedienteHeader` without `onBack`)

### What to implement

1. **Update imports**: Remove old imports, add new ones.

   **Remove**:
   - `ResumenExpediente`
   - `FichaCirugia` (now inside `FichaTabContent`)
   - `PresupuestoPanel`
   - `RemitosPanel`
   - `ComprobantesAsociados`
   - `DocumentacionPanel`
   - `LogisticaPanel`
   - `MaterialTransitoPanel`
   - `NotasPanel`
   - `TrazabilidadPanel`

   **Add**:
   - `FichaTabContent` from `./FichaTabContent`
   - `ComercialTabContent` from `./ComercialTabContent`
   - `DocumentacionTrazabilidadTab` from `./DocumentacionTrazabilidadTab`
   - `LogisticaTabContent` from `./LogisticaTabContent`
   - `EXPEDIENTE_MORE_TABS` from `@/lib/cirugias.constants` (add to existing `EXPEDIENTE_TABS` import)
   - `ArrowLeft` from `lucide-react` (for back button)

   **Keep**:
   - `ConsumoPanel`, `ExpedienteCorreoTab`, `InstrumentadorPanel`, `HistorialPanel`
   - `EXPEDIENTE_TABS` (updated version from T1)
   - `ExpedienteHeader` (rewritten version from T7)

2. **Update tab split**: Replace the current `PRIMARY_TABS` / `MORE_TABS` slice logic:

   ```ts
   // Remove:
   const PRIMARY_TABS = EXPEDIENTE_TABS.slice(0, 7)
   const MORE_TABS = EXPEDIENTE_TABS.slice(7)

   // Replace with:
   const primaryTabs = EXPEDIENTE_TABS
   const moreTabs = EXPEDIENTE_MORE_TABS
   ```

   Or inline `EXPEDIENTE_TABS` and `EXPEDIENTE_MORE_TABS` directly in the JSX.

3. **Move back button above the shell**: Add a page-level navigation bar above the rounded shell:

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

   The `onBack` prop stays in `ExpedienteFullViewProps` but is no longer passed to `ExpedienteHeader`. It is used directly in the page-level nav bar.

4. **Update ExpedienteHeader props**: Remove `onBack={onBack}`. Update routing callbacks:

   ```tsx
   <ExpedienteHeader
     surgery={surgery}
     docStatus={docStatus}
     presupuestoId={presupuestoId}
     consumoState={consumoState}
     model={headerModel}
     onEditFicha={() => setExpTab("ficha")}              // was "cirugia"
     onViewPR={() => setExpTab("comercial")}              // was "presupuesto"
     onGeneratePR={() => onOpenPresupuestoDialog(surgery)}
     onViewDocumentacion={() => setExpTab("documentacion")} // same key
     onViewRemitos={() => setExpTab("comercial")}         // was "remitos"
     onViewConsumo={() => setExpTab("consumo")}           // same key
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

5. **Update tab strip background**: Change from `bg-background/80` to `bg-card`:

   ```tsx
   <div className="shrink-0 border-t bg-card px-2 sm:px-4 flex items-center gap-0">
   ```

6. **Replace all TabsContent blocks** with the new 8 (6 primary + 2 overflow):

   ```tsx
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
   ```

7. **Remove old tab cases**: Delete `TabsContent` blocks for: `resumen`, `cirugia`, `presupuesto`, `remitos`, `comprobantes`, `transito`, `notas`, `trazabilidad`.

8. **Add default tab fallback**: When `expTab` references a removed tab key, redirect to `"ficha"`:

   ```ts
   useEffect(() => {
     const validTabs = [...EXPEDIENTE_TABS, ...EXPEDIENTE_MORE_TABS].map(t => t.value)
     if (!validTabs.includes(expTab as any)) {
       setExpTab("ficha")
     }
   }, [expTab])
   ```

9. **Preserve the correo tab wider layout**: Keep the conditional `max-w-[1600px]` for the correo tab content wrapper:

   ```tsx
   <div className={cn(
     "mx-auto px-4 py-5 sm:px-6",
     expTab === "correo" ? "max-w-[1600px] xl:px-8" : "max-w-5xl"
   )}>
   ```

### Guardrails

- Do NOT pass `onBack` to `ExpedienteHeader` — it no longer accepts it
- Do NOT import removed components (`ResumenExpediente`, `FichaCirugia`, etc.) directly in this file
- Do NOT change `ConsumoPanel`, `ExpedienteCorreoTab`, `InstrumentadorPanel`, or `HistorialPanel` — they are used as-is
- Do NOT remove the correo wider-layout condition
- Do NOT change the `Tooltip`/`TooltipTrigger`/`TooltipContent` wrappers for the back button
- Do NOT add visual gap between `ExpedienteHeader` and `<Tabs>` — they must be contiguous

### Verification steps

1. 6 primary tabs visible: Ficha, Comercial, Consumo, Doc. y trazab., Logística, Correo
2. Overflow dropdown ("Más") contains: Instrumentador, Historial
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
13. No stale imports of removed components remain
14. TypeScript compiles without errors

---

## T9: Verify and Validate

- **Status**: ready
- **Estimated complexity**: S

### Description

Final verification, cleanup, and browser QA. No code changes except potential minor fixes found during verification. Check for stale imports, unused files, visual regressions, and acceptance criteria compliance.

### Files to change

- Potentially `src/components/expediente/ResumenExpediente.tsx` (verify named exports work)

### Files to create

(none)

### Dependencies

- T8 (all implementation tasks must be complete)

### What to verify

1. **Build**: `npm run build` succeeds without errors

2. **TypeScript**: No type errors in any changed or dependent file

3. **Visual inspection — Ficha operative surface**:
   - The ficha reads as THE operative surface, not a decorative card sitting above tabs
   - Zone A: identity row is a single scan line
   - Zone B: context descriptors and role pills are compact
   - Zone C: timeline + chips + alerts are the operative reading zone
   - Zone D: references + actions are in one row
   - No utility strip with back button inside the ficha

4. **Visual inspection — Tab consolidation**:
   - All 7 navigation items are visible (6 tabs + Más dropdown)
   - Clicking each tab renders correct content
   - Overflow dropdown contains Instrumentador and Historial
   - No "Resumen" tab exists
   - No "Cirugía" tab exists as a separate tab

5. **Visual inspection — Zero duplication**:
   - No identity field appears in both ficha top and Ficha tab content
   - No status chips appear in both ficha top and any tab
   - No timeline duplication
   - Comprobantes in Ficha tab = overview only; Comercial tab = full detail

6. **Visual inspection — Visual anchoring**:
   - No visual gap or color break between ficha bottom and tab strip
   - Tab strip background matches ficha surface
   - Ficha + tab strip + tab content render inside one rounded border shell
   - Active tab indicator ties to the ficha

7. **Content preservation**: All content from eliminated tabs (resumen, cirugia, presupuesto, remitos, comprobantes, transito, notas, trazabilidad) is accessible in the new consolidated tabs

8. **ResumenExpediente exports**: Verify `FVCard` and `EstadoCobranzaBadge` are importable as named exports and used by `FichaTabContent`

9. **Old tab URLs/states**: Verify that URLs or stored state referencing old tab keys (e.g., `?tab=resumen`) gracefully redirect to `"ficha"`

10. **No console errors or warnings** in the browser

### Guardrails

- This is a verification-only task — do NOT make structural changes
- If issues are found, document them but do NOT implement fixes without explicit approval
- Minor fixes (stale imports, typos) are acceptable; architectural changes are not

### Verification steps

1. `npm run build` succeeds
2. Manual walkthrough of all 8 tab views (6 primary + 2 overflow)
3. Verify no content loss from eliminated tabs
4. Verify zero duplication between ficha top and Ficha tab
5. Verify visual anchoring (ficha + tabs as one unit)
6. Verify responsive behavior on smaller screens
7. Check `ResumenExpediente.tsx` named exports work correctly
8. Verify old tab URLs/states are gracefully handled by the fallback
9. No console errors or warnings

---

## Dependency Graph

```
T1 ─────────────────────────────────────────┐
T2 ──→ T3 ──────────────────────────────────┤
T4 ─────────────────────────────────────────┤
T5 ─────────────────────────────────────────┤──→ T8 ──→ T9
T6 ─────────────────────────────────────────┤
T7 ─────────────────────────────────────────┘
```

**Parallelizable tasks**: T1, T2, T4, T5, T6, T7 can all run in parallel (no file overlap).
**Sequential**: T2 → T3 (T3 needs FichaCirugia compact prop).
**Sequential**: T1 + T3 + T4 + T5 + T6 + T7 → T8 (T8 needs all new components and constants).
**Sequential**: T8 → T9 (verification after all changes).

---

## File Ownership Matrix

| Task | Files Owned |
|------|------------|
| T1 | `src/lib/cirugias.constants.ts` |
| T2 | `src/components/expediente/FichaCirugia.tsx` |
| T3 | `src/components/expediente/FichaTabContent.tsx` (new), `src/components/expediente/ResumenExpediente.tsx` (named exports only) |
| T4 | `src/components/expediente/ComercialTabContent.tsx` (new) |
| T5 | `src/components/expediente/DocumentacionTrazabilidadTab.tsx` (new) |
| T6 | `src/components/expediente/LogisticaTabContent.tsx` (new) |
| T7 | `src/components/expediente/ExpedienteHeader.tsx` |
| T8 | `src/components/expediente/ExpedienteFullView.tsx` |
| T9 | (read-only verification) |

No two tasks write to the same file. All new files are unique per task. Only T3 touches an existing file (`ResumenExpediente.tsx`) and only to add named exports.
