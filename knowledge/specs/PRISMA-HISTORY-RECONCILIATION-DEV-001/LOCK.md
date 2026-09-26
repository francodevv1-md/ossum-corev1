# Prisma history reconciliation lock

- Task: PRISMA-FISCAL-CONTROLLED-BASELINE-DEV-001
- Agent role: Backend / DB migration reconciliation
- Model: openai/gpt-5.6-terra
- Owned files: this lock and new evidence documents only under `knowledge/specs/PRISMA-HISTORY-RECONCILIATION-DEV-001/`; one new isolated reconciliation migration directory
- Status: released
- Scope: read-only legacy DEV evidence, isolated fiscal-reconciliation baseline, reviewed FISCAL-02 delta, and target-only validation
- Explicit exclusions: legacy database writes; `prisma migrate reset`; `prisma migrate resolve`; `_prisma_migrations` writes; historical migration reconstruction; provider calls or credential inspection
- Prior release reason: Prisma introspection proved unsupported-object parity incomplete before target database creation.
- Current scope: authorized read-only schema export, parity evidence, and target-only baseline continuation.
- Exporter: `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe`; output is restricted to approved Temp.
- Released after target-only baseline application returned `P1014`; no ledger repair is authorized.
- Current probe: one fresh disposable target reproducing only the reviewed baseline with sanitized Prisma diagnostics; FISCAL delta is excluded.
- Released after reproducible P1014 root-cause evidence; documented generator fix was intentionally not applied.
- Current scope: apply only the approved one-line generator exclusion, baseline a new fixed target, then generate/apply isolated FISCAL-02 if baseline parity passes.
- Released after clean baseline/FISCAL-02 target validation; FISCAL-03/provider work remains excluded.
- Current scope: copy and hash exact applied isolated SQL into reconciliation evidence artifacts; read-only target checksum verification only.
- Released after exact artifact/source/target checksum parity was recorded; FISCAL-03 remains excluded.
