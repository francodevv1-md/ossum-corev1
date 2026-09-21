# C14 WCB-06 revocation-lock integration test (isolated DEV)

## Purpose and boundary

The opt-in PostgreSQL test proves only this C14 behavior: a membership
revocation waits for the same `UserCompanyAccess` row lock held by C14
execution. It is not part of the default suite and must never target shared,
staging, or production data.

## Revocation-flow scope limitation

No production company-membership revocation flow exists in this worktree. The
repository has assignment/reactivation in `src/lib/services/user.service.ts`
and global user deactivation, but no service, API route, or other production
writer that sets `UserCompanyAccess.isActive` to `false`. Therefore the test
cannot invoke a production revoker: it uses a test-local transaction that
locks the same membership row and then sets `isActive` to `false`. Its result
proves lock-protocol compatibility only; it does not prove production
revocation wiring, authorization, audit behavior, or endpoint behavior.

This is **not** a C13 migration-history, migration-reconciliation, or schema
drift test. Applying the repository schema below may include already-versioned
C13 migrations because the test needs the checked-out repository schema, but
the lock-test result must not be used to assert C13 history or drift health.
Run any C13 migration-history/drift procedure separately, under its own scope
and approval; do not add it to this test lane or diagnose its failures here.

## Approval gate

The commands under **Executable proposal** are intentionally not executed by
this runbook. They create, mutate, and drop a database. Execute them only
after a human explicitly approves a disposable DEV PostgreSQL target and the
full create/apply/test/cleanup run.

Before approval, an operator must confirm all of the following:

- The deployment tier is `development`; the host and target contain no real,
  shared, staging, or production operational data.
- The database is dedicated to this run, may be dropped without affecting any
  other workload, and is named `ossum_c14_revocation_lock_dev_<identifier>`.
- `C14_ADMIN_DATABASE_URL` is a local, untracked administrator connection to
  a control database on the approved disposable DEV host, not the application
  `DATABASE_URL`.
- The database generated for this run will be assigned only to
  `C14_ISOLATED_DATABASE_URL`; the shell application `DATABASE_URL`, if set,
  identifies a different target.
- Credentials remain in a local secret store or untracked shell environment.
  Never print, paste, commit, log, or place a connection URL, password, token,
  or copied secret in this runbook, `.env.example`, test output, or CI logs.

## Non-mutating preflight

Set only non-secret flags in the current local shell. Load
`C14_ADMIN_DATABASE_URL` from the approved local secret source separately.

```powershell
$env:OSSUM_RUN_C14_REVOCATION_LOCKING_DEV_INTEGRATION = 'true'
$env:OSSUM_DEPLOYMENT_TIER = 'development'
$env:NODE_ENV = 'development'
if (-not $env:C14_ADMIN_DATABASE_URL) { throw 'Load C14_ADMIN_DATABASE_URL from the local secret source first.' }
if ($env:OSSUM_DEPLOYMENT_TIER -ne 'development' -or $env:NODE_ENV -eq 'production') { throw 'Target is not DEV.' }
```

The following generates an unpredictable, valid, disposable database name and
derives its URL without displaying either URL or credentials:

```powershell
$database = "ossum_c14_revocation_lock_dev_$(Get-Date -Format yyyyMMddHHmmss)_$([guid]::NewGuid().ToString('N').Substring(0, 8))"
if ($database -notmatch '^ossum_c14_revocation_lock_dev_[a-z0-9_]+$') { throw 'Generated database name is invalid.' }
$builder = [System.UriBuilder]::new($env:C14_ADMIN_DATABASE_URL)
$builder.Path = "/$database"
$env:C14_ISOLATED_DATABASE_URL = $builder.Uri.AbsoluteUri
```

Run this guard before schema work and again immediately before the test. It
prints only host and database name:

```powershell
$isolated = [uri]$env:C14_ISOLATED_DATABASE_URL
$targetDatabase = $isolated.AbsolutePath.TrimStart('/')
if ($env:OSSUM_DEPLOYMENT_TIER -ne 'development' -or $env:NODE_ENV -eq 'production') { throw 'Target is not DEV.' }
if ($targetDatabase -notmatch '^ossum_c14_revocation_lock_dev_[a-z0-9_]+$') { throw 'Target database name is not an isolated C14 DEV name.' }
if ($env:DATABASE_URL -and $env:DATABASE_URL -eq $env:C14_ISOLATED_DATABASE_URL) { throw 'C14 target must not be the shell application DATABASE_URL.' }
Write-Host "C14 isolated DEV target accepted: host=$($isolated.Host); database=$targetDatabase"
```

A failed guard is a hard stop. The test repeats the deployment-tier, database
name-pattern, and original-`DATABASE_URL` rejection before it overwrites
`DATABASE_URL` for Prisma. Do not rename a shared database to bypass a guard
or redirect the test to another target without a new independent confirmation.

## Executable proposal — **MUTATION COMMANDS: DO NOT EXECUTE WITHOUT APPROVAL**

All commands in this section require the approval gate above. They are shown
as an executable sequence for the approved disposable DEV run; this runbook
does not authorize their execution by itself.

### 1–4. Create, deploy, verify, test, and always clean up — **MUTATION: DO NOT EXECUTE**

Run this single block after the approval gate and preflight. `psql` uses the
administrator URL already loaded from the local secret source; it does not echo
that URL. Use migration deployment, never `prisma migrate dev`, `prisma db
push`, or reset. The outer `finally` covers every failure after creation.

```powershell
$databaseCreated = $false
$previousDatabaseUrl = $env:DATABASE_URL
try {
  psql --no-password --dbname=$env:C14_ADMIN_DATABASE_URL --set=ON_ERROR_STOP=1 --set="database_name=$database" --command 'CREATE DATABASE :"database_name"'
  if ($LASTEXITCODE -ne 0) { throw 'Disposable C14 database creation failed.' }
  $databaseCreated = $true

  $env:DATABASE_URL = $env:C14_ISOLATED_DATABASE_URL
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'Schema deployment to the isolated C14 database failed.' }
  npx prisma migrate status
  if ($LASTEXITCODE -ne 0) { throw 'Isolated C14 schema verification failed.' }

  $env:DATABASE_URL = $previousDatabaseUrl
  npx vitest run src/__tests__/integration/c14-wcb-06-revocation-locking-postgres.test.ts
  if ($LASTEXITCODE -ne 0) { throw 'C14 revocation-lock integration test failed.' }
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
  if ($databaseCreated) {
    if ($database -notmatch '^ossum_c14_revocation_lock_dev_[a-z0-9_]+$') { throw 'Refusing to drop a non-C14 isolated database.' }
    psql --no-password --dbname=$env:C14_ADMIN_DATABASE_URL --set=ON_ERROR_STOP=1 --set="database_name=$database" --command 'DROP DATABASE :"database_name" WITH (FORCE)'
    if ($LASTEXITCODE -ne 0) { throw 'Disposable C14 database cleanup failed.' }
  }
  Remove-Item Env:OSSUM_RUN_C14_REVOCATION_LOCKING_DEV_INTEGRATION, Env:C14_ISOLATED_DATABASE_URL -ErrorAction SilentlyContinue
}
```

The test uses writer-locked, revoker-started, and release barriers. Its
five-second timeout fails a stalled transaction; `finally` releases the writer
before waiting for both transactions and disconnecting Prisma.

## Outcome criteria

### Success

Before the writer release barrier, the revoker has started but has not
completed. After release, both transactions complete, the membership row is
inactive, the test exits successfully, its generated `it-c14-lock-*` records
are removed, and the disposable database is dropped.

### Failure or stop conditions

Stop and report the run as blocked or failed when approval is absent, any guard
fails, schema deployment or verification fails, the test times out, the
revoker finishes before writer release, the membership remains active, or
cleanup fails. Do not retry against a different database until that target is
independently reconfirmed. Do not classify a schema/migration failure as a C13
result from this C14 lock test.
