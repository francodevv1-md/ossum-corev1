# AI_GENTLE_STACK.md — Entorno IA OSSUM COR

Estado: vigente para GPT-027F.0B

---

## Objetivo

Usar AI Gentle Stack como ecosistema base de trabajo, no como piloto automático.

Franco mantiene el control de producto y aprobación. Los agentes ejecutan bajo límites de alcance, permisos y handoff.

---

## Componentes desde el inicio

- Engram.
- Engram Sync.
- SDD/OpenSpec.
- Skill Registry.
- Context7.
- Persona.
- Caveman.
- Diagnose.
- Permissions / Guardrails.
- Browser automation.
- Plugins visuales si ayudan.
- OpenCode profiles / super sub-agentes.

---

## Uso de skills privadas OSSUM

### Caveman

Usar Caveman cuando haga falta comprimir salida operativa sin perder trazabilidad.

Aplicaciones típicas:

- cierre de tareas;
- handoff entre agentes;
- resumen de salida de subagentes;
- reportes cortos para validaciones o checkpoints.

No usar Caveman para:

- ADRs finales;
- reglas de dominio críticas;
- documentación canónica profunda.

Formato obligatorio de Caveman:

- Done
- Changed
- Files
- Validations
- Risks
- Next

### Diagnose

Usar Diagnose cuando el trabajo sea debugging y no delivery normal.

Aplicaciones típicas:

- tests fallidos;
- build roto;
- `storage.setItem is not a function`;
- errores Prisma;
- errores TypeScript;
- loops UI.

Diagnose debe seguir este ciclo:

- Reproduce
- Scope
- Evidence
- Hypothesis
- Minimal Fix
- Validate
- Regression Check
- Handoff

Diagnose no habilita fixes a ciegas ni cambios de arquitectura sin evidencia.

---

## Componentes posteriores

- Notion MCP.
- Jira MCP.
- GitHub MCP formal.
- Postgres/Supabase MCP con escritura.
- Obsidian Skills.
- Graphify avanzado.

---

## Regla de uso

No cargar todo por defecto.

Por tarea:

- AGENTS.md.
- Task Brief.
- Spec.
- Documento de dominio/arquitectura puntual.
- 1 a 3 skills.
- Archivos concretos.

---

## Frase guía

Gentle-AI organiza. Franco decide. Codex implementa. Engram recuerda. SDD controla alcance. Browser valida. Knowledge gobierna.
