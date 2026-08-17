# Task Brief — Coordination Backend Durability V1

- **Approval:** Franco explicitly requested continuation of the backend work shown in the Coordination pending list on 2026-08-15.
- **Objective:** remove the implicit 50-surgery truncation, scope personal Coordination reads before limiting, propagate canonical material availability, and persist surgery date/time plus urgency through the existing surgery service.
- **Owned files:** Coordination read service, surgery read service, surgery API adapter/client, Coordination management dialog/helper, shared Surgery type, and focused tests.
- **Lock:** `released` — Gentle Fast / GPT-5.6 Sol. Preflight found every owned file clean and no active overlapping edit; unrelated dirty Stock/Cajas/Remito work remains foreign-owned.
- **Excluded:** `prisma/schema.prisma`, migrations, Auth/permission policy changes, production data, deployment, commits, shipping/transport schema design, and availability capability changes.
- **Authorization:** the new management PATCH applies the existing Surgery mutation role set (`admin`, `manager`, `coordinator`, `owner`, `super_admin`); it does not introduce or modify role policy.
- **Known V1 boundary:** shipping and transport remain recorded in Seguimiento/local UI because no approved canonical fields exist; canonical availability remains governed by its existing capability-controlled workflow.
- **Validation:** focused Vitest, ESLint on touched source, TypeScript/build where the unrelated worktree baseline permits, and scoped diff checks.
