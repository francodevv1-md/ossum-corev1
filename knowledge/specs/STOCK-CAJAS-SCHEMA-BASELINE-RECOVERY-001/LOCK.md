# Ownership Lock

- task: `STOCK-CAJAS-SCHEMA-BASELINE-RECOVERY-001`
- agent role: Backend / DB
- selected model: `openai/gpt-5.6-terra`
- owned files: `prisma/schema.prisma`, `prisma/migrations/20260921020000_stock_reservation_evidence_command_reservation_unique/**`, `knowledge/specs/STOCK-CAJAS-SCHEMA-BASELINE-RECOVERY-001/**`
- status: released
- recovered ownership: prior stopped GPT-5.6-terra C14 schema-baseline session; no active delegation or distinct owner found on 2026-09-21
- authorization: Franco authorized recovery, disposable-DEV reconstruction, migration execution, and the two pending integrations on 2026-09-21
- forbidden: C13 SQL/history/checksums, Auth, permissions, production/staging, deploy, push, PR
