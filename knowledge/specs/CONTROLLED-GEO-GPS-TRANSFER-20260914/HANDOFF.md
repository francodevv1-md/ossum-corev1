# Forward Correction — Review Handoff (2026-09-16)

## Continuation status — 2026-09-16
- The environment failure recorded below is historical, not a current blocker. The separately authorized `CLEAN-DEV-DIRECT-URL-REPAIR` completed after migration execution (Engram #6884/#6885).
- Only ignored/untracked destination `.env` `DIRECT_URL` was repaired; source remained unchanged. Installed Prisma migration status using destination file loading exited 0 (up to date); a read-only metadata check confirmed the successful pinned forward-correction record. No migration was rerun. No credentials are included here.
- Migration-history/checksum debt remains separate and unreconciled. Successful migration status does not certify historical checksums or application runtime. Do not replay the historical runner below.
- Fresh independent non-DB QA (`visible-yellow-leech`): **41/41 tests passed**, eight files: geography/GPS units, GPS UI, institution geography component, migration artifact, mocked contact-service regressions. Vitest ran through `startVitest` with `envFile: false` / `envDir: false`; no environment files or DB were accessed.
- Full `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` failed with **30 diagnostics**, independently reproduced by the orchestrator. Groups: eight missing-module errors, fourteen Article Prisma mismatches, six invoice/budget mismatches, one receipt-workspace props mismatch, one surgery-validator date-input mismatch. All ten diagnostic-bearing files are unchanged versus pre-recovery `ce61937`; historical baseline compilation was not rerun. No fixes attempted outside geography/GPS.
- Build/typegen not run by the constrained QA agent because Next loads dotenv; `next.config.ts` also ignores TypeScript build errors, so build success would not clear this failed gate. Browser QA not run: no local listener on ports 3000–3005, no live authenticated session established; WebGL/tiles and live GPS/API behavior remain unverified.
- Orchestrator independently verified correction SQL SHA-256 still equals the reviewed/applied pin. No SQL, schema, environment, application code, DB data, or migration history changed during continuation. Only this handoff and the documentation lock changed.
- Next gate: explicitly delimit recovery beyond geography/GPS before repairing missing Stock/Compras/Facturación modules and schema-contract mismatches; permissions and surgery-validator diagnostics require their respective safeguards. No blanket migration replay or silent expansion. Non-DB scoped QA is complete, not full application acceptance.

## Done
- Standard-mode apply, independent review PASS and explicitly authorized disposable DEV execution complete. Owner lock is `released` after successful verification. No application deployment, commit or push.
- Review follow-up: sole blocker corrected; reviewer PASS confirmed exact SQL pin. User authorized execution of only this new migration via isolated Prisma runner; reviewer acceptance included live preflight and DDL-trigger safety.
- Diagnose: prior read-only catalog/data evidence (#6867–6869) established physical tenant/index drift despite applied geography/GPS history. New forward transaction corrects only this delta; historical migration edits cannot repair it safely.

## Changed
- Locked preconditions; in-place exactly-one-link tenant backfill; Company/composite-link RESTRICT/CASCADE FKs; tenant main indexes; global device unique index created before removal of old index. Snapshots compare every non-tenant address field and all six scoped table rowsets; geography checks preserved. Mixed/partial state rejects; validated target is a no-op.
- Synthetic tests use exact unmodified SQL, `search_path=pg_temp` only, six session-local fixture tables/types, namespace guards before locks, and connection-close cleanup. No application rows queried or mutated by tests; no `_prisma_migrations` writes.

## Files
- `prisma/migrations/20260916143000_geo_gps_tenant_forward_correction/migration.sql`
- `src/__tests__/integration/geo-gps-forward-correction.test.ts`
- Recovery `TASK_BRIEF.md`, `LOCK.md`, `HANDOFF.md` (this directory).

## Validations
- Fresh execution: **one attempt, Prisma exit 0**. Source and isolated-copy SQL bytes both matched the reviewed SHA-256 before invocation and after verification. Config/runner/SQL package were created with apply_patch under `C:/Users/franc/AppData/Local/Temp/opencode/geo-gps-approved-20260916-78d1320`, after parent verification; installed Prisma ran with `migrate deploy --config <isolated-config>` and only this new migration plus migration lock metadata. Temporary files removed after success.
- Ownership recheck: same executor/package lock, expected working-tree changes only, no overlapping scoped ownership lock found. Fresh DEV preflight: zero ambiguous addresses, orphan addresses/links, duplicate devices, custom scoped triggers, incoming address FKs and competing scoped table locks.
- Exact pre/post rowset comparison (in memory; no business records logged): Company **40 → 40**, Contact **120 → 120**, ContactCompanyLink **116 → 116**, ContactAddress **3 → 3** (two enriched), Vehicle **4 → 4**, VehicleLatestPosition **0 → 0**. Every address ID/non-tenant field and every other scoped row preserved. Unaffected constraint/index catalog identical.
- Final catalog: non-null text tenant column, both validated/nondeferrable Company/link FKs with DELETE RESTRICT/UPDATE CASCADE, tenant main indexes, valid/ready/immediate global vehicle uniqueness, old vehicle composite device index absent; all tenant assignments valid. Migration itself rechecked exact guards under exclusive table locks with 10s lock/60s statement timeout. Default Prisma advisory locking remained enabled.
- History: all **46** prior records exactly unchanged; **one** new successful record, not rolled back, `applied_steps_count=1`, checksum exactly the pin (**47** total). No old SQL/history/checksum edits, reset, resolve or retry.
- Source and clean `.env` byte hashes unchanged. Source DIRECT_URL used exactly as parsed, in process memory only; no TLS overrides. Separate read-only clean DIRECT_URL connectivity probe still fails: **ENOTFOUND**. Durable clean environment configuration remains invalid/unrepaired.
- 13 fresh PostgreSQL synthetic cases passed; combined with geography artifact/unit regression tests: **16/16 passed**, three files (12.17s). Enrichment/IDs, both FKs, null/main/device/coordinate constraints, legitimate target multi-link state, partial/orphan/multi-link/duplicate/missing-table/wrong-FK/deferred-unique rejection, and transactional DDL/backfill rollback covered.
- Diagnose follow-up RED: target fixture replaced the device index with `UNIQUE ("trackingDeviceId") DEFERRABLE INITIALLY DEFERRED`; identical index definition and `indimmediate=false` confirmed. Correction incorrectly resolved/committed instead of rejecting. Minimal fix: `AND (NOT i.indisunique OR i.indimmediate)` in shared index validation. GREEN: rejection regression and complete focused suite passed; focused tsc and diff checks passed again.
- Reviewed and applied SQL byte SHA-256: `78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01` (CertUtil SHA256 and execution-time byte assertions). Do not change these now-applied migration bytes or normalize their newlines.
- Initial fixture run: four failures at index-definition comparison. Boolean probe proved PostgreSQL renders temporary namespaces as `pg_temp`, not physical `pg_temp_N`. Minimal alias correction, then all tests passed; no TLS/env changes.
- Focused TypeScript check passed: `node node_modules/typescript/bin/tsc --noEmit --incremental false --skipLibCheck --esModuleInterop --module nodenext --moduleResolution nodenext --target es2022 src/__tests__/integration/geo-gps-forward-correction.test.ts`.
- Installed Prisma **7.8.0**; `migrate deploy --help` verifies `--config`. Current Prisma v7 docs confirm configured `migrations.path`, normal deploy recording, advisory locking, no drift detection, and no warning for missing already-applied files: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production . Only the isolated new migration was executed.
- Reproduce tests from clean worktree using a child environment containing `DIRECT_URL` parsed in memory from the read-only source `.env` and `GEO_GPS_SYNTHETIC_DEV=1`; run installed Vitest against the three files above. Without explicit opt-in, synthetic tests skip. No connection strings in arguments/logs/artifacts.

## Risks
- 18 unrelated DB-only migrations and other checksum debt remain untouched. This correction does NOT reconcile history or certify the full schema. Old recovered migrations are unchanged and must not be replayed against this database.
- No execution blocker remains for this completed correction. Durable clean `.env` connectivity was subsequently repaired in its separate task (see continuation status); unrelated historical debt remains. Do not infer application startup is repaired. Preserve default Prisma advisory locking for future operations; no bypass or automatic retry.
- Failed Prisma deployment can leave its own failed metadata record even though SQL rolls back; stop and diagnose, never automatically `resolve`, rewrite checksums, or retry blindly. Temporary package below intentionally omits old history; missing history remains debt, not repaired records.

## Next
No rerun required; the separate durable environment repair is complete. Continue application validation without migrations or history edits; unrelated migration-history repair remains out of scope. The original approved runner template below is retained as historical procedure, not an instruction to execute again. Actual execution used apply_patch-created temporary files, a one-attempt marker, fresh read-only pre/post snapshots/catalog guards and the same installed Prisma invocation. It used only the reviewed migration bytes, a secret-free config referencing the unchanged schema, and normal migration recording.

```js
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const { Client } = require('pg');
(async () => {
  const root = process.cwd(), name = '20260916143000_geo_gps_tenant_forward_correction';
  const parent = 'C:/Users/franc/AppData/Local/Temp/opencode';
  assert.ok(root.replaceAll('\\','/').toLowerCase() === 'e:/ossum_cor_worktrees/ossum-clean');
  assert.ok(fs.statSync(parent).isDirectory());
  const url = require('dotenv').parse(fs.readFileSync('E:/OSSUM_COR_PROJECT/.env')).DIRECT_URL;
  assert.ok(url); // Do not alter URL/TLS or persist credentials.
  const db = new Client({ connectionString: url }); let dir;
  try {
    await db.connect();
    const history = async () => (await db.query('SELECT * FROM public._prisma_migrations ORDER BY id')).rows;
    const before = await history();
    assert.ok(!before.some(r => r.migration_name === name || (!r.finished_at && !r.rolled_back_at)));
    assert.ok((await db.query("SELECT current_schema()='public' AS ok")).rows[0].ok);
    dir = fs.mkdtempSync(path.join(parent, 'geo-gps-reviewed-'));
    const migrations = path.join(dir, 'migrations'), only = path.join(migrations, name);
    fs.mkdirSync(only, { recursive: true });
    const bytes = fs.readFileSync(path.join(root, 'prisma/migrations', name, 'migration.sql'));
    const checksum = createHash('sha256').update(bytes).digest('hex');
    assert.ok(checksum === '78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01', 'Reviewed SQL hash mismatch');
    fs.writeFileSync(path.join(only, 'migration.sql'), bytes);
    fs.writeFileSync(path.join(migrations, 'migration_lock.toml'), 'provider = "postgresql"\n');
    const config = path.join(dir, 'prisma.config.ts');
    fs.writeFileSync(config, `export default {schema:${JSON.stringify(path.join(root,'prisma/schema.prisma'))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DIRECT_URL}};`);
    assert.ok(fs.readdirSync(migrations).sort().join('|') === [name,'migration_lock.toml'].sort().join('|'));
    const result = spawnSync(process.execPath, [path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',config],
      { cwd: root, env: { ...process.env, DIRECT_URL: url }, encoding: 'utf8' });
    assert.ok(result.status === 0, 'Deploy failed; stop for redacted diagnosis, no automatic resolve/retry');
    const after = await history(), added = after.filter(r => r.migration_name === name);
    assert.ok(added.length === 1 && added[0].finished_at && !added[0].rolled_back_at && added[0].checksum === checksum);
    assert.ok(JSON.stringify(after.filter(r => r.migration_name !== name)) === JSON.stringify(before));
    console.log('scoped_deploy_and_record_verified=true');
  } finally { await db.end(); if (dir) fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(() => { console.error('scoped_execution_failed=true; stop for redacted diagnosis'); process.exitCode=1; });
```

Execution safeguards were satisfied: reviewed hash pinned in both files, fresh aggregate/catalog preflight, confirmed disposable DEV, post rowset/catalog/history verification and unchanged environment files. Never substitute the repository-wide migration directory. The runner suppressed raw Prisma output and database exception details; only booleans/counts and sanitized error codes were reported.
