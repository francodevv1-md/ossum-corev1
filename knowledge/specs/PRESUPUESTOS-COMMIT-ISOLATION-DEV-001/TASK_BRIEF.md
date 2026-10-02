# PRESUPUESTOS-COMMIT-ISOLATION-DEV-001

- Owner: commit preparation and focused QA agent; model `openai/gpt-6.1-sol`.
- Mode: implementation/testing in scratch; source worktree read-only.
- Approval: user explicitly authorized continuing isolation after mixed billing-gate changes blocked the local commit.
- Base: `2d8d61799290ee20c6280b58fdb980254601e83a`.
- Objective: inventory exact dependencies, produce a minimal budget-only patch and validate that isolated candidate.
- Allowed writes: new task artifacts in this directory and new scratch directory `C:/Users/franc/AppData/Local/Temp/opencode/presupuestos-commit-isolation-20261002` only.
- Forbidden: original source/tests/index changes; stage/commit; Stock/Compras/schema/migrations; secrets/env/session state; billing-gate/liquidation; auth/security/business-rule edits; config/identity changes; install; push/PR/deploy; shared Next build; server restart; real DB/browser/fiscal operations.
- Commands: read-only Git inventory; HEAD archive; byte-safe candidate generation; Git apply in scratch; existing dependency reuse; focused Vitest; standalone TypeScript/lint in scratch.
- Validation: full original source SHA256 manifest before/after; index and HEAD preservation; isolated candidate allowlist/blob/file hashes; dependency review; focused tests without skips or weakened assertions.
- Stop: ownership overlap, required excluded dependency, source preservation mismatch, or hard stop.
- Handoff: Done / Changed / Files / Validations / Risks / Next. Independent orchestrator review follows this handoff.
