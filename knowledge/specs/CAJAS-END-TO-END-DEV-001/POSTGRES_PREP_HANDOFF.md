Done:
- Authored four actual PostgreSQL service-entrypoint proofs; execution deferred to orchestrator after PREPARATION-A source stabilization. No DB proof claimed.
- Ownership released. Only principal E:\OSSUM_COR_ANTIGRAVITY\ux-ui used for repository work.

Changed:
- Exhausted fungible quantity-one race between two formula-derived assignments and distinct physical box units; winner gets box+component, loser leaves no reservation/correlation/record/command/success audit.
- Existing foreign IDs and missing IDs both reject selection/eligibility/reservation with matching 404 codes; owned tenant snapshots unchanged.
- Actual Serializable Prisma transaction with narrowly proxied last command-acceptance create; verifies two real reservations, two correlations and three audits exist inside transaction before deliberate throw. Outside snapshot unchanged; same valid attempt succeeds.
- Same-key/same-intent accepted-result replay; changed cause conflicts without additional persisted writes.
- Explicit key/version/cause through current validators. No full domain/transaction mocks; all other delegate calls and locks use real DB.

Files:
- src/__tests__/integration/cajas-preparation-postgres.test.ts
- knowledge/specs/CAJAS-END-TO-END-DEV-001/POSTGRES_PREP_LOCK.md
- knowledge/specs/CAJAS-END-TO-END-DEV-001/POSTGRES_PREP_HANDOFF.md

Validations:
- PowerShell, executed from principal checkout: `$env:OSSUM_RUN_CAJAS_DEV_INTEGRATION = $null; npx vitest run "src/__tests__/integration/cajas-preparation-postgres.test.ts"`
- PASS: one preflight/parser test; four PostgreSQL scenarios SKIPPED. Final run 268 ms. DB, Prisma, dotenv and domain runtime imports are inside gated beforeAll; no DB test/mutation executed.
- Existing runner emitted Node localstorage-file warning; test passed. Build/typecheck/DB proof not run within bounded authoring scope.

Risks:
- Source owner still changing selection/control/resolve. Recheck latest contracts after release; this proof uses basic selection/reserve only.
- Requires installed schema/migrations and generated client matching finalized schema; authoring skip does not typecheck or execute fixture code.
- Approved target forms only: original DEV project direct port 5432 or approved transaction pooler port 6543; URL queries/fragments rejected. Other hosts/ports/providers unsupported without renewed target review.
- Cleanup requires ordinary deletion of synthetic evidence to be permitted. No active migration SQL immutable-delete trigger found during scoped inspection; actual DB triggers/FKs unverified. If cleanup rejects, its transaction rolls back, test fails and disconnect runs; STOP/report synthetic tenant IDs. Never disable guards or brute-force.
- Cleanup uses only descendants of successfully created UUID-prefixed Company/Organization IDs and exact synthetic User/Contact IDs. Child-first transactional deletion; nullable lastAcceptedChangeId cleared before deleting changes; no reset/truncate or existing tenant access. If setup fails after root creation, roots remain registered for afterAll cleanup.
- Synthetic local actor row only; no Auth provider operations/credentials. Stock credit via real recordStockMovement; formula/physical units/assignments/selections via real helpers. No extra framework/dependency/shared helper.

Next:
- Orchestrator: wait for source stabilization/release, ensure current schema is applied to the explicitly confirmed disposable DEV database, then run below from E:\OSSUM_COR_ANTIGRAVITY\ux-ui. This command was NOT executed by author.
```powershell
$env:OSSUM_RUN_CAJAS_DEV_INTEGRATION = 'true'; $env:OSSUM_DEPLOYMENT_TIER = 'development'; $env:NODE_ENV = 'test'; try { npx vitest run "src/__tests__/integration/cajas-preparation-postgres.test.ts" } finally { $env:OSSUM_RUN_CAJAS_DEV_INTEGRATION = $null }
```
- Connection configuration variable: DATABASE_URL, loaded using existing installed dotenv pattern (.env.local then .env, override false) only after initial deployment gate. Rejection also checks APP_ENV and VERCEL_ENV. No configuration values, secrets or connection URLs copied into handoff.
- Capture actual four-scenario result and cleanup outcome before calling this PostgreSQL proof complete. Independent-resource optional race omitted to keep four minimal proofs bounded.
