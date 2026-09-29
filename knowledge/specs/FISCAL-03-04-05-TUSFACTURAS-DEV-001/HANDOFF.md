# HANDOFF — FISCAL-03/04/05 — TusFacturas DEV completa

## Handoff

### Done
- Implementado cliente TusFacturas server-only con validadores Zod para API v2 (`POST /facturacion/nuevo`, `POST /facturacion/consulta_avanzada`).
- Mapeador de `Invoice` + `Company` + `Contact` + `items` a payload fiscal con cálculo determinista de `external_reference` (`OSSUM-COMPANY-INVOICE`) y hash SHA-256 de snapshot.
- Lógica de emisión explícita (`issueFiscalInvoiceDev`) con persistencia en `FiscalDocument` y registro de intentos ordenados en `FiscalIssuanceAttempt` (`attemptNumber`).
- Lógica de reconciliación por `external_reference` (`reconcileFiscalInvoiceDev`) ante timeouts, caídas de red o estados `UNKNOWN`/`PENDING`.
- Ruta de Webhook DEV (`/api/webhooks/tusfacturas`) con validación de secreto de firma e idempotencia.
- Interfaz de usuario: acción explícita "Emitir en DEV" / "Reintentar emisión DEV" y "Reconciliar estado" en `FiscalEvidenceDialog` con estados de carga, feedback y enlace a PDF DEV.
- Integración de acceso a evidencia fiscal en Expediente (`ComprobantesAsociados.tsx`).
- Documentación de variables DEV en `.env.example` (`TUSFACTURAS_API_KEY`, `TUSFACTURAS_API_TOKEN`, `TUSFACTURAS_USER_TOKEN`, `TUSFACTURAS_PUNTO_VENTA`, `TUSFACTURAS_API_URL`, `TUSFACTURAS_WEBHOOK_SECRET`).

### Changed
- Actualizados `FiscalEvidenceDialog.tsx`, `useFiscalEvidence.ts`, `ComprobantesAsociados.tsx`, `.env.example`.
- Creados `fiscal-tusfacturas.ts` (validadores Zod), `fiscal-tusfacturas.service.ts` (cliente), `fiscal-issuance.service.ts` (orquestador), rutas API `fiscal-issue`, `fiscal-reconcile`, webhook.
- Añadidos tests unitarios y de integración para cliente, orquestador, rutas, webhook y componentes.

### Files
- `src/lib/validators/fiscal-tusfacturas.ts`
- `src/lib/services/fiscal-tusfacturas.service.ts`
- `src/lib/services/fiscal-issuance.service.ts`
- `src/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-issue/route.ts`
- `src/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-reconcile/route.ts`
- `src/app/api/webhooks/tusfacturas/route.ts`
- `src/hooks/useFiscalEvidence.ts`
- `src/components/facturacion/FiscalEvidenceDialog.tsx`
- `src/components/expediente/ComprobantesAsociados.tsx`
- `.env.example`
- `src/__tests__/unit/fiscal-tusfacturas.service.test.ts`
- `src/__tests__/unit/fiscal-issuance.service.test.ts`
- `src/__tests__/unit/fiscal-routes.test.ts`
- `src/__tests__/unit/tusfacturas-webhook.test.ts`
- `src/__tests__/components/FiscalEvidenceDialog.test.tsx`

### Validations
- `npx prisma generate` exitoso (v7.8.0).
- Suite focalizada Vitest: 24 tests pasando en 10 archivos.
- ESLint focalizado: 0 errores.
- Verificación de guardrails: cero secretos expuestos, sin llamadas HTTP reales a proveedores durante build/test.

### Risks
- Las llamadas reales a TusFacturas requieren configurar las variables en `.env.local` manualmente y aplicar la migración en una base DEV descartable confirmada.

### Next
1. **Configuración manual de variables DEV**: Cargar credenciales de prueba de TusFacturas en `.env.local` (`TUSFACTURAS_API_KEY`, `TUSFACTURAS_API_TOKEN`, `TUSFACTURAS_USER_TOKEN`).
2. **Smoke test manual**: Emitir una factura DEV desde la UI en entorno local para validar la recepción del comprobante de prueba y descarga del PDF.
3. **Cierre de fase**: Transición ordenada hacia la siguiente tarea cuando Franco lo indique.
