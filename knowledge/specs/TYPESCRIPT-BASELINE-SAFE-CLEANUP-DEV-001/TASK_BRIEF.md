# TYPESCRIPT-BASELINE-SAFE-CLEANUP-DEV-001

- Objective: reduce the reproduced TypeScript baseline using minimal test/tooling-only corrections.
- Owner: Orchestrator / GPT-5.6-sol
- Mode: implementation + QA
- Allowed: non-sensitive tests and tooling files selected by Diagnose evidence.
- Forbidden: Auth, security/permissions, production APIs/services, business rules, schema, migrations, DB, secrets, dependencies, deploy, commit, push, and unrelated cleanup.
- Validation: focused tests, scoped lint, then `npm run typecheck` to measure the remaining baseline.
- Stop: a fix requires production semantics, sensitive files, ownership overlap, or scope expansion.
