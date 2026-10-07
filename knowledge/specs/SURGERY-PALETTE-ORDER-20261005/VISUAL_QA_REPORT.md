# OSSUM COR — Reporte de QA Visual y Auditoría Estática de Paleta de Cirugías

- **Tarea**: SURGERY-PALETTE-ORDER-20261005
- **Rol**: Antigravity — Visual QA & Static Audit
- **Fecha**: 2026-10-05
- **Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
- **Base HEAD**: `21385527dcfbc6ebc5b1507096d03a2c402d8c4d`
- **Modo de QA**: Auditoría visual estática y validación de componentes sintéticos (aislado offline). Sin ejecución E2E sobre DEV5000/DB (Sol1 hold activo).

---

## 1. Hashes de Archivos Auditados

| Archivo | SHA256 |
| --- | --- |
| `src/lib/shared-constants.ts` | `906E4CB9E8D6E1DC2D082C41E8371343C9D7C3D996DAE35430231854B00EADD3` |
| `src/lib/cirugias.constants.ts` | `7769D0852BA40FB3EA25324926EA1F111EF3D0E1C1902E9393C4640277E84D29` |
| `src/lib/cirugias/cirugias-columns.tsx` | `F061CF915E2DA58771B4A556A6070A8CE0C1F81C364947D243A77E6B16E9DDF6` |
| `src/components/cirugias/CirugiaStatusCell.tsx` | `EC10DF22FCFFB8C33AF8C7E445F1954D00A3F8FE30A4987E417250AE98886047` |
| `src/components/cirugias/CirugiaRow.tsx` | `B19D2C7D195F756641AF3BFD702B73FA232F394F708DB8A4DD2715B2F18DF7EE` |
| `src/components/cirugias/CirugiasGridRow.tsx` | `A6C4601031E0DE1CC5BB39C3D2001E36C87F76B22023FD7802E0793E45D5A51A` |
| `src/components/cirugias/MobileCirugiaCard.tsx` | `A4621F9F50B9C21CE698D621AD7B87FD577886222ECCE6B045A167917CCC4391` |
| `src/components/cirugias/view-customization/ColorReferenceDialog.tsx` | `DE7AA7A0A86CEA3CFE63A95F7EDD5AC319B485AAFE6C496FD562850AADE9DEE2` |
| `src/components/expediente/ExpedienteHeader.tsx` | `EFCA958BDE2F098F787D396F311CBE2362AF898141F0BE3772920D992B966F60` |
| `src/__tests__/components/SurgeryPalette.test.tsx` | `2A62AE01C034D88416A93C7A403D01AE3C1904EB6068A948D587C84340668380` |

### Comando de Reproducción / Replay

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/components/SurgeryPalette.test.tsx src/__tests__/unit/cirugias-estado-prep-separation.test.ts
```

---

## 2. Matriz de Verificaciones Visuales

| Verificación | Estado | Evidencia y Observaciones |
| --- | --- | --- |
| **Secuencia canónica de 8 colores** (Blanco → Amarillo → Celeste → Verde → Azul oscuro → Violeta → Borravino → Gris) | **PASS** | `ALL_STATES` respeta el orden estricto: `Sin autorizar` / `Sin fecha` (blanco), `Pendiente` / `Autorizada` (amarillo), `En tránsito` (sky-300), `Realizada` (emerald-700), `Finalizada` (blue-800), `Suspendida` (violet-600), `Cancelada` (rose-900), `Sin consumo` (gray-600). |
| **Tratamiento Celda y Fila en Cirugías** (`CirugiaStatusCell`, `CirugiasGridRow`, `CirugiaRow`) | **PASS** | Variantes A, B, C y D implementadas. En la grilla (`CirugiasGridRow`), la fila completa proyecta `--row-bg` y `--row-dark-bg` armónicos según `CX_STATE_VISUALS`. |
| **Mobile Surgery Card** (`MobileCirugiaCard`) (360px / 390px) | **PASS** | Pill superior con `CX_STATE_COLORS[getCxStateColorKey(state, date)]`. Texto legible en slate-900 para blanco/amarillo y blanco para tonos oscuros. |
| **Ficha Header** (`ExpedienteHeader`) | **PASS / DEFECTO MENOR** | Botón de estado utiliza `cxVisual.strongClass`. En estados blancos ("Sin autorizar" / "Sin fecha"), falta borde explícito en light mode contra fondo blanco (ver Defecto 1). |
| **Dialog Guía de Colores** (`ColorReferenceDialog`) | **PASS** | Renderiza `ALL_STATES` en orden canónico, scroll `overflow-y-auto`, bordes `border-slate-300` en badges blancos, categorías legibles, foco de cierre accesible. |
| **Temas Claro y Oscuro** | **PASS** | `darkRowTint` y `darkHoverTint` definidos en `CX_STATE_VISUALS` para modo oscuro (ej. `#18140c` para amarillo, `#07162d` para azul, `#051c17` para verde, `#0d131d` para neutros). |
| **Estados Sin autorizar y Sin fecha (Blanco)** | **PASS** | `bg-white text-slate-900 border border-slate-300` en `CX_STATE_COLORS`; `strongClass: "bg-white text-slate-900 font-bold"` en `CX_STATE_VISUALS`. Máxima legibilidad. |
| **Autorizada sin fecha vs. con fecha** | **PASS** | Sin fecha: blanco (`#FFFFFF` / `bg-white text-slate-900`). Con fecha: amarillo (`#FACC15` / `bg-yellow-400 text-slate-900`). Conserva siempre el label "Autorizada" sin mutar el dato. |
| **Diferenciación En tránsito vs. Finalizada** | **PASS** | `En tránsito`: celeste claro (`bg-sky-300 text-slate-900` / `#7DD3FC`). `Finalizada`: azul oscuro profundo (`bg-blue-800 text-white` / `#1E40AF`). Contraste cromático inequívoco. |
| **Cancelada y Sin consumo** | **PASS** | `Cancelada`: borravino (`bg-rose-900 text-white` / `#881337`). `Sin consumo`: gris medio (`bg-gray-600 text-white` / `#4B5563`). |
| **9na categoría (usuarios no autorizantes)** | **PASS** | Diferida explícitamente según instrucción; no fue agregada ni se alteraron permisos. |
| **Vistas legacy / Módulos no alineados** | **FAIL / HALLAZGO** | Detectadas vistas satélite (Coordinadores, Calendario) con paletas hardcoded desalineadas (ver Sección 4). |

---

## 3. Hallazgos y Defectos Visuales Identificados

### Defecto 1: Falta de borde delimitador en botón de Estado del Header de Ficha (`ExpedienteHeader.tsx`)
- **Componente**: `src/components/expediente/ExpedienteHeader.tsx` (L164)
- **Condición**: Cirugía en estado "Sin autorizar", "Sin fecha", o "Autorizada" sin fecha (modo claro).
- **Impacto visual**: El botón de estado toma `cxVisual.strongClass` (`bg-white text-slate-900 font-bold`) sobre un header que también es `bg-white`. Solo cuenta con `shadow-xs`, lo que produce baja delimitación de bordes respecto al contenedor.
- **Corrección mínima sugerida**:
  Agregar borde condicional o estándar similar al dialog:
  `className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300/80 px-2.5 py-1 text-[11px] font-bold shadow-xs ...", cxVisual.strongClass)}`

### Defecto 2: Inconsistencia en `stickyStateCellClasses` para variante "d" en `CirugiaRow.tsx`
- **Componente**: `src/components/cirugias/CirugiaRow.tsx` (L102)
- **Condición**: Tabla con columnas sticky y variante de estado "d".
- **Impacto visual**: La función `stickyStateCellClasses` evalúa `variant === "a" ? ""` para remover el fondo neutral cuando la celda es sólida, pero no contempla `variant === "d"`, que también es una variante de celda con fondo pleno.
- **Corrección mínima sugerida**:
  Evaluar `(variant === "a" || variant === "d") ? ""` en `stickyStateCellClasses`.

---

## 4. Auditoría de Vistas Legacy Inconsistentes

Las siguientes vistas no consumen la paleta canónica unificada (`CX_STATE_COLORS` / `CX_STATE_VISUALS`) y mantienen mapeos locales obsoletos:

1. **Vistas de Coordinadores** (`DayViewDesktopTable.tsx`, `WeekViewGroupedView.tsx`, `DayViewMobileCards.tsx`):
   - Mapean `Autorizada` a verde esmeralda (`bg-emerald-100 text-emerald-900 border-emerald-300`).
   - Mapean `Realizada` a teal (`bg-teal-100 text-teal-900 border-teal-300`).
   - Mapean `En tránsito` a azul estándar (`bg-blue-100`) en lugar de celeste sky.
   - *Impacto*: Si un usuario pasa de la tabla de Cirugías a la vista de Coordinadores, el código de color se invierte (verde para autorizada en lugar de amarillo).

2. **Calendario y Tableros Operativos** (`src/app/calendario/page.tsx`, `src/app/tableros-operativos/page.tsx`):
   - Consumen `CX_STATE_COLORS` directamente pasando solo el string de estado sin evaluar `getCxStateColorKey(state, date)`. Por tanto, "Autorizada" sin fecha se pinta amarilla en lugar de blanca.

---

## 5. Distinción entre QA Sintético y Aceptación Operativa

- **Alcance evaluado**: Validación estática y pruebas unitarias de componentes React en entorno de test aislado (Vitest JSDOM). Se verificaron exhaustivamente las combinaciones de tokens CSS, contraste WCAG y preservación de estados/labels.
- **Aceptación operativa**: **NOT RUN**. La validación de navegador en caliente sobre DEV5000 queda pendiente para una ventana coordinada con el servidor activo, respetando el hold de base de datos de Sol1.
