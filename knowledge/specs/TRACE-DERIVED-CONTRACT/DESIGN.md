# DESIGN — Contrato de Trazabilidad Derivada (TRACE-DERIVED-CONTRACT-001)

Estado: **diseño documental, sin implementación**  
Fecha: 2026-07-08  
Task: TRACE-DERIVED-CONTRACT-001  
Modo: design / docs  
Superficie objetivo: Ficha CX → `TrazabilidadPanel`  

---

## 1. Estado e intención

La trazabilidad operativa de OSSUM COR debe ser una **vista derivada, read-only y companies-scoped** sobre entidades operativas persistidas. No debe crear una fuente paralela de verdad ni revivir el slice legacy `traceEntries`.

Intención del contrato:

- responder desde una cirugía/expediente qué se envió, qué se consumió, qué volvió y qué eventos críticos ocurrieron;
- derivar datos desde `Remito`, `Consumo`, `Devolucion` y `AuditEvent` existentes;
- dejar preparado el punto de extensión para `StockMovement`, `Box`, lote, serie y trazabilidad fina futura;
- exponer un DTO estable para API/UI sin obligar a cambios de schema en este task.

Reglas base:

1. **Read-only:** el endpoint de trazabilidad no muta `Remito`, `Consumo`, `Devolucion`, `Surgery`, stock ni auditoría.
2. **Derivado:** no persiste filas de trazabilidad propias en V0.
3. **Sin `traceEntries`:** `traceEntries` es legacy/dead y no se usa como fuente final.
4. **Ficha CX como superficie real:** el panel standalone `/expediente/page.tsx` es legacy/deprecado; el destino vigente es Ficha CX dentro de Cirugías.
5. **Multiempresa:** toda query filtra por `companyId` y `surgeryId`; no se aceptan datos cross-company.

---

## 2. Fuentes autoritativas V0

### 2.1 `Remito` / `RemitoItem`

Fuente autoritativa de **lo enviado**.

Campos relevantes:

- `Remito.id`, `visibleNumber`, `companyId`, `surgeryId`, `origin`, `state`;
- `issuedAt`, `deliveredAt`, `returnedAt`, `createdAt`, `updatedAt`;
- `RemitoItem.id`, `itemId`, `sku`, `description`, `quantity`, `unit`, `returnedQuantity`, `lotNumber`, `serialNumber`, `expirationDate`, `metadata`.

Uso en trazabilidad:

- eventos de emisión/entrega/devolución logística;
- filas de ítems enviados;
- cantidades enviadas y, si existe, `returnedQuantity` acumulado como dato logístico del remito.

### 2.2 `Consumo` / `ConsumoItem`

Fuente autoritativa de **lo efectivamente usado**.

Campos relevantes:

- `Consumo.id`, `visibleNumber`, `companyId`, `surgeryId`, `remitoId`, `state`;
- `validatedAt`, `facturedAt`, `createdAt`, `updatedAt`;
- `ConsumoItem.id`, `remitoItemId`, `sku`, `description`, `requestedQuantity`, `consumedQuantity`, `unit`, `lotNumber`, `serialNumber`, `expirationDate`, `metadata`.

Uso en trazabilidad:

- eventos de consumo creado/emitido/validado/facturado/anulado según estado y auditoría;
- cantidades consumidas por ítem;
- matching preferente contra `RemitoItem` por `remitoItemId`; fallback por `sku`/`description` sólo como coincidencia blanda.

### 2.3 `Devolucion` / `DevolucionItem`

Fuente autoritativa de **lo devuelto como entidad propia auditable**.

Campos relevantes:

- `Devolucion.id`, `visibleNumber`, `companyId`, `surgeryId`, `remitoId`, `consumoId`, `state`, `reason`;
- `validatedAt`, `createdAt`, `updatedAt`;
- `DevolucionItem.id`, `remitoItemId`, `consumoItemId`, `sku`, `description`, `returnedQuantity`, `unit`, `lotNumber`, `serialNumber`, `expirationDate`, `metadata`.

Uso en trazabilidad:

- eventos de devolución creada/confirmada/rechazada/anulada;
- cantidades devueltas por ítem desde una devolución explícita;
- distinción entre devolución confirmada y devolución pendiente/rechazada.

Nota V0 importante: al confirmar una `Devolucion`, el service aplica sus cantidades a `RemitoItem.returnedQuantity` y recalcula el estado del Remito dentro de la misma transacción. La trazabilidad conserva ambas señales para datos históricos y para detectar inconsistencias previas.

### 2.4 `AuditEvent`

Fuente autoritativa de **timeline de acciones/estados**.

Campos relevantes:

- `companyId`, `userId`, `entityType`, `entityId`, `action`, `detail`, `oldValue`, `newValue`, `module`, `metadata`, `createdAt`.

Uso en trazabilidad:

- eventos finos no inferibles sólo por timestamps;
- actor humano o sistema que ejecutó una acción;
- cambios de estado y validaciones críticas.

V1 audita modificaciones y eventos críticos; no se requiere auditar lecturas para este contrato.

### 2.5 Fuentes futuras

Fuera de V0, pero previstas en el contrato:

- `StockMovement`: salida por remito, baja por consumo, entrada por devolución, ajuste, transferencia, inventario, anulación como movimiento contrario.
- `Box` / caja física / caja enviada: composición real, código de caja, ubicación y estado.
- Lote, serie y vencimiento se leen primero de `lotNumber`, `serialNumber` y `expirationDate`; para registros históricos se conserva fallback a `metadata`. Modelos de trazabilidad fina siguen requiriendo aprobación posterior.

---

## 3. API propuesta

Endpoint read-only:

```http
GET /api/companies/[companyId]/surgeries/[surgeryId]/trace
```

Query params opcionales:

```txt
includeAudit=true|false        default true
includeItems=true|false        default true
includeSources=true|false      default false
from=ISODate                   opcional
to=ISODate                     opcional
```

Respuesta:

```ts
type TraceResponse = {
  companyId: string;
  surgeryId: string;
  generatedAt: string;
  sourceVersion: "v0-derived";
  summary: TraceSummary;
  timeline: TraceTimelineEvent[];
  items: TraceItemRow[];
  gaps: TraceGap[];
  sources?: TraceSourceRef[];
};
```

Autorización esperada para implementación futura:

- `getApiAuthContext(request, companyId)`;
- permisos de lectura de empresa/cirugía;
- query siempre por `companyId` + `surgeryId`.

---

## 4. DTO contract

### 4.1 `TraceTimelineEvent`

```ts
type TraceTimelineEvent = {
  id: string;                       // estable dentro del response: `${sourceType}:${sourceId}:${kind}` o AuditEvent.id
  occurredAt: string;               // ISO datetime
  kind:
    | "remito.created"
    | "remito.issued"
    | "remito.delivered"
    | "remito.returned"
    | "remito.state_changed"
    | "consumo.created"
    | "consumo.emitted"
    | "consumo.validated"
    | "consumo.factured"
    | "consumo.state_changed"
    | "devolucion.created"
    | "devolucion.confirmed"
    | "devolucion.rejected"
    | "devolucion.state_changed"
    | "audit.event"
    | "stock.movement";             // reservado futuro
  label: string;                    // texto listo para UI
  sourceType: "Remito" | "Consumo" | "Devolucion" | "AuditEvent" | "StockMovement";
  sourceId: string;
  sourceVisibleNumber?: number | null;
  sourceState?: string | null;
  actorUserId?: string | null;
  module?: string | null;
  severity: "info" | "success" | "warning" | "danger";
  related?: {
    remitoId?: string;
    consumoId?: string;
    devolucionId?: string;
    remitoItemId?: string;
    consumoItemId?: string;
    devolucionItemId?: string;
  };
  metadata?: Record<string, unknown>;
};
```

Ordenamiento:

1. `occurredAt` ascendente;
2. prioridad operacional si timestamps empatan: Remito → Consumo → Devolución → AuditEvent;
3. `id` ascendente como desempate estable.

### 4.2 `TraceItemRow`

```ts
type TraceItemRow = {
  id: string;                         // preferir remitoItemId; fallback hash estable de fuente+sku+description
  remitoId?: string;
  remitoItemId?: string;
  consumoIds: string[];
  consumoItemIds: string[];
  devolucionIds: string[];
  devolucionItemIds: string[];

  itemId?: string | null;             // catálogo/stock futuro, hoy stub
  sku?: string | null;
  description: string;
  unit?: string | null;

   lot?: string | null;                // prioriza lotNumber; fallback metadata histórico
   serial?: string | null;             // prioriza serialNumber; fallback metadata histórico
   expiry?: string | null;             // prioriza expirationDate; fallback metadata histórico
  brand?: string | null;              // V0: metadata solamente si existe
  department?: string | null;         // V0: metadata solamente si existe

  sentQuantity: number;               // suma RemitoItem.quantity
  consumedQuantity: number;           // suma ConsumoItem.consumedQuantity
  returnedQuantity: number;           // ver regla §6.4
  pendingQuantity: number;            // sent - consumed - returned, no menor a 0 salvo gap

  matchConfidence: "direct" | "soft" | "unmatched";
  status: "ok" | "pending" | "difference" | "unknown";
  sourceFlags: {
    hasRemito: boolean;
    hasConsumo: boolean;
    hasDevolucion: boolean;
    hasStockMovement: boolean;
  };
  warnings: string[];
  metadata?: Record<string, unknown>;
};
```

### 4.3 `TraceSummary`, `TraceGap`, `TraceSourceRef`

```ts
type TraceSummary = {
  remitosCount: number;
  consumosCount: number;
  devolucionesCount: number;
  eventsCount: number;
  itemRowsCount: number;
  totalSentQuantity: number;
  totalConsumedQuantity: number;
  totalReturnedQuantity: number;
  rowsWithDifference: number;
  rowsWithUnknownLotOrSerial: number;
  hasStockMovements: boolean;         // false en V0
};

type TraceGap = {
  code:
    | "NO_REMITOS"
    | "NO_CONSUMOS"
    | "NO_DEVOLUCIONES"
    | "NO_STOCK_MOVEMENTS"
    | "LOT_SERIAL_METADATA_ONLY"
    | "UNMATCHED_CONSUMO_ITEM"
    | "UNMATCHED_DEVOLUCION_ITEM"
    | "RETURNED_QUANTITY_SOURCE_CONFLICT";
  message: string;
  severity: "info" | "warning" | "danger";
  sourceIds?: string[];
};

type TraceSourceRef = {
  type: "Remito" | "RemitoItem" | "Consumo" | "ConsumoItem" | "Devolucion" | "DevolucionItem" | "AuditEvent";
  id: string;
  visibleNumber?: number | null;
};
```

---

## 5. Reglas para derivar timeline/eventos

### 5.1 Desde Remito

- `createdAt` → `remito.created` si no existe AuditEvent equivalente y se necesita completar la cronología.
- `issuedAt` → `remito.issued`.
- `deliveredAt` → `remito.delivered`.
- `returnedAt` → `remito.returned` sólo para devolución logística final del remito.
- `state` terminal `Anulado` debe aparecer desde AuditEvent si existe; si no, derivar `remito.state_changed` con `updatedAt` como fallback.

No inferir consumo ni devolución real sólo desde `Remito.state`.

### 5.2 Desde Consumo

- `createdAt` → `consumo.created`.
- `state = Pendiente` con `visibleNumber` asignado puede mostrarse como `consumo.emitted` si AuditEvent lo confirma; si no hay audit, no inventar emisión separada.
- `validatedAt` → `consumo.validated`.
- `facturedAt` → `consumo.factured`.
- `state = Anulado` → preferir AuditEvent; fallback `consumo.state_changed` con `updatedAt`.

El consumo pertenece a un remito específico (`remitoId` obligatorio), pero la Ficha CX muestra consolidado por cirugía.

### 5.3 Desde Devolucion

- `createdAt` → `devolucion.created`.
- `validatedAt` + `state = Confirmada` → `devolucion.confirmed`.
- `state = Rechazada` → `devolucion.rejected`, preferir AuditEvent para fecha exacta/actor.
- `state = Anulada` → `devolucion.state_changed`, preferir AuditEvent.

No asumir que una devolución pendiente o rechazada vuelve al stock ni que debe incrementar `RemitoItem.returnedQuantity`.

### 5.4 Desde AuditEvent

Incluir `AuditEvent` vinculados a la cirugía por:

- `entityType` en `Remito`, `Consumo`, `Devolucion` y `entityId` perteneciente a entidades de la cirugía;
- opcionalmente eventos directos de `Surgery` relevantes a logística/consumo si el módulo lo requiere en una fase posterior.

Si un evento derivado y un AuditEvent representan la misma acción, preferir el AuditEvent como fuente primaria de actor, `action`, `oldValue/newValue`, `module` y timestamp. Evitar duplicados mediante key `(sourceType, sourceId, action/kind)` con ventana temporal tolerante.

---

## 6. Reglas para derivar filas de ítems

### 6.1 Base de filas

La base principal de `TraceItemRow` son los `RemitoItem` de remitos no anulados asociados a `companyId + surgeryId`.

- `sentQuantity = RemitoItem.quantity`.
- `description`, `sku`, `itemId`, `unit` salen del snapshot del remito.
- `lot`, `serial`, `expiry` priorizan los campos normalizados `lotNumber`, `serialNumber`, `expirationDate`; para registros históricos hacen fallback a `metadata`. `brand` y `department` permanecen metadata-only en V0.

### 6.2 Matching de ConsumoItem

Orden de matching:

1. `ConsumoItem.remitoItemId === RemitoItem.id` → `matchConfidence = "direct"`.
2. Si falta FK: `sku` igual dentro del mismo `remitoId` → `soft`.
3. Si falta SKU: `description` normalizada + `unit` dentro del mismo `remitoId` → `soft`.
4. Sin match → fila `unmatched` con `sentQuantity = 0` y gap `UNMATCHED_CONSUMO_ITEM`.

Sólo contar `consumedQuantity` de consumos no anulados. Si la implementación decide contar únicamente `Validado`/`Facturado`, debe explicitarlo en el service; por defecto V0 puede mostrar Borrador/Pendiente como dato no validado con warning.

### 6.3 Matching de DevolucionItem

Orden de matching:

1. `DevolucionItem.remitoItemId === RemitoItem.id` → `direct`.
2. `DevolucionItem.consumoItemId` → resolver a `ConsumoItem.remitoItemId` si existe.
3. Fallback blando por `sku`/`description` dentro de `remitoId`.
4. Sin match → fila `unmatched` con gap `UNMATCHED_DEVOLUCION_ITEM`.

Sólo una `Devolucion` `Confirmada` debe contar como devolución confirmada. `Pendiente` se puede mostrar en timeline o warning, pero no debe sumarse como `returnedQuantity` confirmada salvo decisión de producto posterior.

### 6.4 Cantidad devuelta en V0

La cantidad devuelta debe distinguir dos fuentes:

- `RemitoItem.returnedQuantity`: acumulador logístico del remito, si está sincronizado por endpoint de remito.
- `DevolucionItem.returnedQuantity`: entidad propia de devolución, confirmada por humano.

Regla V0 recomendada:

1. Si hay `Devolucion` confirmada para el item, usar la suma de `DevolucionItem.returnedQuantity` como `returnedQuantity` principal.
2. Si no hay devolución confirmada, usar `RemitoItem.returnedQuantity` como señal logística secundaria.
3. Si ambas existen y difieren, usar la suma de devoluciones confirmadas, agregar warning `RETURNED_QUANTITY_SOURCE_CONFLICT` y exponer ambas en `metadata`.

Esto evita asumir que `Devolucion` siempre muta `RemitoItem.returnedQuantity`.

### 6.5 Estado y diferencias

Para cada fila:

- `pendingQuantity = sentQuantity - consumedQuantity - returnedQuantity`.
- `status = "ok"` si no hay diferencia y hay datos suficientes.
- `status = "pending"` si hay envío sin consumo/devolución aún.
- `status = "difference"` si `pendingQuantity !== 0`, o si consumo/devolución excede lo enviado.
- `status = "unknown"` si la fila proviene sólo de consumo/devolución sin remito matched.

No bloquear la UI por diferencias: mostrarlas como información operativa para revisión.

---

## 7. Mapeo UI — Ficha CX `TrazabilidadPanel`

La UI actual ya contiene una forma conceptual útil: resumen, cronología, tabla de ítems, vistas por lote/serie, implantes y diferencias. La implementación futura debe adaptar ese shape al DTO backend sin reusar `traceEntries`.

### 7.1 Resumen

Mostrar cards desde `TraceSummary`:

- ítems;
- enviados;
- consumidos;
- devueltos;
- diferencias;
- eventos.

Agregar indicador explícito si `hasStockMovements = false`: “Stock fino pendiente / movimientos no integrados”.

### 7.2 Timeline

Renderizar `timeline` ordenada, agrupable por día si crece.

Etiquetas sugeridas:

- `Remito #N emitido`;
- `Remito #N entregado`;
- `Consumo #N validado`;
- `Devolución #N confirmada`;
- `Cambio auditado: …`.

Si no hay `AuditEvent`, mostrar eventos derivados con nota: “Evento derivado de timestamps operativos”.

### 7.3 Tabla de ítems

Columnas V0:

- Artículo / descripción;
- SKU/código;
- Lote;
- Serie;
- Vto.;
- Enviado;
- Consumido;
- Devuelto;
- Pendiente/diferencia;
- Origen / confianza de matching.

Estados:

- `direct`: sin badge o badge neutro “link directo”.
- `soft`: badge warning “matching blando”.
- `unmatched`: badge danger/info “sin remito asociado”.

### 7.4 Estados sin datos o datos incompletos

- Sin remitos: “Todavía no hay remitos backend para esta cirugía.”
- Con remitos pero sin consumo: “Material enviado; consumo no registrado o pendiente.”
- Con consumo pero sin devolución: “Consumo registrado; devolución no registrada/confirmada.”
- Sin `AuditEvent`: “Timeline operativo derivado; auditoría fina no disponible para algunos pasos.”
- Lote/serie ausente: mostrar `—` y gap `LOT_SERIAL_METADATA_ONLY` si sólo está en metadata o no existe.

### 7.5 Exportar / ver fuente

Los CTAs futuros deben navegar a fuentes operativas (`/remitos`, panel de Consumo, panel de Devoluciones) y no editar desde la trazabilidad. Exportación puede ser posterior y debe declarar que es derivada.

---

## 8. Limitaciones y gaps explícitos

1. **No hay `StockMovement` todavía** en el contrato V0; `hasStockMovements=false` y gap `NO_STOCK_MOVEMENTS` son esperados.
2. **No usar `traceEntries`** como fuente final. Cualquier slice/mock de trazabilidad queda legacy.
3. **Lote/serie/vencimiento normalizados pueden faltar en registros históricos**; la vista usa fallback a `metadata` cuando exista. No asumir trazabilidad regulatoria fina hasta schema/modelos específicos.
4. **La confirmación de Devolución muta `RemitoItem.returnedQuantity`** y recalcula el estado del Remito. La vista conserva ambas fuentes para detectar datos históricos o inconsistencias de señales.
5. **Matching blando no es prueba fuerte**. Debe mostrarse como warning y ser testeado para evitar falsos positivos.
6. **AuditEvent puede estar incompleto** si algunas mutaciones históricas no fueron auditadas; los timestamps de entidades actúan como fallback operativo.
7. **No hay caja física/caja enviada real** aún; `boxId` es stub en Remito/RemitoItem.

---

## 9. Estrategia de validación futura

Cuando se implemente, validar con:

1. **Unit tests del service derivador**
   - remito sin consumo;
   - remito + consumo validado;
   - remito + devolución confirmada;
   - conflicto `DevolucionItem` vs `RemitoItem.returnedQuantity`;
   - consumo/devolución unmatched;
   - deduplicación con `AuditEvent`.

2. **Integration API tests**
   - `GET /api/companies/[companyId]/surgeries/[surgeryId]/trace` respeta company scoping;
   - no devuelve entidades de otra empresa;
   - response shape estable;
   - query params `includeAudit/includeItems/from/to`.

3. **Typecheck**
   - DTO compartido API/UI sin `any` innecesario;
   - serialización de `Decimal` a `number` o string decidida y consistente.

4. **Smoke Ficha CX**
   - abrir cirugía con remito backend;
   - ver resumen/timeline/table sin runtime errors;
   - estados vacíos claros;
   - no dependencia de `/expediente/page.tsx` standalone.

No se requieren comandos de test en este task documental.

---

## 10. Human approval boundaries

Requieren aprobación explícita de Franco y task separado:

- cambios en `prisma/schema.prisma`;
- migraciones reales;
- semántica final de `StockMovement` y cómo muta saldos;
- reglas regulatorias de lote/serie/vencimiento;
- decidir si `Devolucion` debe mutar `RemitoItem.returnedQuantity` y cuándo;
- limpieza destructiva de `traceEntries`, store legacy o rutas legacy;
- refactor de Ficha CX/Cirugías fuera del scope mínimo;
- cambios de permisos/auth/multiempresa.

---

## 11. Handoff documental

### Done
- Definido contrato read-only para trazabilidad derivada desde Remito, Consumo, Devolución y AuditEvent.
- Excluido explícitamente `traceEntries` como fuente final.
- Propuesto endpoint companies-scoped por cirugía y DTOs para timeline, filas de ítems, resumen, gaps y fuentes.
- Documentadas reglas de derivación, gaps V0, mapeo UI y validación futura.

### Changed
- Sólo documentación nueva. Sin código, schema ni migraciones.

### Files
- `knowledge/specs/TRACE-DERIVED-CONTRACT/DESIGN.md`

### Validations
- Revisados docs canónicos de circuito, cirugía/expediente, preparación/remito/consumo/devolución, stock/trazabilidad y auditoría.
- Revisado contrato real vigente de Remito, Consumo, Devolución y AuditEvent en schema/services.
- Revisado `TrazabilidadPanel` sólo para mapear shape UI existente.

### Risks
- El contrato depende de decisiones futuras de StockMovement, lote/serie y sincronización Devolucion↔RemitoItem.
- Hay dirty tree preexistente amplio; este task sólo agrega el doc indicado.

### Next
- Implementación futura: crear service derivador + route GET + hook/UI adapter para Ficha CX con tests unit/integration y smoke.
