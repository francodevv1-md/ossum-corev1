# ERP Backend Test Matrix — OSSUM COR

**Estado**: Vigente (DEV)
**Propósito**: Mapa de cobertura de pruebas unitarias y de dominio para el backend del ERP (Prisma, RBAC, Compras, Stock, Circuito Quirúrgico, Facturación, Cobros, Notificaciones y Smoke API).


---

## 1. Cobertura por Módulo

| Módulo | Escenarios Clave Cubiertos | Archivo de Test |
|---|---|---|
| **1. Migración y Persistencia Smoke** | • `prisma migrate status` baseline canónico up-to-date.<br>• Integridad DDL de Compras: FKs con reglas ON DELETE RESTRICT.<br>• Índice único `(companyId, ordenPagoId, facturaCompraId)` en `OrdenPagoImputacion`. | `src/__tests__/unit/erp-migration-smoke.test.ts` |
| **2. RBAC y Aislamiento Multi-Tenant** | • Deny-by-default para rol `viewer` y roles desconocidos en mutaciones.<br>• Verificación estricta de capacidades (`purchases:read`, `purchases:mutate`, `billing:mutate`, `stock:mutate`, `cirugias:mutate`).<br>• Segregación de dominios (Logistics muta Necesidades, Billing opera OrdenPago, Logistics rechaza OrdenPago).<br>• Rechazo de accesos a `companyId` ajeno. | `src/__tests__/unit/erp-rbac-tenant-isolation.test.ts`<br>`src/__tests__/unit/purchases-rbac-security.test.ts` |
| **3. Compras y Stock Domain** | • Idempotencia de `NecesidadCompra` por clave de origen.<br>• Conversión de Necesidad a OC restringida a estado `Pendiente`.<br>• `Receipt` confirmada genera un único movimiento `RECEIPT_IN`.<br>• `OrdenPago` rechaza imputaciones duplicadas, sobreimputación y facturas de otro proveedor.<br>• Anulación de OP revierte estado y recalcula saldo.<br>• Forecast de compras usa deltas con signo (`RECEIPT_IN` / `RETURN_IN` suman, `DISPATCH_OUT` resta). | `src/__tests__/unit/erp-purchases-stock-domain.test.ts`<br>`src/__tests__/unit/purchases-integrity.test.ts` |
| **4. Circuito Operativo** | • Aislamiento multi-tenant en consultas de Cirugías.<br>• Comparativa de Cirugía deriva datos autoritativos de Presupuesto, Remito, Consumo y Devolución.<br>• Detección precisa de desvíos de cantidad e ítems no presupuestados. | `src/__tests__/unit/erp-circuit-services.test.ts` |
| **5. Facturación y Cobros** | • Validación de montos positivos y rechazo de facturas duplicadas en imputación.<br>• Bloqueo de imputaciones sobre facturas en estado `Borrador` o `Anulada`.<br>• Validación de sobreimputación contra el saldo pendiente.<br>• Anulación de recibo revierte saldos de facturas imputadas.<br>• Auditoría obligatoria en operaciones críticas. | `src/__tests__/unit/erp-billing-payments.test.ts` |
| **6. Notificaciones** | • Deny-by-default por política de rol configurable por empresa.<br>• Preferencia personal de usuario solo puede silenciar, nunca ampliar privilegios.<br>• Autoexclusión del usuario actor emisor de la acción.<br>• Deduplicación por `eventKey` mediante `skipDuplicates`.<br>• Aislamiento estricto por `companyId`. | `src/__tests__/unit/erp-notifications-policy.test.ts` |
| **7. Smoke API (4 Golden Gates)** | • **Gate 1 (Happy Path)**: 200/201 en listados y creaciones válidas.<br>• **Gate 2 (Payload Inválido)**: 400 ante JSON corrupto o esquema Zod no conforme.<br>• **Gate 3 (Sin Capability)**: 403 `capability_denied` ante roles sin permiso.<br>• **Gate 4 (Recurso Ajeno/Inexistente)**: 404 ante IDs inexistentes. | `src/__tests__/unit/erp-smoke-api-endpoints.test.ts`<br>`src/__tests__/unit/receipt-api-routes.test.ts` |

---

## 2. Ejecución y Validación

Comando unificado para ejecutar la suite completa del backend:

```bash
npx vitest run src/__tests__/unit/erp-migration-smoke.test.ts src/__tests__/unit/erp-rbac-tenant-isolation.test.ts src/__tests__/unit/erp-purchases-stock-domain.test.ts src/__tests__/unit/erp-circuit-services.test.ts src/__tests__/unit/erp-billing-payments.test.ts src/__tests__/unit/erp-notifications-policy.test.ts src/__tests__/unit/erp-smoke-api-endpoints.test.ts src/__tests__/unit/purchases-integrity.test.ts src/__tests__/unit/purchases-rbac-security.test.ts
```

Verificaciones de integridad del entorno:

```bash
npx prisma validate
npx prisma migrate status
npx tsc --noEmit
git diff --check
```
