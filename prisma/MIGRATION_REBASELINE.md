# MIGRATION REBASELINE — OSSUM COR

Fecha: 2026-09-30  
Estado: Activo  
Migración canónica: `prisma/migrations/0_ossum_cor_canonical_baseline/migration.sql`  
Historial archivado: `prisma/migrations_archive/legacy-pre-rebaseline-20260930/`

---

## 1. Motivo del Rebaseline

El historial previo de 35 migraciones contenía solapamiento de DDL entre `0_antigravity_dev_baseline` y `20260606063628_init_backend_foundation` (ambas intentaban crear `CREATE TABLE "Organization"` y objetos asociados). Esto impedía que una base de desarrollo o un entorno limpio pudiera reconstruirse secuencialmente desde cero mediante `prisma migrate reset` o `prisma migrate dev`.

Para mantener la máxima integridad de base de datos y evitar parches DDL ad-hoc en migraciones obsoletas, se archivó el árbol de 35 migraciones de forma intacta como evidencia histórica y se generó una única migración canónica base.

---

## 2. Contenido del Baseline Canónico

La migración `0_ossum_cor_canonical_baseline/migration.sql` representa el 100% del estado actual y canónico de `prisma/schema.prisma`, cubriendo todos los dominios operativos:

- **Empresa y Organización**: Multi-empresa, tenants, configuración y branches.
- **RBAC & Autorización**: Usuarios, membresías activas, roles canónicos (`admin`, `coordinator`, `logistics`, `billing`, `commercial`), y auditoría de eventos (`AuditEvent`).
- **Contactos & Proveedores**: `Contact`, `ContactCompanyLink`, roles comerciales y fiscales backend-authoritative.
- **Cirugías & Expediente**: Núcleo quirúrgico, `Surgery`, asignaciones de contacto, seguimiento, timeline y archivo.
- **Cajas & Fórmulas**: Modelos inmutables de trazabilidad quirúrgica y stock (`CajasBoxFormula`, `CajasStockScopeReference`, etc.).
- **Logística & Salidas**: `Remito` unificado, `RemitoItem`, transporte y control de despachos.
- **Consumo & Devolución**: `Consumo`, `ConsumoItem`, `Devolucion`, `DevolucionItem` con integridad referencial estricta.
- **Presupuestos & Facturación**: `Presupuesto`, `Invoice`, `InvoiceItem`, `Payment`, cobros y comprobantes de ajuste.
- **Recibos Digitales**: `DigitalReceipt`, tokens de acceso, snapshots inmutables y artefactos de firma.
- **Notificaciones Cross-Domain**: `InternalNotification`, políticas por rol y preferencias de usuario.
- **Stock Ledger & Recepciones**: `Receipt`, `ReceiptLine`, `StockMovement`, estados de trazabilidad por lote/serie y disponibilidad.
- **Compras & Cuentas a Pagar**:
  - `NecesidadCompra` con FKs compuestas `onDelete: Restrict` hacia `Surgery` y `OrdenCompra`.
  - `OrdenCompra` y `FacturaCompra` backend-authoritative.
  - `OrdenPago` con bloqueo transaccional para `visibleNumber` y `OrdenPagoImputacion` con unicidad compuesta `[companyId, ordenPagoId, facturaCompraId]`.

---

## 3. Estado de la DB de Desarrollo (DEV)

La base de datos DEV actual contiene registros previos en `_prisma_migrations`. Antes de aplicar el nuevo baseline canónico, la base DEV descartable debe resetearse mediante:

```bash
npx prisma migrate reset --force
```

Una vez ejecutado, `prisma/migrations/0_ossum_cor_canonical_baseline` quedará aplicada como único hito inicial y la base reflejará exactamente el `schema.prisma`.

---

## 4. Política de Producción y Staging (CRÍTICO)

> **ADVERTENCIA**: Producción y Staging **NUNCA** deben resetearse (`migrate reset` está estrictamente prohibido).

Para entornos productivos o staging con datos persistentes:
1. Se debe auditar el estado del schema real mediante `prisma migrate diff`.
2. Adoptar el baseline marcando la migración canónica como aplicada (`prisma migrate resolve --applied 0_ossum_cor_canonical_baseline`) o ejecutando un plan aditivo de adopción aprobado por Franco.
3. No ejecutar migraciones destructivas sobre bases de datos con datos reales.

---

## 5. Procedimiento Futuro de Migraciones

A partir de este rebaseline:

1. **Nuevos cambios en DEV**:
   - Modificar `prisma/schema.prisma`.
   - Ejecutar `npx prisma migrate dev --name <nombre_descriptivo>`.
   - Verificar con `npx prisma validate` y `npx prisma generate`.
2. **Deploy en entornos compatibles**:
   - Ejecutar `npx prisma migrate deploy`.
3. **Prohibiciones permanentes**:
   - Prohibido `prisma db push` en entornos versionados.
   - Prohibido editar migraciones ya aplicadas.
   - Prohibido reescribir FKs en caliente sin validación de integridad referencial.
