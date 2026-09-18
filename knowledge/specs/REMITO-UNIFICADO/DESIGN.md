# DESIGN — Remito Unificado (DESIGN-REMITO-UNIFICADO)

Estado: **docs sincronizados con contrato backend/UI real vigente**. Franco aceptó el contrato implementado el 2026-07-07; el sync 2026-07-08 registra gaps backend cerrados, `/remitos` backend-backed y Ficha CX con resumen compacto.
Los gates originales quedan resueltos o supersedidos donde contradicen la implementación real.
Fecha: 2026-07-08
Task: DESIGN-REMITO-UNIFICADO
Modo: docs sync — lectura sobre implementación real; escritura exclusiva en `knowledge/specs/REMITO-UNIFICADO/`.

Lectura corta: ver `PROPOSAL.md` en este mismo directorio.

---

## 0. Contexto base confirmado (no re-demostrado)

### 0.1 Sync 2026-07-07 — contrato real aceptado

Franco decidió aceptar el backend implementado como contrato vigente. Este documento ya no describe un diseño previo que bloquea implementación, sino el contrato real y los pendientes enfocados vigentes. Las recomendaciones originales que contradicen lo implementado quedan **supersedidas**.

Contrato real vigente:

- `visibleNumber Int?` único por empresa, no `String?` con formato `R-####`.
- `RemitoItem.quantity` y `RemitoItem.returnedQuantity` son `Decimal @db.Decimal(18,4)`.
- `destinatarioSnapshot Json?` nullable en V0.
- `createdById String?` nullable en V0.
- `createdBy` y `updatedBy` son relaciones nullable con `onDelete: SetNull`.
- `origin` y `state` siguen como catálogos `String` en validator/service.
- `surgeryId String?`, `boxId String?`, `presupuestoId String?` quedan como stubs/nullable según implementación.
- No hay back-write `surgery.remitoId`; la relación canónica es query-side vía `Remito.surgeryId`.

Gaps documentados el 2026-07-07 y estado al sync 2026-07-08:

- **Cerrado**: route explícita `POST /api/companies/[companyId]/remitos/[remitoId]/emitir` conectada a `emitirRemito`.
- **Cerrado**: `PATCH /api/companies/[companyId]/remitos/[remitoId]` para update de borrador vía `updateRemitoDraft`.
- **Cerrado**: la route de estado acepta body `{ state }` y mantiene compatibilidad con `{ newState }`; el validator normaliza a `newState`.
- **Cerrado**: timestamps/transitions alineados: `issuedAt` en emisión/`Emitido`, `deliveredAt` en `Entregado`, `returnedAt` sólo en `Devuelto` final.
- Roles reales difieren de la propuesta original: mutación `['admin','coordinador','logistica']`; lectura `['admin','coordinador','logistica','vendedor','matrona','instrumentador']`.

Estado UI confirmado al 2026-07-08:

- `/remitos` consume backend por `useRemitos` + `src/lib/api/remitos.ts`: listado, detalle, refresh, emitir, transición de estado, devolución explícita e impresión/PDF de navegador.
- `/remitos` incluye creación y edición de borradores mediante `RemitoDraftDialog`.
- Ficha CX es la superficie real de detalle quirúrgico; aunque los componentes vivan bajo `src/components/expediente/*`, la página standalone `/expediente` queda legacy/deprecada por ahora.
- Ficha CX incluye `RemitosSummaryCard`, backend-backed por `surgeryId`, y el CTA `Ver remitos` cambia a la pestaña **Logística**.
- Pendiente: el panel completo de Remitos dentro de Logística (`LogisticaTabContent` → `RemitosPanel`) aún consume `Remito[]` legado por props; falta DTO backend por `surgeryId` en `REMITO-FICHA-DTO-001`.

Confirmado contra el working tree antes de redactar el modelo:

- **IDs**: `String @id @default(cuid())` en todo el schema (`Organization`, `Company`, `Surgery`, `AuditEvent`, …). `Remito`/`RemitoItem` heredan este patrón.
- **`companyId`**: `String` con FK `Company @relation(fields:[companyId], references:[id])`. Scoping obligatorio en toda query operacional (patrón `Surgery`, `SeguimientoEntry`, `AuditEvent`, `DigitalReceipt`).
- **`visibleNumber`**: para Remito el contrato real es `Int?`, autocalculado por empresa al emitir dentro de `$transaction` con lock de tabla y retry por `P2034`. Queda supersedida la recomendación previa de `String?` con prefijo `R-`.
- **`Surgery`** no tiene `remitoId` en el schema Prisma (es field solo del mock frontend `src/types/index.ts`/`store.ts`). → No hay campo que eliminar en Prisma; la unificación **no** requiere backfill ni drop en `Surgery`.
- **`AuditEvent`**: campos `companyId, userId, entityType String, entityId String, action String, detail String?, oldValue Json?, newValue Json?, module String, metadata Json?, createdAt`. Wrapper `createAuditEvent` en `src/lib/audit.ts` recibe `prisma` (incluye `Prisma.TransactionClient`); se invoca **dentro** de la `$transaction`.
- **Auth**: `getApiAuthContext(request, companyId)` → `ApiAuthContext { actorUserId, supabaseAuthId, companyId, role, source }`. Guards `requireCompanyReadAccess` / `requireCompanyMutationAccess(ctx, allowedRoles)`. Roles inline por servicio (`SURGERY_MUTATION_ROLES = ['admin','manager','coordinator','owner','super_admin']`).
- **Validator pattern** (`src/lib/validators/surgery.validator.ts`): TS plano, sin librería Zod; catalog consts (`CX_STATUS`, `PREP_STATUS`, …), type guards, label records, `CX_STATUS_TRANSITIONS` map, funciones `validateX` que lanzan `badRequest(...)` de `src/lib/api/errors`.
- **Service pattern** (`src/lib/services/surgery.service.ts`): DI de `PrismaClient`; `ActorContext` con `actorUserId`/`companyId`/`source`/`module`; `requireCompanyId`; `assertActorCanMutate…` vía `UserCompanyAccess.findFirst({ role: { in: [...] } })`; `prisma.$transaction(async (tx) => { …; createAuditEvent({ prisma: tx, … }); }, { isolationLevel: Serializable })`; retry por `P2034`.
- **`Box`** y **`Presupuesto`** NO existen como modelo Prisma (sólo mock frontend `src/types/index.ts`). → `boxId`/`presupuestoId` serán **stubs planos nullable** en V0.
- **`PLAN_CONTINUIDAD` §15**: la lista de decisions pendientes incluye el item #1 (Remito unificado V1/V2) y #11 (permisos centralizados). Las gates de §7 mapean a esos items; no se inventan decisions nuevas.
- **Conflicto C4** (`§5`): V1 back-writea `surgery.remitoId + state`; V2 no. **C6**: `createConsumptionFromDeliveryNote` no setea `consumo.remitoId`. El diseño corrige C4 (eliminar back-write) y declara contrato para que Fase 1B repare C6.

---

## 1. Entidades de dominio

### 1.1 `Remito`

Entidad raíz companies-scoped. Registra **lo que sale** (no lo que se consume — ver §6).

| Campo | Tipo Prisma vigente | Nullable | Notas |
|---|---|---|---|
| `id` | `String @id @default(cuid())` | no | ID técnico interno. |
| `companyId` | `String` | no | FK directo `Company`. Scoping obligatorio. |
| `visibleNumber` | `Int?` | sí | Número visible por empresa. Autocalculado al emitir con `getNextVisibleNumber`. **Supersede** la propuesta `String?`/`R-####`. |
| `surgeryId` | `String?` | **sí** | FK `Surgery`. **Nullable** porque remitos logísticos (traslado/reposición/movimiento de stock) pueden no estar vinculados a una cirugía (`PREPARACION_REMITOS_CONSUMO.md` §2: “cirugía vinculada **si aplica**”). Si una cirugía cambia de empresa, el constraint se valida en service (assertSurgeryBelongsToCompany). Anular el remito no borra la cirugía; borrar la cirugía debe `SetNull` (decisión de onDelete: ver §2). |
| `origin` | `String` | no | Catálogo controlado en validator: `"box"` \| `"presupuesto"` \| `"manual"` \| `"mixto"`. String (no enum Prisma) — respeta `DATA_MODEL_RULES.md` “evitar enums rígidos”. Determina el camino de creación V1 (box→logística) vs V2 (presupuesto→comercial) vs ambos (mixto). |
| `boxId` | `String?` | sí | **Stub plano sin FK en V0** (modelo `Box` no existe hasta Fase 3). Nullable. El contrato actual no exige consistencia `origin↔boxId`; esa regla queda como mejora futura si Franco la confirma. |
| `presupuestoId` | `String?` | sí | **Stub plano sin FK en V0** (modelo `Presupuesto` lands Fase 1C). Nullable. El contrato actual no exige consistencia `origin↔presupuestoId`; esa regla queda como mejora futura si Franco la confirma. |
| `destinatarioSnapshot` | `Json?` | sí | Snapshot del receptor legal. En V0 es nullable para soportar borradores/system-created; la inmutabilidad al emitir queda como regla de producto a reforzar en UI/PDF/backend posterior. |
| `state` | `String` | no | Catálogo controlado en validator (ver §1.3). Default `"Borrador"`. String (no enum Prisma) — patrón `Surgery.cxStatus`. |
| `issuedAt` | `DateTime?` | sí | Timestamp de emisión (transición `Borrador→Emitido`). Seteado por `emitirRemito`. |
| `deliveredAt` | `DateTime?` | sí | Seteado en transición `Emitido`/`En_transito`→`Entregado`. |
| `returnedAt` | `DateTime?` | sí | Timestamp de devolución final. Se setea sólo cuando el remito queda `Devuelto`; la devolución parcial mantiene `returnedAt=null`. |
| `createdById` | `String?` | sí | FK `User` nullable en V0 para remitos system-created o sin actor local. |
| `updatedById` | `String?` | sí | FK `User` (relación named `RemitoUpdatedBy`). Último mutador. Nullable porque updates vía `updateMany` no siempre lo setean en V0 (mejorar en Fase 4F auditoría uniforme). |
| `metadata` | `Json?` | sí | Campos libres extensibles **no críticos** (transporte, logística, observaciones internas, fotos refs, ficha técnica ref, firma confirmación). No usar como fuente de relación. |
| `createdAt` | `DateTime @default(now())` | no | Auditoría estándar. |
| `updatedAt` | `DateTime @updatedAt` | no | Auditoría estándar. |

Relaciones Prisma:

- `company Company @relation(fields:[companyId], references:[id])` (añadir `remitos Remito[]` en `Company`).
- `surgery Surgery? @relation(fields:[surgeryId], references:[id], onDelete: SetNull)` (añadir `remitos Remito[]` en `Surgery`). `SetNull`: borrar cirugía no borra remito emitido (inmutabilidad legal); el remito queda con `surgeryId=null` y audit. Decisión revocable si Franco exige `Cascade` (escalar).
- `createdBy User? @relation("RemitoCreatedBy", fields:[createdById], references:[id], onDelete: SetNull)` (relación nullable vigente).
- `updatedBy User? @relation("RemitoUpdatedBy", fields:[updatedById], references:[id], onDelete: SetNull)` (añadir `updatedRemitos Remito[] @relation("RemitoUpdatedBy")` en `User`).
- `items RemitoItem[]` (cascade delete: al borrar remito en Borrador, se borran items).

Índices: ver §2.

### 1.2 `RemitoItem`

Línea de remito. Snapshot del ítem remitido (no FK a catálogo hasta que `StockItem`/`PresupuestoItem` existan).

| Campo | Tipo vigente | Nullable | Notas |
|---|---|---|---|
| `id` | `String @id @default(cuid())` | no | |
| `remitoId` | `String` | no | FK `Remito`, `onDelete: Cascade`. |
| `itemId` | `String?` | sí | ID lógico del origen (stockItemId, presupuestoItemId, catalogItemId). Stub plano. Nullable para items manuales fuera de catálogo (`PREPARACION_REMITOS_CONSUMO.md` §5: matching no confiable). |
| `sku` | `String?` | sí | Snapshot de código/sku. |
| `description` | `String` | no | Snapshot de descripción. Requerido (no puede haber un item sin descripción). |
| `quantity` | `Decimal @db.Decimal(18,4)` | no | Decimal aceptado como contrato real. Permite fracciones de caja/lote; supersede `Decimal(12,3)`. |
| `unit` | `String?` | sí | `"unidad"` \| `"caja"` \| `"set"` \| libre (catálogo no crítico). |
| `boxId` | `String?` | sí | Stub plano (nullable). Si el item proviene de una caja específica distinta del `Remito.boxId` (items sueltos combinados). |
| `presupuestoItemId` | `String?` | sí | Stub plano (nullable). Para trazabilidad comparativa V1.5 contra lo presupuestado. |
| `returnedQuantity` | `Decimal @default(0) @db.Decimal(18,4)` | no (default 0) | Acumulador de devoluciones. `0 ≤ returnedQuantity ≤ quantity`. Mismo tipo que `quantity` (consistencia Comparativa). |
| `metadata` | `Json?` | sí | Lote, serie, observación de línea. No crítico. |
| `createdAt` | `DateTime @default(now())` | no | |
| `updatedAt` | `DateTime @updatedAt` | no | |

Relaciones: `remito Remito @relation(fields:[remitoId], references:[id], onDelete: Cascade)`.

Índices: `@@index([remitoId])` (carga de items en get/list). No unique compuesto por diseño: items duplicados (mismo sku en dos líneas) es válido en remito.

### 1.3 Catálogo controlado de `state` (validator)

| state | Significado | Justificación |
|---|---|---|
| `Borrador` | Creado, no emitido. Editable/borrable. | Permite armado previo al envío; `deleteRemito` sólo permitido aquí. |
| `Emitido` | Emitido formalmente (visibleNumber asignado si faltaba, `issuedAt` seteado). Inmutable en items. | Equivalente documental a “factura emitida” pero de naturaleza logística. Auditable. |
| `En_transito` | Despachado, en camino. Items no editables. | Distinto de `Emitido` para separar emisión documental del despacho físico. |
| `Entregado` | Recepcionado por destinatario. `deliveredAt` seteado. | Habililita Consumo (Fase 1B). |
| `Parcialmente_devuelto` | Parte del remito devuelto, NO todo. `returnedQuantity` acumulado < `quantity` en al menos un item. | Estado derivable; mantener explícito para UX/comparativa y porque la devolución requiere validación humana explícita (no defaultar). |
| `Devuelto` | Toda la mercadería del remito volvió. `returnedAt` seteado. | Terminal logística. No confundir con `Entregado`. |
| `Anulado` | Anulado (errores, no enviado, etc.). Items congelados. Auditable. | Terminaly disjunto de `Devuelto`. Término **gate #5** (Anulado vs Cancelado — preferencia `Anulado` por consistencia con `RemitoEstado` V2 del prototipo). |

**Transiciones válidas** (map en validator, análogo a `CX_STATUS_TRANSITIONS`):

```
Borrador          -> Emitido | Anulado
Emitido           -> En_transito | Entregado | Anulado
En_transito       -> Entregado | Parcialmente_devuelto | Anulado
Entregado         -> Parcialmente_devuelto | Devuelto
Parcialmente_devuelto -> Devuelto | (más devolución parcial)
Devuelto          -> (terminal)
Anulado           -> (terminal)
```

`Anulado` y `Devuelto` son terminales. `Borrador` es el único editable; `deleteRemito` sólo en `Borrador`.

### 1.4 Back-write de `surgery.remitoId` — contrato vigente: no existe

- **No** existe `remitoId` en `Surgery` Prisma. Es un field **mock** del frontend (`src/types/index.ts` + `store.ts:551` que escribe `sx.remitoId = remito.id`).
- **Contrato aceptado**: no agregar `remitoId` a `Surgery` en Prisma. La relación es **query-side**: `SELECT * FROM Remito WHERE surgeryId = ?`. Una cirugía puede tener N remitos; un campo escalar `remitoId` en Surgery sería lossy por diseño.
- **El `cxStatus` de Surgery** (y opcionalmente `prepStatus`) no se muta por back-write desde Remito V0. El service actual expone `recomputeSurgeryLogisticsStatus` como función pura de lectura; cualquier mutación real de Surgery requiere task/approval específico.
- El store frontend deja de escribir `surgery.remitoId` y `surgery.state` desde `generateDeliveryNoteFromOrder`. Marcha atrás (path V1) deriva de la API unificada con `origin=box`.

**Gate #2** — resuelto por aceptación de Franco del contrato real: no hay back-write.

### 1.5 `origin` y los caminos V1/V2

- `origin = "box"` → camino V1 (logística/PE→caja). `boxId` es nullable en el contrato actual; exigirlo por `origin` queda como mejora futura.
- `origin = "presupuesto"` → camino V2 (comercial). `presupuestoId` es nullable en el contrato actual; exigirlo por `origin` queda como mejora futura.
- `origin = "manual"` → creación libre (remito a mano, sin caja ni presupuesto). `boxId`/`presupuestoId` null.
- `origin = "mixto"` →combina caja + items de presupuesto (u otros). `boxId` y/o `presupuestoId` pueden estar; items pueden venir de ambas fuentes.

`origin` no tiene ruta de actualización en el contrato actual; un PATCH borrador futuro debe decidir explícitamente si lo permite.

---

## 2. Modelo Prisma vigente

> El schema ya contiene `Remito`/`RemitoItem`. Esta sección queda sincronizada como contrato documental; no editar schema en este task.

Bloques vigentes en `prisma/schema.prisma`:

```prisma
// ─── Remito unificado (Fase 1A) ───────────────────────────────────────
model Remito {
  id                  String   @id @default(cuid())
  companyId           String
  visibleNumber       Int?
  surgeryId           String?
  origin              String   // box | presupuesto | manual | mixto  (catálogo en validator)
  boxId               String?  // stub plano (FK real cuando Box lande, Fase 3)
  presupuestoId       String?  // stub plano (FK real cuando Presupuesto lande, Fase 1C)
  destinatarioSnapshot Json?
  state               String   @default("Borrador")
  issuedAt            DateTime?
  deliveredAt         DateTime?
  returnedAt          DateTime?
  createdById         String?
  updatedById         String?
  metadata            Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  company   Company  @relation(fields: [companyId], references: [id])
  surgery   Surgery? @relation(fields: [surgeryId], references: [id], onDelete: SetNull)
  createdBy User?    @relation("RemitoCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedBy User?    @relation("RemitoUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  items     RemitoItem[]

  @@unique([companyId, visibleNumber])
  @@index([companyId, surgeryId, state])
  @@index([companyId, state])
  @@index([companyId, origin])
  @@index([companyId, issuedAt])
  @@index([surgeryId])
}

model RemitoItem {
  id                 String   @id @default(cuid())
  remitoId           String
  itemId             String?  // stockItemId | presupuestoItemId | catalogItemId (stub)
  sku                String?
  description        String
  quantity           Decimal  @db.Decimal(18, 4)
  unit               String?
  boxId              String?
  presupuestoItemId  String?
  returnedQuantity   Decimal  @default(0) @db.Decimal(18, 4)
  metadata           Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  remito Remito @relation(fields: [remitoId], references: [id], onDelete: Cascade)

  @@index([remitoId])
  @@index([itemId])
  @@index([presupuestoItemId])
}
```

Relaciones inversas ya presentes en `Company`, `Surgery` y `User`:

```prisma
// model Company — añadir:
remitos Remito[]

// model Surgery — añadir:
remitos Remito[]

// model User — añadir:
createdRemitos Remito[] @relation("RemitoCreatedBy")
updatedRemitos Remito[] @relation("RemitoUpdatedBy")
```

**Índices confirmados**:

- `@@unique([companyId, visibleNumber])` — número visible único por empresa (mismo patrón que `DigitalReceipt @@unique([companyId, receiptNumber])`). Permite `visibleNumber` null mientras está en Borrador (Postgres permite múltiples NULL en UNIQUE parcialmente; Prisma/PG lo tolera con `NULLS NOT DISTINCT` off por defecto).
- `@@index([companyId, surgeryId, state])` — listado de remitos por cirugía filtrando estado (query principal del Expediente).
- `@@index([companyId, state])` — boards/listado por estado.
- `@@index([companyId, origin])` — separar caminos V1/V2 para auditoría/comparativa.
- `@@index([companyId, issuedAt])` — orden cronológico/dashboards.
- `@@index([surgeryId])` — query inversa Surgery→Remitos.

**`companyId` scoping confirmado** idéntico a `Surgery`/`AuditEvent`/`SeguimientoEntry`/`DigitalReceipt`: toda query en service filtra `where: { companyId, ... }`.

### Migración sugerida — supersedida por implementación real

La propuesta de migración original queda como histórico sin autoridad. No ejecutar comandos Prisma en este task. El contrato vigente es el schema actual aceptado por Franco.

<!-- Histórico conservado sólo para trazabilidad del diseño original. -->

### Migración histórica (NO usar como fuente vigente)

Nombre propuesto:

```
prisma/migrations/<timestamp>_add_remito_unificado/migration.sql
```

DDL esencial (PostgreSQL):

```sql
CREATE TABLE "Remito" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "visibleNumber" TEXT,
    "surgeryId" TEXT,
    "origin" TEXT NOT NULL,
    "boxId" TEXT,
    "presupuestoId" TEXT,
    "destinatarioSnapshot" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Borrador',
    "issuedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Remito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Remito_companyId_visibleNumber_key"
    ON "Remito" ("companyId", "visibleNumber");
CREATE INDEX "Remito_companyId_surgeryId_state_idx"
    ON "Remito" ("companyId", "surgeryId", "state");
CREATE INDEX "Remito_companyId_state_idx"
    ON "Remito" ("companyId", "state");
CREATE INDEX "Remito_companyId_origin_idx"
    ON "Remito" ("companyId", "origin");
CREATE INDEX "Remito_companyId_issuedAt_idx"
    ON "Remito" ("companyId", "issuedAt");
CREATE INDEX "Remito_surgeryId_idx"
    ON "Remito" ("surgeryId");

ALTER TABLE "Remito"
    ADD CONSTRAINT "Remito_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT;
ALTER TABLE "Remito"
    ADD CONSTRAINT "Remito_surgeryId_fkey"
    FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL;
ALTER TABLE "Remito"
    ADD CONSTRAINT "Remito_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "Remito"
    ADD CONSTRAINT "Remito_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE "RemitoItem" (
    "id" TEXT NOT NULL,
    "remitoId" TEXT NOT NULL,
    "itemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT,
    "boxId" TEXT,
    "presupuestoItemId" TEXT,
    "returnedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemitoItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RemitoItem_remitoId_idx" ON "RemitoItem" ("remitoId");
CREATE INDEX "RemitoItem_itemId_idx" ON "RemitoItem" ("itemId");
CREATE INDEX "RemitoItem_presupuestoItemId_idx" ON "RemitoItem" ("presupuestoItemId");

ALTER TABLE "RemitoItem"
    ADD CONSTRAINT "RemitoItem_remitoId_fkey"
    FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE CASCADE;
```

`prisma migrate dev --name add_remito_unificado` generaría el archivo; **no ejecutar** en este paso.

---

## 3. Service + API surface vigente y gaps

### 3.1 `src/lib/services/remito.service.ts` (contrato real)

El service actual recibe `PrismaClient` dentro del input, no como primer argumento posicional. Mantiene scoping por `companyId`, catálogos `origin/state` como strings, transacciones para creación/emisión/devolución/delete y audit cuando hay actor.

```ts
// Contrato real resumido

export type RemitoOrigin = "box" | "presupuesto" | "manual" | "mixto";

export type RemitoState =
  | "Borrador"
  | "Emitido"
  | "En_transito"
  | "Entregado"
  | "Parcialmente_devuelto"
  | "Devuelto"
  | "Anulado";

export type CreateRemitoInput = {
  companyId: string;
  prisma: PrismaClient;
  surgeryId?: string | null;
  origin: RemitoOrigin;
  boxId?: string | null;
  presupuestoId?: string | null;
  destinatarioSnapshot?: Record<string, unknown> | null;
  items: Array<{
    itemId?: string | null;
    sku?: string | null;
    description: string;
    quantity: number | string; // Decimal(18,4)
    unit?: string | null;
    boxId?: string | null;
    presupuestoItemId?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  // state inicial: siempre "Borrador".
};

// Functions vigentes del service:

export async function listRemitos(input: {
  companyId: string;
  prisma: PrismaClient;
  surgeryId?: string;
  state?: string;
  origin?: string;
  fromDate?: Date;
  toDate?: Date;
  take?: number;
  skip?: number;
}): Promise<RemitoRead[]>;

export async function getRemito(input: {
  companyId: string;
  remitoId: string;
  prisma: PrismaClient;
}): Promise<RemitoRead>;

export async function createRemito(input: CreateRemitoInput): Promise<RemitoRead>;

export async function updateRemitoDraft(input: {
  companyId: string;
  remitoId: string;
  surgeryId?: string | null;
  boxId?: string | null;
  presupuestoId?: string | null;
  destinatarioSnapshot?: Record<string, unknown> | null;
  items?: CreateRemitoInput["items"];
  metadata?: Record<string, unknown> | null;
  updatedById?: string;
  prisma: PrismaClient;
}): Promise<RemitoRead>;

export async function emitirRemito(input: {
  companyId: string;
  remitoId: string;
  updatedById?: string;
  prisma: PrismaClient;
}): Promise<RemitoRead>;

export async function updateRemitoState(input: {
  companyId: string;
  remitoId: string;
  newState: string;
  updatedById?: string;
  prisma: PrismaClient;
}): Promise<RemitoRead>;

export async function registrarDevolucion(input: {
  companyId: string;
  remitoId: string;
  items: Array<{ itemId: string; returnedQuantity: number | string }>;
  updatedById?: string;
  prisma: PrismaClient;
}): Promise<RemitoRead>;

export async function deleteRemito(input: {
  companyId: string;
  remitoId: string;
  prisma: PrismaClient;
}): Promise<{ id: string; deleted: true }>;

export async function recomputeSurgeryLogisticsStatus(params: {
  companyId: string;
  surgeryId: string;
  prisma: PrismaClient;
}): Promise<"has_remitos_emitidos" | "en_transito" | "entregado" | "parcial" | "devuelto" | "none">;
```

Notas de diferencia contra la propuesta original:

- `emitirRemito` existe en service y está conectado por route explícita `/emitir`.
- `updateRemitoDraft` existe y respalda `PATCH` de borrador; `origin` queda inmutable por decisión de implementación actual.
- `recomputeSurgeryLogisticsStatus` es función pura de lectura; no muta `Surgery`.
- `updateRemitoState` recibe `newState` a nivel service; la API acepta `{ state }` y `{ newState }`. Setea `issuedAt`/`deliveredAt`/`returnedAt` según transición.
- `confirmDevolucion` reclama `Pendiente → Confirmada` de forma condicional dentro de la transacción, aplica `DevolucionItem.returnedQuantity` sobre `RemitoItem.returnedQuantity`, recalcula el estado del remito y setea `returnedAt` sólo cuando el estado final es `Devuelto`. `registrarDevolucion` legacy usa este mismo flujo auditable.

<!-- Firma propuesta original supersedida omitida como contrato vigente. -->

Roles reales (inline en service por ahora — deuda Fase 4D):

```ts
export const REMITO_MUTATION_ROLES = ["admin", "coordinador", "logistica"] as const;
export const REMITO_READ_ROLES = [
  "admin",
  "coordinador",
  "logistica",
  "vendedor",
  "matrona",
  "instrumentador",
] as const;
```

El set anterior propuesto (`admin`, `manager`, `coordinator`, `logistica`, `depósito`, `owner`, `super_admin`) queda supersedido para el contrato real.

<!--
Histórico parcial del diseño original:
export async function listRemitosByCompany(
  prisma: PrismaClient,
  companyId: string,
  options?: {
    surgeryId?: string;
    state?: RemitoState;
    origin?: RemitoOrigin;
    issuedFrom?: Date;
    issuedTo?: Date;
    take?: number;
    skip?: number;
  }
): Promise<RemitoListRow[]>;

export async function getRemitoById(
  prisma: PrismaClient,
  companyId: string,
  remitoId: string
): Promise<RemitoDetailRow | null>;

export async function createRemito(
  prisma: PrismaClient,
  context: RemitoActorContext,
  data: CreateRemitoInput
): Promise<RemitoDetailRow>;
// - assertActorCanMutateRemito (UserCompanyAccess.role in REMITO_MUTATION_ROLES)
// - requireCompanyId
// - validateCreateRemitoInput (origin, destinatarioSnapshot, items; origin↔boxId/presupuestoId consistency)
// - si surgeryId presente: assertSurgeryBelongsToCompany
// - si boxId/presupuestoId presente: validación futura cuando existan modelos (en V0: sólo non-empty string)
// - $transaction(Serializable, retry P2034) {
//     visibleNumber = await getNextRemitoVisibleNumber(tx, companyId) si no provisto
//     tx.remito.create({ …items: { create: […] } })
//     createAuditEvent(action: "remito.created", newValue: serializeForAudit)
//   }

export async function updateRemitoBorrador(
  prisma: PrismaClient,
  context: RemitoActorContext,
  remitoId: string,
  data: Partial<CreateRemitoInput>
): Promise<RemitoDetailRow>;
// Sólo permitido si state === "Borrador". Edit items (replace), destinatarioSnapshot, metadata, boxId/presupuestoId.

export async function updateRemitoState(
  prisma: PrismaClient,
  context: RemitoActorContext,
  remitoId: string,
  nextState: RemitoState
): Promise<RemitoDetailRow>;
// - validateRemitoStateTransition(currentState, nextState)
// - $transaction { tx.remito.update; set issuedAt/deliveredAt/returnedAt según nextState; createAuditEvent(action:"remito.state_changed", old/new state) }
// - Si nextState Entregado/Devuelto y surgeryId != null: disparar recomputeSurgeryLogisticsStatus(surgeryId) dentro del tx o cola post-tx (ver §3.3).

export async function emitirRemito(
  prisma: PrismaClient,
  context: RemitoActorContext,
  remitoId: string
): Promise<RemitoDetailRow>;
// Shortcut updateRemitoState → "Emitido" pero además:
//  - asignar visibleNumber si era null
//  - issuedAt = now
//  - createAuditEvent action:"remito.issued"

export async function registrarDevolucion(
  prisma: PrismaClient,
  context: RemitoActorContext,
  remitoId: string,
  items: Array<{ remitoItemId: string; returnedQuantity: number }>
): Promise<RemitoDetailRow>;
// - debe ser Entregado | Parcialmente_devuelto (no Devuelto, no Anulado)
// - 0 <= returnedQty(parcial) <= quantity (validator)
// - $transaction {
//     tx.remitoItem.updateMany acumulando returnedQuantity
//     recalc state total vs parcial
//     tx.remito.update({ state, returnedAt if total })
//     createAuditEvent(action:"remito.devolucion_registrada", newValue: items)
//   }
// - Validación humana explícita requerida (regla §6): no defaultar.

export async function deleteRemito(
  prisma: PrismaClient,
  context: RemitoActorContext,
  remitoId: string
): Promise<void>;
// Sólo si state === "Borrador". Hard delete (items cascade). AuditEvent action:"remito.deleted".

export async function assertRemitoBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  remitoId: string
): Promise<void>;
// Helper para Fase 1B (Consumo).
-->

### 3.2 `src/lib/validators/remito.ts` (contrato real)

El validator real usa Zod para normalizar bodies de API y re-exporta catálogos desde el service como single source of truth.

```ts
// Contrato real resumido:

export { REMITO_ORIGINS, REMITO_STATES, REMITO_TRANSITIONS };
export const remitoCreateSchema: z.ZodType;
export const remitoDraftUpdateSchema: z.ZodType;     // body update borrador; origin inmutable
export const remitoStateTransitionSchema: z.ZodType; // body { state | newState, metadata? }
export const remitoDevolucionSchema: z.ZodType;      // body { items, metadata? }
export const remitoListQuerySchema: z.ZodType;
```

### 3.3 Rutas API (paths vigentes)

Companies-scoped, siguiendo convención `src/app/api/companies/[companyId]/…` y el patrón de `surgeries/route.ts` (import relativo `../../../../../…`, `getApiAuthContext`, guards, parseJsonBody, responses `ok`/`created`/`errorResponse`).

```
GET    /api/companies/[companyId]/remitos
       ? surgeryId, state, origin, issuedFrom, issuedTo, take, skip
        -> ok(RemitoRead[])

POST   /api/companies/[companyId]/remitos
       body: CreateRemitoInput (origin, destinatarioSnapshot, items, surgeryId?, boxId?, presupuestoId?, metadata?)
       -> created(RemitoDetailRow)

GET    /api/companies/[companyId]/remitos/[remitoId]
       -> ok(RemitoDetailRow) | 404

PATCH  /api/companies/[companyId]/remitos/[remitoId]
         body: update borrador (surgeryId?, boxId?, presupuestoId?, destinatarioSnapshot?, items?, metadata?)
         -> ok(RemitoDetailRow) — sólo si state === Borrador; origin inmutable

PATCH  /api/companies/[companyId]/remitos/[remitoId]/state
         body real recomendado: { state: RemitoState, metadata? }
         compat: { newState: RemitoState, metadata? }
         -> ok(RemitoDetailRow) — transición validada

POST   /api/companies/[companyId]/remitos/[remitoId]/emitir
         -> ok(RemitoDetailRow) — Borrador→Emitido, asigna visibleNumber e issuedAt

POST   /api/companies/[companyId]/remitos/[remitoId]/devolucion
       body real: { items: [{ itemId, returnedQuantity }], metadata? }
       -> ok(RemitoDetailRow)

DELETE /api/companies/[companyId]/remitos/[remitoId]
        (sólo Borrador) -> ok({ id, deleted: true })
```

Cada ruta:

- `getApiAuthContext(request, companyId)` → ctx.
- GET: `requireCompanyReadAccess(ctx)`.
- POST/PATCH/DELETE: `requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES)`.
- Delega al service; `errorResponse(error)` en catch.
- Validator antes del service.

### 3.5 UI `/remitos` backend-backed

`src/app/remitos/page.tsx` ya opera contra backend real mediante `src/hooks/useRemitos.ts` y `src/lib/api/remitos.ts`:

- lista `GET /remitos` con filtro de estado, búsqueda local y refresh;
- detalle `GET /remitos/[remitoId]` al seleccionar fila;
- creación de borrador `POST /remitos`;
- edición de borrador `PATCH /remitos/[remitoId]` mediante `RemitoDraftDialog`;
- emisión `POST /remitos/[remitoId]/emitir`;
- transición de estado `PATCH /remitos/[remitoId]/state` enviando `{ state }`;
- devolución `POST /remitos/[remitoId]/devolucion` con validación humana explícita;
- impresión/guardar PDF desde navegador, sin dependencia PDF server-side.

La UI no vuelve al slice mock como fuente de verdad para este módulo. El formato visual `R-####` se resuelve en cliente con `visibleNumber Int?` (`getRemitoVisibleNumber`), preservando el contrato backend.

### 3.6 Ficha CX / Expediente: estado vigente

La superficie real vigente de detalle de cirugía es **Ficha CX** dentro del flujo de Cirugías. Sus componentes todavía viven bajo `src/components/expediente/*`, pero esto no implica que la página standalone `/expediente` sea la superficie principal. Para Remito, `/expediente` debe tratarse como legacy/deprecada por ahora.

Estado actual:

- `ExpedienteFullView` renderiza `FichaTabContent` y pasa `onViewRemitos={() => setExpTab("logistica")}`.
- `FichaTabContent` muestra `RemitosSummaryCard` en “Destino y facturación”.
- `RemitosSummaryCard` usa `useRemitos({ surgeryId, take: 5 })`, por lo tanto su resumen compacto está backend-backed por `surgeryId`.
- El CTA “Ver remitos” lleva a la pestaña **Logística**.
- `LogisticaTabContent` y `RemitosPanel` aún reciben `remitos: Remito[]` legacy por props y calculan material en tránsito desde ese shape (`sentQuantity`, `returnedQuantity`, `consumedQuantity`). No están integrados todavía al DTO backend `RemitoApiRow`.

Pendiente enfocado: `REMITO-FICHA-DTO-001` debe conectar el panel completo de Logística/Ficha CX a backend por `surgeryId`, adaptando `RemitoApiRow` a una vista de presentación sin reintroducir back-write ni depender de `/expediente` standalone.

### 3.7 Recálculo de `Surgery.cxStatus`/`prepStatus` (anti back-write)

Servicio real actual: función pura de lectura en `remito.service.ts`. No muta `Surgery` y no hace back-write.

```ts
async function recomputeSurgeryLogisticsStatus(params: {
  prisma: PrismaClient,
  surgeryId: string,
  companyId: string
}): Promise<"has_remitos_emitidos" | "en_transito" | "entregado" | "parcial" | "devuelto" | "none">;
```

Lee `Remito` por `surgeryId` y devuelve un estado logístico sugerido. La mutación real de `Surgery` queda fuera de este contrato y requerirá task/approval específico si se implementa.

**Importante:** este método reemplaza el back-write del store. El store frontend deja de escribir `surgery.remitoId` y `surgery.state`.

---

## 4. Linkage con Consumo (Fase 1B) — contrato

No se diseña `Consumo` aquí. Sólo contrato declarado para que Fase 1B no re-descubra el conflicto **C6**:

- `Consumo` futuro llevará FK **obligatoria** `remitoId String` (no nullable) a `Remito`.
- `CREATE TABLE Consumo ( … remitoId TEXT NOT NULL, FK remitoId REFERENCES Remito(id) … )`.
- `createConsumptionFromDeliveryNote(remitoId)` (del servicio Fase 1B) **debe** setear `consumo.remitoId = remitoId` (repara C6: hoy el mock no lo hace).
- Un `Remito` puede tener **N** consumos (regla canónica `PREPARACION_REMITOS_CONSUMO.md` §3: si hay dos remitos, pueden existir dos consumos separados; la cirugía muestra vista consolidada).
- `Remito.state` **no** muta por crear consumo. `markConsumoAsFacturado` (vía `Consumo.state`) es operación de Consumo, no de Remito (elimina la mutación de estado de Remito desde consumo — corrige la fragilidad del mock).
- `RemitoItem.returnedQuantity` alimenta la Comparativa V1.5 (presupuesto/remito/consumo/devuelto/pendiente) sin tocar `Remito` desde el consumo.

**Contrato congelado que Fase 1B respeta**: `Remito.id String cuid`, `Remito.surgeryId String?`, `RemitoItem.id`, `RemitoItem.quantity Decimal(18,4)`, `RemitoItem.returnedQuantity Decimal(18,4)`.

---

## 5. Migración frontend store → DTO cacheado

No eliminar el slice Zustand `remitos` ahora (regla `PLAN_CONTINUIDAD` §14 #9: borrar slices antes de migrar rompe Expediente). Secuencia en 4 pasos:

### Paso 1 — API real disponible + gaps cerrados
`GET/POST /api/companies/[c]/remitos`, `GET/PATCH/DELETE /api/companies/[c]/remitos/[r]`, `PATCH /state`, `POST /emitir` y `POST /devolucion` ya existen. Timestamps/transitions están alineados. El slice `remitos` legado puede seguir existiendo para superficies no migradas, pero `/remitos` ya usa backend como fuente de verdad.

### Paso 2 — UI lee del API cuando disponible; legacy queda acotado
`useRemitos` hace fetch del API para `/remitos` y para el resumen compacto de Ficha CX. El fallback/mock queda limitado a paneles no migrados, especialmente `LogisticaTabContent`/`RemitosPanel` hasta `REMITO-FICHA-DTO-001`. No tocar UX de Cirugías fuera del scope (regla `BACKEND_PHASE2_PLAN.md` Principio 2).

### Paso 3 — Acciones del store migran a llamadas API
- `generateDeliveryNoteFromOrder(pedidoId, boxId)` → `POST /remitos` con `origin="box"`, `boxId`, items desde box (snapshot tomado server-side en service cuando Box exista; en V0 el caller arma items desde box mock).
- `createRemito(data)` (V2) → `POST /remitos` con `origin="presupuesto"|"manual"|"mixto"`, `destinatarioSnapshot`, items.
- `emitirRemito(id)` → `POST /remitos/[r]/emitir`.
- `devolverRemito(id, items)` → `POST /remitos/[r]/devolucion`.

El store pasa a ser **cache de últimas lecturas** del API (igual que el patrón de migración cirugías). Las acciones de store dejan de mutar `surgeries.*` (no más `sx.remitoId`, no más `sx.state="En tránsito"`). El `cxStatus`/`prepStatus` de Surgery se actualiza desde el API (recompute server-side) y la UI refresca cirugías vía fetch/invalidation.

### Paso 4 — Pruning de caminos duplicados (back-write legacy)
Eliminar del store:
- el back-write `surgery.remitoId = remito.id` y `surgery.state = "En tránsito"` en `generateDeliveryNoteFromOrder`;
- el campo `remitoId` de tipo `Surgery` mock y de surgeries seedeadas;
- la distinción V1/V2 en la firma (un solo camino `createRemito` con `origin`).

Listados del Expediente/Ficha CX deben migrar a `GET /remitos?surgeryId=…` en vez del filtro sobre el slice. El resumen compacto ya lo hace; falta el panel completo de Logística.

**Explícito:** el back-write `surgery.remitoId + state` debe **desaparecer** (fuente de verdad: `Remito.surgeryId` + `Remito.state`). El `cxStatus` de Surgery se actualiza vía el servicio server-side (`recomputeSurgeryLogisticsStatus`), nunca desde el store.

---

## 6. Reglas de dominio reforzadas

De `PREPARACION_REMITOS_CONSUMO.md` y `AUDIT_EVENT_POLICY.md`:

1. **Remito refleja LO QUE SALE**, no lo que se consume. (§2 dominio.) Items = enviados; consumo = otro modelo (Fase 1B).
2. **Remito NO crea factura automáticamente.** La factura (Fase 1D) tiene su `base` (presupuesto/consumo/manual/mixto) y se genera explícitamente; el remito es documento logístico, no fiscal en V0.
3. **Devolución requiere validación humana explícita** — no defaultar (DOM §4: “nunca asumirse sin validación humana”). `registrarDevolucion` exige body con items; el service no devueltetodo por defecto.
4. **Cada consumo futuro pertenece a UN remito** (binding 1-N Consumo→Remito). (DOM §3.) Contrato declarado §4.
5. **Número visible por empresa** vigente como `Int?` autocalculado al emitir. Queda supersedida la propuesta `R-####`; un formato visual con prefijo puede resolverse en UI/PDF si Franco lo pide.
6. **Auditoría**: emisión / devolución / anulación / state change / delete son auditables (`AUDIT_EVENT_POLICY.md` “remito emitido/anulado”, “devolución registrada”). Cada mutación crea `AuditEvent` dentro de `$transaction` con `entityType:"Remito"`, `action:"remito.*"`, `oldValue`/`newValue` serializados.
7. Items flexibles o fuera de catálogo requieren revisión manual en Comparativa (DOM §5); el remito los acepta con `itemId=null` y `description` libre.
8. El remito **no necesariamente coincide** con presupuesto (DOM §2 Reglas); `origin=presupuesto` lo vincula pero no impone igualdad de items.

---

## 7. Gates / approval boundaries — estado actual

Franco aceptó el contrato backend real el 2026-07-07. Estos gates ya no bloquean el contrato vigente; se documentan como resueltos/supersedidos:

1. **`origin` como catálogo string cerrado** (`box`|`presupuesto`|`manual`|`mixto`) — aceptado.
2. **Eliminación del back-write `surgery.remitoId`** — aceptado; no existe back-write en contrato backend.
3. **`quantity` Decimal** — aceptado como `Decimal(18,4)`; supersede `Decimal(12,3)`.
4. **`REMITO_MUTATION_ROLES`** — set real: `['admin','coordinador','logistica']`; lectura: `['admin','coordinador','logistica','vendedor','matrona','instrumentador']`. Supersede el set propuesto.
5. **`Anulado` vs `Cancelado`** — aceptado `Anulado`.
6. **`boxId` y `presupuestoId` como stubs planos nullable sin FK en V0** — aceptado.
7. **`surgeryId` nullable** — aceptado.

> **No inventar decisions fuera de §15.** Si surge una decisión nueva durante remediation (reglas exactas de mutación de Surgery, formato PDF/legal, cambio de roles, o cambio de modelo), **escalar** al Orchestrator/Franco; no resolver unilateralmente.

Stop and escalate (del Task Brief):
- Regla de `PREPARACION_REMITOS_CONSUMO.md` que contradiga el diseño unificado → escalar a Franco.
- Pattern de `surgery.service.ts` no replicable para remito → escalar a orchestrator.
- Decisión necesaria no listada en §15 → no inventar.
- Conflicto con `DATA_MODEL_RULES.md` → escalar a orchestrator.
- Dependencia cíclica con Box/Presupuesto → resolverse como FK stub nullable (hecho), escalar a Franco si compromete el modelo.

---

## Apendice A — Bloque Prisma vigente

Ver §2. El bloque vigente (`model Remito` + `model RemitoItem` + relaciones inversas) ya existe en schema. No crear migración en este task.

## Apendice B — Service signatures

Ver §3.1. Resumen:

```ts
listRemitos({ companyId, prisma, filters }) -> RemitoRead[]
getRemito({ companyId, remitoId, prisma }) -> RemitoRead
createRemito({ companyId, prisma, data }) -> RemitoRead
updateRemitoDraft({ companyId, remitoId, draft fields..., updatedById?, prisma }) -> RemitoRead
emitirRemito({ companyId, remitoId, updatedById?, prisma }) -> RemitoRead
updateRemitoState({ companyId, remitoId, newState, updatedById?, prisma }) -> RemitoRead
registrarDevolucion({ companyId, remitoId, items, updatedById?, prisma }) -> RemitoRead
deleteRemito({ companyId, remitoId, prisma }) -> { id, deleted: true }
recomputeSurgeryLogisticsStatus({ companyId, surgeryId, prisma }) -> estado sugerido
```

## Apendice C — API route tree

```
api/companies/[companyId]/
└── remitos/
    ├── route.ts                          GET    list, POST create
    └── [remitoId]/
        ├── route.ts                      GET get, PATCH update borrador, DELETE (Borrador)
        ├── state/route.ts                PATCH state transition ({ state } o { newState })
        ├── emitir/route.ts               POST Borrador→Emitido
        └── devolucion/route.ts           POST  registrar devolución
```

Handlers siguen el patrón `surgeries/route.ts`: import relativo `../../../../../lib/…`, `getApiAuthContext`, guards, `parseJsonBody`, `ok`/`created`/`errorResponse`. Validator before service. Audit inside service.

---

## Handoff

### Done
- Sync documental del Remito unificado contra el backend/UI real vigente al 2026-07-08.
- Contrato vigente preservado: `visibleNumber Int?`, decimales `18,4`, snapshots/createdBy nullable, roles reales, stubs nullable, sin back-write.
- Gaps backend marcados como cerrados: `/emitir`, PATCH borrador, compat `{ state }`/`{ newState }`, timestamps/transitions.
- Ficha CX documentada como superficie real, con resumen compacto backend-backed y CTA a Logística.

### Changed
- Sólo edición de docs. Sin tocar schema ni código.

### Files
- `knowledge/specs/REMITO-UNIFICADO/PROPOSAL.md` — propuesta sincronizada al contrato real vigente.
- `knowledge/specs/REMITO-UNIFICADO/DESIGN.md` — diseño sincronizado al contrato real, gaps y próximos pasos.

### Validations
- `prisma/schema.prisma` leído: confirmado `Remito` real con `visibleNumber Int?`, `destinatarioSnapshot Json?`, `createdById String?`, `Decimal(18,4)`, stubs nullable y relaciones `SetNull`.
- `src/lib/services/remito.service.ts` leído: confirmado catálogos, roles reales, `emitirRemito`, `updateRemitoDraft` y timestamps/transitions alineados.
- `src/lib/validators/remito.ts` leído: confirmado Zod, `remitoDraftUpdateSchema`, payload `{ state }` con compat `{ newState }`, cantidades decimal-friendly.
- API routes de remitos leídas: confirmado list/create/get/PATCH/delete/state/emitir/devolución.
- UI leída: `/remitos` backend-backed; Ficha CX resumen compacto backend-backed; Logística/RemitosPanel aún legacy por props.

### Risks
- **Stub sin FK `boxId`/`presupuestoId`** → integridad referencial blanda en V0; mitigada por validator + asertar existencia cuando los modelos aterricen.
- **`state`/`origin` como String** → “magic strings” distribuidas; mitigado por catálogo centralizado en `remito.validator.ts` (deuda T2/C14 ya reconocida).
- **`Anulado` vs `Cancelado`** divergente con `Surgery.cxStatus="cancelled"` → deuda de catálogos, no bloqueante para contrato Remito.
- **Logística/Ficha CX** requiere DTO backend por `surgeryId` para el panel completo de Remitos.
- **`recomputeSurgeryLogisticsStatus`** hoy no muta `Surgery`; si se decide mutación real, requiere task y aprobación por archivo sensible/regla de dominio.
- **Migración store→DTO** ventana acotada: `/remitos` y resumen Ficha CX ya usan backend; RemitosPanel legacy aún no.

### Next
- Abrir `REMITO-FICHA-DTO-001`: integrar `LogisticaTabContent`/`RemitosPanel` al DTO backend por `surgeryId` y dejar el mock sólo como fallback si se decide explícitamente.
- Después evaluar acciones contextuales en Ficha CX/Logística (crear borrador asociado, emitir, imprimir) reutilizando `/remitos`/`useRemitos`, sin duplicar lógica.
- Traer `Box` (Fase 3) y `Presupuesto` (Fase 1C) → migración de stubs `boxId`/`presupuestoId` a FK reales.
- Fase 1B (Consumo+Devolución) consume el contrato de §4 y repara C6.
- Fase 4D: migrar `REMITO_MUTATION_ROLES` inline → `src/lib/permissions/*`.
