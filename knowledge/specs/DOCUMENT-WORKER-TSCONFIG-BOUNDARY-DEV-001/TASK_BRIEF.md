# DOCUMENT-WORKER-TSCONFIG-BOUNDARY-DEV-001

- Objective: keep the independently configured Cloudflare document Worker out of the Next.js root TypeScript program.
- Owner: Orchestrator / GPT-5.6-sol
- Mode: implementation + QA
- Allowed: root `tsconfig.json` exclusion and validation of the existing Worker package.
- Forbidden: Worker runtime behavior, bindings, secrets, dependencies, deploy, Auth/security rules, schema, migrations, DB, commit, push, and unrelated cleanup.
- Validation: Worker tests/typecheck, root typecheck attribution, scoped diff check, independent review.
- Stop: root application imports Worker source, Worker validation fails, or scope expands beyond tooling isolation.
