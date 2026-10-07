# Saved synthetic intake and authorization process test

## Declaration
- ID: SURGERY-INTAKE-AUTHORIZATION-E2E-20261003
- Outcome: one saved real Playwright journey creates a uniquely tagged synthetic surgery through the wizard, asserts UI rejection without required evidence, records the existing explicit exception and authorizes; verify backend readback and reload.
- Owner/model: coordinator openai/gpt-6.1-sol, one delegated QA writer, independent read-only review.
- Mode: implementation/testing; existing application remains read-only.
- Allowed: new spec/config, minimal scripts/qa/run-surgery-process.mjs replay runner and isolated artifacts/lock; read-only source/Git; synthetic static test discovery; reuse existing authenticated local session; bounded real run only after target, known synthetic baseline contacts and server effects verified.
- Forbidden: source fixes, Auth/permissions/schema changes, imported ten-case identities, cleanup/deletes, external mail/fiscal/GPS/availability actions, new dependencies, shared package/config/test edits, build/typegen, commit/deploy.
- Validation: saved test discovery/type syntax, exact-company bearer200 preflight, known synthetic contact identity checks, backend-created CUID/contact/classification/marker, UI requirement, persisted exception attribution/status and reload; distinguish UI gate from server enforcement. Single worker/no retries; browser20minute maximum.
- Handoff: Done / Changed / Files / Validations / Risks / Next, exact replay command and honest PASS/FAIL/BLOCKED/NOT RUN.
- Stop: target/contact mismatch, no safe fixtures, unisolated outbound effects, expired Auth (do not modify Auth), ownership overlap, source bug needing core-flow/permissions change, same blocker after two minimal Diagnose cycles.

## Authorization and scope
Franco accepted the proposed synthetic saved test with “ok dale como hacemos eso”. Reuse confirmed existing disposable DEV target only after active-company identity matches prior documented company `codevdistricorr1000000000`; no fresh blanket DB question. Baseline synthetic contacts only; the later ten supplied real-name/source cases are excluded. New QA surgery is additive and remains for inspection; no automatic cleanup. Do not assign a real coordinator merely to populate a test. No new contacts are created. The minimal additive grouping of the four verified baseline synthetic contacts below is necessary fixture preparation within this bounded approved test; it is not an application/business-rule or permissions change.

## Verified fixture preparation
Read-only browser/API preflight on2026-10-03 authenticated the exact documented company, then verified four baseline IDs/codes/types/link roles/active flags/cliente roles. All required wizard context groups were absent, exactly as pristine seed source predicts. Add only the existing canonical context group, preserving all existing groupSlugs and every other field through the existing audited contact PATCH endpoint:
- ctdevpatient1000000000000 / DEV-PATIENT: pacientes
- ctdevdoctor10000000000000 / DEV-DOCTOR: medicos
- ctdevinstitution100000000 / DEV-INSTITUTION: instituciones
- ctdevpayer100000000000000 / DEV-PAYER: obras_sociales
All reads must pass before the first PATCH; fail closed on identity/type/active/role mismatch. No roles, user permissions, contact names, source records or deactivation changes. Record counts only; no imported-case data. Sequential coordinator execution, no other DB writer; no rollback/deletion of fixtures.

## Outbound safety evidence
Source inspection by fun-gray-carp traced create, exception note, authorized transition, notification emitter: no email/ntfy/GPS/webhook dispatch in the bounded chain. No coordinator produces explicitRecipientUserIds=[] and no notification inserts/broadcast. No mentions, OCR, upload, PR, mail/share/logistics actions. This is source-chain evidence, not certification of arbitrary DB triggers/background systems. Real server missing-evidence gate is409 surgery_authorization_evidence_required before status/audit/notification writes; test should assert it separately from disabled UI.

## Expected test behavior
Native actual UI/service flow, no mocked success responses or Auth bypass. Missing evidence is asserted at the layer actually enforcing it; do not assume backend rejection. Negative UI check must not create an exception note. Record exactly one explicit test-attributed exception via the existing checkbox, then assert authorized status and attributed backend note. Existing server-side notification effects must be verified safe before writes; browser abort guards cannot isolate server calls.

## Approved protected correction
Franco answered “si apruebo” to the exact proposed null snapshot when no coordinator is selected. Allowed additional source: src/hooks/useCirugiaActions.ts and its existing focused create-backend-only unit suite; one directed implementation owner. Preserve actual selected coordinator payloads and all foreign deltas. Reproduce no-ID placeholder payload with a failing hook test before fixing; apply minimum caller correction without changing shared patient/doctor/payer snapshot resolution. Validate absent/blank ID and valid selected coordinator, independent review, then same saved E2E. No Auth/permissions/schema or assignment-rule changes, no broad refactor.

## Owned-case recovery
Exactly one native wizard case was created after correction. A test-only UUID-format assumption failed because actual Surgery IDs are CUID. Do not create a duplicate or delete evidence: coordinator recovered the uniquely marked pending case using exact four baseline links, creation-time window and no coordinator assignment, saved an external owned receipt and added explicit receipt-resume mode. Resume rechecks backend identity/marker/contacts/classification/pending/no-entries before authorization and forbids new create writes. Actual resumed run passed the full remaining UI/API/reload checks. No claim of a fresh uninterrupted replay after these harness corrections.
