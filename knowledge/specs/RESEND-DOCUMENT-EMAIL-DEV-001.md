# RESEND-DOCUMENT-EMAIL-DEV-001

## Task Brief

- **Objective:** Send issued Remitos and coordinator surgery summary reports through Resend in DEV.
- **Owner / lock:** OpenCode · GPT-5.6 · final review PASS · `released`.
- **Approved scope:** Resend transport, explicit recipient, optional copy to authenticated user, private PDF attachments, company scoping, role checks, idempotency, audit, focused tests.
- **Sender:** `OSSUM COR | Districorr <sistemas@districorr.com.ar>` with the same Reply-To.
- **Surgery report:** Operational summary PDF for the selected surgery; no surgery-state mutation.
- **Allowed files:** outbound email service/validator, two email API routes, Remito send dialog/page integration, coordinator share dialog/report PDF, focused tests, this brief.
- **Forbidden:** schema/migrations, Gmail OAuth/send scopes, production/staging, deployment, real email sends, reactivating the public Remito PDF endpoint, fiscal issuance.
- **Validation:** focused Vitest, TypeScript, ESLint on changed runtime files, independent read-only review.
- **Stop conditions:** overlapping edits on owned files, need for schema/auth expansion, or the same blocker after two Diagnose cycles.

## Decision

Resend remains the outbound provider. “Recibir también yo” adds the authenticated user as CC (deduplicated when already the recipient); the copy arrives in Inbox, not Gmail Sent. OSSUM records the accepted provider ID in `AuditEvent`.

## Validation evidence

- Focused Vitest: 8 files / 72 tests passed.
- UI contract: Remito and coordinator dialogs submit recipient, subject, message, idempotency key and optional authenticated-user copy.
- PDF contract: Remito is rendered privately and attached as `R-####.pdf`; no public PDF route was enabled.
- ESLint: no errors in package files; one pre-existing `no-img-element` warning remains in coordinator evidence previews.
- TypeScript: no errors in package-owned files; repository-wide typecheck remains blocked by unrelated pre-existing errors.
- Browser lifecycle: Playwright starts and stops Next automatically on Windows; authenticated browser QA requires an authorized DEV session.
- Real delivery: authorized by Franco and completed against disposable DEV data to `sistemas@districorr.com.ar`; Resend message `0ece5dcb-1578-48e7-9e50-2cf5bbc9bac5` reached `last_event=delivered`, with `auditRecorded=true` and matching `remito_email_accepted` evidence.
- Independent read-only re-review: PASS; no material findings after correcting visible-message selection, provider-safe idempotency length, audit partial-success handling and the package test fixture type.
- Final security re-review: PASS; provider/audit logs expose only allowlisted error name/code fields, with symmetric Remito/Surgery regression coverage.

## Diagnose evidence

- Reproduced the first live attempt failing before provider contact because the no-address PDF branch requested unregistered `Inter` italic.
- Removed the unsupported italic style instead of adding another remote font asset.
- Added a no-address PDF regression test, retried with the same idempotency key, and confirmed delivery plus audit.
