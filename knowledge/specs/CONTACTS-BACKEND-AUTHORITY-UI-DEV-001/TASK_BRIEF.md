# Task Brief — Contactos backend authority and operational UI DEV

## Objective

Make Contactos server-backed across the master page and reusable Surgery selectors, while aligning the UI with the canonical Artículos/Remitos design language.

## Risk and approval

- Risk: T3 schema/migration plus T2 API/UI integration.
- Approval: Franco explicitly responded `confirmo y apruebo` on 2026-09-03 to the bounded DEV schema/migration package.
- Owner: `openai/gpt-5.6-sol`, Backend/DB + Frontend implementation.

## Scope

- Persist company-scoped contact code, multiple roles, groups and role-specific profile data; identity, notes and reusable addresses remain global and may be shared across linked companies as confirmed by Franco on 2026-09-03.
- Centralize Contact API parsing and queries; keep company scoping and existing mutation roles unchanged.
- Remove local mutation/read fallback from Contactos and reusable contact selectors.
- Use backend contacts in `ContactSearchModal` and `ContactLookupField`, which are consumed by Nueva Cirugía without modifying its core page/dialog.
- Redesign Contactos page and dialogs using `DESIGN.md`, Artículos and Remitos as visual references.
- Add focused schema artifact, service/validator/adapter and component tests.

## Allowed files

- `prisma/schema.prisma`
- `prisma/seed.ts` — Contactos fixture fields only
- `prisma/migrations/20260903130000_contacts_backend_authority/migration.sql`
- `src/app/api/companies/[companyId]/contacts/**`
- `src/lib/services/contact.service.ts`
- `src/lib/validators/contact.ts`
- `src/lib/api/contacts.ts`
- `src/lib/api/contact-adapter.ts`
- `src/app/contactos/page.tsx`
- `src/components/contactos/**`
- `src/components/ui/dialog.tsx` — reduced-motion exit fix only
- `src/components/ui/alert-dialog.tsx` — reduced-motion exit fix only
- focused tests under `src/__tests__/**`
- this Change Pack directory
- `AGENTS.md` — append-only active approval record for GGA evidence

## Forbidden files/actions

- Auth, guards, permission-role changes, production/staging, deploy, push, PR or unrelated modules.
- `src/app/cirugias/page.tsx`, `src/components/cirugias/**`, Surgery services/routes/schema and core Surgery behavior.
- Destructive contact deletion or mutation of real/non-disposable data.

## Validation

- Prisma format, validate and generate.
- Focused Vitest coverage.
- TypeScript, build, `git diff --check` and browser QA.
- Migration execution only after the target database is explicitly confirmed disposable DEV.

## Stop conditions

- Existing ownership overlaps any allowed file.
- The implementation needs Auth/permission changes, destructive data handling, production data or core Surgery changes.
- The same blocker survives two minimal Diagnose cycles.
