# knowledge/FACTURACION_MODULE.md
## Módulo Facturación — Documentación canónica de conocimiento
### Versión 1.2 — CHATZAI-009 (cierre funcional decisiones) — 2026-05-14
### v1.1: CHATZAI-008B (reconciliación) — 2026-05-14
### v1.0 original: CHATZAI-008 — 2026-05-13

---

## 1. Definición funcional

Facturación es el módulo responsable de la emisión de facturas de venta (FV) por los materiales y servicios provistos en el marco de cirugías. Es el punto de confluencia entre la operación (Cirugía → Presupuesto → Consumo) y la gestión financiera (Cobro). Facturación verifica que se cumplan las condiciones operativas y comerciales antes de emitir el comprobante, calcula el monto facturable según la fuente seleccionada, detecta y advierte sobre diferencias entre lo presupuestado y lo consumido, y gestiona el ciclo de vida de la factura hasta su cobro.

---

## 2. Arquitectura del módulo

### 2.1 Estructura de archivos

```
src/
├── app/ventas/
│   ├── facturacion/page.tsx           # Página principal (tabs: Pendientes/Autorizados/SinDoc/Listos/SinCobro)
│   ├── pendientes-facturar/page.tsx   # Vista dedicada de pendientes
│   ├── comprobantes/page.tsx          # Todos los comprobantes
│   ├── cobros/page.tsx                # Cobros contra FV
│   ├── notas-credito/page.tsx         # NC contra FV
│   └── notas-debito/page.tsx          # ND contra FV
│
├── components/
│   ├── cirugias/dialogs/
│   │   └── FacturarDialog.tsx         # Dialog para número de FV
│   ├── facturacion/                   # (NUEVO — por crear)
│   │   ├── FacturacionTabs.tsx        # Tabs de vistas del módulo
│   │   ├── DiferenciasPopup.tsx       # Popup de diferencias pre-facturar
│   │   ├── BaseFacturacionSelector.tsx # Selector Presupuesto/Consumo/Mixto
│   │   ├── ResumenEconomico.tsx       # Resumen económico por cirugía
│   │   └── FacturasSinCobroTable.tsx  # Tabla de facturas con saldo
│   └── expediente/
│       ├── ComprobantesAsociados.tsx  # Tabla de comprobantes por cirugía
│       ├── ResumenExpediente.tsx      # Resumen con facturación
│       └── Expediente*.tsx           # Preview/Header/StatusChips/Actions
│
├── lib/
│   ├── store.ts                       # authorizeInvoice, getFacturasBySurgeryId, etc.
│   ├── businessRules.ts               # canAutorizarFV
│   ├── cirugias.utils.ts              # getFacturacionStatus
│   ├── cirugias.constants.ts          # FACTURACION_OPTIONS, FACTURACION_COLORS
│   ├── facturacion.utils.ts           # (NUEVO) getConsumoValorizado, getDiferencias, getMontoFacturable
│   └── statusHelpers.ts               # comprobanteTypeLabels, getBadgeVariant
│
├── hooks/
│   ├── useCirugiaActions.ts           # canFacturar, handleFacturar
│   └── useCirugiasFilters.ts          # factFilters, facturacionStatus
│
├── types/
│   └── index.ts                       # Comprobante, Cobro, NotaCredito, NotaDebito, FacturaVentaData
│
└── data/
    ├── mock-comprobantes.ts           # 15 comprobantes (2 FV)
    ├── mock-cobros.ts                 # 4 cobros
    ├── mock-notas-credito.ts          # 3 NC
    └── mock-notas-debito.ts           # 2 ND
```

### 2.2 Puntos de acceso

| Punto | Ruta | Desde |
|-------|------|-------|
| Sidebar VENTAS → Facturación | `/ventas/facturacion` | Navegación principal |
| Sidebar VENTAS → Pend. Facturar | `/ventas/pendientes-facturar` | Navegación principal |
| Tabla Cirugías → Acción "Facturar" | Dialog | CirugiaActionsCell |
| Expediente → "Autorizar FV" | Dialog | ExpedientePreviewActions, ExpedienteHeader |
| Expediente → Tab Comprobantes | Tab panel | ComprobantesAsociados |

### 2.3 Estados internos de facturación

```
                    ┌─────────────────┐
                    │  Sin facturar   │
                    └────────┬────────┘
                             │ surgery.autorizado = true
                    ┌────────▼────────┐
                    │  Autorizado     │
                    │  para facturar  │
                    └────────┬────────┘
                             │ docStatus = "Apta para facturar"
                    ┌────────▼────────┐
                    │  Doc. apta      │
                    │  (falta consumo)│
                    └────────┬────────┘
                             │ consumoState = "Validado"
                    ┌────────▼────────┐
                    │  Listo para     │
                    │  facturar       │
                    └────────┬────────┘
                             │ authorizeInvoice()
                    ┌────────▼────────┐
                    │  Facturado      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼──────┐  ┌───▼──────────┐
    │Sin cobros  │  │Cobro parcial │  │Cobrada       │
    │(sin cobrar)│  │              │  │              │
    └────────────┘  └──────────────┘  └──────────────┘
              │              │
              └──────┬───────┘
                     │ expiry < today && saldo > 0
              ┌──────▼───────┐
              │  Vencida     │
              └──────────────┘
```

---

## 3. Modelo de datos

### 3.1 Comprobante FV (existente)

```typescript
interface Comprobante {
  id: string
  surgeryId: string
  type: "FV" | ...         // FV = Factura de Venta
  number: string           // FV-2026-XXXX
  date: string
  client: string
  expiry?: string
  amount: number           // Total a facturar (ACTUALMENTE HARDCODEADO EN 0)
  toCollect: number        // Saldo pendiente (ACTUALMENTE 0, NO SE ACTUALIZA)
  concept: string
  state: string            // "Emitida" | "Cobrado" | "Pendiente" | "Anulada"
}
```

### 3.2 Campos extendidos propuestos para FV

```typescript
interface FacturaVentaData {
  // Base de facturación
  baseFacturacion: "presupuesto" | "consumo" | "mixto"
  presupuestoBaseId: string           // ID del presupuesto usado como referencia
  totalPresupuestado: number          // total del presupuesto vigente al momento de facturar
  totalConsumidoValorizado: number    // Σ(consumed × unitPrice) del consumo validado
  deltaDetectado: number              // totalConsumidoValorizado - totalPresupuestado
  diferenciasAceptadas: number        // ajustes manuales aceptados en popup de diferencias
  totalAFacturar: number              // monto final facturado

  // Diferencias registradas
  diferencias?: DiferenciaFactura[]   // detalle de ítems con diferencia

  // Referencia fiscal (futuro)
  cae?: string
  caeVencimiento?: string
  qrBase64?: string
  pdfUrl?: string
  externalReference?: string
  fiscalEmitidaAt?: string
}
```

### 3.3 Diferencia detectada

```typescript
interface DiferenciaFactura {
  stockItemId: string
  name: string
  code: string
  cantPresupuestada: number
  cantConsumida: number
  precioUnitario: number
  diferencia: number               // cantConsumida - cantPresupuestada
  impactoMonetario: number         // diferencia × precioUnitario
  tipo: "cantidad" | "no_consumido" | "no_presupuestado" | "articulo_z" | "precio"
}
```

### 3.4 Tipos relacionados

```typescript
type CobroState = "Pendiente" | "Parcial" | "Cobrado"

interface Cobro {
  id: string
  facturaId: string        // número de FV
  surgeryId: string
  client: string
  importe: number
  saldo: number
  fecha: string
  medioCobro: string
  state: CobroState
  observaciones?: string
}

type NotaCreditoState = "Borrador" | "Emitida" | "Aplicada" | "Anulada"
type NotaDebitoState = "Borrador" | "Emitida" | "Aplicada" | "Anulada"
```

---

## 4. Acciones del store

### 4.1 Acciones existentes

| Acción | Firma | Notas |
|--------|-------|-------|
| `authorizeInvoice` | `(surgeryId, facturaNumber) => void` | **MONTO EN 0**. Debe recibir base de facturación y calcular monto. ✅ YA marca consumo como "Facturado" (CHATZAI-007). |
| `addComprobante` | `(data) => Comprobante` | Genérica, usada como workaround en página Facturación. |
| `createCobro` | `(data) => Cobro` | Crea cobro contra FV. No actualiza `toCollect` del comprobante. |
| `createNotaCredito` | `(data) => NotaCredito` | Crea NC contra FV. |
| `createNotaDebito` | `(data) => NotaDebito` | Crea ND contra FV. |

### 4.2 Acciones faltantes (propuestas)

| Acción | Firma | Propósito |
|--------|-------|-----------|
| `authorizeInvoiceV2` | `(surgeryId, facturaNumber, baseFacturacion, monto) => Comprobante` | Facturación con monto real y base seleccionada |
| `anularFactura` | `(comprobanteId) => void` | Anular FV emitida (revertir surgery.facturado) |
| `marcarConsumoFacturado` | `(surgeryId) => void` | Pasar consumo a estado "Facturado" al emitir FV | ✅ YA EXISTE como `markConsumoAsFacturado(consumoId)` en store.ts. Se invoca desde `authorizeInvoice` cuando `consumo.state === "Validado"`. |

### 4.3 Getters existentes

| Getter | Firma | Notas |
|--------|-------|-------|
| `getFacturasBySurgeryId` | `(surgeryId) => Comprobante[]` | Filtra comprobantes type="FV" |
| `getDocStatus` | `(surgeryId) => DocumentStatus` | Desde documentChecklists |
| `getCobrosBySurgeryId` | `(surgeryId) => Cobro[]` | Todos los cobros de la cirugía |
| `getNotasCreditoBySurgeryId` | `(surgeryId) => NotaCredito[]` | NC de la cirugía |
| `getNotasDebitoBySurgeryId` | `(surgeryId) => NotaDebito[]` | ND de la cirugía |

### 4.4 Getters faltantes (propuestos)

| Getter | Firma | Propósito |
|--------|-------|-----------|
| `getSaldoPendiente` | `(surgeryId) => number` | `amount - Σ(cobros.importe)` para FV de la cirugía |
| `getPresupuestoVigenteBySurgeryId` | `(surgeryId) => Presupuesto \| undefined` | Presupuesto vigente (versionStatus="vigente") de la cirugía |

---

## 5. Funciones de negocio

### 5.1 Existentes

| Función | Ubicación | Propósito |
|---------|-----------|-----------|
| `canAutorizarFV(surgery, docStatus, consumoState?)` | `businessRules.ts` | ✅ Verifica si se puede emitir FV (COMPLETA — CHATZAI-007, verificado CHATZAI-008B). Nota type-safety: `consumoState` es `string` en vez de `ConsumoState` union type. |
| `getFacturacionStatus(surgery, getDocStatus, getCobros)` | `cirugias.utils.ts` | Calcula estado de facturación (4 estados básicos) |
| `getFacturacionBadgeLabel(status)` | `cirugias.utils.ts` | Label para badge |

### 5.2 Propuestas (nuevas)

| Función | Propósito |
|---------|-----------|
| `getConsumoValorizado(consumo, presupuesto)` | Valoriza cada ítem consumido con precio del presupuesto. Ítems no presupuestados usan `stockItem.unitPrice`. |
| `getDiferenciasPresupuestoConsumo(presupuesto, consumo)` | Compara ítem a ítem, retorna `DiferenciaFactura[]` |
| `getMontoFacturable(surgery, presupuesto, consumo, base)` | Calcula monto total según base seleccionada |
| `getEstadoFacturacion(surgery, docStatus, consumoState, tienePresupuesto)` | Estado extendido (9 estados propuestos en blueprint) |
| `calcularSaldoPendiente(comprobante, cobros)` | `amount - Σ(cobros.importe)` |
| `estaVencida(comprobante, cobros)` | `comprobante.expiry < today && saldoPendiente > 0` |

---

## 6. Flujo de datos: de la autorización a la factura

```
1. Cirugía autorizada comercialmente
   → surgery.autorizado = true
   → Estado facturación: "Autorizado para facturar"

2. Documentación completa
   → docStatus = "Apta para facturar"
   → Si falta consumo: "Pendiente sin documentación" resuelto, pero falta consumo

3. Consumo validado (DC-005)
   → consumoState = "Validado"
   → Estado facturación: "Listo para facturar"

4. Cálculo del monto facturable
   → getConsumoValorizado(consumo, presupuesto) → totalConsumidoValorizado
   → getDiferenciasPresupuestoConsumo(presupuesto, consumo) → diferencias[]
   → Si delta ≠ 0: popup de diferencias
   → Usuario selecciona base: Presupuesto / Consumo / Mixto
   → getMontoFacturable() → totalAFacturar

5. Emisión de FV
   → authorizeInvoice(surgeryId, facturaNumber, baseFacturacion, totalAFacturar)
   → Comprobante FV creado con amount = totalAFacturar
   → surgery.facturado = true, state = "Finalizada"
   → consumo.state = "Facturado"
   → Estado facturación: "Facturado" → "Factura sin cobrar"

6. Registro de cobros
   → createCobro({facturaId, importe, medioCobro, ...})
   → Si totalCobros >= amount: "Factura cobrada"
   → Si 0 < totalCobros < amount: "Cobro parcial"
   → Si comprobante.expiry < today && saldo > 0: "Vencida"
```

---

## 7. Relaciones con otros módulos

| Módulo | Relación | Detalle |
|--------|----------|---------|
| **Cirugías** | Prerequisito | `surgery.autorizado` obligatorio. `surgery.facturado` se marca al emitir FV. Estado cambia a "Finalizada". |
| **Presupuestos** | Base económica | `presupuesto.total` como base de facturación. Snapshot del presupuesto vigente al facturar (DF-Fact-08). |
| **Consumos** | Prerequisito + base | `consumoState = "Validado"` obligatorio (DC-005). Consumo valorizado como base alternativa. Estado cambia a "Facturado". |
| **Documentación** | Prerequisito | `docStatus = "Apta para facturar"` obligatorio (DF-Fact-04). |
| **Cobros** | Post-facturación | Se registran contra FV emitidas. Determinan estado de cobro. |
| **NC/ND** | Ajustes | Notas de crédito/débito contra FV para corregir diferencias. |
| **Compras** | Independiente | `FacturaCompra` es modelo separado (facturas de proveedores). |
| **Stock** | Referencia de precios | Precio unitario para ítems consumidos no presupuestados. |
| **Futuro: TusFacturasAPP** | Emisión fiscal | FV interna → emisión fiscal con CAE, QR, PDF. |

---

## 8. Fracciones y carencias detectadas

### 8.1 Críticas

| ID | Carencia | Impacto | Solución propuesta |
|----|----------|---------|-------------------|
| FC-01 | `authorizeInvoice()` con monto hardcodeado en 0 | Facturas sin importe | Calcular monto según base seleccionada |
| FC-02 | ~~`canAutorizarFV()` no verifica consumoState~~ | ~~Se puede facturar sin consumo validado (viola DC-005)~~ | ✅ RESUELTO (CHATZAI-007, verificado CHATZAI-008B). `canAutorizarFV()` bloquea si `!consumoState || consumoState === "Pendiente"`. Falta type-safety: usar `ConsumoState` union type. |
| FC-03 | ~~`canFacturar()` no pasa consumoState~~ | ~~Bypass de DC-005 desde hook~~ | ✅ RESUELTO (CHATZAI-007, verificado CHATZAI-008B). `canFacturar()` pasa `consumo?.state`. Falta exponer `.reason` del `RuleResult`. |
| FC-04 | Sin cálculo de consumo valorizado | No se puede facturar según consumo real | Implementar `getConsumoValorizado()` |

### 8.2 Altas

| ID | Carencia | Impacto | Solución propuesta |
|----|----------|---------|-------------------|
| FC-05 | Sin detección de diferencias PR vs Consumo | Se factura a ciegas | Implementar `getDiferenciasPresupuestoConsumo()` |
| FC-06 | Sin selector de base de facturación | No se puede elegir fuente | Agregar selector en flujo de facturación |
| FC-07 | `toCollect` nunca se actualiza | Saldo incorrecto | Calcular dinámicamente o actualizar al crear cobro |
| FC-08 | Sin distinción "autorizado" vs "listo" | Confusión de estados | Ampliar `getFacturacionStatus()` |
| FC-09 | ~~Consumo no pasa a "Facturado" al emitir FV~~ | ~~Estado inconsistente~~ | ✅ RESUELTO (CHATZAI-007, verificado CHATZAI-008B). `authorizeInvoice()` invoca `markConsumoAsFacturado()` si `consumo.state === "Validado"`. |

### 8.3 Medias

| ID | Carencia | Impacto | Solución propuesta |
|----|----------|---------|-------------------|
| FC-10 | "Vencida" sin lógica | Opción sin implementación | Implementar comparación de fechas |
| FC-11 | Sin flujo de anulación de FV | No se puede revertir factura | Implementar `anularFactura()` |
| FC-12 | Sin vista "Autorizados para facturar" | Falta visibilidad | Agregar tab en Facturación |
| FC-13 | Sin vista "Pendientes sin documentación" | Falta visibilidad | Agregar tab en Facturación |
| FC-14 | Sin resumen económico en expediente | Falta información para decidir | Agregar sección con totales |
| FC-15 | Sin campos fiscales placeholder | Retraso en integración futura | Agregar `FacturaFiscalData` interface |

---

## 9. Decisiones funcionales cerradas

| Decisión | Estado | Definición |
|----------|--------|-----------|
| DC-005 | Cerrada (CHATZAI-006) | Consumo validado obligatorio para facturar. Se reafirma como DF-Fact-07. |
| DC-002 | Cerrada (CHATZAI-006) | Consumo se vincula a presupuesto vía `presupuestoVigenteId`. Complementado por DF-Fact-08. |

## 10. Decisiones funcionales propuestas (pendientes de cierre)

> **ACTUALIZACIÓN CHATZAI-009**: Las 10 decisiones DF-Fact-01 a DF-Fact-10 fueron cerradas canónicamente el 2026-05-14. Registro completo en `FACTURACION_DECISIONES_FUNCIONALES.md`. Brief de implementación en `FACTURACION_IMPLEMENTATION_BRIEF.md`.

| Decisión | Estado | Resumen |
|----------|--------|---------|
| DF-Fact-01 | ✅ Cerrada (CHATZAI-009) | Selector de base de facturación (Presupuesto/Consumo/Mixto) |
| DF-Fact-02 | ✅ Cerrada (CHATZAI-009) | Popup de diferencias obligatorio cuando delta ≠ 0 |
| DF-Fact-03 | ✅ Cerrada (CHATZAI-009) | No bloquear por diferencias en V1 (solo advertir) |
| DF-Fact-04 | ✅ Cerrada (CHATZAI-009) | Documentación completa obligatoria para "Listo para facturar" |
| DF-Fact-05 | ✅ Cerrada (CHATZAI-009) | La falta de documentación bloquea en V1 |
| DF-Fact-06 | ✅ Cerrada (CHATZAI-009) | Autorización comercial independiente del estado operativo |
| DF-Fact-07 | ✅ Cerrada (CHATZAI-009) | Consumo validado obligatorio (refuerza DC-005) |
| DF-Fact-08 | ✅ Cerrada (CHATZAI-009) | Snapshot del presupuesto vigente al facturar |
| DF-Fact-09 | ✅ Cerrada (CHATZAI-009) | `toCollect` se recalcula dinámicamente |
| DF-Fact-10 | ✅ Cerrada (CHATZAI-009) | Monto de factura desde fuente seleccionada (no hardcodeado) |

---

## 11. Datos mock

### 11.1 Comprobantes FV existentes

| ID | Número | Cirugía | Cliente | Monto | Estado |
|----|--------|---------|---------|-------|--------|
| COMP-0006 | FV-2026-0089 | CX-0003 | Galeno | $1.250.000 | Emitida |
| COMP-0009 | FV-2026-0045 | CX-0005 | PAMI | $2.330.000 | Cobrado |

### 11.2 Cobros existentes

| ID | Factura | Cirugía | Importe | Medio | Estado |
|----|---------|---------|---------|-------|--------|
| COB-0001 | FV-2026-0045 | CX-0005 | $2.330.000 | Transferencia | Cobrado |
| COB-0002 | FV-2026-0089 | CX-0003 | $625.000 | Transferencia | Parcial |
| COB-0003 | FV-2026-0089 | CX-0003 | $625.000 | Cheque | Cobrado |
| COB-0004 | FV-2026-0091 | CX-0001 | $4.120.000 | Transferencia | Pendiente |

### 11.3 NC existentes

| ID | Factura | Cirugía | Motivo | Importe | Estado |
|----|---------|---------|--------|---------|--------|
| NC-0001 | FV-2026-0089 | CX-0003 | Devolución tornillos | $190.000 | Emitida |
| NC-0002 | FV-2026-0045 | CX-0005 | Diferencia precio PAMI | $85.000 | Aplicada |
| NC-0003 | FV-2026-0090 | CX-0001 | Material no utilizado | $380.000 | Borrador |

### 11.4 ND existentes

| ID | Factura | Cirugía | Motivo | Importe | Estado |
|----|---------|---------|--------|---------|--------|
| ND-0001 | FV-2026-0045 | CX-0005 | Cargo instrumentador extra | $50.000 | Emitida |
| ND-0002 | FV-2026-0089 | CX-0003 | Implante adicional | $95.000 | Aplicada |

---

## 12. Prioridad de mejora recomendada

1. **Fix `authorizeInvoice()`** — monto hardcodeado en 0 (bloqueante)
2. ~~**Fix `canAutorizarFV()`** — verificar consumo validado~~ → ✅ RESUELTO (CHATZAI-007)
3. ~~**Fix `canFacturar()` hook** — pasar consumoState~~ → ✅ RESUELTO (CHATZAI-007)
4. **Mejorar type-safety `canAutorizarFV()`** — `string` → `ConsumoState`, verificación explícita (FT-01, FT-02)
5. **Exponer `.reason` en `canFacturar()`** — retornar `RuleResult` completo (FT-04)
6. **Implementar `getConsumoValorizado()`** — base para cálculo (alta)
7. **Implementar `getDiferenciasPresupuestoConsumo()`** — detección (alta)
8. **Popup de diferencias** — advertencia pre-facturar (alta)
9. **Selector de base** — Presupuesto/Consumo/Mixto (alta)
10. **Campos FV extendidos** — `baseFacturacion`, `totalPresupuestado`, etc. (alta)
11. **Reorganizar vistas** — Tabs en Facturación (media)
12. **Resumen económico en expediente** — visibilidad (media)

---

*Fin de knowledge/FACTURACION_MODULE.md v1.0*
