# Módulo Cirugías — Arquitectura y Documentación

## Paso 2 — Separación de Responsabilidades

El módulo Cirugías fue refactorizado de un componente monolítico a una arquitectura modular con responsabilidades claras.

### Estructura de Archivos

```
src/
├── app/cirugias/
│   └── page.tsx                    # Página orquestadora (slim)
├── components/cirugias/
│   ├── CirugiasToolbar.tsx         # Filtros rápidos + Más filtros + búsqueda
│   ├── CirugiasSearch.tsx          # Input de búsqueda
│   ├── CirugiasAdvancedFilters.tsx  # Más filtros (popover secundario)
│   ├── ActiveFilterChips.tsx       # Chips de filtros activos
│   ├── ResumenRapido.tsx           # Panel KPI colapsable
│   ├── CirugiasTable.tsx           # Grilla principal
│   ├── CirugiaRow.tsx              # Fila individual
│   ├── CirugiaStatusCell.tsx       # Celda de estado con color
│   ├── CirugiaPreparationCell.tsx  # Celda de preparación
│   ├── CirugiaOperationalBadges.tsx # Badges doc/consumo/fact
│   ├── CirugiaActionsCell.tsx      # Acciones contextuales
│   ├── ColumnVisibilityMenu.tsx    # Menú de visibilidad de columnas
│   └── dialogs/                    # Diálogos de acciones
├── components/expediente/
│   ├── ExpedientePreview.tsx       # Preview lateral mínimo
│   ├── ExpedientePreviewHeader.tsx # Header del preview
│   ├── ExpedientePreviewStatusChips.tsx
│   ├── ExpedientePreviewPending.tsx
│   ├── ExpedientePreviewSummary.tsx
│   ├── ExpedientePreviewActions.tsx
│   ├── ExpedienteFullView.tsx      # Vista completa del expediente
│   ├── ExpedienteHeader.tsx        # Header de la vista completa
│   ├── ResumenExpediente.tsx       # Tab Resumen
│   ├── FichaCirugia.tsx            # Tab Cirugía (editable)
│   ├── ComprobantesAsociados.tsx   # Tab Comprobantes (grilla)
│   ├── PresupuestoPanel.tsx        # Tab Presupuesto
│   ├── RemitosPanel.tsx            # Tab Remitos
│   ├── ConsumoPanel.tsx            # Tab Consumo
│   ├── DocumentacionPanel.tsx      # Tab Documentación
│   ├── LogisticaPanel.tsx          # Tab Logística
│   ├── MaterialTransitoPanel.tsx   # Tab Material en Tránsito
│   ├── InstrumentadorPanel.tsx     # Tab Instrumentador
│   ├── NotasPanel.tsx              # Tab Notas
│   ├── HistorialPanel.tsx          # Tab Historial
│   └── TrazabilidadPanel.tsx       # Tab Trazabilidad
├── hooks/
│   ├── useCirugiasFilters.ts       # Filtros + chips + clear
│   ├── useCirugiaSelection.ts      # Selección + panel state
│   ├── useColumnVisibility.ts      # Columnas visibles
│   ├── useExpedientePreview.ts     # Preview states
│   ├── useCirugiaActions.ts        # Acciones + diálogos
│   └── useCirugiasSorting.ts       # Ordenamiento
└── lib/
    ├── cirugias.constants.ts       # Estados, colores, columnas, tabs
    ├── cirugias.types.ts           # Tipos específicos
    ├── cirugias.utils.ts           # Funciones auxiliares
    ├── businessRules.ts            # Reglas de negocio
    ├── formatters.ts               # Formateo de datos
    └── statusHelpers.ts            # Helpers de estado
```

---

## Paso 3 — Redefinición del Expediente

### Qué se cambió

1. **El expediente dejó de ser un panel lateral sobrecargado** y pasó a funcionar como una vista completa, ordenada y potente del caso quirúrgico.

2. **El preview lateral quedó reducido al mínimo**: solo muestra ID, paciente, médico, institución, fecha, badges de estado, comprobante refs, pendiente principal, acciones rápidas y el botón "Expandir expediente". Ya no incluye tabs, checklist documental largo, historial extenso, cards de colores, formularios editables ni grilla de comprobantes.

3. **La vista completa del expediente** (`ExpedienteFullView`) se abre como vista amplia que reemplaza la grilla, con header propio y 13 tabs navegables. Incluye botones "Volver a Cirugías", "Vista dividida" y "Abrir en nueva pestaña".

### Por qué el preview quedó reducido

El preview lateral es un resumen rápido para identificar el caso y actuar. No debe intentar ser el expediente completo porque:
- El ancho de 350px no alcanza para mostrar grillas, formularios ni checklist cómodamente.
- Cargar tabs y datos extensos en un panel lateral genera scroll excesivo y competencia visual.
- El flujo correcto es: ver resumen → decidir si necesitas profundizar → expandir al expediente completo.

### Cómo funciona la vista completa de expediente

1. Desde la grilla, se selecciona una cirugía → se abre el preview lateral (compact).
2. Al hacer click en "Expandir expediente", el `panelState` cambia a `"expanded"`.
3. En estado expandido, la grilla se oculta y `ExpedienteFullView` ocupa todo el ancho disponible.
4. El header muestra ID, paciente, médico, institución, estados, comprobantes refs, pendiente principal y barra de acciones.
5. Los tabs permiten navegar entre las 13 secciones del expediente.
6. "Volver a Cirugías" cierra el expediente y vuelve a la grilla.
7. "Vista dividida" vuelve al modo grilla + preview lateral.

### Tabs creados

| Tab | Componente | Contenido |
|-----|-----------|-----------|
| Resumen | ResumenExpediente | Datos principales, estado operativo, pendiente, comprobantes principales, últimas novedades |
| Cirugía | FichaCirugia | Formulario editable con modo lectura/edición, todos los campos de la cirugía |
| Presupuesto | PresupuestoPanel | PR asociado, items, totales, estado, acciones (generar pedido, autorizar CX) |
| Remitos | RemitosPanel | NR de salida, devolución, items, estado logístico |
| Consumo | ConsumoPanel | Material consumido, devuelto, diferencias, faltantes, validación |
| Comprobantes | ComprobantesAsociados | Grilla fuerte con PR, PE, NR, FV, CO, NC, ND; filtros por tipo/estado; acciones por comprobante |
| Documentación | DocumentacionPanel | Checklist documental con progreso, toggle de items, observaciones |
| Logística | LogisticaPanel | Ida/vuelta, caja, preparación, timestamps |
| Mat. Tránsito | MaterialTransitoPanel | Artículos en tránsito, días fuera, alertas críticas |
| Instrumentador | InstrumentadorPanel | Asignado, liquidación, documentación, pago |
| Notas | NotasPanel | Notas con tipo/prioridad, filtros, agregar nota |
| Historial | HistorialPanel | Timeline de cambios con previous → new values |
| Trazabilidad | TrazabilidadPanel | Entradas/salidas, lotes, series, implantes, diferencias |

### Responsabilidad de cada componente

- **ExpedienteFullView**: Contenedor principal. Renderiza header + tabs + contenido. Coordina el estado de tab activo.
- **ExpedienteHeader**: Barra superior con datos clave del caso y acciones contextuales (editar ficha, generar PR, autorizar FV, suspender, cancelar, etc.).
- **ResumenExpediente**: Vista consolidada del caso con secciones neutras (datos principales, estado operativo, pendiente, comprobantes, novedades).
- **FichaCirugia**: Formulario completo con modo lectura y modo edición. Usa `store.updateSurgery()` para guardar cambios.
- **ComprobantesAsociados**: Grilla unificada que muestra PR, PE, NR, FV, CO, NC, ND con filtros, búsqueda, resumen de totales y acciones por comprobante.
- **PresupuestoPanel**: Detalle del presupuesto con items, totales, artículos Z, observaciones y acciones.
- **RemitosPanel**: Detalle de remitos con items enviados/devueltos/consumidos y estado logístico.
- **ConsumoPanel**: Items con cantidades, lotes, diferencias/validación y faltantes.
- **DocumentacionPanel**: Checklist interactivo con progreso y toggle de items via store.
- **LogisticaPanel**: Flujo ida/vuelta con caja y timestamps.
- **MaterialTransitoPanel**: Tabla con días fuera, alertas y distribución por depósito.
- **InstrumentadorPanel**: Asignación, liquidación, documentación y pago.
- **NotasPanel**: Listado filtrado con tipo/prioridad y acciones.
- **HistorialPanel**: Timeline de cambios de estado, fecha, autorizaciones.
- **TrazabilidadPanel**: Vista por artículo/lote/serie con diferencias.

### Cómo se organiza Comprobantes Asociados

Los comprobantes viven en una grilla unificada dentro del tab "Comprobantes". No están dispersos en mini cards sueltas. La grilla combina:
- Presupuestos (tipo PR)
- Comprobantes del store (PE, NR, FV, NC, ND)
- Cobros (tipo CO)

Permite filtrar por tipo, estado y buscar por texto. Muestra total importe y saldo pendiente. Cada fila tiene acciones contextuales (abrir, imprimir, descargar, modificar, anular, cobrar, etc.).

### Cómo se organiza FichaCirugia

La ficha tiene dos modos:
- **Lectura**: Muestra todos los campos en grupos (Identificación, Paciente, Médico/Institución, Programación, Gestión, Destino/Facturación, Observaciones).
- **Edición**: Convierte cada campo en input editable. Usa `store.updateSurgery()` para guardar. Botones "Guardar cambios" y "Cancelar".

### Homogeneidad visual

- Color fuerte solo para: Estado CX, Preparación, alertas críticas y estados de comprobantes.
- Datos informativos en cards neutras (border + bg-card).
- Comprobantes en grilla (no cards dispersas).
- Ficha de cirugía como formulario.
- Documentación como checklist con progreso.
- Historial como timeline.
- Trazabilidad como tabla.

### Qué queda pendiente para próximas iteraciones

- Conexión real con backend (actualmente usa mock data + Zustand localStorage).
- Formularios de edición para cada tab (remitos, consumo, presupuesto, etc.).
- Acciones funcionales en los menús de cada tab (imprimir, exportar PDF, etc.).
- Integración con mapa para logística.
- Adjuntar archivos reales en documentación.
- Pestaña "Abrir en nueva pestaña" funcional.
- Scroll interno en tabs con mucho contenido.
- Persistencia de preferencias de tabs.

### Cómo evitar volver a sobrecargar el preview lateral

1. El preview lateral SOLO debe mostrar: ID, paciente, médico+coordinador, institución, fecha, estados, pendiente y acciones rápidas.
2. NUNCA agregar tabs al preview lateral.
3. NUNCA mostrar grilla de comprobantes en el preview.
4. NUNCA mostrar formulario editable en el preview.
5. NUNCA mostrar comprobante refs (PR/NR/FV) en el preview compacto — van en el expediente completo.
6. NUNCA usar h-full o spacer que estiren el preview al alto del contenedor.
7. Si se necesita más información, usar "Expandir expediente".

---

## Paso 4 — Corrección de Fricciones Visuales y Funcionales

### Objetivo

Corregir las fricciones detectadas en la versión actual del módulo Cirugías sin rediseñar desde cero. Priorizar espacio útil para la grilla, compactar elementos superfluos y unificar criterios visuales.

### Cambios realizados

#### 1. Header superior compactado

- Se eliminó el header local redundante (`<h1>Cirugías</h1>` + subtítulo) que duplicaba el título ya mostrado en el header global (`Header.tsx`).
- El header global ya muestra "Cirugías" como título de página, por lo que el header local solo consumía espacio vertical sin aportar valor.
- Se ajustó el cálculo de altura del contenedor principal de `h-[calc(100vh-8rem)]` a `h-[calc(100vh-5rem)]` para recuperar espacio útil.
- Se redujo el padding del `<main>` en `layout.tsx` de `p-4 lg:p-6` a `p-3 lg:p-4`.

#### 2. Zona de filtros compactada

- Se eliminó "Resumen rápido" (KPI panel) de la vista principal por pedido explícito del usuario. El componente `ResumenRapido.tsx` se conserva en el código pero no se renderiza en la página.
- La barra de herramientas quedó en una sola línea: Buscador + Filtros avanzados + Columnas + Contador + Nueva Cirugía.
- Se redujo el padding del toolbar de `py-2` a `py-1`.
- Los filtros avanzados siguen en popover/desplegable.
- Los chips de filtros activos solo aparecen cuando hay filtros aplicados.

#### 3. Criterio visual de Estado CX y homogeneidad

- **Estado CX**: Se conserva el bloque de color fuerte (CX_STATE_CELL_COLORS) como la columna visual principal. Es la única columna con color de fondo intenso.
- **Preparación**: Se cambiaron los badges de color lleno a badges con fondo suave + borde (`bg-sky-50 text-sky-700 border-sky-200`, etc.). Solo los estados problemáticos ("Congelado con faltantes", "Devuelto") usan tonos cálidos.
- **Doc / Consumo / Fact**: Se reemplazaron los badges de color lleno por badges neutros con punto indicador (`NeutralBadge`). Los estados críticos (Incompleta, Vencida, Observada) tienen un punto rojo/naranja; los estados normales tienen punto verde. El texto es neutro (`text-muted-foreground` o `text-foreground`).
- **Regla general**: Color fuerte solo para Estado CX, alertas críticas y pendientes importantes. El resto es neutro y sobrio.

#### 4. Preview lateral compacto

- Se eliminó el `overflow-y-auto` del contenedor del preview. El preview ahora muestra solo información crítica sin scroll interno.
- Se redujo el padding general del preview (`px-4 py-3` → `px-3 py-2` en header, `py-2.5` → `py-2` en acciones).
- Se compactaron los botones de acción rápida (de `h-7` a `h-6`, texto más corto: "PR" en vez de "Ver PR", "NR" en vez de "Remitir NR").
- El botón "Más..." ahora es solo un ícono `MoreHorizontal` sin texto, abriendo un dropdown real.
- El botón "Expandir expediente" pasó de `h-9` a `h-8`.
- El preview no rompe la tabla: al cerrarse, la tabla recupera el 100% del ancho.

#### 5. Resolución de "Más..." y tabs ocultas

- En la **tabla** (acciones por fila): El botón "Más..." ya usaba `DropdownMenu`, no había problema.
- En el **preview lateral**: El botón "Más..." cambió de texto `Más...` a solo ícono `MoreHorizontal` dentro de un `DropdownMenu` con opciones claras: Autorizar FV, Agregar nota, Documentación, Trazabilidad, Abrir en nueva pestaña.
- En el **expediente expandido**: Se reemplazó el tab deshabilitado "Más..." por un botón `DropdownMenu` real que muestra las tabs de overflow (Logística, Mat. Tránsito, Instrumentador, Notas, Historial, Trazabilidad). Al seleccionar una tab del dropdown, se navega a ella. El botón "Más" se resalta visualmente si la tab activa está dentro del dropdown.
- Se agregaron flechas de scroll horizontal (`ChevronLeft` / `ChevronRight`) para las tabs primarias cuando hay overflow.

#### 6. Navegación del expediente expandido

- Se compactó el header del expediente: paddings reducidos (`py-2.5` → `py-1.5`), botones más compactos (`h-8` → `h-7`).
- El botón "Volver a Cirugías" funciona correctamente (vuelve al estado `"closed"`).
- El botón "Vista dividida" vuelve al estado `"compact"` (grilla + preview lateral).
- Se mantiene el contexto del caso seleccionado al navegar entre tabs.
- El contenido de cada tab tiene scroll vertical natural solo cuando el contenido lo requiere.
- Se eliminó la segunda línea de subtítulo ("Más acciones") del botón dropdown.

#### 7. Mejoras de la tabla

- Se redujo el padding de las celdas de `px-3 py-2` a `px-2.5 py-1.5`.
- Se redujo el padding de los headers de `px-3 py-2` a `px-2.5 py-1.5`.
- Se unificó el tamaño de texto en filas a `text-[11px]` (antes `text-xs`).
- Se redujo el `max-w` de columnas truncadas (paciente 140→130, médico 120→110, institución 130→120, cliente 120→110).
- Se compactó el header de la tabla (`bg-muted/40` más sutil, texto `text-[11px]`).

### Decisiones tomadas

1. **No agregar KPIs fijos arriba**: El usuario fue explícito — "No agregues nuevos KPIs", "No vuelvas a mostrar resumen rápido fijo arriba". Los KPIs quedaron disponibles para uso futuro pero no se muestran.
2. **Color fuerte solo donde importa**: Se priorizó la legibilidad operativa. Estado CX como referente visual principal, el resto neutral para no competir.
3. **Preview sin scroll**: El preview lateral es una consulta rápida, no el expediente completo. Si necesita scroll, es que tiene demasiada información.
4. **"Más..." siempre funcional**: Nunca dejar un botón "Más..." que no haga nada. Siempre debe abrir un menú desplegable con opciones accesibles.
5. **Tabs de overflow accesibles**: Las tabs que no caben en la barra se acceden mediante un dropdown "Más" que indica visualmente si hay una tab activa oculta.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/app/cirugias/page.tsx` | Header local eliminado, Resumen rápido eliminado, height calc ajustado |
| `src/app/layout.tsx` | Padding del main reducido |
| `src/components/cirugias/CirugiasToolbar.tsx` | Padding compactado |
| `src/components/cirugias/CirugiasTable.tsx` | Padding y estilos compactados |
| `src/components/cirugias/CirugiaRow.tsx` | Padding, font-size y max-w ajustados |
| `src/components/cirugias/CirugiaPreparationCell.tsx` | Badges suaves con borde en vez de color lleno |
| `src/components/cirugias/CirugiaOperationalBadges.tsx` | NeutralBadge con punto indicador en vez de color lleno |
| `src/components/expediente/ExpedientePreview.tsx` | Sin scroll, más compacto, acciones mínimas |
| `src/components/expediente/ExpedienteFullView.tsx` | Tabs con scroll + dropdown "Más" real + flechas |
| `src/components/expediente/ExpedienteHeader.tsx` | Paddings y tamaños compactados |

---

## Paso 5 — Incorporación de Coordinador de CX

### Qué representa

El **Coordinador de CX** es el responsable operativo de seguimiento de cada cirugía. No es el médico, no es el instrumentador, no es el vendedor, no es el usuario que cargó el registro. Es quien coordina la cirugía desde el lado operativo/logístico.

### Valores iniciales

- Nelson
- Ezequiel
- Sin asignar

El sistema está preparado para agregar más coordinadores en el futuro modificando `COORDINADOR_CX_OPTIONS` en `cirugias.constants.ts`.

### Dónde se muestra

| Ubicación | Formato | Detalle |
|-----------|---------|---------|
| Tabla principal | Columna opcional "Coordinador" | Texto simple, sin color fuerte. Oculta por defecto, visible desde selector de columnas |
| Filtros avanzados | Checkbox group "Coordinador de CX" | Filtra por Nelson, Ezequiel, Sin asignar. Se combina con todos los demás filtros |
| Chips de filtros activos | Chip "Coordinador: Nelson" | Se muestra como filtro activo con botón de limpieza |
| Preview lateral | Línea "Dr. X · Coord.: Nelson" | Integrado en la línea de médico, sin agregar altura extra |
| Expediente header | "Coord.: Nelson" en info strip | Junto a médico, institución, fecha |
| Resumen expediente | FieldRow "Coordinador de CX" | En la card "Datos principales" junto a vendedor e instrumentador |
| Ficha de cirugía (lectura) | ReadonlyField "Coordinador de CX" | En la sección "Gestión" de la ficha |
| Ficha de cirugía (edición) | SelectField con opciones | Desplegable con Sin asignar, Nelson, Ezequiel |
| Nueva cirugía (paso 1) | Select "Coordinador de CX" | En Datos principales, después de Provincia. Default: "Sin asignar" |
| Confirmación nueva cirugía | Línea "Coordinador CX: Nelson" | En el resumen de confirmación |

### Dónde se edita

1. **Alta de cirugía**: Selector desplegable en paso 1 del wizard. No es obligatorio.
2. **Ficha de cirugía**: SelectField en sección "Gestión" con modo lectura/edición.
3. **No bloquea** la creación si no se asigna coordinador.

### Cómo se filtra

- En filtros avanzados: checkbox group con opciones "Sin asignar", "Nelson", "Ezequiel".
- Se combina con todos los demás filtros (estado, preparación, documentación, facturación, médico, institución, cliente, clasificación, fecha).
- El chip de filtro activo muestra "Coordinador: Nelson" con botón de limpieza.
- Ejemplo de uso: cirugías autorizadas + coordinador Nelson = cirugías que Nelson debe seguir.

### Cómo se guarda

- Campo `coordinadorCx` en el tipo `Surgery` (opcional, string).
- Persistido en Zustand + localStorage como el resto de los datos de la cirugía.
- Default: `"Sin asignar"` si no se especifica.

### Impacto en historial

Cuando se cambia el coordinador desde la ficha, el store registra automáticamente un evento de auditoría:
- Acción: "Cambio de coordinador"
- Detalle: "Coordinador de CX cambiado"
- Valor anterior: "Nelson"
- Valor nuevo: "Ezequiel"
- Usuario y fecha/hora del cambio

### Criterios visuales

- **Sin color fuerte**: El coordinador se muestra como texto simple (`text-muted-foreground`), sin badges de color.
- **No compite con Estado CX**: Estado CX sigue siendo la columna visual principal con color de fondo intenso.
- **No agrega scroll**: En el preview lateral, se integra en la línea existente del médico.
- **Columna oculta por defecto**: En la tabla, la columna "Coordinador" está disponible pero no visible inicialmente para no saturar la vista.

### Preparado para futuro

- Se pueden agregar más coordinadores modificando `COORDINADOR_CX_OPTIONS`.
- El dato queda disponible para reportes y estadísticas futuras.
- No se crearon KPIs de coordinador (por pedido explícito del usuario).

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/types/index.ts` | Agregado `coordinadorCx?: string` a Surgery |
| `src/lib/cirugias.constants.ts` | Agregado `COORDINADOR_CX_OPTIONS`, columna "coordinadorCx" en tabla, default visible: false |
| `src/lib/cirugias.types.ts` | Agregado `coordinadorFilters` a CirugiasFilterState, `coordinadorCx` a NewSurgeryForm |
| `src/lib/store.ts` | Tracking de cambio de coordinador en updateSurgery → addAuditEvent |
| `src/data/mock-surgeries.ts` | Agregado coordinadorCx a las 8 cirugías mock |
| `src/hooks/useCirugiasFilters.ts` | Estado y lógica del filtro coordinadorFilters |
| `src/components/cirugias/CirugiasToolbar.tsx` | Props de coordinadorFilters pasados al filtro avanzado |
| `src/components/cirugias/CirugiasAdvancedFilters.tsx` | Checkbox group "Coordinador de CX" |
| `src/components/cirugias/CirugiaRow.tsx` | Columna "Coordinador" opcional en la fila |
| `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` | Select "Coordinador de CX" en paso 1 + resumen confirmación |
| `src/components/expediente/FichaCirugia.tsx` | Campo "Coordinador de CX" en lectura y edición (sección Gestión) |
| `src/components/expediente/ExpedientePreview.tsx` | "Dr. X · Coord.: Nelson" en línea compacta |
| `src/components/expediente/ExpedienteHeader.tsx` | "Coord.: Nelson" en info strip |
| `src/components/expediente/ResumenExpediente.tsx` | FieldRow "Coordinador de CX" en datos principales |
| `src/app/cirugias/page.tsx` | Props de coordinadorFilters en toolbar |

---

## Paso 6 — Corrección de Filtros Rápidos y Preview Lateral

### Objetivo

Corregir dos problemas UX críticos sin tocar modelo de datos, coordinadorCx, wizard de nueva cirugía, expediente completo, sidebar, lógica de estados ni mocks.

### Problema 1: Filtros escondidos en popover gigante

**Antes**: Un único botón "Filtros avanzados" abría un popover de 560×420px con TODOS los filtros juntos. Los filtros operativos más importantes (Estado CX, Preparación, Documentación, Facturación, Coordinador) quedaban ocultos dentro del popover.

**Después**: Los filtros importantes son botones visibles en la barra, cada uno con su propio popover compacto.

Filtros visibles en la barra:
- **Estado CX**: Popover con checkboxes + badges de color
- **Preparación**: Popover con checkboxes + badges de color
- **Documentación**: Popover con checkboxes + badges de color
- **Facturación**: Popover con checkboxes (sin color)
- **Coordinador CX**: Popover con checkboxes (Sin asignar, Nelson, Ezequiel)
- **Fecha**: Popover con date inputs (Desde / Hasta)

Cada filtro rápido:
- Botón compacto (h-7, text-[11px])
- Badge circular con contador cuando hay opciones seleccionadas
- Cambia a estilo "default" (azul) cuando está activo
- Popover individual al hacer click

"Más filtros" (popover secundario, solo filtros secundarios):
- Médico (input)
- Institución (select)
- Cliente / Obra Social (select)
- Clasificación (select)
- PR Nº, Expediente Nº, NR Nº, FV Nº (inputs)
- Buscar también en (checkboxes)
- Indicador visual (punto azul) cuando hay filtros secundarios activos

Chips de filtros activos:
- Se muestran debajo de la barra
- Cada chip eliminable individualmente
- Botón "Limpiar todo"

### Problema 2: Preview lateral con scroll y fricción

**Antes**: El preview generaba fricción — scroll de pantalla, doble scroll, mucho espacio muerto, se sentía como un panel largo fijo. Mostraba comprobante refs (PR, NR, FV badges) y usaba un spacer flex-1 que empujaba el botón "Expandir" al fondo. El wrapper usaba `h-full` que estiraba el contenido.

**Después**: Preview ultra-compacto sin scroll, sin espacio muerto, sin información secundaria.

Contenido del preview compacto:
1. **Header**: ID CX, expediente, paciente+DNI, médico+coordinador, institución, fecha. Controles: colapsar/expandir/cerrar.
2. **Estados**: 4 badges compactos (Estado CX, Preparación, Doc, Facturación)
3. **Pendiente principal**: Bloque con color según prioridad
4. **Acciones rápidas**: Ver expediente, PR/Crear PR, NR, Consumo, menú "Más"
5. **Expandir expediente**: Botón outline compacto

Eliminado del preview:
- Comprobante refs (PR/NR/FV badges) — solo en expediente completo
- Spacer flex-1 que generaba espacio muerto
- h-full que estiraba el preview al alto completo del contenedor
- Cualquier información que obligue a scrollear

Comportamiento:
- Preview cerrado: width 0, tabla al 100%
- Preview compacto: ancho 350px, altura natural del contenido (no estira)
- Preview expandido: vista ExpedienteFullView
- Sin scroll interno, sin doble scroll

### Verificación de condiciones

- ✓ Filtros rápidos visibles sin abrir popover
- ✓ Popover gigante eliminado (solo "Más filtros" para secundarios)
- ✓ Estado CX, Preparación, Documentación, Facturación y Coordinador accesibles desde la barra
- ✓ Preview sin scroll molesto
- ✓ Tabla recupera ancho completo al cerrar preview
- ✓ Preview muestra solo lo crítico
- ✓ Expandir expediente funciona

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/cirugias/CirugiasToolbar.tsx` | Reescrito: filtros rápidos visibles (QuickFilterPopover + DateFilterPopover) + "Más filtros" en vez de popover gigante |
| `src/components/cirugias/CirugiasAdvancedFilters.tsx` | Reconvertido en MoreFiltersPopover: solo filtros secundarios |
| `src/components/expediente/ExpedientePreview.tsx` | Rediseño ultra-compacto: sin scroll, sin comprobante refs, sin spacer, sin h-full, institución visible |
| `src/app/cirugias/page.tsx` | Eliminado div h-full wrapper del preview |

---

## Paso 7 — Eliminación del Preview Lateral Fijo

### Objetivo

Eliminar el panel lateral fijo de la derecha en la vista principal de Cirugías. La pantalla queda como una vista operativa centrada en la tabla, con filtros rápidos, acciones por fila y acceso claro al expediente completo.

### Motivo

El preview lateral generaba más fricción que valor:
- Robaba ancho útil a la tabla
- Producía scroll y conflictos visuales
- Se superponía o desacomodaba con el layout superior
- Duplicaba información que ya aparecía en la tabla
- Obligaba a mantener un panel que no era necesario para el trabajo diario
- El expediente completo ya existe y debe ser la vista profunda del caso

### Qué se cambió

#### 1. Eliminación del preview lateral fijo

- **Antes**: La vista principal tenía un layout flex con tabla a la izquierda y preview lateral a la derecha (350px en estado compact, 10px en estado tab).
- **Después**: La tabla ocupa todo el ancho disponible. No hay panel lateral, no hay borde vertical "EXPEDIENTE", no hay contenedor vacío a la derecha.

Eliminado de `page.tsx`:
- Bloque del "Collapsed Tab" (borde vertical "EXPEDIENTE" de 10px)
- Bloque del "Right Preview Panel" (w-[350px] con ExpedientePreview)
- Layout flex con gap-0 entre tabla y preview
- Import de ExpedientePreview
- Import de useExpedientePreview (hook)
- Import de FileText (para placeholder vacío del preview)
- `cn()` condicional para ancho de tabla según panelState

#### 2. Selección de fila sin preview

- Click en una fila → solo marca visual (borde izquierdo + fondo suave `bg-primary/5` + texto azul `text-blue-700`)
- No abre panel lateral
- No mueve la tabla
- No genera scroll extra
- La selección sirve como contexto para acciones futuras

#### 3. Acceso al expediente completo

Formas de abrir el expediente:
- **Doble click** sobre una fila → abre ExpedienteFullView
- **Botón "Ver expediente"** en la celda de acciones (dropdown "Más acciones")
- **Acción principal fallback** → cuando la cirugía no tiene PR, no puede remitir, no puede cargar consumo ni facturar, el botón principal muestra "Ver expediente" en vez de "Ver"

Comportamiento:
- "Ver expediente" cambia panelState a "expanded" y muestra ExpedienteFullView
- Desde ExpedienteFullView, "Volver a Cirugías" funciona correctamente
- Se eliminó el botón "Vista dividida" (ya no existe vista dividida)
- Se eliminó el prop `onBackToSplit` de ExpedienteFullView y ExpedienteHeader

#### 4. Tabla con ancho completo

- La tabla ocupa 100% del ancho disponible
- No hay columnas excesivamente comprimidas
- Encabezados claros
- Estado CX como referencia visual principal con colores
- Preparación, Doc, Consumo y Facturación con estilo homogéneo y neutro
- No hay KPIs arriba
- No hay doble scroll
- Scroll horizontal mínimo, solo si es necesario

#### 5. Acciones por fila

Cada fila permite acceder rápido a:
- Ver expediente (dropdown + fallback principal)
- Crear / Ver PR (botón principal cuando no tiene PR)
- Remitir NR (botón principal cuando puede remitir)
- Cargar consumo (botón principal cuando corresponde)
- Facturar / Autorizar FV (botón principal cuando corresponde)
- Más acciones (dropdown): agregar nota, cambiar estado, cambiar fecha, suspender, cancelar, recuperar

Regla: Acciones como "Ver PR", "Remitir NR", "Cargar consumo" en el dropdown ahora abren el expediente completo directamente en la tab correspondiente (presupuesto, remitos, consumo).

#### 6. Corrección de conflicto visual superior

- Se eliminó el wrapper flex con gap-0 que generaba el desfasaje visual
- Se eliminaron los `cn()` condicionales que ajustaban el ancho de la tabla según el panelState
- La pantalla queda limpia: header global + toolbar compacta + chips + tabla
- No hay h-full, flex-1 o overflow-y innecesario que provoque doble scroll
- Altura del contenedor: `h-[calc(100vh-5rem)]` sin cambios

#### 7. Filtros

Sin cambios en la funcionalidad de filtros. Se mantienen:
- 6 filtros rápidos visibles (Estado CX, Preparación, Documentación, Facturación, Coordinador, Fecha)
- Más filtros para secundarios
- Chips activos con "Limpiar todo"

#### 8. Limpieza de hooks y estados

**PanelState** (cirugias.constants.ts):
- Antes: `"closed" | "tab" | "compact" | "expanded"` (4 estados)
- Después: `"list" | "expanded"` (2 estados)

**useCirugiaSelection** (refactorizado):
- `selectSurgery(id)`: Solo setea `selectedSurgeryId`, NO cambia panelState
- `openExpediente(id)`: Setea `selectedSurgeryId` + panelState a "expanded"
- `closeExpediente()`: Setea panelState a "list" (mantiene selección)
- `deselectSurgery()`: Limpia selectedSurgeryId + panelState a "list"
- Eliminado: `closeCompactPanel`, `compactTab`, `setCompactTab`

**useExpedientePreview** (simplificado como legacy):
- Ya no se usa en la vista principal
- Se conserva el archivo para no romper posibles imports externos
- En page.tsx se verifica `selection.panelState === "expanded"` directamente

**ExpedientePreview.tsx** (legacy / no usado):
- El componente sigue existiendo en el proyecto
- No se renderiza en ninguna vista activa
- Se puede eliminar en una futura limpieza

**Sub-componentes legacy del preview** (no usados):
- ExpedientePreviewHeader.tsx
- ExpedientePreviewActions.tsx
- ExpedientePreviewPending.tsx
- ExpedientePreviewStatusChips.tsx
- ExpedientePreviewSummary.tsx

### Componentes eliminados o legacy

| Componente | Estado | Nota |
|-----------|--------|------|
| ExpedientePreview.tsx | Legacy | No se renderiza en la vista principal. Se conserva para evitar romper imports |
| ExpedientePreviewHeader.tsx | Legacy | Sub-componente del preview, no usado |
| ExpedientePreviewActions.tsx | Legacy | Sub-componente del preview, no usado |
| ExpedientePreviewPending.tsx | Legacy | Sub-componente del preview, no usado |
| ExpedientePreviewStatusChips.tsx | Legacy | Sub-componente del preview, no usado |
| ExpedientePreviewSummary.tsx | Legacy | Sub-componente del preview, no usado |
| useExpedientePreview.ts | Legacy | Simplificado, no se usa en page.tsx |

### Flujo de selección de fila

1. Click en fila → `selectSurgery(id)` → fila marcada visualmente (borde izq + fondo)
2. Doble click en fila → `openExpediente(id)` → ExpedienteFullView reemplaza la tabla
3. Acción "Ver expediente" → `openExpediente(id)` → ExpedienteFullView
4. "Volver a Cirugías" → `closeExpediente()` → vuelve a la tabla, fila sigue seleccionada
5. Click en otra fila → cambia la selección visual

### Cómo se abre el expediente completo

- Doble click en cualquier fila de la tabla
- Botón "Ver expediente" en el dropdown de acciones de cada fila
- Botón principal "Ver expediente" (cuando no hay acción contextual más urgente)
- Acciones como "Ver PR", "Cargar consumo" en el dropdown abren el expediente en la tab correspondiente

### Cómo se recuperó el ancho completo de la tabla

1. Se eliminó el contenedor flex con gap-0 entre tabla y preview
2. Se eliminaron los bloques del collapsed tab (10px) y del right preview panel (350px)
3. La tabla ahora está dentro de un `<div className="flex-1 min-h-0">` simple
4. No hay `cn()` condicionales que ajusten el ancho según panelState
5. No hay bordes, spacers o contenedores reservados

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/lib/cirugias.constants.ts` | PanelState simplificado: `"list" \| "expanded"` |
| `src/hooks/useCirugiaSelection.ts` | Refactorizado: selectSurgery sin panel, openExpediente, closeExpediente. Eliminados compactTab, closeCompactPanel |
| `src/hooks/useExpedientePreview.ts` | Simplificado como legacy. Solo devuelve isExpanded |
| `src/app/cirugias/page.tsx` | Eliminado preview lateral, collapsed tab, layout flex. Tabla full-width. Agregado onOpenExpediente |
| `src/components/cirugias/CirugiasTable.tsx` | Agregado prop onOpenExpediente, eliminado onSetCompactTab |
| `src/components/cirugias/CirugiaRow.tsx` | Agregado onDoubleClick → onOpenExpediente, eliminado onSetCompactTab |
| `src/components/cirugias/CirugiaActionsCell.tsx` | Reemplazado onSelect por onOpenExpediente en "Ver expediente". Acciones abren expediente en tab correspondiente |
| `src/components/expediente/ExpedienteFullView.tsx` | Eliminado prop onBackToSplit |
| `src/components/expediente/ExpedienteHeader.tsx` | Eliminado botón "Vista dividida", eliminado prop onBackToSplit, eliminado import Columns2 |

---

## Paso 8 — Mejora de Scroll Horizontal en la Tabla

### Objetivo

Mejorar la navegación horizontal de la tabla de cirugías cuando hay muchas columnas visibles, sin eliminar columnas, sin cambiar la lógica del módulo y sin forzar columnas fijas por defecto.

### Problema

Después de eliminar el preview lateral, la tabla usa mejor el ancho disponible, pero al tener muchas columnas aparece un scroll horizontal incómodo. La barra queda poco práctica para moverse de lado a lado y se siente rara para operación diaria.

### Cambios realizados

#### 1. Scroll horizontal sticky por defecto

La tabla ahora tiene un contenedor propio con `overflow: auto` (tanto horizontal como vertical). Esto garantiza que la barra de scroll horizontal permanezca siempre visible en la parte inferior del área visible de la tabla, no se pierde al final de toda la página. El header de la tabla sigue alineado con las filas al hacer scroll horizontal. El scroll vertical de la página no se rompe.

Cambios en `CirugiasTable.tsx`:
- El contenedor cambió de `overflow-y-auto` a `overflow-auto` (ambos ejes)
- La tabla cambió de `w-full` a `min-w-full` para permitir que crezca más allá del contenedor cuando hay muchas columnas
- Se agregó un `ref` al contenedor para controlar el scroll mediante JavaScript

#### 2. Botones de desplazamiento horizontal ← →

Se agregaron botones flotantes para desplazar la tabla horizontalmente por bloques (300px por click con scroll suave).

Comportamiento:
- Botón ← desplaza hacia la izquierda
- Botón → desplaza hacia la derecha
- El botón izquierdo se oculta cuando la tabla está al inicio
- El botón derecho se oculta cuando la tabla está al final
- Los botones aparecen flotando en la parte inferior-centro del contenedor de tabla
- Solo se muestran cuando hay scroll horizontal posible
- No compiten visualmente con la tabla (semi-transparentes, con backdrop blur)
- Usan scroll suave (behavior: "smooth")

#### 3. Columnas fijas como configuración opcional

Las columnas fijas NO están activadas por defecto. El usuario puede activarlas o desactivarlas desde el selector de columnas.

Cómo se accede: Selector de columnas (botón con ícono `Columns3`) → sección "Columnas fijas" → checkbox "Activar columnas fijas"

Cuando está activado:
- Se fijan a la izquierda: ID CX, PR Nº, Expediente, Estado CX
- Se fija a la derecha: Acciones
- Las columnas fijas tienen fondo sólido para cubrir el contenido que scrolla detrás
- La última columna fija a la izquierda tiene una sombra sutil como separador visual
- La columna fija a la derecha también tiene sombra sutil
- Estado CX mantiene sus colores propios (no se sobreescribe con el fondo de selección)

Cuando está desactivado (default):
- Ninguna columna queda fija
- La tabla se comporta como una grilla normal con scroll horizontal

Persistencia:
- La preferencia activa de vista ahora se resuelve con estrategia **server-first** por usuario + empresa.
- Se persiste en backend mediante el endpoint `GET/PUT /api/companies/[companyId]/surgeries/view-preferences`.
- `localStorage` sigue existiendo como fallback temporal y compatibilidad de transición.
- Si no hay preferencia persistida en backend, la UI puede arrancar desde fallback local/defaults y luego sincronizar.

#### 4. Indicador visual de desplazamiento

Se muestran sombras suaves en los bordes de la tabla cuando hay contenido oculto:
- Sombra en el borde izquierdo cuando se puede scrollear hacia la izquierda
- Sombra en el borde derecho cuando se puede scrollear hacia la derecha
- Las sombras son degradados sutiles (`from-black/[0.04] to-transparent`)
- No usan colores fuertes, no compiten con Estado CX, no tapan texto
- Desaparecen cuando el scroll llega al inicio o al final

### Detalle técnico de la implementación

**Cálculo de offsets para columnas fijas:**

Cada columna fija a la izquierda necesita un `left` offset acumulativo. Los anchos aproximados son:
- ID CX: 75px
- PR Nº: 75px
- Expediente: 90px
- Estado CX: 120px

El offset se calcula dinámicamente en base a qué columnas están visibles (ya que el usuario puede ocultar columnas desde el selector).

**Manejo de fondos en celdas fijas:**

Las celdas fijas necesitan un fondo sólido para cubrir el contenido que scrolla detrás:
- Celdas normales: `bg-background` (fondo sólido blanco)
- Celdas en fila seleccionada: `bg-primary/5` (fondo azul suave)
- Hover en celdas fijas: `group-hover:bg-muted/30` (requiere `group` en `<tr>`)
- Estado CX: NO se sobreescribe el fondo — mantiene `CX_STATE_CELL_COLORS` que ya son sólidos

**Botones de scroll:**

Los botones usan `scrollRef.current.scrollBy()` con `behavior: "smooth"` y un step de 300px. Se rastrea la posición del scroll mediante un event listener y un ResizeObserver para actualizar los estados de visibilidad.

**Sombra en última columna fija izquierda:**

Se detecta cuál es la última columna visible del grupo de columnas fijas izquierda (`lastLeftKey`) y se le aplica `shadow-[2px_0_4px_rgba(0,0,0,0.06)]`. La columna fija derecha recibe `shadow-[-2px_0_4px_rgba(0,0,0,0.06)]`.

### Lo que NO se cambió

- Modelo de datos
- Filtros (rápidos y avanzados)
- Expediente completo
- Wizard de nueva cirugía
- Lógica de estados
- Lógica de negocio
- Mock data
- Colores de Estado CX
- Colores de Preparación
- Badges de Doc/Consumo/Fact
- Acciones por fila (lógica)
- Diálogos
- Sidebar
- Store (Zustand)
- Constantes (cirugias.constants.ts)

### Verificación

- ✓ La tabla puede desplazarse horizontalmente con la barra sticky
- ✓ La tabla puede desplazarse horizontalmente con botones ← →
- ✓ Los botones se deshabilitan u ocultan correctamente al inicio/final
- ✓ Columnas fijas NO están activas por defecto
- ✓ El usuario puede activar columnas fijas desde configuración
- ✓ Al activar columnas fijas, ID CX, PR Nº, Expediente y Estado CX quedan fijas a la izquierda
- ✓ Al activar columnas fijas, Acciones queda fija a la derecha
- ✓ Al desactivar columnas fijas, ninguna columna queda fija
- ✓ El header de la tabla sigue alineado con las filas
- ✓ No aparece doble scroll innecesario
- ✓ No se rompe el scroll vertical
- ✓ No se rompe el selector de columnas
- ✓ No se rompe el ordenamiento
- ✓ No se rompe ninguna acción por fila
- ✓ El build compila limpio

### Estado actual de persistencia de vista

- La tabla de Cirugías ya persiste en backend:
  - columnas visibles
  - orden de columnas
  - anchos
  - columnas fijas a la izquierda
  - encabezados fijos
  - modo compacto
  - encabezados agrupados / bloques
- La fuente principal de verdad para la preferencia activa es server-side por `usuario + empresa`.
- Existe migración one-shot desde preferencias legacy en `localStorage` hacia backend cuando el server está vacío.
- Las plantillas guardadas del modal siguen locales por ahora; no forman parte todavía del contrato server.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useColumnVisibility.ts` | Agregado `stickyColumns` state con persistencia en localStorage (`ortotrack-sticky-columns`), `toggleStickyColumns` callback |
| `src/components/cirugias/ColumnVisibilityMenu.tsx` | Agregada sección "Columnas fijas" con toggle checkbox + descripción cuando está activo |
| `src/components/cirugias/CirugiasToolbar.tsx` | Agregados props `stickyColumns` y `onToggleStickyColumns` para pasar al ColumnVisibilityMenu |
| `src/components/cirugias/CirugiasTable.tsx` | Refactorizado: contenedor con `overflow-auto`, tabla con `min-w-full`, scroll ref, estado de scroll, botones ← → flotantes, sombras indicadoras, soporte para columnas fijas (offsets, estilos sticky, sombras en bordes) |
| `src/components/cirugias/CirugiaRow.tsx` | Agregados props `stickyColumns` y `stickyOffsets`, funciones `stickyCellClasses` y `stickyStateCellClasses`, estilos sticky condicionales por columna, clase `group` en `<tr>` para hover |
| `src/components/cirugias/CirugiaStatusCell.tsx` | Agregados props opcionales `tdClassName` y `tdStyle` para recibir estilos sticky sin sobreescribir el fondo de color propio |
| `src/components/cirugias/CirugiaActionsCell.tsx` | Agregados props opcionales `tdClassName` y `tdStyle`, import `cn` para merge de clases |
| `src/app/cirugias/page.tsx` | Pasados `stickyColumns` y `toggleStickyColumns` del hook al toolbar y la tabla |

### Persistencia server de preferencias (actualización posterior)

Archivos agregados/ajustados en la migración a backend:

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Nuevo modelo `UserModuleViewPreference` para persistencia por usuario + empresa + módulo |
| `src/app/api/companies/[companyId]/surgeries/view-preferences/route.ts` | Endpoint GET/PUT de preferencias de vista |
| `src/lib/services/surgery-view-preferences.service.ts` | Persistencia tipada con Prisma (`findUnique` + `upsert`) |
| `src/lib/validators/surgery-view-preferences.validator.ts` | Normalización/validación server-side del payload |
| `src/hooks/useColumnVisibility.ts` | Estrategia server-first + fallback local + migración one-shot |
| `src/components/cirugias/ViewCustomizationDialog.tsx` | Modal controlado por props para mantener apply diferido consistente |
| `src/components/cirugias/CirugiasTable.tsx` | Consumo de preferencias resueltas desde hook/page |
