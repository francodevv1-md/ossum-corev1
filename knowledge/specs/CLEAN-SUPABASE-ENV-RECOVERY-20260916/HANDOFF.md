# Supabase Environment Recovery — Review Handoff

## Done
- Config recovery complete under explicit finite approval #6914; overall status **partial** because build acceptance remains blocked.
- Standard SDD apply / Diagnose, one bounded work unit. No Auth/application/schema change, DB query/mutation/migration, live application operation, install, storageState copy, staging/commit/deploy.
- Source workspace strictly read-only. Independent config review **ACCEPT** (`straight-aqua-lark`, Engram #6919). Follow-up diagnosis complete with evidenced scope boundary; ownership **released**, no further allowed writes pending.

## Changed
Exactly four assignments recovered into ignored destination `.env`:

| Variable name | Effective source file |
| --- | --- |
| SUPABASE_URL | `.env` |
| SUPABASE_SERVICE_ROLE_KEY | `.env.local` |
| NEXT_PUBLIC_SUPABASE_URL | `.env.local` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | `.env.local` |

- Minimum allowlist traced from `src/lib/supabase/server.ts:17-18` (eager server import) and `src/lib/auth/client.ts:12-16` (lazy browser client), confirmed against original source. No wildcard copying.
- Actual installed `@next/env` loader used in production mode, including expansion: shell > `.env.production.local` > `.env.local` > `.env.production` > `.env`. No shell override of allowlisted keys and no conflicting higher-precedence destination assignments.
- Source values stayed only in process memory and authorized ignored destination; no values, secret hashes, raw exception logs or credentials in tool arguments/artifacts.

## Files
- `E:/OSSUM_COR_WORKTREES/ossum-clean/.env` — four authorized assignments, atomic sibling-temp rename with exclusive creation, flush and concurrency guard.
- This package: `CHANGE_PACK.md`, `LOCK.md`, `HANDOFF.md` — approval, ownership, milestone and evidence. Shared worklog not edited under sole-package ownership.
- Task-specific secret-free temporary transfer/validation/guard/diagnosis scripts removed after evidence capture. No unrelated temporary files removed.
- Generated `.next` build artifacts only beyond this inventory; original uncommitted application/schema/artifacts preserved.

## Validations
- Source/destination candidate env files: Git ignored and untracked; existing files regular, single-link, no symlink in path ancestry. Temporary env sibling also ignored, removed by rename.
- In-memory evidence: exact effective source equality **true** for all four keys; source env snapshots unchanged **true**; other destination env files unchanged **true**; unrelated destination content/values preserved **true**; DIRECT_URL preserved **true**; destination equals planned allowlisted splice **true**.
- Final idempotence check: all four effective equalities **true**, copied key count **0**. No second environment repair.
- Build static-path safety: no `generateStaticParams`, `force-static`, instrumentation or explicit `$connect` found; config has no build data hook. Public receipt pages access data only in dynamic token render handlers, not import-time. Prisma pool/client initialization inspected. No handlers invoked.
- Build-only temporary guard denied outbound sockets/fetch/datagrams, with inherited worker preload. First `node node_modules/next/dist/bin/next build --webpack`: exit **1**, compilation blocked by Inter font download, **8** denial markers. This is harness-induced, not an application regression.
- Minimal guard-only correction permitted credential-free GET/HEAD HTTPS reads to `fonts.googleapis.com` / `fonts.gstatic.com`; other connections remained denied. Second build: exit **1**, webpack **passed**, page-data collection **started**, static-generation success **not observed**; missing-required-env matches **0**, network denial markers **0**, font failure **false**, Prisma initialization error match **false**, generic build-error marker **true**.
- Initial raw build output was captured/discarded in memory. The classifier did **not** retain that second failure's exact cause. Initial phase: two build attempts; no speculative environment expansion or application fix. A later authorized diagnostic build is recorded below.
- Initial read-only follow-up: loaded **96 route bundles / 0 failures**, **54 page bundles / 0 failures**, without calling handlers. This is only bundle loading/registration evidence: it did NOT prove all webpack module initialization or Next page-data collection preconditions. The subsequent actual Next build is authoritative.
- Independent `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`: exit **0**, **0 diagnostics**, after each build. Existing `ignoreBuildErrors: true` makes this independent gate necessary.
- Before/after each build: all existing files under `src`, `prisma`, `knowledge`, package/lock/config/type declaration files, and both workspaces' env snapshots byte-equal **true**.
- `git diff --check`: **PASS**, existing CRLF warnings only. Final Git inventory differs from initial only by this new documentation package; `.env` remains ignored.

### Accepted review and classified follow-up
- #6919 independently accepts effective equality, precedence, ignored/untracked/regular-file properties and no source change. Reviewer's separate `MODULE_NOT_FOUND` / `internal/preload` attempt failed before Next because Windows backslashes were stripped in NODE_OPTIONS. It is harness-only and does not classify the earlier build error.
- Follow-up used `NODE_OPTIONS=--require="C:/Users/franc/AppData/Local/Temp/opencode/clean-build-diagnostic-guard.cjs"`. Before any application load, `node -e` proved preload marker present and DB socket/fetch requests rejected: **PRELOAD_SELF_CHECK_PASS**.
- One actual guarded diagnostic build, no retry: webpack **compiled successfully in 6.3s**, type-config validation passed, page-data collection began using 15 workers, exit **1**. No preload/font/network-guard failure. Only credential-free Google Fonts HTTPS GET/HEAD allowed; DB and other external connections blocked.
- Redaction retained error details while removing known env values and encoded forms, URLs, JWTs, credential token patterns and sensitive headers/assignments; redactor self-checks passed. Sanitized evidence:

```text
Error: DATABASE_URL is required for Prisma runtime
    at <unknown> (E:\OSSUM_COR_WORKTREES\ossum-clean\.next\server\chunks\7802.js:1:14252)

> Build error occurred
Error: Failed to collect page data for /api/companies/[companyId]/compras/ocr-extract
    at ignore-listed frames {
  type: 'Error'
}
```

- Read-only root-cause trace: `ocr-extract/route.ts:4` imports `api/auth-context.ts:6`, which imports `lib/prisma.ts`; its lines 15-18 synchronously require DATABASE_URL before pool construction. No DB connection is needed to reproduce this failure. It is not a static-page rendering defect or a TypeScript/30-error recovery defect.
- Actual production loader check: DATABASE_URL shell present **false**, shell nonempty **false**, env assignment present **false**, effective present/nonempty **false**; DIRECT_URL nonempty **true**. DIRECT_URL is a separate seed/direct-connection setting, not a fallback in the existing runtime singleton.
- All pre-existing `src`, `prisma`, `knowledge`, selected root config/package files and both workspaces' env snapshots remained byte-equal during the diagnostic build. No source/Auth/env edits in this follow-up. Existing TypeScript evidence retained; no new TypeScript run claimed.
- Follow-up task scripts deleted after capturing evidence. Memory #6921 records the classified blocker.

## Risks
- Build is **not passing**: DATABASE_URL is absent. This is a proven runtime environment prerequisite outside the approved four-Supabase-key transfer. Do not fabricate a URL, reuse DIRECT_URL silently, change Auth/Prisma guards, or copy unrelated configuration. No full runtime/browser/DB certification.
- Prior compile handoff's missing receipt/email backend, budget authority compatibility and traceability baseline gaps remain unchanged. Historical 86+41 test evidence was not rerun or represented as fresh here.
- No production/staging authority granted. Service-role assignment remains server-only; Auth implementation unchanged.

## Next
- Config recovery accepted; diagnostic work concluded at an evidenced hard scope boundary; lock released as requested.
- Parent: decide explicit bounded DATABASE_URL configuration-recovery scope, if desired, before any further env/source write. No DB connection/mutation authority or further env expansion is granted by this handoff.
