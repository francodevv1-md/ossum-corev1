# Ownership Lock

- Task: `SURGERY-VISIBLE-NUMBER-UNIQUENESS-DEV-001`
- Agent role: Backend / DB
- Selected model: `openai/gpt-5.6-sol`
- Owned files:
  - `prisma/schema.prisma` — Surgery model line only
  - `prisma/migrations/20260903030000_surgery_visible_number_uniqueness/migration.sql`
  - `src/lib/services/surgery.service.ts` — visible-number retry path only
  - focused tests for this task
- Status: `released`
- Existing unrelated worktree changes must be preserved byte-for-byte outside owned lines.
