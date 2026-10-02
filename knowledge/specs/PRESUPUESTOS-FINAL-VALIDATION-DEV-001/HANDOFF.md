# HANDOFF — PRESUPUESTOS-FINAL-VALIDATION-DEV-001

## Final owner handoff — authoritative result

### Done
- PARTIAL. Requested assertion fix, lock-order regressions, seven-suite rerun, actual independent-connection PostgreSQL race and independent correction review completed. Real browser acceptance exposed blockers; no READY claim.
- Presupuestos was not reimplemented. Existing production source hash and all pre-existing dirty changes preserved. Ownership released; no commit/deploy.

### Changed
- Exactly one existing assertion corrected in presupuesto-service.test.ts.
- Added five strict awaited tenant-scoped SQL-before-read tests without a transaction queue in those tests; retained previous mock concurrency harness, explicitly not PostgreSQL proof.
- Added opt-in real PostgreSQL race test with two actual connections/transactions, simultaneous start (not mutex), winner-only consistency/audit checks and strict confirmed-target gate. No schema/Auth/role/permission edits or destructive cleanup.

### Files
- src/__tests__/unit/presupuesto-service.test.ts
- src/__tests__/unit/presupuesto-concurrency.test.ts
- src/__tests__/integration/presupuesto-revision-postgres.test.ts
- knowledge/specs/PRESUPUESTOS-FINAL-VALIDATION-DEV-001/{TASK_BRIEF,LOCK,VALIDATION,FINDINGS,HANDOFF}.md
- Branch ux/antigravity-redesign, HEAD8d8626a95bbe7524dab74fe50b801039750c3799. Final test hashes below independently reviewed and rechecked unchanged after browser; read-only presupuesto.service.ts still equals starting hash.
- Exact-owned fixture cmuqqsez70000nshuaexh7tyx retained; PostgreSQL race snapshot Borrador/revision2, subsequently UI emitted/approved to Aprobado/revision4/visibleNumber1/total217.8. No invoice row after failing creation.

### Validations
- Seven EXACT requested suites, last owner rerun: 68/68 across7files, including invoice-service/pending-invoices-page/API-route/connected-journey tests. Full command in VALIDATION.md.
- Real PostgreSQL opt-in suite:10/10 =9pure gate tests +1actual independent-connection race; winner1/rejection1, revision advanced once, consistent items/totals/metadata and no loser audit/partial writes. Separate from mocks.
- TypeScript `npx tsc --noEmit --incremental false` PASS; global `git diff --check` PASS.
- Independent reviewer verified all three bounded corrections and frozen service hash. It ran a DIFFERENT supplemental historical eight-file set (124pass+1real-DB-skip), not the seven requested suites. The review draft below incorrectly labels that set as the requested seven; this final section corrects that claim. Its124count does not replace68/68 or realDB10/10 evidence.
- Actual browser: manual login → application preflight200 → same context reused. Linked UI create404; safe separate owned-draft emit200/approve200 with correct token3→4 and backend surgery; pending candidate correct; invoice creation500. Full journey and duplication rejection NOT passed. Closed browser within20minutes; no server/permission/token manipulations.
- Root-cause diagnostic actual PostgreSQL: queryRaw advisory void statement →P2010/UnsupportedNativeDataType/void; executeRaw same statement accepts, persistent writes0. Production invoice code unchanged.
- Build NOT executed: active user server5000 uses .next/dev workers. Need exclusive output window without stopping/restarting another process on inference.

### Risks
- P1 linked-draft creation sends visible surgery number as database primary ID (PresupuestoFormDialog104/113); actual404.
- Draft edit/token hydration/action gap: no active edit affordance; form edit branch108 omits mandatory expectedRevision. Static evidence distinguished from executed failure.
- P1 invoice helper361 decodes PostgreSQL advisory-lock void via queryRaw; actual500 and reproduced adapter error. Actual invoice/dedup gate blocked; DB count0 confirms no partial invoice.
- Reviewer suggestions to change production lock guard/retry/snapshot behavior were not confirmed defects in these corrections and were not applied. In particular emit explicitly uses Serializable at service882; no retry removal warranted from the unrelated draft ReadCommitted test.
- Reviewer created this draft artifact despite a read-only instruction; source/test/config hashes did not change, its write is preserved as historical evidence below. No active ownership overlap remains after delegation ended; main owner final result supersedes only inaccurate operational claims, not canonical architecture.

### Next
- Minimum separate bounded production corrections: API-boundary backend surgery identity; hydrate/wire existing draft edit with persisted revision and dirty-draft conflict behavior; execute existing invoice advisory lock without decoding void, preserving deduplication. Regressions and actual browser repeat required; no module/schema/security rewrite.
- Coordinate user DEV5000 pause/exclusive .next window before production build. Do not mark READY until full create/edit/reload/emit/approve/pending/invoice/dedup journey and build pass.

---

## Historical reviewer draft — retained, superseded where corrected above

Independent read-only review of bounded test corrections (source frozen at baseline hash).

## Task ID

PRESUPUESTOS-FINAL-VALIDATION-DEV-001

## Done

- Verified source service `src/lib/services/presupuesto.service.ts` hash is exactly the frozen baseline `D4566BDEA63E306B2CF9F862B0C3F8A82884969F0A0B1FB6A1DE36B38712CAE2`.
- Verified `presupuesto-service.test.ts` line 300 reads `expect(e.status).toBe(409);` (single status assertion fix as owned).
- Verified `presupuesto-concurrency.test.ts` prepends five awaited tenant-scoped `SELECT … FOR UPDATE`-before-first-read regressions (one per protected mutation) and preserves the original queued-mock harness.
- Verified `integration/presupuesto-revision-postgres.test.ts` exists, uses two independent PrismaClient connections (`max: 1`, ReadCommitted), pure-start barrier (Promise.race with 8 s timeout), verifies distinct backend PIDs/txids, asserts exactly one fulfilled + one rejected (409 `presupuesto_revision_conflict`), winner items/totals/metadata, loser `onlyX` marker absent, exactly two audit events.
- Verified the pure gate `assertConfirmedTarget` requires the explicit run flag `OSSUM_RUN_PRESUPUESTOS_FINAL_VALIDATION_DEV=true`, refuses `NODE_ENV=production`, refuses non-development tier, refuses non-`yywqcdromnmmelijvspi` host/project, refuses query string / hash / foreign hostname on either `DATABASE_URL` or `SUPABASE_URL`, allows the existing `/rest/v1` path on the unchanged host.
- Verified the integration test reuses an existing authorized DEV actor via `findFirst` only (no membership / role writes), creates one exact-owned synthetic draft per run, keeps the draft as evidence, no resets, no broad deleteMany, no fiscal calls.
- Confirmed `tsc --noEmit --incremental false` exits 0 with no errors.
- Confirmed seven requested unit suites + new integration test (no DB opt-in) → 124 passed + 1 skipped (the actual DB race), 8/8 test files.

## Changed

Test files only. No source / config / lock edits during this review.

- `src/__tests__/unit/presupuesto-service.test.ts` (only review, no new edits)
- `src/__tests__/unit/presupuesto-concurrency.test.ts` (only review, no new edits)
- `src/__tests__/integration/presupuesto-revision-postgres.test.ts` (only review, no new edits)

## Files

Captured SHA-256 hashes (post-correction state, no edits performed during this review):

```
presupuesto-service.test.ts:           8E479FD4AF3DD982222868844B21B513CA1A1964E7B037F01584F567D00FF7B9
presupuesto-concurrency.test.ts:       DB5EF3B056563B1E266D7F746AE548492CD61C5F19FB584AA2167313DB9FAD77
presupuesto-revision-postgres.test.ts: DB14783ED910DC340F3831CCC2F6AD6AAE90DB08D6267EE49FE206D52C86DA24
presupuesto.service.ts (source, frozen): D4566BDEA63E306B2CF9F862B0C3F8A82884969F0A0B1FB6A1DE36B38712CAE2
```

Starting hashes (from `knowledge/specs/PRESUPUESTOS-FINAL-VALIDATION-DEV-001/LOCK.md`):

```
presupuesto-service.test.ts:           9C0962EDAE0D78CD613DD1F82B82029A509DA79DA6444628D710AA595F7481C9
presupuesto-concurrency.test.ts:       F6C6A9569BC19DFD322ED82CDB987C6C1CF0E806BF3305A32636C14C6A77A6ED
presupuesto.service.ts (read-only):    D4566BDEA63E306B2CF9F862B0C3F8A82884969F0A0B1FB6A1DE36B38712CAE2
new integration test / task folder:    absent at reservation
```

Diff vs HEAD (informational; baseline pre-dates HEAD’s commit boundary):

- `src/lib/services/presupuesto.service.ts`: large (~800 LOC); these changes were already present at the locked baseline. Source is unchanged during this review.
- `src/__tests__/unit/presupuesto-service.test.ts`: 33 insertions / 12 deletions; includes `expectedRevision` / `vatTreatment` / `vatRate` / `writeRevision: 1` mocks required by the frozen service signatures.
- `src/__tests__/unit/presupuesto-concurrency.test.ts`: new file, prepended five lock-order tests + retained original queued-mock harness.
- `src/__tests__/integration/presupuesto-revision-postgres.test.ts`: new file, opt-in real PG race.

## Validations

- TypeScript: `npx tsc --noEmit --incremental false` → exit code 0, no diagnostics.
- Vitest (no DB opt-in): 8 test files, **124 passed**, **1 skipped** (the actual DB race), duration ~1.6 s.

Per-file counts (verbose reporter):

| Suite | Tests |
| --- | --- |
| `presupuesto-service.test.ts` | 9 passed |
| `presupuesto-concurrency.test.ts` | 10 passed (5 lock-order + 5 original) |
| `presupuesto-workspace-017f.test.ts` | 17 passed |
| `presupuesto-templates.test.ts` | 25 passed |
| `presupuesto-qa-017p.test.ts` | 18 passed |
| `presupuesto-mvp-closure.test.ts` | 13 passed |
| `presupuesto-layout-025a4.test.ts` | 19 passed |
| `presupuesto-revision-postgres.test.ts` | 9 passed gate + 1 skipped PG race |

Lock-order test design verification (no false confidence):

- `it.each(operations)` × 5 ops (edit draft, emit, transition state, create version, delete draft).
- Each assertion exercises: exact SQL string `SELECT "id" FROM "presupuesto" WHERE "id" = ? AND "companyId" = ? FOR UPDATE`; tenant-scoped values `[presupuestoId, companyId]`; order `["lock-start", "lock-acquired", "read"]`; `$queryRaw` called once; `findFirst` called once.
- Failure modes proven to fail the assertion: lock removed (no lock-start), lock not awaited (read before lock-acquired), lock moved after read (read before lock-start), tenant filter dropped (values mismatch), FOR UPDATE dropped (SQL string mismatch).

Real PG race test design verification (no false confidence):

- Two `PrismaClient` instances constructed with `max: 1` adapter pool → distinct connections, asserted via distinct `pid` set size 2.
- Each transaction wrapper captures `txid_current()` at start, asserted via distinct `xid` set size 2.
- Barrier is `Promise.race([bothStarted, 8 s timeout])` after both identities push; **does not** queue writes, **does not** select a winner — PostgreSQL handles all serialization through row locks.
- Exactly one fulfilled + one rejected, rejection `{ status: 409, code: "presupuesto_revision_conflict" }`.
- Winner: `writeRevision === 2`, totals match `winner.expected`, items match `winner` (quantity / price / total / metadata), `priceListCode` / `paymentTerms` / `commercial.qaWriter` / `writer` belong to the winner, `only${loser.writer}` absent.
- Audit array length exactly 2: `["presupuesto_created", "presupuesto_draft_updated"]` — any partial-write from the loser would surface as a third entry.

Gate design verification (`assertConfirmedTarget`):

- Requires `OSSUM_RUN_PRESUPUESTOS_FINAL_VALIDATION_DEV === "true"`.
- Requires `OSSUM_DEPLOYMENT_TIER === "development"`; refuses `staging` / anything else.
- Requires `NODE_ENV !== "production"`.
- Requires `OSSUM_PRESUPUESTOS_CONFIRMED_TARGET === "yywqcdromnmmelijvspi"`.
- `DATABASE_URL`: only `postgres:` or `postgresql:`; hostname must be exactly `db.yywqcdromnmmelijvspi.supabase.co:5432` (direct) or `aws-1-sa-east-1.pooler.supabase.com:6543` (pooler); username exactly `postgres` or `postgres.yywqcdromnmmelijvspi`; path exactly `/postgres`; no query / hash.
- `SUPABASE_URL`: protocol `https:`, hostname `<project>.supabase.co`, no port/search/hash, pathname root or `/rest/v1[/]`.
- 7 negative cases + 2 positive cases → 9 gate tests, all green without DB opt-in.

## Decisions

- Treat the prior session’s broader test fixture updates (`expectedRevision`, `vatTreatment`, `vatRate`, `metadata.writeRevision`, restructured `tx` mocks) as necessary to satisfy the frozen source service signatures (`expectedRevision: number` is now required), not as out-of-scope edits. The single line-300 assertion fix is the only behavioral assertion correction.
- Source service remains frozen at `D4566BDEA63E306B...`; no edits performed.
- No DB opt-in was set; PG race was skipped via `describe.skip`. Gate tests covered all target / pooler / foreign / query / production refusal paths without any live DB or `pg` connection.
- The previous HANDOFF claim "68/68" reflected an earlier narrower subset; current full eight-file run is 124 passed + 1 skipped.

## Risks

- Real PG race evidence in this review is conditional: the test is the same `describe.skip` block without opt-in. The earlier evidence in Engram #8142 (`fixture cmuqqsez70000nshuaexh7tyx retained under existing synthetic company/surgery, qaOwner target task`, `1 actual DB race + 9 gate checks = 10/10`) is referenced as previously confirmed; **not re-executed** during this read-only pass. Re-running the PG race requires a future opt-in session with explicit confirmed disposable DEV gate.
- `presupuesto.service.ts:224` `lockPresupuestoRow` silently skips the lock when `tx.$queryRaw` is not a function. Real Prisma transaction clients always provide `$queryRaw`, so this is a defensive-only guard today; in tests the gate is enforced by the explicit assertion in lock-order tests.
- `presupuesto.service.ts:807` `emitPresupuesto` retry loop only catches `Prisma.PrismaClientKnownRequestError` with `code === "P2034"`, which is the Serializable isolation conflict. With ReadCommitted (used by the new PG race) `P2034` should not be thrown, making the retry effectively dormant in this evidence path.
- Several unrelated dirty files remain in the working tree from other sessions (per `AGENTS.md`); preserved as instructed.
- Browser QA on port 5000 and a separate build were **not executed** in this read-only review (no browser / build evidence appended). Distinct from test/TSC evidence above; per-task acceptance would still require them per TASK_BRIEF §8 if needed.

## Open questions

- None raised by this read-only review.

## Next

- If a future session needs to re-run the actual DB race, set `OSSUM_RUN_PRESUPUESTOS_FINAL_VALIDATION_DEV=true` together with the exact confirmed `OSSUM_PRESUPUESTOS_CONFIRMED_TARGET=yywqcdromnmmelijvspi`, `OSSUM_DEPLOYMENT_TIER=development`, `DATABASE_URL` matching the confirmed Supabase project pooler or direct connection, and `SUPABASE_URL` exactly as the gate allows. No further test edits are required for that.
- No follow-up code edits required from this review.

## Handoff (Caveman)

```
Done:
  Verified frozen source hash; verified all three owned test corrections
  against the brief; 8/8 test files green without DB opt-in (124 + 1 skipped);
  tsc --noEmit --incremental false exit 0; gate refuses every non-DEV /
  non-pooler / query-string / production case.

Changed:
  None during this review. Test / source / config / lock untouched.

Files:
  src/lib/services/presupuesto.service.ts ............. D4566 BDEA 63E3 06B2 ... (frozen, unchanged)
  src/__tests__/unit/presupuesto-service.test.ts ...... 8E47 9FD4 AF3D D982 ... (line300 fixed, only review)
  src/__tests__/unit/presupuesto-concurrency.test.ts .. DB5E F3B0 5656 3B1E ... (5 lock-order + 5 original, only review)
  src/__tests__/integration/presupuesto-revision-postgres.test.ts .. DB14 783E ... (9 gate + 1 skip, only review)

Validations:
  tsc --noEmit --incremental false: exit 0
  vitest run (no DB opt-in): 8 files / 124 passed / 1 skipped
  per-file counts: service 9 / concurrency 10 / workspace-017f 17 /
  templates 25 / qa-017p 18 / mvp-closure 13 / layout-025a4 19 /
  revision-postgres 9 + 1 skipped

Risks:
  PG race not re-run (no opt-in). lockPresupuestoRow silently no-ops if
  $queryRaw is missing (defensive, real clients have it). emit retry
  dormant under ReadCommitted. Browser / build evidence not gathered in this
  read-only pass.
```
