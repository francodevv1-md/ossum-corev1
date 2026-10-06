# 012 recovery and scope-only local commit

## Approval and current evidence

Franco requested a local commit only of this task and closure. During preflight/restart, tracked files unexpectedly returned to HEAD while HEAD remained ba37dcb7b46d64d7ee7f7891371673362b34301d. Cause/actor is unproven. Historical tests/hashes no longer certified those files. No commit or reset was performed by this agent.

Franco explicitly authorized recovering the package and revalidating, then confirmed schema ownership is free solely to restore the nullable surgeryTimeSpecified field, without Compras changes or database migration execution.

## Recovery method

Start from current HEAD and retained own artifacts, never overwrite a whole historical dirty snapshot. Restore only requested surgery/shipping rescheduling, optional time marker and real internal admin/logistics notices, plus direct lost contract/caller dependencies. Preserve current unrelated branch/email code and the foreign AGENTS/next-env/NewSurgeryDialog modifications. Back up targeted files and record foreign hashes before writing.

Backup completed before source writes: 41 explicitly listed source/test/foreign-boundary files at HEAD d81a4ac691e8523bf28bc4fa9bf93e8aac198cbc under approved Temp/opencode/012-recovery-commit/before, with SHA-256 manifest. The intervening foreign NewSurgeryDialog/AiLateralRail commit is disjoint and retained. Actual recovery starts from this verified snapshot, not the older brief HEAD.

Source contract: current/future changed dates in Argentina; unchanged historical values allowed; no invented hour; independent surgery/shipping updates; actual persistence before success; pending secondary drafts retained; stale company/case/dialog responses rejected. Server preserves company/permissions/audit/transaction/conflict behavior. Notifications use actual in-app persistence in the same transaction, only active admin/logistics recipients, existing preferences/opt-outs and actor exclusion; audit-based deduplication and valid existing Ficha navigation. No external sends or simulation.

Recover the exact recorded nullable schema field and its existing two-line additive migration artifact only. Do not execute the artifact or restore unrelated schema/business feature changes. Existing generated Prisma client already exposes the marker; shared generation is not assumed authorized or needed merely because a file was lost.

## Commit boundary

Tracked allowed targets are currently clean against HEAD. Commit only the new recovery diff, newly created own tests/helper/artifacts, and the narrowly required marker artifact. Never stage all untracked files or foreign HANDOFF/locks. Integration owner exclusively handles index/commit, verifies staged paths/content and foreign preservation, then uses a conventional commit without attribution. No push.

## Validation and limitations

Pending recovery execution, exact offline unit/component tests, direct TypeScript and independent read-only review of the new snapshot. No historical or previous-snapshot test count is a PASS for this recovery. Real DB/browser remains unrun until identified disposable target, fixtures, authenticated session and server ownership. Global unrelated errors are recorded separately, not silently fixed.

### Demonstrated direct render blocker

The recovered source passed 157 focused offline checks, but actual Header rendering failed because its committed import references a missing `getCxStateVisual` export. Caller search found Header as the only active caller; a separate unrelated palette test also expects the lost function. Minimal fix is to read the already-existing `CX_STATE_VISUALS[state]` with `DEFAULT_CX_STATE_VISUAL` fallback directly in Header. No color maps, date-specific palette rules or unrelated palette tests are recovered. This is necessary to open the requested Ficha flow, not a palette redesign. Independent initial recovery review passed the functional source checks and reported only this render blocker.

## Final recovered snapshot

The original nullable time marker contract, precise Argentine surgery date encoding, date-only shipping wire format, real caller openers, backend-only saves, pending secondary drafts/retry baselines and stale-response protection were recovered minimally against the new clean tracked baseline. Shared surgery save now enforces changed dates from today forward and writes actual in-app notices with the audit/update in one transaction. The valid existing Ficha link and admin/logistics-only recipient ceiling remain.

No whole historical source file was restored. Lost unrelated intake/coordinator-assignment, purchase, billing, mail or palette feature deltas were not adopted to make their old tests green. The two-line Header dependency correction uses existing current state colors, not the prior palette package.

### Actual validation

| Gate | Result | Boundary |
| --- | --- | --- |
| Final parent replay | PASS, 179/179, 18 files, exit 0, 14:42:54 local | Offline mocked DB/auth with real validators/services/recipients, active parent forms and Header/consumer interactions |
| Final independent source review | PASS | Recovered functional scope and its sole direct render blocker resolved; no reviewer implementation |
| Direct TypeScript | FAIL, exit 1 | Broad unrelated diagnostics after lost tracked baseline; no diagnostics in changed files. No checks suppressed |
| Prisma format | PASS on temporary schema copy | One nullable marker declaration; shared generated client already exposes it; no DB access/generation |
| Browser/real DB | BLOCKED / NOT RUN | Target/session/server prerequisites not established |
| Shared build/restart/generation/external sends | NOT RUN | Excluded |

TypeScript was run with `--max-old-space-size=8192` after the default heap could not complete. The global result is still FAIL. It includes retained tests for unrelated lost features, mail/purchases/billing APIs and baseline FullView Commercial tab typing, none adopted into this commit. Historical 157/219/47 counts refer to earlier snapshots; only the new 179-test replay certifies this recovered scoped snapshot.

Foreign files verified against the immutable backup: AGENTS.md, next-env.d.ts and NewSurgeryDialog.tsx. Git index was empty before recovery; index ownership and exact staged path checks precede the conventional local commit. No push or production operation is included.

### Replay

From `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/rescheduling.test.ts src/__tests__/unit/rescheduling-service.test.ts src/__tests__/unit/surgery-management-route.test.ts src/__tests__/unit/surgery-management.service.test.ts src/__tests__/unit/useCirugiaActions-change-date.test.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/components/ReschedulingForms.test.tsx src/__tests__/components/ActiveCoordinadoresRescheduling.test.tsx src/__tests__/components/ChangeDateDialog.test.tsx src/__tests__/components/CirugiasChangeDateFlow.test.tsx src/__tests__/components/CirugiasDataGrid.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx src/__tests__/unit/internal-notifications.service.test.ts src/__tests__/unit/notifications-policy-security.test.ts src/__tests__/unit/erp-notifications-policy.test.ts src/__tests__/components/ReschedulingNotificationNavigation.test.tsx src/__tests__/components/NotificationMenu.test.tsx
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false
```

The first command is the task replay and passed. The second exposes the recorded global failures rather than hiding them. Real DEV process acceptance remains a separate pending validation, not a completed gate.
