---
name: ossum-responsive-density
description: Enforce ERP operational density and adaptive responsive rules across OSSUM COR. Prevents oversized consumer-SaaS UIs, guarantees comfortable layouts on 1366x768 (19"), 1080p, 1440p, and mobile 390x844 without scaling hacks.
version: 1.0.0
user-invocable: true
argument-hint: "[component-or-page-path]"
---

# OSSUM Responsive Density

Standards for operational density, responsive architecture, and layout ergonomics across OSSUM COR.

---

## 1. Filosofía de Producto: ERP Operativo vs. Consumer SaaS

OSSUM COR es un **ERP operativo de salud y distribución quirúrgica**, no una landing page ni una app consumer B2C:

- **Propósito**: El operador (administrativo, despachante, instrumentador, facturador) pasa 8 horas diarias procesando expedientes, cirugías, remitos y facturas.
- **Prioridad**: La densidad informativa, la escaneabilidad visual rápida y la predictibilidad del layout están por encima del whitespace decorativo.
- **Filosofía de escala**: **Las pantallas grandes deben mostrar más información en simultáneo, nunca componentes o márgenes proporcionalmente más grandes.**

---

## 2. Viewports Obligatorios y Validación Visual

Toda superficie visual de OSSUM COR debe validar en estos cinco escalones operativos:

| Viewport | Escenario Típico | Expectativa de Comportamiento |
| :--- | :--- | :--- |
| **`390 × 844`** | iPhone / Smartphone de terreno | **Reorganización, no compresión**. Pasa a flujo vertical optimizado para una mano, drawers inferiores (`Vaul`), tarjetas táctiles (`min-h-11`). |
| **`1366 × 768`** | **Resolución base operativa** (monitores 19" de mostrador, notebooks corporativas) | **El flujo principal debe verse completo sin scroll innecesario**. Los diálogos y modales no deben requerir scroll para llegar a los datos esenciales o botones de acción. |
| **`1600 × 900`** | Laptops 15" y monitores HD intermedios | Transición suave, espacio cómodo para rieles laterales colapsables. |
| **`1920 × 1080`** | Monitores Full HD estándar | Expansión en capacidad informativa: más columnas visibles en tablas, paneles auxiliares visibles sin sofocar el formulario. |
| **`2560 × 1440`** | Monitores 2K / ultrawide de supervisión | Mayor cantidad de filas, visualización multi-columna o dashboards paralelos. **Prohibido estirar inputs o tarjetas a anchos descomunales** (`max-w-*` estricto en formularios). |

---

## 3. Reglas Técnicas y Antipantrones Prohibidos

### 🚫 Antipantrones Prohibidos
1. **PROHIBIDO usar `transform: scale()` o `zoom`** para forzar responsive. Provocan texto borroso, distorsión de coordenadas de popovers/tooltips y fallas de accesibilidad.
2. **PROHIBIDO achicar solo el `font-size`**. Si un formulario no entra, el problema es el padding, el gap o la disposición en columnas, no el tamaño de la letra.
3. **PROHIBIDO `p-6` y `gap-6` en interfaces operativas**. Generan lagunas vacías que empujan los controles fuera de la pantalla en 1366×768.
4. **PROHIBIDO cards anidadas con múltiples bordes**. Cada nivel de tarjeta anidada roba entre 32px y 64px de ancho útil.
5. **PROHIBIDO banners estáticos de texto explicativo que ocupen 50% del ancho**. La información secundaria, explicaciones o avisos de IA deben usar `<HelpTip />`, micro-copy de una línea o progressive disclosure (acordeones / botones de expansión).

---

## 4. Métricas Canónicas de Densidad Operativa

Reutilizar y respetar la escala de diseño Tailwind:

### Dimensiones de Controles en Desktop (≥ 1024px)
- **Inputs estándar / Selects / Comboboxes**: `h-8` a `h-8.5` (`32px–34px`), tipografía `text-xs sm:text-sm`.
- **Botones de acción principal (Submit, Guardar)**: `h-8` a `h-9` (`32px–36px`), `px-3 sm:px-4`.
- **Botones secundarios / de tabla / de toolbar**: `h-7` a `h-8` (`28px–32px`), `px-2.5`.
- **Iconos dentro de botones/inputs**: `size-3.5` a `size-4`.
- **Separación entre filas/campos**: `space-y-3` a `space-y-4` (evitar `space-y-6`).
- **Gaps de grids**: `gap-3 sm:gap-4.5` (evitar `gap-6` o `gap-8`).
- **Padding interno de tarjetas/secciones**: `p-3.5 sm:p-5`.

### Dimensiones en Mobile (≤ 640px)
- **Targets táctiles**: mínimo `44px` (`h-11`) para inputs y botones interactivos principales.
- **Grids**: colapso automático a `grid-cols-1`.
- **Contenedores**: `px-3 py-3`.

---

## 5. Uso de Container Queries (`@container`)

Cuando un componente se renderice dentro de un contenedor de ancho variable (por ejemplo: un modal con sidebar de IA colapsable, un panel de expediente o un drawer), **debe responder al ancho de su contenedor, no al viewport general**:

```tsx
// Contenedor padre
<div className="@container/form w-full">
  {/* Hijo adaptable al ancho real disponible */}
  <div className="grid grid-cols-1 @[640px]/form:grid-cols-2 @[1024px]/form:grid-cols-3 gap-3.5">
    {/* Campos */}
  </div>
</div>
```

Esto garantiza que si el riel lateral de IA se abre y reduce el espacio del formulario de 1000px a 650px, los campos se reacomoden automáticamente sin desbordes.

---

## 6. Información Secundaria y Asistencias de IA

1. **Rieles y paneles laterales**: Iniciar cerrados o colapsados por defecto en pantallas de menos de 1600px de ancho para no asfixiar el trabajo principal.
2. **Indicadores de estado**: Usar badges compactos (`text-[10px] px-1.5 py-0`) en la cabecera del bloque.
3. **Ayuda contextual**: Utilizar exclusivamente la skill `ossum-contextual-help` (`<HelpTip text="..." />`) para aclaraciones operativas. Cero tarjetas de ayuda fijas que resten área de captura.

---

## 7. Quality Gate: Browser QA Obligatorio

Ninguna tarea que modifique o cree componentes de interfaz de usuario se considera terminada sin cumplir este checklist de cierre:

1. **[ ] Verificación en 1366 × 768**:
   - Abrir el diálogo o pantalla a 1366×768.
   - Confirmar que los inputs compuestos (como selectores de contacto con badges o botones de acción) no se truncan ni se rompen en varias líneas.
   - Confirmar que los botones de acción primarios son visibles o fácilmente alcanzables con un scroll mínimo.
2. **[ ] Verificación en 1920 × 1080**:
   - Confirmar que no hay vacíos sobredimensionados ni inputs estirados a lo ancho sin límite (`max-w-xl` o `max-w-2xl`).
3. **[ ] Verificación en 390 × 844** (si la pantalla tiene soporte móvil):
   - Confirmar que no hay desbordes horizontales (`overflow-x: hidden`).
   - Confirmar que los botones de toque cumplen ergonomía táctil.
