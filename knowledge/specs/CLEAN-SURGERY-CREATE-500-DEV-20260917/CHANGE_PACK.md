# Surgery creation HTTP 500 — approval #7011

- T3, DEV only; Franco explicitly said `autorizo`. Executor: Backend/QA, `openai/gpt-6-astra`; parent orchestrates. Standard mode with RED evidence required before implementation.
- Scope: diagnose the actual create path, minimally repair a proven technical failure, retain tenant/role/status/number uniqueness/audit semantics. No schema, migrations, counters, Auth, permissions, business-rule, environment or TLS changes.
- Original `E:/OSSUM_COR_PROJECT` is read-only. Preserve all existing dirty recovery work, applied geography SQL pin and QA6999 manifest/contact. No browser, API writes, blind creation retries, prior-record changes, installs, staging, commits, push or deploy.
- Allowed: source inspection; temporary secret-free diagnostic scripts; exact installed Prisma adapter read-only synthetic SELECT and metadata/scoped QA reads against equality-checked destination DIRECT_URL. Transaction-enforced read-only and verified local 5s statement/1500ms lock timeouts required before reads. Never log credentials, URLs or identities.
- Acceptance: reproducible error before fix, same query succeeds after minimal fix, focused create regression and adjacent budget tests without DB/env loading, full tsc/lint if feasible. Parent owns eventual bounded live proof.
- Delivery: auto-chain / coherent source size exception accepted; one repair slice, no planning stops. Stop on ownership collision, unproved cause, data repair necessity or approval expansion. Maximum two minimal repair cycles for one proven blocker.

## Source trace / design
- POST authenticates/guards, parses snapshots and resolves contact references. Existing active patient link returns without mutation; omitted other snapshots resolve null.
- Service checks actor, validates pending initial status and tenant-scoped contact/branch, then Serializable transaction allocates number, creates Surgery and audit atomically. Only backend production caller is this POST; allocation helper only serves createSurgery. Explicit legacy number path bypasses allocator; UI source forces allocation.
- Investigate bound substring offset first: current allocator binds JavaScript number 4 without SQL cast; Prisma documents INT8 raw parameter behavior. This is a hypothesis until exact-driver read-only reproduction, not a diagnosis.

## Tasks
- [x] 1. Load approval, QA handoff, minimal Knowledge and Diagnose; inspect callers/create chain.
- [x] 2. Verify preservation baseline and reproduce allocator collision safely; record exact synthetic cause (historical exception unavailable).
- [x] 3. Add RED regression, apply only proven minimum repair, validate GREEN.
- [x] 4. Run regression gates, assert preservation, hand off lock in review; report existing caller-test failure rather than hide it.
- [x] 5. Parent-approved minimal snapshot fixture refresh and full 174-test regression rerun; no assertions/skips/product Contact changes. Required relation arrays plus transactional Contact readback mock; 174/174 GREEN, tsc/lint/diff/preservation PASS.
- [x] 6. Independent implementation review ACCEPT (#7023, diverse-jade-moth): 174/174 tests, 30 files, tsc/diff PASS. Guarded build PASS (#7025): one attempt, 27.2s compilation, 56/56 pages, tsc0, source/env unchanged. Parent-authorized docs-only acceptance and lock release complete.
- [ ] 7. Parent-owned finite live replay/capture under existing QA6999 + fix7011 after fresh read-only reconciliation, separate attempt journal and immutable original manifest. No new user approval for routine validation; no replay performed in this apply phase. Historical HTTP500 cause and live incident closure remain unconfirmed.

## Resumed diagnosis / bounded implementation
- Exact installed-driver read-only reproduction: uncast offset returns maximum `0` for synthetic `CX-0009`; integer cast returns `9`. This is overload selection, not a missing-function exception.
- Original worktree contains the integer cast and historical repair #6365 documents the same allocator collision. Do not copy its unrelated coordinator or retry changes.
- Restore only the proven positional-offset contract after RED regression and synthetic collision proof. This repairs a demonstrated create-path defect; it does not retrospectively identify the lost QA6999 exception or authorize a live retry.
- Standard testing mode; explicit RED/GREEN evidence required. Single coherent repair slice; auto-chain / necessary size exception preaccepted, expected review size below 400 lines.
