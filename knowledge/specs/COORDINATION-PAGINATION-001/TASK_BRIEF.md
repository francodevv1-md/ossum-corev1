# Task Brief — Coordination Pagination V1

- **Approval:** Franco explicitly requested continuing with the next recommended Coordination change on 2026-08-15.
- **Objective:** replace unbounded Coordination reads with 50-row server pages and explicit incremental loading while preserving company and personal coordinator scoping before pagination.
- **Owned files:** Coordination validator, service, API client, hook, global/personal load-more controls, surgery ordering, and focused tests.
- **Lock:** `released` — Gentle Fast / GPT-5.6 Sol. New files were clean; the two already-modified services belong to the immediately preceding uncommitted Coordination durability package.
- **Excluded:** schema, migrations, Auth/permissions, production data, deployment, commit, push, PR, and unrelated dirty Stock/Cajas/Remito files.
- **Validation:** focused Vitest, TypeScript, ESLint, build, scoped diff checks, and independent review.
