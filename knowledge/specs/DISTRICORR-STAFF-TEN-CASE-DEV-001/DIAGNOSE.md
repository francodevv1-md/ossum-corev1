## Reproduce
- Exact offline unit file:16 failures/4 passes; parser throws on Markdown code fences before any database/Auth execution.

## Scope
- Only the three newly authored bootstrap/test files. Timed-out source writer produced files without a handoff; execution ownership remains main.

## Evidence
- Draft parser treats the complete Markdown as raw YAML and implements a custom parser despite installed js-yaml.
- Static draft review also found credential ACL attempted before file creation, credential persistence after Auth mutation, unconditional note duplication and surgery rewrites on repeated runs, no atomic dataset transaction, and UTC-midnight date shift for local rendering.
- No draft apply executed; all existing DB/Auth records remain unchanged.

## Hypothesis
- Unexecuted draft is incomplete, not an external service or user-manifest failure. Fix the bounded entrypoint before any mutations.

## Minimal Fix
- Reuse installed js-yaml on fenced YAML, retain trust-boundary validation, deterministic task-owned IDs and exact-target guards.
- Create/harden protected empty credentials file before generating/provisioning accounts; retain it for resumability.
- Serialize database import atomically, verify ownership on reuse and never overwrite progressed surgeries or duplicate seeded notes.

## Validate
- Completed:20/20exact sanitized offline units, independent review, read-only preflight, actual bounded apply/read-onlyverify and9real login/API checks. TypeScript completed on second check after a120second diagnostic-free timeout; no code fix for that timeout.

## Regression Check
- Existing source/app/login/logo/schema/permissions/Cajas remain untouched. No financial prices or dispatch facts synthesized.

## Handoff
- Main recovered ownership of the three exact new files after delegation timeout; source-only draft results are not counted as validation.
