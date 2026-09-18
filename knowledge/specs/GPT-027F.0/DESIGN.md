# DESIGN.md — GPT-027F.0

Estado: vigente

---

## Diseño general

La reconstrucción se hace por estructura nueva, no editando el knowledge viejo en caliente.

Se crea Knowledge V2 con categorías claras:

- core;
- domain;
- architecture;
- workflow;
- specs;
- worklog;
- archive.

---

## Principio de migración

Cada contenido viejo se clasifica como:

- verdad de negocio;
- decisión vigente;
- estado actual del prototipo;
- workflow IA;
- histórico útil;
- obsoleto/contradictorio.

Solo las primeras cuatro categorías gobiernan. Histórico y obsoleto quedan archivados.

---

## Diseño de consumo por agentes

Los agentes no deben leer todo.

Para tareas normales:

- AGENTS.md.
- KNOWLEDGE_INDEX.md.
- PROJECT_BRIEF.md.
- CANONICAL_DECISIONS.md.
- CURRENT_STATE.md si toca repo.
- Spec puntual.
- Documento puntual de dominio/arquitectura.

---

## Diseño de seguridad

- Sin secretos.
- Sin `.env`.
- Sin migraciones reales.
- Sin backend.
- Sin cambios funcionales.
- Sin refactor de Cirugías.

---

## Diseño de salida

El entregable debe ser copiable al repo y funcionar como base documental inmediata.

