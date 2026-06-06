# AGENTS.md — OSSUM COR

Estado: vigente para GPT-027F.0A / GPT-027F.0B / GPT-027F.5A  
Proyecto: OSSUM COR  
Propósito: reglas raíz para Codex, OpenCode, Gentle-AI, subagentes y cualquier asistente que trabaje sobre este repositorio.

---

## 1. Regla madre

OSSUM COR trabaja con IA asistida, no automática.

Franco aprueba decisiones de producto, negocio, arquitectura, base de datos, autenticación, seguridad, facturación, cobros, permisos y cambios críticos.

Regla corta:

> Knowledge gobierna. Engram recuerda. SDD ordena. Task Brief enfoca. Skills guían. Caveman comprime. Diagnose depura. Browser valida. Franco aprueba.

---

## 2. Fuentes de verdad

Orden de autoridad:

1. Contexto Maestro v8.2 saneado.
2. ADRs vigentes.
3. `knowledge/KNOWLEDGE_INDEX.md`.
4. Documentos `knowledge/core`, `knowledge/domain`, `knowledge/architecture` y `knowledge/workflow`.
5. Specs SDD/OpenSpec.
6. Worklog y handoffs.
7. Engram como memoria operativa.
8. `knowledge/archive` como histórico sin autoridad.

Si un documento viejo contradice esta estructura, queda subordinado a Knowledge V2.

---

## 3. Qué es OSSUM COR

OSSUM COR es un ERP operativo multiempresa para distribuidoras quirúrgicas, ortopedias y comercios de salud, diseñado alrededor de la Cirugía/Expediente como entidad central.

Circuito V1 canónico:

```txt
Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro
```

Stock, cajas, trazabilidad y compras son transversales, pero pueden implementarse por profundidad progresiva.

---

## 4. Qué no es OSSUM COR

OSSUM COR no es:

- OrtoTrack como identidad final.
- ChatZIA como metodología vigente.
- XAdmin copiado con otra interfaz.
- Un prototipo frontend terminado.
- Zustand/localStorage como fuente final.
- Un sistema fiscal dependiente de TusFacturasAPP como núcleo.
- Un stock aislado.
- Un CRM médico genérico.
- Un POS como producto principal.

---

## 5. Secuencia vigente

No iniciar backend directo.

Secuencia obligatoria:

1. **GPT-027F.0A — Knowledge V2 / saneamiento documental.**
2. **GPT-027F.0B — Gentle-AI workspace / Engram / SDD / Skill Registry / guardrails.**
3. **GPT-027F.5A — Backend Foundation.**

Hasta cerrar 0A/0B, no tocar `schema.prisma`, no crear migraciones reales, no cambiar Auth, no migrar Zustand y no refactorizar Cirugías.

---

## 6. Stack técnico vigente

Backend V0:

- Next.js actual.
- API Routes y/o Server Actions.
- Prisma.
- PostgreSQL gestionado.
- Supabase o Neon como proveedores candidatos.
- Supabase Auth/Storage opcional si reduce complejidad.
- VPS postergado.
- Zustand/localStorage solo transición temporal del prototipo.

Reglas críticas:

- No Prisma desde componentes React.
- No lógica crítica en componentes.
- No frontend como fuente final.
- Servicios server-side para lógica de dominio.
- Validadores centralizados.
- Permisos multiempresa.
- Auditoría para acciones críticas.

---

## 7. Carga de contexto por tarea

Cada tarea debe cargar solo lo necesario.

Contexto mínimo recomendado:

- `AGENTS.md`.
- Task Brief actual.
- Spec correspondiente.
- `knowledge/core/PROJECT_BRIEF.md`.
- `knowledge/core/CANONICAL_DECISIONS.md`.
- `knowledge/core/CURRENT_STATE.md` si se toca repo/prototipo.
- Documento de dominio o arquitectura puntual.
- 1 a 3 skills como máximo.
- Archivos concretos del repo.

No cargar por defecto:

- Todo el Contexto Maestro.
- Todo el repo.
- Todo el grafo.
- Todas las skills.
- Todos los ADRs.

---

## 8. Agentes recomendados

### Orchestrator

Coordina, divide tareas, evita conflictos y pide confirmación si hay riesgo. No debe implementar directo salvo tareas menores.

### Repo Explorer

Lee estructura, ubica archivos y detecta dependencias. No modifica archivos.

### Product / Domain Architect

Interpreta reglas de negocio, circuito quirúrgico, XAdmin como aprendizaje y alcance. No inventa reglas.

### Backend / DB Agent

Prisma, PostgreSQL, migraciones, seed, servicios server-side, API Routes/Server Actions, validadores, permisos y auditoría.

### Frontend / UI Agent

React, componentes, UX, integración API, estados de carga/error y formularios. No mete lógica crítica de negocio.

### QA / Testing Agent

TypeScript, build, tests, smoke tests, E2E, browser QA y regresiones.

### Docs / Handoff Agent

Worklog, ADRs, Knowledge, handoff, checklist y resúmenes.

### Reviewer Agent

Revisa diff, duplicación, coherencia con arquitectura, riesgos y reglas canónicas. No implementa features durante revisión.

---

## 9. Trabajo paralelo

Permitido:

- repo-explorer leyendo archivos.
- docs-handoff documentando.
- reviewer-qa revisando diff.
- browser-qa validando UI.
- agentes en ramas separadas o paquetes distintos.

Prohibido:

- dos agentes editando el mismo archivo;
- dos agentes tocando `prisma/schema.prisma`;
- dos agentes tocando `src/lib/store.ts`;
- dos agentes tocando Cirugías al mismo tiempo;
- dos agentes modificando el mismo service/API;
- merge sin revisión humana.

Regla práctica:

> Un archivo crítico, un agente escritor por vez.

---

## 10. Archivos sensibles

Muy alto riesgo:

- `src/lib/store.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/types/index.ts`
- `src/app/cirugias/page.tsx`
- `src/components/cirugias/*`
- `src/components/expediente/*`
- `src/hooks/useCirugiaActions.ts`
- `src/hooks/useCirugiasFilters.ts`
- `src/hooks/useCirugiaSelection.ts`
- `src/lib/businessRules.ts`
- `src/lib/automations.ts`
- `src/lib/cirugias.constants.ts`
- `src/lib/cirugias.utils.ts`
- `src/app/api/*`
- `src/lib/services/*`
- `src/lib/validators/*`
- `src/lib/permissions/*`

Antes de tocar un archivo crítico:

1. Explicar por qué hace falta.
2. Confirmar scope.
3. Verificar que no haya otro agente editándolo.
4. Hacer cambio mínimo.
5. Validar.
6. Documentar.

---

## 11. Prohibiciones inmediatas

Mientras no esté cerrado GPT-027F.0A/0B:

- No backend foundation.
- No migraciones reales.
- No cambio de DB provider.
- No cambios de Auth.
- No refactor de Cirugías.
- No tocar `schema.prisma`.
- No instalar dependencias nuevas sin tarea explícita.
- No integrar TusFacturasAPP productivo.
- No mover grandes carpetas de código.

---

## 12. Quality gates

Antes de cerrar cualquier tarea técnica:

- Build sin errores si aplica.
- TypeScript sin errores si aplica.
- Tests relevantes si existen.
- Prisma format/generate si se tocó Prisma.
- Browser QA si toca UI.
- Worklog actualizado.
- Handoff generado.
- Riesgos abiertos declarados.
- Engram session_summary si corresponde.

---

## 13. Handoff obligatorio

Cada tarea debe terminar con:

```txt
Done:
Changed:
Files:
Validations:
Risks:
Next:
```

### Regla Caveman obligatoria

Todo cierre de tarea, handoff, resumen de subagente, validación operativa y reporte de estado debe usar el formato Caveman (Done / Changed / Files / Validations / Risks / Next).

No usar Caveman para:

- ADRs finales con tradeoffs.
- Reglas de dominio críticas.
- Documentación canónica profunda.
- Definiciones de arquitectura que requieren matiz.

### Regla Diagnose obligatoria

Para bugs, tests fallidos, build roto, errores TypeScript, errores Prisma, loops UI o `storage.setItem is not a function`, el agente debe ejecutar el ciclo Diagnose (Reproduce / Scope / Evidence / Hypothesis / Minimal Fix / Validate / Regression Check / Handoff) **antes** de aplicar cualquier fix.

No aplicar fixes a ciegas ni cambios de arquitectura sin evidencia reproducible. Si Diagnose resuelve el bug, el cierre puede comprimirse con Caveman.

