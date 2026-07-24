# TASKS — SEGUIMIENTO-EVENT-EDIT-001

Status: ready for serialized APPLY, subject to the stop gates below  
Change: `SEGUIMIENTO-EVENT-EDIT-001`  
Language: English  
Dependencies: approved `PROPOSAL.md`, `DESIGN.md`, and `SPEC.md`; the interim server-enforced `admin` gate is approved only as a temporary implementation-verification mapping.

---

## 1. Global execution contract

### Required serialization and ownership

- Execute Tasks 1 through 7 strictly in order. Do not start a task until the preceding task is validated and its lock is released.
- One executor owns every file listed in its task, including its focused tests, for the task duration. Set a visible lock to `reserved`, then `editing`, `review`, and `released`.
- No executor may modify another task's production or test files. The QA/review task is read-only.
- Preserve all unrelated dirty work in the repository. Stage or inspect only files owned by the active task.

### Absolute forbidden scope for every task

- `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts`.
- `src/lib/api/auth-context.ts`, Auth configuration/provider, role taxonomy, permission administration, dependencies, package manifests, and canonical Knowledge.
- Any surgery/circuit state (`Surgery.autorizado`, surgery status, billing, remitos, consumption, or eligibility).
- Delete/revoke/amend/deduplicate authorization evidence, external storage changes, or unbounded uploads.
- Broadening the temporary mutation gate to `coordinator`, `operator`, or any other role.

### Shared stop-and-escalate conditions

Stop the active task; do not work around the condition, and escalate to the orchestrator/Franco if:

1. an active lock owns any required route, service, validator, hook, adapter, UI, or test file;
2. `ApiAuthContext.role` cannot reliably enforce exactly `admin` server-side;
3. a schema, migration, Auth/RBAC, storage, dependency, or canonical-document change is required;
4. bounded image validation cannot be safely reused without weakening legacy photo-evidence validation;
5. a change would make the evidence entry alter surgery or circuit authorization state; or
6. preventing client-crafted generic `authorization_evidence` would break an established Mail-import contract that cannot be converted to the approved explicit server-only contract inside the approved scope;
7. the active Mail link, stored snapshot, or selected attachment IDs cannot be resolved with company and persisted-surgery scope, or closed non-material provenance cannot be constructed without schema, Auth, storage, provider, dependency, or circuit changes.

### Required behavior retained across all tasks

- Successful responses stay `{ data: SeguimientoEntryApiRow }`; errors stay `{ error: { code, message } }`.
- The temporary named guard runs after company auth context and before body parsing, surgery/source/entry lookup, or writes.
- PATCH and authorization source lookup use `{ id, companyId, surgeryId: resolvedSurgeryId }` and return `404 seguimiento_entry_not_found` without disclosure or writes on mismatch.
- Only `note` is editable. `authorization_evidence` PATCH returns `409 authorization_evidence_immutable`; every other non-note returns `409 seguimiento_entry_not_editable`.

---

## 2. Task 1 — Isolate the temporary server mutation guard

**Owner/scope:** Backend authorization boundary only.  
**Depends on:** none.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T1 | backend | openai/gpt-5.6-terra | src/lib/api/guards.ts, src/__tests__/unit/seguimiento-event-guard.test.ts | editing`.

### Allowed files

- `src/lib/api/guards.ts`
- `src/__tests__/unit/seguimiento-event-guard.test.ts` (new)

### Forbidden files

- Every file not listed above, including routes, validators, services, UI, schema, migrations, and `src/lib/api/auth-context.ts`.

### Implementation

1. Add one exported, documented constant and one exported named guard dedicated to Seguimiento event mutation.
2. The guard delegates to existing company mutation access and permits exactly `admin`.
3. Document that it is the temporary implementation-verification mapping and that a future approved responsible-ingresos capability replaces only this mapping. Do not use or export an inline broad-role equivalent.
4. Add focused tests proving `admin` passes and `coordinator`, `operator`, and an arbitrary role receive `403 company_mutation_access_denied`.

### Validation

```powershell
npx vitest run src/__tests__/unit/seguimiento-event-guard.test.ts
npm run typecheck
```

### Stop conditions

- Stop if implementing the guard needs a new Auth-context field, role, permission table, or schema migration.

---

## 3. Task 2 — Define bounded edit and authorization request validation

**Owner/scope:** Seguimiento request validation and its unit contract only.  
**Depends on:** Task 1 released.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T2 | backend | openai/gpt-5.6-terra | src/lib/validators/seguimiento.validator.ts, src/__tests__/unit/seguimiento-validator.test.ts | editing`.

### Allowed files

- `src/lib/validators/seguimiento.validator.ts`
- `src/__tests__/unit/seguimiento-validator.test.ts`

### Forbidden files

- Every file not listed above, especially routes, services, hook/UI files, schema/migrations, and Auth files.

### Implementation

1. Refactor the existing private bounded photo-file validation into a shared internal files validator without changing the legacy `file_photo_evidence` contract: it still requires non-empty files and matching client `fileCount`.
2. Extend the typed edit validator with optional `priority`, `highlighted`, and `imageEvidence.files`; require at least one editable field. Preserve content trimming, explicit `summary: ""`, and company-scoped mention normalization.
3. Make new edit image semantics explicit in the returned typed body: omitted preserves; `{ files }` replaces; `[]` is valid removal. Validate image MIME, preview prefix, object shape, four-file maximum, 400,000-character per-preview maximum, 1,000,000-character aggregate maximum, and JSON-safe optional metadata.
4. Add a narrow authorization-create validator for required non-empty trimmed `content`, optional string `summary`, and optional zero-to-four `imageEvidence.files`. It must not accept body `sourceEntryId`, `entryType`, author/company/surgery identifiers, priority, highlight, mentions, arbitrary `evidenceRef`, or surgery state.
5. Retain existing stable image/mention codes where accurate; add only the SPEC-approved codes when no existing code applies.
6. Cover legacy photo validation and all new valid/invalid shapes, including exact priority/boolean values, omitted/replace/remove image distinction, body source rejection, authorization content, malformed files, every image bound, and mention regression.

### Validation

```powershell
npx vitest run src/__tests__/unit/seguimiento-validator.test.ts
npm run typecheck
```

### Stop conditions

- Stop if sharing the validator changes legacy photo evidence behavior or requires changing a caller outside the allowed files.

---

## 4. Task 3 — Implement triple-scoped note editing and authorization creation

**Owner/scope:** Service transaction and persistence metadata contract only.  
**Depends on:** Task 2 released.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T3 | backend | openai/gpt-5.6-terra | src/lib/services/seguimiento.service.ts, src/__tests__/unit/seguimiento-service.test.ts | editing`.

### Allowed files

- `src/lib/services/seguimiento.service.ts`
- `src/__tests__/unit/seguimiento-service.test.ts`

### Forbidden files

- Every file not listed above, including routes, validators, guards, hook/UI, schema/migrations, and circuit services.

### Implementation

1. Change the edit service contract to receive resolved `surgeryId`, server-derived actor `{ userId, displayName }`, and typed validated edits.
2. In a transaction, find the target with all three predicates. Return the specified 404 for an absent/cross-company/cross-surgery target before mention resolution, notifications, or update.
3. Enforce note-only edit eligibility. Reject authorization evidence and all other non-notes with their specified stable 409 codes before side effects.
4. Copy the existing JSON object, preserve unknown/mail/import/legacy keys, and modify only owned priority, highlighted, mentions, imageEvidence, and editHistory keys. Empty replacement deletes `imageEvidence`.
5. Detect material changes exactly. A no-op throws `400 no_changes`, produces no update/history/notification, and preserves `updatedAt`.
6. For each material edit append exactly one immutable history snapshot with server timestamp/actor and deep-copied prior values for only changed supplied fields. Emit mention notifications only for actual newly added mentions after a successful update.
7. Add the manual transaction-scoped authorization-create service only: triple-scope the Seguimiento source; reject authorization-evidence sources; derive entry type, actor, company, surgery, action marker, source link, and calculated non-empty image metadata server-side; create without modifying the source or any surgery/circuit record. Do not add the Mail importer or any Mail provenance behavior in this task.
8. Replace obsolete tests that assert authorization evidence is editable. Add service tests for triple-scope queries/no writes, owned-key preservation, history snapshots, image replace/removal, no-op, eligibility/immutability, source linkage/invalid source, multiple source authorizations allowed, notification behavior, and no `Surgery` update call.

### Validation

```powershell
npx vitest run src/__tests__/unit/seguimiento-service.test.ts
npm run typecheck
```

### Stop conditions

- Stop if Prisma cannot express the scoped transaction without a schema change, or any implementation path reads/writes surgery/circuit authorization state.

---

## 5. Task 4 — Implement the server-side Mail authorization-import contract

**Owner/scope:** Isolated Mail authorization-import boundary, trusted provenance creation primitive, and focused tests only.  
**Depends on:** Task 3 released.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T4 | backend | openai/gpt-5.6-terra | src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/authorization-evidence/route.ts, src/lib/validators/mail-stage1.validator.ts, src/lib/mail-stage1/service.ts, src/lib/services/seguimiento.service.ts, src/__tests__/unit/mail-stage1-authorization-import.test.ts | editing`.

The narrow `seguimiento.service.ts` reuse is an explicit serialized ownership transfer after Task 3 has released its lock; no active task may own it concurrently. No other Task 4 production or focused-test file is owned by another task.

### Allowed files

- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/authorization-evidence/route.ts` (new)
- `src/lib/validators/mail-stage1.validator.ts`
- `src/lib/mail-stage1/service.ts`
- `src/lib/services/seguimiento.service.ts` (only the narrowly required server-only Mail authorization creation primitive)
- `src/__tests__/unit/mail-stage1-authorization-import.test.ts` (new)

### Forbidden files

- Every file not listed above, including generic Seguimiento routes, manual authorization routes, guards, hook/UI files, Mail modal files, schema/migrations, Auth, provider/storage implementation, circuit services, and `consumo.service.ts`.

### Implementation

1. Add the nested Mail importer route. Resolve company auth context, then enforce `requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)` before body parsing, surgery/link/snapshot/attachment lookup, or any write. Do not call the temporary Seguimiento ADMIN-only guard and do not change either role policy.
2. Resolve the URL surgery through the existing company-scoped resolver. Validate only the closed Mail body: required trimmed non-empty `content`, optional string `summary`, and optional at-most-ten unique non-empty `attachmentIds`. Reject every other key, including entry/author/company/surgery/source identifiers, conversation identifiers, arbitrary `evidenceRef`, extracted/material data and aliases, priority, highlight, mentions, image data, attachment descriptors, and surgery/circuit state.
3. In the Mail service, resolve only an active link, its conversation identity, and its stored snapshot with `(ctx.companyId, resolvedSurgeryId, linkId)`. Resolve selected attachment IDs as a unique bounded subset of that snapshot. Do not call the provider or create, refresh, unlink, alter, or otherwise write the link, snapshot, or conversation.
4. Add only the server-only Seguimiento creation primitive required by this importer. It accepts trusted resolved Mail provenance rather than a client body or a Seguimiento source entry; derives the immutable `authorization_evidence` row and a fresh closed `evidenceRef`; creates no `sourceEntryId`; and does not modify a source entry, `Surgery`, or circuit state.
5. Construct provenance only from the approved non-material allowlist: action, `source: "mail_import"`, link/conversation identity, provider/mailbox/subject/participants summary/timing/counts, and selected server-snapshot attachment descriptors. Never accept, copy, infer, or emit message bodies, HTML, unnamed provider references, extraction output, `extracted`, `material_autorizado`, `materials`, `materialAutorizado`, `authorizedMaterials`, or any material-extraction alias.
6. Add focused route/validator/service tests proving the independent Mail role boundary and denial before parsing/lookup; persisted-ID surgery/link/snapshot isolation; closed-body rejection; unknown, duplicate, cross-link, inactive, and cross-surgery attachment/link rejection without a Seguimiento write; fully server-derived provenance with no `sourceEntryId`; exclusion of all material/extraction metadata; and no provider, link, snapshot, source-entry, Surgery, or circuit write.

### Validation

```powershell
npx vitest run src/__tests__/unit/mail-stage1-authorization-import.test.ts
npm run typecheck
```

### Stop conditions

- Stop if safe implementation needs any file outside this isolated allowlist, including the generic Seguimiento route or Mail modal.
- Stop if active link, stored snapshot, or selected attachment resolution cannot be company-and-persisted-surgery scoped; if the provenance allowlist cannot exclude material/extraction fields; or if the primitive needs schema, Auth, storage, provider, dependency, source-entry, Surgery, or circuit changes.
- Release this lock only after the focused test and typecheck are green. Task 5 must not begin otherwise.

---

## 6. Task 5 — Wire protected PATCH and dedicated authorization routes

**Owner/scope:** HTTP boundary, generic-create bypass closure, and route tests only.  
**Depends on:** Task 4 released green.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T5 | backend | openai/gpt-5.6-terra | src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[entryId]/route.ts, src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[sourceEntryId]/authorization-evidence/route.ts, src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/route.ts, src/__tests__/unit/seguimiento-event-route.test.ts | editing`.

### Allowed files

- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[entryId]/route.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[sourceEntryId]/authorization-evidence/route.ts` (new)
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/route.ts`
- `src/__tests__/unit/seguimiento-event-route.test.ts` (new)

### Forbidden files

- Every file not listed above, including `src/lib/api/guards.ts`, validators, services, hook/UI, schema/migrations, Auth, and Mail implementation files.

### Implementation

1. Replace PATCH's local broad role array with the named Task 1 guard. Call it before JSON parsing, surgery resolution, user lookup, target lookup, and service call.
2. Resolve the URL surgery to its persisted ID and pass it, the validated request, and the server-derived actor to the Task 3 edit service.
3. Add the nested POST authorization route. Apply the same guard order, validate the narrow body, resolve surgery, and call the authorization service. Return `201` only for the created row.
4. After confirming Task 4's focused Mail importer test is green, close the generic client bypass: reject every client-crafted `entryType: "authorization_evidence"` on the generic POST route without a Mail compatibility exception. Preserve ordinary note, photo, and non-authorization Mail behavior. Do not add, restore, or imply a generic-route fallback for the Mail importer.
5. Test both manual operations with raw requests: admin success; each non-admin denial before malformed-body/lookup effects; visible-number surgery resolution; exact 400/404/409 envelopes; cross-surgery/source isolation with no write; generic authorization-evidence POST rejection for every client-crafted payload shape; and no surgery-state side effect.

### Validation

```powershell
npx vitest run src/__tests__/unit/seguimiento-event-route.test.ts
npm run typecheck
```

### Stop conditions

- Stop if Task 4 is not released green, its importer no longer satisfies the closed non-material contract, generic rejection requires a Mail source/modal change, or any Mail exception/fallback is proposed. Do not leave generic client authorization creation enabled.

---

## 7. Task 6 — Adapt client contract and render the bounded flow

**Owner/scope:** Adapter, hook, Seguimiento tab, and component/hook tests only.  
**Depends on:** Task 5 released.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T6 | frontend | openai/gpt-5.6-terra | src/lib/api/seguimiento-adapter.ts, src/hooks/useSeguimientoFeed.ts, src/components/expediente/NovedadesTabContent.tsx, src/components/expediente/correo/ImportEvidenceFromMailModal.tsx, src/__tests__/unit/seguimiento-adapter.test.ts, src/__tests__/components/NovedadesTabContent.test.tsx, src/__tests__/components/ImportEvidenceFromMailModal.test.tsx | editing`.

### Allowed files

- `src/lib/api/seguimiento-adapter.ts`
- `src/hooks/useSeguimientoFeed.ts`
- `src/components/expediente/NovedadesTabContent.tsx`
- `src/components/expediente/correo/ImportEvidenceFromMailModal.tsx`
- `src/__tests__/unit/seguimiento-adapter.test.ts`
- `src/__tests__/components/NovedadesTabContent.test.tsx` (new)
- `src/__tests__/components/ImportEvidenceFromMailModal.test.tsx` (new)

### Forbidden files

- Every file not listed above, including API routes/services/validators/guards, `ExpedienteFullView.tsx`, Auth, schema/migrations, and Mail components other than the explicitly allowlisted `ImportEvidenceFromMailModal.tsx`.

### Implementation

1. Map nested `imageEvidence` for editable notes and authorization evidence while retaining existing standalone photo evidence mapping. Map priority/highlight only for notes.
2. Map the new actor/snapshot edit-history shape and retain safe reading of legacy `editedBy`, `previousContent`, and `previousSummary` records without inventing absent values.
3. Extend `editEntry` with summary, priority, highlighted, mentions, and tri-state image replacement semantics. Serialize image evidence only when the user explicitly chose replace/remove.
4. Replace client generic authorization creation with `createAuthorizationEvidence(sourceEntryId, input)` calling the nested POST. Do not send client-derived entry type, author, source linkage, priority, highlight, mentions, arbitrary evidenceRef, or surgery state.
5. In `NovedadesTabContent`, expose Modify only for notes and only as an admin-hinted affordance; authorization evidence never has Modify. Add/edit controls must cover content, summary, priority, highlight, mentions, and bounded image attach/replace/remove. Render authorization images as authorization evidence, not standalone photo evidence.
6. The authorization action must select a source entry and submit zero to four images through the nested endpoint. It must not PATCH/retype the source or use the current media-first photo-evidence branch.
7. Surface `403` as a usable error, clear pending state, and avoid optimistic source/case authorization mutations. Preserve filters, pagination, mail evidence, standalone photos, and existing history visibility.
8. Update only Mail authorization mode in `ImportEvidenceFromMailModal` to call the Task 4 nested Mail endpoint with `linkId`, content, optional summary, and selected attachment IDs. It must not send generic `authorization_evidence`, `entryType`, arbitrary `evidenceRef`, conversation metadata, attachment descriptors, material/extraction values, or a fallback generic authorization POST. Retain the existing note/photo mode contracts.
9. Test adapter legacy/new history and typed image mapping; test hook/component PATCH omission/replacement/removal, nested manual authorization POST/source ID, no Modify on authorization cards, admin/non-admin affordance behavior, and usable 403 state. Test Mail authorization mode's closed endpoint/payload and no-generic-fallback behavior while retaining its non-authorization mode contracts.

### Validation

```powershell
npx vitest run src/__tests__/unit/seguimiento-adapter.test.ts src/__tests__/components/NovedadesTabContent.test.tsx src/__tests__/components/ImportEvidenceFromMailModal.test.tsx
npm run typecheck
```

### Stop conditions

- Stop if client work needs a new Auth capability API, changes to Mail component contracts beyond the closed authorization-mode endpoint/payload, or changes to the generic creation contract beyond Task 5.

---

## 8. Task 7 — Independent QA and review gate

**Owner/scope:** Read-only verification and review.  
**Depends on:** Task 6 released.  
**Lock:** `SEGUIMIENTO-EVENT-EDIT-001/T7 | QA/review | openai/gpt-5.6-terra | no writes | review`.

### Allowed files

- No writes. Read only the Task 1–6 allowlisted source/test files and the three approved SDD artifacts.

### Forbidden files

- All repository files for modification; no schema/DB/Auth/package commands, migrations, seed, commits, or browser state changes.

### Verification

1. Review the diff against every SPEC requirement and confirm the temporary manual guard is named, server-enforced, exactly admin-only, and runs before body/target work; independently confirm the Mail importer uses only `MAIL_STAGE1_MUTATION_ROLES` before body/link/snapshot/attachment work.
2. Run focused automated tests, then typecheck and lint. Run the full test suite only after focused gates pass; report unrelated pre-existing failures separately and do not fix them in this task.
3. Perform manual/browser QA only with approved non-production sessions: manual admin and denied roles; independently, a Mail-mutation-role and Mail-denied role; note edit; priority/highlight; attach/replace/remove image; manual authorization with zero and with image; Mail authorization with selected snapshot attachments; legacy/new history; direct cross-surgery URL; keyboard access; narrow viewport; and confirmation that no case/circuit authorization indicator or downstream eligibility changes.
4. Review that generic client POST cannot create authorization evidence for any client-crafted evidence payload, while ordinary notes/photos/mail behavior remains intact. Verify the Mail-created provenance is server-derived, contains no source-entry ID or material/extraction metadata, and has no provider/link/snapshot/source-entry/Surgery/circuit side effect. Include the focused `consumo.service` safety assertions needed to prove it cannot observe material authorization from Mail-imported evidence; do not modify that file.

### Validation

```powershell
npx vitest run src/__tests__/unit/seguimiento-event-guard.test.ts src/__tests__/unit/seguimiento-validator.test.ts src/__tests__/unit/seguimiento-service.test.ts src/__tests__/unit/mail-stage1-authorization-import.test.ts src/__tests__/unit/seguimiento-event-route.test.ts src/__tests__/unit/seguimiento-adapter.test.ts src/__tests__/components/NovedadesTabContent.test.tsx src/__tests__/components/ImportEvidenceFromMailModal.test.tsx
npm run typecheck
npm run lint
npm test
npm run build
```

### Stop conditions

- Stop and report if any failure indicates a boundary violation, authorization bypass, cross-scope write/disclosure, legacy regression, or circuit-state effect. Use Diagnose before any proposed fix; this task makes no fixes.

---

## 9. Executor order

1. Task 1 — named temporary guard.
2. Task 2 — typed validators and shared bounded image validation.
3. Task 3 — triple-scoped manual service behavior, immutable history, and manual authorization creation.
4. Task 4 — isolated server-side Mail authorization-import contract.
5. Task 5 — protected manual HTTP routes and generic-create bypass closure after Mail readiness.
6. Task 6 — adapter, hook, UI, and Mail modal contract consumption.
7. Task 7 — independent QA/review.

The recommended next APPLY task is **Task 4 — Implement the server-side Mail authorization-import contract**. Tasks 1–3 precede it; it must be green and release its isolated lock before Task 5 rejects generic client-crafted authorization evidence.
