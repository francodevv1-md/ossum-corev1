# Schema-Only Export Capability Assessment — 2026-09-23

## Authorization applied

Franco authorized a minimum-access, schema-only, read-only export of legacy DEV. The authorization does not permit tool installation, secret inspection, provider-console credential use, source mutation, or a data export.

## Capability check

The local machine has no usable, preinstalled schema-export capability:

| Capability | Result |
| --- | --- |
| `pg_dump` on `PATH` | Missing |
| `psql` on `PATH` | Missing |
| PostgreSQL client binaries in standard Program Files locations | Not found |
| Supabase CLI | Missing |
| Docker | Missing |

Package managers are present, but installing PostgreSQL client tools or a provider CLI would exceed the authorized minimum-access route. No installation, download, provider-console session, credential lookup, connection attempt, or database command was performed in this assessment.

## Exact minimal blocker

**A preinstalled schema-only exporter or a provider-generated schema-only export is not available in this environment.** Supplying one requires either installing a tool or using provider credentials/session state outside the approved safe boundary.

No target database, baseline migration, or rebased FISCAL-02 delta was created. The previously documented legacy source and parity state are unchanged.

## Safe unblock

Provide either:

1. a preapproved `pg_dump` executable available locally; or
2. a provider-generated, schema-only SQL export placed in the approved Temp location without credentials.

The export must include extensions, functions, triggers, checks, exclusions, deferrable constraints, tables, indexes, and foreign keys. Then the controlled comparison can resume without touching legacy DEV.
