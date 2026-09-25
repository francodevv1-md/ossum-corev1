Leé completamente CIRUGIAS_CURRENT_IMPLEMENTATION.md.

IMPORTANTE:
Este documento describe el prototipo HTML/JS generado en Antigravity para la Grilla Operativa de Alta Densidad de Cirugías.
NO asumas que su arquitectura, tipos, constantes o APIs deben trasladarse literalmente al repo OSSUM.

Antes de implementar:

1. Contrastá el documento contra el código real de OSSUM.
2. Encontrá qué piezas equivalentes ya existen:
   - tipos Surgery / Cirugia
   - constantes de estado CX / preparación / prioridad
   - componentes compartidos (Table, Pagination, Tray, Modals)
   - hooks (useSurgeries, usePagination, useCirugiaActions)
   - utils (formateadores, ordenamientos, filtros)
   - drawer/modal actual de expedientes y novedades
   - servicios/API existentes (surgeries route, prisma schemas)
3. Identificá qué partes del prototipo pueden trasladarse visualmente sin duplicar lógica.
4. Marcá incompatibilidades entre prototipo y arquitectura real.
5. No escribas código todavía.

Entregable:
- mapa Prototipo → OSSUM real;
- componentes reutilizables existentes;
- componentes nuevos realmente necesarios;
- lógica que NO debe duplicarse;
- riesgos;
- primer Change Pack seguro.

No continúes a implementación hasta entregar este análisis.
# Estado Actual del Módulo Cirugías (Grilla Operativa de Alta Densidad & Centro de Control Quirúrgico)

> **Documento de Auditoría y Especificación de Estado Actual para Modularización**  
> **Destinatario Técnico:** Agente de Modularización (*Gentle Fast*) y Equipo de Ingeniería OSSUM COR.  
> **Regla de Operación:** Documentación 100% fiel al código existente en [referencias-ux/cirugias.html](file:///c:/Users/siste/Desktop/ossum%20UX-UI/referencias-ux/cirugias.html). No inventa features ni altera el comportamiento actual.

---

## 1. Resumen General

El módulo **Cirugías** (`OSSUM COR - Grilla Operativa de Alta Densidad`) es el panel operacional neurálgico de OSSUM COR. Su función es concentrar la totalidad de las intervenciones quirúrgicas programadas, en curso y finalizadas, ofreciendo al operador un control visual instantáneo de alto rendimiento sobre decenas de expedientes simultáneos sin sobrecargar la pantalla ni requerir múltiples navegaciones.

### Quién lo usa
- **Operadores de Logística y Despacho:** Monitorean remitos (`Remito PR`), preparación de cajas de instrumental y choferes asignados.
- **Supervisores y Coordinadores Quirúrgicos:** Supervisan estados clínicos/administrativos (`Estado CX`), asignaciones, fechas y horarios de quirófano.
- **Personal de Facturación y Consumo:** Controlan partes quirúrgicos, hojas de implantes y estado de consumo de materiales.

### Flujo Principal del Operador
1. **Inspección de alta densidad:** Lectura visual rápida de 50 filas por página con 3 columnas fijas (*sticky*) a la izquierda (`ID CX`, `Estado CX`, `Paciente`) y 1 a la derecha (`Acción`).
2. **Identificación cromática y prioritaria:** Identificación instantánea de cirugías urgentes (`🚨 URG` con borde rojo `#DC2626` y micro-badge en ID) y distinción inequívoca de los 8 estados de cirugía mediante barra lateral de 4px o celdas cromáticas sin efecto arcoíris.
3. **Filtrado operativo por pestañas (Op-Tabs):** Segmentación por casuística crítica (`Todas`, `🚨 Urgentes`, `Sin fecha`, `Prep pendiente`, `Requiere atención`, `Sin PR`, `Sin consumo`, `Sin factura`).
4. **Búsqueda global y personalización de vista:** Búsqueda reactiva multi-campo y alternancia entre modos de densidad (*Estándar 32px* vs *Compacta 26px*), variantes de estado CX (*Celda / Barra / Punto*) y densidad de datos (*15 Columnas Operativas* vs *22 Extremo*).
5. **Nivel 1 de Acción (Fila):** Ejecución del botón primario contextual (`Solicitar PR`, `Asignar Chofer`, `Subir Protocolo`, `Cargar Consumo`, `Ver Detalle`) o apertura del menú flotante `···`.
6. **Nivel 2 de Inspección (Bandeja Contextual Inferior):** Al seleccionar cualquier fila (140ms), se sincroniza la bandeja inferior de 105px mostrando la franja horizontal del caso, el listado textual de material autorizado (máx 3 ítems + indicador de remanente) y la última novedad registrada con badge de alerta.
7. **Nivel 3 de Operación Profunda (Modales):** Apertura de modales para impresión/descarga documental en lote (`#modal-docs`) y registro inmediato de nuevas novedades operativas (`#modal-novedad`).

### Estado General
- **Madurez:** Prototipo interactivo de alta fidelidad, con Animated UX física calibrada (110–200ms) y soporte `prefers-reduced-motion`.
- **Fuente de Datos:** Dataset local de 49 registros quirúrgicos (`CIRUGIAS`) en memoria del cliente, simulando paginación total sobre 2.681 resultados.
- **Dependencias Críticas:** Google Fonts (`Inter` y `JetBrains Mono`), SVGs inline. Cero librerías externas.
- **Riesgo General:** **MEDIUM** por tamaño y concentración en archivo único (~3.470 líneas), **LOW** en complejidad de dependencias externas.

---

## 2. Archivos Involucrados

| Archivo | Responsabilidad | Tipo | Riesgo | Notas |
|---|---|---|---|---|
| [referencias-ux/cirugias.html](file:///c:/Users/siste/Desktop/ossum%20UX-UI/referencias-ux/cirugias.html) | Monolito que concentra diseño visual, maquetación de grilla, bandeja contextual, modales, dataset `CIRUGIAS` y motor de eventos. | `page` / `monolith` | **HIGH** | Archivo central del módulo (3.471 líneas). |
| [knowledge/cirugias/CIRUGIAS_CURRENT_IMPLEMENTATION.md](file:///c:/Users/siste/Desktop/ossum%20UX-UI/knowledge/cirugias/CIRUGIAS_CURRENT_IMPLEMENTATION.md) | Documento canónico de auditoría técnica y guía de modularización. | `documentation` | **LOW** | Este documento. |

---

## 3. Recorrido Estructural del Código

El archivo `referencias-ux/cirugias.html` se divide en tres capas fundamentales:

```
[ L1 - L10: Head, Meta & Tipografías ]
[ L11 - L1593: Estilos CSS, Design Tokens, Grilla Sticky, Variantes CX, Animated UX & Modales ]
[ L1595 - L2120: Estructura HTML Markup (Header, Filtros, Grilla, Tray, Modales, Popovers, Toast) ]
[ L2122 - L3470: Lógica JavaScript (Dataset CIRUGIAS, Estado, Render, Paginación, Eventos) ]
```

### Bloque 1: Design Tokens & Base CSS
- **Líneas aproximadas:** `11 - 104`
- **Responsabilidad:** Variables CSS (`--navy-ossum`, `--blue-action`, `--blue-selection`, semáforos, sombras, radios).
- **Estado:** `IMPLEMENTADO`.

### Bloque 2: Header Operacional y Filtros CSS
- **Líneas aproximadas:** `105 - 438`
- **Responsabilidad:** Estilos para barra superior, buscador integrado, segmented controls de personalización (Densidad, Estado CX, Columnas), tabs de casuística operativa (`.op-tabs-bar`) y acciones secundarias.
- **Estado:** `IMPLEMENTADO`.

### Bloque 3: Grilla de Alta Densidad, Sticky Columns y Filas Urgentes CSS
- **Líneas aproximadas:** `439 - 590`
- **Responsabilidad:** Grilla tabular `.dense-grid`, alturas de fila (33px estándar / 26px compacta), columnas fijas con anchos exactos (`col-sticky-id: 88px`, `col-sticky-estado: 115px`, `col-sticky-paciente: 170px`, `col-sticky-actions: 90px`), tinte sutil de fila urgente (`#FFF9F9` / `#FFF5F5`), borde izquierdo `#DC2626` y micro-badge `URG`.
- **Estado:** `IMPLEMENTADO`.

### Bloque 4: Sistema Multi-Variante Estado CX (A, B, C) CSS
- **Líneas aproximadas:** `591 - 848`
- **Responsabilidad:** Reglas para Variante A (celda completa), Variante B (barra lateral 4px con texto oscuro) y Variante C (punto discreto + texto) para los 8 estados: Sin autorizar, Pendiente, En tránsito, Realizada, Finalizada, Suspendida, Cancelada y Sin consumo (con soporte de candidato A Bordó `#A23B72` y candidato B Teal `#087F8C`).
- **Estado:** `IMPLEMENTADO`.

### Bloque 5: Bandeja Contextual Inferior (Context Tray) CSS
- **Líneas aproximadas:** `849 - 1145`
- **Responsabilidad:** Bandeja fija de 105px (colapsable a 22px), franja de identificación del caso (Nivel 2), split de paneles (55% Material Autorizado / 45% Última Novedad) y badges de estado documental.
- **Estado:** `IMPLEMENTADO`.

### Bloque 6: Paginación en Footer de Grilla CSS
- **Líneas aproximadas:** `1146 - 1198`
- **Responsabilidad:** Footer ultra compacto integrado a la grilla con zona izquierda (conteo `1–50 de 2.681 resultados`) y zona derecha (`50 / pág.`, navegación `‹` y `›`).
- **Estado:** `IMPLEMENTADO`.

### Bloque 7: Popovers, Modales y Toast CSS
- **Líneas aproximadas:** `1199 - 1593`
- **Responsabilidad:** Menú flotante contextual `···`, modales con backdrop blur (`#modal-docs`, `#modal-novedad`), container de notificaciones toast y media queries para responsive / `prefers-reduced-motion`.
- **Estado:** `IMPLEMENTADO`.

### Bloque 8: Estructura HTML (Markup)
- **Líneas aproximadas:** `1595 - 2120`
- **Responsabilidad:** Layout general `<main class="app-main">`, Header con controles de exploración y disclaimer sutil, barra de tabs operativas, tabla con thead dinámico y tbody con scroll interno, bandeja contextual `#context-tray`, modales y menús.
- **Estado:** `IMPLEMENTADO`.

### Bloque 9: Dataset `CIRUGIAS`
- **Líneas aproximadas:** `2122 - 2898`
- **Responsabilidad:** Array de 49 cirugías completas con datos de logística, materiales y novedades.
- **Estado:** `MOCK` / `IMPLEMENTADO en memoria`.

### Bloque 10: State Management y Handlers JavaScript
- **Líneas aproximadas:** `2899 - 3470`
- **Responsabilidad:** Gestión de estados (`currentDensity`, `currentCxVariant`, `currentColsMode`, `currentTab`, `searchQuery`, `selectedCxId`, `currentPage`, `pageSize`), motor de ordenamiento, filtros, paginación, sincronización de la bandeja contextual y modales.
- **Estado:** `IMPLEMENTADO`.

---

## 4. Estados

| Estado | Tipo | Inicial | Se modifica en | Lo consume | Candidato futuro |
|---|---|---|---|---|---|
| `currentDensity` | `"standard" \| "compact"` | `"standard"` | `setDensity(mode)` | `cx-table`, botones de switch | UI Store / LocalStorage |
| `currentCxVariant` | `"a" \| "b" \| "c"` | `"b"` | `setCxVariant(variant)` | `cx-table`, botones de switch | UI Preferences Store |
| `currentColsMode` | `"operativas" \| "extremo"` | `"operativas"` | `setColumnsMode(mode)` | `renderHeaders()`, `renderRows()` | Table Config Hook |
| `currentTab` | `string` | `"todas"` | `setOpTab(tabKey)` | `getFilteredData()`, tabs UI | URL Query / Filter Hook |
| `searchQuery` | `string` | `""` | Input `#cx-search-input` listener | `getFilteredData()`, badge de conteo | URL Query / Search Hook |
| `selectedCxId` | `string` | `"CX-0006"` | Click en fila / `renderRows()` fallback | `syncContextTray()`, popovers | Surgery Context Store |
| `currentPage` | `number` | `1` | `changePage()`, reset en filtros | `renderRows()`, pagination footer | Pagination Hook |
| `pageSize` | `number` | `50` | `changePageSize(size)` | `renderRows()`, pagination footer | Pagination Hook |
| `sortColumn` | `string` | `"id"` | Click en encabezado `th.sortable` | `getSortedData()` | Table Sorting Hook |
| `sortDirection` | `"asc" \| "desc"` | `"asc"` | Click en encabezado `th.sortable` | `getSortedData()` | Table Sorting Hook |

---

## 5. Datos Derivados

| Dato Derivado | Entrada | Salida | Propósito | Dependencias | Riesgo |
|---|---|---|---|---|---|
| `getFilteredData()` | `CIRUGIAS`, `searchQuery`, `currentTab` | `Array<Cirugia>` | Filtra cirugías según pestaña activa y texto ingresado | `CIRUGIAS`, inputs | LOW |
| `getStatusKey(estado)` | `string` (estado textual) | `string` (slug semántico) | Determina la clase CSS de color según el estado | Normalización de texto | LOW |
| `getContextualPrimaryAction(item)` | `Cirugia` | `string` (nombre de acción) | Decide la acción principal rápida según el estado operativo | Reglas de negocio de cirugía | MEDIUM |
| `pageSlice` | `getFilteredData()`, `currentPage`, `pageSize` | `Array<Cirugia>` | Obtiene los registros a renderizar en la página actual | Paginador | LOW |
| `totalPages` | `totalResults`, `pageSize` | `number` | Calcula la cantidad total de páginas | Paginador | LOW |

---

## 6. Funciones y Handlers

### `setDensity(mode)`
- **Parámetros:** `mode: "standard" | "compact"`
- **Responsabilidad:** Alterna las clases de altura y padding en la tabla.
- **Efectos secundarios:** Dispara toast informativo y actualiza segmented control.

### `setCxVariant(variant)`
- **Parámetros:** `variant: "a" | "b" | "c"`
- **Responsabilidad:** Cambia la clase visual de la tabla (`cx-variant-a/b/c`) para modificar la representación de `Estado CX`.

### `setColumnsMode(mode)`
- **Parámetros:** `mode: "operativas" | "extremo"`
- **Responsabilidad:** Alterna entre 15 y 22 columnas, re-renderizando encabezados y celdas.

### `setOpTab(tabKey)`
- **Parámetros:** `tabKey: string`
- **Responsabilidad:** Establece el filtro de pestaña activo, reinicia a la página 1 y re-renderiza la grilla.

### `renderHeaders()`
- **Parámetros:** Ninguno
- **Responsabilidad:** Inyecta el HTML de las cabeceras (`<th>`) con anchos y clases sticky calibradas.

### `renderRows(animateFade = true)`
- **Parámetros:** `animateFade: boolean`
- **Responsabilidad:** Obtiene los datos paginados, limpia el `tbody`, inyecta las filas con micro-badge urgente, clases de estado y animación `gridFade` (120ms). Sincroniza la fila seleccionada.

### `syncContextTray(cxId)`
- **Parámetros:** `cxId: string`
- **Responsabilidad:** Actualiza la franja superior del caso (Nivel 2) incluyendo badge `🚨 URG` si aplica, renderiza los 3 materiales autorizados con indicador de remanente, y muestra la última novedad con badge `ALERTA`. Aplica microinteracción `tray-fade-animate` (140ms).

### `toggleContextTray()`
- **Parámetros:** Ninguno
- **Responsabilidad:** Alterna la clase `.tray-collapsed` en `#context-tray` (200ms) y rota la flecha indicadora.

### `openDocsModal()` / `closeDocsModal()`
- **Parámetros:** Ninguno
- **Responsabilidad:** Controla la visibilidad y animación `modalPop` (150ms) del modal de documentación imprimible.

### `openNovedadModal()` / `closeNovedadModal()`
- **Parámetros:** Ninguno
- **Responsabilidad:** Controla el modal de registro de novedades operativas.

### `openRowMoreActions(event, cxId)` / `openMoreActionsMenu(event, cxId)`
- **Parámetros:** `event: MouseEvent`, `cxId: string`
- **Responsabilidad:** Posiciona el menú popover `···` en las coordenadas del cursor y asocia las acciones a la cirugía correspondiente.

### `showToast(msg, type = "info")`
- **Parámetros:** `msg: string`, `type: string`
- **Responsabilidad:** Inyecta un mensaje flotante en `#toast-container` con auto-destrucción a los 2.400ms.

---

## 7. Vistas Principales

El módulo cuenta con una vista operacional principal única estructurada en dos modos de visualización de columnas:

### 1. Vista Operativa Estándar (15 Columnas)
- **Propósito:** Operación diaria de alta velocidad sin scroll horizontal excesivo en laptops y pantallas estándar (1366x768 a 1920x1080).
- **Columnas visibles:** ID CX, Estado CX, Paciente, Cliente/OS, Institución, Médico, Clasificación, Preparación, Fecha CX, Hora, Fecha Envío, Remito PR, Consumo, Coordinador, Acción.

### 2. Vista Caso Extremo (22 Columnas)
- **Propósito:** Auditoría y supervisión logística profunda con scroll horizontal amplio.
- **Columnas adicionales incorporadas:** Material Principal, Transporte/Chofer, Matrícula de Vehículo, Factura, Prioridad (`🚨 URG` / `Norm`), Última Novedad textual.

---

## 8. Tablas / Cards / Filas / Columnas

### Columnas Sticky (Fijas en Scroll Horizontal)
1. **`ID CX` (`col-sticky-id`):**
   - Coordenadas: `left: 0`, ancho: `88px` fijo.
   - Contenido: Tipografía monoespaciada + micro-badge `URG` en cirugías urgentes.
   - Borde izquierdo: `3.5px solid #DC2626` en filas urgentes.
2. **`Estado CX` (`col-sticky-estado`):**
   - Coordenadas: `left: 88px`, ancho: `115px` fijo.
   - Contenido: Barra lateral 4px (`.cx-indicator-bar`), indicador de punto (`.cx-indicator-dot`) y texto semántico (`.cx-status-text`).
3. **`Paciente` (`col-sticky-paciente`):**
   - Coordenadas: `left: 203px`, ancho: `170px` fijo.
   - Separador: Sombra física hacia la derecha (`box-shadow: 3px 0 6px -2px rgba(0,0,0,0.08)`).
4. **`Acción` (`col-sticky-actions`):**
   - Coordenadas: `right: 0`, ancho: `90px` fijo.
   - Contenido: Botón primario contextual (`action-btn-compact`) + botón trigger de popover `···` (`action-icon-btn`).

### Semántica de Estados Quirúrgicos (`Estado CX`)
- **Sin autorizar:** Rojo `#B91C1C` (fondo `#FEF2F2`, texto `#991B1B`).
- **Pendiente:** Ámbar `#D97706` (fondo `#FFFBEB`, texto `#92400E`).
- **En tránsito:** Azul `#2563EB` (fondo `#EFF6FF`, texto `#1E40AF`).
- **Realizada:** Teal `#0D9488` (fondo `#F0FDFA`, texto `#115E59`).
- **Finalizada:** Verde `#059669` (fondo `#ECFDF5`, texto `#065F46`).
- **Suspendida:** Rojo carmesí `#DC2626` (fondo `#FEF2F2`, texto `#991B1B`).
- **Cancelada:** Gris neutro `#6B7280` (fondo `#F3F4F6`, texto `#374151`).
- **Sin consumo (Candidato A):** Bordó/Magenta `#A23B72` (fondo `#FDF2F8`, texto `#8A2E5F`).
- **Sin consumo (Candidato B):** Teal oscuro `#087F8C` (fondo `#F0FDFB`, texto `#086873`).

---

## 9. Filtros y Búsqueda

### Pestañas Operativas (`.op-tab`)
- **Todas:** Muestra la totalidad de cirugías sin filtro de casuística.
- **🚨 Urgentes:** Filtra filas donde `prioridad` contiene `"Urgente"`.
- **Sin fecha:** Casos con `fechaCx === "Sin fecha"`.
- **Prep pendiente:** Casos con `prep === "Sin preparar"` o `"En preparación"`.
- **Requiere atención:** Casos urgentes, sin fecha, sin autorizar o suspendidos.
- **Sin PR:** Casos con `remito === "Sin PR"`.
- **Sin consumo:** Casos en estado Sin consumo o con `consumo === "Pendiente"`.
- **Sin factura:** Casos con `factura === "Sin factura"`.

### Búsqueda Libre Multi-campo (`#cx-search-input`)
- Filtra reactivamente sobre: Paciente, Cliente, Institución, Médico, ID de Cirugía, Estado CX y Clasificación.

---

## 10. Incidencias / Alertas / Pendientes

- **Cirugías Urgentes:** Destacadas en 4 puntos cardinales:
  1. Micro-badge `URG` en la columna sticky `ID CX`.
  2. Borde izquierdo rojo de 3.5px `#DC2626`.
  3. Fondo de fila tintado cálido `#FFF9F9` (pares `#FFF5F5`, hover `#FEE2E2`).
  4. Indicador `🚨 URG` en la franja de identificación de la bandeja contextual inferior.
- **Novedades de Alerta (`isAlert: true`):** Muestran el badge rojo `.nov-alert-tag` en la bandeja contextual.

---

## 11. Modales / Drawers / Paneles

### 1. Modal: Imprimir / Descargar Documentos (`#modal-docs`)
- **Apertura:** Botón "Documentos 🖨" en el header o desde el menú de fila `···`.
- **Contenido:**
  - Selector de formato: PDF individual vs Paquete de impresión.
  - Checkboxes documentales: Protocolo Quirúrgico Firmado, Remito de Envío Oficial, Ficha de Trazabilidad de Implante, Hoja de Consumo Valorizada.
  - Opciones de exportación: Incluir notas internas, carátula institucional.
- **Acciones:** "Descargar paquete ZIP", "Imprimir seleccionados", "Cancelar".
- **Estado:** `SOLO VISUAL` / `MOCK` (dispara toast informativo).

### 2. Modal: Registrar Nueva Novedad (`#modal-novedad`)
- **Apertura:** Botón "+ Nueva novedad" en la bandeja inferior o desde el menú `···`.
- **Contenido:**
  - Selector de Tipo: Operativa, Logística, Médica, Bloqueante.
  - Checkbox: "Marcar como ALERTA prioritaria".
  - Textarea: Descripción de la novedad.
- **Acciones:** "Guardar novedad" (inserta la novedad en el array local del caso y refresca la bandeja contextual), "Cancelar".
- **Estado:** `IMPLEMENTADO en memoria`.

---

## 12. Seguimiento

El seguimiento rápido se realiza mediante la sección **Última Novedad** en la bandeja contextual:
- Almacena autor (`author`), fecha/hora (`date`), cuerpo de texto (`text`) y flag de alerta (`isAlert`).
- Muestra el total de observaciones acumuladas (`trayNovCount`).
- Acción "Historial completo" para acceder a la bitácora integral.

---

## 13. Acciones Operativas

| Acción | Dónde aparece | Precondición | Handler | Efecto | Estado |
|---|---|---|---|---|---|
| `Solicitar PR` | Fila (Col Acción) | `remito === "Sin PR"` | `showToast()` | Notifica al usuario | MOCK |
| `Asignar Chofer` | Fila (Col Acción) | `chofer === "Sin asignar"` | `showToast()` | Abre flujo de chofer | MOCK |
| `Subir Protocolo` | Fila (Col Acción) | `estado === "Realizada"` | `showToast()` | Abre carga de archivo | MOCK |
| `Cargar Consumo` | Fila (Col Acción) | `consumo === "Pendiente"` | `showToast()` | Abre formulario consumo | MOCK |
| `Ver Detalle` | Fila (Col Acción) | Estado estándar | `showToast()` | Muestra expediente | MOCK |
| `Guardar Novedad` | Modal Novedad | Formulario completo | `submitNewNovedad()` | Modifica `CIRUGIAS[x].novedades` | IMPLEMENTADO en memoria |
| `Colapsar Bandeja` | Bandeja inferior | Siempre visible | `toggleContextTray()` | Alterna altura 105px / 22px | IMPLEMENTADO |
| `Cambiar Paginación` | Footer de grilla | Múltiples páginas | `changePage()`, `changePageSize()` | Calcula slice y re-renderiza | IMPLEMENTADO |

---

## 14. Tipos y Constantes

### Tipos Conceptuales
```typescript
interface MaterialItem {
  desc: string;
  cant: number;
  ref: string;
}

interface NovedadItem {
  date: string;
  author: string;
  text: string;
  isAlert?: boolean;
}

interface Cirugia {
  id: string;
  estado: string;
  paciente: string;
  cliente: string;
  institucion: string;
  medico: string;
  clasif: string;
  prep: string;
  fechaCx: string;
  horaCx: string;
  fechaEnvio: string;
  remito: string;
  consumo: string;
  coord: string;
  chofer: string;
  matricula: string;
  factura: string;
  prioridad: "Normal" | "Urgente" | "🚨 Urgente";
  materiales: MaterialItem[];
  novedades: NovedadItem[];
}
```

---

## 15. Dependencias

### Internas
- Ninguna (Monolito Vanilla HTML/CSS/JS autocontenido).

### Externas
- Tipografías Google Fonts: `Inter` (UI estándar) y `JetBrains Mono` (Códigos, IDs, Fechas, Badges monoespaciados).
- Iconos vectoriales SVG inline.

---

## 16. Contratos con Backend / API

Actualmente el prototipo no realiza peticiones HTTP reales. En la arquitectura real de OSSUM COR, este módulo deberá vincularse con:
- `GET /api/surgeries`: Con soporte para paginación (`page`, `pageSize`), búsqueda libre (`search`), ordenamiento (`sortBy`, `sortOrder`) y filtros de casuística (`tabKey`).
- `POST /api/surgeries/:id/novedades`: Registro de observaciones en base de datos.
- `POST /api/surgeries/:id/documents/batch`: Generación y descarga de archivos PDF/ZIP.

---

## 17. Responsive

- **Desktop Amplio (≥1440px):** Grilla completa con todas las columnas visibles en modo extremo o 15 columnas holgadas. Franja de bandeja con textos largos (`label-long`).
- **Desktop Compacto / Laptops (1024px – 1366px):** Las etiquetas de acciones en la bandeja conmutan automáticamente a texto corto (`label-short`). Scroll horizontal contenido dentro del viewport de la tabla manteniendo fijas las 3 columnas izquierdas y la columna derecha.
- **Tablet / Mobile:** Scroll táctil con aceleración inercial (`-webkit-overflow-scrolling: touch`), columnas sticky adaptadas.

---

## 18. Diseño Visual Actual

- **Paleta Canónica OSSUM:**
  - Primario / Fondos: Navy OSSUM `#071935`, Superficie `#FFFFFF`, Fondo App `#EEF0F3`.
  - Acción / Selección: Azul Acción `#1D2FC0`, Fondo de Selección `#EEF0FF`, Borde Selección `#1D2FC0`.
  - Neutros Fríos: Bordes `#E2E8F0`, Textos `#1E293B`, Muted `#64748B`.
- **Física de Microinteracciones (Animated UX):**
  - Transición de fila: `140ms cubic-bezier(0.2, 0, 0, 1)`.
  - Despliegue de bandeja: `200ms cubic-bezier(0.2, 0, 0, 1)`.
  - Modal pop: `150ms cubic-bezier(0.16, 1, 0.3, 1)`.
  - Fade de refresco en grilla: `120ms`.
  - Soporte para `@media (prefers-reduced-motion: reduce)`.

---

## 19. Duplicación y Deuda Técnica

| Hallazgo | Ubicación | Impacto | Riesgo | Posible destino futuro |
|---|---|---|---|---|
| Monolito de 3.470 líneas | `referencias-ux/cirugias.html` | Dificultad de mantenimiento | HIGH | Modularizar en componentes React / Next.js |
| Dataset mock incrustado | `cirugias.html` (L2122-2898) | Peso innecesario en el archivo | LOW | Mover a `surgeries.mock.ts` o consumir API |
| Renderizado imperativo con `innerHTML` | `renderRows()`, `syncContextTray()` | Riesgo XSS y acoplamiento | MEDIUM | Componentes declarativos React con props tipadas |
| Duplicación de lógica de colores de estado | CSS (L591-848) y JS `getStatusKey` | Drift si se agrega un nuevo estado | MEDIUM | Token centralizado `surgeryStatusConfig.ts` |

---

## 20. Mapa de Responsabilidades

| Responsabilidad | Código actual | Dependencias | Candidato futuro | Riesgo |
|---|---|---|---|---|
| Tokens de Diseño y CSS Grid | L11 - L1593 | Variables CSS | `globals.css` / CSS Modules | LOW |
| Cabecera y Controles de Exploración | L1601 - L1670 | Segmented controls | `SurgeryHeaderControls.tsx` | LOW |
| Barra de Pestañas de Casuística (Tabs) | L1671 - L1699 | `currentTab` | `SurgeryOpTabs.tsx` | LOW |
| Grilla Tabular con Sticky Columns | L1700 - L1712, `renderRows()` | `CIRUGIAS`, Paginación | `SurgeryDenseGrid.tsx` | MEDIUM |
| Micro-badge e Indicadores de Urgencia | L581 - L590, `renderRows()` | `prioridad` | `SurgeryPriorityBadge.tsx` | LOW |
| Celda de Estado CX (Multi-variante) | L591 - L848 | `estado` | `SurgeryStatusCell.tsx` | LOW |
| Bandeja Contextual Inferior (Tray) | L1714 - L1795, `syncContextTray()` | `selectedCxId` | `SurgeryContextTray.tsx` | MEDIUM |
| Paginación Compacta | L1796 - L1818, `updatePaginationFooter()` | `currentPage`, `pageSize` | `SurgeryPaginationFooter.tsx` | LOW |
| Modal de Documentación | L1820 - L1890 | Modales CSS | `SurgeryDocsModal.tsx` | LOW |
| Modal de Registro de Novedades | L1891 - L1940, `submitNewNovedad()` | Dataset local | `SurgeryNovedadModal.tsx` | LOW |
| Menú Flotante de Acciones (`···`) | L1942 - L1960 | Popover CSS | `SurgeryRowActionsMenu.tsx` | LOW |

---

## 21. Riesgos

- **HIGH:** Acoplamiento de estado local en el monolito HTML. Moverlo a React requiere separar limpiamente el hook de datos (`useSurgeries`) del hook de UI (`useSurgeryTableConfig`).
- **MEDIUM:** Coordenadas sticky en tabla. Si se alteran los anchos de `ID CX` (88px), `Estado CX` (115px) o `Paciente` (170px) sin recalcular `left: 88px` y `left: 203px`, las columnas se superpondrán durante el scroll horizontal.
- **LOW:** Comportamiento responsive en resoluciones estándar (1366x768). Ya validado y testeado con clases de texto corto (`.label-short`).

---

## 22. Fronteras de Modularización

Estructura de destino recomendada para la integración en el proyecto React / Next.js de OSSUM COR:

```text
src/app/(dashboard)/cirugias/
├── page.tsx                           # Contenedor principal y composición
├── components/
│   ├── SurgeryHeaderControls.tsx       # Título, buscador y switches de personalización
│   ├── SurgeryOpTabs.tsx              # Barra de pestañas operativas (Urgentes, Sin fecha, etc.)
│   ├── SurgeryDenseGrid.tsx           # Tabla principal con sticky columns y rows
│   ├── SurgeryStatusCell.tsx          # Renderizado de celda Estado CX (Barra/Celda/Punto)
│   ├── SurgeryPriorityBadge.tsx       # Micro-badge URG y estilos de fila
│   ├── SurgeryRowActions.tsx          # Botón contextual de fila + trigger de menú
│   ├── SurgeryContextTray.tsx         # Bandeja inferior (Franja, Materiales, Novedades)
│   ├── SurgeryPaginationFooter.tsx    # Paginación compacta integrada al footer
│   ├── modals/
│   │   ├── SurgeryDocsModal.tsx       # Modal imprimir/descargar documentos
│   │   └── SurgeryNovedadModal.tsx    # Modal alta de novedades operativas
│   └── menus/
│       └── SurgeryRowMoreActions.tsx  # Popover flotante ···
├── hooks/
│   ├── useSurgeries.ts                # Fetching, filtrado y mutaciones de cirugías
│   ├── useSurgeryTableConfig.ts       # Densidad, columnas (15 vs 22), variante CX
│   └── useSurgeryPagination.ts        # Control de páginas y tamaño de página
├── types/
│   └── surgery.types.ts               # Interfaces y tipos de Cirugia, Material, Novedad
└── constants/
    └── surgeryStatusConfig.ts         # Colores, estilos y mapeo de estados CX
```

---

## 23. Secuencia Segura de Extracción

1. **Paso 1 (Tipos y Constantes):** Extraer `surgery.types.ts` y `surgeryStatusConfig.ts` con la paleta de colores de los 8 estados y candidatos A/B de Sin consumo.
2. **Paso 2 (Componentes Puros de UI):** Extraer `SurgeryPriorityBadge`, `SurgeryStatusCell` y `SurgeryPaginationFooter`.
3. **Paso 3 (Modales Autocontenidos):** Extraer `SurgeryDocsModal` y `SurgeryNovedadModal`.
4. **Paso 4 (Bandeja Contextual):** Extraer `SurgeryContextTray` recibiendo la cirugía seleccionada como prop.
5. **Paso 5 (Filtros y Header):** Extraer `SurgeryHeaderControls` y `SurgeryOpTabs`.
6. **Paso 6 (Grilla Principal y Menú Popover):** Construir `SurgeryDenseGrid` integrando las celdas sticky y `SurgeryRowMoreActions`.
7. **Paso 7 (Hooks de Estado y Datos):** Ensamblar `useSurgeryTableConfig` y `useSurgeries`.
8. **Paso 8 (Composición en Page):** Limpiar `page.tsx` conectando los hooks y componentes.

---

## 24. Validaciones Recomendadas

- **Validación Visual de Sticky Columns:** Verificar que al hacer scroll horizontal a la derecha, las columnas `ID CX`, `Estado CX` y `Paciente` permanezcan fijas sin parpadeos, y la columna `Acción` permanezca fija a la derecha.
- **Validación de Selección y Bandeja Contextual:** Confirmar que al hacer click en cualquier fila, la selección responda en 140ms y los datos de materiales y novedades se actualicen en la bandeja con su fade característico.
- **Validación de Filtros Op-Tabs:** Confirmar que al conmutar entre `Urgentes`, `Sin fecha`, `Sin PR`, etc., la paginación vuelva automáticamente a la página 1 y la grilla muestre la animación `gridFade`.
- **Validación de Micro-badge Urgente:** Asegurar que las filas urgentes mantengan su borde rojo `#DC2626`, fondo `#FFF9F9` y badge `URG` en ambos modos de columnas (15 y 22).
- **Validación de Paginación:** Probar conmutación de 50 a 25/100 por página y navegación de páginas anterior/siguiente.

---

## Handoff para siguiente agente

### Estado actual
El prototipo `referencias-ux/cirugias.html` es una referencia UX/UI completa, funcional y calibrada en detalle (incluyendo la semántica de 8 estados de cirugía, tratamiento de alta precisión de urgencias, paginación integrada y microinteracciones de 110–200ms).

### Responsabilidades detectadas
- **Grilla de alta densidad:** 3 columnas sticky a la izquierda, 1 a la derecha, personalizable en 15 o 22 columnas y densidades estándar (32px) / compacta (26px).
- **Bandeja contextual inferior:** Sincronización instantánea del caso seleccionado con vista rápida de materiales y novedades.
- **Flujo de acciones y modales:** Acciones contextuales directas de Nivel 1 y modales auxiliares de Nivel 3.

### Partes de bajo riesgo
- Constantes de colores y estilos semánticos (`surgeryStatusConfig.ts`).
- Componentes de micro-badge, celdas de estado y paginador.
- Modales auxiliares de documentación y novedades.

### Partes de alto riesgo
- Coordenadas exactas de columnas sticky en CSS (`0px`, `88px`, `203px`).
- Sincronización de selección de fila y scroll interno del contenedor.
- Integración de la API de backend sin perder la fluidez de las microinteracciones de 140ms.

### Orden recomendado de modularización
1. Tipos e interfaces (`surgery.types.ts`).
2. Configuración de estados (`surgeryStatusConfig.ts`).
3. Celdas y badges (`SurgeryStatusCell`, `SurgeryPriorityBadge`).
4. Paginador (`SurgeryPaginationFooter`).
5. Modales (`SurgeryDocsModal`, `SurgeryNovedadModal`).
6. Bandeja contextual (`SurgeryContextTray`).
7. Header y Tabs (`SurgeryHeaderControls`, `SurgeryOpTabs`).
8. Grilla principal (`SurgeryDenseGrid`).
9. Hooks de estado y orquestación (`useSurgeries`, `page.tsx`).

### Qué NO modificar durante la primera extracción
- **NO alterar los anchos ni coordenadas de las columnas sticky:** `ID CX` (88px), `Estado CX` (115px), `Paciente` (170px), `Acción` (90px).
- **NO cambiar la paleta semántica ni los nombres de los 8 estados de cirugía.**
- **NO eliminar la paginación ultra compacta del footer de la grilla.**
- **NO modificar los tiempos calibrados de Animated UX:** Selección (140ms), Tray (200ms/140ms), Modales (150ms).

### Primera extracción recomendada
Extraer los contratos de datos y tokens de configuración:
- `src/types/surgery.types.ts`
- `src/constants/surgeryStatusConfig.ts`
- `src/components/cirugias/SurgeryPriorityBadge.tsx`
- `src/components/cirugias/SurgeryStatusCell.tsx`
