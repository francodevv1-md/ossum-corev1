# TASKS.md — GPT-027F.0

Estado: vigente

---

## GPT-027F.0A — Knowledge V2

- [x] Crear AGENTS.md base.
- [x] Crear KNOWLEDGE_INDEX.md.
- [x] Crear core/PROJECT_BRIEF.md.
- [x] Crear core/CURRENT_STATE.md.
- [x] Crear core/CANONICAL_DECISIONS.md.
- [x] Crear core/REPO_MAP.md placeholder.
- [x] Crear core/GLOSSARY.md.
- [x] Crear domain/* inicial.
- [x] Crear architecture/* inicial.
- [x] Crear workflow/* inicial.
- [x] Crear specs/GPT-027F.0/*.
- [x] Crear worklog/WORKLOG.md.
- [x] Crear archive/README.md.
- [x] Copiar carpeta al repo real.
- [x] Revisar con Codex contra repo real.
- [x] Completar CURRENT_STATE.md con rutas reales.
- [x] Completar REPO_MAP.md con estructura real.
- [x] Mover/archivar knowledge viejo.

Estado de 0A: cerrado.

---

## GPT-027F.0B — Gentle-AI workspace

- [x] Instalar/configurar Gentle-AI en workspace.
- [x] Activar Engram.
- [x] Activar Engram Sync.
- [x] Inicializar SDD/OpenSpec.
- [x] Refrescar Skill Registry.
- [x] Configurar Context7.
- [ ] Configurar guardrails.
- [x] Definir `default_agent` en OpenCode.
- [x] Configurar perfiles/agentes.
- [x] Crear primera session_summary.
- [x] Validar flujo con tarea documental simple.
- [x] Crear skills privadas Caveman y Diagnose.
- [x] Ejecutar smoke test de Diagnose contra bug real.

Pendientes explícitos de 0B (no bloqueantes):

- **Engram Sync**: ~~pendiente de ejecución/verificación real.~~ ✅ **Verificado y consolidado.** Sync local + cloud operativo. Proyecto único `ossum_cor_project` con 51 obs / 22 sessions. MCP fijado y env var seteada.
- Guardrails: definidos en GUARDRAILS.md pero sin validación de punta a punta.
- Fix de `storage.setItem is not a function`: bug reproducido y acotado, fix todavía no aplicado.
- GGA hook: pendiente solo si esa automatización sigue en alcance.

Estado de 0B: cerrado funcionalmente. Pendientes no bloquean el pase a 0C o 5A.

---

## No hacer todavía

- [ ] No backend foundation.
- [ ] No Prisma schema.
- [ ] No migraciones.
- [ ] No Auth.
- [ ] No refactor Cirugías.
