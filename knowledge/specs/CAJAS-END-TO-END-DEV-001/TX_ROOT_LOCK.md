# TX root boundary lock

- Task: CAJAS-END-TO-END-DEV-001 bounded runtime-root Diagnose
- Role/model: Backend runtime fix / openai/gpt-6.1-sol
- Mode/status: implementation + focused QA / released
- Scope: public root-client detection only; preserve existing dirty work.
- Approval: current explicit user request; disposable DEV synthetic integration approved.
- Owned files and reserved SHA256:
  - src/lib/services/cajas-formula.service.ts: 0D052EE46180B24709940586051A69F4E023E6DB7AE94C5DF584E61B1BEE6793
  - src/lib/services/stock-physical-unit.service.ts: 1182B3E34C663C1B6337213D82F85C1F1E66F6774CB51410FC73459346FB76EE
  - src/lib/services/cajas-assignment.service.ts: 800438B4DA837D869E7EF80C2D0553DE7D1798DFC198E4C47E989A77C11B6DB6
  - src/lib/services/cajas-command.service.ts: 04B31132336F5DB0D8288E7C8B721B0A96ACD972937934E81D768D6CE580DD45
  - src/__tests__/unit/cajas-transaction-shape.test.ts: NEW
  - src/__tests__/integration/cajas-preparation-postgres.test.ts: 8ED37028A98B6B29A7DD39EDF6A40D01529AE7B38C89CC2320BB4E22DA854DE9 (fixture corrections only)
  - TX_ROOT_LOCK.md / TX_ROOT_HANDOFF.md: NEW
- Forbidden: original assignment test, schema/generate/global Prisma config/Auth/security/core UI/Git/dependencies; all other writes absent a stable exact fixture lock.
- Commands: targeted Vitest, read-only caller inspection and hashes; transient environment restored finally.
- Validation: legacy red regression, modern root/tx green regression, focused formula/physical/preparation and real PostgreSQL.
- Stop: overlapping hash, second surviving same blocker, scope expansion, deadline.
- Handoff: Done / Changed / Files / Validations / Risks / Next.

## Diagnose evidence supplied by orchestrator
Four actual DB prerequisite failures: nested callback recursion, P2028 5s expiry after approximately 11s. Actual Prisma 7.8 transaction still exposes $transaction, but not $connect/$disconnect. Hypothesis: transaction-only detection mistakes an owner tx for root and loses owner proxy. No timeout/config workaround.

## Exact fixture reservations (root shape only)
- src/__tests__/unit/cajas-slice1-formula.test.ts: 7B4BB7F566F9592CA7D1507E78B619DA123435D1D515FB1323E346B8D82D5F4C
- src/__tests__/unit/stock-physical-unit.test.ts: CD705C46B5F3D4B7F741146FEBF9991271DE7B6CFAF1269096ACA1C98AAF55ED
- src/__tests__/unit/cajas-preparation-recovery.test.ts: E1DCF0615ACBEBA25B31F76AE210108E476F14FE32EA459F61FD28E89190D626
- Logical contract: roots expose callable $connect and $transaction; owner tx retains callable $transaction without $connect. Nested callback is a test failure, not a hidden absent method. Existing non-boundary fixture defects remain outside this correction.

## Partial validation captured before deadline
- Legacy transaction-shape regression: 8/8 failed with nested transaction.
- Fixed regression: 8/8 passed; preparation correctness 14/14 passed; original assignment 12/12 passed and untouched.
- Real PostgreSQL: 0/4 scenarios passed, 4/4 failed after real formula/unit/assignment prerequisites succeeded. Gate 1/1 passed. First new blocker: cajas-component-selection.service.ts:98 nested lines.create rejects companyId. This is production service payload validation, not fixture input; no fixture bypass or out-of-scope source fix.
- Synthetic child-first cleanup completed (afterAll had no separate failure); pool/disconnect completed.
- Final focused unit run: 60 passed / 5 existing non-boundary recovery fixture failures. Source/root-shape unit files released; final hashes and detailed evidence in TX_ROOT_HANDOFF.md. Integration unchanged. No further DB retries on new out-of-scope source blocker.
