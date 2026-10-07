# Lock — SAFE-TEST-INVENTORY-20261005-CORRECTION (round 2)

- task: `SAFE-TEST-INVENTORY-20261005` (roadmap task 003) — bounded per-file static reclassification of the 4 `integration/*` files currently `UNV`.
- agent role: MiniMax-M3 (MiniMax), bounded read-only inventory correction; this round is documentary only.
- selected model: `MiniMax-M3` (MiniMax)
- status: `released`
- previous round: `SAFE-TEST-INVENTORY-20261005-CORRECTION.lock.md` of 2026-10-05 (final correction by MiniMax, accepted at session `ses_ef24c1e33ffdKgQiwFW7xYZY2g`).
- owned files (write allowlist, this round):
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\INVENTORY.md`
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\RUNTIME_CLOSURE.md`
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\HANDOFF.md`
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\REPLAY.md`
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\PATHS_315.md` (only if a category assignment changes)
  - This lockfile.
- read allowlist: the 4 `integration/*` test files and their first-level runtime imports (SUTs + first-level transitive modules + mocks + hoisted env setup).
- excluded: app code, tests outside the 4 named files, `prisma/schema.prisma`, `prisma/seed.ts`, DB drivers, environment, secrets, server, runner/config, Auth, all packages, all integration tests other than the 4 named, evidence files (`EVIDENCE_*.txt`, `EXITCODE.txt`), `PATHS_315.md` historical rows for other files, `node_modules/`, `.next/`.
- validation: this round produces no execution, no DB connection, no test run, no hash recompute; evidence is static, first-level import-closure only; per `RUNTIME_CLOSURE.md` §"What this inspection did and did not cover".
- roadmap task 003: remains **open** after this round.
- stop conditions: any evidence of real-client or external-side-effect outside the 4 files' first-level transitive modules → escalate instead of writing.
