# PROPOSAL — Remito Unificado (DESIGN-REMITO-UNIFICADO)

Estado: **docs sincronizados con contrato backend/UI real vigente**. Franco aceptó el contrato implementado el 2026-07-07; el sync 2026-07-08 refleja los gaps backend cerrados, `/remitos` backend-backed y la integración compacta en Ficha CX.
Fecha: 2026-07-08
Task: DESIGN-REMITO-UNIFICADO
Modo: docs sync — lectura sobre implementación real; escritura exclusiva en `knowledge/specs/REMITO-UNIFICADO/`.

---

## 1. Intención

Unificar los dos modelos de Remito hoy coexistentes en el prototipo frontend:

- **V1 (box-driven / logística)** — `generateDeliveryNoteFromOrder(pedidoId, boxId)` genera un `Remito` desde una caja/PE y **back-writea** `surgery.remitoId` + `surgery.state = "En tránsito"`. Items provienen de `box.contents`.
- **V2 (presupuesto-driven / comercial)** — `createRemito(data)` genera un `Remito` desde items de presupuesto/ preparación, con `RemitoEstado` (`borrador|emitido|enviado|entregado|cerrado|anulado`) y `DestinatarioSnapshot`. **No back-writea** surgery.

Son dos caminos históricos de creación con back-writes inconsistentes (conflicto **C4** del `PLAN_CONTINUIDAD_REAL_OSSUM_COR.md` §5). El contrato backend unificado ya resuelve esa bifurcación; los restos mock/legacy deben migrarse por superficie sin reintroducir back-write.

**Objetivo vigente:** documentar el contrato real ya implementado para `Remito` + `RemitoItem`, aceptado por Franco como fuente de verdad operativa. No se fuerza el backend a volver al diseño original; se registran diferencias y gaps como pendientes enfocados, no como bloqueantes del contrato.

---

## 2. Alcance

Cubierto por este sync (detalle en `DESIGN.md`):

1. Entidades de dominio `Remito` + `RemitoItem`.
2. Modelo Prisma real vigente y diferencias contra la propuesta original.
3. Service + API surface real (paths, auth, roles, validator) con gaps backend de Remito cerrados.
4. Linkage con `Consumo` futuro (Fase 1B) — contrato, no diseño de Consumo.
5. Estado UI actual: `/remitos` backend-backed con create/edit borrador, emitir, transición, devolución, detalle, refresh e impresión/PDF de navegador.
6. Reglas de dominio reforzadas (canónicas de `PREPARACION_REMITOS_CONSUMO.md`).
7. Gates / boundaries de aprobación de Franco.

Fuera de alcance: implementación, schema, migraciones, build, typecheck, Consumo, Presupuesto, Factura, Stock, Box, Auth productivo. Este sync es sólo documentación.

---

## 3. Alternativas consideradas para el modelo unificado

### Opción A — Un solo `Remito` con campo `origin` (ACEPTADA, con contrato real vigente)

Una tabla `Remito` con `origin String` (`box`|`presupuesto`|`manual`|`mixto`), `boxId String?` y `presupuestoId String?` como **stubs planos nullable** (sin FK en V0), `surgeryId String?` nullable (cirugía vinculada "si aplica"), `destinatarioSnapshot Json?` nullable en V0, items en `RemitoItem`, y `state String` con catálogo controlado en validator/service.

**Pros:**
- Una sola entidad, una sola API, un solo service, una sola secuencia de estados. Simplifica queries, listados, comparativa, linkage a Consumo (1-N Consumo→Remito por `remitoId`).
- `destinatarioSnapshot` resuelve inmutabilidad del receptor legal sin reificar contactos en cada remito.
- `origin` permite distinguir el camino V1 (logística) y V2 (comercial) sin dos tablas.
- Coherente con `DATA_MODEL_RULES.md`: “evitar enums rígidos sin estrategia de configuración” → `state`/`origin` como `String` con catálogo en validator (igual que `Surgery.cxStatus`/`prepStatus`).
- FKs a Box/Presupuesto quedan como stubs string nullable → **no introduce dependencia circular ni bloqueo** por entidades que aún no existen (Box lands Fase 3, Presupuesto Fase 1C). Convertir stub→FK real es migration trivial y aislada cuando cada modelo aterrice.

**Contras:**
- `origin` como string puede admitir valores fuera de catálogo si validator falla → mitigado con catálogo controlado + guard en service (igual que `cxStatus`).
- Ligeramente más ancho que una tabla logística pura, pero los campos opcionales son `?` y no cuestan.

### Opción B — Dos tablas `RemitoComercial` + `RemitoLogistico`

Separar V1 y V2 en dos entidades distintas con FK a una vista de Consumo diferente cada una.

**Contra decisivo:** duplica service/validator/API/audit/estados; rompe la regla canónica “cada consumo pertenece a un remito” al bifurcar el binding; la comparativa debe unir dos tablas siempre;/types duplicados. `BACKEND_PHASE2_PLAN.md` Principio 3 exige **unificar**, no separar. Rechazada.

### Opción C — `Remito` polimórfico con `variant Json` por origen

Un `Remito` con un campo `variant Json` que cambia su shape según `origin` (box contents vs presupuesto items vs manual items).

**Contras:** `Json` polymorphism complica queries, índices, validación y migración futura a FK reales; pierde type-safety en service; Prisma no valida shape de `Json`. Sólo aporta flexibilidad que ya conseguimos con `origin` + items snapshot. Rechazada por complejidad innecesaria.

### Opción D (sub-opción A) — `Remito` único sin campo `origin`

Mismo `Remito` pero sin `origin`; el camino se infiere de `boxId`/`presupuestoId` no-null.

**Contra:** reintroduce ambigüedad cuando ambos están null (manual) o ambos set (mixto); pierde Catálogo explícito para filtros/auditoría/listado; complica comparativa y trazabilidad. Subordinada: mantener `origin` explícito.

### Opción E (sub-opción A) — `state`/`origin` como `enum` Prisma en vez de `String`

Usar `enum RemitoState { ... }` y `enum RemitoOrigin { ... }`.

**Contra:** choca con `DATA_MODEL_RULES.md` (“evitar enums rígidos sin estrategia de configuración”) y con el patrón predominante en el schema (Surgery usa `cxStatus`/`prepStatus` como `String`; sólo DigitalReceipt usa enums Prisma, y eso es deuda señalada en T2/C14). Enums Prisma requieren migración para cada cambio de catálogo. Rechazada para V0; dejar como vetada futura si surge estrategia de configuración.

---

## 4. Contrato real vigente aceptado

Franco aceptó el 2026-07-07 el backend implementado como contrato vigente. Por lo tanto, las recomendaciones originales que difieren de este contrato quedan **supersedidas**. El contrato real es:

- `state String` (catálogo controlado en `remito.validator.ts`).
- `origin String` (`box`|`presupuesto`|`manual`|`mixto`).
- `surgeryId String?` nullable (cirugía vinculada “si aplica”; remitos logísticos de traslado/reposición la tendrán null).
- `boxId String?` y `presupuestoId String?` como **stubs planos nullable en V0** (no FK), convertibles a FK real cuando `Box` (Fase 3) y `Presupuesto` (Fase 1C) aterricen.
- `destinatarioSnapshot Json?` nullable en V0. La inmutabilidad legal se mantiene como intención, pero el contrato actual permite borradores/system-created sin snapshot.
- `visibleNumber Int?` único por empresa, autocalculado server-side al emitir. Queda supersedido el formato propuesto `String?` con `R-####`.
- `items RemitoItem[]` 1-N con `onDelete: Cascade`.
- `quantity Decimal @db.Decimal(18,4)` y `returnedQuantity Decimal @default(0) @db.Decimal(18,4)`.
- `createdById String?` nullable en V0; `createdBy` y `updatedBy` son relaciones nullable con `onDelete: SetNull`.
- **Sin back-write a `surgery.remitoId`**. La cirugía se linka vía `Remito.surgeryId`; el `cxStatus` de Surgery lo actualiza un servicio server-side que mira `Remito`, jamás el store (elimina conflicto C4). El campo `surgery.remitoId` del **mock frontend desaparece**; no se agrega a `Surgery` en Prisma.

Estados del catálogo controlado (`state`):

```
Borrador | Emitido | En_transito | Entregado
| Parcialmente_devuelto | Devuelto | Anulado
```

(Catálogo completo y justificación en `DESIGN.md` §1.)

---

## 5. Gates originales — estado tras aceptación de Franco

Estos gates ya no bloquean el contrato Remito implementado. Quedan así:

1. **`origin` como catálogo string cerrado** (`box`|`presupuesto`|`manual`|`mixto`) — aceptado.
2. **Sin back-write de `surgery.remitoId`** — aceptado como contrato backend; no se agrega `remitoId` a `Surgery`.
3. **`quantity` Decimal** — aceptado como `Decimal(18,4)`, no `Decimal(12,3)`.
4. **Roles reales de Remito** — mutación: `['admin','coordinador','logistica']`; lectura: `['admin','coordinador','logistica','vendedor','matrona','instrumentador']`. Queda supersedido el set propuesto `manager/coordinator/owner/super_admin/depósito` para este contrato.
5. **Estado terminal `Anulado`** — aceptado.
6. **`boxId` y `presupuestoId` stubs nullable** — aceptado.
7. **`surgeryId` nullable** — aceptado.

> Referencia: `PLAN_CONTINUIDAD_REAL_OSSUM_COR.md` §15. Esta propuesta **no inventa decisions no listadas**; las 6 (más la 7 implícita) son sub-puntos del item #1 (Remito unificado) y del #11 (permisos centralizados) de esa lista. Si Franco pide un punto no cubierto por §15, escalar (no inventar).

---

## 6. Estado API/service/UI actual

Los gaps backend registrados en el sync 2026-07-07 están **cerrados**:

- Existe ruta explícita `POST /api/companies/[companyId]/remitos/[remitoId]/emitir`, conectada a `emitirRemito`.
- Existe `PATCH /api/companies/[companyId]/remitos/[remitoId]` para actualizar borradores mediante `updateRemitoDraft`; sólo permite estado `Borrador` y mantiene `origin` inmutable.
- La ruta `PATCH /api/companies/[companyId]/remitos/[remitoId]/state` acepta `{ state }` y conserva compatibilidad con `{ newState }`; el validator normaliza a `newState`.
- Timestamps/transitions alineados: `issuedAt` se setea al emitir/transicionar a `Emitido`, `deliveredAt` al pasar a `Entregado`, y `returnedAt` sólo al cierre final `Devuelto`.
- Confirmar una `Devolucion` aplica sus cantidades a `RemitoItem.returnedQuantity`, recalcula el estado del Remito (`Parcialmente_devuelto` o `Devuelto`) y sólo setea `returnedAt` al cierre total. El claim `Pendiente → Confirmada` es condicional dentro de la transacción para que una doble confirmación concurrente no aplique cantidades dos veces.

El módulo `/remitos` ya está backend-backed:

- Lista y detalle consumen `useRemitos` + `src/lib/api/remitos.ts` contra `/api/companies/[companyId]/remitos`.
- Incluye refresh, emitir, transición de estado, devolución explícita, impresión/guardar PDF desde navegador.
- Incluye create/edit de borrador con `RemitoDraftDialog`.

Integración Ficha CX:

- La **Ficha CX** es la superficie real vigente de detalle de cirugía, aunque sus componentes vivan bajo `src/components/expediente/*`.
- La página standalone `/expediente` queda legacy/deprecada por ahora; no tomarla como superficie principal para Remito.
- Ficha CX muestra un resumen compacto de remitos (`RemitosSummaryCard`) y su CTA `Ver remitos` navega a la pestaña **Logística**.
- El panel completo de Remitos dentro de Logística (`LogisticaTabContent` → `RemitosPanel`) todavía usa el DTO/mock legado recibido por props; falta integrarlo al backend por `surgeryId`.

---

## 7. Riesgos conocidos

- **Stub `boxId`/`presupuestoId` sin FK** → integridad referencial blanda hasta que `Box`/`Presupuesto` aterricen. El contrato actual sólo valida catálogo de `origin`; la consistencia `origin↔boxId/presupuestoId` queda como mejora focalizada futura si Franco la confirma.
- **`state` como String** → “magic strings” distribuidas (deuda T2/C14 ya discutida en `PLAN_CONTINUIDAD`). Mitigado con catálogo central en `remito.validator.ts` + labels + transition map (igual que `CX_STATUS`/`CX_STATUS_TRANSITIONS`).
- **`Anulado` vs `Cancelado`** si Franco elige inconsistente con Surgery → strings mágicas divergentes adicionales. Gate #5.
- **Migración frontend store→DTO parcial** → `/remitos` y el resumen compacto de Ficha CX ya leen backend, pero el panel completo de Remitos en Logística aún usa el DTO/mock legado por props.
- **`Consumo.remitoId` obligatorio** (Fase 1B) ya aparece en schema; mantener linkage por `Remito.id String cuid` + `surgeryId String?`.
- **Ficha CX / Logística** → pendiente integrar DTO backend por `surgeryId` en el panel completo de Remitos; próximo task sugerido `REMITO-FICHA-DTO-001`.

---

## 8. Próximo paso

Cerrado este sync documental → abrir `REMITO-FICHA-DTO-001` para integrar el panel completo de Remitos en Logística/Ficha CX contra DTO backend por `surgeryId`. Después, si hace falta, agregar acciones contextuales desde Ficha CX/Logística (crear borrador asociado, emitir o imprimir) sin duplicar lógica ya disponible en `/remitos`.

Detalle técnico completo: ver `DESIGN.md` en este mismo directorio.
