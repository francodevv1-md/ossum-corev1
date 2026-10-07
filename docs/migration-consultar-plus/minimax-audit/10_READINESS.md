# 10 — Migration Readiness OSSUM (Análisis Independiente)

## Estado actual del OSSUM para soportar migración

### Lo que YA soporta el schema

OSSUM tiene las entidades clave:
- `Organization` / `Company` (multitenancy)
- `Surgery` con `cxStatus`, `prepStatus`, `materialShippingDate`, `materialAvailabilityDate`, `materialTransport`
- `Contact` + `ContactCompanyLink` con roles múltiples, `doctorLicense`, `specialty`, `usualDiscount`, `paymentTerms`, `vatCondition`
- `ContactGroup` + `ContactGroupMembership`
- `Remito` + `RemitoItem` (con lot/serial/expiration)
- `Consumo` + `ConsumoItem` (con `requestedQuantity` vs `consumedQuantity`)
- `Devolucion` + `DevolucionItem`
- `Presupuesto` + `PresupuestoItem` (Fase 1C)
- `Invoice` + `InvoiceItem` (operacional, no fiscal)
- `FiscalDocument` + `FiscalIssuanceAttempt` (DEV_ONLY snapshot)
- `Payment` + `PaymentImputation`
- `Article` + `ArticleIdentifier` + `ArticleSupplierMapping`
- `StockMovement` con idempotencyKey
- `NecesidadCompra`
- `AuditEvent`
- `SeguimientoEntry`
- `DigitalReceipt`

### Lo que el schema actual NO soporta explícitamente

Para una migración histórica segura, OSSUM debería tener (o aceptar) los siguientes elementos:

#### A) Identidad legacy

Necesitamos preservar el ID legacy (`CIRCOD`, `CLICOD`, `ARTCOD`, `VTACOD`, `STKCOD`) para:
- Reconciliación posterior
- Auditoría
- Rollback
- Queries de 'qué se migró'

**Decisión recomendada: ledger transversal vs columna directa.**

Opción A: columna directa en cada tabla
- Pros: simple, query directa
- Contras: no escala a multi-fuente legacy, ocupa siempre espacio

Opción B: ledger transversal `LegacyEntityRef`
- Pros: soporta múltiples fuentes (legacy Districorr, futuras, etc.)
- Pros: puede llevar metadata (fecha de migración, runId, hash)
- Contras: requiere join para obtener el ID legacy

**Recomendación:** Opción B. Crear tabla:

```
model LegacyEntityRef {
  id          String   @id @default(cuid())
  companyId   String
  source      String   // 'districorr_backup_20260929'
  entityType  String   // 'Surgery' | 'Contact' | 'Invoice' | ...
  legacyId    String   // CIRCOD, CLICOD, etc.
  entityId    String   // OSSUM CUID
  migratedAt  DateTime @default(now())
  migrationRunId String
  metadata    Json?
  @@unique([source, entityType, legacyId])
  @@index([companyId, entityType, entityId])
}
```

#### B) Idempotencia y migrationRunId

- `StockMovement.idempotencyKey` YA existe
- Falta: `MigrationRun` entity con runId, status, counters, errors

```
model MigrationRun {
  id          String   @id @default(cuid())
  companyId   String
  source      String   // 'districorr_backup_20260929'
  startedAt   DateTime
  finishedAt  DateTime?
  status      String   // 'running'|'success'|'failed'|'partial'
  totalCount  Int
  successCount Int
  errorCount  Int
  errors      Json?    // array de {entityType, legacyId, error}
  metadata    Json?
}

model MigrationError {
  id          String   @id @default(cuid())
  runId       String
  entityType  String
  legacyId    String
  errorMsg    String
  errorDetail Json?
  createdAt   DateTime @default(now())
  @@index([runId])
}
```

#### C) Rollback

- El ledger transversal permite rollback quirúrgico: borrar todos los entity con `migrationRunId=X`
- No requiere esquema adicional
- Se debe poder correr el script de rollback con un runId

#### D) Reconciliación

Necesitamos queries que permitan:
- "Mostrame qué cirugías 2026 están en OSSUM y cuáles no"
- "Mostrame qué artículos referidos por cirugías 2026 están en OSSUM"
- "Mostrame diferencias de totales"

Estas queries se hacen con LEFT JOIN entre el ID legacy y el entityId OSSUM.

#### E) Estados históricos

- `Surgery.cancelledDate` ya existe
- `Surgery.archivedAt` ya existe
- Falta `Surgery.performedDate` para distinguir REA de FIN (si se necesita)
- `Surgery.archiveReason` para cirugías migradas con problemas

Para el legacy, podemos usar:
- `performedDate` = cirfec cuando cirestado ∈ (REA, FIN, SCO)
- `cancelledDate` = cirfec cuando cirestado ∈ (CAN, SUS)

#### F) Side effects de la migración

OSSUM tiene side effects importantes que requieren cuidado:
- `StockMovement.quantity` afecta stock actual
- `Invoice.base='manual'` requiere generación de número
- `Remito.estado='Borrador'` por defecto; debe transicionar
- `Consumo.remitoId` FK obligatoria
- `Devolucion.remitoId` FK obligatoria
- `Invoice.consumoId` FK opcional (legacy puede no tener)

**Recomendación:** para cirugías migradas, generar `Remito.estado='Cerrado'` directamente (no borrador), `Consumo.estado='Validado'` o 'Facturado' según legacy, etc.

#### G) Tenant/Company

- `EMPRESA.DBF` tiene 2 empresas: PRINC (DISTRICORR SRL) y TEST
- OSSUM es multi-tenant via `Company`
- Recomendación: crear 2 OSSUM `Company` (PRINC + TEST), mapear EMPCOD → Company.id
- El campo `EMPRESA.EMPPCAL='S'` indica cuál es la principal

#### H) Contactos necesarios

Para migrar 2,577 cirugías 2026:
- **Pacientes:** 7,360 CIRPACCOD distintos (subset de 9,078 CLIENTE)
- **Médicos:** 434 CIRMEDCOD distintos (subset)
- **Hospitales:** 135 CIRHOSCOD distintos
- **Payers:** 173 CIROSCOD distintos
- **Vendedores:** 7 VIAJANTE
- **Total únicos:** ~8,000 CONTACTOS (muchos son intersecciones de roles)

Recomendación: importar TODOS los CLIENTE primero (9,078), luego enriquecer con CLIATRI y asignar roles via ContactCompanyLink.

#### I) Artículos

- **Total ARTICULO:** 5,902
- **Usados en cirugías 2026:** ~2,220 (37.6%)
- **Con ATRIENT:** 190,270
- **Con FORMULA1:** 94,735

Recomendación: importar TODOS los 5,902 ARTICULO + sus ARTATRI + FORMULA1.

### Resumen de schema changes recomendados

Mínimos viables:
1. Agregar `model LegacyEntityRef` (transversal)
2. Agregar `model MigrationRun` y `model MigrationError`
3. Verificar si `Surgery.performedDate` debe distinguirse de `surgeryDate`

NO necesarios (OSSUM ya cubre):
- Invoice, Remito, Consumo, Devolucion, Contact, Article, StockMovement — todos presentes