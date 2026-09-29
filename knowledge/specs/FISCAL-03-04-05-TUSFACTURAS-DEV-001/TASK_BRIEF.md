# TASK BRIEF — FISCAL-03/04/05 — TusFacturas DEV completa

## Task ID
`FISCAL-03-04-05-TUSFACTURAS-DEV-001`

## Objective
Implementar la integración fiscal DEV completa contra la API de prueba de TusFacturas desde una `Invoice` existente: preparación de payload, emisión explícita, persistencia de intentos y snapshots inmutables, reconciliación idempotente por `external_reference`, webhook DEV con validación server-side, y visualización de evidencia y PDF DEV en Facturación y Expediente.

## Agent Role & Ownership Lock
- Role: Backend / Frontend Integration Agent
- Scope: Fiscal DEV Integration
- Lock Status: `editing`
- Owned Files:
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

## Approval & Human Boundaries
- Autorización expresa de Franco para DEV completa contra API de prueba de TusFacturas.
- Prohibición absoluta de usar entorno productivo, credenciales reales, ARCA/AFIP real o datos de pacientes/clientes reales.
- Secretos: nunca leer ni exponer credenciales. No escribir `.env.local`. Documentar en `.env.example`.
- Si las variables DEV faltan en el entorno, el servidor informa configuración incompleta (`fiscal_dev_config_missing`) sin disparar llamadas HTTP externas.
