# ADR-028 — Diseño DB Real para Cirugías / Expediente

Estado: **propuesta — requiere aprobación de Franco**  
Tipo: arquitectura / base de datos  
Autor: GPT-027F.5A-12B  
Precedentes: 12A diagnóstico DB, 11E smoke, ADR-027E backend/DB/ORM  
Archivos fuente: `prisma/schema.prisma`, `knowledge/domain/SURGERY_EXPEDIENTE.md`, `knowledge/architecture/DATA_MODEL_RULES.md`, `knowledge/architecture/MULTI_COMPANY_ACCESS.md`, `knowledge/architecture/AUDIT_EVENT_POLICY.md`, `knowledge/core/CANONICAL_DECISIONS.md`

---

## 1. Problema actual

### Situación hoy

- `prisma/schema.prisma` contiene un modelo `Surgery` mínimo (8 campos operativos) con relaciones a `patient`, `doctor` e `institution`.
- Backend expone GET list/detail y PATCH status.
- `/cirugias-api` existe como vista paralela read-only.
- El pipeline operativo canónico del ERP obliga a responder muchas más preguntas desde la cirugía.

### Lo que hoy no se puede modelar

- Cliente pagador (separado de paciente/institución).
- Autorización de la entidad financiadora (número, montos, vigencias, historial).
- Expediente como agregado navegable con presupuestos, preparación, remitos, consumos, devoluciones, documentación y facturación vinculados.
- Fechas operativas múltiples (probable, programada, realizada, cancelada).
- Logística de envío/retiro.
- Documentos adjuntos y OCR.
- Preparaciones y remitos por cirugía.
- Consumos con trazabilidad.
- Devoluciones y comparativas.
- Historial operativo específico del expediente (más allá del `AuditEvent` genérico).

### El error de diseño más riesgoso hoy

`Surgery.status` mezcla tres dimensiones independientes en un solo campo:

1. Estado clínico / quirúrgico (CX): `unauthorized`, `authorized`, `pending`, `performed`, `finalized`, `cancelled`.
2. Estado de preparación / material: `preparing`, `frozen`, `in_transit`, `delivered`.
3. Eventos logísticos: `shipped`, `returned`.

Esto contradice la separación explícita que pide `knowledge/domain/SURGERY_EXPEDIENTE.md` (sección 6: Estados CX y 7: Subestados de preparación/material). Si se sigue extendiendo `Surgery` sin corregir esto, el modelo quedará rígido y difícil de consultar.

---

## 2. Decisión propuesta

### Decisión principal

1. **`Surgery` seguirá siendo la entidad central del circuito**, no se creará una entidad "Expediente" como tabla primaria separada.
2. **El expediente será un agregado / read-model** alrededor de `Surgery`, construido desde las tablas operativas vinculadas.
3. **Los estados CX y preparación/logística se modelarán como campos independientes** (`cxStatus` y `prepStatus`) en `Surgery`, con comportamientos y transiciones separados.
4. **Las entidades operativas periféricas** (autorización, preparación, remitos, consumos, devoluciones, documentos, eventos) **tendrán sus propias tablas** vinculadas a `Surgery`.
5. **Se reutilizará `Contact` como fuente única de actores**, sin crear tablas duplicadas para paciente, médico, institución o pagador.
6. **La implementación se entregará por fases**, empezando por la cirugía core y la separación de estados, y avanzando por autorización, luego preparación/remitos/consumo, luego documentos, luego trazabilidad operativa, y recién al final stock/cajas/facturación.

### Por qué NO crear una tabla "Expediente" ahora

- La cirugía ya es la entidad que concentra el caso.
- Una tabla "Expediente" paritaria duplicaría verdad y crearía problemas de sincronización.
- El expediente como agregado (vista construida desde múltiples tablas) es más flexible, más fácil de evolucionar por fases y no requiere decisiones prematuras de estructura.

### Por qué sí podría existir después

Si en el futuro el rendimiento de lectura del agregado lo justifica, se puede materializar un `SurgerySnapshot` o proyección read-model, pero no como fuente de verdad primaria.

---

## 3. Principios de diseño

1. **Multiempresa desde el inicio**: toda entidad operativa debe tener `companyId`.
2. **No duplicar actores**: `Contact` es la fuente única; los roles se expresan por relación, no creando tablas nuevas para cada tipo de persona.
3. **Separar dimensiones de estado**: CX, preparación/material y logística son independientes y deben consultarse, filtrarse y transicionarse por separado.
4. **Auditar todo lo crítico**: `AuditEvent` para acciones transversales + `SurgeryOperationalEvent` para trazabilidad fina del expediente.
5. **No mezclar fiscal con operativo temprano**: facturación y cobros se modelan después del circuito operativo base.
6. **Cada línea operativa referencia su origen**: remito → preparación, consumo → remito, devolución → consumo, manteniendo trazabilidad completa.
7. **Documentos como metadata primero, storage después**: modelar qué documentos existen y su estado, sin atar todavía proveedor de archivos.
8. **Fases incrementales**: cada fase agrega modelos y endpoints sin romper los anteriores.

---

## 4. Modelo actual resumido

### Tablas existentes relevantes

| Tabla | Rol en el circuito |
|---|---|
| `Organization` | Tenant / grupo empresarial |
| `Company` | Empresa operativa |
| `Branch` | Sucursal |
| `User` | Usuario del sistema |
| `UserCompanyAccess` | Permiso usuario → empresa |
| `Contact` | Persona o entidad (paciente, médico, institución, etc.) |
| `ContactCompanyLink` | Vínculo contacto → empresa con rol |
| `ContactAddress` | Dirección del contacto |
| `ContactGroup` | Agrupación de contactos |
| `Surgery` | Cirugía (mínima, 8 campos) |
| `AuditEvent` | Evento de auditoría genérico |

### Lo que `Surgery` tiene hoy

```
Surgery {
  id, companyId, branchId?,
  patientId, doctorId?, institutionId?,
  surgeryDate, status, notes,
  createdAt, updatedAt
}
```

- Relaciones: `patient` (requerido), `doctor` (opcional), `institution` (opcional).
- `status` mezcla CX, preparación y logística en un solo string.
- Sin número visible, sin pagador, sin autorización, sin clasificación.

---

## 5. Modelo futuro por fases

### Fase 1 — Cirugía core (sin romper lo actual)

**`Surgery` expandido:**

```prisma
model Surgery {
  id              String    @id @default(cuid())
  companyId       String
  branchId        String?
  visibleNumber   String?   // Número visible configurable (prefijo + año + secuencia)
  // ── Actores principales ──
  patientContactId      String    // paciente (requerido, antes patientId)
  doctorContactId       String?   // médico tratante
  institutionContactId  String?   // institución / sanatorio
  payerContactId        String?   // cliente / financiador / obra social
  // ── Clasificación ──
  classification  String?   // tipo de cirugía o categoría
  description     String?   // descripción libre o diagnóstico
  priority        String?   // normal, urgente, programada
  // ── Estados separados ──
  cxStatus        String    @default("unauthorized")  // estado clínico/quirúrgico
  prepStatus      String?                              // estado de preparación/material
  // ── Fechas ──
  probableDate    DateTime?  // fecha tentativa
  scheduledDate   DateTime?  // fecha programada
  performedDate   DateTime?  // fecha de realización
  cancelledDate   DateTime?  // fecha de cancelación
  surgeryDate     DateTime?  // mantener como fecha principal de referencia (compatibilidad)
  // ── Metadata ──
  notes           String?
  source          String?    // origen del caso (manual, integración, etc.)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  // relaciones existentes + nuevas
  company     Company  @relation(fields: [companyId], references: [id])
  branch      Branch?  @relation(fields: [branchId], references: [id])
  patient     Contact  @relation("PatientSurgeries", fields: [patientContactId], references: [id])
  doctor      Contact? @relation("DoctorSurgeries", fields: [doctorContactId], references: [id])
  institution Contact? @relation("InstitutionSurgeries", fields: [institutionContactId], references: [id])
  payer       Contact? @relation("PayerSurgeries", fields: [payerContactId], references: [id])

  // nuevas colecciones
  contactAssignments SurgeryContactAssignment[]
  authorizations     SurgeryAuthorization[]
  logistics          SurgeryLogistics?
  documents          SurgeryDocument[]
  preparations       SurgeryPreparation[]
  deliveryNotes      SurgeryDeliveryNote[]
  consumptions       SurgeryConsumption[]
  returns            SurgeryReturn[]
  operationalEvents  SurgeryOperationalEvent[]
}
```

**`SurgeryContactAssignment` — roles variables por cirugía:**

```prisma
model SurgeryContactAssignment {
  id         String   @id @default(cuid())
  surgeryId  String
  contactId  String
  role       String              // coordinador, vendedor, instrumentador, transporte, etc.
  isPrimary  Boolean  @default(false)
  notes      String?
  createdAt  DateTime @default(now())

  surgery Surgery @relation(fields: [surgeryId], references: [id])
  contact Contact @relation(fields: [contactId], references: [id])

  @@unique([surgeryId, contactId, role])
}
```

### Fase 2 — Autorización

```prisma
model SurgeryAuthorization {
  id                  String    @id @default(cuid())
  surgeryId           String
  payerContactId      String
  authorizationNumber String?
  status              String    @default("requested")  // requested, authorized, denied, expired
  authorizedAmount    Decimal?
  coverageType        String?   // obra social, prepaga, particular, convenio
  requestedAt         DateTime  @default(now())
  authorizedAt        DateTime?
  expiresAt           DateTime?
  notes               String?
  version             Int       @default(1)
  isCurrent           Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  surgery Surgery @relation(fields: [surgeryId], references: [id])
  payer   Contact @relation(fields: [payerContactId], references: [id])

  @@index([surgeryId, isCurrent])
}
```

### Fase 3 — Preparación, remitos, consumo, devolución

```prisma
// ── Preparación ──
model SurgeryPreparation {
  id          String   @id @default(cuid())
  surgeryId   String
  companyId   String
  branchId    String?
  status      String   @default("draft")  // draft, frozen, ready, shipped
  notes       String?
  preparedBy  String?
  preparedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  surgery Surgery              @relation(fields: [surgeryId], references: [id])
  lines   SurgeryPreparationLine[]
}

model SurgeryPreparationLine {
  id             String  @id @default(cuid())
  preparationId  String
  itemId         String?
  boxInstanceId  String?
  catalogText    String?   // descripción libre cuando no hay ítem/box formal
  quantity       Int      @default(1)
  unit           String?
  notes          String?

  preparation SurgeryPreparation @relation(fields: [preparationId], references: [id])
}

// ── Remito ──
model SurgeryDeliveryNote {
  id                  String    @id @default(cuid())
  surgeryId           String?
  companyId           String
  branchId            String?
  visibleNumber       String?
  recipientContactId  String?
  status              String    @default("draft")  // draft, issued, shipped, signed, cancelled
  issuedAt            DateTime?
  shippedAt           DateTime?
  signedAt            DateTime?
  logisticsNotes      String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  surgery Surgery                  @relation(fields: [surgeryId], references: [id])
  lines   SurgeryDeliveryNoteLine[]
}

model SurgeryDeliveryNoteLine {
  id                    String  @id @default(cuid())
  deliveryNoteId        String
  preparationLineId     String?
  itemId                String?
  boxInstanceId         String?
  catalogText           String?
  quantity              Int     @default(1)
  unit                  String?
  notes                 String?

  deliveryNote SurgeryDeliveryNote @relation(fields: [deliveryNoteId], references: [id])
}

// ── Consumo ──
model SurgeryConsumption {
  id                String    @id @default(cuid())
  surgeryId         String
  deliveryNoteId    String?
  companyId         String
  status            String    @default("draft")  // draft, loaded, validated
  loadedByUserId    String?
  validatedByUserId String?
  loadedAt          DateTime?
  validatedAt       DateTime?
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  surgery      Surgery                  @relation(fields: [surgeryId], references: [id])
  deliveryNote SurgeryDeliveryNote?     @relation(fields: [deliveryNoteId], references: [id])
  lines        SurgeryConsumptionLine[]
}

model SurgeryConsumptionLine {
  id               String  @id @default(cuid())
  consumptionId    String
  deliveryNoteLineId String?
  itemId           String?
  boxInstanceId    String?
  catalogText      String?
  quantityUsed     Int     @default(1)
  quantityReturned Int?
  differenceReason String?
  notes            String?

  consumption SurgeryConsumption @relation(fields: [consumptionId], references: [id])
}

// ── Devolución ──
model SurgeryReturn {
  id            String    @id @default(cuid())
  surgeryId     String
  companyId     String
  status        String    @default("draft")  // draft, registered, reconciled
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  surgery Surgery              @relation(fields: [surgeryId], references: [id])
  lines   SurgeryReturnLine[]
}

model SurgeryReturnLine {
  id               String  @id @default(cuid())
  returnId         String
  consumptionLineId String?
  itemId           String?
  boxInstanceId    String?
  catalogText      String?
  quantity         Int     @default(1)
  reason           String?
  notes            String?

  return_ SurgeryReturn @relation(fields: [returnId], references: [id])
}
```

### Fase 4 — Documentos

```prisma
model SurgeryDocument {
  id               String   @id @default(cuid())
  surgeryId        String
  documentType     String    // consentimiento, parte_quirurgico, autorizacion, implante, etc.
  status           String   @default("pending")  // pending, received, validated, rejected
  fileName         String?
  mimeType         String?
  storageProvider  String?   // supabase, s3, etc. — no cerrar ahora
  storageKey       String?   // path o key en el provider
  uploadedByUserId String?
  uploadedAt       DateTime?
  ocrStatus        String?   // pending, processed, failed
  ocrText          String?   // texto extraído o referencia externa
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  surgery Surgery @relation(fields: [surgeryId], references: [id])

  @@index([surgeryId, documentType])
}
```

### Fase 5 — Eventos operativos

```prisma
model SurgeryOperationalEvent {
  id                String   @id @default(cuid())
  surgeryId         String
  companyId         String
  eventType         String    // status_change, authorization, preparation, shipment, consumption, return, document, note
  relatedEntityType String?   // Surgery, SurgeryAuthorization, SurgeryDeliveryNote, etc.
  relatedEntityId   String?
  performedByUserId String?
  occurredAt        DateTime @default(now())
  payload           Json?     // datos contextuales del evento
  notes             String?

  surgery Surgery @relation(fields: [surgeryId], references: [id])

  @@index([surgeryId, occurredAt])
  @@index([companyId, occurredAt])
}
```

### Fase 6 — Logística (opcional, puede fusionarse con remitos)

```prisma
model SurgeryLogistics {
  id                    String   @id @default(cuid())
  surgeryId             String   @unique
  destinationContactId  String?
  destinationAddressId  String?
  transportContactId    String?
  shipmentStatus        String?   // pending, dispatched, in_transit, delivered, picked_up, returned
  dispatchedAt          DateTime?
  deliveredAt           DateTime?
  pickedUpAt            DateTime?
  returnedAt            DateTime?
  notes                 String?

  surgery Surgery @relation(fields: [surgeryId], references: [id])
}
```

---

## 6. Separación de estados

### `cxStatus` — Estado quirúrgico / clínico

Controla el ciclo de vida del caso clínico. Transiciones válidas:

```
unauthorized → authorized → scheduled → performed → finalized
                                                ↘ cancelled
```

Valores:
- `unauthorized` — sin autorización del pagador
- `authorized` — autorización confirmada
- `scheduled` — programada con fecha
- `performed` — cirugía realizada
- `finalized` — caso cerrado (consumo cargado, documentación completa, diferencias resueltas)
- `cancelled` — cirugía cancelada
- `suspended` — suspendida temporalmente

### `prepStatus` — Estado de preparación / material

Controla la logística de materiales. Independiente del estado CX. Transiciones:

```
null → preparing → frozen → shipped → delivered → returned
        ↘ frozen_with_missing
```

Valores:
- `null` — sin preparación iniciada
- `preparing` — en preparación activa
- `frozen` — preparación congelada (lista para envío)
- `frozen_with_missing` — congelada pero con faltantes detectados
- `shipped` — material despachado
- `delivered` — material entregado en institución
- `returned` — material retirado / devuelto

### Estados logísticos (cuando exista `SurgeryLogistics`)

- `pending`, `dispatched`, `in_transit`, `delivered`, `picked_up`, `returned`

### Reglas de cruce

- Se puede estar en `cxStatus = authorized` y `prepStatus = frozen` simultáneamente.
- `cxStatus = performed` no requiere `prepStatus = returned`; puede seguir en `delivered` si el material sigue en la institución.
- Ciertos cambios de estado CX pueden requerir `prepStatus` mínimo (ej.: no permitir `performed` si no hay `prepStatus` registrado, según configuración de empresa).
- `SurgeryOperationalEvent` registra cada transición de estado con actor, timestamp y payload.

---

## 7. Qué queda fuera de alcance (de este ADR)

- **Schema físico de stock**: `Item`, `StockMovement`, `BoxInstance`, lotes, series. Se diseña en ADR separada.
- **Facturación y cobros**: tablas `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`. ADR separada después del circuito operativo.
- **Presupuestos**: `Budget`, `BudgetLine`. ADR separada; este ADR asume que existirán y se vincularán a `Surgery`.
- **Provider de storage/OCR**: no se decide Supabase Storage, S3/R2 ni otro. Se modela metadata y se difiere la elección.
- **Auth y permisos finos**: este ADR asume multiempresa y `UserCompanyAccess`, pero no define permisos por operación quirúrgica.
- **Integración fiscal con TusFacturasAPP**: fuera de scope de DB quirúrgica.
- **Cajas físicas completas, lotes, series, vencimientos**: etapa posterior.

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Extender `Surgery` sin separar estados consolida un modelo rígido | Separar `cxStatus` y `prepStatus` desde Fase 1 |
| Crear `Expediente` como tabla primaria duplica verdad | Tratar expediente como agregado/read-model; si hace falta después, materializar snapshot |
| Meter storage/OCR sin decisión de proveedor genera lock-in | Modelar `SurgeryDocument` como metadata; diferir `storageProvider` concreto |
| Intentar todas las fases en una sola migración rompe el repo | Migrar por fases, validar cada una antes de seguir |
| Cambios en `Surgery` pueden romper `/cirugias` principal o `/cirugias-api` | Mantener compatibilidad de campos; `surgeryDate` se conserva; nuevos campos son opcionales al inicio |
| `Contact` como fuente única puede quedar corto para roles quirúrgicos ricos | `SurgeryContactAssignment` cubre roles flexibles sin duplicar contactos |
| Reglas de negocio no definidas pueden generar estructura incorrecta | Cada fase requiere aprobación antes de migrar; preguntas abiertas van a Franco |

---

## 9. Plan de implementación por fases

### Fase 0 — Aprobación (AHORA)

- Franco aprueba este ADR.
- Se responden las preguntas abiertas de la sección 11.
- Se confirma estrategia de contactos/roles y separación de estados.

### Fase 1 — Cirugía core (primer cambio de schema)

- Expandir `Surgery` con `visibleNumber`, `payerContactId`, `cxStatus`, `prepStatus`, `classification`, `description`, `priority`, fechas adicionales.
- Crear `SurgeryContactAssignment`.
- Renombrar `patientId` → `patientContactId`, etc., manteniendo relaciones.
- Migrar datos existentes: mapear `status` actual a `cxStatus` y `prepStatus` según reglas de migración.
- Actualizar `surgery.service.ts` y validadores.
- Actualizar adaptadores de `/cirugias-api`.
- No tocar `/cirugias` principal.

### Fase 2 — Autorización

- Crear `SurgeryAuthorization`.
- Endpoints y servicios de autorización (CRUD + historial de versiones).
- Conectar al flujo de `cxStatus` (transición `unauthorized` → `authorized`).

### Fase 3 — Circuito operativo base

- Crear `SurgeryPreparation` + `SurgeryPreparationLine`.
- Crear `SurgeryDeliveryNote` + `SurgeryDeliveryNoteLine`.
- Crear `SurgeryConsumption` + `SurgeryConsumptionLine`.
- Crear `SurgeryReturn` + `SurgeryReturnLine`.
- Endpoints y servicios correspondientes.
- Comparativa calculada desde consumo vs devolución.

### Fase 4 — Documentos

- Crear `SurgeryDocument`.
- Checklist documental (opcional: `SurgeryDocumentRequirement`).
- Endpoints de subida de metadata (sin storage provider atado).

### Fase 5 — Trazabilidad operativa

- Crear `SurgeryOperationalEvent`.
- Registrar eventos en cada acción crítica del circuito.
- Endpoint de historial de expediente.

### Fase 6 — Logística (opcional / puede fusionarse)

- Crear `SurgeryLogistics` o integrar hitos logísticos en remitos.

---

## 10. Preguntas abiertas para Franco

1. **Separación de estados**: ¿Estás de acuerdo con separar `cxStatus` y `prepStatus` como campos independientes en `Surgery`, o preferís otra estrategia (tabla de estados, máquina de estados explícita)?

2. **Número visible de cirugía**: ¿Se necesita numeración configurable por empresa (prefijo + año + secuencia)? ¿O con un `visibleNumber` libre alcanza para V1?

3. **Cliente pagador**: ¿El pagador se asigna directo en `Surgery.payerContactId` o preferís que se derive desde la autorización (`SurgeryAuthorization.payerContactId`)? ¿Puede haber más de un pagador por cirugía?

4. **Roles quirúrgicos**: ¿Qué roles necesitás sí o sí en V1? (coordinador, vendedor, instrumentador, transporte, otro). ¿Alguno es obligatorio?

5. **Documentos**: ¿Querés checklist documental rígido por tipo de cirugía, o alcanza con metadata libre de documentos adjuntos en V1?

6. **Storage provider**: ¿Tenés preferencia preliminar entre Supabase Storage, S3/R2 u otro? ¿O lo dejamos abstracto hasta tener el circuito base funcionando?

7. **Presupuestos**: ¿Los presupuestos se vinculan 1:1 con cirugía, o puede haber múltiples presupuestos por cirugía (versiones, alternativas)?

8. **Remitos sin preparación**: ¿Se permite emitir remito sin una preparación formal previa, o siempre se deriva de una preparación?

9. **Consumo sin remito**: ¿Se permite cargar consumo directo sin remito (ej.: consumo manual en quirófano sin envío formal)?

10. **Comparativa**: ¿La comparativa (enviado vs consumido vs devuelto) se calcula on-the-fly o se necesita persistir un snapshot?

11. **Eventos operativos vs AuditEvent**: ¿Alcanza con `SurgeryOperationalEvent` para el historial del expediente, o necesitás que `AuditEvent` también se muestre en el expediente?

12. **Prioridad de fases**: ¿Fase 1 (core + estados) es la prioridad máxima? ¿O hay urgencia por autorización o documentos antes que preparación/remitos?

---

## Handoff

### Done
- Redactado ADR-028 con diagnóstico, decisión, principios, modelo actual, modelo futuro completo por fases, separación de estados, riesgos, plan de implementación y preguntas abiertas.
- Documento fundamentado en archivos reales del repo: `prisma/schema.prisma` actual, `knowledge/domain/SURGERY_EXPEDIENTE.md`, `knowledge/architecture/DATA_MODEL_RULES.md`, `knowledge/architecture/MULTI_COMPANY_ACCESS.md`, `knowledge/architecture/AUDIT_EVENT_POLICY.md`, `knowledge/core/CANONICAL_DECISIONS.md`.

### Changed
- Creado `knowledge/domain/SURGERY_DB_DESIGN.md`.
- Ningún archivo de código modificado.

### Files
- `knowledge/domain/SURGERY_DB_DESIGN.md` — ADR completo con diseño DB por fases.

### Validations
- `git status --short` — pendiente de ejecutar
- `git diff --name-only` — pendiente de ejecutar

### Risks
- ADR requiere aprobación de Franco antes de cualquier cambio de schema.
- Las 12 preguntas abiertas deben responderse para afinar Fase 1.
- Si se aprueba sin resolver la separación de estados, el modelo actual seguirá mezclando dimensiones.

### Next
- Revisión y aprobación de Franco.
- Responder preguntas abiertas.
- Con aprobación, iniciar Fase 1: spec de migración mínima de `Surgery` + `SurgeryContactAssignment`.
