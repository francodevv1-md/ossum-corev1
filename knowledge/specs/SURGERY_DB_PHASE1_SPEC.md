# Spec — Surgery DB Phase 1 (Core Expansion)

Estado: **spec técnica para 12D — no implementar sin aprobación**  
Precedentes: ADR-028 (`knowledge/domain/SURGERY_DB_DESIGN.md`), commit `d33efc6`  
Objetivo: especificar el cambio mínimo de schema y código para Fase 1 del modelo de Cirugías  
Alcance: `Surgery` expandido + `SurgeryContactAssignment` + adaptación de servicios/validators/rutas

---

## 1. Campos mínimos a agregar a `Surgery`

### Nuevos campos (todos opcionales salvo `cxStatus`)

| Campo | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `visibleNumber` | `String?` | `null` | no | Número visible configurable (prefijo + año + secuencia). String libre en V1. |
| `payerContactId` | `String?` | `null` | no | FK a `Contact`. Cliente pagador / financiador / obra social. |
| `cxStatus` | `String` | `"pending"` | **sí** | Estado clínico / quirúrgico. Reemplaza el rol de `status` como estado CX primario. |
| `prepStatus` | `String?` | `null` | no | Estado de preparación / material. `null` = sin preparación iniciada. |
| `classification` | `String?` | `null` | no | Tipo de cirugía o categoría (ej.: "traumatología", "cadera", "columna"). |
| `description` | `String?` | `null` | no | Descripción libre o diagnóstico. |
| `priority` | `String?` | `null` | no | Prioridad: `"normal"`, `"urgent"`, `"scheduled"`. |
| `probableDate` | `DateTime?` | `null` | no | Fecha tentativa de cirugía. |
| `scheduledDate` | `DateTime?` | `null` | no | Fecha programada. |
| `performedDate` | `DateTime?` | `null` | no | Fecha de realización efectiva. |
| `cancelledDate` | `DateTime?` | `null` | no | Fecha de cancelación. |
| `source` | `String?` | `null` | no | Origen del caso (`"manual"`, `"integration"`, etc.). |

### Cambios en campos existentes

| Campo | Cambio |
|---|---|
| `surgeryDate` | Pasa de **requerido** a **opcional** (`DateTime?`). Seguirá siendo la fecha principal de referencia por compatibilidad. |
| `status` | **Se elimina** y se reemplaza por `cxStatus` + `prepStatus`. |
| `patientId` | **Se mantiene con el mismo nombre**. Renombrar a `patientContactId` es breaking sin beneficio operativo en Fase 1. |
| `doctorId` | Se mantiene. |
| `institutionId` | Se mantiene. |

### Decisión sobre renaming de campos

El ADR-028 propone renombrar `patientId` → `patientContactId`, etc. **No se hace en Fase 1** porque:
- Rompe el seed existente sin agregar valor funcional inmediato.
- El nombre actual ya es claro y está integrado en servicios, validators, seed y API.
- Se puede hacer en una fase futura si se justifica, o dejarse como está.

---

## 2. Enums nuevos

### `CX_STATUS` — Estados clínicos / quirúrgicos

```typescript
export const CX_STATUSES = [
  "unauthorized",  // sin autorización del pagador
  "authorized",    // autorización confirmada
  "scheduled",     // programada con fecha
  "performed",     // cirugía realizada
  "finalized",     // caso cerrado
  "suspended",     // suspendida temporalmente
  "cancelled",     // cancelada definitivamente
] as const;

export type CxStatus = (typeof CX_STATUSES)[number];
```

### `PREP_STATUS` — Estados de preparación / material

```typescript
export const PREP_STATUSES = [
  "preparing",           // en preparación activa
  "frozen",              // preparación congelada (lista para envío)
  "frozen_with_missing", // congelada con faltantes
  "shipped",             // material despachado
  "delivered",           // material entregado en institución
  "returned",            // material retirado / devuelto
] as const;

export type PrepStatus = (typeof PREP_STATUSES)[number];
```

### `SURGERY_PRIORITY`

```typescript
export const SURGERY_PRIORITIES = [
  "normal",
  "urgent",
  "scheduled",
] as const;

export type SurgeryPriority = (typeof SURGERY_PRIORITIES)[number];
```

### `SURGERY_CONTACT_ROLE` — Roles para `SurgeryContactAssignment`

```typescript
export const SURGERY_CONTACT_ROLES = [
  "coordinator",
  "salesperson",
  "instrumentator",
  "transporter",
  "assistant",
  "observer",
  "other",
] as const;

export type SurgeryContactRole = (typeof SURGERY_CONTACT_ROLES)[number];
```

---

## 3. Diseño exacto de `SurgeryContactAssignment`

### Modelo Prisma

```prisma
model SurgeryContactAssignment {
  id         String   @id @default(cuid())
  surgeryId  String
  contactId  String
  role       String               // SurgeryContactRole
  isPrimary  Boolean  @default(false)
  notes      String?
  createdAt  DateTime @default(now())

  surgery Surgery @relation(fields: [surgeryId], references: [id], onDelete: Cascade)
  contact Contact @relation(fields: [contactId], references: [id])

  @@unique([surgeryId, contactId, role])
  @@index([surgeryId])
  @@index([contactId])
}
```

### Reglas de negocio

1. Un mismo contacto puede tener múltiples roles en la misma cirugía.
2. Solo un contacto puede ser `isPrimary = true` por `(surgeryId, role)`.
3. `contactId` debe pertenecer a la misma `companyId` que la cirugía (validado en servicio vía `ContactCompanyLink`).
4. Al eliminar una cirugía, se eliminan sus asignaciones (`onDelete: Cascade`).
5. El seed no necesita asignaciones de contacto en Fase 1 — se agregan cuando exista UI para gestionarlas.

---

## 4. Campos existentes que se mantienen

| Campo | Se mantiene | Nota |
|---|---|---|
| `id` | ✅ | sin cambios |
| `companyId` | ✅ | sin cambios |
| `branchId` | ✅ | sin cambios |
| `patientId` | ✅ | sin cambios |
| `doctorId` | ✅ | sin cambios |
| `institutionId` | ✅ | sin cambios |
| `notes` | ✅ | sin cambios |
| `createdAt` | ✅ | sin cambios |
| `updatedAt` | ✅ | sin cambios |

---

## 5. Campos que NO se tocan todavía

- `surgeryDate` → se vuelve opcional, pero no se elimina.
- `status` → **se elimina**, reemplazado por `cxStatus` + `prepStatus`.
- Ningún otro modelo (`Contact`, `Company`, `Branch`, `AuditEvent`, etc.).

---

## 6. Migración Prisma para 12D

### Archivo de migración

Se genera con `npx prisma migrate dev --name surgery_phase1_core`.

### Cambios en `schema.prisma`

#### Modelo `Surgery` (reemplazo completo del bloque actual, líneas 187-207)

```prisma
// ─── Cirugía (Fase 1 — core expandido) ─────────────────────────────

model Surgery {
  id              String    @id @default(cuid())
  companyId       String
  branchId        String?
  visibleNumber   String?
  patientId       String
  doctorId        String?
  institutionId   String?
  payerContactId  String?
  classification  String?
  description     String?
  priority        String?
  cxStatus        String    @default("pending")
  prepStatus      String?
  probableDate    DateTime?
  scheduledDate   DateTime?
  surgeryDate     DateTime?
  performedDate   DateTime?
  cancelledDate   DateTime?
  source          String?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])
  branch      Branch?  @relation(fields: [branchId], references: [id])
  patient     Contact  @relation("PatientSurgeries", fields: [patientId], references: [id])
  doctor      Contact? @relation("DoctorSurgeries", fields: [doctorId], references: [id])
  institution Contact? @relation("InstitutionSurgeries", fields: [institutionId], references: [id])
  payer       Contact? @relation("PayerSurgeries", fields: [payerContactId], references: [id])

  contactAssignments SurgeryContactAssignment[]
}
```

#### Modelo `SurgeryContactAssignment` (nuevo, después de Surgery)

```prisma
// ─── Asignación de Contacto a Cirugía ──────────────────────────────

model SurgeryContactAssignment {
  id         String   @id @default(cuid())
  surgeryId  String
  contactId  String
  role       String
  isPrimary  Boolean  @default(false)
  notes      String?
  createdAt  DateTime @default(now())

  surgery Surgery @relation(fields: [surgeryId], references: [id], onDelete: Cascade)
  contact Contact @relation(fields: [contactId], references: [id])

  @@unique([surgeryId, contactId, role])
  @@index([surgeryId])
  @@index([contactId])
}
```

#### Relación faltante en `Contact` (agregar solo la línea de `payerSurgeries`)

En el modelo `Contact`, a la altura de las líneas 117-119 donde están las relaciones `patientSurgeries`, `doctorSurgeries`, `institutionSurgeries`, agregar:

```prisma
  payerSurgeries           Surgery[]                @relation("PayerSurgeries")
```

### Datos existentes

La migración debe manejar los datos del seed actual:
- La cirugía demo existente (`sgdevsurgery1000000000000`) tiene `status: "pending"`.
- Se migra a `cxStatus: "pending"`, `prepStatus: null`, `surgeryDate` se mantiene con su valor actual.

### Rollback

Si falla, no hay rollback automático. Se requiere restaurar desde backup o recrear la DB de DEV. El seed es idempotente y puede re-ejecutarse.

---

## 7. Servicios que habría que ajustar

### `src/lib/services/surgery.service.ts`

| Cambio | Detalle |
|---|---|
| `surgeryReadSelect` | Agregar nuevos campos (`visibleNumber`, `payerContactId`, `cxStatus`, `prepStatus`, `classification`, `description`, `priority`, `probableDate`, `scheduledDate`, `performedDate`, `cancelledDate`, `source`) y mantener los existentes. Eliminar `status`. Agregar `payer` nested select idéntico a `patient`/`doctor`/`institution`. |
| `SurgeryAuditShape` | Agregar nuevos campos, eliminar `status`. |
| `serializeSurgeryForAudit` | Agregar nuevos campos, eliminar `status`. |
| `ListSurgeriesOptions` | Agregar filtros opcionales: `cxStatus`, `prepStatus`, `payerContactId`, `priority`. Eliminar `status`. |
| `listSurgeriesByCompany` | Mapear nuevos filtros al where. Reemplazar `status` por `cxStatus`. |
| `createSurgery` | Aceptar nuevos campos via `CreateSurgeryInput`. Validar `payerContactId` en `assertSurgeryReferencesBelongToCompany`. |
| `updateSurgery` | Aceptar nuevos campos via `UpdateSurgeryInput`. Validar `payerContactId`. |
| `updateSurgeryStatus` | **Separar en dos funciones** o aceptar `cxStatus` y `prepStatus` por separado. Mínimo: renombrar a `updateSurgeryCxStatus` para claridad. |
| `assertSurgeryReferencesBelongToCompany` | Agregar validación de `payerContactId` via `ContactCompanyLink`. |

### `src/lib/services/contact.service.ts`

| Cambio | Detalle |
|---|---|
| Sin cambios | `assertContactsBelongToCompany` ya acepta array de IDs — solo hay que pasarle también `payerContactId`. |

### Nuevo servicio (opcional en Fase 1)

Si se quiere gestionar `SurgeryContactAssignment` desde API, se necesitaría:

- `src/lib/services/surgery-contact-assignment.service.ts`
  - `assignContact(surgeryId, contactId, role, isPrimary?)`
  - `removeContact(assignmentId)`
  - `listAssignments(surgeryId)`
  - Validación de `ContactCompanyLink` para cada `contactId`.

Pero esto puede diferirse a una sub-fase 1B si el foco de 12D es solo el modelo de datos.

---

## 8. Validators que habría que ajustar

### `src/lib/validators/surgery.validator.ts`

| Cambio | Detalle |
|---|---|
| `CreateSurgeryInput` | Agregar campos opcionales: `visibleNumber?`, `payerContactId?`, `cxStatus?`, `prepStatus?`, `classification?`, `description?`, `priority?`, `probableDate?`, `scheduledDate?`, `performedDate?`, `cancelledDate?`, `source?`. Eliminar `status?`. |
| `UpdateSurgeryInput` | Ídem. |
| `UpdateSurgeryStatusInput` | Cambiar a `UpdateSurgeryCxStatusInput` con `cxStatus: string`. |
| `SURGERY_STATUSES` | **Eliminar** y reemplazar por `CX_STATUSES` + `PREP_STATUSES`. |
| `SurgeryStatus` type | **Eliminar** y reemplazar por `CxStatus` + `PrepStatus`. |
| `SURGERY_STATUS_LABELS` | Reemplazar por `CX_STATUS_LABELS` + `PREP_STATUS_LABELS`. |
| `SURGERY_INITIAL_STATUS` | Cambiar a `CX_INITIAL_STATUS = "pending"`. |
| `SURGERY_TERMINAL_STATUSES` | Reemplazar por `CX_TERMINAL_STATUSES = ["finalized", "cancelled"]`. Nota: `suspended` ya no es terminal — una cirugía suspendida puede reactivarse. |
| `SURGERY_STATUS_TRANSITIONS` | Reemplazar por `CX_STATUS_TRANSITIONS` exclusivo para cxStatus. |
| `validateSurgeryStatus` | Reemplazar por `validateCxStatus` + `validatePrepStatus`. |
| `validateSurgeryStatusTransition` | Reemplazar por `validateCxStatusTransition`. |
| `validateCreateSurgeryInput` | Validar nuevos campos: `cxStatus` default a `"pending"`, `prepStatus` opcional, `priority` debe estar en `SURGERY_PRIORITIES` si se provee, fechas deben ser `Date` válidas. |
| `validateUpdateSurgeryInput` | Ídem para update. |
| `validateUpdateSurgeryStatusInput` | Reemplazar por `validateUpdateSurgeryCxStatusInput`. |

### Transiciones CX (reemplazan las actuales mixtas)

```typescript
export const CX_STATUS_TRANSITIONS: Partial<Record<CxStatus, readonly CxStatus[]>> = {
  unauthorized: ["authorized", "scheduled", "suspended", "cancelled"],
  authorized:   ["scheduled", "suspended", "cancelled"],
  scheduled:    ["performed", "suspended", "cancelled"],
  performed:    ["finalized", "suspended"],
  suspended:    ["authorized", "scheduled", "cancelled"],  // ← suspended ya no es terminal
};
```

`finalized` y `cancelled` no tienen transiciones de salida (terminales).

---

## 9. Seeds mínimos para Fase 1

### `prisma/seed.ts`

El seed actual ya incluye:
- `payer` (Contact con `contactType: "payer"`)
- `payerLink` (ContactCompanyLink con `role: "payer"`)

**Cambios necesarios:**

1. En la creación de la cirugía demo (línea ~320-335), actualizar:
   - Agregar `payerContactId: payer.id`
   - Reemplazar `status: "pending"` por `cxStatus: "pending"`
   - Agregar `classification: "traumatología general"`
   - Agregar `description: "Cirugía demo DEV — traumatología general"`
   - Agregar `priority: "normal"`
   - Agregar `source: "seed"`
   - Eliminar `notes` existente o mantenerlo como está

2. En el `AuditEvent` de seed (línea ~338-365), actualizar `newValue` para reflejar los nuevos campos.

3. **No se crean `SurgeryContactAssignment`** en el seed de Fase 1.

---

## 10. Smoke que validaría la Fase 1

### Validaciones mínimas (sin modificar código de smoke)

| # | Validación | Comando / flujo |
|---|---|---|
| 1 | `prisma migrate dev` sin errores | `npx prisma migrate dev --name surgery_phase1_core` |
| 2 | `prisma generate` sin errores | `npx prisma generate` |
| 3 | `npx prisma db seed` sin errores y con nuevos campos | Verificar output del seed |
| 4 | `GET /api/companies/[companyId]/surgeries` devuelve nuevos campos | Smoke con header DEV |
| 5 | `GET /api/companies/[companyId]/surgeries/[surgeryId]` incluye `payer` nested | Smoke con header DEV |
| 6 | `GET /cirugias-api` sigue funcionando con nuevos campos | Smoke de página |
| 7 | `GET /cirugias` sin cambios, sigue funcionando | Smoke de página |
| 8 | `tsc --noEmit` sin errores | TypeScript check |
| 9 | `git status --short` solo muestra archivos esperados | Verificación de scope |

### Fuera de smoke en Fase 1
- No se prueba PATCH status (cambió la semántica).
- No se prueba mutación de `SurgeryContactAssignment`.
- No se prueba filtro por `cxStatus` o `prepStatus`.

---

## 11. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| La migración rompe el seed porque `status` ya no existe | Alta | Medio | El seed se actualiza en el mismo commit. Idempotente. |
| `surgeryDate` pasa a opcional y rompe queries que asumen `not null` | Media | Alto | El campo se mantiene en el select y la migración preserva datos existentes. Ningún query actual asume `not null` a nivel aplicación (solo a nivel DB). |
| Cambio de `status` a `cxStatus` + `prepStatus` rompe `/cirugias-api` | Alta | Medio | El adapter (`surgery-adapter.ts`) lee `status` — debe actualizarse para leer `cxStatus`. |
| `updateSurgeryStatus` actual recibe un solo `status` y ahora hay dos dimensiones | Alta | Alto | Separar en `updateSurgeryCxStatus` y `updateSurgeryPrepStatus`, o aceptar ambas en el body. Mínimo: actualizar la ruta PATCH status existente. |
| La ruta `PATCH .../status` se rompe porque valida contra `SURGERY_STATUSES` viejo | Alta | Alto | Actualizar la ruta o marcarla como deprecated temporalmente. |
| `Contact` necesita la nueva relación `payerSurgeries` | Media | Bajo | Agregar una línea en el modelo `Contact`. No rompe nada existente. |
| `/cirugias` principal podría romperse si consume `status` del store local | Baja | Bajo | `/cirugias` principal no se toca. Si el store de Zustand expone `status`, sigue funcionando con datos locales. |

---

## 12. Decisión final: implementar o frenar

### Decisión: **IMPLEMENTAR** — con condiciones

**Fundamento:**
- La separación de `cxStatus` y `prepStatus` es la corrección estructural más urgente identificada en el ADR-028.
- Los cambios son aditivos (campos nuevos opcionales) salvo la eliminación de `status`, que tiene migración clara.
- El seed ya tiene payer y los servicios ya validan contactos — el esqueleto está listo.
- La superficie de riesgo es acotada: 3 archivos de código (`surgery.service.ts`, `surgery.validator.ts`, `surgery-adapter.ts`) + `schema.prisma` + `seed.ts`.
- `/cirugias` principal queda intacto.

**Condiciones para 12D:**
1. El commit debe ser atómico: schema + migración + servicios + validators + adapter + seed en un solo commit.
2. No se implementa `SurgeryContactAssignment` service/API en este commit (solo el modelo en Prisma).
3. La ruta `PATCH .../status` se actualiza para aceptar `cxStatus` (y opcionalmente `prepStatus`), o se desactiva temporalmente si el riesgo es alto.
4. Se ejecuta el ciclo Diagnose completo si algo falla en migración, build o smoke.
5. No se mergea sin smoke pasado.

### Si Franco decide FRENAR:
- Se escribe una nota en el ADR explicando el bloqueo.
- No se hace ningún cambio de schema.
- Se espera respuesta a las 12 preguntas abiertas del ADR-028.

---

## Resumen de archivos a tocar en 12D

| Archivo | Tipo de cambio |
|---|---|
| `prisma/schema.prisma` | Reemplazar modelo `Surgery` + agregar `SurgeryContactAssignment` + agregar relación `payerSurgeries` en `Contact` |
| `prisma/migrations/*` (nueva) | Generada por `prisma migrate dev` |
| `prisma/seed.ts` | Actualizar creación de surgery demo con nuevos campos |
| `src/lib/validators/surgery.validator.ts` | Reemplazar status único por cxStatus/prepStatus, agregar validación de nuevos campos |
| `src/lib/services/surgery.service.ts` | Agregar nuevos campos a selects, filtros, audit shape, create/update/status |
| `src/lib/api/surgery-adapter.ts` | Leer `cxStatus` en lugar de `status`, agregar `payerName` |
| `src/app/api/companies/[companyId]/surgeries/[surgeryId]/status/route.ts` | Actualizar para aceptar `cxStatus` (y opcionalmente `prepStatus`) |

### Archivos explícitamente NO tocados

- `src/app/cirugias/page.tsx`
- `src/app/cirugias-api/page.tsx` (salvo que el adapter cambie y la página necesite ajuste menor de tipos)
- `src/hooks/useCirugia*.ts`
- `src/lib/store.ts`
- `src/components/cirugias/*`
- `src/components/expediente/*`
- `knowledge/domain/SURGERY_EXPEDIENTE.md`
- `knowledge/domain/SURGERY_DB_DESIGN.md`

---

## Handoff

### Done
- Especificados 12 nuevos campos para `Surgery`, 3 enums, modelo `SurgeryContactAssignment`.
- Definida migración Prisma exacta con cambios en `schema.prisma` y `Contact`.
- Mapeados todos los ajustes necesarios en servicios, validators, adapter, seed y API routes.
- Listados 9 smoke checks para validar Fase 1.
- Evaluados 7 riesgos con mitigación.
- Decisión: implementar con condiciones.

### Changed
- Solo `knowledge/specs/SURGERY_DB_PHASE1_SPEC.md` (nuevo).

### Files
- `knowledge/specs/SURGERY_DB_PHASE1_SPEC.md` — spec completa para 12D.

### Validations
- Pendientes: `git status --short`, `git diff --name-only`.

### Risks
- Spec asume que Franco aprueba el ADR-028 o al menos la dirección de Fase 1.
- Si no se aprueba separación de estados, esta spec no debe ejecutarse.
- `PATCH .../status` requiere decisión de diseño: ¿acepta `cxStatus` + `prepStatus` en un solo endpoint o se separa en dos?

### Next
- 12D: implementar esta spec (migración + código + seed + smoke).
