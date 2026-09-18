# Spec — MAIL-V1-ETAPA1-IMPLEMENTACION

Status: specified  
Change: `MAIL-V1-ETAPA1-IMPLEMENTACION`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)

---

## 1. Summary

Implement the first `Correo` experience as a surgery-scoped Expediente tab only. Users can manually attach email conversations from a mock mailbox flow, persist the linked snapshot server-side, inspect conversation and attachment metadata, manually refresh the snapshot, and optionally persist only selected critical attachments inside OSSUM. This stage must not introduce a global inbox, send/reply flows, auto-sync, real provider integration, schema changes, auth redesign, or provider/storage architecture decisions.

---

## 2. Objective

Give operations teams a minimum usable way to relate email evidence to a Cirugía/Expediente while preserving OSSUM COR's canonical model: correo is subordinate to the surgery, not an independent workspace.

---

## 3. In Scope

- Add `Correo` as a main Expediente tab.
- Show only conversations linked to the current surgery.
- Support manual attach through a modal backed by mock mailbox/provider data.
- Persist linked conversations and link metadata through an internal server-side boundary.
- Persist imported conversation snapshots, not live provider state.
- Allow manual refresh of an existing linked conversation snapshot.
- Store attachment metadata for imported conversations.
- Allow explicit persistence of selected critical attachments only.
- Prevent duplicate linking of the same conversation inside the same surgery.
- Allow the same conversation to link to multiple surgeries only with warning acknowledgement and mandatory reason.
- Expose technical import/download states to the user.

---

## 4. Out of Scope

- Global inbox, shared mailbox dashboard, or cross-surgery mail center.
- Compose, send, reply, forward, draft, or thread authoring.
- Automatic sync, polling, webhook ingestion, or background refresh.
- Real Gmail/Microsoft/IMAP/provider integration.
- Changes to `prisma/schema.prisma`, real migrations, or final storage-provider decisions.
- Auth redesign, permission-platform redesign, or multi-company redesign.
- Broad refactors of Cirugías/Expediente beyond the minimum additive integration path.

---

## 5. Product Rules

### 5.1 Entry point

- `Correo` exists only inside each Cirugía/Expediente.
- There is no standalone mail route required by this change.
- The tab is a first-class Expediente tab, not a nested hidden tool.

### 5.2 Conversation model

- A surgery can have zero, one, or many linked conversations.
- A linked conversation is represented as an internal snapshot of provider data captured at attach/refresh time.
- The current surgery view only shows conversations linked to that surgery.
- The system must not create two separate links for the same conversation in the same surgery.

### 5.3 Cross-surgery linking

- The same provider conversation may be linked to more than one surgery.
- When a user links a conversation already associated with another surgery, the system must:
  - warn clearly that the conversation is already linked elsewhere;
  - show the known linked surgeries in the warning context;
  - require an explicit reason before confirming the new link;
  - persist that reason as part of the link record.
- Warning acknowledgement plus reason are mandatory; without them, the second link cannot be created.

### 5.4 Attachments

- Every imported attachment must persist metadata at minimum.
- Metadata includes enough information to identify and render the attachment entry in OSSUM later.
- Binary/file persistence inside OSSUM is optional per attachment and only for explicitly selected critical attachments.
- Non-selected attachments remain metadata-only references in this stage.
- This stage does not require final provider-backed re-download guarantees; it only requires clear state reporting for available technical actions.

### 5.5 Refresh model

- Linked conversations are snapshots, not live views.
- The UI must expose a manual refresh action per linked conversation or equivalent scoped control.
- Refresh replaces or updates the stored snapshot with the latest mock-provider state available at refresh time.
- No automatic refresh may occur in background.

---

## 6. Required User Experience

### 6.1 Correo tab default state

When a surgery has no linked conversations, the tab should:

- explain that correo is surgery-specific;
- show an empty state;
- offer a primary action to manually attach a conversation.

### 6.2 Conversation list

The tab should render, for each linked conversation at minimum:

- subject or best available title;
- participants summary;
- latest message timestamp from the stored snapshot;
- current snapshot freshness context (for example imported/refreshed time);
- linked surgeries indicator when applicable;
- attachment count and attachment states;
- technical status indicators for import/download/persistence where relevant.

### 6.3 Manual attach modal

The attach flow must allow a user to:

1. open a modal from the surgery's `Correo` tab;
2. browse or select from mock mailbox conversations;
3. inspect enough summary information before linking;
4. confirm linking to the current surgery;
5. optionally mark critical attachments for internal persistence before final confirmation, if attachments exist;
6. see warning + mandatory reason flow when the conversation is already linked to another surgery.

The modal must never suggest send/reply capabilities in this stage.

### 6.4 Conversation detail behavior

Within the surgery context, users must be able to inspect:

- conversation metadata;
- message timeline snapshot or equivalent thread summary;
- linked surgeries;
- warning/reason history relevant to multi-surgery linking;
- attachment list with metadata and persistence state;
- refresh availability and last refresh/import result.

---

## 7. Persistence and Internal Boundaries

- Persistence must happen server-side through internal application boundaries.
- The frontend must not act as the final source of truth for linked conversations.
- The mock provider must be behind a stable internal interface so a real provider can replace it later.
- This stage may use internal app-level persistence compatible with current repo constraints, but it must be shaped as server-owned data, not as a client-only Expediente widget.
- Any internal records created for this feature must stay additive and must not require schema/auth/provider-real changes in this phase.

---

## 8. States and Feedback

The experience must represent technical states explicitly enough for operators to understand what happened.

Minimum state families:

- attach/import in progress;
- attach/import success;
- attach/import failure;
- refresh in progress;
- refresh success;
- refresh failure;
- attachment persistence in progress;
- attachment persistence success;
- attachment persistence failure;
- metadata-only attachment state;
- critical attachment stored state.

Failures should remain scoped to the affected conversation or attachment when possible.

---

## 9. Guardrails

- Do not introduce global mail navigation.
- Do not introduce send/reply actions, even as disabled placeholders unless clearly marked non-operational.
- Do not add automatic sync semantics to the spec.
- Do not require changes to auth, schema, migrations, or real provider credentials.
- Keep the implementation path additive around current Expediente integration points.

---

## 10. Acceptance Criteria

### AC-01 — Surgery-only entry point

`Correo` is available as a main Expediente tab and there is no user-facing global inbox introduced by this change.

### AC-02 — Empty state and attach action

For a surgery with no linked conversations, the `Correo` tab shows an empty state and a clear manual attach action.

### AC-03 — Manual attach from mock provider

Users can open a modal from the surgery `Correo` tab, select a conversation from mock mailbox data, and link it to the current surgery.

### AC-04 — Server-owned persistence

After attach confirmation, the linked conversation snapshot and link metadata are persisted through an internal server-side boundary rather than remaining only in frontend transient state.

### AC-05 — No duplicates in same surgery

If a user tries to attach a conversation already linked to the same surgery, the system prevents duplicate creation and communicates that the conversation is already linked.

### AC-06 — Cross-surgery warning and reason

If a conversation is already linked to another surgery, the system allows linking to the current surgery only after showing a warning and collecting a mandatory reason, and the reason is persisted.

### AC-07 — Snapshot behavior

The surgery view renders stored conversation snapshot data and does not imply live provider sync.

### AC-08 — Manual refresh only

Users can manually refresh a linked conversation snapshot, and no automatic sync/polling/webhook refresh behavior is part of this change.

### AC-09 — Attachment metadata

Imported conversations persist attachment metadata even when the attachment binary is not stored internally.

### AC-10 — Critical attachment persistence

Users can explicitly mark selected attachments as critical for OSSUM persistence; non-selected attachments remain metadata-only.

### AC-11 — Technical states visible

The UI exposes technical import/refresh/attachment persistence states clearly enough to distinguish loading, success, and failure outcomes.

### AC-12 — Scope protection

The change can be implemented without requiring schema changes, auth redesign, real provider integration, global inbox behavior, or send/reply capability.

---

## 11. Implementation Notes for Next Phase

- Likely repo touchpoints remain `src/components/expediente/ExpedienteFullView.tsx`, `src/lib/cirugias.constants.ts`, and new expediente-correo components/services.
- The design phase should define the exact internal record shapes, refresh semantics, warning/reason payload, and attachment-state contract without crossing into blocked backend-foundation scope.
