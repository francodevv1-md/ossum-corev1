# Authorized isolated-DEV execution addendum

Franco authorized recovery of the stopped schema-baseline ownership and the
following bounded execution on 2026-09-21:

1. Create one disposable database named `ossum_c14_revocation_lock_dev_*` on
   the confirmed development-only direct PostgreSQL target.
2. Reconstruct it exclusively from the checked-out migration tree using
   `prisma migrate deploy`, then verify with `prisma migrate status`.
3. Run the C14 revocation-lock PostgreSQL integration and Contact code
   concurrency PostgreSQL integration against that isolated database.
4. Drop the database in cleanup regardless of test outcome.

The procedure must reject production/staging, preserve C13 history and SQL,
avoid `migrate resolve`, `migrate dev`, `db push`, and `reset`, and never print
credentials. The Contact integration needs one disposable Company fixture;
that fixture is confined to the database being dropped.
