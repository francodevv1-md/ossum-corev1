# Invoice DRAFT HTTP500 — implementation handoff

## Done
- Status: **source fix ACCEPTED; live replay PASSED; lock RELEASED** after independent review #7032, guarded build #7034 and bounded Invoice-only evidence #7009/#7041. Five tasks complete, one minimal repair cycle; Standard mode with explicit RED/GREEN, auto-chain / necessary size:exception accepted.
- Sole Backend/QA SDD executor openai/gpt-6-astra. Skills: SDD apply and Diagnose via exact files. No delegation.

## Changed
- **Exact proven defect:** `lockAndAssertSourcesNotInvoiced` queried PostgreSQL `pg_advisory_xact_lock(...)` through Prisma `$queryRaw`. Its result type is `void`, unsupported by installed PrismaPg7.8.0 result deserialization. Actual tagged service query fails **P2010**, with allowlisted unsupported-void signature; real `errorResponse` maps it to **HTTP500** before source budget read/insert/audit.
- **Fix:** append `::text` to that result at `invoice.service.ts:323`. Driver GREEN confirms the advisory lock is still granted in `pg_locks`, then the service reaches one mocked Invoice insert and one mock audit with exact `200.0000` total. This is not a DB insert or API replay.
- Original and recovered Invoice services were identical before repair: this was not a missing original patch. No broader recovery copied.
- Tenant-bound key/hash, sorted lock acquisition, source row locks, duplicate active-Invoice exclusion, approved CURRENT eligibility, Decimal canonical reconciliation, transaction/audit and existing Serializable emission behavior unchanged. No Auth/roles/security/schema/migration/data edits.

## Files
- `src/lib/services/invoice.service.ts` — one-line result cast.
- `src/__tests__/unit/invoice-service.test.ts` — five parameterized regressions: source presupuesto/mixto and generic presupuesto/consumo/mixto. Assert supported SQL result, sorted tenant keys, lock-before-duplicate-read, tenant exclusion query and audit.
- This directory's `CHANGE_PACK.md`, `LOCK.md`, `HANDOFF.md` — declaration, exact ownership, cumulative tasks/evidence.
- Temporary `invoice-draft-500-diagnose.cjs`, `invoice-draft-500-baseline.json`, `invoice-draft-500-tests.mjs` under approved temp directory. Existing surgery offline preload/runner reused unchanged. Product + test diff: 32 additions, 1 deletion.
- Shared worklog intentionally left to parent milestone integration; all prior unrelated dirty/untracked files preserved.

## Validations
| Check | Evidence |
| --- | --- |
| Actual service + installed driver RED | P2010 / unsupportedVoid=true / mapped500; source reads0, mock creates0, mock audits0 |
| Unit RED | All five new cases fail on missing text cast; existing23 pass |
| Actual service + driver GREEN | Source reads1, mock creates1, mock audits1, total200.0000; pg_locks granted advisory count1 |
| Focused GREEN | 28/28 |
| Full offline regression | **179/179**, 30/30 files; all prior174 retained; 36.44s |
| Full TypeScript | `tsc --noEmit --incremental false` exit0 |
| Focused ESLint | Both changed TS files exit0, no diagnostics |
| Diff check | PASS; existing CRLF notices only |
| Own QA readonly reconciliation | Surgery belongs to expected QA contact; budget Aprobado/CURRENT/revision3/ARS200.0000; canonical calculator200.0000; invoiceCount0 |
| Catalog | No missing generated Invoice/InvoiceItem/AuditEvent columns; no extra unmapped required no-default columns |
| Preservation | Both journal hashes unchanged; original nonsecret Git-visible contents and all unrelated clean tracked/untracked contents unchanged |
| Independent review #7032 | complex-bronze-halibut ACCEPT, no blockers; independently focused28/28, full tsc exit0 and scoped diff-check PASS. Locks/keys/transactions preserved. Full179 remains implementer-reported |
| Guarded build #7034 | PASS: Next webpack compile21.0s, 56/56 pages in7.6s; full tsc exit0, zero diagnostics; source/root/env snapshots and Git status unchanged |
| Docs-only finalization | Parent-authorized acceptance/release updates only this task's CHANGE_PACK/LOCK/HANDOFF; no DB/browser/source/env/test actions or reruns |
| Bounded live replay #7009/#7041 | PASS: fresh authenticated and zero-Invoice preconditions; exactly one non-fiscal Invoice Borrador persisted at ARS200 with expected Presupuesto/item/Surgery lineage; pending source disappeared after hard reload. QA records retained; no fiscal issuance, external sending or cleanup. Do not replay again. |

Commands from `E:/OSSUM_COR_WORKTREES/ossum-clean`:

```powershell
# Read-only driver proof + exact own-QA reconciliation. Never use --pin again.
node C:/Users/franc/AppData/Local/Temp/opencode/invoice-draft-500-diagnose.cjs --probe --metadata
# Preservation only, no DB access:
node C:/Users/franc/AppData/Local/Temp/opencode/invoice-draft-500-diagnose.cjs
# Separate offline process context:
$env:NODE_OPTIONS='--require=C:/Users/franc/AppData/Local/Temp/opencode/surgery-7011-offline.cjs'
node C:/Users/franc/AppData/Local/Temp/opencode/invoice-draft-500-tests.mjs --focused
node C:/Users/franc/AppData/Local/Temp/opencode/invoice-draft-500-tests.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js src/lib/services/invoice.service.ts src/__tests__/unit/invoice-service.test.ts
git diff --check
```

Driver probe compares effective original/destination DIRECT_URL and DATABASE_URL in memory only; no values/hashes emitted. Transaction set READ ONLY and verified before diagnostic reads; SET LOCAL timeouts verified via numeric pg_settings (5000/1500). Synthetic advisory key only; real row locks mocked, no write-capable ORM methods forwarded to DB. All actual inserts/audits mocked. QA read filters exact newly approved IDs; no identities/descriptions printed. No TLS overrides, raw errors or secret-bearing output. Baseline file is exclusive-create, journals are never edited/reset.

## Risks
- Historical POST exception was discarded and remains unavailable, so exact attribution of that discarded response cannot be reconstructed. The same-path driver defect is **proven and fixed**, and the later bounded Invoice-only replay is live-verified by #7009/#7041.
- The successful bounded replay does not certify every DB constraint or broader billing flow. Any newly surfaced schema/data/security/business blocker remains outside this repair.
- Build and independent review passed before the parent-owned live replay. The executor itself performed no browser, API mutation, DB write, install, commit or broader Invoice feature work; #7009/#7041 records the separately authorized single live insertion.
- Existing Node localstorage warning occurred in offline suite; no failures or skipped assertions added.

## Next
1. Source fix, guarded build, independent review and bounded live replay are complete; ownership remains released.
2. Do not rerun the completed QA fixture. Retain its records and immutable journals unless cleanup is separately authorized.
3. Broader Invoice diagnostics, instrumentation, fiscal behavior, cleanup and unrelated billing flows remain outside this package.
