# CURRENT_STATE.md — Estado actual del prototipo/repo OSSUM COR

Estado: borrador inicial para GPT-027F.0A  
Tipo: estado real del proyecto, no visión final

---

## Resumen

El proyecto tiene un frontend/prototipo avanzado con múltiples módulos modelados en UI y estado local, pero ya empezó a incorporar slices puntuales de persistencia real en backend/DB para reducir dependencia del navegador.

El estado actual sigue sirviendo como referencia funcional y UX, no como arquitectura final completa.

---

## Estado técnico conocido

- Frontend con Next.js / React / TypeScript / Tailwind.
- shadcn/ui y componentes UI modernos.
- Zustand/localStorage como fuente temporal del prototipo en varias áreas.
- Cirugías ya tiene persistencia server-first para preferencias activas de vista por usuario + empresa.
- Persisten datos mock o locales en otras áreas.
- Prisma + PostgreSQL/Supabase ya gobiernan slices reales puntuales, pero no todo el producto.
- Auth productivo todavía no está cerrado como arquitectura final global.
- Backend foundation existe de forma parcial y progresiva, no cerrada al 100% en todo el ERP.

---

## Módulos con distintos grados de avance frontend

- Cirugías.
- Expediente.
- Wizard Nueva Cirugía.
- Contactos.
- Presupuestos.
- Remitos.
- Consumos.
- Comparativa.
- Facturación/Cobros.
- Coordinadores.
- Calendario / agenda.
- Tableros operativos.

---

## Decisiones recientes de UI/UX a conservar como referencia

- Cirugías debe mantener lectura operativa clara.
- La tabla de Cirugías es central.
- Doble click o acción directa debe abrir expediente.
- Filtros rápidos visibles.
- Filtros avanzados cuando corresponda.
- Columnas configurables y reordenables.
- Acciones por fila funcionando.
- Estado CX separado de preparación/material.
- Indicadores de documentación, consumo y facturación con neutralidad visual.
- Evitar preview lateral fijo si roba espacio.
- Evitar KPIs arriba si reducen operación.

---

## Riesgos técnicos actuales

- Zustand/localStorage puede confundirse con fuente final en módulos que todavía no migraron.
- Los módulos mock pueden parecer implementados cuando son maqueta.
- Cirugías y Expediente son módulos sensibles; no tocar sin scope.
- Cambios UI pueden romper flujos ya validados.
- Bugs de Radix/Tooltip/Portal o loops deben tratarse con Diagnose.
- Inline selectors o `.filter()` en Zustand pueden provocar renders o loops.

---

## Estado puntual — Cirugías / preferencias de vista

- La vista de Cirugías ya no depende principalmente de `localStorage` para la preferencia activa.
- La preferencia activa de tabla ahora se persiste en backend por `usuario + empresa + moduleKey` usando `UserModuleViewPreference`.
- El flujo actual es server-first con fallback temporal a `localStorage`.
- Existe migración one-shot desde preferencias legacy del navegador hacia backend cuando el server todavía no tiene registro.
- Los encabezados agrupados (`grouped headers`), columnas visibles, orden, anchos, columnas fijas, sticky y compacto ya entran en el snapshot persistido.
- Las plantillas guardadas del modal siguen locales en esta etapa y todavía no migraron a DB.

---

## Cómo usar este documento

Los agentes deben usar este archivo para entender el estado real del repo antes de tocar código.

No debe usarse para definir el producto final. Para eso usar:

- `PROJECT_BRIEF.md`
- `CANONICAL_DECISIONS.md`
- `domain/*`
- `architecture/*`

---

## Snapshot operativo ya confirmado

- Prisma está activo y conectado a PostgreSQL/Supabase.
- `UserModuleViewPreference` existe en `schema.prisma`, en la DB remota y en `_prisma_migrations`.
- Cirugías ya usa persistencia server-first para la preferencia activa de vista.
- El endpoint company-scoped `GET/PUT /api/companies/[companyId]/surgeries/view-preferences` ya está operativo.
- La UI de Cirugías conserva fallback temporal a `localStorage` solo para transición y migración legacy.
- Las plantillas guardadas del modal siguen siendo mock/locales y no forman parte todavía de la persistencia server.

---

## Snapshot operativo — Ficha CX Remito/Consumo/Devolución/Trazabilidad

- Ficha CX es la superficie vigente para operar el expediente de cirugía; `/expediente`, `/consumo` y `/trazabilidad` standalone quedan legacy/deprecadas con aviso visible.
- Remitos están backend-backed: contrato/API/docs sincronizados, `/remitos` integrado, resumen y panel en Ficha CX conectados, acciones de emisión/transición/devolución e impresión/PDF desde navegador.
- Consumos están integrados V0 en Ficha CX con API client/hook y `ConsumoPanel` backend-backed para lectura, validación y borrado de borrador.
- Devoluciones están integradas V0 con API client/hook y `DevolucionesPanel` para confirmar y borrar borradores.
- Trazabilidad V0 es derivada/read-only desde Remito, Consumo, Devolución y AuditEvent mediante endpoint `GET /api/companies/[companyId]/surgeries/[surgeryId]/trace`; no usa `traceEntries` como fuente final.
- QA técnico previo informado: typecheck + unit trace/remito/consumo/devolución pasaron, 59/59 tests relevantes.
- Browser QA sigue pendiente; stock fino (`StockMovement`, lote, serie, vencimiento, caja física) queda para fase futura con aprobación explícita.
