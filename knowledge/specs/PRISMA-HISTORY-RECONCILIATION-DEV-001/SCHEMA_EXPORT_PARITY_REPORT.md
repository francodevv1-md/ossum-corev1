# Legacy DEV Schema Export Parity Report — 2026-09-24

## Export execution

- Exporter: `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` (PostgreSQL 18.6).
- Source access: existing `DIRECT_URL` was consumed only in a temporary process to provide PostgreSQL connection environment variables. No secret was printed, persisted, or copied into repository artifacts.
- Final retained artifact: `C:\Users\franc\AppData\Local\Temp\opencode\legacy-dev-schema.sql`.
- Final command semantics: `--schema-only --no-owner --no-privileges --schema=public --format=p`.
- The source connection is read-only by operation: `pg_dump` ran no DDL/DML; prior catalog evidence also recorded `transaction_read_only = on`.
- The final dump contains zero `COPY` statements and zero `INSERT INTO` statements.

## Final artifact fingerprint

| Item | Value |
| --- | --- |
| Size | 535,130 bytes |
| Raw SHA-256 | `ec27d7f8b6ed2d33a427e32ad28cd4c53a4f7af3c5d0757ee08c9ef1dcf6d0d6` |
| Canonical SHA-256 | `e73c7cad72b550b3e788496179398a06ac13c5978dafa7dec79472bffcd01d45` |

The canonical fingerprint excludes PostgreSQL 18's generated `\restrict`/`\unrestrict` session tokens, which make otherwise identical dumps receive different raw hashes.

## Public-schema parity inventory

| Object category | Read-only catalog / introspection | Schema-only dump | Result |
| --- | ---: | ---: | --- |
| Public tables | 123 | 123 | Match |
| Prisma models | 122 | 122 application tables | Match; `_prisma_migrations` is intentionally not a Prisma model |
| User and constraint triggers | 90 | 90 | Match; preserved in dump |
| Check constraints | 128 | 128 | Match; preserved in dump but unsupported by Prisma datamodel |
| Exclusion constraints | 1 | 1 | Match; preserved in dump but unsupported by Prisma datamodel |
| Deferrable constraints/triggers | 18 | 18 | Match; preserved in dump but not fully represented by Prisma |
| Public functions | n/a from Prisma | 72 | Preserved in dump; required by trigger definitions |
| Views / materialized views | 0 / 0 | 0 / 0 | Match |

## Extension evidence

The public-schema dump intentionally contains no `CREATE EXTENSION` statements because extension installation is database-scoped. A separate read-only `pg_dump --schema-only --section=pre-data` pass, written only transiently to the approved Temp artifact and then replaced by the final public dump, directly evidenced these extension declarations:

- `btree_gist` in `public`
- `pg_stat_statements` in `extensions`
- `pgcrypto` in `extensions`
- `supabase_vault` in `vault`
- `uuid-ossp` in `extensions`
- `plpgsql` is the PostgreSQL default procedural language and has no dump declaration.

These extensions are not represented by Prisma introspection. Any reviewed baseline must explicitly preserve the five dumped declarations before the public objects that depend on them. Target availability remains a target-only validation gate; it is not assumed from source evidence.

## Conclusion

**Legacy public-schema parity is demonstrable.** The final artifact preserves the source's Prisma-supported schema and every cataloged Prisma-unsupported public object without exporting data. It is suitable as the reviewed source for an isolated, disposable fiscal-reconciliation baseline.

The next gate is target-only: create the disposable database, apply a reviewed baseline that includes the extension declarations and public dump, then compare the target catalog against the counts above before generating FISCAL-02.
