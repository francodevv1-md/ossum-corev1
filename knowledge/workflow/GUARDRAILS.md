# GUARDRAILS.md — OSSUM COR

Estado: vigente para GPT-027F.0B en adelante

---

## Regla de protección de archivos sensibles

Los siguientes paths requieren scope explícito y task brief aprobado antes de cualquier modificación:

- `src/`
- `prisma/`
- `public/`
- `package.json`
- `package-lock.json`
- `.env`
- `.env.local`
- `.env.*`

No modificar ninguno de estos sin una tarea que declare explícitamente el permiso.

---

## Regla de concurrencia

> Un archivo crítico, un agente escritor por vez.

Prohibido:

- Dos agentes editando el mismo archivo simultáneamente.
- Dos agentes tocando `prisma/schema.prisma`.
- Dos agentes tocando `src/lib/store.ts`.
- Dos agentes tocando Cirugías al mismo tiempo.
- Dos agentes modificando el mismo service/API.
- Merge sin revisión humana.

---

## Regla de bloqueo de backend

Backend foundation permanece bloqueado hasta:

1. Cierre formal de GPT-027F.0B.
2. Task brief explícito para GPT-027F.5A (Backend Foundation).
3. Aprobación de Franco para iniciar migraciones, schema o Auth.

Mientras 0B no esté cerrado:

- No `schema.prisma`.
- No migraciones reales.
- No cambio de DB provider.
- No cambios de Auth.
- No refactor de Cirugías.
- No instalar dependencias nuevas sin tarea explícita.
- No integrar TusFacturasAPP productivo.

---

## Regla de componentes críticos

Prisma, Auth y Cirugías requieren task brief explícito con:

- Justificación del cambio.
- Scope delimitado.
- Validaciones esperadas.
- Rollback plan si aplica.

No se modifican por iniciativa del agente sin aprobación previa.

---

## Principios rectores

- **Knowledge gobierna.** `knowledge/` es la fuente de verdad primaria.
- **Engram recuerda.** Memoria operativa, no fuente de verdad.
- **SDD ordena.** Todo cambio significativo pasa por spec, design y tasks.
- **Archive no gobierna.** `knowledge/archive/` es histórico sin autoridad.
- **Franco aprueba.** Decisiones de producto, negocio, arquitectura, DB, Auth, seguridad, facturación, cobros y permisos requieren aprobación humana.

---

## Skills obligatorias por contexto

| Contexto | Skill | Regla |
|---|---|---|
| Cierre de tarea, handoff, reporte | Caveman | Formato Done/Changed/Files/Validations/Risks/Next |
| Bug, test fallido, build roto, error TS/Prisma | Diagnose | Ciclo completo antes de cualquier fix |
| Documentación canónica, ADR, reglas de dominio | Ninguna | Prosa completa, no comprimir |

---

## Prohibiciones absolutas

- No lógica de negocio en componentes React.
- No Prisma desde componentes React.
- No frontend como fuente final de estado.
- No fixes a ciegas sin evidencia reproducible.
- No cambios de arquitectura sin Diagnose previo si hay falla activa.
