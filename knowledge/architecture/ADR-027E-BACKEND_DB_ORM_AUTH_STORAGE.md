# ADR-027E — Backend / DB / ORM / Auth / Storage

> **Fuente autoritativa única.** Cualquier copia en `docs/` es histórica y no se actualiza.

Estado: vigente para V0
Fecha original: 2026-06-02
Última actualización: 2026-06-15 (consolidado 2026-07-07)
Proyecto: OSSUM COR

---

## Decisión

Para el backend real V0 de OSSUM COR se adopta un monolito modular basado en:

- Next.js actual.
- API Routes y/o Server Actions.
- Prisma como ORM.
- PostgreSQL gestionado como base de datos.
- Supabase o Neon como proveedores PostgreSQL candidatos.
- Supabase Auth/Storage como opción posible, no obligatoria.
- VPS postergado.

Esta ADR define la decisión técnica para backend, pero no habilita iniciar implementación grande hasta cerrar 0A/0B.

---

## Secuencia

1. GPT-027F.0A — Knowledge V2 / saneamiento documental.
2. GPT-027F.0B — Gentle-AI workspace / Engram / SDD / Skill Registry / guardrails.
3. GPT-027F.5A — Backend Foundation.

> Estado de secuencia (2026-07-07): 0A y 0B CERRADOS. 5A EJECUTADO parcialmente (schema phase1, auth Supabase DEV, contactos API, surgeries API, seguimiento, notificaciones, recibos digitales, mail stage1, IA autorización). Ver addendums abajo y `knowledge/architecture/BACKEND_PHASE2_PLAN.md` para el plan de fase 2.

---

## Reglas obligatorias

- No lógica crítica en componentes React.
- No Zustand/localStorage como fuente final.
- No Prisma desde componentes.
- API Routes/Server Actions deben llamar servicios de dominio.
- Toda entidad operativa debe tener `company_id` cuando corresponda.
- Toda operación multiempresa debe validar usuario/empresa.
- Toda acción crítica debe crear `AuditEvent` o equivalente.
- Toda operación multi-entidad debe usar transacción.
- No asumir reglas de negocio.
- No mezclar facturación/cobros/fiscal en primer backend foundation salvo ADR específica.

---

## Supabase vs Neon

La elección debe hacerse al iniciar 5A, comparando:

- conexión con Prisma;
- costo y límites iniciales;
- estrategia de Auth;
- estrategia de Storage;
- backups/exportación;
- entorno local/dev;
- riesgo de lock-in;
- simplicidad operativa para Franco y agentes.

> Decisión vigente (desde addendum 2026-06-04): **DB provider: Supabase**. **Auth: Supabase Auth**. Storage: diferido. Stock fuera del primer commit.

---

## Auth y Storage

No se cierran en esta ADR como decisión final productiva. Ver `ADR-AUTH-FINAL.md` (DRAFT) para el cierre pendiente.

Opciones:

- Supabase Auth si se usa Supabase y reduce complejidad.
- Clerk solo con ADR explícita.
- NextAuth/Auth propia como alternativa, no prioridad si complica.
- Supabase Storage o R2/S3 futuro.

> Estado DEV (hasta addendum 2026-06-15): Supabase Auth operacional en DEV con `getApiAuthContext` + mapeo `supabaseAuthId → User.id (cuid)` + fallback DEV `x-ossum-actor-user-id` (solo fuera de producción).

---

## VPS

No para V0.

Requiere Docker, backups, restore probado, SSL, firewall, monitoreo y hardening.

---

## Backend Foundation 5A

Recién puede iniciar cuando 0A y 0B estén cerrados.

Objetivo:

- Prisma/PostgreSQL.
- Servicios server-side.
- API Routes/Server Actions.
- Seed limpio.
- Auditoría mínima.
- Migración progresiva desde Zustand/localStorage.

---

# Addendums (consolidación histórica)

Los addendums siguientes se consolidaron desde `docs/ia-autorizaciones/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` (consolidación 2026-07-07). Se conservan textuales con su fecha y sección para mantener la trazabilidad histórica de las decisiones tomadas entre el 2026-06-04 y el 2026-06-15.

---

## Addendum 2026-06-15 — Backend Foundation y Surgery Phase 1

### Decisión ratificada

Se mantiene la arquitectura V0 definida por esta ADR:

- Next.js + API Routes.
- Prisma.
- PostgreSQL gestionado.
- Supabase Auth como auth operativo DEV.
- Servicios server-side como lugar de lógica de negocio.
- AuditEvent como auditoría transversal.

### Estado implementado

El backend foundation ya no es solo plan: fue validado progresivamente con:

- Auth real Supabase.
- Bearer token frontend → API.
- Usuario interno y empresa activa.
- API protegidas por companyId.
- Contactos lectura/mutaciones reales con auditoría.
- Vista /auditoria.
- Vista técnica /cirugias-api.
- Surgeries API enriquecida con relaciones patient, doctor e institution.

### Surgery Phase 1 integrada

La entidad Surgery fue expandida como núcleo real de operación:

- visibleNumber
- payerContactId
- cxStatus
- prepStatus
- classification
- description
- priority
- probableDate
- scheduledDate
- performedDate
- cancelledDate
- source

Se creó SurgeryContactAssignment para roles flexibles por cirugía.

Se reemplaza conceptualmente el estado único por dos dimensiones:

- cxStatus: estado quirúrgico/administrativo de la cirugía.
- prepStatus: estado de preparación/material.

### Regla de compatibilidad

/cirugias principal continúa sin migrarse. Todavía depende de Zustand, hooks y expediente UI. Cualquier migración de esa pantalla requiere task brief específico, adapter controlado y smoke exhaustivo.

/cirugias-api es la vista técnica para validar backend real y no reemplaza todavía al módulo principal.

### Próxima ADR/spec recomendada

Fase 2A debe diseñar Autorización + Documentos/OCR antes de tocar schema:

- SurgeryAuthorization.
- SurgeryDocument.
- metadata de archivos.
- OCR status/resultados sugeridos.
- revisión humana.
- vínculo autorización/documento/cirugía.

No avanzar todavía con remitos, consumo, stock fino o facturación hasta cerrar ese diseño.

---

## Addendum 2026-06-09 — Estado DEV Auth/Backend

Actualizado: 2026-06-09. Estado vigente: backend y autenticacion inicial validados en entorno DEV. Storage queda diferido. Proximo frente: Login UI y frontend de autenticacion.

---

## Addendum 2026-06-05 — 5A-01 completado

Backend Foundation avanzó hasta schema inicial Prisma.

Estado:

- 5A-00B decisiones backend completadas.
- 5A-00C Prisma 7 config completada.
- 5A-01 schema inicial Prisma completado.

Decisiones vigentes:

- DB provider: Supabase.
- Auth: Supabase Auth.
- Storage: diferido.
- Stock: fuera del primer commit.

Schema inicial creado:

Organization, Company, Branch, User, UserCompanyAccess, Contact, ContactCompanyLink, ContactGroup, ContactGroupMembership, ContactAddress, Surgery mínima, AuditEvent.

Validación:

- npx prisma format OK.
- npx prisma validate OK.

Condición:

No ejecutar migraciones todavía. Próximo paso obligatorio: GPT-027F.5A-01R Review QA schema inicial Prisma.

---

## Addendum 2026-06-04 — Backend Foundation habilitado

Backend Foundation queda habilitado para preparación.

Estado:

- 0A cerrado.
- 0B cerrado funcionalmente.
- 0C-01 completado.
- Tests, TypeScript y build en verde.

Decisiones:

- Supabase.
- Supabase Auth.
- Storage diferido.
- Stock fuera del primer commit.
- Primer schema limitado a multiempresa, contactos, cirugía mínima y auditoría.

Condición:

No tocar prisma/schema.prisma sin Task Brief explícito y aprobación de Franco.

Próximo paso:

Crear proyecto Supabase ossum-cor-dev y obtener DATABASE_URL y DIRECT_URL.