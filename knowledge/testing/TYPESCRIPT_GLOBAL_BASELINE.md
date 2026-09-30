# TypeScript Global Baseline Report

## Metadata
- **Fecha**: 2026-09-30
- **Scope**: Reparación de contratos TypeScript en tests, fixtures, PDFs y componentes UI no sensibles
- **Baseline Inicial**: 90 errores en `npx tsc --noEmit`
- **Baseline Final**: **0 errores en todo el proyecto (`npx tsc --noEmit` -> 0 errors)**

---

## 1. Grupos Corregidos

### Grupo A: Tests y Fixtures Desactualizados
1. `src/__tests__/unit/coordination-preview-capability.test.ts`: Alineados contextos `ApiAuthContext` con `canonicalRole` y `rawRole`.
2. `src/__tests__/unit/coordination-view.service.test.ts`: Roles globales canónicos (`admin`, `operator`).
3. `src/__tests__/unit/erp-smoke-api-endpoints.test.ts`: Reemplazado `organizationId` con helper canónico `mockAuth`.
4. `src/__tests__/unit/logistics-operations-read.test.ts`: Alineado payload `{ actorUserId, role }` con tipo `Actor`.
5. `src/__tests__/unit/seguimiento-event-guard.test.ts`: Adaptado guard a capability `cirugias:mutate`.
6. `src/__tests__/unit/vat-commercial.test.ts`: Removido campo `description` innecesario en `calculateCommercialDocumentTotals`.
7. `src/__tests__/unit/adjustment-document.service.test.ts`: Añadidos defaults `discount: 0, vatRate: 21, vatTreatment: "GRAVADO"`, `modalidad: "PARCIAL" | "MANUAL"`, y `currency: "ARS"`.
8. `src/__tests__/components/CobroFormDialog.backend.test.tsx`: Actualizado a interfaz multi-imputación backend authority (`invoices: [invoice]`, `initialInvoice: invoice`, `imputations`, `Observaciones`).
9. `src/__tests__/components/ComparativaOperativaV0.test.tsx`: Alineado fixture con DTO canónico `SurgeryComparativaResponse` (`sources`, `summary`), mock `useAuth`, y textos de estado.
10. `src/__tests__/components/DefineDateModal.test.tsx`: Corregido `surgeon` en lugar de `doctor` y propiedades requeridas de `Surgery` (`urgente`, `leyendaDestacada`, `referenciasAdministrativas`).
11. `src/__tests__/components/CoordinatorActionConfirmDialog.test.tsx`: Completados campos requeridos de `Surgery`.
12. `src/__tests__/components/DocumentosAjuste.test.tsx`: Representación de cantidades como string (`"1"`, `"2"`).
13. `src/__tests__/components/NotificationMenu.test.tsx`: Añadidos campos canónicos `domain: "CIRUGIAS"`, `severity: "INFO"`, `linkHref`.

### Grupo B: Componentes y Contratos UI No Sensibles
1. `src/components/coordinadores/modal/DefineDateModal.tsx`: Corregido acceso `surgery.doctor` -> `surgery.surgeon`.
2. `src/components/pdf/documents/ConsumoQuirurgicoPDF.tsx`: Corregido `variant="base"`, removido `title` de `<Section>`, removido `weight` de `<TableCell>`, `leftText` en `<PageFooter>`.
3. `src/components/pdf/documents/DocumentoAjustePDF.tsx`: Corregido `variant="base"`.
4. `src/components/pdf/documents/FacturaPDF.tsx`: Corregido `variant="base"`, reemplazado `styles.cardTitle` con estilo inline en `<Text>`, removido `weight` de `<TableCell>`.
5. `src/components/pdf/documents/OrdenCompraPDF.tsx`: Corregido `variant="base"`, removido `title` de `<Section>`, removido `weight` de `<TableCell>`, `leftText` en `<PageFooter>`.
6. `src/components/pdf/documents/PresupuestoPDF.tsx`: Corregido `variant="base"`, removido `title` de `<Section>`, removido `weight` de `<TableCell>`, `leftText` en `<PageFooter>`.
7. `src/components/pdf/documents/RemitoPDF.tsx`: Corregido `variant="base"`, removido `title` de `<Section>`, removido `weight` de `<TableCell>`, `leftText` en `<PageFooter>`.
8. `src/app/ventas/facturacion/page.tsx`: Adaptado `CobroFormDialog` a multi-imputación con `CreatePaymentPayload`, llamada a `paymentsApi.createPayment`, y pasaje de `invoices` e `initialInvoice`.
9. `src/components/layout/ShellUtilityMenus.tsx`: Manejo seguro de `surgeryId` opcional/null para navegación de notificaciones.
10. `src/components/documentos-ajuste/AdjustmentWorkspace.tsx`: Corregida desestructuración `loading: isLoadingInvoices` de `useInvoices` y uso de `formatCurrency` para importes numéricos.
11. `src/components/compras/ComprasOcrWorkspace.tsx`: Alineado con `useComprasOcrForm` (`handleFileSelected`, `isProcessing`, `updateItem`, `removeItem`, `createProvOpen`, `createProvPrefill`).
12. `src/components/coordinadores/CoordinatorShareDialog.tsx`: Corregido `presupuesto.status` -> `presupuesto.state`.
13. `src/components/coordinadores/modal/TabPaneAdjuntos.tsx`: Resuelto `activeCompany.id` vía `useAuth` y prop `alt` en `ImageViewerDialog`.
14. `src/components/coordinadores/views/DayViewDesktopTable.tsx`, `DayViewMobileCards.tsx`, `WeekViewGroupedView.tsx`: Eliminadas comparaciones con estados quirúrgicos legados inexistentes (`"Confirmada"`, `"En preparación"`, `"Completada"`).

### Grupo C: Cierre Core Cirugías (Aprobado por Franco)
1. `src/components/cirugias/SurgeryContextTray.tsx`:
   - Reemplazado `surgery.companyId` inexistente por `activeCompany?.id` con fallback DEV.
   - Alineado contrato `PresupuestoItem`: `item.name` para descripción y `item.quantity` para cantidad.
   - Alineado contrato `RemitoItem`: `item.name` para descripción y `item.sentQuantity` para cantidad enviada.
   - Preservado orden de fallback canónico: Presupuesto → Remito → Datos de Cirugía.
2. `src/components/expediente/NovedadesTabContent.tsx`:
   - Derivación segura de `activeMediaViewerFile` previo a la indexación (`mediaViewerIndex !== null ? mediaFiles[mediaViewerIndex] ?? null : null`).
   - Aplicado a ambos `ImageViewerDialog` de media composer.
   - `onDownload` y `onOpenInNewTab` envueltos en bloques `{ if (src) ... }` con retorno estricto `void`.
   - Navegación prev/next, zoom, share y rotación preservados.
3. Tests focalizados de cierre:
   - `src/__tests__/components/SurgeryContextTray.test.tsx` (Fallback chain Presupuesto → Remito → Cirugía).
   - `src/__tests__/components/NovedadesTabContent.test.tsx` (Viewer sin índice activo no abre/indexa, viewer con archivo activo conserva download/share).

---

## 2. Comandos y Validación Final

- **Validación Global TypeScript**:
  ```bash
  npx tsc --noEmit
  ```
  **Resultado**: `0 errores` (exited with code 0).

- **Validación de Tests Focalizados de Cierre**:
  ```bash
  npx vitest run src/__tests__/components/SurgeryContextTray.test.tsx src/__tests__/components/NovedadesTabContent.test.tsx
  ```
  **Resultado**: 2/2 archivos pasaron (18/18 tests).

- **Validación de Formato Git**:
  ```bash
  git diff --check
  ```
  **Resultado**: 0 errores de whitespace o diff.
