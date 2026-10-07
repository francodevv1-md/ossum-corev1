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

### 8.1 Enrutamiento autoritativo por nivel de riesgo

Antes de actuar, el agente debe clasificar la tarea y usar el flujo más liviano que conserve las protecciones de este documento:

- **T0 — consulta o lectura:** explicación, búsqueda, inspección o análisis sin escritura. Se ejecuta inline, sin SDD, delegación ni lista de tareas salvo que aporten valor real.
- **T1 — cambio bajo y reversible:** hasta 3 archivos no sensibles y sin cambios de arquitectura, schema, autenticación, seguridad, multiempresa, reglas de negocio, contrato API, dependencias o persistencia. Se implementa inline, con validación enfocada y un único cierre Caveman.
- **T2 — cambio normal relacionado:** feature o cambio coherente de varios archivos fuera de límites críticos. Requiere brief compacto o Change Pack y delegación dirigida o fases SDD únicamente donde aporten control.
- **T3 — cambio crítico:** cualquier límite de aprobación humana de §9.5 o regla protectiva de §11. Requiere aprobación explícita de Franco y `gentle-orchestrator` o las salvaguardas completas aplicables antes de implementar.

SDD es condicional: no es obligatorio para T0/T1. Ante alcance o riesgo ambiguo, se clasifica hacia arriba. Ningún nivel reduce las aprobaciones humanas, locks, archivos sensibles, reglas Diagnose ni quality gates vigentes.

Para T0/T1 alcanza un único handoff Caveman. Engram se usa solo ante sus triggers obligatorios y para el resumen de sesión; el worklog se actualiza únicamente en hitos o cambios críticos.

### 8.2 Fast Delivery Contract — aprobación inicial única

Franco prioriza entrega funcional rápida. Una solicitud explícita de implementación (`implementá`, `hacelo`, `corregilo`, `terminá la tarea` o equivalente inequívoco) constituye la aprobación humana inicial para el paquete DEV finito razonablemente necesario para producir ese resultado exacto.

Flujo normal:

```txt
Pedido → brief interno → implementación continua → pruebas → Diagnose/correcciones → validación → único cierre final
```

Reglas:

- No pedir aprobación entre análisis, diseño técnico, schema, artefacto de migración, ejecución sobre DB DEV descartable confirmada, tests, Diagnose y revisiones cuando sean partes necesarias del mismo resultado solicitado.
- Los Task Briefs, Change Packs, specs, diseños, tareas, locks y handoffs intermedios obligatorios se generan y validan internamente; no se convierten en paradas conversacionales.
- Una sola aprobación inicial cubre el paquete DEV delimitado. Los gates técnicos siguen existiendo, pero el agente continúa automáticamente cuando pasan y corrige automáticamente mediante Diagnose cuando fallan.
- T0–T2 se ejecutan directamente hasta resultado. T3 usa las salvaguardas aplicables sin solicitar confirmaciones rutinarias adicionales dentro del mismo alcance aprobado.
- Schema y migraciones dejan de ser fases conversacionales separadas. Cuando el pedido aprobado las requiere, el agente puede declarar schema, crear el artefacto, aplicarlo únicamente sobre una DB DEV explícitamente confirmada como descartable, ejecutar pruebas y revisar evidencia en una sola corrida continua.
- El cierre al usuario es único. Solo se informa progreso intermedio si aporta evidencia útil o existe un bloqueo real.

Esta aprobación permanente NO cubre:

- producción, staging, deploy o datos reales/no descartables;
- acciones destructivas o irreversibles no inequívocamente solicitadas;
- cambio de proveedor, Auth productivo, seguridad productiva, facturación/fiscal o secretos fuera del resultado pedido;
- commits, push, PR, merge o publicación;
- expansión funcional no relacionada con el pedido;
- decisiones de negocio ambiguas con resultados materialmente diferentes.

Ante uno de esos límites se hace una sola pregunta precisa. El silencio, una aprobación vieja o este contrato no autorizan producción ni destrucción.

---

## 9. Multiagent Operating Policy

### 9.1 Model selection

- Model selection is task-based, not permanently role-based.
- Los modelos no tienen rol fijo permanente.
- Codex puede ser preferido para backend crítico, DB, schema, seguridad o permisos, pero no es obligatorio para todo.
- DeepSeek, Qwen, GLM, Kimi, MiniMax u otros pueden usarse para frontend, QA, docs, testing, exploración, refactor o backend no crítico si el ownership está claro.
- El Orchestrator asigna agente/modelo según riesgo, scope, archivos afectados, permisos y disponibilidad.

### 9.2 Required task declaration

La declaración completa es obligatoria cuando exista escritura multiagente o intervengan archivos críticos/compartidos. Una tarea T0/T1 con un único agente no requiere esta ceremonia. Cuando corresponda, debe declarar como mínimo:

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
- Worklog actualizado en hitos o cambios críticos; no es obligatorio para T0/T1 rutinario.
- Handoff generado.
- Riesgos abiertos declarados.
- Engram session_summary si corresponde.

### 12.1 Responsive Density — obligatorio

Toda tarea que cree o modifique UI debe cargar:
`.opencode/skills/ossum-responsive-density/SKILL.md`

Ninguna tarea visual se considera cerrada sin validar al menos
1366×768 y 1920×1080.

En superficies responsive también validar 390×844.

Pantallas grandes deben aumentar capacidad de información,
no escalar proporcionalmente componentes o whitespace.

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

---

## 14. Registros de aprobación T3 — C13/C14 (histórico)

Los registros activos de aprobación T3 (C13 Stock/Cajas S18–S24 y C14 CX ejecución documental) fueron movidos a Engram para no cargarse en cada contexto. Siguen siendo evidencia autoritativa y visible para GGA; se recuperan desde Engram (obs "OSSUM COR T3 approval records C13/C14") o desde los Change Packs en `knowledge/specs/`.

- C13: `knowledge/specs/STOCK-CAJAS-C13-CONTINUOUS-EXECUTION-001/CHANGE_PACK.md`.
- C14: `knowledge/specs/STOCK-CAJAS-C14-CX-CONTINUOUS-EXECUTION-001/CHANGE_PACK.md`.

Cualquier expansión de alcance, contradicción de hashes o acción excluida vuelve a requerir aprobación explícita de Franco.

---

## 15. Aprobación activa — Coordination/Tracking UI 2026-08-14

Franco aprobó el paquete DEV de rediseño visual de Coordinación/Seguimiento y, ante la pregunta precisa `¿Aprobás ese cambio mínimo de seguridad para poder completar el commit?`, respondió `apruebo` el 2026-08-14.

Alcance autorizado:

- centralizar y reutilizar la política existente de mutaciones de Seguimiento (`admin`);
- impedir que roles no autorizados abran o ejecuten compositores y gestiones que el API rechazaría;
- mantener el API como autoridad final;
- completar UI, pruebas, Diagnose, revisión GGA y commit local del paquete.

Exclusiones: cambios de roles permitidos, Auth productivo, schema, migraciones, datos reales, deploy, push y PR. Evidencia operativa: Engram #5433 y `knowledge/specs/COORDINATION-TRACKING-UI-20260814/TASK_BRIEF.md`.

---

## 16. Aprobación activa — Facturación/Cobros operativos DEV 2026-09-02

Ante la pregunta precisa `¿Aprobás el paquete DEV de Facturación/Cobros operativos —borradores, emisión no fiscal, cobros imputados y anulaciones— excluyendo fiscalización, schema, Auth, deploy y datos reales?`, Franco respondió `Apruebo` el 2026-09-02.

Alcance autorizado: UI backend-authoritative de borradores y emisión operativa no fiscal, cobros ligados a facturas backend, anulaciones, paginación completa, validaciones, revisión GGA y commit local.

Exclusiones: emisión fiscal, ARCA/AFIP, CAE, schema, migraciones, Auth/roles/seguridad, producción/staging, datos reales, deploy, push y PR.

Evidencia operativa: Engram #6269 y `knowledge/specs/BILLING-PAYMENTS-OPERATIONAL-UI-DEV-001/TASK_BRIEF.md`.

---

## 18. Aprobación activa — Contactos backend authority DEV 2026-09-03

Franco aprobó explícitamente el paquete DEV `CONTACTS-BACKEND-AUTHORITY-UI-DEV-001` respondiendo `confirmo y apruebo` al alcance de schema/migración necesario para convertir Contactos en autoridad backend. Luego confirmó la DB conectada como DEV descartable antes de aplicar la migración y solicitó explícitamente el commit local con `metele commit pa`.

Alcance autorizado: schema y migración aditiva de Contactos, persistencia multiempresa de código/roles/grupos/dirección/perfiles, servicios/validadores/API, UI de Contactos, selectores reutilizables por Nueva Cirugía sin modificar su núcleo, pruebas, Diagnose, revisión GGA y commit local.

Exclusiones: Auth/roles/permisos, cambios del circuito núcleo de Cirugías, datos reales, producción/staging, deploy, push y PR. Evidencia operativa: Engram #6346/#6355 y `knowledge/specs/CONTACTS-BACKEND-AUTHORITY-UI-DEV-001/TASK_BRIEF.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
