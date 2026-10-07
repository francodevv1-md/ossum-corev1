# COMPRAS-STOCK-CONTRACT-MAP-CORRECTION-001 / Task Brief

## Why this task exists

The first version of `FINDINGS.md` (same folder, task
`COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001`) over-read DR-14, conflated
idempotency with a quantity guard, fabricated a role-list citation,
recommended deletion of `mockOrdenesCompra` / `MovimientoCompra` without
tracing all consumers, and proposed the OC↔Receipt bridge as
implementation-ready while its business rules remained undefined.

The correction task asked this session to:

- keep the existing artifact folder and update rather than replace the
  report;
- separate confirmed defects from unverified runtime claims;
- ground the receiving-replay claim in executable evidence;
- verify the actual role / capability matrix;
- retire the safe-deletion recommendation;
- document OC↔Receipt bridge requirements without implementing them;
- choose the smallest bounded correction task.

## Outcome requested

One consolidated `FINDINGS.md` that:

1. States DR-14 correctly (stock boundary, not OC state boundary).
2. Records the actual capability matrix and the one remaining narrow role
   discrepancy (OCR route vs `purchases:mutate`).
3. Reclassifies prior findings as confirmed / withdrawn / deferred /
   unverified.
4. Provides executable evidence for the receiving-replay semantics.
5. Lists ≤ 3 dependency-ordered implementation tasks with explicit
   ownership and approval boundaries.
6. Provides a copy-paste prompt for the highest-priority bounded task.

## Boundaries

- No application source, tests, migrations, or configuration edits.
- No schema changes in this session.
- No Auth, roles, permissions, security or secrets changes.
- No production / staging / real-data / fiscal operations.
- No Playwright.
- No commits, push, PR, merge or deployment.
- No unrelated task expansion.

## Deliverable folder

`E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001\`

Files:

- `FINDINGS.md` — main deliverable.
- `OWNERSHIP.md` — session ownership record.
- `TASK_BRIEF.md` — this brief.
- `diagnostic/recibir-replay.run.ts` — diagnostic script (mocked Prisma tx,
  calls production `recibirOrdenCompra`).

## Approval state

This task does not require Franco's approval because it does not change
production code, schema, auth, or data. Implementation tasks in the
report carry their own approval requirements and are explicitly marked
in §8 / §9 of `FINDINGS.md`.