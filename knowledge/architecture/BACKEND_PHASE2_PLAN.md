# BACKEND_PHASE2_PLAN.md — OSSUM COR

Estado: vigente como plan de fase 2. Sujeto a aprobación de decisiones en ADR-pendientes y Task Briefs específicos.  
Última actualización: 2026-07-07 (DOC-027F.0C-SANEO)

---

## Principios

1. **Backend real fuente de verdad progresiva.** Cada etapa del circuito migra a Prisma + service + API + validators + permisos + auditoría; el slice Zustand correspondiente se convierte en caché de UI / DTO provisional mientras la migración avanza, y eventualmente se depreca.
2. **No reescribir Cirugías.** Mantener `/cirugias` y Expediente como están; conectarlos al backend por endpoints nuevos sin refactor abierto.
3. **Unificar Remito V1/V2** a un solo modelo antes de persistir remito (decisión blocking).
4. **Trazabilidad deriva de eventos persistidos**, no del slice `traceEntries` (matarlo al migrar remito/consumo/devolución a backend).
5. **TusFacturasAPP permanece backend-only como motor fiscal futuro**, nunca en frontend, nunca como núcleo del ERP; persistencia operativa de factura/cobro vive en OSSUM COR primero.
6. **Permissions/validators centralizados** en `src/lib/permissions/*` y `src/lib/validators/*` respetando el patrón existente; eliminar roles inline por servicio al final de cada fase.
7. **Auth consolidado como arquitectura final** después del work DEV (Supabase productivo con fallback DEV apagado). Requiere `ADR-AUTH-FINAL.md` (DRAFT) cerrado y aprobado.
8. **Storage decidido**: artefactos grandes en R2 (ya usado por recibos) se mantiene; documentación genérica y adjuntos sigue en R2; tokens mail y repos mail migran a Prisma cuando stage1 cierre.

> Principio 10 ("doc saneamiento") del plan de continuidad ya se ejecuta en Fase 0 de este documento y en DOC-027F.0C-SANEO.

---

## Fases

### Fase 0 — Saneamiento documental y cierre formal 0A/0B (en curso, docs only)

- Consolidar ADR-027E a single source en `knowledge/architecture/`.
- Archivar `PROYECTO_CONTEXTO_MAESTRO (1).md` a `knowledge/archive/legacy-pre-v2/`.
- Completar/reescribir `REPO_MAP.md` con estado real.
- Borrar `Diccionario del Circuito Districorr.md` vacío.
- Editar `AGENTS.md` §11 para marcar prohibiciones como protectivas (decision-based gate, no sequence gate).
- Marcar `BACKEND_FOUNDATION_PLAN.md` como histórico; crear este `BACKEND_PHASE2_PLAN.md`.
- Reordenar `WORKLOG.md` cronológicamente.
- Crear `ADR-AUTH-FINAL.md` como DRAFT.

### Fase 1 — Backend circuito troncal (post-decisiones §15)

- **1A Remito unificado** — modelo + service + API companies-scoped + audit + perms + validator + migration. Reemplazar V1 (box-driven) y V2 (presupuesto-driven) por DTO provisional en paralelo a API. Requiere decisión de diseño unificado aprobada por Franco.
- **1B Consumo + Devolución** — modelo Consumo con linkage `remitoId` obligatorio a Remito; `DevolucionItem` por consumo; eliminar mutación de estado del remito; `markConsumoAsFacturado` migrado a backend.
- **1C Presupuesto** — `Presupuesto` + `PresupuestoVersion` + items. Convert-to-PE (Pedido) wireado a `Comprobante` server-side.
- **1D Facturación + Cobro/Imputación** — `Invoice` + items con `base` (presupuesto/consumo/manual/mixto), `Payment` + `Imputation` con FK por id (no por string de `Comprobante.number`); sin TusFacturasAPP todavía.
- **1E Comparativa** — vista derivada (api endpoint) sin entidad propia.

### Fase 2 — Cirugías read server-first + refactor mínimos

- `/cirugias` lista consume API por bands (filtros + tabla), sin tocar la UI del Expediente.
- Refactor de mínima: sacar lógica de `ConsumoPanel`, `TrazabilidadPanel`, `ExpedienteFullView` (orquestación legacy-sync) a hooks/services.
- Mover la fuente de Coordinadores / Calendario / Tableros a API (UI consume de API en vez de store mock).

### Fase 3 — Transversales (post-circuito troncal, paralelizable con cuidado)

- **3A Stock/Movimientos** (cajas postergadas a fase posterior).
- **3B Logística** derivada de remitos.
- **3C Trazabilidad** derivada de eventos persistentes; eliminar `traceEntries` slice muerto.
- **3D Compras/Proveedores** (necesidades → OC → movimientos).

### Fase 4 — Consolidación + Auth productivo + IA persistente

- **4A Mail stage1 → Prisma/Storage** portable; `notes` legacy deprecated por `seguimiento`.
- **4B Auth productivo** (Supabase prod, apagar fallback DEV `x-ossum-actor-user-id`, `ADR-AUTH-FINAL.md` cerrado).
- **4C IA autorización persistente** (`SurgeryAuthorization`/`SurgeryDocument` con storage y política de retención); providers restantes (gemini/anthropic/local) decididos.
- **4D Centralizar permisos** en `src/lib/permissions/*` y deprecar roles inline por servicio.
- **4E Eliminar `db.ts` singleton** migrando todos los callers a `prisma.ts` único.
- **4F Auditoría uniforme** (Seguimiento y Recibos → `AuditEvent` central).

### Fase 5 — TusFacturasAPP (futuro, solo tras facturación operativa)

- Integración backend-only especificada en ADR nueva. Nunca como núcleo. Nunca en frontend.

---

## Gates por fase

- **Migración / cambio de schema**: requiere Task Brief específico + aprobación Franco antes de tocar `prisma/schema.prisma`. Sin excepciones.
- **No tocar `prisma/schema.prisma` sin ownership lock** declarado por el agente (task, agent role, model, owned files).
- **No backend foundation (Fase 1+) sin cierre del diseño de la etapa correspondiente** (Remito unificado, Factura `base`, etc.) y aprobación de las decisiones §15 que apliquen.
- **No Auth productivo (Fase 4B)** sin `ADR-AUTH-FINAL.md` cerrado y aprobado.
- **Cada modelo nuevo** debe respetar `DATA_MODEL_RULES.md` (`String` no-enum, `companyId`, `AuditEvent` si crítica).
- **Cada API nueva** debe usar `getApiAuthContext` + scoping companyId + audit + validator + perm check.
- **Quality gates** de `knowledge/workflow/QUALITY_GATES.md` por tarea.

---

## Decisiones pendientes que requieren aprobación Franco

Ver `docs/ia-autorizaciones/PLAN_CONTINUIDAD_REAL_OSSUM_COR.md` §15 para la lista completa de 17 decisiones. Las más relevantes para Fase 1 y Fase 4 de este plan:

1. Remito unificado V1/V2 (campos, estados, obligatorios) — gating para Fase 1A.
2. Auth productivo (Supabase en prod + apagar fallback DEV + ADR Auth final) — gating para Fase 4B.
3. Storage definitivo (R2 + Supabase Storage alguna vez) — gating para Fase 4A/4C.
4. Facturación inicial sin TFAPP (modelo Invoice con `base`, postergar TFAPP) — gating para Fase 1D.
5. Cobro/Imputación por FK id (destruir match por string) — gating para Fase 1D.
6. Migración `/cirugias` lista a read server-first (por bands) — gating para Fase 2.
7. Persistencia IA autorización (`SurgeryAuthorization`/`SurgeryDocument` + retención) — gating para Fase 4C.
8. Providers IA productivos (`gemini`/`anthropic`/`local`) — gating para Fase 4C.
9. Mail stage1 en FS como productivo o esperar migración — gating para Fase 4A.
10. Auditoría Seguimiento/Recibos → `AuditEvent` central — gating para Fase 4F.
11. Permisos centralizados en `src/lib/permissions/*` — gating para Fase 4D.
12. `legacy-sync` allowlist (mismatch CX-0009) — sanitize antes de extender.
13. `ContactAddress` companyId (índice/constraint vs aserción previa).
14. `db.ts` singleton (deprecación a `prisma.ts` único) — gating para Fase 4E.
15. Doc cleanup (aprobado y ejecutado en DOC-027F.0C-SANEO, Fase 0).
16. `AGENTS.md` caducidades (aprobado y ejecutado en DOC-027F.0C-SANEO, Fase 0).
17. VPS confirmado postergado (regla `ADR-027E` y AGENTS §6).

---

## Próximo Task Brief

DESIGN-REMITO-UNIFICADO (diseño, **no implementación**) — requiere aprobación de Franco sobre §15 puntos 1, 2, 4, 5, 6, 11 antes de iniciar. No se debe tocar schema ni implementar antes de cerrar este diseño.