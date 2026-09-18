# Invoice draft HTTP500 — bounded DEV repair

## Task declaration / approval
- Task: CLEAN-INVOICE-DRAFT-500-DEV-20260917; T3 bounded non-fiscal source repair under the current explicit user request and synthetic approval6999.
- Sole owner: SDD apply / Backend + QA executor, openai/gpt-6-astra. Mode: read-only diagnosis, then evidence-gated implementation/testing.
- Worktree: E:/OSSUM_COR_WORKTREES/ossum-clean. Original E:/OSSUM_COR_PROJECT is read-only.
- Allowed files: exact LOCK.md inventory. Commands: read-only Git, offline Vitest/tsc/lint, memory-only effective DEV configuration comparison and bounded read-only driver probes. Build belongs to parent guarded runner.
- Forbidden: DB writes (including rollback-only writes), API replay, browser, journal resets/edits, schema/migrations, Auth/roles/security, money/business rule changes, real/fiscal billing, installs/commits/publication, unrelated source/docs changes.
- Stop: no exact safe reproduction; new business/security/schema/data repair requirement; ownership overlap; two minimal fix cycles exhausted.
- Output: Caveman handoff with exact causal evidence, offline versus live distinction, review lock.

## Spec / design
- Preserve approved CURRENT source eligibility, tenant guards, source row/advisory locks, active-invoice exclusion, canonical Decimal money reconciliation, transaction/audit boundaries and existing Serializable emission behavior.
- Trace POST → strict source validator → createInvoiceFromSource → shared lock helper → canonical totals → insert → audit. No speculative patch.
- User evidence: new QA Surgery cmu4w7w9k0000o0hu1h2j3brg; budget cmu4w7zq80003o0hus9lnlras approved CURRENT revision3 ARS200; Invoice POST returned500; parent read reconciliation found zero Invoices. Historical exception unavailable.
- Both original and replay journals are immutable. Only metadata and exact own QA rows may be read; synthetic driver probes use non-business keys.
- BEGIN read-only, verify transaction_read_only, SET LOCAL statement_timeout=5s and lock_timeout=1500ms, verify numeric pg_settings before probes. No TLS changes or secret-bearing output.

## Review Workload Forecast
- Delivery: auto-chain / necessary size:exception accepted by user; this batch is one source blocker only, no PR.
- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No
- Standard test mode (existing Vitest runner; no OpenSpec strict_tdd configuration found). Explicit RED/GREEN required by task.

## Tasks
- [x] 1. Inspect current rules, existing source/callers, status and released predecessor locks.
- [x] 2. Preserve baselines and prove exact failure safely; distinguish historical incident from reproduced defect.
- [x] 3. Add focused RED check; apply smallest justified source repair; prove GREEN and shared callers.
- [x] 4. Run prior full174 suite plus new checks, tsc/lint; preserve journals and unrelated work.
- [x] 5. Save evidence/handoff and leave lock review; parent-owned guarded build and bounded single replay subsequently completed.

## Diagnose evidence / one repair cycle
- Reproduce: real createInvoiceFromSource tagged advisory query on installed PrismaPg7.8.0, synthetic source key, verified read-only transaction. RED P2010, unsupported-void signature, errorResponse HTTP500; zero budget reads/mock inserts/mock audits.
- Scope: lockAndAssertSourcesNotInvoiced, shared by source and generic creation. Invoice original/recovered source identical before repair.
- Evidence: PostgreSQL void-returning advisory lock is unsupported by raw-query result deserialization. Existing mock queryRaw always resolved and hid this driver failure. Catalog shows no missing generated Invoice/InvoiceItem/AuditEvent scalar columns or extra unmapped required no-default columns. Own QA budget math exact200; Invoice count0.
- Hypothesis confirmed: deserialize failure at advisory query precedes source pricing/insert/audit. No money/schema/data change justified.
- Minimal fix: cast only advisory function result to text. Same key/hash, sorting, transaction, locks, duplicate check and source authority retained.
- Validate: five new SQL-contract cases RED then GREEN; actual-driver GREEN with pg_locks proving granted advisory lock, one mock insert/audit and total200. No DB write performed.
- Regression: 179/179 across30 offline files (all prior174 +5), focused28/28, full tsc, focused lint, diff-check and preservation PASS.
- Handoff: source fix accepted after independent review #7032 and guarded build #7034; lock released by parent-authorized docs-only finalization. The later bounded Invoice-only live replay passed under #7009/#7041; it is complete and must not be repeated. See HANDOFF.md for commands and limits.

## Acceptance / docs-only release
- Reviewer complex-bronze-halibut ACCEPT #7032: independently passed focused28/28, full tsc and scoped diff-check; result cast preserves locks, keys and transaction boundaries. Full179 suite remains implementer-reported, not independently rerun.
- Guarded build #7034 PASS: Next webpack compilation21.0s, 56/56 pages, full tsc exit0; source/root/env snapshots and Git status unchanged.
- Parent completed the single Invoice-only replay under existing6999 scope after fresh zero-Invoice / approved CURRENT revision3 / exact200 verification. Evidence #7009/#7041 records exactly one persisted non-fiscal Invoice Borrador and retained QA records; all journals remain immutable. No further replay is authorized or required.
