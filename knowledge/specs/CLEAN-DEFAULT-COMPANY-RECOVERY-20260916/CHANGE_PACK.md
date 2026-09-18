# Default-company configuration recovery

- Task: CLEAN-DEFAULT-COMPANY-RECOVERY-20260916; T3 secrets-sensitive finite approval #6978 (`AUTORIZO`), original exact value only.
- Owner: sole SDD apply config/docs/testing executor; `openai/gpt-6-astra`; Standard mode; one bounded unit.
- Allowed: destination ignored `.env` NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID assignment only, this package, own secret-free temporary scripts, generated `.next` outputs.
- Source `E:/OSSUM_COR_PROJECT` strictly read-only. Preserve DATABASE_URL, DIRECT_URL, four Supabase keys and all unrelated content/values. No company selection/membership change beyond exact approved config recovery.
- Forbidden: other env/source/Auth/roles/permissions/schema changes, DB connections/queries/mutations/migrations, browser/login, installs, commits/deploy, values/identifiers/secret hashes in outputs.
- Commands: read-only status/trace, actual installed Next DEV+production loader checks, guarded atomic in-memory transfer, preflight-tested network-guarded build, full no-emit tsc.
- Stop: ownership conflict, shell override, missing source, DEV/production disagreement, conflicting higher precedence, unsupported literal or scope expansion.
- Validation: exact DEV+production effective equality and idempotence; unique assignment; ignored/untracked/non-linked/concurrency checks; byte preservation; one safe build and full tsc. Parent independently reviews; lock ends review.

## Diagnose / tasks
- [x] Reproduction/evidence #6976: session existed but company context absent and no `/me` calls; AuthProvider.tsx:9,139,157 gates request on session and configured company.
- [x] Scope/hypothesis: missing exact default-company configuration, not proven expired auth or changed membership. No Auth modification.
- [x] Minimal fix: DEV+production source values agree, `.env.local` wins both; single-key atomic recovery complete.
- [x] Validate/regression: loader equality/preservation/idempotence PASS; one guarded build PASS; full independent tsc PASS.
- [x] Handoff: static request precondition only; fresh authenticated `/me` preflight remains parent-owned and pending. Lock review.
- [x] Finalization: independent ACCEPT #6987 (`particular-red-rooster`), four isolated DEV/production loader checks recorded; LOCK released. Own docs only, no validation rerun. Parent's fresh headed Chrome awaits manual login; no duplicate browser bootstrap and no runtime acceptance claimed.
