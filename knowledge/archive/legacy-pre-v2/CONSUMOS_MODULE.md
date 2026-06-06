# CONSUMOS_MODULE.md — Conocimiento Oficial del Módulo Consumos

> **Version**: 1.1 · **Creado**: 2026-05-13 · **Tarea**: CHATZAI-006
> **Responsable**: CHATZAI (Frontend Lead)
> **Regla**: Este documento es la fuente canónica de conocimiento funcional del módulo Consumos. Cualquier agente que trabaje en Consumos DEBE leer este archivo primero.

---

## 1. Definición Funcional

El módulo Consumos gestiona el registro de lo que efectivamente se utilizó y se devolvió del material enviado para una cirugía. Es la constancia objetiva de la diferencia entre lo que salió del depósito y lo que volvió, y es el dato que alimenta la facturación.

### Posición en el circuito
```
Cirugía → Presupuesto → CONSUMO → Facturación → Cobro
                            ↑
                     (este módulo)
```

Consumos es el **punto de contraste**: aquí se confronta lo presupuestado (previsto) con lo realmente utilizado (efectivo). Sin un módulo de Consumos robusto, Facturación carece de base objetiva y la empresa pierde visibilidad sobre desvíos.

### Perfiles de usuario
| Perfil | Uso principal | Necesidad clave |
|--------|--------------|----------------|
| Instrumentador | Cargar qué se usó y qué se devolvió | Formulario rápido con items del remito |
| Coordinador | Verificar datos, completar campos, validar | Ver consumos pendientes, editar, validar |
| Administrativo | Validar consumos, habilitar facturación | Ver consumos Pendientes, validar, ver desvíos |
| Facturación | Basar facturación en consumo validado | Ver delta presupuestado/consumido, generar FV |
| Gerencia | Control de desvíos, métricas | Dashboard con deltas, tasas de completitud |

---

## 2. Arquitectura del Módulo

### Estructura de archivos
```
src/
├── app/consumo/page.tsx                           # Página independiente (321 líneas)
├── components/expediente/ConsumoPanel.tsx         # Panel en expediente (638 líneas)
├── components/expediente/RemitosPanel.tsx         # Panel de remitos (480 líneas)
├── data/mock-consumo.ts                           # 3 consumos mock (39 líneas)
├── data/mock-remitos.ts                           # 3 remitos mock (40 líneas)
├── lib/store.ts                                   # Acciones: create, validate, update
├── lib/businessRules.ts                           # canCargarConsumo, canValidateConsumption
├── lib/cirugias.constants.ts                      # CONSUMO_STATE_COLORS
└── types/index.ts                                 # Tipos Consumo, ConsumoItem
```

### Puntos de acceso
1. **Sidebar → Operaciones → Consumo**: Página independiente `/consumo`
2. **Expediente → Tab "Consumo"**: ConsumoPanel para la cirugía seleccionada
3. **Tabla Cirugías → Columna "Consumo"**: Badge operativo de estado
4. **ExpedienteHeader → "Cargar consumo"**: Botón contextual

### Estados del consumo
```typescript
type ConsumoState = "Pendiente" | "Validado" | "Facturado"

// Flujo:
Pendiente → Validado → Facturado
```

| Estado | Significado | Edición? | Acciones disponibles |
|--------|------------|----------|---------------------|
| Pendiente | Cargado pero no confirmado | Sí | Editar, Validar, Eliminar |
| Validado | Datos confirmados | No | (Prepara facturación) |
| Facturado | Se generó factura | No | Ver facturación |

**Transición "Validado → Facturado"**: No implementada. Debería dispararse al autorizar la FV asociada.

---

## 3. Datos del Módulo

### Tipo Consumo
```typescript
interface Consumo {
  id: string                    // "CON-XXXX"
  surgeryId: string             // Cirugía asociada (obligatorio)
  boxId: string                 // Caja enviada
  items: ConsumoItem[]          // Items consumidos/devueltos
  validatedBy: string           // Quien validó
  validatedAt?: string          // Cuándo se validó
  state: "Pendiente" | "Validado" | "Facturado"
}
```

### Tipo ConsumoItem
```typescript
interface ConsumoItem {
  stockItemId: string           // ID del artículo en stock
  name: string                  // Nombre
  code: string                  // Código
  lot: string                   // Lote (vacío al crear desde remito)
  serial?: string               // Número de serie
  department: string            // Departamento (vacío al crear)
  rubro: string                 // Rubro (vacío al crear)
  brand: string                 // Marca (vacío al crear)
  expiry?: string               // Vencimiento
  consumed: number              // Cantidad consumida
  returned: number              // Cantidad devuelta
}
```

### Tipos relacionados
```typescript
// Remito → fuente del consumo
interface RemitoItem {
  stockItemId: string
  name: string
  code: string
  sentQuantity: number       // Lo que se envió
  returnedQuantity: number   // Lo que se devolvió
  consumedQuantity: number   // Lo que se consumió
}

// Box → contiene el material enviado
interface BoxContent {
  stockItemId: string
  name: string
  code: string
  quantity: number
  consumed: number
  returned: number
}
```

### Carencia en el tipo Consumo
El tipo `Consumo` **no tiene `presupuestoId`**. Esto impide la comparativa presupuestado vs consumido (DF-006). La vinculación hoy es indirecta: Consumo.surgeryId → Surgery → Presupuesto. Se necesita decidir si agregar un campo directo o mantener el enlace implícito (DC-002).

---

## 4. Store Actions

| Acción | Firma | Efecto |
|--------|-------|--------|
| `createConsumptionFromDeliveryNote()` | `(remitoId: string) => Consumo` | Crea consumo desde remito. Items mapeados con lot/department/rubro/brand vacíos. State="Pendiente". Registra audit. |
| `validateConsumption()` | `(consumoId: string) => void` | Cambia state a "Validado", setea validatedBy/validatedAt. Registra audit. |
| `updateConsumoItem()` | `(consumoId, stockItemId, updates) => void` | Actualización parcial de un item del consumo. |

### Getters
| Getter | Firma | Retorna |
|--------|-------|---------|
| `getConsumoBySurgeryId()` | `(surgeryId) => Consumo \| undefined` | Primer consumo de la cirugía (asume 1:1) |

### Acciones faltantes (no implementadas)
| Acción | Firma esperada | Propósito |
|--------|---------------|-----------|
| `createConsumoManual()` | `(surgeryId, items) => Consumo` | Crear consumo sin remito (urgencias) |
| `deleteConsumo()` | `(consumoId) => void` | Eliminar consumo pendiente |
| `reopenConsumo()` | `(consumoId) => void` | Reabrir consumo validado sin FV |
| `markConsumoAsFacturado()` | `(consumoId) => void` | Transición Validado → Facturado |

---

## 5. Datos que se arrastran de Remito a Consumo

| Dato Remito | Dato Consumo | Se llena automáticamente? |
|-------------|-------------|--------------------------|
| `remito.surgeryId` | `consumo.surgeryId` | Sí |
| `remito.boxId` | `consumo.boxId` | Sí |
| `remitoItem.stockItemId` | `consumoItem.stockItemId` | Sí |
| `remitoItem.name` | `consumoItem.name` | Sí |
| `remitoItem.code` | `consumoItem.code` | Sí |
| `remitoItem.consumedQuantity` | `consumoItem.consumed` | Sí (pre-lleno) |
| `remitoItem.returnedQuantity` | `consumoItem.returned` | Sí (pre-lleno) |
| — | `consumoItem.lot` | **No — queda vacío** |
| — | `consumoItem.department` | **No — queda vacío** |
| — | `consumoItem.rubro` | **No — queda vacío** |
| — | `consumoItem.brand` | **No — queda vacío** |

Los campos lot, department, rubro y brand no existen en RemitoItem, por lo que no pueden mapearse automáticamente. Deben completarse manualmente o tomarse del catálogo de stock.

---

## 6. Comparativa Central (DF-006)

### Decisión cerrada
La comparativa presupuestado vs consumido tiene su **lectura principal en el módulo Consumos** (DF-006, cerrada en CHATZAI-003). Facturación muestra un resumen del delta.

### Ejes de contraste
| Eje | Fuente | Pregunta |
|-----|--------|----------|
| Presupuestado | Presupuesto.items | ¿Qué se planeó usar? |
| Enviado | Remito.items (sentQuantity) | ¿Qué se envió al quirófano? |
| Consumido | Consumo.items (consumed) | ¿Qué se usó efectivamente? |
| Devuelto | Consumo.items (returned) | ¿Qué se devolvió sin usar? |

### Tipos de desvío
- Consumido > Presupuestado → facturación adicional
- Consumido < Presupuestado → posible nota de crédito
- Enviado ≠ Presupuestado → desvío logístico
- Ítem consumido sin presupuesto → consumo no presupuestado (alerta)
- Ítem presupuestado no consumido → sobre-presupuesto (info)
- Artículo Z presupuestado → consumo real con precio distinto (seguimiento especial)

### Vista por ítem (tabla comparativa)
| Columna | Origen |
|---------|--------|
| Artículo | ConsumoItem.name / PresupuestoItem.name |
| Presupuestado (cant.) | PresupuestoItem.quantity |
| Precio unit. PR | PresupuestoItem.unitPrice |
| Enviado (cant.) | RemitoItem.sentQuantity |
| Consumido (cant.) | ConsumoItem.consumed |
| Devuelto (cant.) | ConsumoItem.returned |
| Dif. PR vs CON | PR.quantity - CON.consumed |
| Dif. NR vs CON | NR.sent - CON.consumed - CON.returned |
| Delta $ | (PR.quantity - CON.consumed) × PR.unitPrice |

### Vinculación necesaria
La comparativa requiere poder vincular items del presupuesto con items del consumo. El match puede hacerse por:
- **stockItemId** (si ambos lo tienen, pero PresupuestoItem no siempre lo tiene)
- **code** (código de artículo)
- **name** (nombre, menos confiable)
- **Match manual** del usuario para artículos Z

---

## 7. Relación con Otros Módulos

### Cirugías
```
Surgery (1) ←→ (0..1) Consumo  [relación actual, 1:1]
   consumo.surgeryId → cirugía asociada (obligatorio)
```
- `canCargarConsumo(surgery)` → requiere cirugía no cancelada y autorizada
- Badge de consumo en tabla de cirugías
- "Consumo pendiente" en pendiente principal si corresponde

### Presupuestos
```
No hay relación directa en el modelo de datos actual.
Vinculación indirecta: Consumo.surgeryId → Surgery → getPresupuestosBySurgeryId()
```
- Comparativa presupuestado vs consumido (DF-006)
- Artículos Z presupuestados necesitan seguimiento
- Delta monetario alimenta facturación

### Remitos
```
Remito (1) → (0..1) Consumo  [actual: 1 remito → 1 consumo]
   createConsumptionFromDeliveryNote(remitoId)
```
- Items del remito son la base para los items del consumo
- Cantidades enviadas alimentan la columna "Enviado"
- Devoluciones se reflejan en ambos lados

### Facturación
```
Consumo (Validado) → habilita → Facturación
```
- Consumo validado es requisito para facturar (debería serlo, hoy no se verifica)
- Items consumidos + precios del PR = líneas de factura
- Delta presupuestado/consumido = FV adicional o NC

---

## 8. Fricciones y Carencias Detectadas (CHATZAI-005)

### Críticas
| Fricción | Descripción |
|----------|------------|
| **"Cargar consumo" no funciona** | EmptyState.onCargar es un TODO sin implementar. No hay diálogo de carga. |
| **Guardar edición no persiste** | handleSaveEdit es un TODO. Los cambios en consumed/returned no se guardan. |

### Altas
| Fricción | Descripción |
|----------|------------|
| **Validar en ConsumoPanel sin handler** | Botón existe pero no tiene onClick |
| **No hay transición a "Facturado"** | Ningún store action cambia consumo de Validado a Facturado |
| **canAutorizarFV no exige consumo** | Recibe consumoState pero no lo evalúa como condición |
| **Campos vacíos al crear desde remito** | lot, department, rubro, brand se crean vacíos |
| **No hay hook dedicado** | Toda la lógica está inline |

### Medias
| Fricción | Descripción |
|----------|------------|
| **Relación 1:1 estricta** | No soporta múltiples consumos por cirugía |
| **Sin presupuestoId** | No hay vínculo directo Consumo → Presupuesto |
| **No hay carga manual** | Solo se puede crear consumo desde remito |
| **ConsumoPanel monolítico** | 638 líneas con sub-componentes inline |
| **Mock data insuficiente** | Solo 3 consumos para 8 cirugías |

---

## 9. Decisiones Funcionales

### Cerradas (CHATZAI-006)

| ID | Decisión | Resolución |
|----|----------|-----------|
| DC-001 | ¿Un consumo o múltiples por cirugía? | ✅ Un consumo consolidado por cirugía. Múltiples remitos → merge en un solo consumo. |
| DC-002 | ¿Cómo se vincula consumo con presupuesto? | ✅ Vinculación implícita vía surgeryId + presupuestoVigenteId snapshot al validar. |
| DC-003 | ¿Se puede cargar consumo sin remito? | ✅ Sí, con justificación obligatoria. Dos modos: remito (preferido) y manual (excepcional). |
| DC-004 | ¿Qué datos obligatorios para validar? | ✅ Datos completos obligatorios: lot/dept/rubro/brand si consumed > 0. Faltantes exigen observación. |
| DC-005 | ¿Consumo validado = requisito para facturar? | ✅ Sí, obligatorio. canAutorizarFV() debe verificar consumoState. |

### Pendientes

| ID | Decisión | Prioridad |
|----|----------|-----------|
| DC-006 | ¿Cómo se matchean artículos Z? | Media |
| DC-007 | ¿Se permite eliminar consumo pendiente? | Baja |

---

## 10. Mock Data

3 consumos para 8 cirugías (37.5% de cobertura):

| Consumo | Cirugía | Caja | Estado | Items | Validado por |
|---------|---------|------|--------|-------|-------------|
| CON-0001 | CX-0003 | CAJ-0003 | Validado | Placa + Tornillo | María López |
| CON-0002 | CX-0005 | CAJ-0004 | Facturado | Cage + Tornillo | María López |
| CON-0003 | CX-0008 | CAJ-0005 | Pendiente | Shaver + Kit | — |

Cirugías sin consumo: CX-0001, CX-0002, CX-0004, CX-0006, CX-0007.

---

## 11. Mejora Prioritaria Recomendada

**Crear el diálogo de carga de consumo**: Es el gap más crítico. Sin un diálogo funcional para cargar consumos, el flujo operativo está roto. El diálogo debe:
1. Permitir cargar desde remito (flujo actual pero con UI)
2. Permitir carga manual (caso sin remito)
3. Pre-llenar datos del remito o presupuesto
4. Validar campos obligatorios
5. Conectar con store actions existentes y nuevas

---

## 12. Historial de Revisiones

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-05-13 | 1.0 | Creación del documento (CHATZAI-005). Conocimiento canónico del módulo Consumos. |
| 2026-05-13 | 1.1 | Decisiones DC-001 a DC-005 cerradas (CHATZAI-006). Sección 9 reestructurada con Cerradas/Pendientes. |
