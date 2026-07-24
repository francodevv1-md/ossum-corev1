# Design — MAIL-V1-ETAPA1-IMPLEMENTACION

Status: designed  
Change: `MAIL-V1-ETAPA1-IMPLEMENTACION`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)

---

## 1. Design summary

Stage 1 adds `Correo` as an additive Expediente tab backed by server-owned mock mail records, not by Zustand and not by real provider integration. The implementation stays inside current guardrails by using:

- minimal UI integration in `ExpedienteFullView`;
- new expediente-mail components under `src/components/expediente/correo/*`;
- company-scoped API routes under `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/*` plus mock mailbox browse route(s);
- a server-side mail service layer with centralized validation;
- a transitional filesystem-backed repository behind an internal interface;
- a mock provider adapter for `sistemas@districorr.com.ar`.

No schema changes, auth redesign, provider-real integration, automatic sync, or global inbox are introduced.

---

## 2. Stage 1 constraints that govern the design

- `Correo` exists only inside Cirugía/Expediente.
- No `schema.prisma`, migrations, or DB model additions.
- No auth flow changes.
- No provider credential handling or real Gmail/Microsoft/IMAP integration.
- No frontend-owned source of truth.
- No broad Cirugías refactor.
- Binary persistence is optional and only for explicitly selected critical attachments.

---

## 3. Repo-fit design

### 3.1 Minimal integration points

- `src/lib/cirugias.constants.ts`
  - add `correo` tab entry.
  - keep `Correo` inside the primary visible group.
- `src/components/expediente/ExpedienteFullView.tsx`
  - add one `TabsContent` for `correo`.
  - mount a single container component only; do not embed mail logic inline.
- new mail module files only.

### 3.2 Visible tab behavior

Current Expediente tab visibility is slice-based (`first 7 = visible`). To satisfy “main visible tab” with minimum change, `correo` should be inserted into the primary section of `EXPEDIENTE_TABS` instead of relying on overflow.

Recommended order:

`Resumen → Cirugía → Presupuesto → Remitos → Consumo → Comprobantes → Correo → Doc. → ...`

This keeps Correo first-class without refactoring the whole tab system.

---

## 4. Component boundaries

### 4.1 Expediente Correo tab

Create a focused container:

- `ExpedienteCorreoTab`
  - fetches server-owned mail data for the current surgery;
  - owns UI state only (modal open, expanded conversation, transient refresh flags);
  - delegates rendering to children.

Recommended child split:

- `CorreoEmptyState`
  - empty copy + primary attach CTA.
- `CorreoConversationList`
  - list wrapper for linked conversations.
- `CorreoConversationCard`
  - summary row/card with subject, participants, freshness, linked surgeries, attachment counts, technical states, refresh action.
- `CorreoConversationDetail`
  - thread snapshot, linked surgeries, multi-link reason history, attachment list, last operation result.
- `CorreoAttachmentList`
  - renders metadata-only vs stored-critical states clearly.

Rule: no provider, persistence, duplicate, or warning logic in React components.

### 4.2 Attach modal

Create a dedicated modal flow:

- `AttachConversationModal`
  - orchestrates a three-step local UI flow.

Internal sections:

1. `MailboxConversationPicker`
   - browse/select mock mailbox conversations.
2. `ConversationAttachReview`
   - inspect summary, participants, timestamps, and attachment metadata.
3. `CriticalAttachmentSelector`
   - optional per-attachment selection for internal persistence.
4. `CrossSurgeryWarningBlock`
   - shown only when selected conversation is already linked elsewhere.
   - requires acknowledgement + mandatory reason.

The modal confirms one server mutation only after the full payload is valid.

---

## 5. Server-side persistence approach

### 5.1 Decision

Use a transitional server-owned filesystem repository behind an internal interface.

Reason:

- schema is blocked;
- Zustand/localStorage cannot be source of truth;
- Stage 1 needs persistence now;
- repository indirection allows later replacement by Prisma/PostgreSQL without rewriting UI/service contracts.

### 5.2 Runtime storage shape

Recommended root:

- `process.env.OSSUM_RUNTIME_DIR ?? path.join(process.cwd(), ".runtime")`
- feature path: `.runtime/mail-stage1/companies/{companyId}.json`

The runtime directory must be gitignored if implementation creates it.

### 5.3 Logical record model

Use one company-scoped JSON document with two top-level collections:

- `conversations`
  - keyed by `provider + mailbox + externalConversationId`
  - stores the latest imported/refreshed snapshot.
- `links`
  - keyed by internal `linkId`
  - stores surgery-specific association metadata.

This avoids duplicating snapshots when one conversation is linked to multiple surgeries.

### 5.4 Transitional record contracts

```ts
type MailConversationSnapshotRecord = {
  conversationKey: string
  provider: "mock-mailbox"
  mailbox: "sistemas@districorr.com.ar"
  externalConversationId: string
  externalThreadId?: string
  subject: string
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
  messageCount: number
  latestMessageAt: string
  importedAt: string
  refreshedAt?: string
  refreshStatus: "idle" | "success" | "failed"
  messages: Array<{ id: string; sentAt: string; from: string; to: string[]; cc: string[]; snippet: string }>
  attachments: MailAttachmentRecord[]
}

type MailAttachmentRecord = {
  attachmentId: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  providerAttachmentRef: string
  persistenceState: "metadata_only" | "selected" | "persisting" | "stored" | "persist_failed"
  isCriticalSelected: boolean
  storedFileRef?: string
  lastPersistenceError?: string
}

type MailConversationLinkRecord = {
  linkId: string
  companyId: string
  surgeryId: string
  conversationKey: string
  linkedAt: string
  linkedByUserId: string
  linkStatus: "active"
  warningAcknowledged: boolean
  crossLinkReason?: string
  knownLinkedSurgeryIdsAtLinkTime: string[]
  eventLog: Array<{
    type: "linked" | "refresh_requested" | "refresh_succeeded" | "refresh_failed" | "attachment_persisted" | "attachment_persist_failed"
    at: string
    actorUserId: string
    detail?: string
  }>
}
```

### 5.5 Why this shape

- shared snapshot supports multi-link cleanly;
- per-surgery link stores mandatory reason and warning acknowledgement;
- eventLog gives Stage 1 feature-local traceability without schema work;
- attachment state is explicit and UI-friendly.

---

## 6. Internal module boundaries

Recommended layering:

- `src/lib/mail-stage1/types.ts`
  - local contracts only; avoid `src/types/index.ts` edits.
- `src/lib/mail-stage1/repository.ts`
  - interface + filesystem implementation.
- `src/lib/mail-stage1/provider/types.ts`
  - provider-facing contracts.
- `src/lib/mail-stage1/provider/mock-mail-provider.ts`
  - mock mailbox adapter.
- `src/lib/mail-stage1/service.ts`
  - orchestration for attach/list/refresh/persist.
- `src/lib/validators/mail-stage1.validator.ts`
  - route payload validation.
- `src/lib/api/mail-stage1-adapter.ts`
  - shape server data for UI responses if needed.

Rule:

- route = auth + parse + guard + call service;
- validator = payload correctness;
- service = workflow/business rules;
- repository = persistence only;
- provider adapter = mock mailbox only.

---

## 7. Mock provider adapter/contracts

### 7.1 Adapter contract

```ts
interface MailProviderAdapter {
  readonly providerName: "mock-mailbox"
  listMailboxConversations(input: {
    mailbox: string
    query?: string
    limit?: number
  }): Promise<MockMailboxConversationSummary[]>

  getConversationSnapshot(input: {
    mailbox: string
    externalConversationId: string
  }): Promise<ProviderConversationSnapshot>

  downloadAttachment(input: {
    mailbox: string
    externalConversationId: string
    providerAttachmentRef: string
  }): Promise<{ buffer: Buffer; fileName: string; mimeType: string }>
}
```

### 7.2 Mock provider rules

- hardcode mailbox context to `sistemas@districorr.com.ar` for Stage 1;
- source data may come from static in-code fixtures or fixture JSON files under the feature module;
- no OAuth, tokens, refresh tokens, scopes, or external HTTP calls;
- attachment download may be mocked but must preserve success/failure semantics.

### 7.3 Provider replacement readiness

Later provider integration should only replace the adapter and repository implementation details, not UI payloads or route shapes.

---

## 8. Validation boundaries

Centralize request validation in `mail-stage1.validator.ts`.

Minimum validators:

- `validateListMailboxConversationsQuery`
- `validateAttachConversationInput`
- `validateRefreshConversationInput`
- `validatePersistCriticalAttachmentsInput`

### 8.1 Attach payload rules

Attach request must validate:

- `companyId`, `surgeryId`, `externalConversationId` present;
- provider mailbox is the allowed Stage 1 mailbox;
- `criticalAttachmentIds` is optional array of unique strings;
- duplicate same-surgery link is rejected;
- if linked to other surgeries:
  - `warningAcknowledged === true`
  - `crossLinkReason` required, trimmed, non-empty.

### 8.2 Refresh rules

- refresh targets an existing link;
- refresh never creates a new link;
- refresh updates shared snapshot only;
- refresh remains manual and user-triggered.

### 8.3 Attachment persistence rules

- only attachments already present in stored snapshot may be selected;
- only explicitly selected IDs are persisted;
- already stored attachments are idempotent success;
- failures should not delete link/snapshot data.

---

## 9. Service boundaries

### 9.1 Public service methods

```ts
listLinkedConversations(companyId, surgeryId, actor)
browseMailboxConversations(companyId, surgeryId, actor, query)
attachConversationToSurgery(companyId, surgeryId, actor, input)
refreshLinkedConversation(companyId, surgeryId, linkId, actor)
persistCriticalAttachments(companyId, surgeryId, linkId, actor, attachmentIds)
```

### 9.2 Service responsibilities

`attachConversationToSurgery`:

1. validate payload;
2. verify company read/mutation access using existing route auth context;
3. read existing links for duplicate/cross-link detection;
4. fetch provider snapshot;
5. write/update shared conversation snapshot;
6. create surgery link record;
7. optionally persist selected critical attachments;
8. return normalized UI payload.

`refreshLinkedConversation`:

1. validate target link exists;
2. re-fetch provider snapshot;
3. merge/replace shared snapshot;
4. preserve stored critical attachment refs where attachment IDs still match;
5. record refresh result in event log.

`persistCriticalAttachments`:

1. validate attachment IDs against stored snapshot;
2. mark attachments `persisting`;
3. request binaries from mock adapter;
4. write files under runtime storage;
5. mark success/failure per attachment.

---

## 10. API route design

Prefer API routes to match existing repo patterns.

### 10.1 Surgery-scoped linked data

- `GET /api/companies/[companyId]/surgeries/[surgeryId]/mail-links`
  - list linked conversation view models.
- `POST /api/companies/[companyId]/surgeries/[surgeryId]/mail-links`
  - attach selected conversation.

### 10.2 Mailbox browse

- `GET /api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations`
  - returns mock mailbox summaries for modal browsing.
- optional `GET /api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations/[conversationId]`
  - returns preview snapshot before attach if needed.

### 10.3 Existing link actions

- `POST /api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/refresh`
- `POST /api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/attachments/persist`

### 10.4 Access model for Stage 1

Do not redesign auth. Reuse current company auth context and route guards.

Transitional allowed roles for mutation:

- `admin`
- `manager`
- `coordinator`
- `owner`
- `super_admin`

UI-level enablement can map product labels (`coordinadores`, `manager de cirugías`, `ingresos`, `ventas`, `depósito`) to current available role/access data only as a narrow feature config. If implementation needs a new permission platform or role taxonomy rewrite, stop and escalate.

---

## 11. UX flow design

### 11.1 Default load

1. User opens surgery Expediente.
2. `Correo` tab fetches surgery-linked conversations.
3. If none, show empty state + attach CTA.

### 11.2 Manual attach flow

1. Open attach modal.
2. Load mock mailbox conversation summaries.
3. User selects one conversation.
4. Modal shows preview snapshot + attachment metadata.
5. User optionally marks critical attachments.
6. If conversation is already linked to another surgery:
   - show warning block;
   - list known linked surgeries;
   - require acknowledgement + reason.
7. Confirm attach.
8. Server persists snapshot, link, and selected critical attachments.
9. Tab refreshes from server response.

### 11.3 Duplicate same-surgery flow

If the selected conversation is already linked to the current surgery:

- do not create a second link;
- return `409 conflict`;
- modal shows “ya vinculada a esta cirugía”.

### 11.4 Refresh flow

1. User clicks refresh on one linked conversation.
2. Only that card/detail enters `refreshing` state.
3. Server pulls latest mock snapshot and rewrites shared conversation record.
4. UI updates freshness timestamp and result state.

No background refresh is allowed.

### 11.5 Critical attachment persistence flow

Initial attach is the primary persistence point for critical attachments.

Optional secondary action:

- from conversation detail, user can persist additional attachments later;
- attachment-level operations remain scoped and do not block the rest of the conversation.

---

## 12. Technical states

### 12.1 Conversation-level states

- `idle`
- `attaching`
- `attach_success`
- `attach_failure`
- `refreshing`
- `refresh_success`
- `refresh_failure`

### 12.2 Attachment-level states

- `metadata_only`
- `selected`
- `persisting`
- `stored`
- `persist_failed`

### 12.3 UI presentation rule

State rendering must be scoped:

- attach failure = modal-level;
- refresh failure = affected conversation only;
- attachment persist failure = affected attachment only.

Do not degrade the entire Correo tab for a single attachment error.

---

## 13. Critical attachment selection behavior

- default = all attachments metadata-only;
- selection is explicit and opt-in per attachment;
- selection is available only during attach preview and optionally later from detail view;
- selected critical attachments are attempted after link creation;
- if binary persistence succeeds, state becomes `stored`;
- if it fails, keep link and metadata, mark attachment `persist_failed`, and allow retry later;
- non-selected attachments remain visible and searchable only as metadata entries in Stage 1;
- refresh must not silently auto-promote metadata-only attachments to stored.

This keeps the operational record even if binary persistence is partial.

---

## 14. Error and conflict handling

Recommended API error codes:

- `mail_conversation_already_linked`
- `mail_cross_link_reason_required`
- `mail_cross_link_ack_required`
- `mail_link_not_found`
- `mail_provider_snapshot_unavailable`
- `mail_attachment_not_found`
- `mail_attachment_persist_failed`

Use existing `errorResponse()` helpers and keep route error semantics aligned with current API style.

---

## 15. Suggested file plan

Likely additive files:

- `knowledge/specs/MAIL-V1-ETAPA1-IMPLEMENTACION/DESIGN.md`
- `src/components/expediente/correo/ExpedienteCorreoTab.tsx`
- `src/components/expediente/correo/AttachConversationModal.tsx`
- `src/components/expediente/correo/CorreoConversationList.tsx`
- `src/components/expediente/correo/CorreoConversationCard.tsx`
- `src/components/expediente/correo/CorreoConversationDetail.tsx`
- `src/components/expediente/correo/CorreoAttachmentList.tsx`
- `src/lib/mail-stage1/types.ts`
- `src/lib/mail-stage1/repository.ts`
- `src/lib/mail-stage1/service.ts`
- `src/lib/mail-stage1/provider/types.ts`
- `src/lib/mail-stage1/provider/mock-mail-provider.ts`
- `src/lib/validators/mail-stage1.validator.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/refresh/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/attachments/persist/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations/route.ts`

Minimal touched existing files:

- `src/lib/cirugias.constants.ts`
- `src/components/expediente/ExpedienteFullView.tsx`

Avoid unless separately approved:

- `src/lib/store.ts`
- `src/types/index.ts`
- `prisma/schema.prisma`
- `src/app/cirugias/page.tsx`

---

## 16. Stop / escalate boundaries

Stop and escalate before implementation if any of these become necessary:

1. writable local/runtime filesystem is not acceptable for the target environment;
2. persistence must be multi-instance safe or durable across deployments;
3. feature needs Prisma tables, migrations, or shared DB querying;
4. feature needs real mailbox APIs, OAuth, webhooks, or background sync;
5. feature needs new role taxonomy, permission model redesign, or auth changes;
6. binary attachment storage requires final provider choice (Supabase Storage, S3, etc.);
7. implementation scope starts forcing refactors in Cirugías, `src/lib/store.ts`, or other critical files.

These conditions cross Stage 1 and require Franco approval and/or later Backend Foundation work.

---

## 17. Implementation-ready conclusion

The safest Stage 1 path is:

- additive Correo tab in Expediente;
- API-route + service + validator layering;
- filesystem-backed server-owned repository behind interfaces;
- mock mailbox adapter with stable contracts;
- explicit scoped states for attach, refresh, and attachment persistence;
- mandatory cross-link warning + reason capture;
- no schema/auth/provider-real changes.

This design is intentionally transitional but replacement-friendly for a later Prisma/provider-backed phase.
