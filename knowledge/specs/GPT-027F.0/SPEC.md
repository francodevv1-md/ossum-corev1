# SPEC.md — GPT-027F.0

Estado: vigente para preparación documental/IA

---

## Nombre

GPT-027F.0 — Reconstrucción documental, Knowledge V2 y preparación de entorno IA.

---

## Objetivo

Preparar el proyecto para trabajar con agentes de IA de forma ordenada, con contexto limpio, Knowledge V2, AGENTS.md, SDD/OpenSpec, Engram/Engram Sync, Skill Registry, guardrails, task briefs, handoffs y quality gates.

---

## Subpaquetes

### GPT-027F.0A — Knowledge V2 / saneamiento documental

Crear y consolidar:

- AGENTS.md.
- knowledge/KNOWLEDGE_INDEX.md.
- knowledge/core/*.
- knowledge/domain/*.
- knowledge/architecture/*.
- knowledge/workflow/*.
- knowledge/specs/GPT-027F.0/*.
- knowledge/archive/README.md.

### GPT-027F.0B — Gentle-AI workspace

Configurar:

- Gentle-AI.
- Engram.
- Engram Sync.
- SDD/OpenSpec.
- Skill Registry.
- Context7.
- Persona.
- Caveman.
- Diagnose.
- Browser automation.
- Permissions / guardrails.
- Perfiles de agentes/modelos.

---

## Fuera de alcance

- Backend Foundation.
- Prisma schema real.
- Migraciones.
- Cambio de DB provider.
- Auth.
- Refactor de Cirugías.
- Migración Zustand.
- Integración fiscal.
- Instalación de herramientas no aprobadas.

---

## Criterio de éxito

Se puede iniciar una tarea con Codex/OpenCode leyendo documentos modulares y sin cargar todo el Contexto Maestro.

El backend queda listo para planificarse, no para ejecutarse sin 0A/0B.

