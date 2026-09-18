# Bounded DATABASE_URL recovery

- Task: CLEAN-DATABASE-URL-RECOVERY-20260916; T3 secrets-sensitive; finite approval #6924 (`Autorizo todo` to DATABASE_URL-only recovery).
- Owner: SDD apply config/docs/test executor; model `openai/gpt-6-astra`; Standard mode; one finite configuration unit.
- Allowed: destination ignored `.env` DATABASE_URL assignment only; this package; task-specific secret-free temporary scripts; generated build outputs.
- Source `E:/OSSUM_COR_PROJECT` strictly read-only. Preserve DIRECT_URL, four Supabase keys and all unrelated destination bytes/values. No URL rewriting or assumed DIRECT_URL equivalence.
- Forbidden: other env/app/Auth/schema/dependency changes, installs, DB connections/queries/mutations/migrations, application handlers/manual actions, browser/login, storageState, staging/commits/push/deploy, secret output/hashes.
- Commands: read-only tracing/Git checks, guarded in-memory atomic transfer, preflight-tested guarded build, independent full no-emit tsc.
- Validation: actual installed Next production loader precedence/expansion; source/effective equality, ignored/untracked/non-linked checks, concurrency guards, source and unrelated destination preservation, idempotence, sanitized exact build evidence.
- Stop: conflicting ownership/precedence, absent or ambiguous source, unsupported literal, unauthorized scope or data access needed. Max two cycles of the same proven blocker.
- Output: compact Caveman with evidence and review lock. Parent independently reviews/releases.

## Diagnose / tasks
- [x] Reproduction/evidence: prior guarded Next build compiled then failed at prisma.ts:15-18, `DATABASE_URL is required for Prisma runtime`, via OCR route -> auth-context -> prisma. No data access needed.
- [x] Hypothesis/scope: missing runtime environment prerequisite; destination production loader confirmed DATABASE_URL absent; DIRECT_URL is distinct, not fallback.
- [x] Minimal fix: transferred only effective original DATABASE_URL from source `.env.local` into destination `.env`.
- [x] Validate/regression: equality/preservation/idempotence PASS; one guarded build exit 0; full independent tsc exit 0 / zero diagnostics.
- [x] Handoff: outcomes recorded, own scripts removed, ownership review.
- [x] Final review: `renewed-silver-wren` ACCEPT #6929; independent current equality/precedence/ignore/link evidence recorded, historical pre-transfer preservation explicitly implementer-reported. Parent independently reran full tsc exit 0 and diff check PASS.
- [x] Docs-only finalization: build + type acceptance complete; LOCK released. Runtime/DB/browser acceptance not claimed; no env/code/build/test actions in this finalization.
