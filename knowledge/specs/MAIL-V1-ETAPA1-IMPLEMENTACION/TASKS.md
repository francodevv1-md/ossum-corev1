# TASKS.md — MAIL-V1-ETAPA1-IMPLEMENTACION

Status: ready-for-apply  
Change: `MAIL-V1-ETAPA1-IMPLEMENTACION`  
Stage: `Stage 1 only`  
Artifact store: hybrid (filesystem + Engram)

---

## Guardrails for all slices

- No `prisma/schema.prisma` edits.
- No migrations.
- No auth redesign or new provider credentials.
- No real Gmail/Microsoft/IMAP integration.
- No global inbox route/navigation.
- No broad Cirugías refactor.
- Prefer additive files under `src/components/expediente/correo/*`, `src/lib/mail-stage1/*`, and surgery-scoped API routes.

---

## Slice 1 — Visible Correo tab shell

### Goal

Expose `Correo` as a first-class Expediente tab with a mount point only, without embedding feature logic inline.

### Files

- `src/lib/cirugias.constants.ts`
- `src/components/expediente/ExpedienteFullView.tsx`
- `src/components/expediente/correo/ExpedienteCorreoTab.tsx`
- optional small presentational files under `src/components/expediente/correo/*`

### Tasks

- [ ] Insert `correo` into the visible primary tab section of `EXPEDIENTE_TABS`.
- [ ] Add `TabsContent value="correo"` in `ExpedienteFullView`.
- [ ] Mount a single `ExpedienteCorreoTab` container from the tab content.
- [ ] Add empty-state UI that explains surgery-scoped mail and shows attach CTA.
- [ ] Keep all data/provider/persistence logic out of `ExpedienteFullView`.

### Validation

- `Correo` appears in the main visible tab row, not only in overflow.
- Existing Expediente tabs still render correctly.
- Empty-state copy and attach CTA render for a surgery without mail links.

---

## Slice 2 — Local mail-stage1 contracts, fixtures, and repository

### Goal

Create the server-owned Stage 1 mail module with isolated types, mock data source, and filesystem persistence boundary.

### Files

- `src/lib/mail-stage1/types.ts`
- `src/lib/mail-stage1/repository.ts`
- `src/lib/mail-stage1/provider/types.ts`
- `src/lib/mail-stage1/provider/mock-mail-provider.ts`
- optional fixture files under `src/lib/mail-stage1/provider/fixtures/*`
- `.gitignore` only if runtime path needs to be ignored and is not already covered

### Tasks

- [ ] Define Stage 1 local contracts for snapshots, links, attachments, event log, and UI-facing statuses.
- [ ] Implement repository interface plus filesystem-backed implementation under `.runtime/mail-stage1/companies/{companyId}.json`.
- [ ] Add safe read/write behavior for missing company documents and first-write bootstrap.
- [ ] Implement mock mailbox adapter for `sistemas@districorr.com.ar` with browse, snapshot, and attachment-download semantics.
- [ ] Keep feature types local; do not touch `src/types/index.ts`.

### Validation

- Repository can initialize empty company storage without schema changes.
- Mock provider returns deterministic conversation summaries and snapshots.
- Runtime storage path is server-owned and outside frontend state.

---

## Slice 3 — Validation and service workflow

### Goal

Centralize payload checks and business rules for list, attach, refresh, and critical attachment persistence.

### Files

- `src/lib/validators/mail-stage1.validator.ts`
- `src/lib/mail-stage1/service.ts`
- optional `src/lib/api/mail-stage1-adapter.ts`

### Tasks

- [ ] Implement validators for mailbox browse query, attach payload, refresh payload, and attachment persistence payload.
- [ ] Enforce same-surgery duplicate rejection.
- [ ] Enforce cross-surgery warning acknowledgement plus mandatory trimmed reason.
- [ ] Implement service methods for linked conversation list, mailbox browse, attach, refresh, and attachment persistence.
- [ ] Preserve shared snapshot semantics across multiple surgery links.
- [ ] Preserve metadata-only attachments when binary persistence fails.
- [ ] Return normalized error codes aligned with current API style.

### Validation

- Duplicate attach to same surgery resolves as conflict.
- Cross-surgery attach without ack/reason is rejected.
- Refresh updates shared snapshot only and does not create links.
- Attachment persist failures do not delete link or snapshot data.

---

## Slice 4 — Surgery-scoped API routes

### Goal

Expose the Stage 1 feature through company/surgery API routes that reuse current auth context and guards.

### Files

- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/refresh/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/attachments/persist/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations/route.ts`
- optional preview route if needed by the modal

### Tasks

- [ ] Add `GET/POST` route for surgery-linked conversations.
- [ ] Add mailbox browse route for mock conversation summaries.
- [ ] Add refresh route for an existing link.
- [ ] Add attachment persistence route for an existing link.
- [ ] Reuse `getApiAuthContext`, `requireCompanyReadAccess`, `requireCompanyMutationAccess`, and `errorResponse()`.
- [ ] Limit mutation roles to the Stage 1 transitional allowlist from the design.

### Validation

- Read routes require valid company context.
- Mutation routes reject disallowed roles with existing guard semantics.
- API responses use current `{ data }` / `{ error }` shape.

---

## Slice 5 — Attach modal and linked conversation UI

### Goal

Deliver the operator flow for browsing mock conversations, reviewing snapshots, selecting critical attachments, and linking to the current surgery.

### Files

- `src/components/expediente/correo/AttachConversationModal.tsx`
- `src/components/expediente/correo/CorreoEmptyState.tsx`
- `src/components/expediente/correo/CorreoConversationList.tsx`
- `src/components/expediente/correo/CorreoConversationCard.tsx`
- `src/components/expediente/correo/CorreoConversationDetail.tsx`
- `src/components/expediente/correo/CorreoAttachmentList.tsx`
- `src/components/expediente/correo/ExpedienteCorreoTab.tsx`

### Tasks

- [ ] Fetch linked conversation data from surgery-scoped API routes inside `ExpedienteCorreoTab`.
- [ ] Build attach modal with mailbox picker, attach review, optional critical attachment selector, and conditional cross-surgery warning block.
- [ ] Render conversation cards with subject, participants, latest timestamp, freshness context, linked surgeries, attachment counts, and technical statuses.
- [ ] Render detail view with thread snapshot/summary, reason history, attachment list, and refresh action.
- [ ] Support scoped loading/success/failure states for attach, refresh, and attachment persistence.
- [ ] Prevent UI wording that implies send/reply/global inbox capability.

### Validation

- Empty state transitions to linked list after successful attach.
- Same-surgery duplicate shows user-facing conflict feedback.
- Cross-surgery warning requires acknowledgement and reason before confirm.
- Refresh and attachment persistence errors remain scoped to the affected item.

---

## Slice 6 — End-to-end hardening and implementation checks

### Goal

Close Stage 1 with proof that the feature works within repo guardrails and without blocked-platform changes.

### Files

- Files from previous slices only

### Tasks

- [ ] Run targeted validation for the new mail module, routes, and Expediente integration.
- [ ] Verify `.runtime` behavior does not require checked-in data files.
- [ ] Confirm no blocked files were touched beyond approved minimal integration points.
- [ ] Document any Stage 1 runtime limitations for later backend/provider phases.

### Validation

- TypeScript/build checks relevant to changed files pass.
- Manual smoke flow works: empty state → attach → linked list → refresh → persist critical attachment.
- No schema/auth/provider-real changes appear in diff.

---

## Suggested executor order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 4
5. Slice 5
6. Slice 6

This order keeps the feature additive, testable, and aligned with Stage 1 guardrails.
