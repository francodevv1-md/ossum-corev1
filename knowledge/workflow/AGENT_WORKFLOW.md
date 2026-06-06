# AGENT_WORKFLOW.md — Flujo de agentes OSSUM COR

Estado: vigente

---

## Flujo SDD esperado

1. Engram recuerda contexto previo.
2. Orchestrator inicia fase SDD.
3. sdd-explore investiga repo, contexto y archivos.
4. sdd-propose propone solución.
5. sdd-spec escribe especificación OpenSpec.
6. sdd-design baja diseño técnico.
7. sdd-tasks divide tareas accionables.
8. sdd-apply implementa.
9. reviewer-qa y browser-qa validan.
10. docs-handoff actualiza worklog, knowledge y handoff.
11. Engram guarda session_summary.
12. Engram Sync versiona memoria vía Git.

---

## Invocación de skills en el flujo

- Orchestrator carga solo las skills necesarias para la tarea actual.
- Para salidas operativas, handoff y cierres, los agentes deben invocar **Caveman**.
- Para debugging, fallas de tests, build, TypeScript, Prisma, Zustand persist o loops UI, los agentes deben invocar **Diagnose** antes de proponer fixes.
- Si Diagnose encuentra una solución, el cierre puede comprimirse con Caveman para el handoff final.
- No usar Caveman como reemplazo de documentación canónica.
- No usar Diagnose para justificar cambios de arquitectura sin evidencia reproducible.

### Secuencia sugerida

1. Detectar si la tarea es delivery, documentación o debugging.
2. Si es debugging, cargar Diagnose primero.
3. Ejecutar investigación o validación con evidencia.
4. Aplicar cierre operativo con Caveman cuando haya que pasar estado a otro agente o al usuario.

---

## Roles

- Orchestrator: coordina.
- Repo Explorer: lee.
- Product/Domain Architect: valida negocio.
- Backend/DB Agent: implementa backend.
- Frontend/UI Agent: implementa UI.
- QA/Testing Agent: valida.
- Docs/Handoff Agent: documenta.
- Reviewer Agent: revisa.

---

## Trabajo paralelo

Permitido:

- exploración;
- documentación;
- revisión;
- QA;
- ramas separadas;
- paquetes distintos.

Prohibido:

- editar mismos archivos;
- tocar schema y store en paralelo;
- tocar Cirugías en paralelo;
- merge sin revisión.
