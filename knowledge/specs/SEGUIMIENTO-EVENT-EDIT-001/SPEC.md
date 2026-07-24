# SPEC — SEGUIMIENTO-EVENT-EDIT-001

Status: **specified**  
Change: `SEGUIMIENTO-EVENT-EDIT-001`  
Language: English  
Prerequisites: approved PROPOSAL and DESIGN; interim server-enforced ADMIN gate approved for implementation verification.

---

## 1. Purpose and non-negotiable boundaries

This change adds tightly scoped editing for manually authored Seguimiento notes and creates separate, immutable authorization-evidence entries. It also preserves the established Mail Stage 1 authorization-import workflow through a dedicated, server-derived Mail conversation endpoint. It preserves the current persisted `SeguimientoEntry.evidenceRef` JSON model and does not require a schema or migration.

The change MUST NOT:

- modify `prisma/schema.prisma`, create a migration, change Auth, role taxonomy, dependencies, or canonical Knowledge;
- make `Surgery.autorizado`, surgery status, billing, remito, consumption, or downstream circuit eligibility change as an effect of either operation;
- retype, replace, delete, revoke, or amend a source entry when recording authorization;
- broaden access to `coordinator`, `operator`, or any other role during the interim gate;
- allow the generic Seguimiento create endpoint to be a client-controlled alternative for manual or Mail `authorization_evidence` creation once the dedicated Mail importer specified below exists;
- use the temporary Seguimiento ADMIN-only guard for the Mail importer, or use Mail mutation roles to broaden either manual Seguimiento operation;
- accept, copy, infer, or emit extracted or material-shaped authorization metadata through the Mail importer.

## 2. Authorization and scope

### 2.1 Interim server authorization

Both operations introduced by this change—eligible-entry PATCH and authorization-evidence POST—MUST call one named, documented server guard backed by `ApiAuthContext.role` and allowing exactly `admin`.

The guard is a temporary implementation-verification mapping, not the final definition of the responsible-ingresos capability. Its comment and name MUST make replacement by the future approved capability mapping localized. The implementation MUST NOT duplicate an inline role list or infer authorization from UI state, audience labels, client input, or an author identity.

The guard MUST execute after company auth context resolution and before body parsing, surgery resolution, target/source lookup, or writes. A non-admin active company member MUST receive `403 company_mutation_access_denied` for both operations, including a direct HTTP request.

Existing read access remains unchanged.

### 2.2 Mail authorization-import authorization

The Mail authorization importer is a separate internal trust boundary. It MUST call `requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)` after company auth context resolution and before body parsing, surgery/link/snapshot/attachment lookup, or a write. It MUST NOT call the temporary ADMIN-only Seguimiento-event guard.

`MAIL_STAGE1_MUTATION_ROLES` applies only to this Mail endpoint. It preserves the existing Mail Stage 1 mutation policy and MUST NOT broaden the manual PATCH or source-linked authorization routes, which remain exactly admin-only under §2.1. An active role outside the Mail mutation roles MUST receive `403 company_mutation_access_denied` without body, link, snapshot, or attachment processing.

### 2.3 Company and surgery isolation

For the two manual operations, the route MUST resolve the URL surgery value (persisted ID or visible number) with the existing company-scoped resolver before calling the service. The service MUST resolve an entry/source using all of:

```ts
{ id, companyId, surgeryId: resolvedSurgeryId }
```

An entry/source that belongs to another surgery in the same company or another company MUST produce `404 seguimiento_entry_not_found`, disclose no entry data, and perform no write. The subsequent update MUST use the row already established by this triple-scoped lookup, inside the relevant transaction.

## 3. API contracts

Successful responses MUST retain `{ data: SeguimientoEntryApiRow }`; errors MUST retain `{ error: { code, message } }`.

### 3.1 Edit note

`PATCH /api/companies/:companyId/surgeries/:surgeryId/seguimiento/:entryId`

```ts
type SeguimientoEventEditRequest = {
  content?: string;
  summary?: string;
  priority?: "alta" | "media" | "baja";
  highlighted?: boolean;
  mentions?: MentionRef[];
  imageEvidence?: {
    files: SeguimientoPhotoEvidenceFileInput[];
  };
};
```

At least one editable field MUST be supplied. `content`, when supplied, MUST trim to a non-empty string. `summary`, when supplied, MUST be a string; `""` explicitly clears it. `priority` MUST be exactly `alta`, `media`, or `baja`; it remains entry-scoped and MUST NOT create a case-level priority. `highlighted` MUST be a boolean. Mentions MUST retain existing company-scoped normalization and validation.

`imageEvidence` has exact replacement semantics:

| Input | Required result |
| --- | --- |
| omitted | Preserve current manual image evidence. |
| `{ files: [...] }` | Replace the complete manual image set; retain no prior image implicitly. |
| `{ files: [] }` | Remove manual image evidence from the entry. |

Only `entryType === "note"` is editable. PATCH on `authorization_evidence` MUST return `409 authorization_evidence_immutable`; PATCH on every other non-note family MUST return `409 seguimiento_entry_not_editable`. These rejections MUST occur before mention resolution, notification emission, or a write.

A syntactically valid request which leaves every supplied persisted value unchanged MUST return `400 no_changes`, append no history, and update no row.

### 3.2 Create authorization evidence

`POST /api/companies/:companyId/surgeries/:surgeryId/seguimiento/:sourceEntryId/authorization-evidence`

```ts
type CreateAuthorizationEvidenceRequest = {
  content: string;
  summary?: string;
  imageEvidence?: {
    files: SeguimientoPhotoEvidenceFileInput[];
  };
};
```

`content` is required, trimmed, and non-empty. `summary`, if supplied, is a string. `imageEvidence.files` is optional and may be empty. The request MUST NOT accept client-provided `entryType`, `authorId`, `companyId`, `surgeryId`, `sourceEntryId`, `priority`, `highlighted`, `mentions`, arbitrary `evidenceRef`, or surgery state.

In one transaction, the service MUST triple-scope resolve `sourceEntryId`. A missing/mismatched source MUST return `404 seguimiento_entry_not_found`; a source which is itself `authorization_evidence` MUST return `409 authorization_evidence_invalid_source`.

On success, the service MUST create and return `201` with a new row derived only from the authenticated context, resolved surgery, path source, and validated body:

```ts
{
  entryType: "authorization_evidence",
  companyId: ctx.companyId,
  surgeryId: resolvedSurgeryId,
  authorId: ctx.actorUserId,
  evidenceRef: {
    action: "authorization_recorded",
    sourceEntryId,
    imageEvidence: /* only when non-empty */ {
      source: "authorization_recorded",
      fileCount: files.length,
      files,
    },
  },
}
```

The source MUST remain unchanged in type, content, metadata, and history. Multiple authorization entries for the same eligible source are allowed; this change defines no deduplication, deletion, revocation, or correction flow. Every manually created authorization-evidence entry is immutable under the generic PATCH contract.

### 3.3 Import Mail authorization evidence

`POST /api/companies/:companyId/surgeries/:surgeryId/mail-links/:linkId/authorization-evidence`

```ts
type CreateMailAuthorizationEvidenceRequest = {
  content: string;
  summary?: string;
  attachmentIds?: string[];
};
```

`content` is required, trimmed, and non-empty. `summary`, if supplied, is a string. `attachmentIds`, if supplied, MUST contain at most ten unique, non-empty IDs; it is a selection only, not attachment metadata, content, or a client claim that an attachment belongs to the conversation.

This closed body MUST reject every other field, including `entryType`, `authorId`, `companyId`, `surgeryId`, `sourceEntryId`, `externalConversationId`, `conversationKey`, `evidenceRef`, extracted text, material data, priority, highlighted, mentions, image data, attachment descriptors, and surgery or circuit state.

The server MUST resolve the active Mail link, its `conversationKey`, and its stored snapshot with `(ctx.companyId, resolvedSurgeryId, linkId)`. It MUST derive all conversation identifiers and every selected attachment descriptor from that snapshot. An unavailable, inactive, cross-company, or cross-surgery link MUST return `404 mail_link_not_found` without disclosure; an active link without its stored snapshot MUST return the existing `404 mail_provider_snapshot_unavailable`. An unknown, duplicated, or non-snapshot attachment ID MUST return `400 mail_attachment_not_found`; no Seguimiento row may be created on any rejection.

On success, the importer MUST create and return `201` with a new immutable `authorization_evidence` row. It derives `companyId`, persisted `surgeryId`, `authorId`, entry type, and all metadata server-side. A Mail conversation is not a Seguimiento entry: the Mail-created row MUST contain no `sourceEntryId`, and the server MUST NOT invent one. Its fresh, closed `evidenceRef` is limited to this non-material provenance:

```ts
{
  action: "authorization_recorded",
  source: "mail_import",
  mailImport: {
    linkId,
    conversationKey,
    externalConversationId,
    provider,
    mailbox,
    subject,
    participantsSummary,
    latestMessageAt,
    messageCount,
    attachmentCount,
    importedAttachments: Array<{
      attachmentId,
      fileName,
      mimeType,
      sizeBytes?,
      persistenceState,
      storedFileRef?,
    }>,
  },
}
```

The importer MUST NOT call the provider, create, refresh, unlink, or otherwise alter a Mail link/snapshot/conversation. It MUST NOT retype, alter, or use an existing Seguimiento source entry.

## 4. Image validation and `evidenceRef` ownership

The current photo-evidence file validation MUST be shared internally and reused by legacy photo evidence, note image replacement, and authorization creation. It MUST enforce:

- only `image/*` MIME types;
- `previewDataUrl` beginning with `data:image/`;
- at most four files;
- at most 400,000 characters per preview data URL;
- at most 1,000,000 combined preview-data-URL characters;
- every file is an object; optional `name`, `sizeBytes`, `width`, and `height` metadata remains JSON-safe.

Legacy `file_photo_evidence` behavior remains unchanged: it requires a non-empty array and client `fileCount` matching that array. In the two new contracts, the server calculates `fileCount`; callers do not supply it. Invalid JSON MUST return `400 invalid_json_body`. Invalid body or file bounds MUST return the existing applicable stable validation code where one exists; otherwise use only the design-approved codes: `invalid_priority`, `invalid_highlighted`, `invalid_image_evidence`, `missing_authorization_content`, and `missing_edit_fields`. Validation failures MUST write nothing.

This change owns only the following `evidenceRef` keys:

```ts
type EventEditOwnedEvidenceRef = {
  priority?: "alta" | "media" | "baja";
  highlighted?: boolean;
  mentions?: MentionRef[];
  imageEvidence?: {
    source: "manual_event_edit" | "authorization_recorded";
    fileCount: number;
    files: SeguimientoPhotoEvidenceFileInput[];
  };
  editHistory?: SeguimientoEventEditHistoryEntry[];
};
```

The edit service MUST start with a plain copy of existing JSON, preserve unknown/mail/import/legacy keys, and modify only supplied owned fields. Empty replacement image evidence MUST delete `imageEvidence`, not persist an empty placeholder. Arbitrary client `evidenceRef` MUST NOT be merged into either new operation.

### 4.1 Mail provenance exclusion

Mail authorization import constructs a fresh `evidenceRef` only from the §3.3 allowlist. It MUST exclude message bodies, HTML, provider references not named in that allowlist, extraction output, and all material-shaped metadata. In particular, `extracted`, `material_autorizado`, `materials`, `materialAutorizado`, `authorizedMaterials`, and every legacy or alias material-extraction key MUST NOT be accepted, copied, inferred, or emitted.

This is a hard safety boundary: `consumo.service` treats material-extraction metadata on `authorization_evidence` as a canonical V0 authorization source. Mail-imported authorization evidence is non-material provenance only.

## 5. Append-only edit history

Each successful material note edit MUST append exactly one immutable history value; previous values MUST never be modified or replaced.

```ts
type SeguimientoEventEditHistoryEntry = {
  action: "event_edited";
  editedAt: string; // server-generated ISO timestamp
  actor: { userId: string; displayName: string };
  previous: Partial<{
    content: string;
    summary: string | null;
    priority: "alta" | "media" | "baja" | null;
    highlighted: boolean;
    mentions: MentionRef[];
    imageEvidence: {
      source: string;
      fileCount: number;
      files: SeguimientoPhotoEvidenceFileInput[];
    } | null;
  }>;
};
```

`previous` MUST contain exactly the supplied editable fields whose persisted values materially change. It MUST include deep copies of changed prior image metadata and mentions. Omitted fields and supplied no-op fields MUST NOT create snapshot values. The actor identity and timestamp MUST be server-derived. Existing legacy history records (`editedBy`, `previousContent`, `previousSummary`) remain readable; the adapter/UI MUST not invent unavailable legacy values.

Mention notifications retain existing behavior for actual newly added mentions only. No notification or history side effect may occur for rejected or no-op PATCH requests.

## 6. Client and rendering constraints

The client is a contract consumer and MUST NOT decide authorization. It may use the current role only to hide or disable affordances for non-admin users during the interim gate; forced requests remain server-denied.

- The edit hook/payload MUST preserve the distinction between omitted, replacement, and empty image evidence.
- The authorization action MUST call the nested POST endpoint with its source path ID, never generic create and never PATCH/retype of the source.
- The Mail authorization action MUST call the §3.3 Mail nested endpoint with `linkId`, `content`, optional `summary`, and selected `attachmentIds` only. It MUST NOT call generic Seguimiento POST or submit client-built conversation metadata, attachment descriptors, `entryType`, or `evidenceRef`.
- Only notes may show a Modify affordance. Authorization evidence MUST show no Modify affordance even for an admin.
- Authorization evidence with images MUST render as authorization evidence, not as `file_photo_evidence`.
- The feed MUST map editable-note and authorization image metadata, priority/highlight for notes only, and both legacy and new history shapes safely.
- Existing filtering, pagination, mail evidence, standalone photo evidence, mentions, and history visibility MUST remain intact.
- A `403` response MUST leave the UI usable, clear pending state, and not optimistically mutate the source or claim the surgery is authorized.
- The existing Mail note/photo behavior remains unchanged except that Mail authorization mode uses the dedicated Mail endpoint. A failed attempt to link a conversation MUST NOT fall back to generic authorization creation.

## 7. Error matrix

| Condition | Required response |
| --- | --- |
| Missing/invalid authentication | Existing `401` contract |
| No active company access | Existing `403 company_access_denied` |
| Active non-admin actor on a manual operation | `403 company_mutation_access_denied` |
| Active actor outside `MAIL_STAGE1_MUTATION_ROLES` on Mail import | `403 company_mutation_access_denied` |
| Invalid JSON | `400 invalid_json_body` |
| Invalid request/body/images | `400` applicable validation code |
| URL surgery outside company | `404 surgery_not_found` |
| Entry/source absent or outside resolved company+surgery | `404 seguimiento_entry_not_found` |
| PATCH authorization evidence | `409 authorization_evidence_immutable` |
| PATCH any other non-note | `409 seguimiento_entry_not_editable` |
| Authorization source is authorization evidence | `409 authorization_evidence_invalid_source` |
| Mail link absent, inactive, or outside resolved company+surgery | `404 mail_link_not_found` |
| Stored snapshot unavailable for an active Mail link | `404 mail_provider_snapshot_unavailable` |
| Unknown, duplicate, or non-snapshot Mail attachment selection | `400 mail_attachment_not_found` |
| Invalid or non-closed Mail authorization body | `400 mail_invalid_authorization_import_payload` |
| Valid PATCH with no material persisted change | `400 no_changes` |

## 8. Acceptance scenarios

1. **Admin edits a scoped note.** Given admin membership in `C1` and note `E1` in `C1/S1`, PATCH through `C1/S1` changes content, summary, `alta|media|baja` priority, highlight, mentions, and replacement images as supplied; unknown metadata remains; a single history snapshot contains each changed prior value and server actor/timestamp.
2. **Images replace and remove exactly.** Given a note with two manual images, a valid one-file replacement leaves exactly that one file. A later `{ imageEvidence: { files: [] } }` removes `imageEvidence` but retains the entry and all history. Omitting `imageEvidence` preserves the then-current set.
3. **Invalid metadata is atomic.** Invalid priority, non-boolean highlight, malformed/non-image/excess/oversized image input, malformed body, or cross-company mention returns its required `400` and does not update the entry, add history, emit mentions, or create authorization evidence.
4. **No-op is non-mutating.** A valid PATCH that exactly repeats all supplied persisted values returns `400 no_changes`; `updatedAt`, history, metadata, and notifications remain unchanged.
5. **Eligibility and immutability hold.** PATCH to authorization evidence returns `409 authorization_evidence_immutable`; PATCH to mail or photo evidence returns `409 seguimiento_entry_not_editable`; neither causes lookup-derived notification, history, or write.
6. **Authorization is separate and source-linked.** Admin POST from source `E1` in `C1/S1` creates `E2` with `201`, type `authorization_evidence`, server-derived author/company/surgery, `action: "authorization_recorded"`, `sourceEntryId: E1`, and optional validated images. `E1` remains unchanged.
7. **Authorization has no case-state side effect.** Creating `E2` does not write `Surgery.autorizado`, surgery status, billing/remito/consumption eligibility, or any downstream circuit state.
8. **Authorization source restrictions hold.** A missing/cross-scope source returns `404`; using authorization evidence as source returns `409 authorization_evidence_invalid_source`; no row is created in either case.
9. **Triple-scope isolation holds.** An admin requesting `E1` through `S2` when it belongs to `S1`, or through another company, receives `404 seguimiento_entry_not_found`; no row/history changes and no entry content is exposed. This applies to PATCH targets and authorization sources.
10. **Interim access is not broad.** `coordinator`, `operator`, and every other non-admin active membership receive `403 company_mutation_access_denied` on both routes before body parsing or target/source lookup, including raw HTTP requests. Admin succeeds for valid requests.
11. **Client semantics are preserved.** The UI serializes image omission/replacement/removal correctly; authorization submits nested POST, renders typed authorization imagery, exposes no Modify control for authorization cards, retains legacy history readability, and remains usable after `403`.
12. **Mail authorization import is server-derived.** Given a Mail-mutation-role actor, active link `L1` for `C1/S1`, and stored snapshot `M1`, POST through `C1/S1/L1` creates one `authorization_evidence` with server-derived actor, persisted surgery, conversation provenance, and only selected snapshot attachment descriptors. The request contains only content, optional summary, and unique attachment IDs; the created row has no `sourceEntryId`.
13. **Mail trust boundary remains narrow.** A `coordinator` may succeed on the Mail importer only when included in `MAIL_STAGE1_MUTATION_ROLES`, but remains denied on the manual PATCH and manual source-linked authorization endpoints by the temporary ADMIN-only guard. A non-Mail-mutation role is denied before Mail body or link/snapshot processing.
14. **Mail import is non-material and non-mutating.** Client or snapshot values named `extracted`, `material_autorizado`, `materials`, aliases, or any other material/extraction metadata cannot appear in the created row. The importer does not call a provider or alter the link/snapshot/conversation, source entries, `Surgery.autorizado`, surgery status, consumption, billing, remito, or circuit eligibility.
15. **Generic authorization bypass is closed after Mail importer readiness.** Once the §3.3 endpoint is implemented and tested, generic Seguimiento POST rejects every client-crafted `entryType: "authorization_evidence"`; no Mail compatibility exception remains. Manual authorization uses §3.2 and Mail authorization uses §3.3.

## 9. Required automated and manual verification

### Automated

- Validator tests: all request shapes, exact enum/boolean handling, absent/replace/remove image semantics, every image limit, content requirement, body-source rejection, and mention regression.
- Service tests: triple-scope lookup, cross-scope no-write behavior, note-only/authorization rejection, owned-key merge preservation, deep prior snapshots, no-op behavior, authorization source linkage/invalid source, transaction behavior, and assertion that no Surgery update is called.
- Route tests: guard order; admin success; all non-admin roles denied for PATCH and POST; visible-number surgery resolution; `400`, `404`, `409` envelopes; and generic POST cannot bypass the dedicated authorization flow.
- Mail importer validator/service/route tests: Mail mutation roles succeed only at the Mail boundary; non-Mail roles are denied before parse/link lookup; active link and stored snapshot are company+surgery scoped; selected attachment IDs are a bounded unique snapshot subset; every persisted provenance field is server-derived; no `sourceEntryId` is created; request or snapshot material/extraction fields cannot reach the row; no Mail/provider/source-entry/surgery/circuit write occurs.
- Adapter/hook/component tests: note versus authorization image mapping, note-only priority/highlight, legacy/new history compatibility, omitted/replace/remove payloads, nested authorization request, no authorization Modify control, and usable `403` state.

### Manual/browser QA

Using an admin session and a denied-role session, verify note editing, attach/replace/remove images, all priority values, highlight, zero-image and image-bearing authorization records, history display, direct cross-surgery URL isolation, keyboard access, and narrow viewport behavior. Confirm neither successful flow changes case authorization indicators or downstream eligibility.

Using a Mail-mutation-role session and a Mail-denied session, verify Mail authorization import independently from the manual admin-only flow: active-link selection, server-resolved snapshot attachment selection, generic authorization rejection, no client-visible provenance injection, and no surgery/circuit state change.

## 10. Implementation stop conditions

Stop and escalate instead of widening this change if:

- `admin` cannot be resolved consistently from server-side company auth context;
- implementation requires a schema, migration, Auth, permission-taxonomy, provider, storage, or dependency change;
- bounded image validation cannot be reused safely;
- active Mail link, stored snapshot, or selected attachment resolution cannot be safely scoped server-side;
- material/extraction metadata cannot be excluded from the Mail-created row;
- a requested effect would mutate surgery/circuit authorization state; or
- a route/service/validator/hook/UI file is held by another active owner.

## 11. Task decomposition readiness

This specification requires the following serialized task chain: named guard; Seguimiento validators; scoped manual service/authorization creation; **Mail authorization-import contract**; PATCH/manual nested route plus generic-bypass closure; adapter/hook/UI including the Mail modal; focused automated tests; then independent browser QA.

TASKS MUST insert the Mail authorization-import contract after Task 3 and before Task 4. Its allowlist is limited to the new Mail nested route, Mail validator/service, narrowly required server-only Seguimiento creation primitive, and focused tests. It MUST release its lock green before Task 4 begins. TASKS MUST then make generic POST rejection dependent on that completed importer, with no Mail exception; amend the client task for `ImportEvidenceFromMailModal.tsx`; and require QA to prove the two independent role boundaries, generic rejection, server-only provenance, material/extraction exclusion, and zero surgery/circuit side effects. No task may alter the stated boundaries or replace the interim guard with broader access without a newly approved capability mapping.
