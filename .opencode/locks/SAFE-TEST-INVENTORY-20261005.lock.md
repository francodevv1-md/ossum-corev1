# SAFE-TEST-INVENTORY-20261005 — lock

- **Task:** roadmap 003 — offline test-safety inventory.
- **Owner / role / model:** MiniMax-M3 (MiniMax, M3) — bounded DEV execution, no Auth/DB writes.
- **Mode:** bounded read-only inventory + small explicit offline allowlist.
- **Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui` at `ux/antigravity-redesign` (HEAD `2138552`).
- **Scope:** static inspection of `src/__tests__/**`, plus offline execution of an explicit file allowlist.
- **Files / resources owned (exclusive):**
  - `knowledge/specs/SAFE-TEST-INVENTORY-20261005/INVENTORY.md`
  - `knowledge/specs/SAFE-TEST-INVENTORY-20261005/REPLAY.md`
  - `knowledge/specs/SAFE-TEST-INVENTORY-20261005/HANDOFF.md`
  - this lock file
- **Files / resources NOT touched:** application source, `vitest.config.ts`, `src/__tests__/setup.ts`, existing tests, `package.json`, `prisma/*`, any DB target, secrets/session files.
- **Allowed commands:** `npx vitest run <explicit-file>` for the verified OFFLINE files in REPLAY.md; no `npm test`, no `vitest run` without explicit files, no DB operations, no Playwright runs, no build, no server.
- **Forbidden:** DB connections, queries, seed, cleanup, migrations, forensics, secrets/session reads, browser/server, `npm test`, full-suite invocations, commit/push/PR, application/test/config changes.
- **Approval:** Franco's bounded task brief; Sol1 DB hold respected absolutely.
- **Validation:** PASS/FAIL/BLOCKED per file in REPLAY.md; inventory coverage limits explicit in INVENTORY.md.
- **Stop conditions:** Sol1 DB hold violated, ownership conflict, two failed Diagnose cycles on the same blocker.
- **State:** `released` (2026-10-05) — inventory + replay + handoff delivered; no follow-up execution under this lock.
