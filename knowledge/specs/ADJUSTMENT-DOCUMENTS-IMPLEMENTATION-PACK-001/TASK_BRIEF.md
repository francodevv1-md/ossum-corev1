# Task Brief — Documentos de Ajuste (NC / ND) Multi-Origen DEV

## Objective

Preparar e implementar el soporte integral de **Documentos de Ajuste (Notas de Crédito y Notas de Débito)** en OSSUM COR con persistencia backend, API REST multiempresa, adaptador fiscal TusFacturas DEV para comprobantes asociados y soporte de tres orígenes de emisión:
1. Factura OSSUM emitida interna.
2. Comprobante externo/preexistente (snapshot inmutable).
3. Período desde/hasta (exclusivo para rol admin y sujeto a normativa ARCA).

---

## Risk and Approval

- **Risk:** T3 Schema / Migración DEV + T2 API, Servicios y UI.
- **Approval Status:** En diseño / Pendiente de aprobación explícita de Franco antes de aplicar cambios a `schema.prisma` o base de datos.
- **Owner:** `Backend/Fiscal Domain Auditor + Product Architect`.

---

## Scope

- **Persistencia Prisma:** Modelo `AdjustmentDocument` y `AdjustmentDocumentItem` multiempresa con soporte para `originType` (`INTERNAL_INVOICE`, `EXTERNAL_INVOICE`, `PERIOD`), discriminador de tipo (`CREDIT`, `DEBIT`), estados (`Borrador`, `Emitida`, `Anulada`), snapshots inmutables de comprobante externo, fechas de período y relación con `FiscalDocument`.
- **Servicios y Validadores:**
  - `adjustment-document.service.ts`: Ciclo de vida completo (Crear borrador, Emitir operativo, Anular con guard fiscal, Listar/Filtrar, Detalle).
  - `adjustment-document.validator.ts`: Validación estricta de invariantes de negocio (factura origen emitida, inmutabilidad, campos de comprobante externo, fechas válidas de período, rol admin para período, límite de 10 comprobantes asociados y consistencia de moneda).
- **Adaptador Fiscal DEV (TusFacturas / ARCA):**
  - Mapeo de `comprobantes_asociados` para facturas individuales (internas o externas).
  - Mapeo de `comprobantes_asociados_periodo` para ajustes globales A/B/C.
  - Bloqueo de emisión por período en notas de exportación (tipo E).
- **API REST Multiempresa:**
  - `GET /api/companies/[companyId]/adjustment-documents`: Listado con filtros, KPIs y paginación.
  - `POST /api/companies/[companyId]/adjustment-documents`: Creación de borrador.
  - `GET /api/companies/[companyId]/adjustment-documents/[id]`: Detalle con snapshot y trazabilidad fiscal.
  - `POST /api/companies/[companyId]/adjustment-documents/[id]/emit`: Emisión operativa y generación de intento fiscal DEV.
  - `POST /api/companies/[companyId]/adjustment-documents/[id]/void`: Anulación con verificación de estado fiscal.
- **Integración UI:** Conectar el frontend ya validado (`/ventas/documentos-ajuste`, selector de paso 1, página dedicada `/nueva` y drawer) al backend authority.
- **PDF Progresivo:** Mantener `DocumentoAjustePDF` integrado con los tres estados fiscales (Borrador sin QR, Emitida sin CAE con leyenda operativa y Autorizada con CAE/QR oficial).

---

## Allowed Files (When Approved)

- `prisma/schema.prisma` — Agregar modelos de ajuste y relaciones
- `prisma/migrations/20260929150000_adjustment_documents_multi_origin/migration.sql`
- `src/lib/services/adjustment-document.service.ts` (nuevo)
- `src/lib/validators/adjustment-document.ts` (nuevo)
- `src/lib/api/adjustment-documents.ts` (nuevo)
- `src/lib/services/fiscal-tusfacturas.service.ts` — Soporte de comprobantes asociados y tipos NC/ND
- `src/lib/validators/fiscal-tusfacturas.ts` — Schemas zod de comprobantes asociados
- `src/app/api/companies/[companyId]/adjustment-documents/**` (nuevos endpoints)
- `src/hooks/useDocumentosAjuste.ts` (conectar a API backend)
- `src/types/documentos-ajuste.ts`
- `src/components/documentos-ajuste/**`
- `src/components/pdf/documents/DocumentoAjustePDF.tsx`
- `src/__tests__/**` — Tests unitarios y de integración

---

## Forbidden Files and Actions

- No tocar archivos bajo lock de otros agentes:
  - `src/lib/services/orden-compra.service.ts`
  - `src/lib/validators/orden-compra.ts`
  - `src/lib/api/ordenes-compra.ts`
  - `src/app/api/companies/[companyId]/ordenes-compra/**`
  - `src/hooks/useOrdenesCompra.ts`
  - `src/app/compras/ordenes-compra/page.tsx`
- No modificar el comportamiento núcleo de `Invoice.balance` ante NCs externas.
- No generar saldos a favor automáticos en cuenta corriente para facturas externas hasta contar con módulo de pagadores autoritativo.
- No llamar a AFIP/TusFacturas productivo ni manipular credenciales reales.
- No realizar commits, push ni deploys sin autorización explícita.

---

## Stop Conditions

- Modificación requerida sobre módulos locked de Órdenes de Compra o Cirugías núcleo.
- Conflicto o ambigüedad en normativas impositivas de ARCA.
- Falta de confirmación de DB descartable antes de aplicar migraciones.
