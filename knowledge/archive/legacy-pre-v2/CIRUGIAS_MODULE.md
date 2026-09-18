# CIRUGIAS_MODULE.md — Conocimiento Oficial del Modulo Cirugias

> **Version**: 1.2 · **Creado**: 2026-05-13 · **Actualizado**: 2026-05-13 · **Tarea**: CHATZAI-002 → CHATZAI-003 → Corrección DF-002/DF-004
> **Responsable**: CHATZAI (Frontend Lead)
> **Regla**: Este documento es la fuente canonica de conocimiento funcional del modulo Cirugias. Cualquier agente que trabaje en Cirugias DEBE leer este archivo primero.

---

## 1. Definicion Funcional

Cirugias es el modulo central y nuclear de OSSUM COR. Representa un caso quirurgico programado o en curso que requiere gestion integral desde su registro inicial hasta su cierre financiero. Es el eje alrededor del cual giran presupuestos, remitos, consumos, documentacion, logistica, facturacion y cobros.

### Problema que resuelve
- Falta de visibilidad operativa sobre el estado de cada caso
- Perdida de informacion en la cadena (paciente, OS, vendedor, coordinador)
- Dificultad para tomar decisiones sin vista consolidada
- Desconexion entre etapas del circuito (PR -> Consumo -> FV -> CO)

### Perfiles de usuario
| Perfil | Uso principal | Necesidad clave |
|--------|--------------|----------------|
| Coordinador de CX | Seguimiento diario, transiciones de estado | Ver estado, filtrar por coordinador, actuar |
| Administrativo / Ventas | Carga de cirugias y presupuestos | Registrar casos, cargar PR |
| Logistica / Instrumentador | Preparacion de cajas, envio | Ver cirugias en preparacion |
| Gerencia | Vision general, metricas | Tableros, alertas |
| Facturacion / Cobros | Generacion de FV, cobros | Ver cirugias autorizadas para facturar |

---

## 2. Arquitectura del Modulo

### Estructura de archivos
```
src/
├── app/cirugias/page.tsx                    # Pagina orquestadora (260 lineas)
├── components/cirugias/
│   ├── CirugiasToolbar.tsx                  # Barra con filtros rapidos (318 lineas)
│   ├── CirugiasTable.tsx                    # Tabla con scroll + sticky (253 lineas)
│   ├── CirugiaRow.tsx                       # Fila de la tabla (220 lineas)
│   ├── CirugiaActionsCell.tsx               # Acciones por fila (132 lineas)
│   ├── CirugiasAdvancedFilters.tsx          # Filtros secundarios (162 lineas)
│   ├── CirugiaOperationalBadges.tsx         # Badges doc/consumo/fact (68 lineas)
│   ├── ColumnVisibilityMenu.tsx             # Selector de columnas (67 lineas)
│   ├── ResumenRapido.tsx                    # LEGACY - no renderizado (60 lineas)
│   ├── CirugiaPreparationCell.tsx           # Celda preparacion (30 lineas)
│   ├── CirugiaStatusCell.tsx                # Celda estado (18 lineas)
│   ├── CirugiasSearch.tsx                   # Input de busqueda (20 lineas)
│   ├── ActiveFilterChips.tsx                # Chips de filtros activos (39 lineas)
│   └── dialogs/                             # 7 dialogos de acciones
├── components/expediente/                   # 21 componentes del expediente
├── hooks/
│   ├── useCirugiaActions.ts                 # CRUD y transiciones (272 lineas)
│   ├── useCirugiasFilters.ts                # Estado de filtros (206 lineas)
│   ├── useCirugiaSelection.ts               # Seleccion de filas (84 lineas)
│   ├── useColumnVisibility.ts               # Columnas visibles + sticky (59 lineas)
│   ├── useCirugiasSorting.ts                # Ordenamiento (39 lineas)
│   └── useExpedientePreview.ts              # LEGACY (28 lineas)
└── lib/
    ├── cirugias.constants.ts                # Estados, colores, columnas (206 lineas)
    ├── cirugias.types.ts                    # Sub-tipos (129 lineas)
    ├── cirugias.utils.ts                    # Utilidades (119 lineas)
    ├── businessRules.ts                     # Reglas de negocio (54 lineas)
    ├── shared-constants.ts                  # Constantes transversales (CHATZAI-001)
    └── statusHelpers.ts                     # Helpers de estado
```

### PanelState
```typescript
type PanelState = "list" | "expanded"
// "list": se muestra la tabla con filtros
// "expanded": se muestra ExpedienteFullView (reemplaza la tabla)
```

### Ciclo de vida de una cirugia
```
Sin autorizar → Pendiente → Autorizada → En preparacion → En transito → Realizada → Finalizada
     │                │           │
     └→ Sin fecha     │           └→ (puede ir a Suspendida o Cancelada)
                      │
                      └→ Suspendida / Cancelada (puede Recuperar)
```

---

## 3. Datos del Modulo

### Tipo Surgery (campos principales)
```typescript
interface Surgery {
  id: string                    // "CX-XXXX"
  patient: string               // Paciente
  patientDni: string            // DNI
  surgeon: string               // Medico
  institution: string           // Hospital/Sanatorio
  institutionCity: string       // Ciudad
  procedure: string             // Procedimiento
  date: string                  // Fecha CX
  time: string                  // Hora CX
  probableDate?: string         // Fecha probable
  state: SurgeryState           // Estado operativo
  boxId?: string                // Caja asignada
  remitoId?: string             // Remito asociado
  presupuestoId?: string        // Ultimo PR creado (limitacion: solo guarda 1)
  notes?: string                // Notas
  client: string                // Cliente/OS
  obraSocial?: string           // Obra social
  financiador?: string          // Financiador
  classification: SurgeryClassification  // Clasificacion
  expedienteNumber?: string     // Numero de expediente
  altaExpediente?: string       // Alta expediente
  preparationState: PreparationState  // Estado de preparacion
  facturado: boolean            // Ya facturada?
  autorizado: boolean           // Ya autorizada?
  fechaAutorizacion?: string    // Fecha autorizacion
  usuarioAutorizacion?: string  // Quien autorizo
  fechaFactura?: string         // Fecha factura
  facturaNumber?: string        // Numero factura
  instrumentador?: string       // Instrumentador asignado
  vendedor?: string             // Vendedor asignado
  coordinadorCx?: string        // Coordinador de CX
  // ... mas campos
}
```

### SurgeryState (11 estados)
```
Sin autorizar | Sin fecha | Pendiente | Autorizada | En preparacion |
En transito | Realizada | Finalizada | Suspendida | Cancelada | Sin consumo
```

### SurgeryClassification (9 tipos)
```
Reemplazo total de rodilla | Protesis de cadera | Osteosintesis |
Artroscopia | Columna | Tobillo | Hombro | Descartable | Otro
```

---

## 4. Acciones Disponibles

| Accion | Handler | Store action | Condicion |
|--------|---------|-------------|-----------|
| Crear cirugia | `handleNewSurgery()` | `addSurgery()` | — |
| Cambiar estado | `handleChangeState()` | `changeSurgeryState()` | — |
| Cambiar fecha | `handleChangeDate()` | `updateSurgery()` | — |
| Suspender | `handleSuspend()` | `suspendSurgery()` | — |
| Cancelar | `handleCancel()` | `cancelSurgery()` | — |
| Recuperar | `handleRecover()` | `recoverSurgery()` | Estado Suspendida/Cancelada |
| Crear presupuesto | `handleCreatePresupuesto()` | `createBudgetForSurgery()` | — |
| Agregar nota | `handleAddNote()` | `addNote()` | — |
| Facturar | `handleFacturar()` | `addComprobante()` | `canAutorizarFV()` |
| Autorizar | `handleAutorizar()` | `updateSurgery()` | — |

---

## 5. Reglas de Negocio

1. El flujo operativo se dispara al AUTORIZAR PR/CX, no al crearlo
2. NO se crea remito desde el wizard — se crea separado tras autorizacion
3. NO se crea factura desde el wizard — se crea tras consumo + documentacion
4. NO se mezcla PR con remision/facturacion dentro de presupuesto
5. La cirugia se crea con estado "Sin autorizar"
6. El coordinador no es obligatorio al crear (DO-002)
7. Las columnas fijas son opcionales, no default (DO-001)
8. Color fuerte solo para Estado CX (DO-005)
9. No KPIs en Cirugias (DO-004)
10. Preview lateral eliminado (DO-003)

---

## 6. Filtros Disponibles

**Rapidos (6 botones)**: Estado CX, Preparacion, Documentacion, Facturacion, Coordinador CX, Fecha
**Secundarios (popover)**: Medico, Institucion, Cliente/OS, Clasificacion, PR/Exp/NR/FV, Buscar tambien en

---

## 7. Expediente (13 tabs)

Resumen | Cirugia | Presupuesto | Remitos | Consumo | Comprobantes | Documentacion | Logistica | Mat. Transito | Instrumentador | Notas | Historial | Trazabilidad

---

## 8. Decisiones Operativas Registradas

- DO-001: Columnas fijas opcionales
- DO-002: Coordinadores (Nelson, Ezequiel, Sin asignar)
- DO-003: Preview lateral eliminado
- DO-004: No KPIs
- DO-005: Color fuerte solo Estado CX
- DO-007: Columnas fijas correctas (Paciente, Cliente/OS, CX ID, Estado CX)

---

## 9. Relacion con Presupuestos — Decisiones Cerradas (CHATZAI-003)

Las decisiones funcionales DF-001 a DF-007 que afectan la relacion Cirugias-Presupuestos fueron cerradas en CHATZAI-003. Las mas relevantes para Cirugias:

- **DF-001**: Se creara un componente `PresupuestoFormDialog` unico que se usara desde la tabla de Cirugias, el Wizard y el Expediente (reemplaza `PresupuestoDialog.tsx`).
- **DF-002 (corregida)**: Se permite presupuestos independientes (desde Ventas/Presupuestos, sin cirugia asociada) Y presupuestos asociados a cirugia (desde Cirugias/Expediente/Wizard). `Presupuesto.surgeryId` es opcional. El componente `PresupuestoFormDialog` soporta dos contextos: `surgery` (surgeryId obligatorio) e `independent` (surgeryId opcional).
- **DF-003**: Los presupuestos tendran versionado explicito (version, versionStatus, parentPresupuestoId).
- **DF-004 (corregida)**: `surgery.presupuestoId` se mantiene como campo unico (apunta al vigente), pero la fuente de verdad para obtener todos los presupuestos de una cirugia es `getPresupuestosBySurgeryId()`. `Presupuesto.surgeryId` es opcional, permitiendo presupuestos comerciales independientes.
- **DF-005**: Vigencia y lista de precios seran obligatorios al crear PR desde cualquier punto, incluyendo desde Cirugias.

Ver `PRESUPUESTOS_DECISIONES_FUNCIONALES.md` para detalle completo.

---

## 10. Carencias Detectadas (CHATZAI-002)

- No se muestra demora real de autorizacion (hardcodeado 3.2 dias)
- No se muestran dias en estado actual
- No se muestra monto presupuestado en la tabla
- No hay proxima accion requerida automatica
- No hay impresion / exportacion
- No hay acciones masivas
- No hay vistas guardadas
- No hay notificaciones
