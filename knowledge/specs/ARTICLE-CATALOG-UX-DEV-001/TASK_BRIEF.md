# Task Brief — Article Catalog API and UX

- **ID:** `ARTICLE-CATALOG-UX-DEV-001`
- **Status:** CLOSED — DEV implementation validated; no commit or deployment performed
- **Owner:** Article Catalog API/UI implementer (`openai/gpt-5.6-terra`)
- **Mode:** implementation → focused tests → independent review

## Objective

Connect the approved persistent Article catalogs to the Article API and Stock/Articles UX without changing schema, migrations, data, Auth, permissions, or Cajas behavior.

## Allowed files

- `src/app/stock/page.tsx`
- `src/components/stock/CatalogSelect.tsx` and Article-specific Stock components
- `src/app/api/companies/[companyId]/article-catalogs/**`
- Article catalog services and validators under `src/lib/services/` and `src/lib/validators/`
- `src/lib/stock/article-adapter.ts`
- Focused tests under `src/__tests__/`
- This task brief and `LOCK.md`

## Forbidden files

- `prisma/schema.prisma`, `prisma/migrations/**`, seed/import/backfill scripts, and database state
- Auth, roles, permissions, RLS, provider configuration, Cajas flows, Cirugías, deployment, commit, push, PR

## Required controls

- Reuse the existing Article mutation guard unchanged.
- Catalog quick-create is additionally restricted to `admin`; this is the approved organization-safe authority boundary and does not alter Auth, roles, or the shared Article guard.
- Derive organization scope only from the authoritative company context.
- Validate active catalog records and same-organization references server-side.
- Preserve transition fallback only where explicitly required; no UI mock options or demo wording in Articles.

## Validation

- Focused service, route, adapter, and component tests.
- Focused TypeScript/ESLint checks.
- Authenticated browser QA if an existing DEV session is available.
- Diagnose any failure before a fix.
- Independent read-only review before closure.

## Stop and escalate

- Existing Article mutation guard is insufficient.
- A change requires schema, migration, DB/data mutation, Auth/permissions, Cajas behavior, or an unapproved file.
- Another owner claims an overlapping file.
