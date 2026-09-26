# AZURE-AUTHORIZATION-WIZARD-DEV-001

## Approval

- Franco identified `Nueva Cirugía → Datos del caso → IA de autorización` as the required integration point.
- Franco requested PDF/image import with field-by-field proposals.
- Franco confirmed the pipeline: Azure reads the file and the existing AI organizes the detected data.
- On 2026-08-17 Franco explicitly approved saving the completed advance as local commits (`sí avanza`).

DEV-only approval. Excludes automatic domain writes, schema, Auth/role changes, production/staging, deploy, secrets, push, and unrelated modules.

## Task declaration / lock

- Task: AZURE-AUTHORIZATION-WIZARD-DEV-001
- Owner: implementation agent / GPT-5.6-sol
- Mode: implementation + testing + review
- Status: released for local commit
- Original implementation worktree: isolated `feat/azure-surgery-ocr-review` from merged `main@82b399d`
- Current delivery location: root worktree, limited to the files listed below after Franco chose to run and validate from `E:\OSSUM_COR_PROJECT`
- Owned files: this brief; Azure OCR adapter; authorization extractor/provider/route; authorization upload/results/New Surgery UI; focused tests
- Forbidden: `prisma/schema.prisma`, Auth model, role policy, automatic Surgery/Presupuesto mutation, deploy, secret values, production/staging, push, unrelated dirty files
- Allowed commands: focused Vitest/ESLint, `git diff`, `git add` for owned files, `gga run`, and local `git commit` after PASS
- Forbidden commands: deploy, push, PR/merge, Prisma migration/apply, destructive commands, and secret inspection/output
- Validation required: focused tests, lint, diff check, GGA PASS, and authenticated manual QA
- Output format: Caveman `Done / Changed / Files / Validations / Risks / Next`
- Expected handoff: local commit hashes plus explicit statement that no push/deploy/unrelated files were included

## Outcome

- Accept one PDF/JPEG/PNG/BMP up to 4 MB in the existing Step 1 panel.
- Azure Document Intelligence `prebuilt-layout` performs OCR/layout extraction without persisting the file.
- The existing OpenAI structured normalizer receives Azure text—not the original file—and returns the existing authorization contract.
- Existing per-field review remains authoritative: use a matched Contact, create one, keep detected text, transfer dates, or apply only empty fields.
- No field is written without an explicit user action; no Surgery is saved automatically.
- After bulk-applying empty fields, the authorization panel collapses to a confirmation with actions to review fields or reopen the authorization.

## Validation

- 51 focused tests passed across Azure OCR, normalization, route guards, upload UI, results UI, materials, and New Surgery.
- Focused ESLint passed without errors; only pre-existing NewSurgeryDialog warnings remain.
- Independent review found one Azure fetch hang blocker; 15-second per-request aborts were added for analyze and poll calls.
- Focused re-review passed.
- Authenticated manual QA confirmed Azure extraction works from the root worktree.

## Stop conditions

- Existing ownership overlap appears.
- Changes require schema, Auth/roles, production/deploy, secret mutation, or automatic domain writes.
- The same blocker survives two minimal Diagnose cycles.
