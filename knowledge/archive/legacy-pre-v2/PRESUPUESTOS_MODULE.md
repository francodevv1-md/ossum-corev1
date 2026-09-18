# PRESUPUESTOS_MODULE.md — Conocimiento Oficial del Modulo Presupuestos

> **Version**: 1.2 · **Creado**: 2026-05-13 · **Actualizado**: 2026-05-13 · **Tarea**: CHATZAI-002 → CHATZAI-003 → Corrección DF-002/DF-004
> **Responsable**: CHATZAI (Frontend Lead)
> **Regla**: Este documento es la fuente canonica de conocimiento funcional del modulo Presupuestos. Cualquier agente que trabaje en Presupuestos DEBE leer este archivo primero.

---

## 1. Definicion Funcional

El modulo Presupuestos gestiona los presupuestos (PR) de ventas. Un presupuesto registra los articulos, precios y condiciones comerciales de un caso quirurgico o de una cotizacion comercial independiente, y es el documento que se envia al cliente/obra social para su aprobacion antes de proceder con la logistica y la cirugia.

**Modelo dual (DF-002 corregido)**:
1. **Presupuesto comercial independiente**: Se crea desde Ventas/Presupuestos sin cirugia asociada. Permite cotizar a un cliente fuera del flujo quirurgico.
2. **Presupuesto quirurgico asociado a cirugia**: Se crea desde Cirugias, Expediente o Wizard, vinculado al caso quirurgico.

### Posicion en el circuito
```
Cirugia → PRESUPUESTO → Consumo → Facturacion → Cobro
                ↑
         (este modulo)
```

El presupuesto es el **puente entre lo comercial y lo operativo**: aprueba el presupuesto -> se genera pedido -> se prepara logistica -> se envia material -> se realiza la cirugia -> se consume material -> se factura -> se cobra.

### Perfiles de usuario
| Perfil | Uso principal | Necesidad clave |
|--------|--------------|----------------|
| Vendedor | Crear, enviar y dar seguimiento a presupuestos | Crear PR, ver estado, reenviar |
| Administrativo | Aprobacion interna, seguimiento comercial | Ver pendientes, aprobar, bloquear |
| Coordinador | Verificar items vs disponibilidad de stock | Ver items, verificar Art. Z |
| Facturacion | Control presupuestado vs facturado | Ver delta, generar pedido |
| Gerencia | Metricas de conversion, montos | Tasa de aprobacion, montos por periodo |

---

## 2. Arquitectura del Modulo

### Estructura de archivos
```
src/
├── app/ventas/presupuestos/page.tsx              # Pagina monolito (813 lineas)
├── components/cirugias/dialogs/PresupuestoDialog.tsx  # Dialogo basico (44 lineas)
├── components/expediente/PresupuestoPanel.tsx    # Tab en expediente (465 lineas)
├── data/mock-presupuestos.ts                     # 5 presupuestos mock (108 lineas)
├── lib/store.ts                                  # Acciones de presupuesto
└── types/index.ts                                # Tipos Presupuesto, PresupuestoItem, PresupuestoState
```

### Puntos de entrada (PROBLEMA: estan desconectados)
1. **Wizard Nueva Cirugia** (paso 3): crea PR junto con la cirugia
2. **Tabla de Cirugias**: boton "PR" / "Crear PR" abre PresupuestoDialog
3. **Tab Presupuesto del expediente**: boton "Generar PR" / "Nuevo PR"
4. **Ventas > Presupuestos**: pagina independiente con su propio dialogo

### Estados del presupuesto
```typescript
type PresupuestoState = "Borrador" | "Enviado" | "Aprobado" | "Rechazado"

// Flujo:
Borrador → Enviado → Aprobado
                  └→ Rechazado
```

| Estado | Significado | Acciones disponibles |
|--------|------------|---------------------|
| Borrador | En edicion | Editar items, Enviar |
| Enviado | Enviado al cliente | Aprobar, Rechazar |
| Aprobado | Cliente aprobo | Generar pedido, Autorizar CX |
| Rechazado | Cliente rechazo | (Sin acciones hoy — DEUDA) |

### Campo adicional: bloqueado
- `bloqueado: boolean` — impide acciones sobre el presupuesto
- Independiente del estado
- **BUG**: `bloquearPresupuesto()` en store siempre setea `true`, nunca togglea a `false`

---

## 3. Datos del Modulo

### Tipo Presupuesto
```typescript
interface Presupuesto {
  id: string                    // "PR-XXXX"
  surgeryId?: string            // Cirugia asociada (OPCIONAL — DF-002 corregido). Obligatorio si contexto=Cirugia, opcional si contexto=Ventas.
  patient: string               // Paciente (de cirugia)
  institution: string           // Institucion (de cirugia)
  client: string                // Cliente/OS (de cirugia)
  obraSocial?: string           // Obra social
  financiador?: string          // Financiador
  items: PresupuestoItem[]      // Articulos del presupuesto
  total: number                 // Monto total
  state: PresupuestoState       // Estado
  createdAt: string             // Fecha creacion
  approvedAt?: string           // Fecha aprobacion
  vigencia?: string             // Validez (15/30/60/90 dias)
  listaPrecios?: string         // Lista de precios aplicada
  observaciones?: string        // Notas
  vendedor?: string             // Vendedor
  bloqueado: boolean            // Bloqueado?
}
```

### Tipo PresupuestoItem
```typescript
interface PresupuestoItem {
  stockItemId: string           // ID del articulo en stock
  name: string                  // Nombre
  code: string                  // Codigo
  quantity: number              // Cantidad
  unitPrice: number             // Precio unitario
  subtotal: number              // Cantidad * Precio unitario
  isArticuloZ?: boolean         // Articulo flexible?
  descripcionLibre?: string     // Descripcion libre (si Art. Z)
}
```

### Articulo Z
Un "Articulo Z" es un articulo flexible cuyo consumo real puede variar al momento de la cirugia. Se presupuesta como placeholder y se reemplaza por el articulo real consumido. Los articulos Z son criticos porque:
- Introducen incertidumbre en el monto final
- Pueden generar diferencias entre lo presupuestado y lo facturado
- Necesitan seguimiento especial en la comparativa PR vs Consumo

---

## 4. Store Actions

| Accion | Firma | Efecto |
|--------|-------|--------|
| `createBudgetForSurgery()` | `(surgeryId, data) => Presupuesto` | Crea PR, actualiza `surgery.presupuestoId`, registra audit |
| `authorizeBudget()` | `(presupuestoId) => void` | Cambia estado a "Aprobado", setea `approvedAt`, registra audit |
| `enviarPresupuesto()` | `(presupuestoId) => void` | Cambia estado a "Enviado", registra audit |
| `rechazarPresupuesto()` | `(presupuestoId) => void` | Cambia estado a "Rechazado", registra audit |
| `bloquearPresupuesto()` | `(presupuestoId) => void` | Setea `bloqueado: true` (BUG: no togglea) |
| `generateOrderFromBudget()` | `(presupuestoId) => Comprobante` | Genera PE (pedido), registra audit |

### Getters
| Getter | Firma | Retorna |
|--------|-------|---------|
| `getPresupuestosBySurgeryId()` | `(surgeryId) => Presupuesto[]` | Todos los PR de una cirugia |

---

## 5. Datos que se arrastran de Cirugia a Presupuesto

| Dato Cirugia | Dato Presupuesto | Auto-completado? |
|-------------|-----------------|-----------------|
| `patient` | `patient` | Si |
| `institution` | `institution` | Si |
| `client` | `client` | Si |
| `obraSocial` | `obraSocial` | Si |
| `financiador` | `financiador` | Si |
| `vendedor` | `vendedor` | Si |

**Campos que NO se arrastran automaticamente** (deben completarse manualmente): vigencia, lista de precios, observaciones, items.

---

## 6. Relacion con Cirugias

```
Surgery (1) ←→ (N) Presupuesto
   surgery.presupuestoId?  →  ultimo PR creado (limitacion: solo 1)
   presupuesto.surgeryId?  →  cirugia asociada (OPCIONAL — DF-002 corregido)
```

Los presupuestos sin `surgeryId` son presupuestos comerciales independientes creados desde Ventas/Presupuestos.

### Navegacion entre modulos
- **Cirugias → Presupuesto**: Boton "PR" en tabla, tab "Presupuesto" en expediente
- **Presupuesto → Cirugias**: Boton "Abrir expediente" en Ventas/Presupuestos, "Autorizar CX" en PresupuestoPanel
- **Presupuesto → Pedido**: "Generar pedido" crea comprobante PE
- **Presupuesto → Logistica**: El PE dispara la preparacion y envio

---

## 7. Fricciones y Carencias Detectadas (CHATZAI-002)

### Criticas
| Friccion | Descripcion |
|----------|------------|
| **Dos dialogos de creacion** | PresupuestoDialog (Cirugias) y dialogo de Ventas tienen campos y comportamiento distinto |
| **Falta vigencia y lista de precios** | Campos obligatorios que no se piden al crear PR desde Cirugias |
| **No hay comparativa PR vs Consumo** | No existe forma de ver la diferencia entre lo presupuestado y lo consumido |

### Altas
| Friccion | Descripcion |
|----------|------------|
| **No hay versionado** | Si un PR se rechaza, no hay forma de crear version nueva |
| **Botones no funcionales** | En PresupuestoPanel: Abrir, Editar, Imprimir, Generar pedido, Autorizar CX |
| **Monolito Ventas/Presupuestos** | 813 lineas con toda la logica inline |

### Medias
| Friccion | Descripcion |
|----------|------------|
| **No hay impresion/exportacion** | No se puede imprimir ni exportar un presupuesto |
| **No hay busqueda desde stock** | Items se cargan manualmente sin catalogo |
| **Lista de precios hardcoded** | Constantes LP-* en vez de configuracion |

### Bug conocido
- `bloquearPresupuesto()` siempre setea `bloqueado: true`, no togglea a `false`

---

## 8. Decisiones Funcionales — CERRADAS (CHATZAI-003)

Las 7 decisiones funcionales pendientes fueron cerradas en CHATZAI-003. Registro canonico: `PRESUPUESTOS_DECISIONES_FUNCIONALES.md`.

| ID | Decision | Decisión tomada | Estado |
|----|----------|----------------|--------|
| DF-001 | Unificar dialogo de creacion | **Un componente reutilizable** (`PresupuestoFormDialog`) desde 4 puntos de entrada | CERRADA |
| DF-002 | PR independiente vs asociado a cirugia | **Modelo dual**: independientes desde Ventas + asociados desde Cirugias. `surgeryId` opcional. | CERRADA (corregida) |
| DF-003 | Versionado | **Versionado explicito** con version, versionStatus (vigente/aprobada/reemplazada), parentPresupuestoId | CERRADA |
| DF-004 | surgery.presupuestoId unico vs array | **Mantener unico + usar getter** `getPresupuestosBySurgeryId()`. `surgeryId` opcional en Presupuesto. | CERRADA (corregida) |
| DF-005 | Vigencia y lista de precios | **Obligatorios en todos los puntos de entrada** | CERRADA |
| DF-006 | Comparativa presupuestado vs consumido | **Lectura principal en Consumos**; Facturacion muestra resumen | CERRADA |
| DF-007 | Aprobacion interna | **Se distinguen interna y externa**; primera version simplifica UI, prepara tipos | CERRADA |

### Orden de implementacion sugerido

1. DF-005 — Campos obligatorios (cambio minimo, impacto alto)
2. DF-002 — Presupuesto dual (independiente y asociado) → dos modos en el formulario
3. DF-001 — Unificar dialogo de creacion (componente nuevo que respeta DF-002 y DF-005)
4. DF-004 — Relacion mediante getter (ya funciona, solo documentar uso correcto)
5. DF-003 — Versionado (cambio de tipo + store + UI de versiones)
6. DF-007 — Aprobacion interna (solo preparacion de tipos, sin UI)
7. DF-006 — Comparativa (se implementa cuando se trabaje Consumos)

### Brief de implementacion

La proxima tarea (CHATZAI-004) implementara DF-001, DF-002 y DF-005 mediante la creacion del componente `PresupuestoFormDialog`. El componente soporta dos contextos: `surgery` (surgeryId obligatorio) e `independent` (surgeryId opcional). Ver `PRESUPUESTO_FORM_DIALOG_IMPLEMENTATION_BRIEF.md` para el brief completo.

---

## 9. Mock Data

5 presupuestos mock para 8 cirugias. Cirugias sin PR: CX-0004, CX-0006, CX-0007.

| PR | Cirugia | Cliente | Estado | Monto |
|----|---------|---------|--------|-------|
| PR-0001 | CX-0001 | OSDE Binario | Aprobado | $4.120.000 |
| PR-0002 | CX-0002 | Swiss Medical | Enviado | $3.390.000 |
| PR-0003 | CX-0003 | Galeno | Aprobado | $1.250.000 |
| PR-0004 | CX-0008 | OSDE Binario | Aprobado | $220.000 |
| PR-0005 | CX-0005 | PAMI | Aprobado | $2.330.000 |

---

## 10. Mejora Prioritaria Recomendada

**Unificar el dialogo de creacion de presupuesto**: Crear un componente `PresupuestoFormDialog` unico que se use desde todos los puntos de entrada (wizard, tabla, expediente, ventas). Incluir campos obligatorios (vigencia, lista de precios) y eliminar la inconsistencia actual. Esto es prerequisito para cualquier mejora posterior.
