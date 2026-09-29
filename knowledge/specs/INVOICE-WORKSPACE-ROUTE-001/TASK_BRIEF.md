# TASK BRIEF — OSSUM COR

## Task ID / Name
INVOICE-WORKSPACE-ROUTE-001 — Facturación Workspace en ruta propia /ventas/facturacion/nueva

## Objective
Reemplazar el modal "Nueva Factura (Grilla)" por un workspace de pantalla completa en ruta propia `/ventas/facturacion/nueva`, manteniendo Facturación como consola/listado y tomando Presupuesto y Nueva Cirugía como referencias visuales y operativas.

## Agent Role
Frontend / UI Agent & Fullstack Integration

## Selected LLM
Claude / Antigravity

## Mode
Implementation & QA

## Scope
- Crear página `/ventas/facturacion/nueva` (`src/app/ventas/facturacion/nueva/page.tsx` y componente `src/components/facturacion/InvoiceWorkspace.tsx`).
- Encabezado comercial con selector de contactos/obras sociales/instituciones y autocompletado de datos derivados.
- Workspace de ítems con grilla ágil estilo Excel (`InvoiceItemsTable`), navegación con Tab/Enter, catálogo backend (F2), alta/baja de filas.
- Layout responsive: grilla central, resumen sticky de liquidación a la derecha en desktop (debajo en mobile), banda colapsable inferior (Condiciones comerciales, Entrega/Origen, Observaciones) y footer fijo de acciones (Cancelar, Guardar borrador).
- Advertencia de confirmación antes de descartar cambios si el formulario está sucio (`dirty`).
- Actualizar el listado principal de Facturación (`/ventas/facturacion/page.tsx`) para redirigir a `/ventas/facturacion/nueva` mediante el botón principal `+ Nueva Factura`.
- Validaciones con tests unitarios y de componentes.

## Allowed Files
- `src/app/ventas/facturacion/nueva/page.tsx`
- `src/components/facturacion/InvoiceWorkspace.tsx`
- `src/app/ventas/facturacion/page.tsx`
- `src/components/facturacion/InvoiceHeaderCompact.tsx`
- `src/components/facturacion/InvoiceItemsTable.tsx`
- `src/components/facturacion/InvoiceStickySummary.tsx`
- `src/hooks/useInvoiceForm.ts`
- `src/__tests__/**`

## Forbidden Files
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/lib/db.ts`
- `src/lib/permissions/**`
- Auth / proveedores de base de datos / contratos fiscales backend

## Validation Required
- `npm test` focalizado en facturación, hooks y componentes.
- TypeScript check `tsc --noEmit` sin errores en archivos modificados.
- UI design detector `detect.mjs` sin violaciones.

## Output Format
Caveman handoff + code artifacts.
