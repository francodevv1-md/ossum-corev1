# Contact creation stability — bounded DEV package

## Approval and ownership
- User requested correct new-contact creation, company isolation, typed frontend/API/backend contracts and short reproducible tasks, then switched out of Plan and said `Continua`.
- Risk: T3 company-context/audited persistence safeguards; no change to membership, roles, Auth or the approved global identity model.
- Owner: GPT-6.1 Sol (`openai/gpt-6.1-sol`), Backend/Frontend implementation and focused QA.
- One writer; independent reviewer is read-only. See `.opencode/locks/CONTACTS-CREATE-STABILITY-20261007.lock.md`.

## Finite work units
1. Explicit contact request/serialized response contracts; fix the reproduced edited legal-name mapping and validate form payloads with existing schemas without inventing mandatory domain fields.
2. Bind drafts and asynchronous results to the validated company; reject duplicate pending submissions; clear stale contact search results. Keep configured single-company Auth unchanged.
3. Make API contact creation and its audit atomic while preserving existing internal resolver callers. Exercise actual routes with isolated dependency doubles, not real DB mutations.
4. Focused console regression checks for create/edit/status/search/selection and adjacent consumers; scoped and global type/build checks where executable without disturbing existing work.

## Allowed files
- `src/lib/validators/contact.ts`, `src/lib/api/contacts.ts`, `src/lib/api/contact-adapter.ts`
- `src/lib/services/contact.service.ts`, `src/app/api/companies/[companyId]/contacts/route.ts`
- `src/components/contactos/ContactoFormDialog.tsx`, `src/components/contactos/ContactSearchModal.tsx`, `src/app/contactos/page.tsx`
- Existing/new focused contact tests under `src/__tests__/`; fixture/assertion corrections only where baseline evidence proves stale tests.
- This spec directory, own lock, own worklog entry.

## Exclusions
- No schema/migrations, DB writes, seed/reset/cleanup, provider/dependency changes, Auth/guards/permissions changes, global API-client changes, fiscal features, production/staging/deploy, commits/push/PR.
- No edits to foreign dirty `ContactLookupField.tsx`, `NewSurgeryDialog.tsx` or unrelated files.
- No broad contact deduplication/idempotency system, universal CUIT/DNI/role requirements or redefinition of shared identity/address semantics.
- Browser QA explicitly excluded by user. Do not certify visual viewport behavior or real authenticated persistence from console checks.

## Baseline / Diagnose
- Prior read-only scoped compiler check: 10 contact entries / 461 resolved files / 0 diagnostics. Global default-heap `tsc` failed OOM, not diagnosed as source regression.
- Focused six-suite baseline: 32 PASS / 2 FAIL. Legal-name test reproduces adapter preferring stale `razonSocial`; selector reset test expects removed copy while actual controlled input correctly clears (preserve foreign UI, correct assertion to behavior).
- Actual POST in-memory simulation: completed create + forced audit failure returns 500 because audit currently runs after the persistence transaction.
- Hypotheses: loose contracts hide integration drift; draft context is not pinned in the shared form; separate awaited audit permits false failed-create reports.

## Acceptance
- Successful create returns canonical server identity/code and persists its audit in the same transaction.
- Invalid JSON/payload, unauthorized company/role, audit failure and conflicting code do not report success; company identity cannot come from the body.
- Pending duplicate submits produce one request; company changes cannot reuse a draft or publish a stale result.
- Client rejects malformed contact responses rather than manufacturing successful records.
- Existing contact edit/status/selector behavior and internal resolver signatures remain compatible.
- Runnable focused commands, explicit PASS/FAIL/BLOCKED evidence and read-only independent review; preserve all pre-existing work.

## Stop conditions
- Shared-file ownership conflict; unapproved real DB/production/security/schema need; materially ambiguous domain rule; same blocker after two minimal Diagnose cycles.
