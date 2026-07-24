# Design — SEGUIMIENTO-EVENT-EDIT-001

Status: amended design — ready for corresponding SPEC/TASKS amendment before T4
Change: `SEGUIMIENTO-EVENT-EDIT-001`
Language: English
Date: 2026-07-15

---

## 1. Decision and boundaries

This design implements the approved Seguimiento event-edit behavior without a Prisma schema change, migration, Auth-provider change, role-taxonomy change, dependency, or surgery-state change.

### 1.1 Temporary authorization decision

The pending `responsible-ingresos` capability is **not created** by this change. Until a separately approved role/capability mapping replaces it, the one server-side principal allowed to perform the two operations introduced here is the active company membership whose `ApiAuthContext.role === "admin"`.

This is an intentional, temporary compatibility gate, not a semantic statement that every admin is the final responsible-ingresos actor. It must be isolated behind a named Seguimiento-event mutation guard/constant, rather than copied as inline role arrays. Replacing the gate later must change only that permission mapping; it must not change route contracts, edit eligibility, metadata, history, source linkage, immutability, or surgery behavior.

The two protected operations are:

1. PATCHing an eligible existing event.
2. Creating `authorization_evidence` through the dedicated source-linked endpoint.

Existing generic creation of ordinary notes, photo evidence, and mail-related behavior remains outside this change. It must not become an accidental alternative for creating authorization evidence.

### 1.2 Event eligibility

Only entries with `entryType: "note"` are editable under this change. This confines mutable operational commentary to manually authored notes and prevents edits to imported mail evidence, standalone photo-evidence records, and all authorization evidence. `authorization_evidence` is explicitly immutable and always rejected by PATCH.

An authorization source may be any existing Seguimiento entry except another `authorization_evidence`, provided it resolves under the requested company and surgery. The source is never retyped or altered. This design does not impose a one-authorization-per-source rule; deduplication/revocation is a future business workflow.

---

## 2. API contracts

All successful responses retain the repository envelope: `{ "data": SeguimientoEntryApiRow }`. Error responses retain `{ "error": { "code", "message" } }`.

### 2.1 Edit an eligible entry

`PATCH /api/companies/:companyId/surgeries/:surgeryId/seguimiento/:entryId`

The URL surgery value may be a persisted ID or visible number. It is resolved before the service call to a persisted `surgeryId`.

Request body (all fields are optional individually; at least one is required):

```ts
type SeguimientoEventEditRequest = {
  content?: string;                 // trimmed, non-empty when supplied
  summary?: string;                 // string, including "" when intentionally cleared
  priority?: "alta" | "media" | "baja";
  highlighted?: boolean;
  mentions?: MentionRef[];          // existing company-scoped normalization
  imageEvidence?: {
    files: SeguimientoPhotoEvidenceFileInput[]; // 0..4; [] explicitly removes all
  };
};
```

`imageEvidence` has three distinct meanings:

| Request state | Meaning |
| --- | --- |
| omitted | Preserve the current manual image set. |
| `{ files: [ ... ] }` | Replace the entire manual image set; do not retain any old image implicitly. |
| `{ files: [] }` | Remove the manual image set. |

The response returns the persisted entry, including the merged `evidenceRef`; no separate history endpoint is needed.

### 2.2 Create immutable authorization evidence

`POST /api/companies/:companyId/surgeries/:surgeryId/seguimiento/:sourceEntryId/authorization-evidence`

This narrow endpoint is the only client contract introduced for the new authorization action. It avoids accepting client-selected `entryType`, `authorId`, or source linkage through the generic Seguimiento create endpoint.

```ts
type CreateAuthorizationEvidenceRequest = {
  content: string;                  // trimmed, required, non-empty
  summary?: string;
  imageEvidence?: {
    files: SeguimientoPhotoEvidenceFileInput[]; // 0..4; [] is valid
  };
};
```

The service derives, rather than trusts from the request:

```ts
{
  entryType: "authorization_evidence",
  surgeryId: resolvedSurgeryId,
  companyId: ctx.companyId,
  authorId: ctx.actorUserId,
  evidenceRef: {
    action: "authorization_recorded",
    sourceEntryId,
    imageEvidence?: { source: "authorization_recorded", fileCount, files }
  }
}
```

`sourceEntryId` is the path parameter and must resolve with `(id, companyId, surgeryId)`. A request body cannot override it. The response is a newly created entry (`201`); it never PATCHes, retypes, or otherwise modifies the source entry.

The endpoint accepts no priority, highlight, mentions, arbitrary `evidenceRef`, client author, or surgery state. Authorization evidence is a source-linked operative fact, not an editable note and not a case-level commercial authorization.

### 2.3 Import immutable Mail authorization evidence

The approved Mail compatibility path is a separate, explicit internal trust contract. It is **not** a variant of the generic Seguimiento create route and it is not the manual source-linked authorization endpoint.

`POST /api/companies/:companyId/surgeries/:surgeryId/mail-links/:linkId/authorization-evidence`

The path `linkId` identifies an active Mail Stage 1 link for the already resolved company and surgery. It is the only authority for the conversation identity. The endpoint uses the Mail Stage 1 mutation boundary (`MAIL_STAGE1_MUTATION_ROLES` and existing company mutation access), not the temporary admin-only Seguimiento-event guard. This deliberately preserves the existing Mail workflow's role policy without broadening the manual note-edit or manual authorization routes.

The request has a closed shape:

```ts
type CreateMailAuthorizationEvidenceRequest = {
  content: string;                 // trimmed, required, non-empty
  summary?: string;                // optional string
  attachmentIds?: string[];        // optional, unique selected IDs; selection only
};
```

The client may supply only this operative text and attachment selection. It cannot supply `entryType`, `authorId`, `companyId`, `surgeryId`, `sourceEntryId`, `externalConversationId`, `conversationKey`, `evidenceRef`, extracted text, material data, priority, highlight, mentions, image data, attachment descriptors, or surgery/circuit state. `attachmentIds` must be a bounded unique subset of attachments on the server-resolved snapshot; it never accepts client-provided attachment metadata or content.

The server resolves the active link, its `conversationKey`, and its stored Mail snapshot using `(companyId, resolvedSurgeryId, linkId)`. It derives the conversation identifiers and all selected-attachment descriptors from that snapshot, then creates a new immutable `authorization_evidence` row with the authenticated Mail actor as author. It does not call the provider, create/alter a Mail link, alter the snapshot, or write to the source conversation.

The Mail-created row is provenance-linked but intentionally has **no** `sourceEntryId`: a Mail conversation is not a Seguimiento entry and the server must not invent one. Its closed, server-generated metadata is limited to non-material provenance:

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

No `extracted`, `material_autorizado`, `materials`, or legacy/alias material-extraction field may be accepted, copied, inferred, or emitted anywhere in this contract. This is a hard safety boundary: `consumo.service` reads material-extraction metadata on `authorization_evidence` as a canonical V0 authorization source. Mail import must therefore remain non-material provenance only.

---

## 3. Validation and persisted metadata

### 3.1 Shared bounded image validator

Refactor the current private photo evidence validation into a shared internal validator for `files` so it can validate photo evidence, note edit image replacement, and authorization creation consistently. It must preserve the current limits:

- only `image/*` MIME types;
- `previewDataUrl` must begin with `data:image/`;
- at most four files;
- each preview data URL at most 400,000 characters;
- combined preview data URLs at most 1,000,000 characters;
- each file is an object; optional metadata (`name`, `sizeBytes`, `width`, `height`) remains JSON-safe.

For the existing `file_photo_evidence` create contract, a non-empty file set and matching `fileCount` remain required. For the two new contracts, the API calculates `fileCount` from `files`; callers do not send it. An empty array is valid only where this design explicitly permits zero images.

Malformed JSON returns `400 invalid_json_body`. Invalid request shapes or image bounds return the existing stable validation codes where applicable (for example `invalid_photo_evidence_mime`, `photo_evidence_limit_exceeded`, `photo_evidence_payload_too_large`) and write nothing. New stable codes should be added for `invalid_priority`, `invalid_highlighted`, `invalid_image_evidence`, `missing_authorization_content`, and `missing_edit_fields` only when the existing codes cannot accurately express the condition.

### 3.2 Evidence-ref ownership and merge rules

`evidenceRef` remains the existing JSON column. This change owns only these keys:

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

The edit service starts from a plain copy of the existing JSON object, preserves unknown keys, then changes only supplied owned fields. For `imageEvidence: { files: [] }`, it deletes `imageEvidence` rather than persisting an empty placeholder. It must not overwrite mail/import metadata, legacy note metadata, or prior `editHistory`.

### 3.3 Immutable edit history

Every successful edit with at least one material change appends one value to `evidenceRef.editHistory`; previous values are copied, never mutated.

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
    imageEvidence: { source: string; fileCount: number; files: SeguimientoPhotoEvidenceFileInput[] } | null;
  }>;
};
```

`previous` contains exactly every supplied editable field whose persisted value changes, including a deep copy of prior image metadata and mentions. This avoids false history for omitted fields. A syntactically valid PATCH that produces no material change returns `400 no_changes` and does not append history or update the row.

The adapter must remain tolerant of old history records (`editedBy`, `previousContent`, `previousSummary`) while mapping the new actor/snapshot shape for display. The UI history presentation must expose that a newer edit has an actor and prior field values; it must not fabricate values for legacy records.

### 3.4 Authorization immutability

`editSeguimientoEntry` checks the triple-scoped row before any mention resolution, notification, or update. If `entryType === "authorization_evidence"`, it returns `409 authorization_evidence_immutable`. It must not update content, summary, mentions, priority, highlight, source linkage, images, or history. Since only `note` is otherwise eligible, other non-note entry families return `409 seguimiento_entry_not_editable`.

No generic create path may accept a client-crafted `authorization_evidence`. After the Mail endpoint in §2.3 is implemented and tested, the ordinary POST route rejects that entry type for every browser/client request. The manual UI action always uses §2.2; the Mail modal uses §2.3. Neither client can fall back to generic POST.

### 3.5 Mail authorization provenance ownership

The Mail importer does not merge arbitrary JSON. It constructs a fresh `evidenceRef` from the closed §2.3 allowlist after resolving the active link and snapshot. Snapshot fields not named in that allowlist, including message bodies, HTML, provider references, extraction output, and all material-shaped metadata, are excluded. `importedAttachments` contains only descriptors selected from that snapshot; an unknown, duplicated, cross-link, inactive-link, or cross-surgery attachment selection fails without a Seguimiento write.

This creates a second creation provenance only. It does not relax the existing manual authorization service's source-entry requirement, and it does not make Mail metadata editable or available through PATCH. The generic PATCH rule continues to return `409 authorization_evidence_immutable` for both manual and Mail-created authorization evidence.

---

## 4. Server sequence and isolation

### 4.1 Isolated ADMIN-only guard

Add a named guarded boundary in `src/lib/api/guards.ts` (or a narrowly named Seguimiento permissions module if project conventions require it), conceptually:

```ts
export const TEMPORARY_SEGUIMIENTO_EVENT_MUTATION_ROLES = ["admin"] as const;

export function requireTemporarySeguimientoEventMutationAccess(ctx: ApiAuthContext): void {
  requireCompanyMutationAccess(ctx, TEMPORARY_SEGUIMIENTO_EVENT_MUTATION_ROLES);
}
```

Its comment must state: temporary implementation verification gate; replace with the approved responsible-ingresos capability mapping later; do not broaden with `coordinator` or `operator`. Both new mutation routes call this function after `getApiAuthContext` and before body parsing, surgery lookup, source/entry lookup, or mutation. A forced UI request therefore receives `403 company_mutation_access_denied` for every non-admin active membership.

### 4.2 PATCH sequence

1. Read URL params and resolve `getApiAuthContext(request, companyId)`.
2. Run the temporary named ADMIN-only Seguimiento event guard.
3. Validate the request body with the extended edit validator using `ctx.companyId`.
4. Resolve URL surgery through `resolveCompanySurgery(ctx.companyId, surgeryId)` and retain its persisted ID.
5. Resolve actor display data from the already authenticated context/user lookup.
6. Call `editSeguimientoEntry(prisma, { entryId, companyId: ctx.companyId, surgeryId: resolved.id, actor, edits })`.
7. Return `200` with the persisted row.

The service lookup must use `findFirst`/equivalent with all predicates `{ id, companyId, surgeryId }`. It must return `404 seguimiento_entry_not_found` for an ID outside that company/surgery; never query/update by ID alone after a weaker lookup. The update must use the already scoped row ID inside the same transaction.

### 4.3 Authorization-create sequence

1. Read URL params and resolve company auth context.
2. Run the same temporary named ADMIN-only guard.
3. Validate the narrow authorization body.
4. Resolve the company-scoped surgery URL value to its persisted ID.
5. In the service transaction, resolve the source with `{ id: sourceEntryId, companyId, surgeryId }`.
6. Return `404 seguimiento_entry_not_found` if absent; return `409 authorization_evidence_invalid_source` if it is itself authorization evidence.
7. Create the new row using only server-derived triple scope, entry type, author, source linkage/action marker, and validated optional images.
8. Return `201` with the new row.

The source and creation occur in the same transaction. Neither sequence reads or writes `Surgery.autorizado`, surgery status, billing/remito/consumption eligibility, or other circuit state.

### 4.4 Error behavior

| Situation | Status / code |
| --- | --- |
| Missing/invalid authentication | existing `401` codes |
| No active company access | existing `403 company_access_denied` |
| Active non-admin role for either new mutation | `403 company_mutation_access_denied` |
| Invalid body or bounded image payload | `400` validation code; no writes |
| URL surgery not in company | `404 surgery_not_found` |
| Entry/source absent or belongs to another surgery/company | `404 seguimiento_entry_not_found`; no disclosure |
| PATCH authorization evidence | `409 authorization_evidence_immutable` |
| PATCH other non-note entry | `409 seguimiento_entry_not_editable` |
| Authorization source is authorization evidence | `409 authorization_evidence_invalid_source` |
| Valid patch makes no persisted change | `400 no_changes` |

### 4.5 Mail authorization-import sequence

1. Read path parameters and resolve `getApiAuthContext(request, companyId)`.
2. Enforce `requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)` before body parsing, surgery/link/snapshot lookup, or any write. This is the Mail-specific trust boundary; do not use it on the manual Seguimiento routes.
3. Resolve the URL surgery with `resolveCompanySurgery(ctx.companyId, surgeryId)` and retain its persisted ID.
4. Validate only the closed Mail import body from §2.3.
5. Resolve the active link and its stored snapshot with the authenticated company, persisted surgery ID, and `linkId`; reject unavailable/inactive/cross-scope link or snapshot without disclosure.
6. Resolve every requested attachment ID from that server snapshot; reject unknown or duplicate IDs and do not accept attachment descriptors from the body.
7. Construct the closed non-material provenance metadata and create the immutable authorization row using only server-derived company, persisted surgery, author, Mail link/snapshot, and selected descriptors.
8. Return `201 { data: SeguimientoEntryApiRow }`.

The sequence has no `sourceEntryId`, does not modify the Mail document/link/snapshot, and never reads or writes `Surgery.autorizado`, surgery status, consumption, billing, remito, or circuit eligibility. Suggested stable errors are `404 mail_link_not_found`, existing `404 mail_provider_snapshot_unavailable`, `400 mail_invalid_authorization_import_payload`, and `400 mail_attachment_not_found`; the final SPEC must select existing codes where they already cover the condition.

---

## 5. Client, adapter, and rendering design

The frontend is a contract consumer only; it never decides authorization. It may obtain the current company role from the existing `/me`/auth context to hide or disable controls, but a direct request remains protected by the server guard.

1. Extend `useSeguimientoFeed.editEntry` input/payload to include `summary`, `priority`, `highlighted`, `mentions`, and the explicit `imageEvidence` replacement object.
2. Add a dedicated `createAuthorizationEvidence(sourceEntryId, input)` hook method calling the nested authorization endpoint. It must not call generic POST with `entryType: "authorization_evidence"` and must not PATCH/retype the source.
3. Update the entry adapter to map image metadata for editable notes and authorization evidence, while preserving current `file_photo_evidence` mapping. It must map priority/highlight only where the contract permits them (notes), and map both legacy and new edit-history shapes safely.
4. Update `NovedadesTabContent` so only an admin-visible client affordance offers Modify for notes. The edit form exposes content, summary, exact priority enum, highlight toggle, bounded attach/replace/remove image controls, and mentions. Omitted image state is not accidentally serialized as removal.
5. Render a new authorization entry as authorization evidence with source-linked imagery if present. It has no Modify action, including for an admin. The “Mark authorized” action starts from a source entry and can submit zero to four images. It must not take the current media-first branch that creates `file_photo_evidence`.
6. Preserve current feed filtering, pagination, mail evidence rendering, standalone photo evidence, mention behavior, and history visibility.

Client controls are an ergonomics hint only. The hook must surface a `403` as a usable error/toast and reset pending state; it must not optimistically mutate a source entry or claim the surgery is authorized.

---

## 6. Exact proposed implementation and test scope

### Production files

| File | Change |
| --- | --- |
| `src/lib/api/guards.ts` | Add the isolated, documented temporary ADMIN-only Seguimiento-event mutation guard. |
| `src/lib/validators/seguimiento.validator.ts` | Add typed edit metadata and narrow authorization-create validators; share bounded image validation; retain legacy contracts. |
| `src/lib/services/seguimiento.service.ts` | Change edit input to receive triple scope and typed metadata; enforce note-only eligibility, immutable authorization evidence, JSON merge/history, and transaction-scoped authorization creation. |
| `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[entryId]/route.ts` | Use the named admin guard, resolve real surgery ID, validate and pass triple scope. |
| `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[sourceEntryId]/authorization-evidence/route.ts` | New dedicated guarded authorization-create route. |
| `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/authorization-evidence/route.ts` | New Mail-role-guarded nested importer; resolves the active link/snapshot and derives closed provenance server-side. |
| `src/lib/validators/mail-stage1.validator.ts` | Add the closed Mail authorization-import validator; permit only content, summary, and bounded selected attachment IDs. |
| `src/lib/mail-stage1/service.ts` | Add server-side active-link/snapshot/attachment resolution that returns only trusted, non-material import provenance. |
| `src/lib/services/seguimiento.service.ts` | Add a server-only Mail authorization creation primitive that accepts trusted resolved provenance, creates an immutable row, and has no source-entry or surgery-state write. |
| `src/lib/api/seguimiento-adapter.ts` | Map new images and history safely without breaking legacy entries. |
| `src/hooks/useSeguimientoFeed.ts` | Send typed edit replacements and use dedicated manual authorization creation; remove generic authorization creation. |
| `src/components/expediente/NovedadesTabContent.tsx` | Admin-hinted manual controls/forms/rendering only; no domain authorization decision. |
| `src/components/expediente/correo/ImportEvidenceFromMailModal.tsx` | Use the nested Mail importer for authorization mode; it sends only allowed text and selected attachment IDs, never generic entry type or evidence metadata. |

No edits are designed for `prisma/schema.prisma`, migrations, `auth-context.ts`, Auth configuration, dependencies, package manifests, or canonical Knowledge.

### Test files and required cases

| File | Required cases |
| --- | --- |
| `src/__tests__/unit/seguimiento-validator.test.ts` | Exact priority enum and boolean; omitted/replacement/empty images; all image bounds; authorization source is path-only/not accepted in body; content requirement; existing mention validation regression. |
| `src/__tests__/unit/seguimiento-service.test.ts` | Triple-predicate lookup; cross-surgery/cross-company 404 with no update; owned-key merge preservation; full prior snapshot history; explicit image removal; note-only eligibility; immutable authorization rejection; source-linked authorization create; nested/absent source failure; no Surgery update call. |
| `src/__tests__/unit/seguimiento-adapter.test.ts` | Note and authorization image mapping; new plus legacy edit-history compatibility; authorization has no editable priority semantics. |
| New focused route test (for example `src/__tests__/unit/seguimiento-event-route.test.ts`) | Admin success for PATCH and authorization POST; `coordinator`, `operator`, and any other role receive 403 on both even via raw request; guard runs before target lookup/body effects; visible-number surgery resolution; 400/404/409 envelopes; no authorization route bypass through generic POST. |
| New focused Mail importer validator/service/route tests | Mail mutation role succeeds at its own boundary; non-Mail-mutation role is denied before parse/link lookup; active link and stored snapshot are company+surgery scoped; selected IDs must be a unique snapshot subset; all stored mail provenance is server-derived; no `sourceEntryId` is fabricated; request/snapshot material or extraction keys cannot reach the created row; no surgery/circuit write occurs. |
| Component/hook test added in the closest existing suite | Correct PATCH payload distinction for omitted/replace/remove; authorization invokes the nested POST with source ID and optional images; authorization cards never show Modify; 403 remains usable. |
| Mail modal test added in the closest existing suite | Authorization-mode import calls only the Mail nested endpoint with content, summary, and selected attachment IDs; note/photo modes retain their intended contracts; it never sends generic `authorization_evidence`, client `evidenceRef`, or client mail descriptors. |

Manual/browser QA after automated tests: use an admin session and denied role session; verify attach/replace/remove, priority/highlight, authorization with zero and with image, history display, direct cross-surgery URL, keyboard access, and narrow viewport. Confirm neither flow changes the case authorization/state indicators or downstream circuit eligibility.

---

## 7. Security and completion criteria

- Company access is resolved by `getApiAuthContext`; the temporary role check is server-side and company-specific.
- The server derives author, company, persisted surgery, entry type, and authorization source link. The client supplies none of those authoritative values.
- Triple-scoped reads prevent same-company cross-surgery mutation and avoid existence disclosure.
- JSON metadata is allowlisted by owned fields and bounded images; arbitrary unvalidated `evidenceRef` cannot be smuggled into either new mutation.
- Authorization evidence is append-only in practice for this change: no PATCH route accepts it and no delete/revoke/amend flow is introduced.
- Successful authorization creation has no surgery-state side effect.
- The Mail importer resolves its own active link and snapshot server-side, uses Mail mutation roles only at that endpoint, and can persist only closed non-material provenance.
- The generic POST rejects every client-crafted `authorization_evidence` only after the tested Mail importer is available; no compatibility exception remains in the public generic contract.

## 8. Required SPEC/TASKS amendment before T4

The following is the exact required amendment direction for the downstream artifacts; this DESIGN amendment does not edit them.

1. **SPEC:** add the §2.3 Mail endpoint, closed request body, Mail-role boundary, active-link/snapshot/attachment server resolution, closed provenance shape, no-`sourceEntryId` rule, material/extraction exclusion, error matrix entries, automated cases, and acceptance scenario from this design. Replace every generic-POST exception with: generic client `authorization_evidence` is rejected after this importer exists. State explicitly that Mail mutation roles apply only to this Mail importer and do not broaden manual Seguimiento authorization.
2. **TASKS:** insert a serialized **Mail authorization-import contract task after Task 3 and before Task 4**. Its allowlist must contain only the new nested Mail route, Mail validator/service, the narrowly required Seguimiento creation primitive, and its focused tests. It must implement and validate the §2.3/§4.5 contract, including no material metadata and no surgery/circuit write. It must release its lock before T4 begins.
3. **TASKS:** amend T4's allowed files/tests and implementation prerequisite so that T4 closes generic POST for all client-crafted `authorization_evidence` only after the inserted Mail contract task is green. T4 must test generic rejection and must not add a Mail exception. If the prior task cannot safely server-resolve the active link, snapshot, and selected attachments, T4 stops and escalates; it must not leave the generic bypass enabled.
4. **TASKS:** amend the client task to include `ImportEvidenceFromMailModal.tsx` and its focused test. Authorization mode must call the Mail nested endpoint; it may not send `entryType`, arbitrary `evidenceRef`, conversation metadata, or attachment descriptors. The manual authorization UI remains on its existing source-linked endpoint.
5. **TASKS:** amend QA to prove the two trust boundaries independently (manual admin-only versus Mail mutation roles), generic rejection, server-only Mail provenance, material/extraction exclusion as observed by `consumo.service` safety tests, and zero surgery/circuit side effects.

The change can proceed to the corresponding SPEC/TASKS amendment because the explicit Mail contract uses existing server-side Mail links, snapshots, roles, and JSON storage. APPLY must stop if server-side link/snapshot/attachment resolution cannot be scoped safely, if material metadata cannot be excluded, if a schema/Auth architecture change becomes necessary, or if another owner holds any route/service/validator/UI file in the serialized chain.
