# CURRENT_STATE.md — Estado actual del prototipo/repo OSSUM COR

Estado: borrador inicial para GPT-027F.0A  
Tipo: estado real del proyecto, no visión final

---

## Resumen

El proyecto tiene un frontend/prototipo avanzado con múltiples módulos modelados en UI y estado local, pero todavía no tiene backend productivo real ni PostgreSQL como fuente de verdad.

El estado actual sirve como referencia funcional y UX, no como arquitectura final.

---

## Estado técnico conocido

- Frontend con Next.js / React / TypeScript / Tailwind.
- shadcn/ui y componentes UI modernos.
- Zustand/localStorage como fuente temporal del prototipo.
- Datos mock o locales.
- Prisma puede existir como placeholder o preparación, pero no gobierna todavía.
- No hay PostgreSQL productivo como fuente final.
- No hay Auth productivo final.
- No hay backend foundation consolidado.

---

## Módulos con distintos grados de avance frontend

- Cirugías.
- Expediente.
- Wizard Nueva Cirugía.
- Contactos.
- Presupuestos.
- Remitos.
- Consumos.
- Comparativa.
- Facturación/Cobros.
- Coordinadores.
- Calendario / agenda.
- Tableros operativos.

---

## Decisiones recientes de UI/UX a conservar como referencia

- Cirugías debe mantener lectura operativa clara.
- La tabla de Cirugías es central.
- Doble click o acción directa debe abrir expediente.
- Filtros rápidos visibles.
- Filtros avanzados cuando corresponda.
- Columnas configurables y reordenables.
- Acciones por fila funcionando.
- Estado CX separado de preparación/material.
- Indicadores de documentación, consumo y facturación con neutralidad visual.
- Evitar preview lateral fijo si roba espacio.
- Evitar KPIs arriba si reducen operación.

---

## Riesgos técnicos actuales

- Zustand/localStorage puede confundirse con fuente final.
- Los módulos mock pueden parecer implementados cuando son maqueta.
- Cirugías y Expediente son módulos sensibles; no tocar sin scope.
- Cambios UI pueden romper flujos ya validados.
- Bugs de Radix/Tooltip/Portal o loops deben tratarse con Diagnose.
- Inline selectors o `.filter()` en Zustand pueden provocar renders o loops.

---

## Cómo usar este documento

Los agentes deben usar este archivo para entender el estado real del repo antes de tocar código.

No debe usarse para definir el producto final. Para eso usar:

- `PROJECT_BRIEF.md`
- `CANONICAL_DECISIONS.md`
- `domain/*`
- `architecture/*`

---

## Pendiente de completar por Codex/Repo Explorer

Cuando se ejecute GPT-027F.0A en el repo real, completar:

- rutas reales;
- estructura de carpetas;
- componentes críticos;
- hooks críticos;
- stores existentes;
- scripts package.json;
- estado de Prisma;
- estado de tests;
- errores conocidos;
- URL de deploy vigente si corresponde;
- módulos que son mock vs persistentes.

