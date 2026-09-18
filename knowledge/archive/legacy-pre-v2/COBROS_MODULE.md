# knowledge/COBROS_MODULE.md — Conocimiento Canónico del Módulo Cobros

> **Version**: 1.0 · **Creado**: 2026-05-14 · **Autor**: CHATZAI-012
> **Fuente principal**: COBROS_BLUEPRINT.md v1.0
> **Estado**: Definición funcional completa — sin implementación frontend aún

---

## Sección 1 — Definición Funcional

### Qué hace el módulo Cobros

El módulo Cobros gestiona el ingreso de dinero por parte de clientes/financiadores y su imputación a Facturas de Venta (FV). Es el último eslabón del circuito central:

```
Cirugía → Presupuesto → Consumo → Facturación → Cobro
```

Funciones principales:
1. **Registro de cobros**: Documentar ingresos de dinero con medio, referencia y observaciones
2. **Imputación a facturas**: Distribuir cobros entre una o varias FV del mismo cliente
3. **Cálculo dinámico de saldos**: Actualizar automáticamente el saldo pendiente de cada FV
4. **Visibilidad operativa**: Mostrar qué se cobró, qué falta, qué vence, qué está sin imputar

### Principio fundamental

**El Cobro es una entidad financiera independiente de la Factura.** La factura es un compromiso; el cobro es un ingreso real. La imputación es el vínculo formal entre ambos.

---

## Sección 2 — Arquitectura

### Archivos existentes

| Archivo | Líneas | Estado | Notas |
|---------|--------|--------|-------|
| `src/app/ventas/cobros/page.tsx` | 319 | Funcional-básico | Tabla, filtros, diálogo simple |
| `src/data/mock-cobros.ts` | 52 | Existen | 4 cobros de ejemplo |
| `src/types/index.ts` (Cobro types) | ~14 | Insuficiente | Necesita ImputacionCobro, MedioCobro, EstadoCobro |
| `src/lib/store.ts` (cobro actions) | ~20 | Funcional-básico | createCobro, getCobrosBySurgeryId, getSaldoPendiente |

### Archivos propuestos (nuevos)

| Archivo | Propósito | Estimado líneas |
|---------|-----------|----------------|
| `src/lib/cobros.utils.ts` | Cálculos de saldo, estado, vencimiento, validaciones | ~150 |
| `src/lib/cobros.constants.ts` | Medios de cobro, estados, labels, colores, plazos | ~60 |
| `src/components/cobros/CobroFormDialog.tsx` | Dialog de registro con imputación | ~250 |
| `src/components/cobros/CobroDetailDialog.tsx` | Vista de detalle de cobro con imputaciones | ~150 |
| `src/components/cobros/ImputacionDistribuidor.tsx` | Sub-componente para distribuir cobro entre FV | ~120 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/types/index.ts` | Agregar MedioCobro, EstadoCobro, ImputacionCobro, actualizar Cobro |
| `src/lib/store.ts` | Agregar imputaciones state, createCobroV2, createImputacion, getters corregidos |
| `src/app/ventas/cobros/page.tsx` | Reescritura con tabs, tabla dual, CobroFormDialog |
| `src/app/ventas/facturacion/page.tsx` | Reemplazar inline cobro dialog por CobroFormDialog |
| `src/lib/facturacion.utils.ts` | Actualizar getSaldoPendiente para usar ImputacionCobro |
| `src/data/mock-cobros.ts` | Migrar a nuevo modelo, agregar imputaciones mock |

### Puntos de acceso

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/ventas/cobros` | Navegación | Vista principal del módulo Cobros |
| `/ventas/facturacion` → "Registrar cobro" | Acción contextual | Registro de cobro desde FV específica |
| Expediente → ComprobantesAsociados | Visualización | Ver cobros aplicados a cirugía |

---

## Sección 3 — Modelo de Datos

### 3.1 Cobro (movimiento financiero)

```typescript
export type MedioCobro = "transferencia" | "cheque" | "efectivo" | "deposito" | "otro"

export type EstadoCobro = "registrado" | "parcialmente_imputado" | "imputado_completo"

export interface Cobro {
  id: string                        // COB-XXXX
  fecha: string                     // Fecha del cobro (ISO date)
  clienteId: string                 // Referencia al cliente/financiador
  clienteNombre: string             // Denormalizado para lectura
  importe: number                   // Monto total recibido
  medioCobro: MedioCobro            // Medio de pago
  referencia?: string               // Nro. transferencia, cheque, etc.
  observaciones?: string            // Notas adicionales
  registradoPor?: string            // Usuario (futuro — auth)
  fechaRegistro: string             // Timestamp de creación
}
```

**Nota**: Se elimina el campo `saldo` (DCob-011). Se elimina `state` como `CobroState` y se reemplaza por cálculo dinámico de `EstadoCobro`. Se elimina `facturaId` y `surgeryId` del Cobro (la vinculación con FV se hace exclusivamente a través de ImputacionCobro).

### 3.2 ImputacionCobro (vínculo cobro ↔ factura)

```typescript
export interface ImputacionCobro {
  id: string                        // IMP-XXXX
  cobroId: string                   // Referencia al cobro
  facturaId: string                 // Referencia a FV (Comprobante.number)
  importeImputado: number           // Monto aplicado a esta FV
  fechaImputacion: string           // Fecha de la imputación (ISO date)
}
```

### 3.3 Cálculos dinámicos

| Cálculo | Función | Fórmula |
|---------|---------|---------|
| Saldo pendiente FV | `getSaldoPendienteFV(fv, imputaciones)` | `max(0, fv.amount - sum(imputaciones where facturaId=fv.number))` |
| Importe imputado del cobro | `getImporteImputado(cobro, imputaciones)` | `sum(imputaciones where cobroId=cobro.id)` |
| Importe no imputado | `getImporteNoImputado(cobro, imputaciones)` | `cobro.importe - getImporteImputado(cobro, imputaciones)` |
| Estado del cobro | `getEstadoCobro(cobro, imputaciones)` | Ver regla abajo |
| Estado de cobranza FV | `getEstadoCobranzaFV(fv, imputaciones)` | Ver regla abajo |
| Vencimiento FV | `getVencimientoFV(fv, cliente?)` | `cliente?.condicionPago ? fv.date + condicionPago : (fv.expiry ?? fv.date + PLAZO_PAGO_DEFAULT_DIAS)` — fallback configurable, no hardcoded |

**Estado del cobro**:
- `registrado` si `getImporteImputado === 0`
- `parcialmente_imputado` si `0 < getImporteImputado < importe`
- `imputado_completo` si `getImporteImputado >= importe`

**Estado de cobranza FV** (ya existe en `getEstadoFacturacionWithFV`):
- `factura_sin_cobrar` si `saldoPendiente === fv.amount` (sin cobros)
- `factura_cobrada_parcialmente` si `0 < saldoPendiente < fv.amount`
- `factura_cobrada` si `saldoPendiente <= 0`
- `vencida` si `fechaHoy > vencimiento && saldoPendiente > 0`

---

## Sección 4 — Store Actions

### Acciones existentes (a modificar)

| Acción | Cambio |
|--------|--------|
| `createCobro` | Reescribir para nuevo modelo sin `saldo`, sin `facturaId`, sin `state` |
| `getCobrosBySurgeryId` | Deprecar — reemplazar por `getCobrosByFacturaId` |
| `getSaldoPendiente` | Cambiar filtro a `facturaId`, usar `ImputacionCobro` |

### Acciones nuevas

| Acción | Firma | Propósito |
|--------|-------|-----------|
| `createCobroV2` | `(data: Omit<Cobro, "id" \| "fechaRegistro">) => Cobro` | Crear cobro con nuevo modelo |
| `createImputacion` | `(data: Omit<ImputacionCobro, "id" \| "fechaImputacion">) => ImputacionCobro` | Crear imputación |
| `createCobroConImputacion` | `(cobroData, imputacionesData) => { cobro, imputaciones }` | Transacción: crear cobro + imputaciones |
| `getCobrosByFacturaId` | `(facturaId: string) => Cobro[]` | Cobros de una factura vía imputaciones |
| `getImputacionesByCobroId` | `(cobroId: string) => ImputacionCobro[]` | Imputaciones de un cobro |
| `getImputacionesByFacturaId` | `(facturaId: string) => ImputacionCobro[]` | Imputaciones de una factura |
| `getSaldoPendienteByFacturaId` | `(facturaId: string) => number` | Saldo pendiente de una FV |
| `getTotalCobradoByFacturaId` | `(facturaId: string) => number` | Total cobrado de una FV |

### Getters existentes (sin cambio necesario)

| Getter | Nota |
|--------|------|
| `getCobrosBySurgeryId` | Mantener para compatibilidad del Expediente, pero corregir internamente |

---

## Sección 5 — Funciones de Negocio

### Funciones existentes (a actualizar)

| Función | Archivo | Cambio |
|---------|---------|--------|
| `getSaldoPendiente(comprobante, cobros)` | facturacion.utils.ts | Cambiar firma para aceptar `ImputacionCobro[]` |
| `getEstadoFacturacionWithFV(...)` | facturacion.utils.ts | Actualizar para usar imputaciones |

### Funciones nuevas (propuestas)

| Función | Archivo | Propósito |
|---------|---------|-----------|
| `getImporteImputado(cobroId, imputaciones)` | cobros.utils.ts | Suma de imputaciones de un cobro |
| `getImporteNoImputado(cobro, imputaciones)` | cobros.utils.ts | Saldo del cobro sin imputar |
| `getEstadoCobro(cobro, imputaciones)` | cobros.utils.ts | Estado dinámico del cobro |
| `getVencimientoFV(comprobante)` | cobros.utils.ts | Calcula fecha de vencimiento |
| `estaVencida(comprobante)` | cobros.utils.ts | Determina si FV está vencida |
| `clasificarAntiguedad(comprobante)` | cobros.utils.ts | Vigente / Por vencer / Vencida |
| `validarImputacion(imputacion, cobro, fv, imputaciones)` | cobros.utils.ts | Validaciones de imputación |
| `getFacturasAbiertasByCliente(clienteId, comprobantes, imputaciones)` | cobros.utils.ts | FV con saldo del cliente |
| `distribuirImporteEquitativamente(importe, facturas)` | cobros.utils.ts | Sugerencia de distribución |
| `getResumenCobranzaCliente(clienteId, comprobantes, imputaciones)` | cobros.utils.ts | Resumen por cliente |

---

## Sección 6 — Flujo de Datos

### Registro de cobro desde Facturación (camino corto)

```
1. Usuario clic "Registrar cobro" en FV con saldo > 0
2. Abre CobroFormDialog con FV pre-seleccionada
3. Usuario completa: importe, medio, referencia, observaciones
4. Validación: importe > 0, medio obligatorio, importe ≤ saldo FV
5. Se crea Cobro (sin facturaId, sin surgeryId, sin saldo, sin state)
6. Se crea ImputacionCobro (cobroId → facturaId, importeImputado = importe)
7. Se recalcula saldo FV dinámicamente
8. Se recalcula estado de cobranza FV dinámicamente
9. Feedback: toast + actualización UI
```

### Registro de cobro desde módulo Cobros (camino completo)

```
1. Usuario clic "Nuevo Cobro"
2. Paso 1: Completa fecha, cliente, importe, medio, referencia, observaciones
3. Paso 2: Se muestran FV abiertas del cliente
4. Usuario distribuye importe entre FV (inputs por fila)
5. Validaciones:
   - suma imputaciones ≤ importe cobro
   - imputación por FV ≤ saldo FV
6. Se crea Cobro + N ImputacionCobro
7. Se recalculan saldos y estados
8. Feedback: toast + actualización UI
```

---

## Sección 7 — Relaciones con Otros Módulos

### 7.1 Facturación (relación primaria)

| Interacción | Detalle |
|-------------|---------|
| Cobros lee | FV emitidas (Comprobante type="FV") |
| Cobros escribe | ImputacionCobro vinculando cobros a FV |
| Facturación lee | Imputaciones para calcular saldo y estado de cobranza |
| Facturación muestra | Saldo pendiente, total cobrado, estado de cobranza en tabs |

### 7.2 Cirugías / Expediente (relación secundaria)

| Interacción | Detalle |
|-------------|---------|
| Expediente lee | Cobros e imputaciones de FV asociadas a cirugías |
| Expediente muestra | Total cobrado, saldo pendiente, estado de cobranza |
| No escribir | Expediente no crea ni modifica cobros |

### 7.3 NC/ND (relación futura)

| Interacción | Detalle |
|-------------|---------|
| NC reduce saldo | Una NC aplicada reduce el total de la FV (V2) |
| ND incrementa saldo | Una ND aplicada incrementa el total de la FV (V2) |
| Impacto en cobros | NC/ND modifican el saldo pendiente y por ende el estado de cobranza (V2) |

### 7.4 Contabilidad (relación futura)

| Dato | Uso contable |
|------|-------------|
| Cobro.fecha | Fecha de asiento |
| Cobro.medioCobro | Cuenta de contrapartida (banco/caja) |
| Cobro.importe | Monto del asiento |
| ImputacionCobro | Detalle de aplicación |
| Cobro.referencia | Conciliación bancaria |

### 7.5 Clientes (relación futura)

| Dato | Uso |
|------|-----|
| cliente.condicionPago | Plazo de vencimiento por cliente |
| cliente.cuit | Referencia fiscal |
| cliente.cuentaContable | Cuenta deudor |

---

## Sección 8 — Gaps y Problemas Conocidos

### Críticos

| ID | Problema | Resolución |
|----|----------|-----------|
| CC-01 | `Cobro.saldo` denormalizado | DCob-011: eliminar campo, calcular dinámicamente |
| CC-02 | Imputación 1:1 | DCob-003: agregar ImputacionCobro |
| CC-03 | CobroState confuso | DCob-009: nuevo EstadoCobro |
| CC-09 | getSaldoPendiente filtra por surgeryId | DCob-012: corregir a facturaId |
| CC-11 | Sin validación de imputación | Agregar en cobros.utils.ts |

### Altos

| ID | Problema | Resolución |
|----|----------|-----------|
| CC-04 | Lógica de cobro duplicada | Crear CobroFormDialog reutilizable |
| CC-05 | medioCobro sin tipar | Crear MedioCobro union type |
| CC-10 | Sin vencimiento real | DCob-008: calcular según condición de pago configurada; fallback plazo configurable |

### Medios

| ID | Problema | Resolución |
|----|----------|-----------|
| CC-06 | Sin vista de detalle | Crear CobroDetailDialog |
| CC-07 | Sin anulación | DCob-010: V2 |
| CC-08 | Sin historial por FV | Agregar en vista de detalle |
| CC-12 | toCollect estático en mock | Ya documentado como DF-Fact-09 |

---

## Sección 9 — Decisiones Cerradas

| ID | Decisión |
|----|----------|
| DCob-001 | Cobro como entidad separada de la factura |
| DCob-002 | Una factura puede recibir múltiples cobros |
| DCob-003 | Un cobro puede imputarse a varias facturas |
| DCob-004 | Registro desde FV y desde módulo Cobros |
| DCob-005 | Cobros parciales permitidos |
| DCob-006 | Saldo no imputado permitido en V1 |
| DCob-007 | Medios de cobro: Transferencia, Cheque, Efectivo, Depósito, Otro |
| DCob-008 | Vencimiento: según condición de pago configurada; fallback: fechaEmision + plazo default (30 días) si no existe |
| DCob-009 | Estados de cobro: registrado / parcialmente_imputado / imputado_completo |
| DCob-010 | Anulación de cobro: No en V1 |
| DCob-011 | Eliminar Cobro.saldo — saldo dinámico |
| DCob-012 | Filtro por facturaId, no por surgeryId |

---

## Sección 10 — Mock Data Actual

4 cobros existentes en `mock-cobros.ts`:

| ID | Cliente | FV | Cirugía | Importe | Saldo actual | Estado |
|----|---------|----|---------|---------|-------------|--------|
| COB-0001 | PAMI | FV-2026-0045 | CX-0005 | $2.330.000 | 0 | Cobrado |
| COB-0002 | Galeno | FV-2026-0089 | CX-0003 | $625.000 | 625.000 | Parcial |
| COB-0003 | Galeno | FV-2026-0089 | CX-0003 | $625.000 | 0 | Cobrado |
| COB-0004 | OSDE Binario | FV-2026-0091 | CX-0001 | $4.120.000 | 4.120.000 | Pendiente |

### Mock data a agregar

- Imputaciones correspondientes a cada cobro
- Cobro multi-factura (ej: pago de PAMI cubriendo 2 FV)
- Cobro con saldo no imputado
- FV con vencimiento explícito para testing de tab "Vencidas"

---

## Sección 11 — Prioridad de Mejoras

| # | Mejora | Prioridad | Complejidad | Dependencias |
|---|--------|-----------|-------------|-------------|
| 1 | Nuevos tipos (MedioCobro, EstadoCobro, ImputacionCobro) | CRÍTICA | Baja | Ninguna |
| 2 | cobros.utils.ts | CRÍTICA | Media | Tipos nuevos |
| 3 | cobros.constants.ts | ALTA | Baja | Tipos nuevos |
| 4 | Store: imputaciones + acciones nuevas | CRÍTICA | Media | Tipos nuevos |
| 5 | CobroFormDialog | ALTA | Media | Utils + Store |
| 6 | Reescribir cobros/page.tsx con tabs | ALTA | Alta | Utils + Components |
| 7 | Reemplazar inline cobro en facturacion/page.tsx | ALTA | Baja | CobroFormDialog |
| 8 | Corregir getSaldoPendiente (facturaId) | CRÍTICA | Baja | Store |
| 9 | Mock data migration | ALTA | Media | Store nuevos tipos |
| 10 | Cálculo de vencimiento | MEDIA | Baja | Utils |
| 11 | CobroDetailDialog | MEDIA | Media | Utils |
| 12 | ImputacionDistribuidor | MEDIA | Media | Utils |

---

## Sección 12 — Interfaz con Facturación

### Cómo Facturación consume datos de Cobros

La interfaz de comunicación es `ImputacionCobro[]`. Facturación necesita:

1. **Lista de imputaciones por FV**: Para calcular `saldoPendiente = amount - sum(imputaciones)`
2. **Lista de cobros por FV**: Para mostrar en detalle (vía join cobroId → Cobro)
3. **Estado de cobranza**: Calculado por `getEstadoFacturacionWithFV()` que ya existe

### Contrato entre módulos

```typescript
// Facturación provee:
interface FVParaCobro {
  number: string          // ID de la FV
  amount: number          // Total de la FV
  client: string          // Cliente/financiador
  date: string            // Fecha de emisión
  expiry?: string         // Fecha de vencimiento
}

// Cobros provee:
interface CobroParaFacturacion {
  saldoPendiente: number          // Calculado dinámicamente
  totalCobrado: number           // Suma de imputaciones
  estadoCobranza: EstadoFacturacion  // Sin cobrar / Parcial / Cobrada / Vencida
  cobros: CobroConImputacion[]   // Lista de cobros aplicados
}
```

---

## Sección 13 — Notas de Implementación

### Migración del modelo Cobro existente

El tipo `Cobro` actual tiene campos que se eliminan (`saldo`, `state`, `facturaId`, `surgeryId`). Para mantener compatibilidad durante la transición:

1. Crear `CobroV2` como nuevo tipo
2. Migrar `mock-cobros.ts` al nuevo formato
3. Actualizar store para usar `CobroV2` y `ImputacionCobro`
4. Actualizar componentes que consumen `Cobro` (Expediente, ComprobantesAsociados)
5. Eliminar tipo `CobroState` obsoleto

### Store — nueva entidad imputaciones

```typescript
// Nuevo estado:
imputaciones: ImputacionCobro[]

// Inicializar desde mock:
imputaciones: mockImputaciones,
```

### Compatibilidad con Expediente

Los componentes de Expediente usan `cobros` directamente:
- `ResumenExpediente`: Muestra lista de cobros → necesita adaptar para usar imputaciones
- `ExpedienteHeader`: Badge "Cobro: $X" → calcular desde imputaciones
- `ComprobantesAsociados`: Tabla de cobros → necesita adaptar

En V1, mantener `getCobrosBySurgeryId` funcionando (quizás con adapter interno) para no romper Expediente mientras se migra gradualmente.
