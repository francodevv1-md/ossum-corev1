# CORE-FLOW-STABILIZATION-DEV-001

- Objective: validate the existing Presupuesto → Preparación → Remito/Detallado → Consumo → Devolución → Trazabilidad DEV flow and fix only reproduced, in-scope regressions.
- Owner: Orchestrator / GPT-5.6-sol
- Mode: implementation + QA
- Allowed: focused tests and minimal fixes in existing flow files.
- Forbidden: schema, migrations, DB mutation, Auth/security/permissions changes, production/staging, secrets, deploy, commit, push, and unrelated cleanup.
- Validation: focused tests first; typecheck/build only as broader evidence, with pre-existing dirty-tree failures reported separately.
- Stop: ownership overlap, business-rule ambiguity, destructive action, or a required forbidden-file change.
