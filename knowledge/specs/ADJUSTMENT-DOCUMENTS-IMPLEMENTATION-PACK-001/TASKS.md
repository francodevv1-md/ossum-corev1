# Tasks & Implementation Plan — Documentos de Ajuste Multi-Origen

## Phase 1: Schema & DB Artifacts (Gate: Requiere aprobación de Franco)
- [ ] Declarar modelos `AdjustmentDocument` y `AdjustmentDocumentItem` en `prisma/schema.prisma`.
- [ ] Ejecutar `prisma format` y `prisma generate`.
- [ ] Crear artefacto de migración aditiva `prisma/migrations/20260929150000_adjustment_documents_multi_origin/migration.sql`.
- [ ] Aplicar migración únicamente tras confirmación de base de datos DEV descartable.

## Phase 2: Backend Core & Validators
- [ ] Implementar `src/lib/validators/adjustment-document.ts` con validación Zod de orígenes, límites de comprobantes asociados, fechas y montos.
- [ ] Extender `src/lib/validators/fiscal-tusfacturas.ts` para soportar `comprobantes_asociados` y `comprobantes_asociados_periodo`.
- [ ] Crear `src/lib/services/adjustment-document.service.ts` con operaciones transaccionales seguras y cálculo de balances.
- [ ] Extender `src/lib/services/fiscal-tusfacturas.service.ts` para mapear tipos NC/ND y bloques de comprobantes asociados.

## Phase 3: REST API Endpoints
- [ ] Implementar `src/app/api/companies/[companyId]/adjustment-documents/route.ts` (`GET` listado / `POST` crear borrador).
- [ ] Implementar `src/app/api/companies/[companyId]/adjustment-documents/[id]/route.ts` (`GET` detalle).
- [ ] Implementar `src/app/api/companies/[companyId]/adjustment-documents/[id]/emit/route.ts` (`POST` emisión operativa y fiscal).
- [ ] Implementar `src/app/api/companies/[companyId]/adjustment-documents/[id]/void/route.ts` (`POST` anulación).

## Phase 4: UI & Adapter Integration
- [ ] Actualizar selector de Paso 1 (`NuevoAjustePaso1Modal.tsx`) para permitir elegir entre los 3 orígenes:
  1. Factura OSSUM emitida.
  2. Comprobante externo previo (formulario de snapshot: tipo, PV, número, fecha, CUIT, CAE opcional).
  3. Período desde/hasta (disponible solo para usuario con rol `admin`).
- [ ] Conectar `/ventas/documentos-ajuste/nueva` y `useDocumentosAjuste` a las API Routes backend.
- [ ] Conectar `DocumentoAjusteDetailDrawer.tsx` para refrescar estado en tiempo real.

## Phase 5: Verification & Quality Gates
- [ ] Pruebas unitarias de validadores y servicios (origen interno, externo y período).
- [ ] Prueba de inmutabilidad de `Invoice.balance` ante NCs de comprobante externo.
- [ ] Prueba de restricción de rol `admin` para ajuste por período.
- [ ] Prueba de generación de PDF progresivo (Borrador sin QR, Emitida sin CAE con leyenda, Autorizada con QR).
- [ ] Vitest test suite completo en verde.
- [ ] TypeScript check sin regresiones.

---

## Test Plan Summary

1. **Test Origen Interno:** Crear NC para `Invoice` emitida -> Verificar que `Invoice.balance` disminuya al emitirse y que el bloque `comprobantes_asociados` contenga los datos de la factura interna.
2. **Test Origen Externo:** Crear NC para comprobante externo -> Verificar que se persista el snapshot inmutable y que ningún `Invoice.balance` interno sea modificado.
3. **Test Origen Período:** Crear ajuste por período como `admin` -> Verificar generación de `comprobantes_asociados_periodo`. Intentar crear con rol `vendedor` -> Debe ser rechazado (403 Forbidden).
4. **Test Prohibición Notas E por Período:** Intentar emitir nota E por período -> Debe ser rechazada por validador fiscal.
5. **Test Evidencia Fiscal Progresiva:** Verificar que documentos sin CAE no generen QR bajo ninguna circunstancia.

---

## Rollback Plan

- Si se detecta algún error de consistencia, revertir la migración aditiva eliminando las tablas `adjustment_document` y `adjustment_document_item`.
- La migración es puramente aditiva e independiente de las tablas de `invoice`, por lo que el rollback no compromete ningún dato preexistente de Facturación.
