# Proposal — SEGUIMIENTO-EVENT-EDIT-001

Status: blocked pending permission mapping approval  
Change: `SEGUIMIENTO-EVENT-EDIT-001`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact chain: **PROPOSAL** → DESIGN → SPEC → TASKS → APPLY

---

## 1. Summary

Extend the persisted, surgery-scoped Seguimiento feed so an authorized responsible-ingresos user can modify an eligible entry's content, summary, image evidence, highlighted state, and note priority (`alta`, `media`, `baja`), while preserving edit history.

`Marcar autorizado` is explicitly **not** an edit that converts the source entry into authorization. It creates a distinct `authorization_evidence` entry linked to its source entry. The authorization entry is immutable after creation and may contain bounded image evidence. This preserves both the original event and the authorization checkpoint as separate, auditable facts.

The proposal is blocked for implementation because the current authorization/mutation guard has no canonical, enforceable representation for the requested responsible `ingresos` role or permission. The current `ingresos` strings are product-audience labels in Mail Stage 1, not an authenticated `UserCompanyAccess.role` permission contract.

---

## 2. Approved product decisions

Recorded from Franco approval on 2026-07-15:

1. An authorization must be recorded as a **separate entry**, preserving the original event and its history.
2. An authorization evidence entry **may carry image evidence**.
3. Modification and authorization actions are restricted to a user with the responsible **ingresos** role/permission; UI visibility is not authorization.
4. PATCH must isolate the target entry to both the URL company and surgery.

No approval is granted by this proposal for a schema migration, Auth/role-taxonomy redesign, new dependency, or change to surgery authorization state.

---

## 3. Current-state evidence

| Concern | Current behavior | Gap this change addresses |
| --- | --- | --- |
| Entry edits | `PATCH .../seguimiento/[entryId]` accepts content, summary, and mentions; service scopes lookup to `id` and company only. | Must permit typed metadata edits and scope to the resolved surgery as well as company. |
| Priority/highlight | Existing entries use `evidenceRef.priority` and `evidenceRef.highlighted`; the UI already reads them. | PATCH cannot change them. Priority rendering is currently note-only. |
| Images | `file_photo_evidence` validates up to four image data-URL previews. | Authorization evidence lacks an image contract; the UI currently creates photo evidence instead of an authorization entry when media is present. |
| Authorization | `authorization_evidence` exists but is currently mutable through generic edit and accepts untyped `evidenceRef`. | It must be separately created, source-linked, image-capable, and immutable. |
| Permissions | Seguimiento mutation currently allows `admin`, `coordinator`, and `operator`. `ingresos` appears only as a Mail Stage 1 audience label. | No canonical responsible-ingresos principal is available for a backend guard. |

---

## 4. Requirements

### R1 — Eligible event modification

1. A permitted responsible-ingresos actor may PATCH an eligible Seguimiento entry to change any supplied combination of:
   - `content`;
   - `summary`;
   - `priority`: exactly `alta`, `media`, or `baja`;
   - `highlighted`: boolean;
   - image evidence: attach, replace, or remove the entry's manual image set;
   - mentions, under the existing company validation.
2. Omitted fields preserve their existing values. An explicit image replacement replaces the prior manual image set; an explicit empty image set removes it. The request must not silently retain replaced images.
3. Image evidence uses the existing bounded image payload constraints unless a later approved storage design replaces that mechanism: image MIME only, maximum four files, existing per-image and aggregate payload limits, and metadata validation.
4. Every successful mutable edit appends immutable edit-history metadata containing actor identity, timestamp, and the pre-edit values for every changed editable field, including image metadata. Existing mention behavior must remain compatible.
5. This change does not create case-level priority. `priority` remains entry-scoped only.

### R2 — Separate immutable authorization evidence

1. “Mark authorized” creates a new entry with `entryType: "authorization_evidence"`; it must never PATCH or retype the source entry.
2. The authorization create request must include a `sourceEntryId`. The service must resolve that source entry in the same company and surgery before creating the authorization entry.
3. The new entry stores an explicit source reference in `evidenceRef` (at minimum `sourceEntryId` and a stable action marker such as `action: "authorization_recorded"`) and records the acting responsible-ingresos user as its author.
4. The authorization entry may include zero to four image evidence files under the same bounded image validation described in R1. It must be rendered as authorization evidence, not as a separate `file_photo_evidence` entry.
5. Once created, an authorization evidence entry is immutable: generic PATCH rejects it, including attempts to alter content, summary, mentions, priority, highlight state, source linkage, or images. Corrections require a future explicitly approved corrective-evidence flow; this change does not define deletion, revocation, or amendment.
6. Creating authorization evidence does not set or infer `Surgery.autorizado`, change a surgery status, authorize billing/remitos/consumption, or create a canonical commercial authorization outside Seguimiento. It is operative evidence only.

### R3 — Permission enforcement

1. The API must enforce a dedicated responsible-ingresos permission/role check server-side before any edit or authorization creation.
2. The frontend may hide or disable controls for users without the resolved capability, but it is never the source of authorization.
3. Existing broad Seguimiento roles (`admin`, `coordinator`, `operator`) must not be treated as equivalent to responsible-ingresos merely for compatibility.
4. Read access remains governed by existing company read access; this proposal changes only mutation eligibility for the specified operations.

### R4 — Company and surgery PATCH isolation

1. The route resolves `companyId` and `surgeryId` from the URL via the existing company-scoped surgery resolver before mutation.
2. The service edit contract receives the resolved surgery ID and queries the target with all three predicates: `id`, `companyId`, and `surgeryId`.
3. A valid entry ID belonging to another surgery in the same company must produce the normal not-found result, must not disclose the entry, and must not update it.
4. A valid entry ID in another company must likewise produce not-found after company access handling and must not update it.
5. Authorization source resolution follows the same three-part isolation rule.

---

## 5. Explicit non-goals

- No Prisma schema change or migration. Existing `SeguimientoEntry.evidenceRef` JSON is sufficient for the proposed metadata only after validator/service contracts are specified.
- No Auth provider change, Auth production rollout, generic RBAC redesign, or permission administration UI.
- No conversion of Seguimiento authorization evidence into `Surgery.autorizado` or any downstream circuit state.
- No authorization revocation, deletion, mutation, or correction workflow.
- No external storage/provider change, document-management redesign, or unbounded binary upload.
- No change to mail evidence semantics, Historial responsibilities, or unrelated Seguimiento entry families.

---

## 6. Approval blocker: responsible-ingresos mapping

### Finding

The present backend guard authorizes only the raw `ctx.role` from `UserCompanyAccess`. The Seguimiento routes allow `admin`, `coordinator`, and `operator`. There is no canonical `ingresos` role or `responsible_ingresos` permission in the current guard, auth context, schema, or canonical permission documentation. Mail Stage 1 lists `ingresos` only as a human-facing audience label and explicitly does not provide a backend role mapping.

### Required Franco approval before implementation

Approve one concrete canonical mapping, with owner and source of truth, for the capability named by this proposal (for example, an existing backend role value expressly designated as responsible-ingresos, or an approved permission capability resolved by Auth). The approval must state:

1. the exact server-side principal/capability identifier;
2. which users may hold it per company;
3. whether any existing roles retain the capability; and
4. whether implementing the mapping requires schema/Auth/permission architecture work.

Until then, implementation must **not** substitute UI labels, synthetic actors, `admin`, `coordinator`, or `operator` as an inferred responsible-ingresos permission.

If the approved mapping requires a new role, permission table, Auth-context field, or migration, this change must stop and be split behind a separately approved Auth/permission architecture task.

---

## 7. Recommended implementation sequence and ownership

Implementation begins only after §6 approval and a follow-up DESIGN/SPEC/TASKS phase.

| Sequence | Scope | Primary allowed files | Acceptance focus |
| --- | --- | --- | --- |
| 1 | Confirm approved permission mapping and introduce only the approved server capability gate. | `src/lib/api/guards.ts`, `src/lib/api/auth-context.ts` only if the approved mapping requires it; dedicated permission tests. | Unauthorized roles receive 403; no UI-only bypass. Stop if this expands into Auth/schema work not separately approved. |
| 2 | Define typed edit and authorization payloads, including shared bounded image metadata. | `src/lib/validators/seguimiento.validator.ts`, validator tests. | Exact enum/boolean/image validation; authorization source required; malformed or excess images rejected. |
| 3 | Implement company+surgery-scoped service edits and immutable authorization creation. | `src/lib/services/seguimiento.service.ts`, service tests. | Triple-scope lookup; append-only edit history; source linkage; authorization PATCH rejection. |
| 4 | Wire guarded API routes. | `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[entryId]/route.ts`; a new narrowly named authorization route only if DESIGN selects it; route tests. | Permission first, URL scope resolution, 404 isolation, no surgery-state side effect. |
| 5 | Extend adapter/hook/UI after backend contract passes. | `src/lib/api/seguimiento-adapter.ts`, `src/hooks/useSeguimientoFeed.ts`, `src/components/expediente/NovedadesTabContent.tsx`, component/adapter tests. | Edit form supports priority/highlight/image replacement; authorization action creates separate immutable evidence with images; controls respect server capability. |
| 6 | Read-only QA and review. | Tests only; no production source changes. | Full requirements, regression, browser and permission smoke coverage. |

`prisma/schema.prisma`, migrations, package manifests, and canonical documentation remain zero-touch unless a separately approved task is opened.

---

## 8. Acceptance scenarios

1. **Scoped editable entry:** a responsible-ingresos user edits a note at `/companies/C1/surgeries/S1/seguimiento/E1`; `E1` belongs to `C1/S1`; the response persists content, priority, highlighted state, and replacement image metadata, and appends the prior values to edit history.
2. **Image replacement/removal:** a permitted edit replaces two prior images with one valid image; only the new image set is present. A subsequent explicit empty image set removes the image evidence while retaining the entry and edit history.
3. **Invalid metadata:** invalid priority, non-boolean highlighted value, non-image payload, more than four images, oversized preview, or malformed image record returns 400 and writes nothing.
4. **Separate authorization:** marking source `E1` authorized creates `E2` of type `authorization_evidence`, with `E2.evidenceRef.sourceEntryId === E1`, optional bounded image evidence, and a new author/timestamp. `E1` remains the original entry type and content.
5. **No accidental commercial authorization:** creating `E2` leaves the surgery authorization field, CX state, and all downstream eligibility unchanged.
6. **Authorization immutability:** PATCH against `E2` returns a stable rejection and does not alter `E2`, its image evidence, or source linkage.
7. **Same-company cross-surgery isolation:** a permitted actor PATCHes `E1` through surgery `S2` when `E1` belongs to `S1`; the route returns 404 and neither entry nor history changes.
8. **Cross-company isolation:** an entry from another company cannot be read through as editable or mutated through this route; no content is disclosed.
9. **Permission denial:** any actor without the explicitly approved responsible-ingresos capability receives 403 for edit and authorization creation even if the UI control is forced or a raw HTTP request is sent.
10. **Client reading:** the feed shows priority and highlighted state for editable entries; authorization evidence with images is visually typed as authorization and exposes its images without presenting an edit control.

---

## 9. Required test plan

- **Validator unit tests:** exact priority enum; explicit boolean; absent vs replacement vs empty image set; reused image limits for authorization evidence; required valid source entry identifier for authorization request.
- **Service unit tests:** triple scope in edit lookup; no update on mismatched surgery/company; edit-history snapshots include changed metadata; source-linked authorization create; immutable authorization rejection; no surgery mutation call.
- **Route unit/integration tests:** approved permission receives success; every other role/capability receives 403; URL visible-number resolution remains scoped; mismatched source/entry returns 404; invalid requests return 400.
- **Adapter/hook/component tests:** priority/highlight/image edit payload mapping; authorization action produces a separate request/entry rather than a PATCH/retype; immutable authorization cards have no Modify action; error state remains usable.
- **Browser QA:** responsible-ingresos and denied-user sessions; attach/replace/remove image; priority/highlight; authorization with image; history visibility; direct URL mismatch; narrow layout and keyboard access.
- **Regression:** current notes, photo evidence, mail evidence, mentions, pagination, feed filtering, and existing edit-history display remain intact.

---

## 10. Risks and stop conditions

| Risk / condition | Required response |
| --- | --- |
| No approved canonical responsible-ingresos capability | Stop before implementation; do not infer from UI/audience labels. |
| Capability requires schema/Auth/RBAC redesign | Stop and obtain a separately approved architecture task before modifying schema/Auth. |
| Authorization images cannot reuse bounded validated evidence safely | Stop; do not accept unvalidated free-form `evidenceRef`; submit storage/evidence design proposal. |
| Requested behavior would set `Surgery.autorizado` or downstream state | Stop; it exceeds evidence recording and requires separate business-rule approval. |
| Required code overlaps another active owner in route/service/validator/UI chain | Stop, acquire explicit lock, and serialize the chain. |

---

## 11. Proposal decision

The product semantics are approved and implementation-ready in intent, but this proposal is **not ready for APPLY**. It requires Franco's explicit canonical mapping of the responsible-ingresos server-side capability. After that mapping is approved, the change may proceed through DESIGN, SPEC, and task decomposition without a schema/migration change, provided bounded authorization-image validation is formally specified and all scope/immutability requirements above are preserved.
