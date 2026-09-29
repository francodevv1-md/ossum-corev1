---
name: ossum-contextual-help
description: Standardize and implement contextual in-app help across OSSUM COR UI using InfoTooltip and HelpTip components. Use when designing, reviewing, or adding help tooltips, keyboard shortcut hints, field explanations, or section guides to any modal, panel, table, or form in the OSSUM COR ERP.
version: 1.0.0
user-invocable: true
argument-hint: "[target-file-or-screen]"
---

# OSSUM Contextual Help

Standard for designing, writing, and placing contextual help across OSSUM COR interfaces without visual pollution or cognitive clutter.

---

## 1. Elección del Componente

Always import and reuse the canonical components from `@/components/ui/info-tooltip`:

| Componente | Cuándo usar | Ejemplo |
| :--- | :--- | :--- |
| **`InfoTooltip`** | Cabeceras de modales, paneles operativos, wizards o secciones complejas donde se requiera explicar el objetivo operativo y listar atajos de teclado (`shortcuts`). | Modal de Nueva Factura, Asistente de Autorización IA, Panel de Seguimiento. |
| **`HelpTip`** | Aclaraciones puntuales, cortas y específicas colocadas junto a una etiqueta (`<Label>`) o encabezado de columna (`<th>`). | CUIT/DNI en facturación, Lote condicional en consumo, Vigencia de presupuesto. |

### Reglas de Decisión
1. **No sobrecargar**: No agregar tooltips a todas las etiquetas por defecto. Solo agregarlos donde la terminología médica, fiscal o logística genere dudas reales.
2. **Lo crítico permanece visible**: Errores de validación, asteriscos de obligatoriedad (`*`), alertas de stock insuficiente y advertencias irreversibles deben permanecer 100% visibles en la interfaz, **NUNCA** ocultos dentro de un tooltip.

---

## 2. Redacción y Contenido (Copywriting Operativo)

1. **Enfoque en la acción**: Explicar qué significa el dato para el circuito quirúrgico o qué acción concreta debe realizar el operador.
2. **Lenguaje operativo de salud/distribución**: Usar la terminología de Districorr (e.g. *Expediente*, *Cirugía vinculada*, *Remito unificado*, *Alícuota IVA*, *Línea libre*).
3. **Cero jerga técnica**: Prohibido usar términos como `backend`, `Zustand`, `Prisma`, `PostgreSQL`, `API Route` o `state` en los textos dirigidos al usuario.
4. **Cero redundancia**: No repetir el nombre de la etiqueta con sinónimos vacíos (e.g. Si la etiqueta es *Fecha de Emisión*, no escribir "Fecha en la que se emite el comprobante").
5. **Fidelidad técnica estricta**: No inventar reglas de negocio, permisos, automatizaciones ni atajos que no existan en el código. Si una regla está pendiente de confirmación por Franco, reportarla en el handoff y no presentarla como hecho consumado en la UI.

---

## 3. Consistencia Visual

1. **Reutilizar componentes existentes**: Usar exclusivamente `InfoTooltip` y `HelpTip` de `src/components/ui/info-tooltip.tsx`. Prohibido inventar componentes ad-hoc de ayuda.
2. **Iconografía sobria**: El icono por defecto es `HelpCircle` (`icon="help"`). Usar `icon="info"` o `icon="sparkles"` únicamente cuando la semántica lo justifique (e.g. asistencia IA).
3. **Variantes coherentes**:
   - `variant="muted"`: Estándar para formularios y tablas.
   - `variant="primary"` / `variant="emerald"`: Solo para modales de alta jerarquía o badges de estado.
4. **Dimensiones**:
   - `size="xs"` (12px) para `HelpTip` en etiquetas de formulario y tablas.
   - `size="sm"` (14px) para `InfoTooltip` en títulos de diálogo y paneles.

---

## 4. Accesibilidad y Responsividad

1. **Navegación por teclado**: Los botones disparadores tienen `aria-label`, foco visible (`focus-visible:ring-1`) y se activan al enfocar con <kbd>Tab</kbd>.
2. **Soporte táctil / Mobile**: Apertura mediante tap directo gracias a Radix UI Tooltip.
3. **Evitar recortes (*overflow clipping*)**:
   - Configurar `side` (`"top"`, `"right"`, `"bottom"`, `"left"`) considerando los bordes del diálogo o drawer.
   - Respetar `maxWidth` (por defecto `280px`) para evitar desbordes horizontales en pantallas compactas.

---

## 5. Procedimiento al Aplicar la Skill

1. **Analizar la superficie**: Inspeccionar la pantalla, diálogo o componente solicitado.
2. **Identificar puntos clave**: Seleccionar únicamente 1 a 3 ayudas indispensables.
3. **Verificar el contrato y la lógica**: Contrastar el texto de ayuda contra la implementación real en código (`src/lib/services`, `src/types`, validadores).
4. **Implementar**: Importar `InfoTooltip` o `HelpTip` y montar en la posición adecuada.
5. **Validar visualización y accesibilidad**: Probar visualmente en el navegador y ejecutar tests de componentes.
6. **Handoff Caveman**: Reportar cambios realizados y declarar cualquier gap o regla pendiente.

---

## 6. Referencias Detalladas

- Para especificaciones completas de props y tipos: [references/component-contract.md](references/component-contract.md)
- Para ejemplos de código listos para usar: [references/examples.md](references/examples.md)
- Para la guía de redacción y términos permitidos: [references/copywriting-rules.md](references/copywriting-rules.md)
