# NESTED handoff

## Done
- Bounded Diagnose stopped at runtime budget; ownership released.
- Reproduced forbidden inherited companyId in real Control producer via focused source-path DTO assertion. Verified composite tenant parent relations read-only.

## Changed
- Control nested child omits companyId/controlId supplied by parent, preserving tenant composite foreign keys.
- Control copies original immutable allocation trace (JsonNull when absent), preserving location and all original identity fields; no historical rewrite or dispatch fallback.
- Selection already omitted inherited companyId at fresh hash: no source edit necessary. Dispatch consumer unchanged.
- Added actual select/reserve/control/createRemito/emitirRemito pipeline test with nondefault location, partial 0.5 quantity, pending/reserve balances and exact replay assertions. No forged control or whole-transaction mock.
- Owned fixture cleanup now clears latestControlId and removes command effects, dispatch accounting/lines, dispatch, controls, Remito/items, notifications and branch child-first. No sequence model exists: owner numbering derives MAX under Remito table lock. Branch synthetic ID ends 0001, name 0001 (Branch has no code field).
- Raised explicit test timeouts to 60s and cleanup hook to 120s after observed foreign-ID case exceeded 30s. Final timeout-only adjustment not rerun.

## Files
- src/lib/services/cajas-control.service.ts SHA256 9B299AD0BF4A53A6B5090F9DBEAAB712D4128947FDB41C24D72181E3A82A7E83
- src/__tests__/integration/cajas-preparation-postgres.test.ts SHA256 4E22A285FCBDBB8A5E2B7E7BFB41643E2104F011E44077B073EA9E137564910C
- src/__tests__/unit/cajas-nested-trace.test.ts SHA256 2EEF93B08E49242B5E4A1C1C73BBD2AB5B46DAC10D2CD04F6CF72D598AF9B5C3
- NESTED_LOCK.md; NESTED_HANDOFF.md.

## Validations
- Focused nested-trace + PREP_A correctness + dispatch owner unit suites: 32/32 PASS, three files.
- First actual gated PostgreSQL run: outer 90s timeout, no final results or cleanup confirmation.
- Second actual gated PostgreSQL run: gate 1 PASS; actual concurrency 1 PASS (20.618s); foreign-ID scenario timeout at explicit 30s (30.004s); remaining scenarios had no completed reported result before outer 65s cutoff.
- Actual DB count: 1 confirmed PASS of 5 actual scenarios; 1 observed timeout; 3 without completed result. This is not a completed suite verdict.
- Actual selection persistence/reservation proved by concurrency scenario. Actual Control and owner dispatch NOT proved: pipeline never reported execution.
- Cleanup status UNCONFIRMED after process cutoff; owned workers checked by exact run PIDs and already exited. No cleanup success asserted.
- Shell production/staging gate checked before overrides; saved RUN/tier/NODE_ENV restored in finally. No environment contents or secrets printed.

## Risks
- Exact remaining barrier: real suite timing exhausted bounded run before Control/Remito pipeline; multi-fixture foreign scenario explicit 30s limit was too short. Timeout adjustment awaits real execution.
- Timed-out runs may leave synthetic owned tenants. No unrelated data touched; do not bulk-clean by prefix or disable constraints. Prior process-local owned arrays are unavailable after cutoff.
- Five old recovery fixtures remain separate-owner outdated; no fallback added. No schema/generate/global Prisma/Auth/security/core UI/Git/dependency changes.
- Accounting/cancellation/UI remain pending. No full closure, real dispatch acceptance, final rollback or final cleanup proof.

## Next
- Fresh exact-hash owner resumes opt-in suite with 60s case / 120s cleanup allowances and sufficient outer budget; confirms all five counts and child-first cleanup.
- Identify only exact synthetic tenant IDs left by timed-out runs before authorized cleanup; pipeline case then proves actual Control + immutable dispatch/location + balances + exact retry. Inject final-owner rollback separately if time permits.
