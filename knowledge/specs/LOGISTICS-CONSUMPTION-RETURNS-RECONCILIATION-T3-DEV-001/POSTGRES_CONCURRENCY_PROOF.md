# PostgreSQL concurrency proof — pending DEV confirmation

The real same-key concurrency proof is implemented as an environment-gated test at `src/__tests__/integration/phase-d-logistics.postgres.test.ts`.

It must not run until Franco explicitly confirms that the configured database is a disposable DEV target and authorizes applying the Phase-D migration. The proof creates disposable company/dispatch/grant lineage, sends two identical commands concurrently, and asserts exactly one operation/evidence chain plus exact replay for the loser.

Current code uses a transaction-scoped unique-key claim. On `P2002`, the failed transaction rolls back, then a new Prisma operation rereads the winner; it never queries through PostgreSQL's aborted transaction.
