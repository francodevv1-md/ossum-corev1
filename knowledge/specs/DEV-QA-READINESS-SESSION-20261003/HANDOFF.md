# Handoff

## Done
- Delivered redacted offline development-environment checker and manual-login capture/reusable-session preflight tooling.
- Provisioned missing Chromium binaries for the already-installed Playwright; short local HTML launch smoke passed and browser closed.

## Changed
- Three isolated new QA scripts, bounded brief/replay/handoff and released ownership lock. No existing application, env, config, schema, Auth or package files edited by this task.
- Checker uses installed `@next/env` development precedence. Existing app/Prisma/Vitest loaders were not changed.
- Session observes the app's real Bearer membership response, requires exact expected company, keeps state outside all Git worktrees, refuses overwrite, closes browser and has a 20-minute maximum. It does not automate credentials or authorize business mutations.

## Files
- scripts/qa/dev-readiness.mjs
- scripts/qa/dev-session.mjs
- scripts/qa/dev-readiness.test.mjs
- knowledge/specs/DEV-QA-READINESS-SESSION-20261003/{TASK_BRIEF,REPLAY,HANDOFF}.md
- .opencode/locks/DEV-QA-READINESS-SESSION-20261003.lock.md

## Validations
- PASS: `node --test scripts/qa/dev-readiness.test.mjs`: 7 synthetic tests, independently repeated by reviewer. File-symlink assertion NOT RUN due to Windows privilege; junction check passed.
- PASS: `node --check` on all three scripts. Existing tracked `git diff --check` passed with line-ending warnings; this is not an untracked-file certification.
- PASS: real `node scripts/qa/dev-readiness.mjs` for required presence/format and Chromium availability. No secret values printed. This does not certify validity, connectivity, isolation or live integrations. Optional GMAIL_MAILBOX is missing.
- PASS: Chromium local-HTML smoke; no app, backend or business data accessed.
- BLOCKED: `CORE_FLOW_BASE_URL=http://localhost:5000 node scripts/qa/dev-readiness.mjs --tcp`: TCP unreachable. No listeners found on ports 3000/3001/5000.
- BLOCKED: direct session preflight invocation without configured prerequisites fails closed with redacted output. Real authenticated capture/preflight acceptance NOT RUN.
- PASS: independent source/synthetic review `cool-beige-dingo`; actual LoginForm/AuthProvider/API fetch and membership response match observer assumptions. Not runtime certification.
- NOT RUN: full build/typecheck, DB integrations, operational process E2E; no application TS changes and shared Next output ownership unresolved.

## Risks
- `CLOUDFLARE-BUILD-PREP-DEV-20261002/LOCK.md` remains editing and reserves shared .next/DEV5000. The prior runtime rehearsal lock is released. Shutdown and absent listeners do not release another task's lock.
- Compras chain/schema remains under its separate editing owner; no takeover.
- Real browser capture/reuse/expiry and timeout acceptance still pending. The inspected intended login/preflight path has no business writes; tooling is not an arbitrary-navigation read-only sandbox. Keep manual interactions to login only.
- File mode 0600 is requested, not a Windows ACL certification. No credentials/session contents in artifacts or Engram.

## Next
- Resolve Cloudflare runtime/output ownership with Franco before starting the local app. Then fresh manual login, exact expected DEV-company membership preflight, session reuse.
- Only after fixture/outbound-isolation scope is established: saved intake + missing-evidence rejection + explicit-exception authorization + backend readback/reload test. Do not infer approval for fiscal/mail, Cajas or arbitrary DB writes.
- Same replay commands and setup limits are in REPLAY.md. No commits, deploy or real-data changes performed.

## Runtime continuation — 2026-10-03

- **Done:** Franco explicitly transferred the DEV5000/.next reservation with “si confirmo toma esa reserva”. Local current-source app started; login HTTP200. Headed manual-login capture completed, then saved-state membership preflight passed.
- **Changed:** Cloudflare retains source/config/.open-next ownership; only .next/DEV5000 runtime reservation transferred. Current task now reserves those resources while its server remains active. No existing server was killed.
- **Files:** Task/Cloudflare locks and this task's docs; local capture launcher/logs/session under Temp/opencode, outside Git. No session contents read into tools/chat. next-env.d.ts baseline hash remained identical.
- **Validations:** Actual `dev-session.mjs capture` emitted PASS fresh session saved; subsequent `preflight` emitted PASS authenticated/200 JSON exact-company membership, saved state reused without overwrite. Both browser contexts closed. Launcher PID12552/listener21948; capture process20184 completed. Shell transport timed out after printing capture PID, but capture's fixed-output log verified successful completion; no retry/new login performed.
- **Risks:** Actual expiry/twenty-minute timeout paths not exercised. This certifies session preparation only, not clinical/financial business workflows, credentials for external providers or disposable fixture authorization. No source/build/schema/Auth/business mutations occurred.
- **Next:** App available at http://127.0.0.1:5000; use the same captured session for bounded process tests after synthetic fixture/side-effect scope is established. Do not restart/build over this reserved running server without coordination.
