# Isolated build validation

- Owner/model: GPT2 / openai/gpt-6.1-sol; task GPT2-ISOLATED-BUILD-20261005.
- Exact source HEAD: 21385527dcfbc6ebc5b1507096d03a2c402d8c4d, branch ux/antigravity-redesign. Reference worktree is dirty and never substitutes for this snapshot; original index empty.
- Owned: temporary isolated-build-2138552-20261005 under approved temp root; this task folder only. No shared source/config/runtime ownership.
- Approval: isolated preflight, Prisma validation/generation with temporary outputs, explicit global TypeScript and full npm run build only if source inspection proves no DB/secret/business effects. Public font downloads permitted, no credentials/business destinations.
- Installed dependencies reused; not a clean lockfile install, no package updates. Never copy actual env/session/credential files or inherit business secrets into command environments.
- Build hooks/scripts, server entrypoints, import-time initialization and prerender/static generation are inspected before execution. If they require secrets, DB or external mutations, stop the build path and report precise source evidence.
- Harness-only changes may direct Prisma generation/types to isolated outputs; no product fixes, mocks, disabled prerender or checks to manufacture success. Record command, exit code and exact diagnostics.
- No DB/migration/importer/email/Auth actions, shared .next/ports, installs/build fixes in product, staging/commit/push/PR/deploy.
- Continuation approval: real existing exclusively DEV configuration may be used locally/in memory without disclosure. Require effective complete-process-tree DB/business egress containment before build; stop if unavailable or data access is attempted. No preventive product bootstrap refactor.
- Latest approval (authoritative for this continuation): Franco answered `si avnaza amigo, que termine rapido la tarea` confirming the already verified disposable DEV target and authorizing necessary reads/DEV connections without Auth changes or mutations. The prior no-read/network fence requirement is lifted for this exact DEV only. No Docker/WSL/firewall/VM requirement. Load existing configuration in process memory, redact output before storage, run the actual isolated build with a ~5-minute timeout and at most two harness-only corrections. Earlier restrictions above remain historical where superseded by this paragraph.
