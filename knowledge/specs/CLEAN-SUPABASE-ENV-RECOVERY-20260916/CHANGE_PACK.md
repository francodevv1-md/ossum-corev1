# Bounded Supabase environment recovery

- Task: CLEAN-SUPABASE-ENV-RECOVERY-20260916; T3 secrets-sensitive, finite approval Engram #6914 (`autorizo 100%`).
- Owner: SDD apply executor, config/docs/testing; model `openai/gpt-6-astra`; implementation mode Standard.
- Scope: restore only application-required Supabase assignments in ignored destination `.env`; source `E:/OSSUM_COR_PROJECT` strictly read-only.
- Allowed writes: destination `.env`, this package, task-specific secret-free scripts under approved temporary directory; generated build outputs.
- Forbidden: other environment files, Auth/application/schema changes, permissions, DB operations, migrations, storageState, installs, staging/commits/deploy, credential output or secret hashes.
- Commands: read-only Git checks/source tracing; guarded in-memory environment transfer; sanitized offline build and independent no-emit TypeScript.
- Validation: ignored/untracked regular files; actual Next loader precedence; exact effective source equality; unrelated destination bytes and DIRECT_URL unchanged; existing work preserved; source files unchanged.
- Stop: ownership overlap, missing required source key, overriding destination file conflict, ambiguous assignment syntax, any expansion of approved scope.
- Delivery: one bounded unit, no PR; under 400 lines, low review-budget risk; no additional decision required. Parent owns independent review/release.

## Diagnose / tasks
- [x] Reproduce/context: accepted compile handoff records `npm run build` webpack success then page-data failure `Missing required environment variable: SUPABASE_URL`.
- [x] Scope/evidence: server loader requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY at import; browser loader requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY lazily. Same names in source workspace. No wildcard copying.
- [x] Hypothesis: incomplete local configuration, not an Auth implementation defect.
- [x] Minimal fix: guarded atomic update of four allowlisted assignments only.
- [x] Validate: precedence/equality/preservation PASS; safe build attempted twice, still blocked (see HANDOFF).
- [x] Regression: independent TypeScript PASS and existing-work preservation PASS.
- [x] Handoff: sanitized results and remaining runtime gaps recorded. Build acceptance remains open, not marked passed.
- [x] Follow-up: independent config ACCEPT #6919 recorded; preload self-check passed; one guarded actual build classified missing DATABASE_URL (#6921). No app/env edits; own docs updated and lock released at this evidenced scope boundary.
