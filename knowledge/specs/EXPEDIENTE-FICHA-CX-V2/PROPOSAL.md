# Proposal — EXPEDIENTE-FICHA-CX-V2

Status: proposed  
Change: `EXPEDIENTE-FICHA-CX-V2`  
Supersedes: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)

---

## Summary

Replace the current ExpedienteHeader + Resumen tab + 14-tab fragmented layout with a unified **Ficha de CX** operative surface and a consolidated 7-tab structure. The P1 implementation added a better header block but left the fundamental problems unsolved: the ficha still feels like an additional card sitting above tabs, 14 tabs fragment and overlap operational scope, Resumen is a redundant middle layer, and identity data appears in three places.

V2 makes the ficha THE operative surface — not a card, not a header block, but the point of control — and consolidates tabs from 14 → 7 by grouping overlapping domains into coherent operational scopes.

This is a desktop-first, ERP quirúrgico information-architecture and UI change only. No backend, auth, schema, store, business-rule, or workflow changes.

---

## Motivation — Why P1 was rejected

The EXPEDIENTE-FICHA-CX-UNIFIED-P1 implementation (Proposal → Spec → Design → Apply) delivered a 5-zone ExpedienteHeader block above tabs. The user's verdict:

> "Adding a block but not solving the fundamental problem."

The fundamental problems P1 did not solve:

1. **Header-as-card, not operative surface.** The ficha is still a card that sits ABOVE tabs. It reads as "here is some context, now go find your work in the tabs below." An ERP operative surface must BE the work — the point of control from which everything flows.

2. **14 tabs with fragmentation and overlap.** Presupuesto / Comprobantes / Facturación share commercial scope but are three separate tabs. Documentación / Trazabilidad share doc scope. Logística / Tránsito / Preparación share logistics scope. The operator must navigate between overlapping tabs to complete a single operational task.

3. **Identity in 3 places.** Patient, surgeon, institution, state appear in the header, in Resumen (already cleaned in P1, but FichaCirugia still duplicates), and in FichaCirugia.

4. **Resumen is a redundant middle layer.** Its unique content (leyenda destacada, comprobantes overview, últimas novedades) should be distributed into their natural homes rather than requiring a dedicated tab as a catch-all.

5. **Tabs float below the header card.** The tab strip is a disconnected navigation bar, not part of the same visual unit as the ficha.

---

## Proposed Solution

### A. Replace header + Resumen with unified Ficha Operativa

The top section becomes the "Ficha de CX" — a single operative surface that IS the expediente, not an extra block decorating it.

**Identity anchor** (always visible, no tab needed):
- ID CX, Paciente, DNI, Médico, Institución, Cliente/financiador, Fecha CX, Hora
- Clasificación, Coordinador, Vendedor, Instrumentador, Urgente

**Circuito operativo**:
- 6-stage macro timeline: Sin autorizar → Autorizado → Pendiente → Tránsito → Realizada → Finalizada
- Substates render as chips (Preparación family, Apta para facturar, etc.) — never timeline stages

**Estados rápidos**:
- Inline chips: Estado CX, Preparación, Documentación, Consumo, Facturación, Cobranza

**Pendiente principal**:
- Blocking reason visible inside ficha, not in a separate section

**Referencias administrativas**:
- Compact inline strip (PR, NR, FV, Expediente #, etc.)

**Acciones principales**:
- Visible but not invasive trio: Editar ficha, PR slot (Generar PR / Ver PR), Más acciones

**Visual rules**:
- Desktop-first ERP quirúrgico moderno
- Ficha is the point of control — not a card, THE surface
- Tabs anchor directly below ficha as part of the same visual unit
- Strong colors only for alerts/critical states
- Compact and operative, not decorative

### B. Consolidate 14 tabs → 7 tabs

| # | Tab Key | Label | Absorbs | Content |
|---|---------|-------|---------|---------|
| 1 | `ficha` | Ficha | resumen + cirugía + notas | Full editable surgery record, observations, notes, references. No identity duplication (already in ficha top). FichaCirugia becomes the edit form inside this tab. Leyenda destacada and últimas novedades from old Resumen land here. |
| 2 | `comercial` | Comercial | presupuesto + comprobantes + facturación aspects | PR, remitos, facturas, comprobantes, amounts, due dates, commercial status, cobranza detail. The entire commercial lifecycle from quote to payment. |
| 3 | `consumo` | Consumo | consumo (standalone) | Consumption, differences, used material, returned material, validation. |
| 4 | `documentacion` | Doc. y trazabilidad | documentacion + trazabilidad | Documental checklist, attachments, signed remitos, lot/serial, implant traceability, evidence. Unified doc scope. |
| 5 | `logistica` | Logística | logistica + transito + preparación aspects | Departure, transport, logistics date, shipment date, box status, material in transit, movements. Unified logistics scope. |
| 6 | `correo` | Correo | correo (standalone) | Emails, WhatsApp, sent communications, message log. |
| 7 | — (overflow) | Más | instrumentador + historial + other secondary | Instrumentador detail, full history log, and any secondary or infrequent info. |

**Rationale for each consolidation**:

- **Ficha** absorbs Resumen + Cirugía + Notas because: the surgery record IS the case; leyenda and novedades belong with the case record; notes are case-level; Resumen was always a proxy for "things that didn't have a home."
- **Comercial** absorbs Presupuesto + Comprobantes + Facturación because: they share a single commercial lifecycle (quote → remito → invoice → payment); operators think in commercial flow, not in document-type silos.
- **Consumo** stays standalone because: consumption is a distinct operational act with its own validation rules and material flow; merging it would dilute its focused workflow.
- **Doc. y trazabilidad** absorbs Documentación + Trazabilidad because: both are about document and implant evidence; traceability without documentation context is incomplete; signed remitos bridge both.
- **Logística** absorbs Logística + Tránsito + Preparación aspects because: departure, transport, material movement, and box status are one logistics chain; separating them creates artificial navigation.
- **Correo** stays standalone because: communication is orthogonal to the surgery record and commercial/logistics flow; it has its own interaction patterns.
- **Más** as overflow keeps instrumentador, historial, and secondary info accessible without cluttering the primary tab strip.

### C. Tabs anchored to ficha

Tabs must be visually attached to the ficha surface (not floating as a separate navigation bar). The structure is:

```
┌─ Ficha de CX (unified operative surface) ──────────────────────┐
│  Identity anchor · Timeline · States · Pendiente · Refs        │
│  Actions                                                        │
├──────────────────────────────────────────────────────────────────┤
│ [Ficha] [Comercial] [Consumo] [Doc.] [Logística]               │
│ [Correo]                                         [Más ▼]       │
├──────────────────────────────────────────────────────────────────┤
│ Tab content (full width, scrollable)                            │
└──────────────────────────────────────────────────────────────────┘
```

Key difference from P1: the ficha + tab strip + tab content are ONE visual unit (one rounded shell), not a header card with a separate tab bar floating below it.

### D. Zero duplication rule

- If identity/status/refs are in the ficha top, the **Ficha tab** does NOT repeat them identically — it shows extended detail or edit forms only.
- **Resumen tab is eliminated entirely** — its unique content (leyenda destacada, comprobantes overview, últimas novedades) moves to:
  - Leyenda destacada → Ficha tab (case notes section)
  - Comprobantes overview → Comercial tab (commercial lifecycle)
  - Últimas novedades → Ficha tab (observations/notes section)
- **FichaCirugia merges into the Ficha tab** as the editable form — not a separate tab for the same record.
- Priority: quick read above, operative detail below.

---

## Scope

### Primary files expected to change

- `src/components/expediente/ExpedienteFullView.tsx` — shell restructure, tab mapping, ficha/tabs as one unit
- `src/components/expediente/ExpedienteHeader.tsx` — transformation into operative surface (not a card)
- `src/components/expediente/ResumenExpediente.tsx` — eliminated as standalone tab; content redistributed
- `src/components/expediente/FichaCirugia.tsx` — merges into Ficha tab as edit form
- `src/components/expediente/PresupuestoPanel.tsx` — becomes section inside Comercial tab
- `src/components/expediente/ComprobantesAsociados.tsx` — becomes section inside Comercial tab
- `src/components/expediente/RemitosPanel.tsx` — becomes section inside Comercial tab
- `src/components/expediente/DocumentacionPanel.tsx` — merges with Trazabilidad into Doc. y trazabilidad tab
- `src/components/expediente/TrazabilidadPanel.tsx` — merges with DocumentacionPanel
- `src/components/expediente/LogisticaPanel.tsx` — absorbs MaterialTransitoPanel
- `src/components/expediente/MaterialTransitoPanel.tsx` — absorbed into LogisticaPanel
- `src/components/expediente/NotasPanel.tsx` — content moves into Ficha tab
- `src/lib/cirugias.constants.ts` — EXPEDIENTE_TABS restructure (14 → 7)

### New files expected

- `src/components/expediente/ComercialTab.tsx` — unified commercial lifecycle tab
- `src/components/expediente/DocumentacionTrazabilidadTab.tsx` — unified doc + traceability tab
- `src/components/expediente/LogisticaUnificadaTab.tsx` — unified logistics tab
- `src/components/expediente/FichaTab.tsx` — container that hosts FichaCirugia edit form + notes + leyenda

### Files intentionally unchanged

- `src/components/expediente/ConsumoPanel.tsx` — stays as-is, just re-keyed
- `src/components/expediente/correo/ExpedienteCorreoTab.tsx` — stays as-is, just re-keyed
- `src/components/expediente/InstrumentadorPanel.tsx` — moves to overflow, content unchanged
- `src/components/expediente/HistorialPanel.tsx` — moves to overflow, content unchanged
- `src/app/cirugias/page.tsx` — no structural ownership change
- `src/lib/businessRules.ts` — no changes
- `src/lib/cirugias.utils.ts` — no changes beyond what's needed for tab restructure

---

## Risks

### R1 — Tab consolidation breaks muscle memory

Operators accustomed to 14 tabs may be disoriented by 7 consolidated tabs. **Mitigation**: the Ficha tab becomes the default landing tab (replacing Resumen); Comercial is the second tab; the most frequent operations are in the first 3 tabs. Overflow items remain accessible via Más.

### R2 — Comercial tab becomes too wide

Merging PR + Remitos + Comprobantes + Facturación + Cobranza into one tab risks creating an overwhelming scroll surface. **Mitigation**: the Comercial tab should use sub-section navigation or accordion sections internally, not a flat vertical scroll of all commercial data.

### R3 — FichaCirugia merge creates edit-mode confusion

FichaCirugia currently has its own edit/view toggle. Merging it into the Ficha tab means the tab serves dual duty (read + edit). **Mitigation**: the Ficha tab defaults to read mode; Editar ficha switches to edit mode in-place, maintaining the same UX pattern but within the Ficha tab instead of a separate tab.

### R4 — Resumen content redistribution loses discoverability

Leyenda destacada and comprobantes overview were surfaced in Resumen as the landing tab. Moving them to Ficha and Comercial may reduce visibility. **Mitigation**: the Ficha tab is the new default landing tab and surfaces leyenda prominently; Comercial tab has a clear comprobantes summary at the top.

### R5 — Header bloat (inherited from P1)

The ficha operative surface still risks being a dense wall. **Mitigation**: the ficha is the point of control with strict visual hierarchy — identity first, timeline/states second, actions third, refs fourth. No decorative spacing. Compact and operative.

### R6 — EXPEDIENTE_TABS restructure affects shared constants

Changing the tab array in `cirugias.constants.ts` may affect other consumers. **Mitigation**: only restructure the `EXPEDIENTE_TABS` array; do not touch guardrails, state maps, color maps, or column definitions. The `COMPACT_TABS` array should also be updated to match.

---

## Out of Scope

- Any backend, auth, Prisma, schema, migration, service, validator, permission, or audit change
- Any new workflow stage, business-rule mutation, or data-model change
- Any return to a lateral preview or split master/detail layout
- KPI cards or dashboard metrics
- Mobile redesign (desktop-first; smaller breakpoints may degrade gracefully)
- Treating Preparación substates or Apta para facturar as top-level timeline stages
- Changes to `src/lib/businessRules.ts`
- Changes to `src/lib/cirugias.utils.ts` guardrails beyond tab restructure
- Store/Zustand changes
- New dependencies or package installations

---

## Dependencies

### Internal

- Current ExpedienteHeader implementation (P1 artifact) — available as refactor base
- Current ExpedienteFullView shell — available
- All existing tab panels — available for redistribution
- `EXPEDIENTE_TABS` constant in `cirugias.constants.ts` — available for restructure

### Constraint dependencies

- AGENTS.md prohibitions remain active: no backend/auth/schema/critical cross-domain changes
- This proposal depends on keeping the redesign desktop-first and UI-only
- Macro timeline stays at 6 stages (Option A confirmed)
- Substates stay as chips, never timeline stages
- No touching `cirugias.constants.ts` guardrails beyond `EXPEDIENTE_TABS` restructure

---

## Success Criteria

- The expediente full view has one clearly dominant **Ficha de CX** operative surface — not a card, THE surface
- Tabs are consolidated from 14 → 7 with no content loss
- Resumen tab is eliminated; its unique content is distributed to Ficha and Comercial
- FichaCirugia is accessible inside the Ficha tab, not as a separate tab
- Identity/status/refs appear in exactly one place (the ficha top), not duplicated in tabs
- The ficha + tab strip + tab content read as one continuous shell
- The macro timeline stays limited to 6 approved stages
- Operators can identify case identity, macro status, blocking reason, and next action from the ficha without entering any tab
- Desktop-first, operative, not decorative

---

## Proposed Next Step

Proceed to `sdd-spec` for `EXPEDIENTE-FICHA-CX-V2` and define:

1. exact ficha operative surface layout zones and visual hierarchy
2. tab consolidation mapping rules (which component maps to which section inside each new tab)
3. zero-duplication enforcement rules
4. FichaCirugia integration behavior within the Ficha tab (edit mode UX)
5. Comercial tab internal section structure
6. acceptance criteria for each consolidated tab
7. migration path from current 14-tab `EXPEDIENTE_TABS` to new 7-tab structure
