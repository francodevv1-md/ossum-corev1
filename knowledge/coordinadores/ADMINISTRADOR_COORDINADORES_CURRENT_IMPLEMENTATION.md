# OSSUM COR - Administrador de Coordinadores
## CURRENT_IMPLEMENTATION.md

> **Documento de Auditoría y Especificación Técnica del Prototipo Validado**  
> **Archivo fuente:** `referencias-ux/administrador-coordinadores.html`  
> **Skill aplicada:** `ossum-module-documentation`  
> **Pregunta rectora:** *“¿Dónde debo intervenir?”*  
> **Actor principal:** Supervisor de Operaciones / Administrador de Coordinadores  

---

## 1. Resumen general

El módulo **Administrador de Coordinadores** es el centro de control y supervisión operativa de OSSUM COR. Su propósito no es la gestión directa paso a paso de cada caso, sino proveer a los supervisores una vista agregada y densa de todo el equipo de coordinación para responder de inmediato: **“¿Dónde debo intervenir?”**.

Permite detectar cuellos de botella, cirugías sin fecha confirmada, pedidos fuera de plazo, estados de preparación de material congelados o sin iniciar, y desbalances de carga entre los coordinadores asignados.

### Estado general

- **Madurez:** Prototipo UX/UI Standalone de Alta Fidelidad (HTML5, CSS Vanilla, JavaScript Vanilla en memoria).
- **Fuente de datos:** En memoria (`const SURGERIES = [...]` de 10 casos estructurados).
- **Dependencias críticas:** Google Fonts (Inter, JetBrains Mono). Sin frameworks externos.
- **Riesgo general:** `LOW` como referencia UX/UI; `HIGH` al momento de migración a React/Next.js debido a los múltiples estados combinados de filtros y modales editables.

---

## 2. Archivos involucrados

| Archivo | Responsabilidad | Tipo | Riesgo | Notas |
|---|---|---|---|---|
| `referencias-ux/administrador-coordinadores.html` | Prototipo integral y funcional del Administrador | Page / App | `LOW` | Archivo fuente validado, 100% interactivo en navegador |
| `knowledge/coordinadores/ADMINISTRADOR_COORDINADORES_CURRENT_IMPLEMENTATION.md` | Documentación técnica y handoff de modularización | Documentation | `LOW` | Este documento |

---

## 3. Recorrido estructural del código

### Bloque: Design System & Tokens CSS (`:root`)
- **Líneas aproximadas:** 11–64
- **Responsabilidad:** Define la paleta corporativa OSSUM (`--navy-ossum: #071935`, `--blue-action: #1D2FC0`, `--blue-selection: #EEF0FF`), semáforos (`--sem-success`, `--sem-warning`, `--sem-danger`, `--sem-info`), bordes y sombras (`--shadow-modal`, `--shadow-drawer`).
- **Estado:** `IMPLEMENTADO`

### Bloque: Header Superior (`.top-bar`)
- **Líneas aproximadas:** 94–160
- **Responsabilidad:** Identificación institucional, badge "Centro de Control", rol "Administrador" y enlace de navegación hacia la vista operativa de Coordinación (`coordinacion.html`).
- **Estado:** `IMPLEMENTADO`

### Bloque: Franja Superior de Alertas e Incidencias (`.incidents-bar`)
- **Líneas aproximadas:** 165–239
- **Responsabilidad:** Barra de acceso rápido a métricas críticas: *Fuera de plazo*, *Poner fecha*, *En tránsito*, *Sin asignar*, *Coordinadas*. Funciona como filtro toggle reactivo.
- **Estado:** `IMPLEMENTADO`

### Bloque: Panel de Control Temporal y Toolbar de Filtros (`.control-panel`)
- **Líneas aproximadas:** 240–505
- **Responsabilidad:** 
  1. *Línea 1 Temporal:* Selector Día / Semana / Mes + controles `‹`, `Hoy`, `›` + título dinámico del período y conteo de cirugías visibles.
  2. *Línea 2 Filtros:* Búsqueda global (`input`), dropdowns multi-select (Coordinador, Estado, Preparación, Más filtros), toggle `Solo incidencias` y botón `Limpiar`.
- **Estado:** `IMPLEMENTADO`

### Bloque: Vista Día - Tabla Desktop de Alta Densidad (`.desktop-table-wrap`)
- **Líneas aproximadas:** 506–640, 1499–1530
- **Responsabilidad:** Renderiza la grilla con 8 columnas operativas: Fecha/Hito, CX, Paciente/Médico/Institución, Coordinador, Estado & Prep, Pendiente Principal, Novedades/Último Evento, Acciones.
- **Estado:** `IMPLEMENTADO`

### Bloque: Vista Día - Cards Mobile (`.mobile-case-card`)
- **Líneas aproximadas:** 641–885, 2570–2641
- **Responsabilidad:** Tarjetas densas con jerarquía de 5 bloques: 
  1. Hito temporal + ID CX
  2. Paciente + Coordinador
  3. Pendiente operativo / Alerta requerida
  4. Grid de metadatos (Cliente, Médico, Lugar, Otras fechas)
  5. Chips Estado/Prep + Botón primario azul `Gestionar`
- **Estado:** `IMPLEMENTADO`

### Bloque: Vistas Semana y Mes (`.week-view-container`, `.month-view-container`)
- **Líneas aproximadas:** 1012–1136, 2692–2795
- **Responsabilidad:** 
  - *Semana:* Agenda vertical agrupada por día con conteo de casos y alertas.
  - *Mes:* Calendario mensual 7×N con píldoras de carga semaforizadas (Verde/Ámbar/Rojo) y badges de alerta por día.
- **Estado:** `IMPLEMENTADO`

### Bloque: Modal Centrado de Gestión y Seguimiento (`.case-detail-modal`)
- **Líneas aproximadas:** 1137–1460, 2870–3018
- **Responsabilidad:** Modal flotante centrado en pantalla (en mobile `calc(100% - 24px)` hasta 520px; en desktop 820px). Posee cabecera fija, barra de metadatos rápidos, navegación por pestañas (`Gestión`, `Seguimiento`, `Adjuntos`), cuerpo con scroll interno y footer con acciones (`Guardar Cambios`, `Cerrar`).
- **Estado:** `IMPLEMENTADO`

### Bloque: Lógica JavaScript y Estado en Memoria (`<script>`)
- **Líneas aproximadas:** 2270–3027
- **Responsabilidad:** Filtrado multidimensional, renderizado de vistas, apertura/cierre de modal con bloqueo de scroll, captura de foco y eventos de teclado (<kbd>Escape</kbd>).
- **Estado:** `IMPLEMENTADO` (Datos mock en memoria)

---

## 4. Estados locales de la aplicación

| Estado | Tipo | Inicial | Se modifica en | Lo consume | Candidato futuro |
|---|---|---|---|---|---|
| `selectedSurgeryId` | `string \| null` | `null` | `openDrawer()`, `closeDrawer()` | Modal de detalle, selección de fila/card | `useSurgeryStore` / URL State |
| `currentView` | `"day" \| "week" \| "month"` | `"day"` | `switchView()` | Layout principal de vistas | `useViewMode` |
| `soloIncidencias` | `boolean` | `false` | `toggleSoloIncidencias()`, `clearAllFilters()` | Pipeline de filtrado | `useFilterStore` |
| `selectedCoordinators` | `string[]` | `[]` | `onCoordFilterChange()`, `clearAllFilters()` | Pipeline de filtrado | `useFilterStore` |
| `selectedStates` | `string[]` | `[]` | `onStateFilterChange()`, `clearAllFilters()` | Pipeline de filtrado | `useFilterStore` |
| `selectedPreps` | `string[]` | `[]` | `onPrepFilterChange()`, `clearAllFilters()` | Pipeline de filtrado | `useFilterStore` |
| `activeIncidentFilter` | `string \| null` | `null` | `toggleIncidentFilter()`, `clearAllFilters()` | Franja superior de incidencias | `useFilterStore` |
| `activeModalTab` | `"gestion" \| "seguimiento" \| "adjuntos"` | `"gestion"` | `switchModalTab()` | Navegación interna del modal | Estado local del Modal |
| `lastFocusedElement` | `HTMLElement \| null` | `null` | `openDrawer()`, `closeDrawer()` | Gestión de accesibilidad y foco | Hook `useModalA11y` |

---

## 5. Datos derivados y pipelines

1. **`filtered` (Cirugías filtradas en vista Día):**
   - **Entrada:** `SURGERIES`, `searchVal`, `soloIncidencias`, `activeIncidentFilter`, `selectedCoordinators`, `selectedStates`, `selectedPreps`.
   - **Salida:** Array de cirugías coincidentes.
   - **Propósito:** Alimenta simultáneamente la tabla desktop y la lista de cards mobile.
2. **`visible-count` / `alert-count`:** Contadores reactivos reflejados en el título de período y badges de cabecera.
3. **`monthDays` (Matriz del calendario mensual):** Mapeo de 35 celdas con semáforo calculado según volumen (`d.count >= 6` ámbar, `d.count > 10` rojo).

---

## 6. Vistas principales

### Vista Día
- **Desktop (≥ 768px):** Tabla operativa densa con filas resaltadas por borde rojo izquierdo (`row-alert`) si requieren atención. Hover con `#f8fafc` y selección con `#EEF0FF`.
- **Mobile (< 768px):** Listado de tarjetas estructuradas en 5 niveles con botón directo `Gestionar`.

### Vista Semana
- Agenda vertical de lunes a sábado.
- Agrupa las cirugías por día mostrando píldora "Hoy", contador de cirugías y badges de alertas.

### Vista Mes
- Matriz mensual de 7 columnas (Lun a Dom).
- Semáforo de carga operativo por día para balancear el quirófano y distribución de material.

---

## 7. Columnas y prioridad temporal

Lógica de priorización temporal implementada en `renderFechaBlock(c)`:
1. **Fecha de Envío:** Si está definida y próxima, se destaca con tag azul `tag-envio`.
2. **Fecha Probable:** Si no hay fecha definitiva confirmada, tag violeta `tag-probable`.
3. **Fecha de Cirugía (CX):** Fecha confirmada + hora (`HH:mm`), tag neutro `tag-cx`.
4. **Sin Fecha:** Alerta roja prioritaria `tag-urgent` (`Sin fecha · Definir`).

---

## 8. Modal de Gestión y Seguimiento

El modal concentra la intervención del supervisor sin abandonar el contexto de la bandeja.

### Configuración Responsive y Validación Mobile:
- **Centrado absoluto:** `top: 50%; left: 50%; transform: translate(-50%, -50%);` tanto en desktop como en mobile.
- **Dimensiones mobile:** Ancho flotante `calc(100% - 24px)` con `max-width: 520px` y `max-height: 88vh`.
- **Dimensiones desktop:** `width: 820px; max-width: 95vw; max-height: 85vh;` en layout de 2 columnas (`.detail-grid-layout`).
- **Scroll interno:** `modal-body-scroll` con `min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;`.
- **Bloqueo de fondo:** Activación de `body.modal-open` (`overflow: hidden !important; height: 100vh !important; touch-action: none !important;`).
- **Cierre múltiple:** Botón `✕`, clic en el backdrop oscuro y tecla <kbd>Escape</kbd>.
- **Retorno de foco:** Retorna automáticamente el foco al elemento disparador (`lastFocusedElement.focus()`).

### Pestañas del Modal:
1. **Gestión (`#pane-gestion`):** Formulario editable con fecha CX, hora, selector de coordinador, estado de cirugía, preparación de material, disponibilidad y notas rápidas.
2. **Seguimiento (`#pane-seguimiento`):** Línea de tiempo cronológica de novedades del expediente con píldoras horarias monoespaciadas y campo para registrar nuevas notas.
3. **Adjuntos (`#pane-adjuntos`):** Listado de documentación vinculada (Protocolos, Pedidos de material, Remitos).

---

## 9. Validación mobile documentada

Viewports testeados y certificados:

| Viewport | Ancho útil modal | Altura máx. (`88vh`) | Centrado y Márgenes | Scroll Interno |
| :--- | :--- | :--- | :--- | :--- |
| **360 × 800** | `336px` | `704px` | Centrado exacto, 12px de margen lateral | Fluido en `modal-body-scroll`, sin desbordes |
| **390 × 844** | `366px` | `742px` | Centrado exacto, 12px de margen lateral | Fluido, lectura clara de formularios |
| **430 × 932** | `406px` | `820px` | Centrado exacto, acotado a 520px máx. | Espacioso, acciones y tabs accesibles |

---

## 10. Riesgos detectados

- `HIGH`: Al migrar a React, evitar acoplar el formulario de edición (`saveGestionForm`) directamente a mutaciones locales en memoria sin validación de esquema Zod.
- `MEDIUM`: La vista mensual calcula las cargas en memoria. En producción, los agregados por día deben resolverse mediante endpoint de agregación backend para evitar transferir payloads masivos.
- `LOW`: Estilos de selectores nativos y dropdowns personalizados requieren unificación con Radix UI / Headless UI en la versión final.

---

## 11. Propuesta de modularización para React/Next.js

```text
src/
├── app/
│   └── (operaciones)/
│       └── coordinadores/
│           ├── page.tsx                           # Server Component / Metadata
│           └── CoordinadoresAdminClient.tsx       # Client Component orquestador
├── components/coordinadores/
│   ├── topbar/
│   │   ├── AdminTopBar.tsx
│   │   └── IncidentsMetricsStrip.tsx
│   ├── controls/
│   │   ├── TimelinePeriodNavigator.tsx
│   │   ├── ViewModeSwitcher.tsx
│   │   └── FiltersToolbar.tsx
│   ├── views/
│   │   ├── DayViewDesktopTable.tsx
│   │   ├── DayViewMobileCards.tsx
│   │   ├── WeekViewGroupedView.tsx
│   │   └── MonthLoadCalendar.tsx
│   └── modal/
│       ├── CaseDetailModal.tsx
│       ├── CaseDetailModalHeader.tsx
│       ├── TabPaneGestion.tsx
│       ├── TabPaneSeguimiento.tsx
│       └── TabPaneAdjuntos.tsx
├── hooks/
│   ├── useCoordinadoresFilters.ts
│   ├── useSurgeryModalA11y.ts
│   └── useTemporalNavigation.ts
└── types/
    └── coordinadores.types.ts
```

---

## Handoff para siguiente agente

### Estado actual
El archivo `referencias-ux/administrador-coordinadores.html` está 100% validado y operativo en browser.

### Responsabilidades detectadas
- Supervisión global de coordinadores.
- Identificación de bloqueos y alertas operativas.
- Reasignación de coordinadores y modificación de estados desde el modal de gestión.

### Partes de bajo riesgo
- Header superior, navegación Día/Semana/Mes, chips semánticos de estado.

### Partes de alto riesgo
- Sincronización bidireccional entre la tabla y el modal de edición de datos de cirugía.

### Orden recomendado de extracción
1. Tipos e interfaces en `coordinadores.types.ts`.
2. Componentes visuales atómicos (chips, badges, píldoras temporales).
3. `IncidentsMetricsStrip` y `FiltersToolbar`.
4. `DayViewDesktopTable` y `DayViewMobileCards`.
5. `CaseDetailModal` con sus 3 pestañas.
6. `WeekViewGroupedView` y `MonthLoadCalendar`.
