# Handoff — Cadena operativa Ficha CX backend-backed V0

Fecha: 2026-07-08  
Task: OPS-FICHA-CX-HANDOFF-001  
Estado: **cierre operativo documentado**  
Modo: docs / handoff  

---

## 1. Estado de fase

La cadena operativa de **Ficha CX** queda documentada como **backend-backed V0** para:

- Remitos.
- Consumos.
- Devoluciones.
- Trazabilidad derivada.
- Avisos legacy en páginas standalone.

La superficie vigente para operar por cirugía es **Ficha CX dentro de Cirugías**. Las rutas standalone `/expediente`, `/consumo` y `/trazabilidad` siguen accesibles, pero fueron marcadas con avisos de vista legacy/deprecada para evitar que futuros agentes las tomen como superficie principal.

---

## 2. Qué está hecho

### 2.1 Remitos

- Contrato backend/documental sincronizado en `knowledge/specs/REMITO-UNIFICADO/`.
- API company-scoped de remitos disponible:
  - listado/creación;
  - detalle;
  - actualización de borrador;
  - emisión;
  - transición de estado;
  - devolución explícita;
  - borrado de borrador.
- `/remitos` opera contra backend vía `useRemitos` + `src/lib/api/remitos.ts`.
- Ficha CX muestra resumen compacto backend-backed mediante `RemitosSummaryCard`.
- Panel de Logística/Ficha CX conectado a backend para remitos; acciones emiten/transicionan y refrescan el estado operativo.
- Impresión / guardar PDF se resuelve desde navegador, sin PDF server-side.

### 2.2 Consumos

- API client/hook creados para consumos:
  - `src/lib/api/consumos.ts`.
  - `src/hooks/useConsumos.ts`.
- `ConsumoPanel` integrado a backend para lectura por cirugía/remito y acciones V0.
- Validación de consumo disponible desde panel/hook.
- Borrado de borrador disponible.

### 2.3 Devoluciones

- API client/hook creados para devoluciones:
  - `src/lib/api/devoluciones.ts`.
  - `src/hooks/useDevoluciones.ts`.
- `DevolucionesPanel` integrado en Ficha CX.
- Confirmación de devolución disponible.
- Borrado de borrador disponible.

### 2.4 Trazabilidad

- Contrato de trazabilidad derivada documentado en `knowledge/specs/TRACE-DERIVED-CONTRACT/DESIGN.md`.
- Endpoint implementado para lectura derivada:
  - `GET /api/companies/[companyId]/surgeries/[surgeryId]/trace`.
- Service/hook/API client integrados:
  - `src/lib/services/trace.service.ts`.
  - `src/lib/api/trazabilidad.ts`.
  - `src/hooks/useTrazabilidad.ts`.
- `TrazabilidadPanel` consume backend derivado.
- Regla clave: **no usar `traceEntries` como fuente final**. La trazabilidad V0 se deriva de Remito, Consumo, Devolución y AuditEvent, con `StockMovement` reservado para fase futura.

### 2.5 Legacy standalone notices

- Aviso legacy/deprecado agregado a:
  - `/expediente`.
  - `/consumo`.
  - `/trazabilidad`.
- Componente reutilizable:
  - `src/components/legacy/LegacyStandaloneNotice.tsx`.

### 2.6 QA técnico ya pasado

- Typecheck pasado en la validación técnica previa.
- Unit de trazabilidad pasado.
- Unit de remito/consumo/devolución pasados.
- Resultado informado: **59/59 tests relevantes pasados**.

Browser QA queda pendiente.

---

## 3. Riesgos y gaps abiertos

1. **Browser QA pendiente.** Falta validar visualmente Ficha CX completa con datos reales/seed: Remitos, Consumo, Devoluciones y Trazabilidad.
2. **Creación de Devolución pendiente.** El panel permite confirmar/borrar borradores, pero falta cerrar UX/endpoints de creación desde Ficha CX si no existe borrador previo.
3. **Semántica `RemitoItem.returnedQuantity` vs `DevolucionItem.returnedQuantity`.** El contrato de trazabilidad ya separa ambas señales; falta decisión/implementación final sobre sincronización o conflicto.
4. **Consumo creation/edit/emit pendiente.** La lectura, validación y borrado de borrador están integrados; falta UX/endpoints completos para crear, editar y emitir/confirmar consumo desde Ficha CX.
5. **Múltiples consumos.** Falta selector o vista consolidada cuando una cirugía tiene varios consumos/remitos; hoy el panel V0 prioriza una lectura operativa simple.
6. **Stock fino futuro.** `StockMovement`, lote, serie, vencimiento, cajas físicas y saldos reales siguen fuera de V0. La trazabilidad muestra gaps esperados cuando no existen esas fuentes.
7. **Legacy pages accesibles.** `/expediente`, `/consumo` y `/trazabilidad` siguen disponibles; los avisos reducen riesgo pero no bloquean navegación.
8. **Dirty tree amplio.** `git status --short` muestra un working tree muy cargado con cambios previos no relacionados. Evitar mezclar este cierre documental con commits de código.
9. **Git diff/object issue.** No se revalidó un problema específico de objetos Git en este task; si reaparece durante revisión/commit, tratarlo como riesgo operativo separado y no como falla funcional de la cadena Ficha CX.

---

## 4. Próximas tareas recomendadas

Orden sugerido:

1. **Browser QA Ficha CX ops**: abrir una cirugía backend-backed y recorrer Logística/Consumo/Devoluciones/Trazabilidad; validar loading/error/empty states, acciones y refresh.
2. **Consumo V0 completion**: creación, edición y emisión/confirmación desde Ficha CX, reutilizando `Consumo` backend sin duplicar lógica en store.
3. **Devolución V0 creation**: crear devolución desde remito/consumo, confirmar y reflejarla en trazabilidad.
4. **Selector/consolidado de consumos**: resolver UX para múltiples consumos por cirugía/remito.
5. **Semántica devueltos**: decidir con Franco si `Devolucion` debe mutar `RemitoItem.returnedQuantity`, cuándo y cómo se audita.
6. **Stock/trace V1**: diseñar `StockMovement`, lote/serie/vencimiento y caja física con aprobación previa de Franco por schema/migraciones.
7. **Legacy cleanup plan**: decidir si se bloquean, redirigen o retiran rutas standalone cuando Ficha CX quede validada por browser.

---

## 5. Archivos relevantes

### Docs

- `knowledge/specs/REMITO-UNIFICADO/PROPOSAL.md`.
- `knowledge/specs/REMITO-UNIFICADO/DESIGN.md`.
- `knowledge/specs/TRACE-DERIVED-CONTRACT/DESIGN.md`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/worklog/HANDOFF_OPERATIVE_CHAIN_FICHA_CX_2026-07-08.md`.
- `knowledge/core/CURRENT_STATE.md`.

### API / services / validators

- `src/app/api/companies/[companyId]/remitos/**`.
- `src/app/api/companies/[companyId]/consumos/**`.
- `src/app/api/companies/[companyId]/devoluciones/**`.
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/trace/route.ts`.
- `src/lib/services/remito.service.ts`.
- `src/lib/services/consumo.service.ts`.
- `src/lib/services/devolucion.service.ts`.
- `src/lib/services/trace.service.ts`.
- `src/lib/validators/remito.ts`.
- `src/lib/validators/consumo.ts`.
- `src/lib/validators/devolucion.ts`.

### API clients / hooks

- `src/lib/api/remitos.ts`.
- `src/lib/api/consumos.ts`.
- `src/lib/api/devoluciones.ts`.
- `src/lib/api/trazabilidad.ts`.
- `src/hooks/useRemitos.ts`.
- `src/hooks/useConsumos.ts`.
- `src/hooks/useDevoluciones.ts`.
- `src/hooks/useTrazabilidad.ts`.

### UI Ficha CX / legacy notices

- `src/components/expediente/ExpedienteFullView.tsx`.
- `src/components/expediente/LogisticaTabContent.tsx`.
- `src/components/expediente/LogisticaPanel.tsx`.
- `src/components/expediente/RemitosPanel.tsx`.
- `src/components/expediente/RemitosSummaryCard.tsx`.
- `src/components/expediente/ConsumoPanel.tsx`.
- `src/components/expediente/DevolucionesPanel.tsx`.
- `src/components/expediente/TrazabilidadPanel.tsx`.
- `src/components/legacy/LegacyStandaloneNotice.tsx`.
- `src/app/expediente/page.tsx`.
- `src/app/consumo/page.tsx`.
- `src/app/trazabilidad/page.tsx`.

---

## 6. Handoff Caveman

Done:
- Documentado el estado técnico actual de la cadena operativa Ficha CX backend-backed V0.

Changed:
- Sólo documentación/handoff. Sin código, schema ni migraciones.

Files:
- `knowledge/worklog/HANDOFF_OPERATIVE_CHAIN_FICHA_CX_2026-07-08.md`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/core/CURRENT_STATE.md`.

Validations:
- Coherencia revisada contra docs de Remito/Trazabilidad, mapa de repo, grep de archivos relevantes y `git status --short`.
- No se ejecutaron tests por scope documental; se registró QA técnico previo informado: typecheck + unit trace/remito/consumo/devolución, 59/59.

Risks:
- Browser QA pendiente.
- Dirty tree amplio preexistente.

Next:
- Ejecutar Browser QA de Ficha CX ops antes de declarar cierre funcional completo.
