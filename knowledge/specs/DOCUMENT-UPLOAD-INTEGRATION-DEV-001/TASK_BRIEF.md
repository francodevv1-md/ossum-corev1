# DOCUMENT-UPLOAD-INTEGRATION-DEV-001

## Approval

Approval evidence from the 2026-08-17 user conversation:

- Agent asked: `¿Confirmás que la V1 sea en Ficha CX → Novedades → Adjuntar, permitiendo PDF e imágenes, guardando el original privado en R2 y registrándolo en Seguimiento con descarga autenticada, sin cambiar roles ni schema?`
- Franco answered: `Confirmo pa`.

This approval is DEV-only and covers private PDF/image upload to R2, Seguimiento registration, authenticated download, and the existing Cloudflare DEV processing pipeline. It does not approve production/staging, role/Auth/schema changes, deployment, commit beyond an explicit later request, or unrelated scope.

## Task declaration / lock

- Task: DOCUMENT-UPLOAD-INTEGRATION-DEV-001
- Owner: implementation agent / GPT-5.6-sol
- Mode: implementation + testing + review
- Status: released
- Owned files: `src/components/expediente/NovedadesTabContent.tsx`, `src/hooks/useSeguimientoFeed.ts`, `src/lib/api/seguimiento-adapter.ts`, new operational-document service/validator/storage/routes/tests, this brief
- Forbidden: `prisma/schema.prisma`, Auth model, role policy, production/staging, deploy, secrets, migrations, unrelated worktree files

## Outcome

- One PDF, JPEG, or PNG per upload, at most 4,000,000 bytes.
- Authenticate and authorize before parsing multipart content.
- Resolve company-scoped surgery server-side.
- Validate MIME and magic bytes server-side.
- Generate the private R2 key server-side under `document-inbox/{companyId}/{surgeryId}/{entryId}/`.
- Persist a `document_evidence` Seguimiento entry in existing `evidenceRef` JSON; no schema change.
- Provide authenticated, company-scoped private download by entry ID.
- Keep the existing Worker/Queue/Azure pipeline as the asynchronous processor.

## Validation

- Focused validator/service/route/adapter/component tests.
- TypeScript and build.
- Independent read-only review.

## Stop conditions

- Existing ownership overlap in owned files.
- Need to change roles, Auth, schema, production, or deployment.
- Two minimal Diagnose cycles fail on the same blocker.
