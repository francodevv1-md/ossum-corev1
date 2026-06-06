# ADR-027E — Backend / DB / ORM / Auth / Storage

Estado: vigente para V0, condicionado por secuencia GPT-027F 0A → 0B → 5A  
Última actualización: 2026-06-03

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

---

## Auth y Storage

No se cierran en esta ADR.

Opciones:

- Supabase Auth si se usa Supabase y reduce complejidad.
- Clerk solo con ADR explícita.
- NextAuth/Auth propia como alternativa, no prioridad si complica.
- Supabase Storage o R2/S3 futuro.

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

