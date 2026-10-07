# CONTACTS-CUIT-LOOKUP-DEV-20261007 — Ownership lock

Status: editing
Owner: subagent (implementation)
Scope: dev backend (DEV stub driver)
Scope id: CONTACTS-CUIT-LOOKUP-DEV-20261007
Issued: 2026-10-07
Parent approval: Engram #9254

## Owned files

- `src/lib/services/cuit-lookup.service.ts` (new)
- `src/lib/utils/cuit-validation.ts` (new)
- `src/lib/validators/cuit-lookup.ts` (new)
- `src/lib/api/contacts.ts` (additive — `cuitLookupApi` export only)
- `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts` (new)
- `src/components/contactos/ContactoFormDialog.tsx` (minimal additive — search button + diff panel)
- `src/__tests__/unit/cuit-lookup.service.test.ts` (new)
- `src/__tests__/unit/cuit-lookup-validator.test.ts` (new)
- `src/__tests__/unit/cuit-lookup-route.test.ts` (new)
- `src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx` (new)
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/TASK_BRIEF.md` (new)
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/run-checks.mjs` (new)
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/typecheck.mjs` (new)
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md` (new)
- `knowledge/worklog/CONTACTS_CUIT_LOOKUP_DEV_2026-10-07.md` (new)

## Forbidden

- `prisma/schema.prisma`, migrations
- `src/lib/db.ts`, `src/lib/store.ts`
- Auth, roles, permissions, Auth/AuthProvider changes
- Editing foreign files in `CONTACTS-CREATE-STABILITY-20261007`, `CONTACTS-CORRELATIVE-DEV-20261007`, `CONTACTS-FRAGILITY-FIXES-20261007`
- Modifying the legacy `ContactLookupField`, `ContactSearchModal`, `useCirugiaActions`, surgery/remito/expediente pages
- Adding new npm dependencies
- `git commit`, `git push`, `git reset --hard`, `git checkout --` on foreign files
- Browser QA / Playwright
- Real DB writes
- Cache TTL persistence
- Mapping ARCA `estado` to `linkIsActive` / `isActive`
- Persisting `apoc_existe` / `actividad` / `constancia_full_datos` into Contactos
- Exponential retry / distributed throttling
- Other providers (ARCA direct, brokers)

## Boundary

Strict mapping only: `documentType`, `documentNumber`, `legalName`, `vatCondition`, `mainAddress`.
Extra info (apoc, actividad, constancia) is informational only and never persisted.