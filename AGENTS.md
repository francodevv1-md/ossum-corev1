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

Secuencia histórica de preparación (referencia):

1. **GPT-027F.0A — Knowledge V2 / saneamiento documental.** — **CERRADA**.
2. **GPT-027F.0B — Gentle-AI workspace / Engram / SDD / Skill Registry / guardrails.** — **CERRADA**.
3. **GPT-027F.5A — Backend Foundation.** — **EJECUTADA parcialmente** (schema phase1, auth Supabase DEV, contactos API, surgeries API, seguimiento, notificaciones, recibos digitales, mail stage1 en FS, IA autorización stateless; ver `knowledge/architecture/ADR-027E-...` addendums y `knowledge/architecture/BACKEND_PHASE2_PLAN.md`).

La prohibición "hasta cerrar 0A/0B no tocar schema/auth/Cirugías" queda **resuelta como regla protectiva basada en contenido**, no como secuencia bloqueante. Las reglas protectivas siguen vigentes y se detallan en §11. Requieren Task Brief específico y aprobación de Franco para `schema.prisma`, Auth y refactor de Cirugías.

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

## 9. Multiagent Operating Policy

### 9.1 Model selection

- Model selection is task-based, not permanently role-based.
- Los modelos no tienen rol fijo permanente.
- Codex puede ser preferido para backend crítico, DB, schema, seguridad o permisos, pero no es obligatorio para todo.
- DeepSeek, Qwen, GLM, Kimi, MiniMax u otros pueden usarse para frontend, QA, docs, testing, exploración, refactor o backend no crítico si el ownership está claro.
- El Orchestrator asigna agente/modelo según riesgo, scope, archivos afectados, permisos y disponibilidad.

### 9.2 Required task declaration

Toda tarea multiagente debe declarar, como mínimo:

- Task ID / Name
- Agent Role
- Selected LLM
- Mode: `read-only` / `review` / `implementation` / `docs` / `QA` / `testing`
- Scope
- Allowed files
- Forbidden files
- Allowed commands
- Forbidden commands
- Validation required
- Output format
- Expected handoff
- Stop conditions / escalation rules

Regla madre operativa:

> 1 task = 1 owner = 1 scope = 1 set of files = 1 handoff.

### 9.3 File ownership and locks

- No two agents may write to the same critical file at the same time.
- Critical or shared files require explicit ownership lock before edits.
- El lock mínimo debe indicar: `task`, `agent role`, `selected model`, `owned files/folders`, `status`.
- Estados válidos del lock: `reserved`, `editing`, `review`, `released`.
- Si aparece solapamiento de archivos críticos, el agente debe frenar y escalar al Orchestrator.

### 9.4 Parallel work rules

Se puede paralelizar cuando:

- las tareas son `read-only`;
- repo-explorer solo lee estructura, imports o duplicados;
- QA, browser QA o smoke test no pisan archivos del implementador;
- docs/handoff trabajan sobre archivos separados;
- frontend modular toca componentes o páginas distintas;
- implementación ocurre en carpetas no relacionadas;
- un agente implementa y otro documenta;
- un agente explora y otro implementa sin tocar los mismos archivos.

No se puede paralelizar cuando:

- dos agentes tocan el mismo archivo;
- dos agentes tocan `prisma/schema.prisma`;
- hay cambios de auth, permisos o multiempresa;
- hay migraciones o acciones destructivas;
- hay refactor transversal;
- hay cambios en tipos base;
- hay cambios en la misma cadena API/service/validator;
- el alcance es ambiguo;
- no existe lock visible;
- no existe validador final definido;
- se pretende mergear sin revisión humana.

### 9.5 Human approval boundaries

Franco debe aprobar antes de:

- arquitectura;
- base de datos;
- migraciones;
- auth;
- storage;
- seguridad;
- multiempresa;
- reglas de negocio;
- cambios productivos;
- cambios críticos de Cirugías;
- cambios destructivos o borrado masivo;
- cambios de proveedor.

### 9.6 Prompt template reusable

```md
# AGENT TASK — OSSUM COR

## Task ID / Name

## Objective

## Agent Role

## Selected LLM

## Mode
read-only / review / implementation / docs / QA / testing

## Scope

## Allowed files

## Forbidden files

## Allowed commands

## Forbidden commands

## Dependencies / Related agents

## Validation required

## Output format

## Expected handoff

## Stop and escalate if
- scope expands
- critical file overlap appears
- approval boundary is crossed
- migration or destructive action is needed
- business rule is unclear
```

---

## 10. Archivos sensibles

Lock obligatorio / muy alto riesgo:

- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/lib/store.ts`
- `prisma/seed.ts`
- `src/types/index.ts`
- `src/app/cirugias/page.tsx`
- `src/components/cirugias/*`
- `src/hooks/useCirugiaActions.ts`
- `src/hooks/useCirugiasFilters.ts`
- `src/hooks/useCirugiaSelection.ts`
- `src/lib/businessRules.ts`
- `src/lib/automations.ts`
- `src/lib/cirugias.constants.ts`
- `src/lib/cirugias.utils.ts`

Alto riesgo / coordinar ownership por carpeta o cadena funcional:

- `src/app/api/*`
- `src/lib/services/*`
- `src/lib/validators/*`
- `src/lib/permissions/*`
- `src/components/expediente/*`
- `src/components/operational-boards/*`
- `src/app/coordinadores/page.tsx`
- `src/app/calendario/page.tsx`

Antes de tocar un archivo crítico:

1. Explicar por qué hace falta.
2. Confirmar scope.
3. Verificar que no haya otro agente editándolo.
4. Hacer cambio mínimo.
5. Validar.
6. Documentar.

---

## 11. Prohibiciones inmediatas

Reglas protectivas permanentes (independientes del cierre de fases):

- No backend foundation (circuito troncal post-Cirugía) sin Task Brief específico y aprobación de Franco.
- No migraciones reales sin aprobación de Franco.
- No cambio de DB provider sin ADR.
- No Auth productivo sin `ADR-AUTH-FINAL.md` cerrado y aprobado.
- No refactor de Cirugías (`/cirugias` page, expediente, hooks, store) sin Task Brief y scope explícito.
- No tocar `prisma/schema.prisma` sin Task Brief + aprobación Franco.
- No instalar dependencias nuevas sin tarea explícita.
- No integrar TusFacturasAPP productivo sin backend y ADR específica.
- No mover grandes carpetas de código sin task plan.

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

Plantilla corta reusable:

```md
## Handoff
### Done
### Changed
### Files
### Validations
### Risks
### Next
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
