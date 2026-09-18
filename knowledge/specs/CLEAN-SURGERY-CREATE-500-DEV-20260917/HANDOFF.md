# Surgery creation allocator repair — approval #7011

## Done
- **Status: implementation ACCEPTED / lock RELEASED.** Independent review `diverse-jade-moth` ACCEPT #7023 and guarded build PASS #7025 verified; parent authorized docs-only finalization. Historical QA6999 HTTP500 root exception remains unavailable; acceptance is not live incident closure.
- Sole Backend/QA executor `openai/gpt-6-astra`; SDD Standard mode, explicit RED/GREEN evidence. One source repair cycle. Auto-chain / necessary size exception accepted; source + test diff only 36 changed lines after parent-approved fixture refresh.
- Loaded current AGENTS, minimal Knowledge, SDD apply and Diagnose; verified existing ownership, predecessor released lock and dirty worktree. Original workspace remained read-only.

## Changed
- **Cause proven:** PostgreSQL resolves the uncast bound `SUBSTRING` offset `4` as regex text, not the positional integer overload. Installed PrismaPg 7.8.0 returned max `0` for synthetic `CX-0009`, versus `9` with the cast; `CX-0042` produced `4` versus positional `0042`.
- **Minimal fix:** restore `CAST(${SURGERY_VISIBLE_NUMBER_PREFIX.length + 1} AS INTEGER)` at `surgery.service.ts:373`. Original worktree already contains this correction; historical evidence #6365 corroborates it. No other original changes copied.
- **Causal proof:** actual `createSurgery` and its actual tagged allocator query ran with the installed driver. A read-only CTE named `Surgery` shadowed the application table with synthetic `CX-0001..CX-0009`. Reference/create/audit operations were test doubles; duplicate create raised synthetic P2002. Before fix: three attempts, no audit, P2002 mapped by real `errorResponse` to HTTP500. After fix: `CX-0010`, one attempt, one mock audit. **Zero DB writes throughout.** This demonstrates the defect's failure path, not that QA6999 necessarily hit that same exception.
- Tenant predicate, canonical-number regex, NUMERIC/TEXT/BigInt precision, serializable transaction, retries, explicit legacy-number path, audit and API semantics retained. No Auth/permissions/business/schema/migration changes.

## Files
- `src/lib/services/surgery.service.ts` — one-line integer cast.
- `src/__tests__/unit/surgery.service-visible-number.test.ts` — two parameterized SQL-contract regressions, UI and non-UI generated-number callers; tenant parameter and audit assertions.
- `src/__tests__/integration/surgeries-create-api.test.ts` — parent-approved Contact mock refresh: relation arrays plus transactional Contact readback. Assertions and production Contact code unchanged; no skips.
- This task's `CHANGE_PACK.md`, `LOCK.md`, `HANDOFF.md` — cumulative tasks, exact ownership, evidence.
- Existing temporary `surgery-7011-diagnose.cjs` — added `--collision`, real-service/read-only-driver proof with synthetic table shadowing.
- Existing temporary `surgery-7011-tests.mjs` — focused and expanded offline runner; optional in-memory diagnostic transform for the unrelated caller-test failure. No production diagnostic instrumentation added.
- Shared worklog left untouched for parent milestone update; all unrelated dirty recovery files preserved.

## Validations
| Check | Result |
| --- | --- |
| New unit RED | Two cast-contract cases fail; six existing cases pass |
| Unit GREEN | 8/8 pass |
| Source service + real driver synthetic RED | P2002 / mapped500 / 3 attempts / 0 audits |
| Same source service + driver GREEN | CX-0010 / 1 attempt / 1 mock audit |
| Expanded offline regression | Final 174/174 pass, 30/30 files pass, 34.26s; all prior 136 budget/adjacent checks remain passing |
| Full TypeScript | `tsc --noEmit --incremental false`: exit0 |
| Focused ESLint | All three changed TS files: exit0, no diagnostics |
| Diff check | PASS; existing CRLF notices only |
| Preservation | Baseline checker passes: manifest exact bytes, original nonsecret repository contents, all unrelated tracked/untracked source contents; geo SQL SHA `78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01` |
| QA scoped read | Contact exists, one active company link, zero linked surgeries |
| Independent review #7023 | ACCEPT, no blockers; independently reran 174/174 tests across 30 files, full tsc exit0, scoped diff-check PASS. Inspected synthetic proof script, did not rerun DB probe |
| Guarded build #7025 | PASS in one attempt: Next16.2.6 webpack compilation 27.2s, 56/56 static pages in 7.5s, optimization/traces complete; independent tsc exit0, no diagnostics |
| Build preservation #7025 | Network guard preflight passed; DB/TLS/fetch denied except credential-free public font HTTPS GET/HEAD. Source/prisma/docs/root/env byte snapshots and Git status unchanged; generated .next only |
| Docs-only finalization | Only task CHANGE_PACK/LOCK/HANDOFF updated; no source/tests/env edits, test/build reruns or replay |

Reproduction commands (from `E:/OSSUM_COR_WORKTREES/ossum-clean`):

```powershell
# Read-only DB diagnostics: equality-checks effective original/destination URLs in memory.
node C:/Users/franc/AppData/Local/Temp/opencode/surgery-7011-diagnose.cjs --collision
node C:/Users/franc/AppData/Local/Temp/opencode/surgery-7011-diagnose.cjs --probe

# Run in a separate process context: preload inherited by test workers, denies all networking.
$env:NODE_OPTIONS='--require=C:/Users/franc/AppData/Local/Temp/opencode/surgery-7011-offline.cjs'
node C:/Users/franc/AppData/Local/Temp/opencode/surgery-7011-tests.mjs --focused
node C:/Users/franc/AppData/Local/Temp/opencode/surgery-7011-tests.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js src/lib/services/surgery.service.ts src/__tests__/unit/surgery.service-visible-number.test.ts src/__tests__/integration/surgeries-create-api.test.ts
```

DB probe verifies transaction read-only and numeric `pg_settings` values after `SET LOCAL statement_timeout='5s'` / `lock_timeout='1500ms'`, before catalog/fixture reads. No TLS overrides, credentials, URL hashes, unrelated business rows or raw secret-bearing errors printed.

## Risks
- **Caller-test failure resolved under explicit parent scope extension:** reproduced baseline `groupMemberships.map` TypeError at `contact.service.ts:231`; relation-array refresh then exposed missing transactional `contactCompanyLink.findUnique` at line376, called by current createContact readback line466. Added only those fixture contracts; final 174/174 GREEN. No test assertions/skips or product Contact changes. The QA6999 request used an existing DB patient ID, not this snapshot path.
- The temporary preservation checker initially compared the now-owned fixture to its old raw-byte baseline and failed after the approved edit. Removed that inappropriate owned-file comparison; retained all original manifest, geography, original-workspace and unrelated-file baseline checks, which pass. Reviewed fixture diff separately: eight added mock-only lines, no assertions changed. No baseline reset.
- Historical HTTP500 is not recovered. Metadata showed no missing generated Surgery/AuditEvent scalar columns and a valid immediate company/visible-number unique index; that does not prove every runtime constraint or write succeeds.
- Generic `errorResponse` discards non-ApiError details without logging. Merely redirecting dev-server stdout is insufficient to recover a future underlying exception. Original's adapter-P2002 retry-shape improvement was not copied: unnecessary to prove or repair this deterministic overload defect.
- No browser/login, API mutations, DB writes, schema changes, sequence changes, migrations, deletion, reset, staging, commits, installs, push or deploy. QA contact and original manifest left unchanged.

## Next
1. Implementation review and guarded build accepted; lock **released**. All 174 regression tests pass; allocator production correction remains exactly one line. Build/type success does not certify live DB writes or identify the historical exception.
2. Parent separately plans explicit finite technical authorization under existing QA6999 + fix7011 for **at most one Surgery POST**, reusing the preserved QA contact and marker. No additional user question and no replay in this batch. Reconcile by patient + marker immediately beforehand; stop if any surgery already exists or the read is ambiguous. Keep original STOPPED manifest immutable; use a separate attempt record.
3. Capture proposal: a DEV-only, marker-filtered diagnostic at this POST's catch boundary (or local debugger pause on caught exceptions), recording only error name, Prisma/SQLSTATE codes, allowlisted constraint/column names and code locations. Never serialize request/auth/env/full Prisma error or change client responses/Auth. This instrumentation is **proposed, not implemented or authorized as a mutation retry**.
4. Reuse an existing valid session only after auth preflight; do not reopen a browser for offline diagnosis. If authentication is expired, report the auth precondition instead of bypassing it. After the one request, reconcile even on timeout/500; no automatic retry, no budget/Invoice continuation until Surgery outcome is unambiguous. Any newly proven schema/data repair remains a hard approval boundary.
