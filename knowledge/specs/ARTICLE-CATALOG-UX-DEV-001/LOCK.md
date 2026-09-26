# Ownership Lock — ARTICLE-CATALOG-UX-DEV-001

- **Task:** Article Catalog API and UX
- **Owner:** Article Catalog API/UI implementer (`openai/gpt-5.6-terra`)
- **Status:** released — functional review PASS; protected-file attribution unprovable in shared dirty worktree
- **Owned scope:** Article catalog API, services/validators, Stock Article form/selectors/filters/adapter, focused tests, and this package documentation.
- **Excluded:** schema, migrations, DB/data mutation, Auth/permissions, Cajas, Cirugías, deployment, Git publication.
- **Release evidence:** functional review PASS after all findings were resolved; focused tests, ESLint, and diff checks pass. A second review could not prove unrelated protected-file changes were outside this package because the shared worktree was already dirty and no isolated package base/diff exists.
- **Approved catalog authority:** `requireArticleMutationAccess` remains the first guard; quick-create requires `ctx.role === "admin"` after it. This preserves the existing guard and prevents a company-scoped operator from creating organization-shared catalog records.
