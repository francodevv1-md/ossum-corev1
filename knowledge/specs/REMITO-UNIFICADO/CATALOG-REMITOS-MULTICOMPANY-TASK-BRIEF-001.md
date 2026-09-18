# Task Brief — CATALOG-REMITOS-MULTICOMPANY-001

**Mode:** serialized implementation after approval confirmation
**Owner:** one Backend/DB + Frontend executor at a time, with explicit ownership transfer
**Selected model:** `openai/gpt-5.6-terra`
**Dependencies:** `CATALOG-REMITOS-MULTICOMPANY-SPEC-001.md`; Franco's recorded schema/migration approval; no active lock on listed files.

## Objective

Implement the approved minimal Company-owned Product catalog and active Product search/select flow for Remito draft lines, preserving manual lines and all existing Remito snapshots/legacy IDs.

## Scope

Included: Product schema/migration/DEV seed; Company-scoped Product server validation, services, routes, permissions, audit, and search cursor; optional `RemitoItem.productId`; Remito snapshot/trace validation; API client; Remito workspace product-search modal; focused tests and DEV browser QA.

Excluded: every non-goal in the SPEC, any product import, stock/availability/pricing, catalog-management page/navigation UX, Cirugías/Expediente refactor, broad permission refactor, dependency installation, and unrelated cleanup.

## Locks and execution rules

- Set one visible lock before each phase: `task | owner | model | exact files | reserved/editing/review/released`.
- Serialize phases 1–6. Do not overlap the schema, Remito service/validator/route chain, workspace, or their focused tests.
- Preserve unrelated dirty work. Do not stage, revert, format, or edit files outside the active allowlist.
- No migration, seed mutation, or database command until the required approval is visible and the schema lock is exclusively held.

## Phases

### Phase 1 — Schema and migration

**Allowed files:** `prisma/schema.prisma`, new `prisma/migrations/<timestamp>_add_company_product_catalog/migration.sql`.
**Work:** apply the exact schema proposal; generate and inspect a non-destructive migration; generate Prisma client.
**Validation:** `npx prisma format`; `npx prisma validate`; inspect migration SQL; `npx prisma generate`.
**Stop:** missing Franco approval; generated SQL changes/drops unrelated objects; a backfill is required; schema conflict/active lock.

### Phase 2 — Catalog server boundary

**Allowed files:** new Product service/validator/routes and focused Product/search tests; existing reusable API guards/errors/responses only if strictly necessary and explicitly locked.
**Work:** Product CRUD/archive server contracts, active search endpoint, cursor behavior, roles, company scoping, and audit.
**Validation:** focused Product service/validator/route tests; typecheck.
**Stop:** any Auth/RBAC model change, audit actor incompatibility, need for a PostgreSQL extension, or route contract ambiguity.

### Phase 3 — Remito linkage boundary

**Allowed files:** `src/lib/services/remito.service.ts`, `src/lib/validators/remito.ts`, relevant Remito routes/API types, and focused Remito tests.
**Work:** optional `productId`, server-resolved snapshot mapping, cross-company checks, trace requirements, archived handling, and audit.
**Validation:** focused Remito tests; typecheck.
**Stop:** any need to mutate historical/issued Remitos, repurpose `itemId`, alter Remito lifecycle, or introduce stock/import semantics.

### Phase 4 — DEV seed

**Allowed files:** `prisma/seed.ts` and focused seed verification only.
**Work:** idempotent Company-scoped Product examples specified in the SPEC.
**Validation:** approved disposable DEV seed run plus query/assertion; no production database.
**Stop:** DEV Company cannot be resolved safely, seed duplicates/rewrites data, or seed needs stock/price/source imports.

### Phase 5 — API client and workspace modal

**Allowed files:** new Product API client/types, `src/components/remitos/OperationalRemitoWorkspace.tsx`, directly supporting local component(s), and focused workspace tests.
**Work:** replace only the disabled search placeholder with the specified accessible modal and mapping.
**Validation:** focused component/API-client tests; typecheck; DEV browser QA.
**Stop:** the work needs a global store, a new dependency, a catalog-management navigation/screen, changes to recovery/concurrency contract, or changes outside the workspace allowlist.

### Phase 6 — independent QA/review

**Allowed files:** no writes.
**Work:** review all changed files against the SPEC, run gates, and report any regression without fixing it.
**Validation commands:** focused tests; `npm run typecheck`; `npm run lint`; `npm test`; `npm run build`; Prisma validation/generation if schema changed; approved DEV browser QA.
**Stop:** authorization bypass, tenant leak, migration issue, trace-rule bypass, legacy manual-line regression, or any failed quality gate. Use Diagnose before proposing a fix.

## Commands

Allowed only in the owning phase: read-only Git commands; `npx prisma format|validate|generate|migrate dev --create-only`; approved disposable-DEV migration/seed command; `npx vitest run <focused files>`; `npm run typecheck|lint|test|build`.

Forbidden: `prisma db push`, `prisma migrate reset`, production database commands, dependency install/update, Git commit/push, destructive SQL, broad test fixes, or browser actions against production.

## Required completion gates

1. Migration SQL is additive and reviewed; generated Prisma client is current.
2. Unique SKU, tenant isolation, roles, active-only search, cursor errors, archive behavior, snapshot mapping, manual compatibility, and all four trace modes have passing focused coverage.
3. No Product search result or Remito linkage leaks another Company.
4. Existing Remito create/update/emit/devolution behavior remains green.
5. DEV browser QA proves accessible modal selection and manual-line fallback at desktop and narrow viewport.
6. Worklog, Handoff, and Engram session summary are completed. Open assumptions and risks are declared; no approval decision is silently made by the executor.

## Stop and escalate

Stop immediately and ask Franco/the orchestrator if an assumption in the SPEC is rejected, Product deletion is requested, SKU case semantics differ, trace serial cardinality is needed, a catalog-management screen/navigation is needed, search needs a database extension, any stock/price/import capability is implied, or the task needs Auth/schema/permission changes beyond the approved proposal.
